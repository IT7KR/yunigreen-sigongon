"""Composite unit price (일위대가) models for construction cost estimation."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List

from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id


class CostType(str, Enum):
    """Cost type enumeration for composite components."""
    MATERIAL = "material"
    LABOR = "labor"
    EQUIPMENT = "equipment"


# CompositeUnitPrice Models
class CompositeUnitPriceBase(SQLModel):
    """CompositeUnitPrice base fields."""
    pricebook_revision_id: int = Field(sa_type=BigInteger, index=True)
    name: str = Field(max_length=500)  # e.g., '방수프라이머 바름'
    specification: Optional[str] = Field(default=None, max_length=255)
    unit: str = Field(max_length=20)  # e.g., 'm2'
    source_reference: Optional[str] = Field(default=None, max_length=500)  # e.g., '종합적산정보 p396 호표1'
    source_pdf_page: Optional[int] = Field(default=None)
    material_subtotal: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    labor_subtotal: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    equipment_subtotal: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    total_unit_price: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    category_path: Optional[str] = Field(default=None, max_length=255)  # e.g., '건축 > 방수공사'


class CompositeUnitPrice(CompositeUnitPriceBase, table=True):
    """CompositeUnitPrice model - A composite unit price (일위대가) record."""
    __tablename__ = "composite_unit_price"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    components: List["CompositeComponent"] = Relationship(
        back_populates="composite",
        sa_relationship_kwargs={
            "primaryjoin": "CompositeUnitPrice.id == CompositeComponent.composite_id",
            "foreign_keys": "[CompositeComponent.composite_id]",
        },
    )


class CompositeUnitPriceCreate(SQLModel):
    """Schema for creating composite unit price."""
    pricebook_revision_id: int
    name: str
    specification: Optional[str] = None
    unit: str
    source_reference: Optional[str] = None
    source_pdf_page: Optional[int] = None
    material_subtotal: Decimal = Decimal("0")
    labor_subtotal: Decimal = Decimal("0")
    equipment_subtotal: Decimal = Decimal("0")
    total_unit_price: Decimal = Decimal("0")
    category_path: Optional[str] = None


class CompositeUnitPriceRead(CompositeUnitPriceBase):
    """Schema for reading composite unit price."""
    id: int
    created_at: datetime
    updated_at: datetime


# CompositeComponent Models
class CompositeComponentBase(SQLModel):
    """CompositeComponent base fields."""
    composite_id: int = Field(sa_type=BigInteger, index=True)
    catalog_item_id: Optional[int] = Field(default=None, sa_type=BigInteger, index=True)
    name: str = Field(max_length=500)
    specification: Optional[str] = Field(default=None, max_length=255)
    unit: str = Field(max_length=20)
    cost_type: CostType
    unit_price: Decimal = Field(max_digits=15, decimal_places=2)
    quantity_per_unit: Decimal = Field(max_digits=10, decimal_places=4)  # e.g., 0.3 kg/m2
    amount: Decimal = Field(max_digits=15, decimal_places=2)  # unit_price × quantity_per_unit
    sort_order: int = Field(default=0)
    source_note: Optional[str] = Field(default=None, max_length=255)


class CompositeComponent(CompositeComponentBase, table=True):
    """CompositeComponent model - A single cost line within a composite unit price."""
    __tablename__ = "composite_component"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)

    # Relationships
    composite: Optional["CompositeUnitPrice"] = Relationship(
        back_populates="components",
        sa_relationship_kwargs={
            "primaryjoin": "CompositeComponent.composite_id == CompositeUnitPrice.id",
            "foreign_keys": "[CompositeComponent.composite_id]",
        },
    )


class CompositeComponentCreate(SQLModel):
    """Schema for creating composite component."""
    composite_id: int
    catalog_item_id: Optional[int] = None
    name: str
    specification: Optional[str] = None
    unit: str
    cost_type: CostType
    unit_price: Decimal
    quantity_per_unit: Decimal
    amount: Decimal
    sort_order: int = 0
    source_note: Optional[str] = None


class CompositeComponentRead(CompositeComponentBase):
    """Schema for reading composite component."""
    id: int
