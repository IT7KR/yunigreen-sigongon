"""Estimate and EstimateLine models."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.pricebook import PricebookRevision, CatalogItem
    from app.models.diagnosis import AIMaterialSuggestion
    from app.models.user import User


class EstimateStatus(str, Enum):
    """Estimate status enumeration."""
    DRAFT = "draft"
    ISSUED = "issued"
    ACCEPTED = "accepted"
    REJECTED = "rejected"
    VOID = "void"


class LineSource(str, Enum):
    """Estimate line source enumeration."""
    AI = "ai"
    MANUAL = "manual"
    TEMPLATE = "template"


# Estimate Models
class EstimateBase(SQLModel):
    """Estimate base fields."""
    notes: Optional[str] = Field(default=None)


class Estimate(EstimateBase, table=True):
    """Estimate model - A cost estimate for a project."""
    __tablename__ = "estimate"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(foreign_key="project.id", sa_type=BigInteger, index=True)
    
    # Version control (multiple estimates per project possible)
    version: int = Field(default=1)
    
    # Pricebook reference (CRITICAL)
    pricebook_revision_id: int = Field(foreign_key="pricebook_revision.id", sa_type=BigInteger)
    
    # Status
    status: EstimateStatus = Field(default=EstimateStatus.DRAFT, index=True)
    
    # Totals (calculated from lines, stored for performance)
    subtotal: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    vat_amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    total_amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    
    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    issued_at: Optional[datetime] = Field(default=None)
    
    # Audit
    created_by: Optional[int] = Field(default=None, foreign_key="user.id", sa_type=BigInteger)
    issued_by: Optional[int] = Field(default=None, foreign_key="user.id", sa_type=BigInteger)
    
    # Relationships
    project: Optional["Project"] = Relationship(back_populates="estimates")
    lines: List["EstimateLine"] = Relationship(back_populates="estimate")


class EstimateCreate(SQLModel):
    """Schema for creating estimate."""
    project_id: int
    diagnosis_id: Optional[int] = None  # If generating from AI diagnosis
    include_confirmed_only: bool = False


class EstimateRead(EstimateBase):
    """Schema for reading estimate."""
    id: int
    project_id: int
    version: int
    pricebook_revision_id: int
    status: EstimateStatus
    subtotal: Decimal
    vat_amount: Decimal
    total_amount: Decimal
    created_at: datetime
    issued_at: Optional[datetime]


class EstimateUpdate(SQLModel):
    """Schema for updating estimate."""
    notes: Optional[str] = None


# Estimate Line Models
class EstimateLineBase(SQLModel):
    """Estimate Line base fields."""
    description: str = Field(max_length=500)
    specification: Optional[str] = Field(default=None, max_length=255)
    unit: str = Field(max_length=20)
    quantity: Decimal = Field(max_digits=10, decimal_places=2)


class EstimateLine(EstimateLineBase, table=True):
    """Estimate Line model - Individual line item in an estimate."""
    __tablename__ = "estimate_line"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    estimate_id: int = Field(foreign_key="estimate.id", sa_type=BigInteger, index=True)
    
    # Line ordering
    sort_order: int = Field(default=0)
    
    # Item reference (nullable for custom items)
    catalog_item_id: Optional[int] = Field(
        default=None, foreign_key="catalog_item.id", sa_type=BigInteger
    )
    
    # Pricing snapshot (frozen at time of creation/issue)
    unit_price_snapshot: Decimal = Field(max_digits=15, decimal_places=2)
    amount: Decimal = Field(max_digits=15, decimal_places=2)  # quantity * unit_price_snapshot
    
    # Source tracking
    source: LineSource = Field(default=LineSource.MANUAL)
    ai_suggestion_id: Optional[int] = Field(
        default=None, foreign_key="ai_material_suggestion.id", sa_type=BigInteger
    )
    
    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_edited_by: Optional[int] = Field(default=None, foreign_key="user.id", sa_type=BigInteger)
    
    # Relationships
    estimate: Optional[Estimate] = Relationship(back_populates="lines")


class EstimateLineCreate(EstimateLineBase):
    """Schema for creating estimate line."""
    estimate_id: int
    catalog_item_id: Optional[int] = None
    unit_price_snapshot: Decimal
    sort_order: int = 0
    source: LineSource = LineSource.MANUAL


class EstimateLineRead(EstimateLineBase):
    """Schema for reading estimate line."""
    id: int
    estimate_id: int
    sort_order: int
    catalog_item_id: Optional[int]
    unit_price_snapshot: Decimal
    amount: Decimal
    source: LineSource
    created_at: datetime


class EstimateLineUpdate(SQLModel):
    """Schema for updating estimate line."""
    description: Optional[str] = None
    specification: Optional[str] = None
    unit: Optional[str] = None
    quantity: Optional[Decimal] = None
    unit_price_snapshot: Optional[Decimal] = None
    sort_order: Optional[int] = None
