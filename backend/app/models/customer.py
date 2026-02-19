"""Customer master models."""
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Index, UniqueConstraint
from sqlmodel import Field, SQLModel

from app.core.snowflake import generate_snowflake_id


class CustomerMasterBase(SQLModel):
    """Customer master base fields."""

    name: str = Field(max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    memo: Optional[str] = Field(default=None)


class CustomerMaster(CustomerMasterBase, table=True):
    """Customer master for project owners/orderers."""

    __tablename__ = "customer_master"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "name",
            "normalized_phone",
            name="uq_customer_master_org_name_phone",
        ),
        Index("ix_customer_master_org_phone", "organization_id", "normalized_phone"),
        Index("ix_customer_master_org_name", "organization_id", "name"),
    )

    id: int = Field(
        default_factory=generate_snowflake_id,
        primary_key=True,
        sa_type=BigInteger,
    )
    organization_id: int = Field(
        sa_type=BigInteger,
        index=True,
    )
    normalized_phone: Optional[str] = Field(default=None, max_length=20)
    is_active: bool = Field(default=True, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[int] = Field(
        default=None,
        sa_type=BigInteger,
    )
    updated_by: Optional[int] = Field(
        default=None,
        sa_type=BigInteger,
    )


class CustomerMasterCreate(CustomerMasterBase):
    """Schema for creating customer master."""


class CustomerMasterRead(CustomerMasterBase):
    """Schema for reading customer master."""

    id: int
    organization_id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime


class CustomerMasterUpdate(SQLModel):
    """Schema for updating customer master."""

    name: Optional[str] = None
    phone: Optional[str] = None
    memo: Optional[str] = None
    is_active: Optional[bool] = None


class CustomerMasterSummary(SQLModel):
    """Lightweight customer reference for project payloads."""

    id: int
    name: str
    phone: Optional[str] = None
