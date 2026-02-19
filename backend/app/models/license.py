"""License records and files for organization/customer/partner owners."""
from __future__ import annotations

from datetime import date, datetime
from enum import Enum
from typing import Optional

from sqlalchemy import BigInteger, Column, Index, Text
from sqlmodel import Field, SQLModel

from app.core.snowflake import generate_snowflake_id


class LicenseOwnerType(str, Enum):
    ORGANIZATION = "organization"
    CUSTOMER = "customer"
    PARTNER = "partner"


class LicenseStatus(str, Enum):
    ACTIVE = "active"
    EXPIRED = "expired"
    REVOKED = "revoked"


class LicenseFilePageType(str, Enum):
    FRONT = "front"
    BACK = "back"
    ATTACHMENT = "attachment"
    UNKNOWN = "unknown"


class LicenseRecord(SQLModel, table=True):
    __tablename__ = "license_record"
    __table_args__ = (
        Index(
            "ix_license_record_org_owner",
            "organization_id",
            "owner_type",
            "owner_id",
        ),
        Index(
            "ix_license_record_org_owner_primary",
            "organization_id",
            "owner_type",
            "owner_id",
            "is_primary",
        ),
    )

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    organization_id: int = Field(
        sa_column=Column(BigInteger, nullable=False, index=True)
    )
    owner_type: LicenseOwnerType = Field(index=True)
    owner_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))

    license_name: str = Field(max_length=120)
    license_number: Optional[str] = Field(default=None, max_length=120)
    issuer: Optional[str] = Field(default=None, max_length=120)
    issued_on: Optional[date] = Field(default=None)
    expires_on: Optional[date] = Field(default=None, index=True)
    status: LicenseStatus = Field(default=LicenseStatus.ACTIVE, index=True)
    is_primary: bool = Field(default=False, index=True)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)


class LicenseFile(SQLModel, table=True):
    __tablename__ = "license_file"
    __table_args__ = (
        Index("ix_license_file_record_sort", "license_record_id", "sort_order"),
    )

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    organization_id: int = Field(
        sa_column=Column(BigInteger, nullable=False, index=True)
    )
    license_record_id: int = Field(
        sa_column=Column(BigInteger, nullable=False, index=True)
    )
    storage_path: str = Field(max_length=500)
    original_filename: str = Field(max_length=255)
    mime_type: Optional[str] = Field(default=None, max_length=100)
    file_size_bytes: int = Field(default=0)
    page_type: LicenseFilePageType = Field(default=LicenseFilePageType.UNKNOWN, index=True)
    sort_order: int = Field(default=100)
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    deleted_at: Optional[datetime] = Field(default=None, index=True)
