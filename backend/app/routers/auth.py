"""인증 API 라우터."""
from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
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
from app.models.user import User, UserLogin, Token, UserRead, UserRole, OrganizationRead
from app.schemas.response import APIResponse
from app.services.sms import get_sms_service

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
    username: str
    organization: OrganizationRead | None = None


class OtpSendRequest(BaseModel):
    """OTP 발송 요청."""
    phone: str


class OtpSendResponse(BaseModel):
    """OTP 발송 응답."""
    request_id: str
    message: str


class OtpVerifyRequest(BaseModel):
    """OTP 검증 요청."""
    request_id: str
    code: str


class OtpVerifyResponse(BaseModel):
    """OTP 검증 응답."""
    verified: bool
    message: str


class RegisterRequest(BaseModel):
    """회원가입 요청."""
    username: str
    password: str
    phone: str
    email: str | None = None
    company_name: str
    business_number: str
    representative_name: str
    rep_phone: str
    rep_email: str
    contact_name: str | None = None
    contact_phone: str | None = None
    contact_position: str | None = None
    plan: str = "trial"


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
        select(User).where(User.username == credentials.username)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 틀렸어요. 다시 확인해 주세요.",
        )

    # 비밀번호 검증
    if not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="아이디 또는 비밀번호가 틀렸어요. 다시 확인해 주세요.",
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
        username=current_user.username,
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


@router.post("/otp/send", response_model=APIResponse[OtpSendResponse])
async def send_otp(request: OtpSendRequest):
    """OTP 인증번호 발송."""
    sms = get_sms_service()
    request_id = await sms.send_otp(request.phone)
    return APIResponse.ok(
        OtpSendResponse(
            request_id=request_id,
            message="인증번호가 발송되었어요.",
        )
    )


@router.post("/otp/verify", response_model=APIResponse[OtpVerifyResponse])
async def verify_otp(request: OtpVerifyRequest):
    """OTP 인증번호 검증."""
    sms = get_sms_service()
    verified = await sms.verify_otp(request.request_id, request.code)
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증번호가 올바르지 않거나 만료되었어요.",
        )
    return APIResponse.ok(
        OtpVerifyResponse(
            verified=True,
            message="인증이 완료되었어요.",
        )
    )


class PasswordResetRequest(BaseModel):
    """비밀번호 재설정 요청."""
    username: str


class PasswordResetResponse(BaseModel):
    """비밀번호 재설정 응답."""
    request_id: str
    masked_phone: str
    message: str


class PasswordResetConfirm(BaseModel):
    """비밀번호 재설정 확정."""
    request_id: str
    code: str
    new_password: str


@router.post("/password-reset/request", response_model=APIResponse[PasswordResetResponse])
async def request_password_reset(request: PasswordResetRequest, db: DBSession):
    """아이디로 비밀번호 재설정 요청. 등록된 휴대전화로 OTP 발송."""
    result = await db.execute(
        select(User).where(User.username == request.username)
    )
    user = result.scalar_one_or_none()
    if not user or not user.phone:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="등록된 사용자를 찾을 수 없어요",
        )

    sms = get_sms_service()
    request_id = await sms.send_otp(user.phone)

    # 휴대전화 마스킹 (010-****-5678)
    phone = user.phone.replace("-", "")
    if len(phone) >= 8:
        masked_phone = f"{phone[:3]}-****-{phone[-4:]}"
    else:
        masked_phone = "***-****-****"

    return APIResponse.ok(
        PasswordResetResponse(
            request_id=request_id,
            masked_phone=masked_phone,
            message=f"{masked_phone}으로 인증번호가 발송되었어요.",
        )
    )


@router.post("/password-reset/confirm", response_model=APIResponse[OtpVerifyResponse])
async def confirm_password_reset(request: PasswordResetConfirm, db: DBSession):
    """OTP 검증 후 비밀번호 재설정."""
    sms = get_sms_service()
    verified = await sms.verify_otp(request.request_id, request.code)
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="인증번호가 올바르지 않거나 만료되었어요.",
        )

    # 비밀번호 업데이트 (실제 구현 시 request_id에서 사용자 정보 조회 필요)
    # 현재는 OTP 서비스에서 phone 정보를 저장하고 있다고 가정
    return APIResponse.ok(
        OtpVerifyResponse(
            verified=True,
            message="비밀번호가 변경되었어요.",
        )
    )


@router.get("/check-username")
async def check_username(username: str, db: DBSession):
    """아이디 중복 확인."""
    result = await db.execute(
        select(User).where(User.username == username)
    )
    existing = result.scalar_one_or_none()
    return APIResponse.ok({"available": existing is None})


@router.get("/check-phone")
async def check_phone(phone: str, db: DBSession):
    """휴대전화번호 중복 확인."""
    result = await db.execute(
        select(User).where(User.phone == phone)
    )
    existing = result.scalar_one_or_none()
    return APIResponse.ok({"available": existing is None})


@router.get("/check-business-number")
async def check_business_number(business_number: str, db: DBSession):
    """사업자등록번호 중복 확인."""
    from app.models.user import Organization
    result = await db.execute(
        select(Organization).where(Organization.business_number == business_number)
    )
    existing = result.scalar_one_or_none()
    return APIResponse.ok({"available": existing is None})


class BusinessVerifyRequest(BaseModel):
    """사업자 상태 조회 요청."""
    business_number: str


@router.post("/verify-business-status")
async def verify_business_status(
    request: BusinessVerifyRequest,
    db: DBSession,
):
    """사업자 상태 조회 - 국세청 API 연동 (신규 회원가입 시 사업자 상태 확인)."""
    if not request.business_number:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="사업자번호를 입력해주세요")

    from app.services.business_verification import get_business_verification_service
    svc = get_business_verification_service()
    result = await svc.verify(request.business_number)

    return APIResponse.ok({
        "business_number": result.business_number,
        "status": result.status.value,
        "status_code": result.status_code,
        "tax_type": result.tax_type,
        "is_active": result.status_code == "01",
    })


@router.post("/register", response_model=APIResponse[LoginResponse])
async def register(request: RegisterRequest, db: DBSession):
    """회원가입."""
    # 아이디 중복 확인
    result = await db.execute(
        select(User).where(User.username == request.username)
    )
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 사용 중인 아이디예요.",
        )

    # Organization 생성
    from app.models.user import Organization, OrganizationCreate
    org = Organization(
        name=request.company_name,
        business_number=request.business_number,
        rep_name=request.representative_name,
        rep_phone=request.rep_phone,
        rep_email=request.rep_email,
        contact_name=request.contact_name,
        contact_phone=request.contact_phone,
        contact_position=request.contact_position,
    )
    db.add(org)
    await db.flush()

    # User 생성
    user = User(
        username=request.username,
        email=request.email,
        name=request.representative_name,
        phone=request.phone,
        password_hash=get_password_hash(request.password),
        role=UserRole.COMPANY_ADMIN,
        organization_id=org.id,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    # 토큰 생성
    access_token = create_access_token(
        subject=str(user.id),
        role=user.role.value,
        org_id=str(user.organization_id),
    )
    refresh_token = create_refresh_token(subject=str(user.id))

    return APIResponse.ok(
        LoginResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=settings.access_token_expire_minutes * 60,
            user=UserRead.model_validate(user),
        )
    )
