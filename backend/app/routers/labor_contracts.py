"""일용 계약 관리 API 라우터."""
from typing import Annotated, Optional
from uuid import UUID
from datetime import date
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.schemas.response import APIResponse
from app.models.user import User
from app.models.contract import LaborContractStatus

router = APIRouter(prefix="/labor-contracts", tags=["labor-contracts"])


DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post("/{labor_contract_id}/send", response_model=APIResponse)
async def send_labor_contract_for_signature(
    labor_contract_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    return {
        "success": True,
        "data": {
            "id": str(labor_contract_id),
            "status": "sent",
            "signature_url": f"https://sign.yunigreen.com/labor/{labor_contract_id}",
            "message": "서명 요청을 보냈어요",
        },
        "error": None,
    }


@router.post("/{labor_contract_id}/sign", response_model=APIResponse)
async def sign_labor_contract(
    labor_contract_id: UUID,
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
    labor_contract_id: UUID,
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


@project_labor_router.get("", response_model=APIResponse)
async def get_project_labor_contracts(
    project_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    return {
        "success": True,
        "data": [],
        "error": None,
    }


@project_labor_router.post("", response_model=APIResponse)
async def create_labor_contract(
    project_id: UUID,
    worker_name: str,
    work_date: date,
    daily_rate: Decimal,
    db: DBSession,
    current_user: CurrentUser,
    worker_phone: Optional[str] = None,
    work_type: Optional[str] = None,
    hours_worked: Optional[Decimal] = None,
):
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
    project_id: UUID,
    db: DBSession,
    current_user: CurrentUser,
):
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
