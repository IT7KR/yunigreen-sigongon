"""동의 기록 관리 API."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import bearer_scheme, decode_token, get_current_user
from app.models.user import User
from app.models.consent import ConsentRecord, ConsentRecordRead, BulkConsentRequest
from app.schemas.response import APIResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


async def get_optional_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_async_db),
) -> Optional[User]:
    """인증 토큰이 있으면 사용자를 반환하고, 없으면 None을 반환한다."""
    if not credentials:
        return None
    try:
        payload = decode_token(credentials.credentials)
    except Exception:
        return None

    if payload.get("type") != "access":
        return None

    user_id_str = payload.get("sub")
    if not user_id_str:
        return None

    try:
        user_id_int = int(user_id_str)
    except (TypeError, ValueError):
        return None

    result = await db.execute(select(User).where(User.id == user_id_int))
    user = result.scalar_one_or_none()
    if not user or not user.is_active:
        return None
    return user


@router.post(
    "/consent/records",
    response_model=APIResponse[list[ConsentRecordRead]],
    status_code=status.HTTP_201_CREATED,
)
async def save_consent_records(
    payload: BulkConsentRequest,
    request: Request,
    db: DBSession,
    current_user: Optional[User] = Depends(get_optional_current_user),
):
    """동의 기록 일괄 저장.

    로그인 사용자와 비로그인(초대 토큰 기반) 사용자 모두 지원.
    """
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent")

    created_records = []
    for item in payload.records:
        record = ConsentRecord(
            user_id=current_user.id if current_user else None,
            organization_id=current_user.organization_id if current_user else None,
            invite_token=item.invite_token or payload.invite_token,
            consent_type=item.consent_type,
            consented=item.consented,
            ip_address=ip_address,
            user_agent=user_agent,
            consent_version=item.consent_version,
        )
        db.add(record)
        created_records.append(record)

    await db.flush()
    await db.commit()
    for r in created_records:
        await db.refresh(r)

    result = [
        ConsentRecordRead(
            id=r.id,
            user_id=r.user_id,
            invite_token=r.invite_token,
            consent_type=r.consent_type,
            consented=r.consented,
            consented_at=r.consented_at,
            consent_version=r.consent_version,
            organization_id=r.organization_id,
        )
        for r in created_records
    ]
    return APIResponse.ok(result)


@router.get(
    "/consent/records",
    response_model=APIResponse[list[ConsentRecordRead]],
)
async def get_consent_records(
    db: DBSession,
    current_user: CurrentUser,
    user_id: Optional[int] = Query(default=None),
):
    """동의 기록 조회 (관리자용)."""
    query = select(ConsentRecord)

    if current_user.organization_id is not None:
        # 일반 사용자: 본인 조직의 기록만
        query = query.where(ConsentRecord.organization_id == current_user.organization_id)

    if user_id:
        query = query.where(ConsentRecord.user_id == user_id)

    result = await db.execute(query.order_by(ConsentRecord.consented_at.desc()))
    records = result.scalars().all()

    return APIResponse.ok([
        ConsentRecordRead(
            id=r.id,
            user_id=r.user_id,
            invite_token=r.invite_token,
            consent_type=r.consent_type,
            consented=r.consented,
            consented_at=r.consented_at,
            consent_version=r.consent_version,
            organization_id=r.organization_id,
        )
        for r in records
    ])
