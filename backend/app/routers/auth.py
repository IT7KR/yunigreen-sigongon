"""인증 API 라우터."""
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.database import get_async_db
from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user,
)
from app.models.user import User, UserLogin, Token, UserRead, OrganizationRead
from app.schemas.response import APIResponse

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class LoginResponse(Token):
    """로그인 응답."""
    user: UserRead


class RefreshRequest(Token):
    """토큰 갱신 요청."""
    refresh_token: str


class RefreshResponse(Token):
    """토큰 갱신 응답."""
    access_token: str
    expires_in: int


class MeResponse(UserRead):
    """현재 사용자 정보 응답."""
    organization: OrganizationRead | None = None


@router.post("/login", response_model=APIResponse[LoginResponse])
async def login(
    credentials: UserLogin,
    db: DBSession,
):
    """로그인.
    
    이메일과 비밀번호로 로그인해요.
    """
    # 사용자 조회
    result = await db.execute(
        select(User).where(User.email == credentials.email)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 틀렸어요. 다시 확인해 주세요.",
        )
    
    # 비밀번호 검증
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="이메일 또는 비밀번호가 틀렸어요. 다시 확인해 주세요.",
        )
    
    # 계정 활성 상태 확인
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정이에요. 관리자에게 문의해 주세요.",
        )
    
    # 토큰 생성
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        org_id=str(user.organization_id),
    )
    refresh_token = create_refresh_token(subject=str(user.id))
    
    # 마지막 로그인 시간 업데이트
    user.last_login_at = datetime.utcnow()
    await db.commit()
    
    return APIResponse.ok(
        LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=UserRead.model_validate(user),
        )
    )


@router.post("/refresh", response_model=APIResponse[RefreshResponse])
async def refresh_token(
    request: RefreshRequest,
    db: DBSession,
):
    """토큰 갱신.
    
    리프레시 토큰으로 새 액세스 토큰을 받아요.
    """
    # 리프레시 토큰 검증
    payload = decode_token(request.refresh_token)
    
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="올바른 리프레시 토큰이 아니에요",
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="토큰 정보가 잘못됐어요. 다시 로그인해 주세요.",
        )
    
    # 사용자 조회
    result = await db.execute(
        select(User).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없어요. 다시 로그인해 주세요.",
        )
    
    # 새 액세스 토큰 생성
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        org_id=str(user.organization_id),
    )
    
    return APIResponse.ok(
        RefreshResponse(
            access_token=access_token,
            expires_in=settings.access_token_expire_minutes * 60,
        )
    )


@router.get("/me", response_model=APIResponse[MeResponse])
async def get_me(
    current_user: CurrentUser,
    db: DBSession,
):
    """현재 사용자 정보 조회.
    
    로그인한 사용자의 정보를 확인해요.
    """
    # 조직 정보 로드
    await db.refresh(current_user, ["organization"])
    
    response = MeResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        phone=current_user.phone,
        role=current_user.role,
        is_active=current_user.is_active,
        organization_id=current_user.organization_id,
        created_at=current_user.created_at,
        last_login_at=current_user.last_login_at,
        organization=OrganizationRead.model_validate(current_user.organization) 
            if current_user.organization else None,
    )
    
    return APIResponse.ok(response)
