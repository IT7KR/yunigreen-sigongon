"""ConstructionReport models for 착공계 (Start Report) and 준공계 (Completion Report)."""
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User


class ReportType(str, Enum):
    """Report type enumeration."""
    START = "start"  # 착공계
    COMPLETION = "completion"  # 준공계


class ReportStatus(str, Enum):
    """Report status enumeration."""
    DRAFT = "draft"
    SUBMITTED = "submitted"
    APPROVED = "approved"
    REJECTED = "rejected"


class ConstructionReportBase(SQLModel):
    """ConstructionReport base fields."""
    report_type: ReportType
    notes: Optional[str] = Field(default=None)

    # 착공계 specific fields
    construction_name: Optional[str] = Field(default=None, max_length=255)  # 공사명
    site_address: Optional[str] = Field(default=None)  # 현장주소
    start_date: Optional[date] = Field(default=None)  # 착공일
    expected_end_date: Optional[date] = Field(default=None)  # 예정 준공일
    supervisor_name: Optional[str] = Field(default=None, max_length=100)  # 현장 책임자
    supervisor_phone: Optional[str] = Field(default=None, max_length=20)

    # 준공계 specific fields
    actual_end_date: Optional[date] = Field(default=None)  # 실제 준공일
    final_amount: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)  # 최종 공사금액
    defect_warranty_period: Optional[int] = Field(default=None)  # 하자보수 기간 (월)


class ConstructionReport(ConstructionReportBase, table=True):
    """ConstructionReport model - Start and completion reports for construction projects."""
    __tablename__ = "construction_report"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(sa_type=BigInteger, index=True)

    # Auto-generated report number
    report_number: Optional[str] = Field(default=None, max_length=50, index=True)

    # Status
    status: ReportStatus = Field(default=ReportStatus.DRAFT, index=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    submitted_at: Optional[datetime] = Field(default=None)
    approved_at: Optional[datetime] = Field(default=None)

    # Audit
    created_by: int = Field(sa_type=BigInteger)
    approved_by: Optional[int] = Field(default=None, sa_type=BigInteger)

    # Relationships
    project: Optional["Project"] = Relationship(
        sa_relationship_kwargs={
            "primaryjoin": "ConstructionReport.project_id == Project.id",
            "foreign_keys": "[ConstructionReport.project_id]",
        },
    )


class ConstructionReportCreate(SQLModel):
    """Schema for creating construction report."""
    project_id: int
    report_type: ReportType
    notes: Optional[str] = None

    # 착공계 specific fields
    construction_name: Optional[str] = None
    site_address: Optional[str] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    supervisor_name: Optional[str] = None
    supervisor_phone: Optional[str] = None

    # 준공계 specific fields
    actual_end_date: Optional[date] = None
    final_amount: Optional[Decimal] = None
    defect_warranty_period: Optional[int] = None


class ConstructionReportRead(ConstructionReportBase):
    """Schema for reading construction report."""
    id: int
    project_id: int
    report_number: Optional[str]
    status: ReportStatus
    created_at: datetime
    updated_at: datetime
    submitted_at: Optional[datetime]
    approved_at: Optional[datetime]
    created_by: int
    approved_by: Optional[int]


class ConstructionReportUpdate(SQLModel):
    """Schema for updating construction report."""
    notes: Optional[str] = None

    # 착공계 specific fields
    construction_name: Optional[str] = None
    site_address: Optional[str] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    supervisor_name: Optional[str] = None
    supervisor_phone: Optional[str] = None

    # 준공계 specific fields
    actual_end_date: Optional[date] = None
    final_amount: Optional[Decimal] = None
    defect_warranty_period: Optional[int] = None


class ConstructionReportSubmit(SQLModel):
    """Schema for submitting construction report for approval."""
    pass  # Submission changes status from DRAFT to SUBMITTED
