"""FCM 디바이스 토큰 관리 API."""
import urllib.parse
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select, delete

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.device_token import DeviceToken, DeviceTokenCreate, DeviceTokenRead
from app.schemas.response import APIResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


@router.post(
    "/device-tokens",
    response_model=APIResponse[DeviceTokenRead],
    status_code=status.HTTP_201_CREATED,
    summary="FCM 디바이스 토큰 등록",
    description="네이티브 앱에서 FCM 토큰 발급 후 백엔드에 등록. 이미 존재하면 updated_at 갱신.",
)
async def register_device_token(
    payload: DeviceTokenCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """FCM 디바이스 토큰 등록 또는 갱신."""
    if payload.platform not in ("ios", "android"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="platform은 'ios' 또는 'android'여야 합니다",
        )

    # 기존 토큰 확인 (같은 토큰이면 user_id 업데이트)
    result = await db.execute(
        select(DeviceToken).where(DeviceToken.token == payload.token)
    )
    existing = result.scalar_one_or_none()

    if existing:
        # 토큰 소유자 업데이트 (다른 유저가 같은 기기로 로그인 시)
        existing.user_id = current_user.id
        existing.platform = payload.platform
        existing.updated_at = datetime.utcnow()
        await db.commit()
        await db.refresh(existing)
        device_token = existing
    else:
        device_token = DeviceToken(
            user_id=current_user.id,
            platform=payload.platform,
            token=payload.token,
        )
        db.add(device_token)
        await db.commit()
        await db.refresh(device_token)

    return APIResponse.ok(
        DeviceTokenRead(
            id=device_token.id,
            user_id=device_token.user_id,
            platform=device_token.platform,
            token=device_token.token,
            created_at=device_token.created_at,
        )
    )


@router.delete(
    "/device-tokens/{token}",
    response_model=APIResponse[dict],
    summary="FCM 디바이스 토큰 삭제",
    description="로그아웃 시 토큰 삭제. 본인 토큰만 삭제 가능.",
)
async def delete_device_token(
    token: str,
    db: DBSession,
    current_user: CurrentUser,
):
    """FCM 디바이스 토큰 삭제 (로그아웃 시 호출)."""
    # URL 디코딩 (토큰에 특수문자 포함 가능)
    decoded_token = urllib.parse.unquote(token)

    result = await db.execute(
        select(DeviceToken).where(
            DeviceToken.token == decoded_token,
            DeviceToken.user_id == current_user.id,
        )
    )
    device_token = result.scalar_one_or_none()

    if not device_token:
        return APIResponse.ok({"deleted": False, "reason": "not_found"})

    await db.delete(device_token)
    await db.commit()

    return APIResponse.ok({"deleted": True})


@router.get(
    "/device-tokens",
    response_model=APIResponse[list[DeviceTokenRead]],
    summary="내 디바이스 토큰 목록",
    description="현재 로그인 사용자의 등록된 FCM 토큰 목록 조회.",
)
async def list_device_tokens(
    db: DBSession,
    current_user: CurrentUser,
):
    """현재 사용자의 디바이스 토큰 목록 조회."""
    result = await db.execute(
        select(DeviceToken)
        .where(DeviceToken.user_id == current_user.id)
        .order_by(DeviceToken.created_at.desc())
    )
    tokens = result.scalars().all()

    return APIResponse.ok([
        DeviceTokenRead(
            id=t.id,
            user_id=t.user_id,
            platform=t.platform,
            token=t.token,
            created_at=t.created_at,
        )
        for t in tokens
    ])
