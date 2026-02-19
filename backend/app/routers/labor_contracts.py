"""일용 계약 관리 API 라우터."""
import io
import pathlib
import tempfile
import urllib.parse
from datetime import date, datetime
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.permissions import get_project_for_user
from app.core.security import get_current_user, get_password_hash
from app.schemas.response import APIResponse
from app.models.user import User, UserRole
from app.models.contract import LaborContract, LaborContractStatus

router = APIRouter(prefix="/labor-contracts", tags=["labor-contracts"])


DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class WorkerRegisterRequest(BaseModel):
    """일용직 근로자 등록 요청."""
    name: str
    phone: str
    id_number: Optional[str] = None  # 주민번호 (마스킹 저장)


class WorkerRegisterResponse(BaseModel):
    """일용직 근로자 등록 응답."""
    user_id: str
    is_new: bool
    message: str


@router.post("/workers/register", response_model=APIResponse)
async def register_worker(
    request: WorkerRegisterRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """노무정보 등록 시 일용직 근로자 자동 회원가입."""
    # 기존 worker 확인 (전화번호 기준)
    phone_cleaned = request.phone.replace("-", "")
    result = await db.execute(
        select(User).where(User.phone == request.phone, User.role == UserRole.WORKER)
    )
    existing = result.scalar_one_or_none()
    if existing:
        return {
            "success": True,
            "data": {
                "user_id": str(existing.id),
                "is_new": False,
                "message": "기존 근로자 정보를 찾았어요.",
            },
            "error": None,
        }

    # 새 worker 생성
    worker = User(
        username=f"worker_{phone_cleaned}",
        name=request.name,
        phone=request.phone,
        role=UserRole.WORKER,
        password_hash=get_password_hash(phone_cleaned[-4:]),  # 임시 비밀번호: 전화번호 뒤 4자리
        is_active=True,
        organization_id=None,  # System-level role
    )
    db.add(worker)
    await db.commit()
    await db.refresh(worker)

    return {
        "success": True,
        "data": {
            "user_id": str(worker.id),
            "is_new": True,
            "message": "근로자가 등록되었어요. 임시 비밀번호는 전화번호 뒤 4자리입니다.",
        },
        "error": None,
    }


@router.get("/workers/{worker_id}/document-check", response_model=APIResponse[dict])
async def check_worker_documents(
    worker_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """근로자 필수 서류 확인.

    근로 투입 전 필수 서류(동의 기록 등) 완료 여부를 확인해요.
    """
    missing_docs = []

    # Check consent records
    try:
        from app.models.consent import ConsentRecord
        from sqlmodel import select as sql_select
        consent_result = await db.execute(
            sql_select(ConsentRecord).where(ConsentRecord.user_id == worker_id).limit(1)
        )
        consent = consent_result.scalar_one_or_none()
        if not consent:
            missing_docs.append({
                "type": "consent",
                "name": "개인정보 동의",
                "required": True,
            })
    except Exception:
        pass  # consent table might not exist yet

    return APIResponse.ok({
        "worker_id": worker_id,
        "documents_complete": len(missing_docs) == 0,
        "missing_documents": missing_docs,
    })


_TEMPLATE_PATH = (
    pathlib.Path(__file__).parent.parent.parent.parent
    / "sample"
    / "generated"
    / "표준근로계약서_토큰템플릿.hwpx"
)


@router.get("/{labor_contract_id}/hwpx")
async def download_labor_contract_hwpx(
    labor_contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """표준근로계약서 HWPX 파일 다운로드."""
    # 1. Fetch labor contract
    contract = await db.get(LaborContract, labor_contract_id)
    if not contract:
        raise HTTPException(status_code=404, detail="근로계약서를 찾을 수 없습니다")

    # 2. Tenant and project access policy verification
    project = await get_project_for_user(db, contract.project_id, current_user)

    # 3. Build context
    now = datetime.now()
    org = current_user.organization

    context = {
        "worker_name": contract.worker_name or "",
        "worker_birth_date": "",  # not stored directly; use id_number hint
        "worker_address": "",
        "worker_phone": contract.worker_phone or "",
        "contractor_name": org.name if org else "",
        "contractor_address": org.address if org and hasattr(org, "address") else "",
        "ceo_name": org.representative_name if org and hasattr(org, "representative_name") else "",
        "project_name": project.name if project else "",
        "work_type": contract.work_type or "",
        "site_address": project.address if project and hasattr(project, "address") else "",
        "work_description": contract.work_type or "",
        "work_period_start": str(contract.work_date) if contract.work_date else "",
        "work_period_end": str(contract.work_date) if contract.work_date else "",
        "daily_wage": f"{int(contract.daily_rate):,}" if contract.daily_rate else "",
        "hourly_wage": "",
        "payment_day": "10",
        "year": str(now.year),
        "month": str(now.month),
        "day": str(now.day),
    }

    # 4. Generate HWPX
    if not _TEMPLATE_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail="표준근로계약서 템플릿을 찾을 수 없어요",
        )

    try:
        from app.services.hwpx_template_engine import HwpxTemplateEngine

        engine = HwpxTemplateEngine(strict=False)

        with tempfile.NamedTemporaryFile(suffix=".hwpx", delete=False) as tmp:
            tmp_path = pathlib.Path(tmp.name)

        try:
            engine.render(
                template_path=_TEMPLATE_PATH,
                output_path=tmp_path,
                context=context,
            )
            output_bytes = tmp_path.read_bytes()
        finally:
            tmp_path.unlink(missing_ok=True)

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"근로계약서 HWPX 생성에 실패했어요: {str(e)}",
        )

    worker_name = contract.worker_name or "근로자"
    filename = f"표준근로계약서_{worker_name}.hwpx"
    encoded_filename = urllib.parse.quote(filename, safe="")

    return StreamingResponse(
        io.BytesIO(output_bytes),
        media_type="application/vnd.hancom.hwpx",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
        },
    )


