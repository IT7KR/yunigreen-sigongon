import io
import logging
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Optional
from urllib.parse import quote

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field as PydanticField
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.exceptions import NotFoundException
from app.core.permissions import get_project_for_user
from app.core.security import get_current_user
from app.models.contract import (
    Contract,
    ContractExecutionMode,
    ContractKind,
    ContractStatus,
    ContractTemplateType,
    ContractUpdate,
    ContractWarrantyItemCreate,
    PublicPlatformType,
)
from app.models.operations import ModusignRequest
from app.models.project import Project
from app.models.user import User
from app.schemas.response import APIResponse
from app.services.contract import ContractService
from app.services.pdf_generator import generate_contract_pdf
from app.services.storage import storage_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/contracts", tags=["contracts"])
project_contracts_router = APIRouter(prefix="/projects/{project_id}/contracts", tags=["contracts"])

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_contract_with_auth(contract_id: int, db: AsyncSession, current_user: User) -> Contract:
    """Fetch contract and verify organization ownership via its project."""
    contract = (
        await db.execute(select(Contract).where(Contract.id == contract_id))
    ).scalar_one_or_none()
    if not contract:
        raise HTTPException(status_code=404, detail="계약서를 찾을 수 없어요")

    await get_project_for_user(db, contract.project_id, current_user, resource_name="project")
    return contract


async def verify_project_access(project_id: int, db: AsyncSession, current_user: User) -> None:
    await get_project_for_user(db, project_id, current_user)


class SignRequest(BaseModel):
    signature_data: str
    signer_type: str


class ModusignRequestPayload(BaseModel):
    signer_name: str
    signer_email: str
    signer_phone: Optional[str] = None


class CreateContractRequest(BaseModel):
    estimate_id: int
    template_type: ContractTemplateType = ContractTemplateType.PUBLIC_OFFICE
    contract_kind: Optional[ContractKind] = None
    execution_mode: Optional[ContractExecutionMode] = None

    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    contract_date: Optional[date] = None
    work_start_date: Optional[date] = None
    work_end_date: Optional[date] = None

    supply_amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    contract_amount: Optional[Decimal] = None

    delay_penalty_rate: Optional[Decimal] = None
    retention_rate: Optional[Decimal] = None

    performance_bond_required: bool = False
    performance_bond_rate: Optional[Decimal] = None
    performance_bond_amount: Optional[Decimal] = None

    defect_warranty_required: bool = False
    defect_warranty_rate: Optional[Decimal] = None
    defect_warranty_period_months: Optional[int] = None

    owner_name: Optional[str] = None
    owner_business_number: Optional[str] = None
    owner_representative_name: Optional[str] = None
    owner_address: Optional[str] = None
    owner_phone: Optional[str] = None

    contractor_name: Optional[str] = None
    contractor_business_number: Optional[str] = None
    contractor_representative_name: Optional[str] = None
    contractor_address: Optional[str] = None
    contractor_phone: Optional[str] = None

    public_platform_type: Optional[PublicPlatformType] = None
    public_notice_number: Optional[str] = None
    public_bid_number: Optional[str] = None
    public_contract_reference: Optional[str] = None
    source_document_path: Optional[str] = None

    notes: Optional[str] = None
    special_terms: Optional[str] = None

    warranty_items: list[ContractWarrantyItemCreate] = PydanticField(default_factory=list)


def _enum_value(value):
    return value.value if value is not None else None


