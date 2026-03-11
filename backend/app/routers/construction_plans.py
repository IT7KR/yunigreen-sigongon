"""시공계획서 (Construction Plan) API 라우터."""
from datetime import datetime, date
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.permissions import (
    ROLE_COMPANY_ADMIN,
    ROLE_SITE_MANAGER,
    ROLE_SUPER_ADMIN,
    get_project_for_user,
    role_value,
)
from app.core.security import get_current_user
from app.models.user import User
from app.models.construction_plan import (
    ConstructionPlan,
    ConstructionPhase,
    PhaseStatus,
    ConstructionPlanCreate,
    ConstructionPlanUpdate,
    ConstructionPhaseCreate,
    ConstructionPhaseUpdate,
    ConstructionPhaseRead,
    ConstructionPlanRead,
    PlanSummary,
    ConstructionPlanDetail,
)
from app.schemas.response import APIResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

_EDIT_ROLES = {ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN, ROLE_SITE_MANAGER}


def _compute_phase_read(phase: ConstructionPhase) -> ConstructionPhaseRead:
    """Compute derived fields for a phase."""
    today = date.today()
    planned_days = (phase.planned_end - phase.planned_start).days + 1
    actual_days = None
    if phase.actual_start and phase.actual_end:
        actual_days = (phase.actual_end - phase.actual_start).days + 1

    is_delayed = (
        phase.status != PhaseStatus.COMPLETED
        and today > phase.planned_end
    )
    delay_days = max(0, (today - phase.planned_end).days) if is_delayed else 0

    return ConstructionPhaseRead(
        id=phase.id,
        plan_id=phase.plan_id,
        sort_order=phase.sort_order,
        name=phase.name,
        planned_start=phase.planned_start,
        planned_end=phase.planned_end,
        actual_start=phase.actual_start,
        actual_end=phase.actual_end,
        status=phase.status,
        notes=phase.notes,
        completed_at=phase.completed_at,
        completed_by=phase.completed_by,
        created_at=phase.created_at,
        updated_at=phase.updated_at,
        planned_days=planned_days,
        actual_days=actual_days,
        is_delayed=is_delayed,
        delay_days=delay_days,
    )


def _build_plan_detail(plan: ConstructionPlan, phases: list[ConstructionPhase]) -> ConstructionPlanDetail:
    """Build full plan detail with phases and summary."""
    phase_reads = [_compute_phase_read(p) for p in sorted(phases, key=lambda x: x.sort_order)]

    total = len(phase_reads)
    completed = sum(1 for p in phase_reads if p.status == PhaseStatus.COMPLETED)
    in_progress = sum(1 for p in phase_reads if p.status == PhaseStatus.IN_PROGRESS)
    pending = sum(1 for p in phase_reads if p.status == PhaseStatus.PENDING)
    delayed = sum(1 for p in phase_reads if p.is_delayed)
    progress_percent = int((completed / total) * 100) if total > 0 else 0

    plan_read = ConstructionPlanRead(
        id=plan.id,
        project_id=plan.project_id,
        organization_id=plan.organization_id,
        title=plan.title,
        notes=plan.notes,
        created_by=plan.created_by,
        created_at=plan.created_at,
        updated_at=plan.updated_at,
    )

    summary = PlanSummary(
        total=total,
        completed=completed,
        in_progress=in_progress,
        pending=pending,
        delayed=delayed,
        progress_percent=progress_percent,
    )

    return ConstructionPlanDetail(plan=plan_read, phases=phase_reads, summary=summary)


