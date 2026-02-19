import io
from typing import Annotated, Optional
from datetime import date, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status, Body
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException
from app.schemas.response import APIResponse
from app.models.user import User
from app.models.contract import Contract, ContractUpdate, ContractStatus
from app.models.operations import ModusignRequest
from app.models.project import Project
from app.services.contract import ContractService
from app.services.pdf_generator import generate_contract_pdf

router = APIRouter(prefix="/contracts", tags=["contracts"])

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_contract_with_auth(
    contract_id: int, db: AsyncSession, current_user: User,
) -> Contract:
    """Fetch contract and verify organization ownership via its project."""
    contract = (
        await db.execute(select(Contract).where(Contract.id == contract_id))
    ).scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="계약서를 찾을 수 없어요")

    # Super admin bypass
    if current_user.organization_id is None:
        return contract

    # Verify via project ownership
    project = (
        await db.execute(
            select(Project).where(
                Project.id == contract.project_id,
                Project.organization_id == current_user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=403, detail="이 계약서에 접근할 권한이 없어요")

    return contract


async def verify_project_access(
    project_id: int, db: AsyncSession, current_user: User,
) -> None:
    """Verify that the project belongs to the current user's organization."""
    if current_user.organization_id is None:  # super admin
        return
    project = (
        await db.execute(
            select(Project).where(
                Project.id == project_id,
                Project.organization_id == current_user.organization_id,
            )
        )
    ).scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=403, detail="이 프로젝트에 접근할 권한이 없어요")


class SignRequest(BaseModel):
    signature_data: str
    signer_type: str


class ModusignRequestPayload(BaseModel):
    signer_name: str
    signer_email: str
    signer_phone: Optional[str] = None


@router.get("/{contract_id}", response_model=APIResponse)
async def get_contract(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await get_contract_with_auth(contract_id, db, current_user)
    service = ContractService(db)
    try:
        contract = await service.get_by_id(contract_id)
        return {
            "success": True,
            "data": {
                "id": str(contract.id),
                "project_id": str(contract.project_id),
                "estimate_id": str(contract.estimate_id),
                "contract_number": contract.contract_number,
                "contract_amount": str(contract.contract_amount),
                "status": contract.status.value,
                "notes": contract.notes,
                "created_at": contract.created_at.isoformat(),
                "sent_at": contract.sent_at.isoformat() if contract.sent_at else None,
                "signed_at": contract.signed_at.isoformat() if contract.signed_at else None,
                "start_date": str(contract.start_date) if contract.start_date else None,
                "expected_end_date": str(contract.expected_end_date) if contract.expected_end_date else None,
            },
            "error": None,
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{contract_id}/send", response_model=APIResponse)
async def send_contract_for_signature(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await get_contract_with_auth(contract_id, db, current_user)
    service = ContractService(db)
    try:
        contract = await service.send_for_signature(contract_id)
        return {
            "success": True,
            "data": {
                "id": str(contract.id),
                "status": contract.status.value,
                "sent_at": contract.sent_at.isoformat() if contract.sent_at else None,
                "signature_url": f"https://sign.sigongon.com/contracts/{contract.id}",
                "message": "서명 요청을 보냈어요",
            },
            "error": None,
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{contract_id}/sign", response_model=APIResponse)
async def sign_contract(
    contract_id: int,
    sign_request: SignRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    await get_contract_with_auth(contract_id, db, current_user)
    service = ContractService(db)
    try:
        contract = await service.sign(
            contract_id=contract_id,
            signature_data=sign_request.signature_data,
            signer_type=sign_request.signer_type,
        )
        return {
            "success": True,
            "data": {
                "id": str(contract.id),
                "status": contract.status.value,
                "signed_at": contract.signed_at.isoformat() if contract.signed_at else None,
                "message": "서명을 저장했어요",
            },
            "error": None,
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.patch("/{contract_id}", response_model=APIResponse)
async def update_contract(
    contract_id: int,
    update_data: ContractUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    await get_contract_with_auth(contract_id, db, current_user)
    service = ContractService(db)
    try:
        contract = await service.update(contract_id, update_data)
        return {
            "success": True,
            "data": {
                "id": str(contract.id),
                "status": contract.status.value,
                "message": "계약서를 수정했어요",
            },
            "error": None,
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{contract_id}/export")
async def export_contract(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    result = await db.execute(
        select(Contract).where(Contract.id == contract_id)
    )
    contract = result.scalar_one_or_none()
    
    if not contract:
        raise NotFoundException("contract", contract_id)
    
    project_result = await db.execute(
        select(Project)
        .where(Project.id == contract.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise NotFoundException("contract", contract_id)
    
    default_terms = """
1. 공사 범위: 견적서에 명시된 공사 내용에 한함
2. 공사 기간: 계약일로부터 착공 후 협의된 기간 내 완료
3. 대금 지급: 계약금 30%, 중도금 40%, 잔금 30%
4. 하자 보증: 준공일로부터 3년간 하자 보증
5. 기타 사항: 천재지변 등 불가항력에 의한 공기 지연은 상호 협의
    """.strip()
    
    pdf_bytes = generate_contract_pdf(
        contract_id=str(contract.id),
        project_name=project.name,
        client_name=project.client_name or "",
        client_address=project.address or "",
        total_amount=contract.contract_amount,
        terms=contract.notes or default_terms,
        signed_at=contract.signed_at,
    )
    
    filename = f"contract_{contract.contract_number or contract_id}.pdf"
    filename_utf8 = f"계약서_{project.name}.pdf"
    
    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename_utf8)}"
        }
    )


@router.get("/{contract_id}/pdf")
async def export_contract_pdf_alias(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """프론트 호환용 PDF 별칭 경로."""
    return await export_contract(contract_id=contract_id, db=db, current_user=current_user)


@router.post("/{contract_id}/modusign/request", response_model=APIResponse)
async def request_modusign(
    contract_id: int,
    payload: ModusignRequestPayload,
    db: DBSession,
    current_user: CurrentUser,
):
    contract = await get_contract_with_auth(contract_id, db, current_user)

    req = (await db.execute(select(ModusignRequest).where(ModusignRequest.contract_id == contract_id))).scalar_one_or_none()
    now = datetime.utcnow()
    document_url = f"/api/v1/contracts/{contract_id}/pdf"
    if not req:
        req = ModusignRequest(
            contract_id=contract_id,
            status="sent",
            signer_name=payload.signer_name,
            signer_email=payload.signer_email,
            signer_phone=payload.signer_phone,
            sent_at=now,
            document_url=document_url,
        )
        db.add(req)
    else:
        req.status = "sent"
        req.signer_name = payload.signer_name
        req.signer_email = payload.signer_email
        req.signer_phone = payload.signer_phone
        req.sent_at = now
        req.document_url = document_url

    return APIResponse.ok(
        {
            "id": str(req.id),
            "contract_id": str(contract_id),
            "status": req.status,
            "signer_name": req.signer_name,
            "signer_email": req.signer_email,
            "signer_phone": req.signer_phone,
            "sent_at": req.sent_at.isoformat(),
            "document_url": req.document_url,
        }
    )


@router.get("/{contract_id}/modusign/status", response_model=APIResponse)
async def get_modusign_status(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await get_contract_with_auth(contract_id, db, current_user)
    req = (await db.execute(select(ModusignRequest).where(ModusignRequest.contract_id == contract_id))).scalar_one_or_none()
    if not req:
        return APIResponse.ok(
            {
                "contract_id": str(contract_id),
                "status": "pending",
            }
        )

    return APIResponse.ok(
        {
            "id": str(req.id),
            "contract_id": str(contract_id),
            "status": req.status,
            "signer_name": req.signer_name,
            "signer_email": req.signer_email,
            "signer_phone": req.signer_phone,
            "sent_at": req.sent_at.isoformat(),
            "signed_at": req.signed_at.isoformat() if req.signed_at else None,
            "expired_at": req.expired_at.isoformat() if req.expired_at else None,
            "document_url": req.document_url,
        }
    )


@router.post("/{contract_id}/modusign/cancel", response_model=APIResponse)
async def cancel_modusign(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await get_contract_with_auth(contract_id, db, current_user)
    req = (await db.execute(select(ModusignRequest).where(ModusignRequest.contract_id == contract_id))).scalar_one_or_none()
    if not req:
        return APIResponse.ok(None)

    req.status = "rejected"
    req.expired_at = datetime.utcnow()
    return APIResponse.ok(None)


@router.get("/{contract_id}/modusign/download", response_model=APIResponse)
async def download_modusign_document(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await get_contract_with_auth(contract_id, db, current_user)
    req = (await db.execute(select(ModusignRequest).where(ModusignRequest.contract_id == contract_id))).scalar_one_or_none()
    if not req:
        raise NotFoundException("modusign_request", contract_id)

    return APIResponse.ok(
        {
            "contract_id": str(contract_id),
            "document_url": req.document_url or f"/api/v1/contracts/{contract_id}/pdf",
            "status": req.status,
        }
    )


project_contracts_router = APIRouter(prefix="/projects/{project_id}/contracts", tags=["contracts"])


@project_contracts_router.get("", response_model=APIResponse)
async def get_project_contracts(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await verify_project_access(project_id, db, current_user)
    service = ContractService(db)
    contracts = await service.get_by_project(project_id)
    return {
        "success": True,
        "data": [
            {
                "id": str(c.id),
                "contract_number": c.contract_number,
                "contract_amount": str(c.contract_amount),
                "status": c.status.value,
                "created_at": c.created_at.isoformat(),
            }
            for c in contracts
        ],
        "error": None,
    }


class CreateContractRequest(BaseModel):
    estimate_id: int
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    notes: Optional[str] = None


@project_contracts_router.post("", response_model=APIResponse)
async def create_contract(
    project_id: int,
    request: CreateContractRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    await verify_project_access(project_id, db, current_user)
    service = ContractService(db)
    try:
        contract = await service.create(
            project_id=project_id,
            estimate_id=request.estimate_id,
            start_date=request.start_date,
            expected_end_date=request.expected_end_date,
            notes=request.notes,
        )
        return {
            "success": True,
            "data": {
                "id": str(contract.id),
                "contract_number": contract.contract_number,
                "status": contract.status.value,
                "message": "계약서를 만들었어요",
            },
            "error": None,
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