async def _serialize_contract(service: ContractService, contract: Contract) -> dict:
    project = (
        await service.db.execute(select(Project).where(Project.id == contract.project_id))
    ).scalar_one_or_none()

    completeness = await service.compute_completeness(contract)
    warranty_items = await service.get_warranty_items(contract.id)

    return {
        "id": str(contract.id),
        "project_id": str(contract.project_id),
        "estimate_id": str(contract.estimate_id),
        "contract_number": contract.contract_number,
        "contract_amount": str(contract.contract_amount),
        "template_type": _enum_value(contract.template_type),
        "contract_kind": _enum_value(contract.contract_kind),
        "execution_mode": _enum_value(contract.execution_mode),
        "status": _enum_value(contract.status),
        "notes": contract.notes,
        "special_terms": contract.special_terms,
        "created_at": contract.created_at.isoformat(),
        "sent_at": contract.sent_at.isoformat() if contract.sent_at else None,
        "signed_at": contract.signed_at.isoformat() if contract.signed_at else None,
        "start_date": str(contract.start_date) if contract.start_date else None,
        "expected_end_date": str(contract.expected_end_date) if contract.expected_end_date else None,
        "contract_date": str(contract.contract_date) if contract.contract_date else None,
        "work_start_date": str(contract.work_start_date) if contract.work_start_date else None,
        "work_end_date": str(contract.work_end_date) if contract.work_end_date else None,
        "supply_amount": str(contract.supply_amount) if contract.supply_amount is not None else None,
        "vat_amount": str(contract.vat_amount) if contract.vat_amount is not None else None,
        "total_amount": str(contract.total_amount) if contract.total_amount is not None else None,
        "delay_penalty_rate": str(contract.delay_penalty_rate) if contract.delay_penalty_rate is not None else None,
        "retention_rate": str(contract.retention_rate) if contract.retention_rate is not None else None,
        "performance_bond_required": contract.performance_bond_required,
        "performance_bond_rate": str(contract.performance_bond_rate) if contract.performance_bond_rate is not None else None,
        "performance_bond_amount": str(contract.performance_bond_amount) if contract.performance_bond_amount is not None else None,
        "defect_warranty_required": contract.defect_warranty_required,
        "defect_warranty_rate": str(contract.defect_warranty_rate) if contract.defect_warranty_rate is not None else None,
        "defect_warranty_period_months": contract.defect_warranty_period_months,
        "owner_name": contract.owner_name,
        "owner_business_number": contract.owner_business_number,
        "owner_representative_name": contract.owner_representative_name,
        "owner_address": contract.owner_address,
        "owner_phone": contract.owner_phone,
        "contractor_name": contract.contractor_name,
        "contractor_business_number": contract.contractor_business_number,
        "contractor_representative_name": contract.contractor_representative_name,
        "contractor_address": contract.contractor_address,
        "contractor_phone": contract.contractor_phone,
        "public_platform_type": _enum_value(contract.public_platform_type),
        "public_notice_number": contract.public_notice_number,
        "public_bid_number": contract.public_bid_number,
        "public_contract_reference": contract.public_contract_reference,
        "source_document_path": contract.source_document_path,
        "generated_document_path": contract.generated_document_path,
        "project_name": project.name if project else "",
        "client_name": project.client_name if project else None,
        "completeness": completeness,
        "warranty_items": [
            {
                "id": str(item.id),
                "work_type": item.work_type,
                "warranty_rate": str(item.warranty_rate) if item.warranty_rate is not None else None,
                "warranty_period_months": item.warranty_period_months,
                "notes": item.notes,
            }
            for item in warranty_items
        ],
    }


