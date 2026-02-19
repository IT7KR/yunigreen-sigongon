"""Customer master API router."""
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func, or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user
from app.models.customer import (
    CustomerMaster,
    CustomerMasterCreate,
    CustomerMasterRead,
    CustomerMasterUpdate,
)
from app.models.project import Project
from app.models.user import User
from app.schemas.response import APIResponse, PaginatedResponse
from app.services.customer_master import (
    find_customer_master_by_identity,
    get_customer_master_for_org,
    normalize_customer_name,
    normalize_phone,
    upsert_customer_master,
)

router = APIRouter()


DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class CustomerBackfillRequest(BaseModel):
    dry_run: bool = False
    include_linked: bool = False


class CustomerBackfillResult(BaseModel):
    scanned: int
    linked: int
    created_customers: int
    skipped: int


def _require_organization_id(current_user: User) -> int:
    """Require tenant-scoped context for customer operations."""
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="고객사 사용자만 발주처를 관리할 수 있어요.",
        )
    return current_user.organization_id


@router.get("", response_model=PaginatedResponse[CustomerMasterRead])
async def list_customers(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
    include_inactive: bool = False,
):
    """발주처 마스터 목록 조회."""
    organization_id = _require_organization_id(current_user)

    query = select(CustomerMaster).where(
        CustomerMaster.organization_id == organization_id
    )
    if not include_inactive:
        query = query.where(CustomerMaster.is_active == True)  # noqa: E712

    if search:
        search_filter = f"%{search.strip()}%"
        normalized_search_phone = normalize_phone(search)
        search_conditions = [
            CustomerMaster.name.ilike(search_filter),
            CustomerMaster.phone.ilike(search_filter),
        ]
        if normalized_search_phone:
            search_conditions.append(
                CustomerMaster.normalized_phone.ilike(f"%{normalized_search_phone}%")
            )
        query = query.where(or_(*search_conditions))

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    query = query.order_by(CustomerMaster.updated_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    customers = result.scalars().all()

    items = [CustomerMasterRead.model_validate(customer) for customer in customers]
    return PaginatedResponse.create(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post(
    "",
    response_model=APIResponse[CustomerMasterRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_customer(
    customer_data: CustomerMasterCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """발주처 마스터 생성."""
    organization_id = _require_organization_id(current_user)
    normalized_name = normalize_customer_name(customer_data.name)
    if not normalized_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="발주처명을 입력해 주세요.",
        )

    duplicate = await find_customer_master_by_identity(
        db=db,
        organization_id=organization_id,
        name=normalized_name,
        phone=customer_data.phone,
        include_inactive=True,
    )
    if duplicate:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="이미 등록된 발주처 정보예요. 검색 후 선택해 주세요.",
        )

    customer = CustomerMaster(
        organization_id=organization_id,
        name=normalized_name,
        phone=customer_data.phone,
        normalized_phone=normalize_phone(customer_data.phone),
        memo=customer_data.memo,
        is_active=True,
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    db.add(customer)
    await db.commit()
    await db.refresh(customer)

    return APIResponse.ok(CustomerMasterRead.model_validate(customer))


@router.post("/upsert", response_model=APIResponse[CustomerMasterRead])
async def upsert_customer(
    customer_data: CustomerMasterCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """발주처 마스터 업서트."""
    organization_id = _require_organization_id(current_user)
    normalized_name = normalize_customer_name(customer_data.name)
    if not normalized_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="발주처명을 입력해 주세요.",
        )

    customer = await upsert_customer_master(
        db=db,
        organization_id=organization_id,
        name=normalized_name,
        phone=customer_data.phone,
        memo=customer_data.memo,
        actor_id=current_user.id,
    )
    await db.commit()
    await db.refresh(customer)

    return APIResponse.ok(CustomerMasterRead.model_validate(customer))


@router.post("/backfill-projects", response_model=APIResponse[CustomerBackfillResult])
async def backfill_project_customers(
    request_data: CustomerBackfillRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """기존 프로젝트의 고객 스냅샷을 발주처 마스터와 연결."""
    organization_id = _require_organization_id(current_user)

    query = select(Project).where(Project.organization_id == organization_id)
    if not request_data.include_linked:
        query = query.where(Project.customer_master_id == None)  # noqa: E712

    result = await db.execute(query)
    projects = result.scalars().all()

    linked = 0
    created_customers = 0
    skipped = 0

    for project in projects:
        snapshot_name = (project.client_name or "").strip()
        snapshot_phone = project.client_phone

        if not snapshot_name:
            skipped += 1
            continue

        matched_before = await find_customer_master_by_identity(
            db=db,
            organization_id=organization_id,
            name=snapshot_name,
            phone=snapshot_phone,
            include_inactive=True,
        )

        customer = await upsert_customer_master(
            db=db,
            organization_id=organization_id,
            name=snapshot_name,
            phone=snapshot_phone,
            actor_id=current_user.id,
        )
        if not matched_before:
            created_customers += 1

        if project.customer_master_id != customer.id:
            project.customer_master_id = customer.id
            project.updated_at = datetime.utcnow()
            linked += 1

    if request_data.dry_run:
        await db.rollback()
    else:
        await db.commit()

    return APIResponse.ok(
        CustomerBackfillResult(
            scanned=len(projects),
            linked=linked,
            created_customers=created_customers,
            skipped=skipped,
        )
    )


@router.get("/{customer_id}", response_model=APIResponse[CustomerMasterRead])
async def get_customer(
    customer_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """발주처 마스터 상세 조회."""
    organization_id = _require_organization_id(current_user)
    customer = await get_customer_master_for_org(
        db=db,
        organization_id=organization_id,
        customer_id=customer_id,
        include_inactive=True,
    )
    if not customer:
        raise NotFoundException("customer_master", customer_id)

    return APIResponse.ok(CustomerMasterRead.model_validate(customer))


@router.patch("/{customer_id}", response_model=APIResponse[CustomerMasterRead])
async def update_customer(
    customer_id: int,
    customer_data: CustomerMasterUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """발주처 마스터 수정."""
    organization_id = _require_organization_id(current_user)
    customer = await get_customer_master_for_org(
        db=db,
        organization_id=organization_id,
        customer_id=customer_id,
        include_inactive=True,
    )
    if not customer:
        raise NotFoundException("customer_master", customer_id)

    update_data = customer_data.model_dump(exclude_unset=True)
    if not update_data:
        return APIResponse.ok(CustomerMasterRead.model_validate(customer))

    next_name = normalize_customer_name(update_data.get("name", customer.name))
    if not next_name:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="발주처명을 입력해 주세요.",
        )
    next_phone = update_data.get("phone", customer.phone)

    duplicate = await find_customer_master_by_identity(
        db=db,
        organization_id=organization_id,
        name=next_name,
        phone=next_phone,
        include_inactive=True,
    )
    if duplicate and duplicate.id != customer.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="같은 이름/연락처의 발주처가 이미 있어요.",
        )

    customer.name = next_name
    customer.phone = next_phone
    customer.normalized_phone = normalize_phone(next_phone)
    if "memo" in update_data:
        customer.memo = update_data["memo"]
    if "is_active" in update_data and update_data["is_active"] is not None:
        customer.is_active = update_data["is_active"]
    customer.updated_at = datetime.utcnow()
    customer.updated_by = current_user.id

    await db.commit()
    await db.refresh(customer)
    return APIResponse.ok(CustomerMasterRead.model_validate(customer))
