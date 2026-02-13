"""사용자 관리 API 라우터 (관리자 전용)."""
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_active_admin, get_password_hash
from app.core.exceptions import NotFoundException
from app.models.user import User, UserRole, UserRead
from app.schemas.response import APIResponse, PaginatedResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
AdminUser = Annotated[User, Depends(get_current_active_admin)]


class UserListItem(UserRead):
    pass


class UserCreateRequest(BaseModel):
    email: EmailStr
    password: str
    name: str
    phone: Optional[str] = None
    role: UserRole = UserRole.SITE_MANAGER


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[UserRole] = None
    is_active: Optional[bool] = None


class UserCreateResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    message: str


def _is_super_admin(user: User) -> bool:
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    return role == "super_admin"


@router.get("", response_model=PaginatedResponse[UserListItem])
async def list_users(
    db: DBSession,
    admin: AdminUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
):
    query = select(User)
    if not _is_super_admin(admin):
        query = query.where(User.organization_id == admin.organization_id)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (User.name.ilike(search_filter)) |
            (User.email.ilike(search_filter)) |
            (User.phone.ilike(search_filter))
        )
    
    if role:
        query = query.where(User.role == role)
    
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    query = query.order_by(User.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    return PaginatedResponse.create(
        items=[UserListItem.model_validate(u) for u in users],
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post("", response_model=APIResponse[UserCreateResponse], status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreateRequest,
    db: DBSession,
    admin: AdminUser,
):
    existing = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 등록된 이메일이에요",
        )
    
    base_username = user_data.email.split("@")[0]
    username = base_username
    suffix = 1
    while (
        await db.execute(select(User).where(User.username == username))
    ).scalar_one_or_none():
        suffix += 1
        username = f"{base_username}{suffix}"

    user = User(
        username=username,
        email=user_data.email,
        password_hash=get_password_hash(user_data.password),
        name=user_data.name,
        phone=user_data.phone,
        role=user_data.role,
        organization_id=admin.organization_id if not _is_super_admin(admin) else None,
        is_active=True,
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return APIResponse.ok(
        UserCreateResponse(
            id=user.id,
            email=user.email,
            name=user.name,
            role=user.role,
            message="사용자를 등록했어요",
        )
    )


@router.get("/{user_id}", response_model=APIResponse[UserListItem])
async def get_user(
    user_id: int,
    db: DBSession,
    admin: AdminUser,
):
    query = select(User).where(User.id == user_id)
    if not _is_super_admin(admin):
        query = query.where(User.organization_id == admin.organization_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundException("user", user_id)
    
    return APIResponse.ok(UserListItem.model_validate(user))


@router.patch("/{user_id}", response_model=APIResponse[UserListItem])
async def update_user(
    user_id: int,
    user_data: UserUpdateRequest,
    db: DBSession,
    admin: AdminUser,
):
    query = select(User).where(User.id == user_id)
    if not _is_super_admin(admin):
        query = query.where(User.organization_id == admin.organization_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundException("user", user_id)
    
    update_data = user_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    
    return APIResponse.ok(UserListItem.model_validate(user))


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: int,
    db: DBSession,
    admin: AdminUser,
):
    query = select(User).where(User.id == user_id)
    if not _is_super_admin(admin):
        query = query.where(User.organization_id == admin.organization_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise NotFoundException("user", user_id)
    
    if user.id == admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="자기 자신은 삭제할 수 없어요",
        )
    
    await db.delete(user)
    await db.commit()
