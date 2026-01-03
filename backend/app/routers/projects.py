"""프로젝트 API 라우터."""
import uuid
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.project import (
    Project, 
    ProjectStatus, 
    ProjectCreate, 
    ProjectRead, 
    ProjectUpdate,
)
from app.models.pricebook import PricebookRevision, RevisionStatus
from app.schemas.response import APIResponse, PaginatedResponse

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class ProjectListItem(ProjectRead):
    """프로젝트 목록 아이템."""
    site_visit_count: int = 0
    estimate_count: int = 0


class ProjectDetail(ProjectRead):
    """프로젝트 상세 정보."""
    site_visits: list = []
    estimates: list = []


class StatusUpdateRequest:
    """상태 변경 요청."""
    status: ProjectStatus


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
    # 기본 쿼리 (조직 필터)
    query = select(Project).where(
        Project.organization_id == current_user.organization_id
    )
    
    # 상태 필터
    if status:
        query = query.where(Project.status == status)
    
    # 검색 필터 (이름, 주소, 고객명)
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (Project.name.ilike(search_filter)) |
            (Project.address.ilike(search_filter)) |
            (Project.client_name.ilike(search_filter))
        )
    
    # 전체 개수 조회
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # 페이지네이션
    query = query.order_by(Project.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    projects = result.scalars().all()
    
    # 응답 변환
    items = [
        ProjectListItem(
            id=p.id,
            name=p.name,
            address=p.address,
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
            detail="활성화된 단가표가 없어요. 관리자에게 문의해 주세요.",
        )
    
    # 프로젝트 생성
    project = Project(
        name=project_data.name,
        address=project_data.address,
        client_name=project_data.client_name,
        client_phone=project_data.client_phone,
        notes=project_data.notes,
        organization_id=current_user.organization_id,
        pricebook_revision_id=active_revision.id,
        created_by=current_user.id,
    )
    
    db.add(project)
    await db.commit()
    await db.refresh(project)
    
    return APIResponse.ok(ProjectRead.model_validate(project))


@router.get("/{project_id}", response_model=APIResponse[ProjectDetail])
async def get_project(
    project_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 상세 조회.
    
    프로젝트의 상세 정보를 확인해요.
    """
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # 관계 데이터 로드
    await db.refresh(project, ["site_visits", "estimates"])
    
    return APIResponse.ok(
        ProjectDetail(
            id=project.id,
            name=project.name,
            address=project.address,
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
            site_visits=project.site_visits or [],
            estimates=project.estimates or [],
        )
    )


@router.patch("/{project_id}", response_model=APIResponse[ProjectRead])
async def update_project(
    project_id: uuid.UUID,
    project_data: ProjectUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 수정.
    
    프로젝트 정보를 수정해요.
    """
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # 업데이트할 필드만 적용
    update_data = project_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(project, field, value)
    
    project.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(project)
    
    return APIResponse.ok(ProjectRead.model_validate(project))


@router.patch("/{project_id}/status", response_model=APIResponse[ProjectRead])
async def update_project_status(
    project_id: uuid.UUID,
    status_data: StatusUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 상태 변경.
    
    프로젝트의 진행 상태를 변경해요.
    """
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    old_status = project.status
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
    project_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 삭제.
    
    프로젝트를 삭제해요. 삭제하면 되돌릴 수 없어요.
    """
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
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
