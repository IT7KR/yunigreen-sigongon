"""Estimate and EstimateLine models."""
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

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
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(foreign_key="project.id", index=True)
    
    # Version control (multiple estimates per project possible)
    version: int = Field(default=1)
    
    # Pricebook reference (CRITICAL)
    pricebook_revision_id: uuid.UUID = Field(foreign_key="pricebook_revision.id")
    
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
    created_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    issued_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    
    # Relationships
    project: Optional["Project"] = Relationship(back_populates="estimates")
    lines: List["EstimateLine"] = Relationship(back_populates="estimate")


class EstimateCreate(SQLModel):
    """Schema for creating estimate."""
    project_id: uuid.UUID
    diagnosis_id: Optional[uuid.UUID] = None  # If generating from AI diagnosis
    include_confirmed_only: bool = False


class EstimateRead(EstimateBase):
    """Schema for reading estimate."""
    id: uuid.UUID
    project_id: uuid.UUID
    version: int
    pricebook_revision_id: uuid.UUID
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
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    estimate_id: uuid.UUID = Field(foreign_key="estimate.id", index=True)
    
    # Line ordering
    sort_order: int = Field(default=0)
    
    # Item reference (nullable for custom items)
    catalog_item_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="catalog_item.id"
    )
    
    # Pricing snapshot (frozen at time of creation/issue)
    unit_price_snapshot: Decimal = Field(max_digits=15, decimal_places=2)
    amount: Decimal = Field(max_digits=15, decimal_places=2)  # quantity * unit_price_snapshot
    
    # Source tracking
    source: LineSource = Field(default=LineSource.MANUAL)
    ai_suggestion_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="ai_material_suggestion.id"
    )
    
    # Audit
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_edited_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    
    # Relationships
    estimate: Optional[Estimate] = Relationship(back_populates="lines")


class EstimateLineCreate(EstimateLineBase):
    """Schema for creating estimate line."""
    estimate_id: uuid.UUID
    catalog_item_id: Optional[uuid.UUID] = None
    unit_price_snapshot: Decimal
    sort_order: int = 0
    source: LineSource = LineSource.MANUAL


class EstimateLineRead(EstimateLineBase):
    """Schema for reading estimate line."""
    id: uuid.UUID
    estimate_id: uuid.UUID
    sort_order: int
    catalog_item_id: Optional[uuid.UUID]
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
