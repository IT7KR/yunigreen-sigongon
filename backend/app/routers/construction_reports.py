"""착공계/준공계 API 라우터."""
from datetime import datetime, date
from typing import Annotated, Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
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
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.construction_report import (
    ConstructionReport,
    ReportType,
    ReportStatus,
    ConstructionReportCreate,
    ConstructionReportRead,
    ConstructionReportUpdate,
)
from app.schemas.response import APIResponse, PaginatedResponse

router = APIRouter()

# Type aliases
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

_REPORT_EDIT_ROLES = {ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN, ROLE_SITE_MANAGER}
_REPORT_APPROVE_ROLES = {ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN}


# Response Schemas
class ConstructionReportListItem(BaseModel):
    """보고서 목록 아이템."""
    id: int
    project_id: int
    report_type: str
    report_number: Optional[str]
    status: str
    construction_name: Optional[str]
    start_date: Optional[date]
    actual_end_date: Optional[date]
    created_at: datetime
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]


class ConstructionReportDetail(BaseModel):
    """보고서 상세 정보."""
    id: int
    project_id: int
    report_type: str
    report_number: Optional[str]
    status: str
    notes: Optional[str]
    auto_link_representative_docs: bool
    # 착공계 fields
    construction_name: Optional[str]
    site_address: Optional[str]
    start_date: Optional[date]
    expected_end_date: Optional[date]
    supervisor_name: Optional[str]
    supervisor_phone: Optional[str]
    # 준공계 fields
    actual_end_date: Optional[date]
    final_amount: Optional[Decimal]
    defect_warranty_period: Optional[int]
    # Timestamps
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    # Audit
    created_by: int
    approved_by: Optional[int]


class CreateStartReportRequest(BaseModel):
    """착공계 생성 요청."""
    construction_name: str
    site_address: Optional[str] = None
    start_date: date
    expected_end_date: Optional[date] = None
    supervisor_name: Optional[str] = None
    supervisor_phone: Optional[str] = None
    auto_link_representative_docs: bool = True
    notes: Optional[str] = None


class CreateCompletionReportRequest(BaseModel):
    """준공계 생성 요청."""
    actual_end_date: date
    final_amount: Optional[Decimal] = None
    defect_warranty_period: Optional[int] = 36  # 기본 3년 (36개월)
    notes: Optional[str] = None


class UpdateReportRequest(BaseModel):
    """보고서 수정 요청."""
    notes: Optional[str] = None
    auto_link_representative_docs: Optional[bool] = None
    construction_name: Optional[str] = None
    site_address: Optional[str] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    supervisor_name: Optional[str] = None
    supervisor_phone: Optional[str] = None
    actual_end_date: Optional[date] = None
    final_amount: Optional[Decimal] = None
    defect_warranty_period: Optional[int] = None


def _generate_report_number(report_type: ReportType, project_id: int) -> str:
    """Generate report number like SCR-20260126-abc123 or CCR-20260126-abc123."""
    prefix = "SCR" if report_type == ReportType.START else "CCR"
    date_str = datetime.utcnow().strftime("%Y%m%d")
    id_suffix = str(project_id)[:8]
    return f"{prefix}-{date_str}-{id_suffix}"


def _require_report_edit_role(current_user: User) -> None:
    if role_value(current_user) not in _REPORT_EDIT_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="착공계/준공계 작성 권한이 없어요",
        )


def _require_report_approve_role(current_user: User) -> None:
    if role_value(current_user) not in _REPORT_APPROVE_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="착공계/준공계 승인 권한이 없어요",
        )


async def _get_report_and_project(
    db: AsyncSession,
    report_id: int,
    current_user: User,
) -> tuple[ConstructionReport, object]:
    report = (
        await db.execute(select(ConstructionReport).where(ConstructionReport.id == report_id))
    ).scalar_one_or_none()
    if not report:
        raise NotFoundException("construction_report", report_id)
    project = await get_project_for_user(db, report.project_id, current_user)
    return report, project


