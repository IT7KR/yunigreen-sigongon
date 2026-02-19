"""현장대리인 (Field Representative) models."""
from datetime import datetime
from typing import Optional, TYPE_CHECKING
from sqlalchemy import BigInteger, Text
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.user import Organization


class FieldRepresentativeBase(SQLModel):
    """Base fields for field representative."""
    name: str = Field(max_length=100)
    phone: str = Field(max_length=20)
    grade: Optional[str] = Field(default=None, max_length=50)  # 기술등급
    notes: Optional[str] = Field(default=None, sa_type=Text)


class FieldRepresentative(FieldRepresentativeBase, table=True):
    """현장대리인 model - organization-scoped."""
    __tablename__ = "field_representative"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    organization_id: int = Field(sa_type=BigInteger, index=True)

    # Document tracking
    booklet_filename: Optional[str] = Field(default=None, max_length=255)  # 기술수첩
    career_cert_filename: Optional[str] = Field(default=None, max_length=255)  # 경력증명서
    career_cert_uploaded_at: Optional[datetime] = Field(default=None)  # for 90-day expiry
    employment_cert_filename: Optional[str] = Field(default=None, max_length=255)  # 재직증명서

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    assignments: list["ProjectRepresentativeAssignment"] = Relationship(
        back_populates="representative",
        sa_relationship_kwargs={
            "primaryjoin": "FieldRepresentative.id == ProjectRepresentativeAssignment.representative_id",
            "foreign_keys": "[ProjectRepresentativeAssignment.representative_id]",
        },
    )


class ProjectRepresentativeAssignment(SQLModel, table=True):
    """Project to field representative assignment (one-to-one)."""
    __tablename__ = "project_representative_assignment"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(sa_type=BigInteger, index=True, unique=True)  # unique ensures one-to-one
    representative_id: int = Field(sa_type=BigInteger, index=True)
    effective_date: str = Field(max_length=20)  # 기준일 (YYYY-MM-DD format)
    assigned_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    representative: Optional[FieldRepresentative] = Relationship(
        back_populates="assignments",
        sa_relationship_kwargs={
            "primaryjoin": "ProjectRepresentativeAssignment.representative_id == FieldRepresentative.id",
            "foreign_keys": "[ProjectRepresentativeAssignment.representative_id]",
        },
    )


# Pydantic schemas for API

class FieldRepresentativeCreate(SQLModel):
    """Schema for creating/updating field representative."""
    name: str
    phone: str
    grade: Optional[str] = None
    notes: Optional[str] = None
    booklet_filename: Optional[str] = None
    career_cert_filename: Optional[str] = None
    career_cert_uploaded_at: Optional[datetime] = None
    employment_cert_filename: Optional[str] = None


class FieldRepresentativeRead(FieldRepresentativeBase):
    """Schema for reading field representative."""
    id: int
    organization_id: int
    booklet_filename: Optional[str] = None
    career_cert_filename: Optional[str] = None
    career_cert_uploaded_at: Optional[datetime] = None
    employment_cert_filename: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Calculated field: days remaining on career certificate
    career_cert_days_remaining: Optional[int] = None

    # Assigned projects (project_ids)
    assigned_project_ids: list[int] = []


class AssignmentCreate(SQLModel):
    """Schema for assigning representative to project."""
    representative_id: int
    effective_date: str  # YYYY-MM-DD


class AssignmentRead(SQLModel):
    """Schema for reading assignment."""
    id: int
    project_id: int
    representative_id: int
    effective_date: str
    assigned_at: datetime
