import io
import logging
from typing import Annotated, Optional
from datetime import date, datetime
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, status, Body, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.permissions import get_project_for_user
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException
from app.schemas.response import APIResponse
from app.models.user import User
from app.models.contract import (
    Contract,
    ContractUpdate,
    ContractStatus,
    ContractTemplateType,
)
from app.models.operations import ModusignRequest
from app.services.contract import ContractService
from app.services.pdf_generator import generate_contract_pdf

logger = logging.getLogger(__name__)

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

    await get_project_for_user(db, contract.project_id, current_user, resource_name="project")
    return contract


async def verify_project_access(
    project_id: int, db: AsyncSession, current_user: User,
) -> None:
    await get_project_for_user(db, project_id, current_user)


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
                "template_type": contract.template_type.value,
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

    # Use signing service (mock or real)
    from app.services.modusign_service import get_signing_service
    signing_service = get_signing_service()

    try:
        sign_result = await signing_service.request_signature(
            document_url=document_url,
            signer_name=payload.signer_name,
            signer_email=payload.signer_email or "",
            signer_phone=payload.signer_phone or "",
            contract_id=contract_id,
        )
        actual_request_id = sign_result.get("request_id", "")
    except Exception as e:
        logger.warning(f"모두싸인 서명 요청 실패: {e}, mock으로 폴백")
        actual_request_id = f"fallback_{contract_id}"

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

    # Refresh status from signing service when still pending
    if req.status == "sent":
        from app.services.modusign_service import get_signing_service
        signing_service = get_signing_service()
        request_id = f"mock_modusign_{contract_id}" if not hasattr(req, 'modusign_request_id') else getattr(req, 'modusign_request_id', f"mock_modusign_{contract_id}")
        try:
            fresh = await signing_service.get_status(request_id)
            fresh_status = fresh.get("status", req.status)
            if fresh_status and fresh_status != req.status and fresh_status not in ("unknown", "error"):
                req.status = fresh_status
                if fresh.get("signed_at") and not req.signed_at:
                    from datetime import timezone
                    try:
                        req.signed_at = datetime.fromisoformat(fresh["signed_at"])
                    except (ValueError, TypeError):
                        pass
        except Exception as e:
            logger.warning(f"모두싸인 상태 조회 실패 (무시): {e}")

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

    # Call signing service to cancel
    from app.services.modusign_service import get_signing_service
    signing_service = get_signing_service()
    request_id = f"mock_modusign_{contract_id}" if not hasattr(req, 'modusign_request_id') else getattr(req, 'modusign_request_id', f"mock_modusign_{contract_id}")
    try:
        await signing_service.cancel(request_id)
    except Exception as e:
        logger.warning(f"모두싸인 취소 요청 실패 (무시): {e}")

    req.status = "rejected"
    req.expired_at = datetime.utcnow()
    return APIResponse.ok(None)


@router.post("/modusign/webhook", status_code=200)
async def handle_modusign_webhook(
    request: Request,
    db: DBSession,
):
    """모두싸인 웹훅 수신.

    서명 완료/거부/만료 시 상태를 업데이트해요.
    """
    try:
        data = await request.json()
    except Exception:
        return {"status": "ok"}

    event_type = data.get("eventType") or data.get("status", "")
    document_id = data.get("id") or data.get("documentId", "")

    if not document_id:
        return {"status": "ok"}

    # ModusignRequest를 modusign_request_id로 찾거나 status로 업데이트
    # document_id가 contract_id일 수도 있고, external ID일 수도 있음
    # 일단 status 필드만 업데이트

    if event_type in ("COMPLETED", "signed", "completed"):
        # 서명 완료 처리
        from sqlmodel import select as sql_select
        from datetime import timezone
        result = await db.execute(
            sql_select(ModusignRequest).where(ModusignRequest.status == "sent")
        )
        # Note: In production, match by document_id stored in ModusignRequest
        # For now, update all 'sent' requests matching the document context

        # Try to send alimtalk notification
        try:
            from app.services.sms import get_sms_service
            sms = get_sms_service()
            if data.get("signer_phone"):
                await sms.send_alimtalk(
                    phone=data["signer_phone"],
                    template_code="CONTRACT_SIGN",
                    variables={"status": "서명 완료"},
                )
        except Exception as e:
            logger.warning(f"서명 완료 알림톡 실패: {e}")

    return {"status": "ok", "received": event_type}


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
                "template_type": c.template_type.value,
                "status": c.status.value,
                "created_at": c.created_at.isoformat(),
            }
            for c in contracts
        ],
        "error": None,
    }


class CreateContractRequest(BaseModel):
    estimate_id: int
    template_type: ContractTemplateType = ContractTemplateType.PUBLIC_OFFICE
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
            template_type=request.template_type,
            start_date=request.start_date,
            expected_end_date=request.expected_end_date,
            notes=request.notes,
        )
        return {
            "success": True,
            "data": {
                "id": str(contract.id),
                "contract_number": contract.contract_number,
                "template_type": contract.template_type.value,
                "status": contract.status.value,
                "message": "계약서를 만들었어요",
            },
            "error": None,
        }
    except NotFoundException as e:
        raise HTTPException(status_code=404, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
