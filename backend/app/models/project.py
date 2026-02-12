"""Project, SiteVisit, and Photo models."""
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.user import User, Organization
    from app.models.pricebook import PricebookRevision
    from app.models.estimate import Estimate
    from app.models.contract import Contract


class ProjectStatus(str, Enum):
    """Project status enumeration."""
    DRAFT = "draft"
    DIAGNOSING = "diagnosing"
    ESTIMATING = "estimating"
    QUOTED = "quoted"
    CONTRACTED = "contracted"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    WARRANTY = "warranty"


class VisitType(str, Enum):
    """Site visit type enumeration."""
    INITIAL = "initial"
    PROGRESS = "progress"
    COMPLETION = "completion"


class PhotoType(str, Enum):
    """Photo type enumeration."""
    BEFORE = "before"
    DURING = "during"
    AFTER = "after"
    DETAIL = "detail"


class ProjectBase(SQLModel):
    """Project base fields."""
    name: str = Field(max_length=255, index=True)
    address: str
    client_name: Optional[str] = Field(default=None, max_length=100)
    client_phone: Optional[str] = Field(default=None, max_length=20)
    notes: Optional[str] = Field(default=None)


class Project(ProjectBase, table=True):
    """Project model - A single construction job."""
    __tablename__ = "project"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    organization_id: int = Field(foreign_key="organization.id", sa_type=BigInteger, index=True)
    
    # Status tracking
    status: ProjectStatus = Field(default=ProjectStatus.DRAFT, index=True)
    
    # Pricebook version pinning (CRITICAL for accurate estimates)
    pricebook_revision_id: Optional[int] = Field(
        default=None, foreign_key="pricebook_revision.id", sa_type=BigInteger
    )
    
    # Dates
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    contracted_at: Optional[datetime] = Field(default=None)
    started_at: Optional[datetime] = Field(default=None)
    completed_at: Optional[datetime] = Field(default=None)
    warranty_expires_at: Optional[datetime] = Field(default=None)  # completed_at + 3 years
    
    # Audit
    created_by: Optional[int] = Field(default=None, foreign_key="user.id", sa_type=BigInteger)
    
    # Relationships
    site_visits: List["SiteVisit"] = Relationship(back_populates="project")
    estimates: List["Estimate"] = Relationship(back_populates="project")
    contracts: List["Contract"] = Relationship(back_populates="project")


class ProjectCreate(ProjectBase):
    """Schema for creating project."""
    organization_id: int


class ProjectRead(ProjectBase):
    """Schema for reading project."""
    id: int
    organization_id: int
    status: ProjectStatus
    pricebook_revision_id: Optional[int]
    created_at: datetime
    contracted_at: Optional[datetime]
    completed_at: Optional[datetime]
    warranty_expires_at: Optional[datetime]


class ProjectUpdate(SQLModel):
    """Schema for updating project."""
    name: Optional[str] = None
    address: Optional[str] = None
    client_name: Optional[str] = None
    client_phone: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[ProjectStatus] = None


# Site Visit Models
class SiteVisitBase(SQLModel):
    """SiteVisit base fields."""
    visit_type: VisitType
    visited_at: datetime
    notes: Optional[str] = Field(default=None)


class SiteVisit(SiteVisitBase, table=True):
    """Site Visit model - A single field visit by technician."""
    __tablename__ = "site_visit"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(foreign_key="project.id", sa_type=BigInteger, index=True)
    technician_id: int = Field(foreign_key="user.id", sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    project: Optional[Project] = Relationship(back_populates="site_visits")
    photos: List["Photo"] = Relationship(back_populates="site_visit")


class SiteVisitCreate(SiteVisitBase):
    """Schema for creating site visit."""
    project_id: int


class SiteVisitRead(SiteVisitBase):
    """Schema for reading site visit."""
    id: int
    project_id: int
    technician_id: int
    created_at: datetime
    photo_count: int = 0


# Photo Models
class PhotoBase(SQLModel):
    """Photo base fields."""
    photo_type: PhotoType
    caption: Optional[str] = Field(default=None)


class Photo(PhotoBase, table=True):
    """Photo model - Images captured during site visits."""
    __tablename__ = "photo"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    site_visit_id: int = Field(foreign_key="site_visit.id", sa_type=BigInteger, index=True)
    
    # File storage
    storage_path: str = Field(max_length=500)
    original_filename: Optional[str] = Field(default=None, max_length=255)
    file_size_bytes: Optional[int] = Field(default=None)
    mime_type: Optional[str] = Field(default=None, max_length=50)
    
    # Metadata
    taken_at: Optional[datetime] = Field(default=None)
    latitude: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=8)
    longitude: Optional[Decimal] = Field(default=None, max_digits=11, decimal_places=8)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    site_visit: Optional[SiteVisit] = Relationship(back_populates="photos")


class PhotoCreate(PhotoBase):
    """Schema for creating photo."""
    site_visit_id: int
    storage_path: str
    original_filename: Optional[str] = None
    file_size_bytes: Optional[int] = None
    mime_type: Optional[str] = None


class PhotoRead(PhotoBase):
    """Schema for reading photo."""
    id: int
    site_visit_id: int
    storage_path: str
    original_filename: Optional[str]
    taken_at: Optional[datetime]
    created_at: datetime


# AS Request Models (After-Service 하자보수 요청)
class ASRequestStatus(str, Enum):
    """AS Request status enumeration."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CANCELLED = "cancelled"


class ASRequest(SQLModel, table=True):
    """AS Request model - After-service requests during warranty period."""
    __tablename__ = "as_request"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(foreign_key="project.id", sa_type=BigInteger, index=True)
    
    description: str
    status: ASRequestStatus = Field(default=ASRequestStatus.PENDING)
    photos: Optional[str] = Field(default=None)  # JSON array of photo paths
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    resolved_at: Optional[datetime] = Field(default=None)
    
    created_by: Optional[int] = Field(default=None, foreign_key="user.id", sa_type=BigInteger)


class ASRequestCreate(SQLModel):
    """Schema for creating AS request."""
    description: str
    photos: Optional[List[str]] = None


class ASRequestRead(SQLModel):
    """Schema for reading AS request."""
    id: int
    description: str
    status: ASRequestStatus
    created_at: datetime
    resolved_at: Optional[datetime]