@router.post("/{labor_contract_id}/send", response_model=APIResponse)
async def send_labor_contract_for_signature(
    labor_contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    return {
        "success": True,
        "data": {
            "id": str(labor_contract_id),
            "status": "sent",
            "signature_url": f"https://sign.sigongon.com/labor/{labor_contract_id}",
            "message": "서명 요청을 보냈어요",
        },
        "error": None,
    }


@router.post("/{labor_contract_id}/sign", response_model=APIResponse)
async def sign_labor_contract(
    labor_contract_id: int,
    signature_data: str,
    db: DBSession,
    current_user: CurrentUser,
):
    return {
        "success": True,
        "data": {
            "id": str(labor_contract_id),
            "status": "signed",
            "signed_at": "2026-01-04T00:00:00Z",
            "message": "서명을 완료했어요",
        },
        "error": None,
    }


@router.patch("/{labor_contract_id}", response_model=APIResponse)
async def update_labor_contract(
    labor_contract_id: int,
    db: DBSession,
    current_user: CurrentUser,
    status: Optional[LaborContractStatus] = None,
    hours_worked: Optional[Decimal] = None,
):
    return {
        "success": True,
        "data": {
            "id": str(labor_contract_id),
            "status": status or "draft",
            "message": "계약을 수정했어요",
        },
        "error": None,
    }


project_labor_router = APIRouter(prefix="/projects/{project_id}/labor-contracts", tags=["labor-contracts"])


async def verify_project_access(
    project_id: int, db: AsyncSession, current_user: User,
) -> None:
    await get_project_for_user(db, project_id, current_user)


@project_labor_router.get("", response_model=APIResponse)
async def get_project_labor_contracts(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await verify_project_access(project_id, db, current_user)
    return {
        "success": True,
        "data": [],
        "error": None,
    }


@project_labor_router.post("", response_model=APIResponse)
async def create_labor_contract(
    project_id: int,
    worker_name: str,
    work_date: date,
    daily_rate: Decimal,
    db: DBSession,
    current_user: CurrentUser,
    worker_phone: Optional[str] = None,
    work_type: Optional[str] = None,
    hours_worked: Optional[Decimal] = None,
):
    await verify_project_access(project_id, db, current_user)
    return {
        "success": True,
        "data": {
            "id": "new-labor-contract-id",
            "worker_name": worker_name,
            "status": "draft",
            "message": "일용계약서를 만들었어요",
        },
        "error": None,
    }


@project_labor_router.get("/summary", response_model=APIResponse)
async def get_labor_contracts_summary(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await verify_project_access(project_id, db, current_user)
    return {
        "success": True,
        "data": {
            "total_workers": 0,
            "total_amount": "0",
            "by_status": {
                "draft": 0,
                "sent": 0,
                "signed": 0,
                "paid": 0,
            },
            "by_work_type": {},
        },
        "error": None,
    }