@router.get("/projects/{project_id}/construction-reports", response_model=PaginatedResponse[ConstructionReportListItem])
async def list_project_reports(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    report_type: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    """프로젝트의 착공계/준공계 목록 조회.

    프로젝트에 속한 착공계와 준공계 목록을 조회해요.
    """
    await get_project_for_user(db, project_id, current_user)

    # Build query
    query = select(ConstructionReport).where(ConstructionReport.project_id == project_id)

    # Filter by report type
    if report_type:
        query = query.where(ConstructionReport.report_type == report_type)

    # Filter by status
    if status_filter:
        query = query.where(ConstructionReport.status == status_filter)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    query = query.order_by(ConstructionReport.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    reports = result.scalars().all()

    # Convert to response items
    items = [
        ConstructionReportListItem(
            id=report.id,
            project_id=report.project_id,
            report_type=report.report_type.value,
            report_number=report.report_number,
            status=report.status.value,
            construction_name=report.construction_name,
            start_date=report.start_date,
            actual_end_date=report.actual_end_date,
            created_at=report.created_at,
            submitted_at=report.submitted_at,
            approved_at=report.approved_at,
        )
        for report in reports
    ]

    return PaginatedResponse.create(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post("/projects/{project_id}/construction-reports/start", response_model=APIResponse[ConstructionReportDetail], status_code=status.HTTP_201_CREATED)
async def create_start_report(
    project_id: int,
    report_data: CreateStartReportRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """착공계 생성.

    프로젝트의 착공계를 생성해요.
    """
    await get_project_for_user(db, project_id, current_user)
    _require_report_edit_role(current_user)

    # Check if start report already exists
    existing_result = await db.execute(
        select(ConstructionReport)
        .where(ConstructionReport.project_id == project_id)
        .where(ConstructionReport.report_type == ReportType.START)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이 프로젝트에는 이미 착공계가 있어요",
        )

    # Create report
    report = ConstructionReport(
        project_id=project_id,
        report_type=ReportType.START,
        report_number=_generate_report_number(ReportType.START, project_id),
        auto_link_representative_docs=report_data.auto_link_representative_docs,
        construction_name=report_data.construction_name,
        site_address=report_data.site_address,
        start_date=report_data.start_date,
        expected_end_date=report_data.expected_end_date,
        supervisor_name=report_data.supervisor_name,
        supervisor_phone=report_data.supervisor_phone,
        notes=report_data.notes,
        created_by=current_user.id,
    )

    # 현장대리인 자동 연동 (supervisor 정보가 비어있을 때)
    if report.auto_link_representative_docs and not report.supervisor_name:
        from app.models.field_representative import ProjectRepresentativeAssignment, FieldRepresentative
        assignment_result = await db.execute(
            select(ProjectRepresentativeAssignment)
            .where(ProjectRepresentativeAssignment.project_id == project_id)
            .order_by(ProjectRepresentativeAssignment.assigned_at.desc())
        )
        assignment = assignment_result.scalar_one_or_none()
        if assignment:
            rep_result = await db.execute(
                select(FieldRepresentative)
                .where(FieldRepresentative.id == assignment.representative_id)
            )
            rep = rep_result.scalar_one_or_none()
            if rep:
                if not report.supervisor_name:
                    report.supervisor_name = rep.name
                if not report.supervisor_phone:
                    report.supervisor_phone = rep.phone

    db.add(report)
    await db.commit()
    await db.refresh(report)

    return APIResponse.ok(_to_detail(report))


@router.post("/projects/{project_id}/construction-reports/completion", response_model=APIResponse[ConstructionReportDetail], status_code=status.HTTP_201_CREATED)
async def create_completion_report(
    project_id: int,
    report_data: CreateCompletionReportRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """준공계 생성.

    프로젝트의 준공계를 생성해요. 착공계가 승인된 후에만 생성할 수 있어요.
    """
    await get_project_for_user(db, project_id, current_user)
    _require_report_edit_role(current_user)

    # Check if start report exists and is approved
    start_report_result = await db.execute(
        select(ConstructionReport)
        .where(ConstructionReport.project_id == project_id)
        .where(ConstructionReport.report_type == ReportType.START)
    )
    start_report = start_report_result.scalar_one_or_none()

    if not start_report:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="착공계가 먼저 제출되어야 해요",
        )

    if start_report.status != ReportStatus.APPROVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="착공계가 승인된 후에만 준공계를 생성할 수 있어요",
        )

    # Check if completion report already exists
    existing_result = await db.execute(
        select(ConstructionReport)
        .where(ConstructionReport.project_id == project_id)
        .where(ConstructionReport.report_type == ReportType.COMPLETION)
    )
    if existing_result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이 프로젝트에는 이미 준공계가 있어요",
        )

    # Create report
    report = ConstructionReport(
        project_id=project_id,
        report_type=ReportType.COMPLETION,
        report_number=_generate_report_number(ReportType.COMPLETION, project_id),
        # Copy from start report
        construction_name=start_report.construction_name,
        site_address=start_report.site_address,
        start_date=start_report.start_date,
        supervisor_name=start_report.supervisor_name,
        supervisor_phone=start_report.supervisor_phone,
        # Completion specific
        actual_end_date=report_data.actual_end_date,
        final_amount=report_data.final_amount,
        defect_warranty_period=report_data.defect_warranty_period,
        notes=report_data.notes,
        created_by=current_user.id,
    )

    db.add(report)
    await db.commit()
    await db.refresh(report)

    return APIResponse.ok(_to_detail(report))


@router.get("/construction-reports/{report_id}", response_model=APIResponse[ConstructionReportDetail])
async def get_report(
    report_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """보고서 상세 조회.

    착공계 또는 준공계의 상세 정보를 확인해요.
    """
    report, _ = await _get_report_and_project(db, report_id, current_user)

    return APIResponse.ok(_to_detail(report))


@router.put("/construction-reports/{report_id}", response_model=APIResponse[ConstructionReportDetail])
async def update_report(
    report_id: int,
    report_data: UpdateReportRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """보고서 수정.

    착공계 또는 준공계 정보를 수정해요. 초안(draft) 상태에서만 수정할 수 있어요.
    """
    report, _ = await _get_report_and_project(db, report_id, current_user)
    _require_report_edit_role(current_user)

    # Only allow editing draft reports
    if report.status != ReportStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="초안 상태의 보고서만 수정할 수 있어요",
        )

    # Update fields
    update_data = report_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(report, field, value)

    report.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(report)

    return APIResponse.ok(_to_detail(report))


@router.post("/construction-reports/{report_id}/submit", response_model=APIResponse[ConstructionReportDetail])
async def submit_report(
    report_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """보고서 제출.

    착공계 또는 준공계를 제출해요. 제출 후에는 수정할 수 없어요.
    """
    report, _ = await _get_report_and_project(db, report_id, current_user)
    _require_report_edit_role(current_user)

    # Only draft reports can be submitted
    if report.status != ReportStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 제출된 보고서예요",
        )

    report.status = ReportStatus.SUBMITTED
    report.submitted_at = datetime.utcnow()
    report.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(report)

    return APIResponse.ok(_to_detail(report))


@router.post("/construction-reports/{report_id}/approve", response_model=APIResponse[ConstructionReportDetail])
async def approve_report(
    report_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """보고서 승인.

    제출된 착공계 또는 준공계를 승인해요.
    """
    report, _ = await _get_report_and_project(db, report_id, current_user)
    _require_report_approve_role(current_user)

    # Only submitted reports can be approved
    if report.status != ReportStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="제출된 보고서만 승인할 수 있어요",
        )

    report.status = ReportStatus.APPROVED
    report.approved_at = datetime.utcnow()
    report.approved_by = current_user.id
    report.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(report)

    return APIResponse.ok(_to_detail(report))


@router.post("/construction-reports/{report_id}/reject", response_model=APIResponse[ConstructionReportDetail])
async def reject_report(
    report_id: int,
    db: DBSession,
    current_user: CurrentUser,
    reason: Optional[str] = Query(default=None),
):
    """보고서 반려.

    제출된 착공계 또는 준공계를 반려해요.
    """
    report, _ = await _get_report_and_project(db, report_id, current_user)
    _require_report_approve_role(current_user)

    # Only submitted reports can be rejected
    if report.status != ReportStatus.SUBMITTED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="제출된 보고서만 반려할 수 있어요",
        )

    report.status = ReportStatus.REJECTED
    if reason:
        report.notes = f"{report.notes or ''}\n[반려 사유] {reason}".strip()
    report.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(report)

    return APIResponse.ok(_to_detail(report))


@router.get("/construction-reports/{report_id}/export", response_model=APIResponse[dict])
async def export_report(
    report_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """보고서 PDF 내보내기.

    착공계 또는 준공계를 PDF로 다운로드할 수 있는 데이터를 제공해요.
    """
    report, project = await _get_report_and_project(db, report_id, current_user)

    # Return data for PDF generation
    return APIResponse.ok({
        "report_id": str(report_id),
        "report_number": report.report_number,
        "report_type": report.report_type.value,
        "report_type_name": "착공계" if report.report_type == ReportType.START else "준공계",
        "status": report.status.value,
        "auto_link_representative_docs": report.auto_link_representative_docs,
        "project_name": project.name,
        "project_address": project.address,
        "construction_name": report.construction_name,
        "site_address": report.site_address,
        "start_date": report.start_date.isoformat() if report.start_date else None,
        "expected_end_date": report.expected_end_date.isoformat() if report.expected_end_date else None,
        "actual_end_date": report.actual_end_date.isoformat() if report.actual_end_date else None,
        "final_amount": str(report.final_amount) if report.final_amount else None,
        "defect_warranty_period": report.defect_warranty_period,
        "supervisor_name": report.supervisor_name,
        "supervisor_phone": report.supervisor_phone,
        "notes": report.notes,
        "created_at": report.created_at.isoformat(),
        "submitted_at": report.submitted_at.isoformat() if report.submitted_at else None,
        "approved_at": report.approved_at.isoformat() if report.approved_at else None,
        "message": "PDF 생성 데이터입니다. 클라이언트에서 PDF를 생성하세요.",
    })


def _to_detail(report: ConstructionReport) -> ConstructionReportDetail:
    """Convert report model to detail response."""
    return ConstructionReportDetail(
        id=report.id,
        project_id=report.project_id,
        report_type=report.report_type.value,
        report_number=report.report_number,
        status=report.status.value,
        notes=report.notes,
        auto_link_representative_docs=report.auto_link_representative_docs,
        construction_name=report.construction_name,
        site_address=report.site_address,
        start_date=report.start_date,
        expected_end_date=report.expected_end_date,
        supervisor_name=report.supervisor_name,
        supervisor_phone=report.supervisor_phone,
        actual_end_date=report.actual_end_date,
        final_amount=report.final_amount,
        defect_warranty_period=report.defect_warranty_period,
        created_at=report.created_at,
        updated_at=report.updated_at,
        submitted_at=report.submitted_at,
        approved_at=report.approved_at,
        created_by=report.created_by,
        approved_by=report.approved_by,
    )
