"""Pricebook, Revision, CatalogItem, and Price models."""
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Any, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import BigInteger, JSON

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.user import User


class RevisionStatus(str, Enum):
    """Pricebook revision status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    DEPRECATED = "deprecated"


class ItemType(str, Enum):
    """Catalog item type enumeration."""
    MATERIAL = "material"
    LABOR = "labor"
    EQUIPMENT = "equipment"


class AliasSource(str, Enum):
    """Catalog item alias source enumeration."""
    PDF = "pdf"
    USER = "user"
    AI = "ai"


# Pricebook Models
class PricebookBase(SQLModel):
    """Pricebook base fields."""
    name: str = Field(max_length=255)  # e.g., '종합적산정보'
    description: Optional[str] = Field(default=None)
    source_type: Optional[str] = Field(default=None, max_length=50)  # e.g., 'government', 'internal'


class Pricebook(PricebookBase, table=True):
    """Pricebook model - Master record for a pricing source."""
    __tablename__ = "pricebook"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    revisions: List["PricebookRevision"] = Relationship(
        back_populates="pricebook",
        sa_relationship_kwargs={
            "primaryjoin": "Pricebook.id == PricebookRevision.pricebook_id",
            "foreign_keys": "[PricebookRevision.pricebook_id]",
        },
    )


class PricebookCreate(PricebookBase):
    """Schema for creating pricebook."""
    pass


class PricebookRead(PricebookBase):
    """Schema for reading pricebook."""
    id: int
    created_at: datetime


# Pricebook Revision Models
class PricebookRevisionBase(SQLModel):
    """Pricebook Revision base fields."""
    version_label: str = Field(max_length=50)  # e.g., '2025-H2', '2026-H1'
    effective_from: date
    effective_to: Optional[date] = Field(default=None)


class PricebookRevision(PricebookRevisionBase, table=True):
    """Pricebook Revision model - A specific version (e.g., 2025년 하반기)."""
    __tablename__ = "pricebook_revision"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    pricebook_id: int = Field(sa_type=BigInteger, index=True)
    
    # Status
    status: RevisionStatus = Field(default=RevisionStatus.DRAFT, index=True)
    
    # Source files (for audit) - stored as JSON array
    source_files: Optional[List[dict]] = Field(default=None, sa_column=Column(JSON))
    
    # Metadata
    created_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    activated_at: Optional[datetime] = Field(default=None)
    deprecated_at: Optional[datetime] = Field(default=None)
    
    # Relationships
    pricebook: Optional[Pricebook] = Relationship(
        back_populates="revisions",
        sa_relationship_kwargs={
            "primaryjoin": "PricebookRevision.pricebook_id == Pricebook.id",
            "foreign_keys": "[PricebookRevision.pricebook_id]",
        },
    )
    prices: List["CatalogItemPrice"] = Relationship(
        back_populates="revision",
        sa_relationship_kwargs={
            "primaryjoin": "PricebookRevision.id == CatalogItemPrice.pricebook_revision_id",
            "foreign_keys": "[CatalogItemPrice.pricebook_revision_id]",
        },
    )
    document_chunks: List["DocumentChunk"] = Relationship(
        back_populates="revision",
        sa_relationship_kwargs={
            "primaryjoin": "PricebookRevision.id == DocumentChunk.pricebook_revision_id",
            "foreign_keys": "[DocumentChunk.pricebook_revision_id]",
        },
    )


class PricebookRevisionCreate(PricebookRevisionBase):
    """Schema for creating pricebook revision."""
    pricebook_id: int


class PricebookRevisionRead(PricebookRevisionBase):
    """Schema for reading pricebook revision."""
    id: int
    pricebook_id: int
    status: RevisionStatus
    created_at: datetime
    activated_at: Optional[datetime]
    item_count: int = 0


# Catalog Item Models
class CatalogItemBase(SQLModel):
    """Catalog Item base fields."""
    item_code: Optional[str] = Field(default=None, max_length=50)
    item_type: ItemType
    name_ko: str = Field(max_length=255, index=True)
    name_en: Optional[str] = Field(default=None, max_length=255)
    specification: Optional[str] = Field(default=None)
    base_unit: str = Field(max_length=20)
    category_path: Optional[str] = Field(default=None, max_length=500)
    material_family: Optional[str] = Field(default=None, max_length=50, index=True)
    is_active: bool = Field(default=True)


class CatalogItem(CatalogItemBase, table=True):
    """Catalog Item model - A single item that can be priced."""
    __tablename__ = "catalog_item"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    prices: List["CatalogItemPrice"] = Relationship(
        back_populates="catalog_item",
        sa_relationship_kwargs={
            "primaryjoin": "CatalogItem.id == CatalogItemPrice.catalog_item_id",
            "foreign_keys": "[CatalogItemPrice.catalog_item_id]",
        },
    )
    aliases: List["CatalogItemAlias"] = Relationship(
        back_populates="catalog_item",
        sa_relationship_kwargs={
            "primaryjoin": "CatalogItem.id == CatalogItemAlias.catalog_item_id",
            "foreign_keys": "[CatalogItemAlias.catalog_item_id]",
        },
    )


class CatalogItemCreate(CatalogItemBase):
    """Schema for creating catalog item."""
    pass


class CatalogItemRead(CatalogItemBase):
    """Schema for reading catalog item."""
    id: int
    created_at: datetime


# Catalog Item Price Models
class CatalogItemPriceBase(SQLModel):
    """Catalog Item Price base fields."""
    unit_price: Decimal = Field(max_digits=15, decimal_places=2)
    currency: str = Field(default="KRW", max_length=3)
    vat_included: bool = Field(default=False)


class CatalogItemPrice(CatalogItemPriceBase, table=True):
    """Catalog Item Price model - Price for a specific item in a specific revision."""
    __tablename__ = "catalog_item_price"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    pricebook_revision_id: int = Field(sa_type=BigInteger, index=True)
    catalog_item_id: int = Field(sa_type=BigInteger, index=True)
    
    # Source reference (for audit)
    source_pdf_page: Optional[int] = Field(default=None)
    source_row_text: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    revision: Optional[PricebookRevision] = Relationship(
        back_populates="prices",
        sa_relationship_kwargs={
            "primaryjoin": "CatalogItemPrice.pricebook_revision_id == PricebookRevision.id",
            "foreign_keys": "[CatalogItemPrice.pricebook_revision_id]",
        },
    )
    catalog_item: Optional[CatalogItem] = Relationship(
        back_populates="prices",
        sa_relationship_kwargs={
            "primaryjoin": "CatalogItemPrice.catalog_item_id == CatalogItem.id",
            "foreign_keys": "[CatalogItemPrice.catalog_item_id]",
        },
    )


class CatalogItemPriceCreate(CatalogItemPriceBase):
    """Schema for creating catalog item price."""
    pricebook_revision_id: int
    catalog_item_id: int
    source_pdf_page: Optional[int] = None


class CatalogItemPriceRead(CatalogItemPriceBase):
    """Schema for reading catalog item price."""
    id: int
    pricebook_revision_id: int
    catalog_item_id: int
    created_at: datetime


# Catalog Item Alias Models
class CatalogItemAliasBase(SQLModel):
    """Catalog Item Alias base fields."""
    alias_text: str = Field(max_length=255)
    normalized_text: Optional[str] = Field(default=None, max_length=255)
    source: Optional[AliasSource] = Field(default=None)


class CatalogItemAlias(CatalogItemAliasBase, table=True):
    """Catalog Item Alias model - Aliases help map AI suggestions to catalog items."""
    __tablename__ = "catalog_item_alias"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    catalog_item_id: int = Field(sa_type=BigInteger, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    catalog_item: Optional[CatalogItem] = Relationship(
        back_populates="aliases",
        sa_relationship_kwargs={
            "primaryjoin": "CatalogItemAlias.catalog_item_id == CatalogItem.id",
            "foreign_keys": "[CatalogItemAlias.catalog_item_id]",
        },
    )


class CatalogItemAliasCreate(CatalogItemAliasBase):
    """Schema for creating catalog item alias."""
    catalog_item_id: int


# Import DocumentChunk here to avoid circular import
from app.models.rag import DocumentChunk
