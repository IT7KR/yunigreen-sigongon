"""User and Organization models."""
from datetime import datetime
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship
from pydantic import field_serializer

from app.core.snowflake import generate_snowflake_id


class UserRole(str, Enum):
    """User role enumeration.

    System-level roles (organization_id = NULL):
    - SUPER_ADMIN: Unigreen internal staff, manages all tenants
    - WORKER: Daily laborers, linked to projects via LaborContract

    Tenant-level roles (organization_id required):
    - COMPANY_ADMIN: Customer company CEO, full access within company
    - SITE_MANAGER: Field supervisor, project-scoped access
    """
    # System-level roles (organization_id = NULL)
    SUPER_ADMIN = "super_admin"
    WORKER = "worker"

    # Tenant-level roles (organization_id required)
    COMPANY_ADMIN = "company_admin"
    SITE_MANAGER = "site_manager"


# Role classification constants
TENANT_ROLES = {UserRole.COMPANY_ADMIN, UserRole.SITE_MANAGER}
SYSTEM_ROLES = {UserRole.SUPER_ADMIN, UserRole.WORKER}


def validate_user_role_organization(role: UserRole, organization_id: Optional[int]) -> None:
    """Validate role and organization_id consistency.

    Args:
        role: User role
        organization_id: Organization ID (can be None for system roles)

    Raises:
        ValueError: If role-organization combination is invalid
    """
    if role in TENANT_ROLES and organization_id is None:
        raise ValueError(f"{role.value} role requires an organization_id")
    if role in SYSTEM_ROLES and organization_id is not None:
        raise ValueError(f"{role.value} role must not have an organization_id")


class OrganizationBase(SQLModel):
    """Organization base fields."""
    name: str = Field(max_length=255, index=True)
    business_number: Optional[str] = Field(default=None, max_length=20)  # 사업자등록번호
    address: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None, max_length=20)
    is_active: bool = Field(default=True)
    # 대표자 정보
    rep_name: Optional[str] = Field(default=None, max_length=100)
    rep_phone: Optional[str] = Field(default=None, max_length=20)
    rep_email: Optional[str] = Field(default=None, max_length=255)
    # 실무자 정보
    contact_name: Optional[str] = Field(default=None, max_length=100)
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    contact_position: Optional[str] = Field(default=None, max_length=50)


class Organization(OrganizationBase, table=True):
    """Organization model - Multi-tenant support."""
    __tablename__ = "organization"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    users: List["User"] = Relationship(
        back_populates="organization",
        sa_relationship_kwargs={
            "primaryjoin": "Organization.id == User.organization_id",
            "foreign_keys": "[User.organization_id]",
        },
    )


class OrganizationCreate(OrganizationBase):
    """Schema for creating organization."""
    pass


class OrganizationRead(OrganizationBase):
    """Schema for reading organization."""
    id: int
    created_at: datetime

    @field_serializer('id')
    def serialize_id(self, v: int) -> str:
        return str(v)


class UserBase(SQLModel):
    """User base fields."""
    username: str = Field(max_length=50, index=True, unique=True)
    email: Optional[str] = Field(default=None, max_length=255, index=True)
    name: str = Field(max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    role: UserRole = Field(default=UserRole.SITE_MANAGER)
    is_active: bool = Field(default=True)


class User(UserBase, table=True):
    """User model.

    System-level roles (super_admin, worker) have organization_id = NULL.
    Tenant-level roles (company_admin, site_manager) require organization_id.
    """
    __tablename__ = "user"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    organization_id: Optional[int] = Field(
        default=None, sa_type=BigInteger,
        index=True
    )
    password_hash: str = Field(max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)

    # --- Soft delete (Scenario A, B1, C 공통) ---
    deleted_at: Optional[datetime] = Field(default=None, index=True)
    deleted_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    deletion_reason: Optional[str] = Field(default=None, max_length=500)

    # --- Withdrawal (Scenario B1: 개인 탈퇴) ---
    withdrawal_requested_at: Optional[datetime] = Field(default=None)
    withdrawal_scheduled_at: Optional[datetime] = Field(default=None)
    withdrawal_reason: Optional[str] = Field(default=None, max_length=500)

    # --- Termination (Scenario C: 직원 퇴사) ---
    terminated_at: Optional[datetime] = Field(default=None)
    terminated_by: Optional[int] = Field(default=None, sa_type=BigInteger)

    # Relationships
    organization: Optional[Organization] = Relationship(
        back_populates="users",
        sa_relationship_kwargs={
            "primaryjoin": "User.organization_id == Organization.id",
            "foreign_keys": "[User.organization_id]",
        },
    )


class UserCreate(SQLModel):
    """Schema for creating user.

    For tenant-level roles (company_admin, site_manager): organization_id is required.
    For system-level roles (super_admin, worker): organization_id must be None.
    """
    username: str
    email: Optional[str] = None
    name: str
    password: str
    phone: Optional[str] = None
    role: UserRole = UserRole.SITE_MANAGER
    organization_id: Optional[int] = None


class UserRead(UserBase):
    """Schema for reading user."""
    id: int
    username: str
    organization_id: Optional[int]
    created_at: datetime
    last_login_at: Optional[datetime]
    deleted_at: Optional[datetime] = None

    @field_serializer('id')
    def serialize_id(self, v: int) -> str:
        return str(v)

    @field_serializer('organization_id')
    def serialize_org_id(self, v: Optional[int]) -> Optional[str]:
        return str(v) if v is not None else None


class UserLogin(SQLModel):
    """Schema for user login."""
    username: str
    password: str


class Token(SQLModel):
    """JWT Token response."""
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int


class TokenPayload(SQLModel):
    """JWT Token payload."""
    sub: str  # user_id
    exp: int
    role: str
    org_id: Optional[str] = None  # NULL for system-level roles
