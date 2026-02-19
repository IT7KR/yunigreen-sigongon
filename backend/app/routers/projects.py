"""프로젝트 API 라우터."""
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.database import get_async_db
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user
from app.models.customer import CustomerMaster, CustomerMasterSummary
from app.models.pricebook import PricebookRevision, RevisionStatus
from app.models.project import (
    ASRequest,
    ASRequestCreate,
    ASRequestRead,
    ASRequestStatus,
    Photo,
    PhotoType,
    Project,
    ProjectCreate,
    ProjectRead,
    ProjectStatus,
    ProjectUpdate,
    SiteVisit,
)
from app.models.user import User
from app.schemas.response import APIResponse, PaginatedResponse
from app.services.customer_master import (
    get_customer_master_for_org,
    upsert_customer_master,
)

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class ProjectListItem(ProjectRead):
    """프로젝트 목록 아이템."""

    customer_master_summary: Optional[CustomerMasterSummary] = None
    site_visit_count: int = 0
    estimate_count: int = 0


class ProjectDetail(ProjectRead):
    """프로젝트 상세 정보."""

    customer_master_summary: Optional[CustomerMasterSummary] = None
    site_visits: list = []
    estimates: list = []


class StatusUpdateRequest(BaseModel):
    status: ProjectStatus


def _require_organization_id(current_user: User) -> int:
    """Require tenant-scoped context for project operations."""
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="고객사 사용자만 프로젝트를 관리할 수 있어요.",
        )
    return current_user.organization_id


async def _load_customer_summary_map(
    db: AsyncSession,
    organization_id: int,
    customer_ids: list[int],
) -> dict[int, CustomerMasterSummary]:
    """Load customer summaries for project responses."""
    if not customer_ids:
        return {}

    result = await db.execute(
        select(CustomerMaster).where(
            CustomerMaster.organization_id == organization_id,
            CustomerMaster.id.in_(customer_ids),
        )
    )
    customers = result.scalars().all()
    return {
        customer.id: CustomerMasterSummary(
            id=customer.id,
            name=customer.name,
            phone=customer.phone,
        )
        for customer in customers
    }