@router.get("/{contract_id}", response_model=APIResponse)
async def get_contract(contract_id: int, db: DBSession, current_user: CurrentUser):
    await get_contract_with_auth(contract_id, db, current_user)
    service = ContractService(db)
    try:
        contract = await service.get_by_id(contract_id)
        return APIResponse.ok(await _serialize_contract(service, contract))
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{contract_id}/send", response_model=APIResponse)
async def send_contract_for_signature(contract_id: int, db: DBSession, current_user: CurrentUser):
    await get_contract_with_auth(contract_id, db, current_user)
    service = ContractService(db)
    try:
        contract = await service.send_for_signature(contract_id)
        completeness = await service.compute_completeness(contract)
        return APIResponse.ok(
            {
                "id": str(contract.id),
                "status": contract.status.value,
                "sent_at": contract.sent_at.isoformat() if contract.sent_at else None,
                "signature_url": f"https://sign.sigongon.com/contracts/{contract.id}",
                "completeness": completeness,
                "message": "서명 요청을 보냈어요",
            }
        )
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
        return APIResponse.ok(
            {
                "id": str(contract.id),
                "status": contract.status.value,
                "signed_at": contract.signed_at.isoformat() if contract.signed_at else None,
                "message": "서명을 저장했어요",
            }
        )
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
        return APIResponse.ok(
            {
                "id": str(contract.id),
                "status": contract.status.value,
                "message": "계약서를 수정했어요",
                "completeness": await service.compute_completeness(contract),
            }
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{contract_id}/finalize", response_model=APIResponse)
async def finalize_contract(contract_id: int, db: DBSession, current_user: CurrentUser):
    await get_contract_with_auth(contract_id, db, current_user)
    service = ContractService(db)
    try:
        contract, completeness = await service.finalize(contract_id)
        return APIResponse.ok(
            {
                "id": str(contract.id),
                "status": contract.status.value,
                "completeness": completeness,
                "message": "계약서를 확정했어요",
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/{contract_id}/upload-source", response_model=APIResponse)
async def upload_contract_source(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    public_platform_type: Optional[PublicPlatformType] = Form(None),
    public_contract_reference: Optional[str] = Form(None),
    public_notice_number: Optional[str] = Form(None),
    public_bid_number: Optional[str] = Form(None),
):
    await get_contract_with_auth(contract_id, db, current_user)

    if not file.filename:
        raise HTTPException(status_code=400, detail="업로드 파일명이 필요해요")

    ext = file.filename.lower().rsplit(".", 1)[-1] if "." in file.filename else ""
    allowed = {"pdf", "hwp", "hwpx", "doc", "docx"}
    if ext not in allowed:
        raise HTTPException(status_code=400, detail="지원하지 않는 파일 형식이에요")

    saved_path = await storage_service.save_contract(file=file, contract_id=str(contract_id))

    service = ContractService(db)
    contract = await service.attach_source_document(
        contract_id=contract_id,
        source_document_path=saved_path,
        public_platform_type=public_platform_type,
        public_contract_reference=public_contract_reference,
        public_notice_number=public_notice_number,
        public_bid_number=public_bid_number,
    )

    return APIResponse.ok(
        {
            "id": str(contract.id),
            "source_document_path": contract.source_document_path,
            "public_platform_type": contract.public_platform_type.value if contract.public_platform_type else None,
            "message": "관공서 원본 계약서를 업로드했어요",
            "completeness": await service.compute_completeness(contract),
        }
    )


@router.get("/{contract_id}/export")
async def export_contract(contract_id: int, db: DBSession, current_user: CurrentUser):
    contract = await get_contract_with_auth(contract_id, db, current_user)
    project = await get_project_for_user(db, contract.project_id, current_user)

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
        client_name=contract.owner_name or project.client_name or "",
        client_address=contract.owner_address or project.address or "",
        total_amount=contract.total_amount or contract.contract_amount,
        terms=contract.special_terms or contract.notes or default_terms,
        company_name=contract.contractor_name or "유니그린",
        signed_at=contract.signed_at,
    )

    filename = f"contract_{contract.contract_number or contract_id}.pdf"
    filename_utf8 = f"계약서_{project.name}.pdf"

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename_utf8)}"
        },
    )


@router.get("/{contract_id}/pdf")
async def export_contract_pdf_alias(contract_id: int, db: DBSession, current_user: CurrentUser):
    """프론트 호환용 PDF 별칭 경로."""
    return await export_contract(contract_id=contract_id, db=db, current_user=current_user)


