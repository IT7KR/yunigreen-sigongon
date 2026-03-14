"""사용자 관리 API 라우터 (관리자 전용)."""
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from pydantic import BaseModel as PydanticBaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_active_admin, get_password_hash
from app.core.exceptions import NotFoundException
from app.models.user import Organization, User, UserRole, UserRead
from app.schemas.response import APIResponse, PaginatedResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
AdminUser = Annotated[User, Depends(get_current_active_admin)]


class UserListItem(UserRead):
    tenant_name: Optional[str] = None
    tenant_id: Optional[str] = None


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
    id: str
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
    query = select(User).where(User.deleted_at == None)  # noqa: E711
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

    # Resolve organization names
    org_ids = [u.organization_id for u in users if u.organization_id]
    org_map: dict[int, str] = {}
    if org_ids:
        org_result = await db.execute(
            select(Organization.id, Organization.name).where(Organization.id.in_(org_ids))
        )
        org_map = {row.id: row.name for row in org_result.all()}

    items = []
    for u in users:
        item = UserListItem.model_validate(u)
        if u.organization_id and u.organization_id in org_map:
            item.tenant_name = org_map[u.organization_id]
            item.tenant_id = str(u.organization_id)
        items.append(item)

    return PaginatedResponse.create(
        items=items,
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
            id=str(user.id),
            email=user.email,
            name=user.name,
            role=user.role,
            message="사용자를 등록했어요",
        )
    )


class DeletionCheckResponse(PydanticBaseModel):
    deletable: bool
    blocking_reasons: list[dict] = []
    business_data: dict[str, int] = {}


@router.get("/{user_id}/deletion-check", response_model=APIResponse[DeletionCheckResponse])
async def check_user_deletion(
    user_id: int,
    db: DBSession,
    admin: AdminUser,
):
    """삭제 가능 여부를 사전 검증한다."""
    from app.services.user_deletion import check_deletion_eligibility

    query = select(User).where(User.id == user_id, User.deleted_at == None)  # noqa: E711
    if not _is_super_admin(admin):
        query = query.where(User.organization_id == admin.organization_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundException("user", user_id)

    check_result = await check_deletion_eligibility(db, user, admin)
    return APIResponse.ok(DeletionCheckResponse(**check_result))


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

    item = UserListItem.model_validate(user)
    if user.organization_id:
        org_result = await db.execute(
            select(Organization.name).where(Organization.id == user.organization_id)
        )
        org_name = org_result.scalar_one_or_none()
        if org_name:
            item.tenant_name = org_name
            item.tenant_id = str(user.organization_id)

    return APIResponse.ok(item)


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


class UserDeleteRequest(BaseModel):
    reason: str


@router.post("/{user_id}/delete", response_model=APIResponse[dict])
async def soft_delete_user(
    user_id: int,
    payload: UserDeleteRequest,
    db: DBSession,
    admin: AdminUser,
):
    """사용자를 soft delete한다."""
    from app.services.user_deletion import check_deletion_eligibility, execute_sa_deletion

    query = select(User).where(User.id == user_id, User.deleted_at == None)  # noqa: E711
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

    check = await check_deletion_eligibility(db, user, admin)
    if not check["deletable"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=check["blocking_reasons"][0]["message"] if check["blocking_reasons"] else "삭제할 수 없어요",
        )

    await execute_sa_deletion(db, user, admin, payload.reason)
    await db.commit()

    return APIResponse.ok({
        "user_id": str(user_id),
        "message": "사용자를 삭제했어요.",
    })


class TerminationCheckResponse(PydanticBaseModel):
    can_terminate: bool
    blocking_reasons: list[dict] = []
    assigned_projects: list[dict] = []


@router.get("/{user_id}/termination-check", response_model=APIResponse[TerminationCheckResponse])
async def check_user_termination(
    user_id: int,
    db: DBSession,
    admin: AdminUser,
):
    """퇴사 처리 가능 여부를 사전 검증한다."""
    from app.services.user_deletion import check_termination_eligibility

    query = select(User).where(User.id == user_id, User.deleted_at == None)  # noqa: E711
    if not _is_super_admin(admin):
        query = query.where(User.organization_id == admin.organization_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundException("user", user_id)

    check_result = await check_termination_eligibility(db, user, admin)
    return APIResponse.ok(TerminationCheckResponse(**check_result))


class UserTerminateRequest(PydanticBaseModel):
    reason: str


@router.post("/{user_id}/terminate", response_model=APIResponse[dict])
async def terminate_user(
    user_id: int,
    payload: UserTerminateRequest,
    db: DBSession,
    admin: AdminUser,
):
    """직원 퇴사 처리를 실행한다."""
    from app.services.user_deletion import check_termination_eligibility, execute_termination

    query = select(User).where(User.id == user_id, User.deleted_at == None)  # noqa: E711
    if not _is_super_admin(admin):
        query = query.where(User.organization_id == admin.organization_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()

    if not user:
        raise NotFoundException("user", user_id)

    if user.id == admin.id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="자기 자신은 퇴사 처리할 수 없어요")

    check = await check_termination_eligibility(db, user, admin)
    if not check["can_terminate"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=check["blocking_reasons"][0]["message"] if check["blocking_reasons"] else "퇴사 처리할 수 없어요",
        )

    await execute_termination(db, user, admin, payload.reason)
    await db.commit()

    return APIResponse.ok({
        "user_id": str(user_id),
        "message": "퇴사 처리가 완료되었어요.",
    })
