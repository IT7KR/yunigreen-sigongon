"""Labor contract management endpoints."""
from typing import Optional
from uuid import UUID
from datetime import date
from decimal import Decimal
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundError, ForbiddenError
from app.schemas.response import APIResponse
from app.models.user import User
from app.models.contract import (
    LaborContract,
    LaborContractCreate,
    LaborContractRead,
    LaborContractUpdate,
    LaborContractStatus,
)

router = APIRouter(prefix="/labor-contracts", tags=["labor-contracts"])


@router.post("/{labor_contract_id}/send", response_model=APIResponse)
async def send_labor_contract_for_signature(
    labor_contract_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    status: Optional[LaborContractStatus] = None,
    hours_worked: Optional[Decimal] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    worker_phone: Optional[str] = None,
    work_type: Optional[str] = None,
    hours_worked: Optional[Decimal] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
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