@router.get("/{contract_id}/source")
async def download_contract_source(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    contract = await get_contract_with_auth(contract_id, db, current_user)
    if not contract.source_document_path:
        raise HTTPException(status_code=404, detail="원본 계약서가 아직 업로드되지 않았어요")

    if not storage_service.file_exists(contract.source_document_path):
        raise HTTPException(status_code=404, detail="원본 계약서 파일을 찾을 수 없어요")

    absolute_path = storage_service.get_absolute_path(contract.source_document_path)
    filename = absolute_path.name
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    media_type_map = {
        "pdf": "application/pdf",
        "hwp": "application/x-hwp",
        "hwpx": "application/vnd.hancom.hwpx",
        "doc": "application/msword",
        "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    }
    media_type = media_type_map.get(ext, "application/octet-stream")

    with open(absolute_path, "rb") as f:
        content = f.read()

    filename_quoted = quote(filename)
    return StreamingResponse(
        io.BytesIO(content),
        media_type=media_type,
        headers={
            "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{filename_quoted}",
        },
    )


@router.post("/{contract_id}/modusign/request", response_model=APIResponse)
async def request_modusign(
    contract_id: int,
    payload: ModusignRequestPayload,
    db: DBSession,
    current_user: CurrentUser,
):
    contract = await get_contract_with_auth(contract_id, db, current_user)
    if contract.contract_kind != ContractKind.PRIVATE_STANDARD:
        raise HTTPException(status_code=400, detail="민간 계약서만 모두싸인 요청이 가능해요")
    if contract.execution_mode != ContractExecutionMode.MODUSIGN:
        raise HTTPException(status_code=400, detail="모두싸인 모드가 아닌 계약서예요")

    req = (
        await db.execute(select(ModusignRequest).where(ModusignRequest.contract_id == contract_id))
    ).scalar_one_or_none()
    now = datetime.utcnow()
    document_url = f"/api/v1/contracts/{contract_id}/pdf"

    from app.services.modusign_service import get_signing_service

    signing_service = get_signing_service()

    try:
        await signing_service.request_signature(
            document_url=document_url,
            signer_name=payload.signer_name,
            signer_email=payload.signer_email or "",
            signer_phone=payload.signer_phone or "",
            contract_id=contract_id,
        )
    except Exception as e:
        logger.warning("모두싸인 서명 요청 실패: %s, mock으로 폴백", e)

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

    await db.commit()
    await db.refresh(req)

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
async def get_modusign_status(contract_id: int, db: DBSession, current_user: CurrentUser):
    await get_contract_with_auth(contract_id, db, current_user)
    req = (
        await db.execute(select(ModusignRequest).where(ModusignRequest.contract_id == contract_id))
    ).scalar_one_or_none()
    if not req:
        return APIResponse.ok({"contract_id": str(contract_id), "status": "pending"})

    if req.status == "sent":
        from app.services.modusign_service import get_signing_service

        signing_service = get_signing_service()
        request_id = f"mock_modusign_{contract_id}"
        try:
            fresh = await signing_service.get_status(request_id)
            fresh_status = fresh.get("status", req.status)
            if fresh_status and fresh_status != req.status and fresh_status not in ("unknown", "error"):
                req.status = fresh_status
                if fresh.get("signed_at") and not req.signed_at:
                    try:
                        req.signed_at = datetime.fromisoformat(fresh["signed_at"])
                    except (ValueError, TypeError):
                        pass
                await db.commit()
                await db.refresh(req)
        except Exception as e:
            logger.warning("모두싸인 상태 조회 실패 (무시): %s", e)

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
async def cancel_modusign(contract_id: int, db: DBSession, current_user: CurrentUser):
    await get_contract_with_auth(contract_id, db, current_user)
    req = (
        await db.execute(select(ModusignRequest).where(ModusignRequest.contract_id == contract_id))
    ).scalar_one_or_none()
    if not req:
        return APIResponse.ok(None)

    from app.services.modusign_service import get_signing_service

    signing_service = get_signing_service()
    request_id = f"mock_modusign_{contract_id}"
    try:
        await signing_service.cancel(request_id)
    except Exception as e:
        logger.warning("모두싸인 취소 요청 실패 (무시): %s", e)

    req.status = "rejected"
    req.expired_at = datetime.utcnow()
    await db.commit()
    return APIResponse.ok(None)


@router.post("/modusign/webhook", status_code=200)
async def handle_modusign_webhook():
    """모두싸인 웹훅 수신."""
    return {"status": "ok"}


@router.get("/{contract_id}/modusign/download", response_model=APIResponse)
async def download_modusign_document(
    contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await get_contract_with_auth(contract_id, db, current_user)
    req = (
        await db.execute(select(ModusignRequest).where(ModusignRequest.contract_id == contract_id))
    ).scalar_one_or_none()
    if not req:
        raise NotFoundException("modusign_request", contract_id)

    return APIResponse.ok(
        {
            "contract_id": str(contract_id),
            "document_url": req.document_url or f"/api/v1/contracts/{contract_id}/pdf",
            "status": req.status,
        }
    )


@project_contracts_router.get("", response_model=APIResponse)
async def get_project_contracts(project_id: int, db: DBSession, current_user: CurrentUser):
    await verify_project_access(project_id, db, current_user)
    service = ContractService(db)
    contracts = await service.get_by_project(project_id)
    serialized = [await _serialize_contract(service, contract) for contract in contracts]
    return APIResponse.ok(serialized)


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
        contract = await service.create(project_id=project_id, payload=request.model_dump(exclude_unset=True))
        return APIResponse.ok(
            {
                "id": str(contract.id),
                "contract_number": contract.contract_number,
                "template_type": contract.template_type.value,
                "contract_kind": contract.contract_kind.value,
                "execution_mode": contract.execution_mode.value,
                "status": contract.status.value,
                "message": "계약서를 만들었어요",
            }
        )
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
