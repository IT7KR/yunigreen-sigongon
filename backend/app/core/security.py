"""보안 관련 유틸리티 (JWT, 비밀번호 해싱)."""
import uuid
from datetime import datetime, timedelta
from typing import Optional, Any

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.database import get_async_db


bearer_scheme = HTTPBearer(auto_error=False)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )


def get_password_hash(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def create_access_token(
    subject: str,
    role: str,
    org_id: str,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """액세스 토큰 생성.
    
    Args:
        subject: 토큰 주체 (일반적으로 user_id)
        role: 사용자 역할
        org_id: 조직 ID
        expires_delta: 만료 시간 델타
    
    Returns:
        JWT 액세스 토큰 문자열
    """
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "org_id": str(org_id),
        "exp": expire,
        "type": "access",
    }
    
    return jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def create_refresh_token(subject: str) -> str:
    """리프레시 토큰 생성.
    
    Args:
        subject: 토큰 주체 (일반적으로 user_id)
    
    Returns:
        JWT 리프레시 토큰 문자열
    """
    expire = datetime.utcnow() + timedelta(
        days=settings.refresh_token_expire_days
    )
    
    to_encode: dict[str, Any] = {
        "sub": str(subject),
        "exp": expire,
        "type": "refresh",
    }
    
    return jwt.encode(
        to_encode,
        settings.jwt_secret,
        algorithm=settings.jwt_algorithm,
    )


def decode_token(token: str) -> dict[str, Any]:
    """토큰 디코딩 및 검증.
    
    Args:
        token: JWT 토큰 문자열
    
    Returns:
        디코딩된 페이로드
    
    Raises:
        HTTPException: 토큰이 유효하지 않을 때
    """
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[settings.jwt_algorithm],
        )
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 만료됐어요. 다시 로그인해 주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_async_db),
):
    """현재 인증된 사용자 반환.
    
    Args:
        credentials: Bearer 토큰 인증 정보
        db: 비동기 DB 세션
    
    Returns:
        현재 사용자 객체
    
    Raises:
        HTTPException: 인증 실패 시
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인이 필요해요",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    payload = decode_token(credentials.credentials)
    
    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="올바른 토큰이 아니에요. 다시 로그인해 주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="로그인 정보가 잘못됐어요. 다시 로그인해 주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # 사용자 조회 (순환 임포트 방지를 위해 여기서 임포트)
    from app.models.user import User
    
    result = await db.execute(
        select(User).where(User.id == uuid.UUID(user_id))
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="사용자를 찾을 수 없어요. 다시 로그인해 주세요.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="비활성화된 계정이에요. 관리자에게 문의해 주세요.",
        )
    
    return user


async def get_current_active_admin(
    current_user = Depends(get_current_user),
):
    """관리자 권한 확인.
    
    Args:
        current_user: 현재 사용자
    
    Returns:
        현재 사용자 (관리자인 경우)
    
    Raises:
        HTTPException: 관리자가 아닐 때
    """
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 기능은 관리자만 쓸 수 있어요",
        )
    return current_user