@router.get("", response_model=PaginatedResponse[ProjectListItem])
async def list_projects(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status: Optional[ProjectStatus] = None,
    search: Optional[str] = None,
):
    """프로젝트 목록 조회.
    
    내 조직의 프로젝트 목록을 조회해요.
    """
    organization_id = _require_organization_id(current_user)

    # 기본 쿼리 (조직 필터)
    query = select(Project).where(Project.organization_id == organization_id)
    
    # 상태 필터
    if status:
        query = query.where(Project.status == status)
    
    # 검색 필터 (이름, 주소, 고객명 + 발주처 마스터명)
    if search:
        search_filter = f"%{search}%"
        customer_id_subquery = select(CustomerMaster.id).where(
            CustomerMaster.organization_id == organization_id,
            CustomerMaster.name.ilike(search_filter),
        )
        query = query.where(
            (Project.name.ilike(search_filter)) |
            (Project.address.ilike(search_filter)) |
            (Project.client_name.ilike(search_filter)) |
            (Project.customer_master_id.in_(customer_id_subquery))
        )
    
    # 전체 개수 조회
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    query = query.order_by(Project.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    query = query.options(selectinload(Project.site_visits), selectinload(Project.estimates))
    
    result = await db.execute(query)
    projects = result.scalars().all()

    customer_ids = list(
        {
            project.customer_master_id
            for project in projects
            if project.customer_master_id is not None
        }
    )
    customer_summary_map = await _load_customer_summary_map(
        db=db,
        organization_id=organization_id,
        customer_ids=customer_ids,
    )
    
    # 응답 변환
    items = [
        ProjectListItem(
            id=p.id,
            name=p.name,
            address=p.address,
            customer_master_id=p.customer_master_id,
            client_name=p.client_name,
            client_phone=p.client_phone,
            notes=p.notes,
            organization_id=p.organization_id,
            status=p.status,
            pricebook_revision_id=p.pricebook_revision_id,
            created_at=p.created_at,
            contracted_at=p.contracted_at,
            completed_at=p.completed_at,
            warranty_expires_at=p.warranty_expires_at,
            customer_master_summary=customer_summary_map.get(p.customer_master_id),
            site_visit_count=len(p.site_visits) if p.site_visits else 0,
            estimate_count=len(p.estimates) if p.estimates else 0,
        )
        for p in projects
    ]
    
    return PaginatedResponse.create(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post("", response_model=APIResponse[ProjectRead], status_code=status.HTTP_201_CREATED)
async def create_project(
    project_data: ProjectCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 생성.
    
    새 프로젝트를 만들어요. 현재 활성화된 단가표 버전이 자동으로 연결돼요.
    """
    organization_id = _require_organization_id(current_user)

    # 활성 단가표 버전 조회
    revision_result = await db.execute(
        select(PricebookRevision)
        .where(PricebookRevision.status == RevisionStatus.ACTIVE)
        .order_by(PricebookRevision.effective_from.desc())
        .limit(1)
    )
    active_revision = revision_result.scalar_one_or_none()
    
    if not active_revision:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="활성화된 적산 자료가 없어요. 관리자에게 문의해 주세요.",
        )

    selected_customer = None
    snapshot_name = project_data.client_name
    snapshot_phone = project_data.client_phone

    if project_data.customer_master_id is not None:
        selected_customer = await get_customer_master_for_org(
            db=db,
            organization_id=organization_id,
            customer_id=project_data.customer_master_id,
            include_inactive=False,
        )
        if not selected_customer:
            raise NotFoundException("customer_master", project_data.customer_master_id)
    elif project_data.client_name:
        selected_customer = await upsert_customer_master(
            db=db,
            organization_id=organization_id,
            name=project_data.client_name,
            phone=project_data.client_phone,
            actor_id=current_user.id,
        )

    if selected_customer:
        if not snapshot_name:
            snapshot_name = selected_customer.name
        if not snapshot_phone:
            snapshot_phone = selected_customer.phone
    
    # 프로젝트 생성
    project = Project(
        name=project_data.name,
        address=project_data.address,
        customer_master_id=selected_customer.id if selected_customer else None,
        client_name=snapshot_name,
        client_phone=snapshot_phone,
        notes=project_data.notes,
        organization_id=organization_id,
        pricebook_revision_id=active_revision.id,
        created_by=current_user.id,
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    return APIResponse.ok(ProjectRead.model_validate(project))


@router.get("/{project_id}", response_model=APIResponse[ProjectDetail])
async def get_project(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 상세 조회.
    
    프로젝트의 상세 정보를 확인해요.
    """
    organization_id = _require_organization_id(current_user)

    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # 관계 데이터 로드
    await db.refresh(project, ["site_visits", "estimates"])
    
    customer_summary_map = await _load_customer_summary_map(
        db=db,
        organization_id=organization_id,
        customer_ids=[project.customer_master_id] if project.customer_master_id else [],
    )

    return APIResponse.ok(
        ProjectDetail(
            id=project.id,
            name=project.name,
            address=project.address,
            customer_master_id=project.customer_master_id,
            client_name=project.client_name,
            client_phone=project.client_phone,
            notes=project.notes,
            organization_id=project.organization_id,
            status=project.status,
            pricebook_revision_id=project.pricebook_revision_id,
            created_at=project.created_at,
            contracted_at=project.contracted_at,
            completed_at=project.completed_at,
            warranty_expires_at=project.warranty_expires_at,
            customer_master_summary=customer_summary_map.get(project.customer_master_id),
            site_visits=project.site_visits or [],
            estimates=project.estimates or [],
        )
    )


@router.patch("/{project_id}", response_model=APIResponse[ProjectRead])
async def update_project(
    project_id: int,
    project_data: ProjectUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 수정.
    
    프로젝트 정보를 수정해요.
    """
    organization_id = _require_organization_id(current_user)

    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    marker = object()
    update_data = project_data.model_dump(exclude_unset=True)

    customer_master_id = update_data.pop("customer_master_id", marker)
    client_name = update_data.pop("client_name", marker)
    client_phone = update_data.pop("client_phone", marker)

    selected_customer = None

    if customer_master_id is not marker:
        if customer_master_id is None:
            project.customer_master_id = None
        else:
            selected_customer = await get_customer_master_for_org(
                db=db,
                organization_id=organization_id,
                customer_id=customer_master_id,
                include_inactive=False,
            )
            if not selected_customer:
                raise NotFoundException("customer_master", customer_master_id)
            project.customer_master_id = selected_customer.id

    next_client_name = project.client_name if client_name is marker else client_name
    next_client_phone = project.client_phone if client_phone is marker else client_phone

    if customer_master_id is marker and (client_name is not marker or client_phone is not marker):
        if next_client_name:
            selected_customer = await upsert_customer_master(
                db=db,
                organization_id=organization_id,
                name=next_client_name,
                phone=next_client_phone,
                actor_id=current_user.id,
            )
            project.customer_master_id = selected_customer.id
        elif client_name is not marker and not next_client_name:
            project.customer_master_id = None

    if selected_customer:
        if client_name is marker:
            next_client_name = selected_customer.name
        if client_phone is marker:
            next_client_phone = selected_customer.phone

    if client_name is not marker or selected_customer:
        project.client_name = next_client_name
    if client_phone is not marker or selected_customer:
        project.client_phone = next_client_phone

    # 나머지 필드 업데이트
    for field, value in update_data.items():
        setattr(project, field, value)
    
    project.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(project)
    
    return APIResponse.ok(ProjectRead.model_validate(project))


@router.patch("/{project_id}/status", response_model=APIResponse[ProjectRead])
async def update_project_status(
    project_id: int,
    status_data: StatusUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 상태 변경.
    
    프로젝트의 진행 상태를 변경해요.
    """
    organization_id = _require_organization_id(current_user)

    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    new_status = status_data.status
    
    # 상태 전이 유효성 검사 (선택적)
    # TODO: 상태 전이 규칙 추가
    
    project.status = new_status
    project.updated_at = datetime.utcnow()
    
    # 상태별 타임스탬프 업데이트
    if new_status == ProjectStatus.CONTRACTED and not project.contracted_at:
        project.contracted_at = datetime.utcnow()
    elif new_status == ProjectStatus.IN_PROGRESS and not project.started_at:
        project.started_at = datetime.utcnow()
    elif new_status == ProjectStatus.COMPLETED and not project.completed_at:
        project.completed_at = datetime.utcnow()
        # 하자보증 3년
        from datetime import timedelta
        project.warranty_expires_at = project.completed_at + timedelta(days=365*3)
    
    await db.commit()
    await db.refresh(project)
    
    return APIResponse.ok(ProjectRead.model_validate(project))


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_project(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 삭제.
    
    프로젝트를 삭제해요. 삭제하면 되돌릴 수 없어요.
    """
    organization_id = _require_organization_id(current_user)

    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # 계약 완료된 프로젝트는 삭제 불가
    if project.status in [ProjectStatus.CONTRACTED, ProjectStatus.IN_PROGRESS, 
                          ProjectStatus.COMPLETED, ProjectStatus.WARRANTY]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="계약이 진행된 프로젝트는 삭제할 수 없어요",
        )
    
    await db.delete(project)
    await db.commit()


class PhotoAlbumPhoto(BaseModel):
    id: int
    storage_path: str
    caption: Optional[str]
    taken_at: Optional[datetime]


class ProjectPhotoAlbum(BaseModel):
    project_id: int
    project_name: str
    photos: dict


@router.get("/{project_id}/photo-album", response_model=APIResponse[ProjectPhotoAlbum])
async def get_project_photo_album(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """준공사진첩 조회.
    
    프로젝트의 모든 사진을 시공 전/중/후로 분류해서 보여줘요.
    """
    organization_id = _require_organization_id(current_user)

    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # Get all site visits with photos
    visits_result = await db.execute(
        select(SiteVisit)
        .where(SiteVisit.project_id == project_id)
        .options(selectinload(SiteVisit.photos))
    )
    site_visits = visits_result.scalars().all()
    
    # Categorize photos by type
    photos_by_type = {
        "before": [],
        "during": [],
        "after": [],
    }
    
    for visit in site_visits:
        for photo in visit.photos:
            photo_data = {
                "id": str(photo.id),
                "storage_path": photo.storage_path,
                "caption": photo.caption,
                "taken_at": photo.taken_at.isoformat() if photo.taken_at else None,
            }
            if photo.photo_type == PhotoType.BEFORE:
                photos_by_type["before"].append(photo_data)
            elif photo.photo_type == PhotoType.DURING:
                photos_by_type["during"].append(photo_data)
            elif photo.photo_type == PhotoType.AFTER:
                photos_by_type["after"].append(photo_data)
            else:
                photos_by_type["during"].append(photo_data)
    
    return APIResponse.ok(
        ProjectPhotoAlbum(
            project_id=project.id,
            project_name=project.name,
            photos=photos_by_type,
        )
    )


class WarrantyASRequest(BaseModel):
    id: int
    description: str
    status: str
    created_at: datetime
    resolved_at: Optional[datetime]


class WarrantyInfo(BaseModel):
    project_id: int
    warranty_expires_at: Optional[datetime]
    days_remaining: int
    is_expired: bool
    as_requests: list


@router.get("/{project_id}/warranty", response_model=APIResponse[WarrantyInfo])
async def get_warranty_info(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """하자보증 정보 조회.
    
    프로젝트의 하자보증 기간과 AS 요청 내역을 확인해요.
    """
    organization_id = _require_organization_id(current_user)

    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # Calculate days remaining
    days_remaining = 0
    is_expired = True
    
    if project.warranty_expires_at:
        now = datetime.utcnow()
        if project.warranty_expires_at > now:
            days_remaining = (project.warranty_expires_at - now).days
            is_expired = False
    
    # Get AS requests
    as_result = await db.execute(
        select(ASRequest)
        .where(ASRequest.project_id == project_id)
        .order_by(ASRequest.created_at.desc())
    )
    as_requests = as_result.scalars().all()
    
    as_request_list = [
        {
            "id": str(req.id),
            "description": req.description,
            "status": req.status.value,
            "created_at": req.created_at.isoformat(),
            "resolved_at": req.resolved_at.isoformat() if req.resolved_at else None,
        }
        for req in as_requests
    ]
    
    return APIResponse.ok(
        WarrantyInfo(
            project_id=project.id,
            warranty_expires_at=project.warranty_expires_at,
            days_remaining=days_remaining,
            is_expired=is_expired,
            as_requests=as_request_list,
        )
    )


class ASRequestCreateRequest(BaseModel):
    description: str
    photos: Optional[list] = None


class ASRequestResponse(BaseModel):
    id: int
    status: str
    message: str


@router.post("/{project_id}/warranty/as-requests", response_model=APIResponse[ASRequestResponse])
async def create_as_request(
    project_id: int,
    request_data: ASRequestCreateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """AS 요청 생성.
    
    하자보증 기간 내에 AS 요청을 등록해요.
    """
    organization_id = _require_organization_id(current_user)

    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # Check if project is in warranty period
    if project.status != ProjectStatus.WARRANTY and project.status != ProjectStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="완료된 프로젝트만 AS 요청을 할 수 있어요",
        )
    
    # Check if warranty is still valid
    if project.warranty_expires_at:
        if project.warranty_expires_at < datetime.utcnow():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="하자보증 기간이 만료되었어요",
            )
    
    import json
    photos_json = json.dumps(request_data.photos) if request_data.photos else None
    
    as_request = ASRequest(
        project_id=project_id,
        description=request_data.description,
        photos=photos_json,
        created_by=current_user.id,
    )
    
    db.add(as_request)
    await db.commit()
    await db.refresh(as_request)
    
    return APIResponse.ok(
        ASRequestResponse(
            id=as_request.id,
            status=as_request.status.value,
            message="AS 요청이 접수되었어요",
        )
    )


class CompleteProjectResponse(BaseModel):
    id: int
    status: ProjectStatus
    completed_at: datetime
    warranty_expires_at: datetime


@router.post("/{project_id}/complete", response_model=APIResponse[CompleteProjectResponse])
async def complete_project(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 완료 처리.
    
    시공이 완료된 프로젝트를 완료 처리하고 하자보증 기간을 시작해요.
    """
    organization_id = _require_organization_id(current_user)

    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # Only IN_PROGRESS projects can be completed
    if project.status != ProjectStatus.IN_PROGRESS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="진행 중인 프로젝트만 완료 처리할 수 있어요",
        )
    
    now = datetime.utcnow()
    from datetime import timedelta
    
    project.status = ProjectStatus.COMPLETED
    project.completed_at = now
    project.warranty_expires_at = now + timedelta(days=365 * 3)  # 3 years warranty
    project.updated_at = now
    
    await db.commit()
    await db.refresh(project)
    
    return APIResponse.ok(
        CompleteProjectResponse(
            id=project.id,
            status=project.status,
            completed_at=project.completed_at,
            warranty_expires_at=project.warranty_expires_at,
        )
    )
