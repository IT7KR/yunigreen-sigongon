"""현장대리인 (Field Representative) API 라우터."""
from datetime import datetime, timedelta
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.models.field_representative import (
    FieldRepresentative,
    ProjectRepresentativeAssignment,
    FieldRepresentativeCreate,
    FieldRepresentativeRead,
    AssignmentCreate,
    AssignmentRead,
)
from app.models.project import Project
from app.models.user import User
from app.schemas.response import APIResponse

router = APIRouter()

# Type aliases
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _calculate_career_cert_days(career_cert_uploaded_at: Optional[datetime]) -> Optional[int]:
    """경력증명서 잔여일수 계산 (90일 만료)."""
    if not career_cert_uploaded_at:
        return None
    expiry = career_cert_uploaded_at + timedelta(days=90)
    remaining = (expiry - datetime.utcnow()).days
    return remaining


async def _build_representative_read(
    db: AsyncSession,
    rep: FieldRepresentative,
) -> FieldRepresentativeRead:
    """FieldRepresentative DB 모델을 읽기 스키마로 변환."""
    # 배정된 프로젝트 ID 조회
    assignment_result = await db.execute(
        select(ProjectRepresentativeAssignment.project_id)
        .where(ProjectRepresentativeAssignment.representative_id == rep.id)
    )
    assigned_project_ids = list(assignment_result.scalars().all())

    return FieldRepresentativeRead(
        id=rep.id,
        organization_id=rep.organization_id,
        name=rep.name,
        phone=rep.phone,
        grade=rep.grade,
        notes=rep.notes,
        booklet_filename=rep.booklet_filename,
        career_cert_filename=rep.career_cert_filename,
        career_cert_uploaded_at=rep.career_cert_uploaded_at,
        employment_cert_filename=rep.employment_cert_filename,
        created_at=rep.created_at,
        updated_at=rep.updated_at,
        career_cert_days_remaining=_calculate_career_cert_days(rep.career_cert_uploaded_at),
        assigned_project_ids=assigned_project_ids,
    )


def _require_org_id(user: User) -> int:
    """조직 ID 필수 확인 (super_admin 제외)."""
    if user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="조직 정보가 필요한 요청이에요.",
        )
    return user.organization_id


# ──────────────────────────────────────────────────
# 현장대리인 CRUD
# ──────────────────────────────────────────────────

@router.get(
    "/field-representatives",
    response_model=APIResponse[list[FieldRepresentativeRead]],
)
async def list_field_representatives(
    db: DBSession,
    current_user: CurrentUser,
):
    """조직의 현장대리인 목록 조회.

    현재 사용자의 조직에 등록된 모든 현장대리인을 조회해요.
    Super admin은 모든 조직의 현장대리인을 볼 수 있어요.
    """
    query = select(FieldRepresentative)

    # 조직 필터 (super_admin은 전체 조회)
    if current_user.organization_id is not None:
        query = query.where(
            FieldRepresentative.organization_id == current_user.organization_id
        )

    query = query.order_by(FieldRepresentative.created_at.desc())
    result = await db.execute(query)
    reps = result.scalars().all()

    items = []
    for rep in reps:
        item = await _build_representative_read(db, rep)
        items.append(item)

    return APIResponse.ok(items)


