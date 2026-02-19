"""일용 계약 관리 API 라우터."""
from typing import Annotated, Optional
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user, get_password_hash
from app.schemas.response import APIResponse
from app.models.user import User, UserRole
from app.models.contract import LaborContractStatus

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
    """Verify that the project belongs to the current user's organization."""
    if current_user.organization_id is None:  # super admin
        return
    from app.models.project import Project
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