@router.get("/projects/{project_id}/construction-plan", response_model=APIResponse)
async def get_construction_plan(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """시공계획서 조회."""
    project = await get_project_for_user(db, project_id, current_user)

    plan = (
        await db.execute(
            select(ConstructionPlan).where(ConstructionPlan.project_id == project_id)
        )
    ).scalar_one_or_none()

    if not plan:
        return APIResponse(success=True, data=None)

    phases = (
        await db.execute(
            select(ConstructionPhase).where(ConstructionPhase.plan_id == plan.id)
        )
    ).scalars().all()

    return APIResponse(success=True, data=_build_plan_detail(plan, list(phases)))


@router.post("/projects/{project_id}/construction-plan", response_model=APIResponse)
async def create_construction_plan(
    project_id: int,
    body: ConstructionPlanCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """시공계획서 생성."""
    project = await get_project_for_user(db, project_id, current_user)

    if role_value(current_user) not in _EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")

    # Check if plan already exists
    existing = (
        await db.execute(
            select(ConstructionPlan).where(ConstructionPlan.project_id == project_id)
        )
    ).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 시공계획서가 존재합니다.")

    plan = ConstructionPlan(
        project_id=project_id,
        organization_id=project.organization_id,
        title=body.title,
        notes=body.notes,
        created_by=current_user.id,
    )
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    return APIResponse(success=True, data=_build_plan_detail(plan, []))


@router.patch("/projects/{project_id}/construction-plan", response_model=APIResponse)
async def update_construction_plan(
    project_id: int,
    body: ConstructionPlanUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """시공계획서 수정."""
    await get_project_for_user(db, project_id, current_user)

    if role_value(current_user) not in _EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")

    plan = (
        await db.execute(
            select(ConstructionPlan).where(ConstructionPlan.project_id == project_id)
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="시공계획서를 찾을 수 없습니다.")

    if body.title is not None:
        plan.title = body.title
    if body.notes is not None:
        plan.notes = body.notes
    plan.updated_at = datetime.utcnow()

    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    phases = (
        await db.execute(
            select(ConstructionPhase).where(ConstructionPhase.plan_id == plan.id)
        )
    ).scalars().all()

    return APIResponse(success=True, data=_build_plan_detail(plan, list(phases)))


@router.post("/projects/{project_id}/construction-plan/phases", response_model=APIResponse)
async def add_phase(
    project_id: int,
    body: ConstructionPhaseCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """공정 추가."""
    await get_project_for_user(db, project_id, current_user)

    if role_value(current_user) not in _EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")

    plan = (
        await db.execute(
            select(ConstructionPlan).where(ConstructionPlan.project_id == project_id)
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="시공계획서를 찾을 수 없습니다.")

    # Determine sort_order
    if body.sort_order is not None:
        sort_order = body.sort_order
    else:
        existing_phases = (
            await db.execute(
                select(ConstructionPhase).where(ConstructionPhase.plan_id == plan.id)
            )
        ).scalars().all()
        sort_order = max((p.sort_order for p in existing_phases), default=-1) + 1

    phase = ConstructionPhase(
        plan_id=plan.id,
        sort_order=sort_order,
        name=body.name,
        planned_start=body.planned_start,
        planned_end=body.planned_end,
        notes=body.notes,
    )
    db.add(phase)
    plan.updated_at = datetime.utcnow()
    db.add(plan)
    await db.commit()
    await db.refresh(plan)

    all_phases = (
        await db.execute(
            select(ConstructionPhase).where(ConstructionPhase.plan_id == plan.id)
        )
    ).scalars().all()

    return APIResponse(success=True, data=_build_plan_detail(plan, list(all_phases)))


@router.patch("/projects/{project_id}/construction-plan/phases/reorder", response_model=APIResponse)
async def reorder_phases(
    project_id: int,
    body: dict,
    db: DBSession,
    current_user: CurrentUser,
):
    """공정 순서 변경."""
    await get_project_for_user(db, project_id, current_user)

    if role_value(current_user) not in _EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")

    plan = (
        await db.execute(
            select(ConstructionPlan).where(ConstructionPlan.project_id == project_id)
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="시공계획서를 찾을 수 없습니다.")

    phase_ids: list[int] = body.get("phase_ids", [])
    all_phases = (
        await db.execute(
            select(ConstructionPhase).where(ConstructionPhase.plan_id == plan.id)
        )
    ).scalars().all()

    phase_map = {p.id: p for p in all_phases}
    for i, pid in enumerate(phase_ids):
        if pid in phase_map:
            phase_map[pid].sort_order = i
            phase_map[pid].updated_at = datetime.utcnow()
            db.add(phase_map[pid])

    plan.updated_at = datetime.utcnow()
    db.add(plan)
    await db.commit()

    updated_phases = (
        await db.execute(
            select(ConstructionPhase).where(ConstructionPhase.plan_id == plan.id)
        )
    ).scalars().all()

    return APIResponse(success=True, data=_build_plan_detail(plan, list(updated_phases)))


@router.patch("/projects/{project_id}/construction-plan/phases/{phase_id}", response_model=APIResponse)
async def update_phase(
    project_id: int,
    phase_id: int,
    body: ConstructionPhaseUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """공정 수정."""
    await get_project_for_user(db, project_id, current_user)

    if role_value(current_user) not in _EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")

    plan = (
        await db.execute(
            select(ConstructionPlan).where(ConstructionPlan.project_id == project_id)
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="시공계획서를 찾을 수 없습니다.")

    phase = (
        await db.execute(
            select(ConstructionPhase).where(
                ConstructionPhase.id == phase_id,
                ConstructionPhase.plan_id == plan.id,
            )
        )
    ).scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공정을 찾을 수 없습니다.")

    if body.name is not None:
        phase.name = body.name
    if body.planned_start is not None:
        phase.planned_start = body.planned_start
    if body.planned_end is not None:
        phase.planned_end = body.planned_end
    if body.sort_order is not None:
        phase.sort_order = body.sort_order
    if body.notes is not None:
        phase.notes = body.notes
    phase.updated_at = datetime.utcnow()

    db.add(phase)
    plan.updated_at = datetime.utcnow()
    db.add(plan)
    await db.commit()

    all_phases = (
        await db.execute(
            select(ConstructionPhase).where(ConstructionPhase.plan_id == plan.id)
        )
    ).scalars().all()

    return APIResponse(success=True, data=_build_plan_detail(plan, list(all_phases)))


@router.patch("/projects/{project_id}/construction-plan/phases/{phase_id}/toggle", response_model=APIResponse)
async def toggle_phase(
    project_id: int,
    phase_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """공정 완료 토글."""
    await get_project_for_user(db, project_id, current_user)

    if role_value(current_user) not in _EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")

    plan = (
        await db.execute(
            select(ConstructionPlan).where(ConstructionPlan.project_id == project_id)
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="시공계획서를 찾을 수 없습니다.")

    phase = (
        await db.execute(
            select(ConstructionPhase).where(
                ConstructionPhase.id == phase_id,
                ConstructionPhase.plan_id == plan.id,
            )
        )
    ).scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공정을 찾을 수 없습니다.")

    if phase.status == PhaseStatus.COMPLETED:
        # Uncomplete
        phase.status = PhaseStatus.IN_PROGRESS
        phase.actual_end = None
        phase.completed_at = None
        phase.completed_by = None
    else:
        # Complete
        phase.status = PhaseStatus.COMPLETED
        phase.actual_end = date.today()
        if not phase.actual_start:
            phase.actual_start = phase.planned_start
        phase.completed_at = datetime.utcnow()
        phase.completed_by = current_user.id

    phase.updated_at = datetime.utcnow()
    db.add(phase)
    plan.updated_at = datetime.utcnow()
    db.add(plan)
    await db.commit()

    all_phases = (
        await db.execute(
            select(ConstructionPhase).where(ConstructionPhase.plan_id == plan.id)
        )
    ).scalars().all()

    return APIResponse(success=True, data=_build_plan_detail(plan, list(all_phases)))


@router.delete("/projects/{project_id}/construction-plan/phases/{phase_id}", response_model=APIResponse)
async def delete_phase(
    project_id: int,
    phase_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """공정 삭제."""
    await get_project_for_user(db, project_id, current_user)

    if role_value(current_user) not in _EDIT_ROLES:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")

    plan = (
        await db.execute(
            select(ConstructionPlan).where(ConstructionPlan.project_id == project_id)
        )
    ).scalar_one_or_none()
    if not plan:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="시공계획서를 찾을 수 없습니다.")

    phase = (
        await db.execute(
            select(ConstructionPhase).where(
                ConstructionPhase.id == phase_id,
                ConstructionPhase.plan_id == plan.id,
            )
        )
    ).scalar_one_or_none()
    if not phase:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="공정을 찾을 수 없습니다.")

    await db.delete(phase)
    plan.updated_at = datetime.utcnow()
    db.add(plan)
    await db.commit()

    return APIResponse(success=True, data={"deleted": True})