@router.post(
    "/field-representatives",
    response_model=APIResponse[FieldRepresentativeRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_field_representative(
    data: FieldRepresentativeCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """현장대리인 등록.

    새로운 현장대리인을 등록해요.
    """
    org_id = _require_org_id(current_user)

    rep = FieldRepresentative(
        organization_id=org_id,
        name=data.name,
        phone=data.phone,
        grade=data.grade,
        notes=data.notes,
        booklet_filename=data.booklet_filename,
        career_cert_filename=data.career_cert_filename,
        career_cert_uploaded_at=data.career_cert_uploaded_at,
        employment_cert_filename=data.employment_cert_filename,
    )

    db.add(rep)
    await db.flush()
    await db.refresh(rep)

    item = await _build_representative_read(db, rep)
    return APIResponse.ok(item)


@router.put(
    "/field-representatives/{rep_id}",
    response_model=APIResponse[FieldRepresentativeRead],
)
async def update_field_representative(
    rep_id: int,
    data: FieldRepresentativeCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """현장대리인 정보 수정.

    현장대리인의 정보를 수정해요.
    """
    query = select(FieldRepresentative).where(FieldRepresentative.id == rep_id)
    if current_user.organization_id is not None:
        query = query.where(
            FieldRepresentative.organization_id == current_user.organization_id
        )

    result = await db.execute(query)
    rep = result.scalar_one_or_none()

    if not rep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="현장대리인을 찾을 수 없어요.",
        )

    rep.name = data.name
    rep.phone = data.phone
    rep.grade = data.grade
    rep.notes = data.notes
    rep.booklet_filename = data.booklet_filename
    rep.career_cert_filename = data.career_cert_filename
    rep.career_cert_uploaded_at = data.career_cert_uploaded_at
    rep.employment_cert_filename = data.employment_cert_filename
    rep.updated_at = datetime.utcnow()

    db.add(rep)
    await db.flush()
    await db.refresh(rep)

    item = await _build_representative_read(db, rep)
    return APIResponse.ok(item)


@router.delete(
    "/field-representatives/{rep_id}",
    response_model=APIResponse[dict],
)
async def delete_field_representative(
    rep_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """현장대리인 삭제.

    현장대리인을 삭제해요. 배정된 프로젝트 연결도 함께 삭제돼요.
    """
    query = select(FieldRepresentative).where(FieldRepresentative.id == rep_id)
    if current_user.organization_id is not None:
        query = query.where(
            FieldRepresentative.organization_id == current_user.organization_id
        )

    result = await db.execute(query)
    rep = result.scalar_one_or_none()

    if not rep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="현장대리인을 찾을 수 없어요.",
        )

    # 관련 배정 삭제
    assignments_result = await db.execute(
        select(ProjectRepresentativeAssignment)
        .where(ProjectRepresentativeAssignment.representative_id == rep_id)
    )
    assignments = assignments_result.scalars().all()
    for assignment in assignments:
        await db.delete(assignment)

    await db.delete(rep)
    await db.flush()

    return APIResponse.ok({"deleted": True, "id": rep_id})


# ──────────────────────────────────────────────────
# 프로젝트별 현장대리인 배정
# ──────────────────────────────────────────────────

@router.get(
    "/projects/{project_id}/representative",
    response_model=APIResponse[AssignmentRead],
)
async def get_project_representative(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트에 배정된 현장대리인 조회.

    프로젝트에 배정된 현장대리인 정보를 확인해요.
    """
    # 프로젝트 접근 권한 확인
    project_query = select(Project).where(Project.id == project_id)
    if current_user.organization_id is not None:
        project_query = project_query.where(
            Project.organization_id == current_user.organization_id
        )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로젝트를 찾을 수 없어요.",
        )

    # 배정 조회
    assignment_result = await db.execute(
        select(ProjectRepresentativeAssignment)
        .where(ProjectRepresentativeAssignment.project_id == project_id)
    )
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="이 프로젝트에 배정된 현장대리인이 없어요.",
        )

    return APIResponse.ok(
        AssignmentRead(
            id=assignment.id,
            project_id=assignment.project_id,
            representative_id=assignment.representative_id,
            effective_date=assignment.effective_date,
            assigned_at=assignment.assigned_at,
        )
    )


@router.post(
    "/projects/{project_id}/representative",
    response_model=APIResponse[AssignmentRead],
    status_code=status.HTTP_201_CREATED,
)
async def assign_project_representative(
    project_id: int,
    data: AssignmentCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트에 현장대리인 배정 (upsert).

    프로젝트에 현장대리인을 배정해요.
    이미 배정된 경우 기존 배정을 교체해요.
    """
    # 프로젝트 접근 권한 확인
    project_query = select(Project).where(Project.id == project_id)
    if current_user.organization_id is not None:
        project_query = project_query.where(
            Project.organization_id == current_user.organization_id
        )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로젝트를 찾을 수 없어요.",
        )

    # 현장대리인 존재 확인
    rep_query = select(FieldRepresentative).where(
        FieldRepresentative.id == data.representative_id
    )
    if current_user.organization_id is not None:
        rep_query = rep_query.where(
            FieldRepresentative.organization_id == current_user.organization_id
        )
    rep_result = await db.execute(rep_query)
    rep = rep_result.scalar_one_or_none()

    if not rep:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="현장대리인을 찾을 수 없어요.",
        )

    # 기존 배정 확인 (upsert)
    existing_result = await db.execute(
        select(ProjectRepresentativeAssignment)
        .where(ProjectRepresentativeAssignment.project_id == project_id)
    )
    existing = existing_result.scalar_one_or_none()

    if existing:
        # 기존 배정 업데이트
        existing.representative_id = data.representative_id
        existing.effective_date = data.effective_date
        existing.assigned_at = datetime.utcnow()
        db.add(existing)
        await db.flush()
        await db.refresh(existing)
        assignment = existing
    else:
        # 새 배정 생성
        assignment = ProjectRepresentativeAssignment(
            project_id=project_id,
            representative_id=data.representative_id,
            effective_date=data.effective_date,
        )
        db.add(assignment)
        await db.flush()
        await db.refresh(assignment)

    return APIResponse.ok(
        AssignmentRead(
            id=assignment.id,
            project_id=assignment.project_id,
            representative_id=assignment.representative_id,
            effective_date=assignment.effective_date,
            assigned_at=assignment.assigned_at,
        )
    )


@router.delete(
    "/projects/{project_id}/representative",
    response_model=APIResponse[dict],
)
async def remove_project_representative(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 현장대리인 배정 해제.

    프로젝트에서 현장대리인 배정을 해제해요.
    """
    # 프로젝트 접근 권한 확인
    project_query = select(Project).where(Project.id == project_id)
    if current_user.organization_id is not None:
        project_query = project_query.where(
            Project.organization_id == current_user.organization_id
        )
    project_result = await db.execute(project_query)
    project = project_result.scalar_one_or_none()

    if not project:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="프로젝트를 찾을 수 없어요.",
        )

    # 배정 조회
    assignment_result = await db.execute(
        select(ProjectRepresentativeAssignment)
        .where(ProjectRepresentativeAssignment.project_id == project_id)
    )
    assignment = assignment_result.scalar_one_or_none()

    if not assignment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="이 프로젝트에 배정된 현장대리인이 없어요.",
        )

    await db.delete(assignment)
    await db.flush()

    return APIResponse.ok({"deleted": True, "project_id": project_id})
