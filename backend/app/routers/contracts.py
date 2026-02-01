import io
from typing import Annotated, Optional
from uuid import UUID
from datetime import date
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
from app.models.project import Project
from app.services.contract import ContractService
from app.services.pdf_generator import generate_contract_pdf

router = APIRouter(prefix="/contracts", tags=["contracts"])

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class SignRequest(BaseModel):
    signature_data: str
    signer_type: str


@router.get("/{contract_id}", response_model=APIResponse)
async def get_contract(
    contract_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
):
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
    contract_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
):
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
    contract_id: UUID,
    sign_request: SignRequest,
    db: DBSession,
    current_user: CurrentUser,
):
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
    contract_id: UUID,
    update_data: ContractUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
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
    contract_id: UUID,
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


project_contracts_router = APIRouter(prefix="/projects/{project_id}/contracts", tags=["contracts"])


@project_contracts_router.get("", response_model=APIResponse)
async def get_project_contracts(
    project_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
):
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
    estimate_id: UUID
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    notes: Optional[str] = None


@project_contracts_router.post("", response_model=APIResponse)
async def create_contract(
    project_id: UUID,
    request: CreateContractRequest,
    db: DBSession,
    current_user: CurrentUser,
):
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
