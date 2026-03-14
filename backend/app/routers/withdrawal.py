"""회원 탈퇴 API 라우터."""
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.security import get_current_user, verify_password
from app.models.user import User
from app.schemas.response import APIResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class WithdrawalRequest(BaseModel):
    password: str
    reason: str = ""


class WithdrawalStatusResponse(BaseModel):
    is_withdrawing: bool
    requested_at: Optional[str] = None
    scheduled_at: Optional[str] = None
    remaining_days: Optional[int] = None


@router.post("/withdrawal", response_model=APIResponse[dict])
async def request_withdrawal(
    payload: WithdrawalRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """회원 탈퇴를 신청한다. 30일 유예 기간 후 자동 처리."""
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="비밀번호가 올바르지 않아요")

    from app.services.user_deletion import request_withdrawal as do_request

    try:
        result = await do_request(db, current_user, payload.reason)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))

    await db.commit()

    return APIResponse.ok({
        "requested": True,
        "scheduled_at": result["scheduled_at"],
        "message": "탈퇴 신청이 접수되었어요. 30일 후 자동으로 처리됩니다.",
    })


@router.post("/withdrawal/cancel", response_model=APIResponse[dict])
async def cancel_withdrawal_endpoint(
    db: DBSession,
    current_user: CurrentUser,
):
    """진행 중인 탈퇴 신청을 철회한다."""
    from app.services.user_deletion import cancel_withdrawal

    try:
        await cancel_withdrawal(db, current_user)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await db.commit()

    return APIResponse.ok({
        "cancelled": True,
        "message": "탈퇴 신청이 철회되었어요.",
    })


@router.get("/withdrawal/status", response_model=APIResponse[WithdrawalStatusResponse])
async def get_withdrawal_status(
    current_user: CurrentUser,
):
    """현재 탈퇴 상태를 조회한다."""
    is_withdrawing = current_user.withdrawal_requested_at is not None
    remaining_days = None

    if is_withdrawing and current_user.withdrawal_scheduled_at:
        delta = current_user.withdrawal_scheduled_at - datetime.utcnow()
        remaining_days = max(0, delta.days)

    return APIResponse.ok(WithdrawalStatusResponse(
        is_withdrawing=is_withdrawing,
        requested_at=current_user.withdrawal_requested_at.isoformat() if current_user.withdrawal_requested_at else None,
        scheduled_at=current_user.withdrawal_scheduled_at.isoformat() if current_user.withdrawal_scheduled_at else None,
        remaining_days=remaining_days,
    ))
