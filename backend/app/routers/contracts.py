"""Contract management endpoints."""
from typing import Optional
from uuid import UUID
from datetime import date
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundError, ForbiddenError
from app.schemas.response import APIResponse
from app.models.user import User
from app.models.contract import (
    Contract,
    ContractCreate,
    ContractRead,
    ContractUpdate,
    ContractStatus,
)

router = APIRouter(prefix="/contracts", tags=["contracts"])


@router.get("/{contract_id}", response_model=APIResponse)
async def get_contract(
    contract_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": {
            "id": str(contract_id),
            "project_id": "sample-project-id",
            "estimate_id": "sample-estimate-id",
            "contract_number": "YG-2026-0001",
            "contract_amount": "15000000",
            "status": "draft",
            "project_name": "강남아파트 옥상방수",
            "client_name": "강남아파트 관리사무소",
            "created_at": "2026-01-04T00:00:00Z",
        },
        "error": None,
    }


@router.post("/{contract_id}/send", response_model=APIResponse)
async def send_contract_for_signature(
    contract_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": {
            "id": str(contract_id),
            "status": "sent",
            "sent_at": "2026-01-04T00:00:00Z",
            "signature_url": f"https://sign.yunigreen.com/contracts/{contract_id}",
            "message": "서명 요청을 보냈어요",
        },
        "error": None,
    }


@router.post("/{contract_id}/sign", response_model=APIResponse)
async def sign_contract(
    contract_id: UUID,
    signature_data: str,
    signer_type: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": {
            "id": str(contract_id),
            "status": "signed",
            "signed_at": "2026-01-04T00:00:00Z",
            "message": "서명을 완료했어요",
        },
        "error": None,
    }


@router.patch("/{contract_id}", response_model=APIResponse)
async def update_contract(
    contract_id: UUID,
    update_data: ContractUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": {
            "id": str(contract_id),
            "status": update_data.status or "draft",
            "message": "계약서를 수정했어요",
        },
        "error": None,
    }


project_contracts_router = APIRouter(prefix="/projects/{project_id}/contracts", tags=["contracts"])


@project_contracts_router.get("", response_model=APIResponse)
async def get_project_contracts(
    project_id: UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": [],
        "error": None,
    }


@project_contracts_router.post("", response_model=APIResponse)
async def create_contract(
    project_id: UUID,
    estimate_id: UUID,
    start_date: Optional[date] = None,
    expected_end_date: Optional[date] = None,
    notes: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return {
        "success": True,
        "data": {
            "id": "new-contract-id",
            "contract_number": "YG-2026-0002",
            "status": "draft",
            "message": "계약서를 만들었어요",
        },
        "error": None,
    }
