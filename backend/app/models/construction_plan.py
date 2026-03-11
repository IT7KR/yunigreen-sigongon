"""ConstructionPlan models for 시공계획서 (Construction Plan)."""
from datetime import datetime, date
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    pass


class PhaseStatus(str, Enum):
    """Construction phase status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class ConstructionPlan(SQLModel, table=True):
    """ConstructionPlan - one per project (1:1 relationship)."""
    __tablename__ = "construction_plan"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(sa_type=BigInteger, unique=True, index=True)
    organization_id: int = Field(sa_type=BigInteger, index=True)
    title: Optional[str] = Field(default=None, max_length=200)
    notes: Optional[str] = Field(default=None)
    created_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ConstructionPhase(SQLModel, table=True):
    """ConstructionPhase - individual work phase within a plan."""
    __tablename__ = "construction_phase"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    plan_id: int = Field(sa_type=BigInteger, index=True)
    sort_order: int = Field(default=0)
    name: str = Field(max_length=200)
    planned_start: date
    planned_end: date
    actual_start: Optional[date] = Field(default=None)
    actual_end: Optional[date] = Field(default=None)
    status: PhaseStatus = Field(default=PhaseStatus.PENDING)
    notes: Optional[str] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    completed_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ConstructionPlanCreate(SQLModel):
    """Schema for creating a construction plan."""
    title: Optional[str] = None
    notes: Optional[str] = None


class ConstructionPlanUpdate(SQLModel):
    """Schema for updating a construction plan."""
    title: Optional[str] = None
    notes: Optional[str] = None


class ConstructionPhaseCreate(SQLModel):
    """Schema for creating a construction phase."""
    name: str
    planned_start: date
    planned_end: date
    sort_order: Optional[int] = None
    notes: Optional[str] = None


class ConstructionPhaseUpdate(SQLModel):
    """Schema for updating a construction phase."""
    name: Optional[str] = None
    planned_start: Optional[date] = None
    planned_end: Optional[date] = None
    sort_order: Optional[int] = None
    notes: Optional[str] = None


class ConstructionPhaseRead(SQLModel):
    """Schema for reading a construction phase, with computed fields."""
    id: int
    plan_id: int
    sort_order: int
    name: str
    planned_start: date
    planned_end: date
    actual_start: Optional[date]
    actual_end: Optional[date]
    status: PhaseStatus
    notes: Optional[str]
    completed_at: Optional[datetime]
    completed_by: Optional[int]
    created_at: datetime
    updated_at: datetime
    # Computed fields
    planned_days: int
    actual_days: Optional[int]
    is_delayed: bool
    delay_days: int


class ConstructionPlanRead(SQLModel):
    """Schema for reading a construction plan (without phases)."""
    id: int
    project_id: int
    organization_id: int
    title: Optional[str]
    notes: Optional[str]
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime


class PlanSummary(SQLModel):
    """Summary statistics for a construction plan."""
    total: int
    completed: int
    in_progress: int
    pending: int
    delayed: int
    progress_percent: int


class ConstructionPlanDetail(SQLModel):
    """Full construction plan detail with phases and summary."""
    plan: ConstructionPlanRead
    phases: list[ConstructionPhaseRead]
    summary: PlanSummary
