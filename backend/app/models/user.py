"""User and Organization models."""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship


class UserRole(str, Enum):
    """User role enumeration."""
    ADMIN = "admin"
    MANAGER = "manager"
    TECHNICIAN = "technician"


class OrganizationBase(SQLModel):
    """Organization base fields."""
    name: str = Field(max_length=255, index=True)
    business_number: Optional[str] = Field(default=None, max_length=20)  # 사업자등록번호
    address: Optional[str] = Field(default=None)
    phone: Optional[str] = Field(default=None, max_length=20)
    is_active: bool = Field(default=True)


class Organization(OrganizationBase, table=True):
    """Organization model - Multi-tenant support."""
    __tablename__ = "organization"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    users: List["User"] = Relationship(back_populates="organization")


class OrganizationCreate(OrganizationBase):
    """Schema for creating organization."""
    pass


class OrganizationRead(OrganizationBase):
    """Schema for reading organization."""
    id: uuid.UUID
    created_at: datetime


class UserBase(SQLModel):
    """User base fields."""
    email: str = Field(max_length=255, index=True, unique=True)
    name: str = Field(max_length=100)
    phone: Optional[str] = Field(default=None, max_length=20)
    role: UserRole = Field(default=UserRole.TECHNICIAN)
    is_active: bool = Field(default=True)


class User(UserBase, table=True):
    """User model."""
    __tablename__ = "user"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    organization_id: uuid.UUID = Field(foreign_key="organization.id", index=True)
    password_hash: str = Field(max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    last_login_at: Optional[datetime] = Field(default=None)
    
    # Relationships
    organization: Optional[Organization] = Relationship(back_populates="users")


class UserCreate(SQLModel):
    """Schema for creating user."""
    email: str
    name: str
    password: str
    phone: Optional[str] = None
    role: UserRole = UserRole.TECHNICIAN
    organization_id: uuid.UUID


class UserRead(UserBase):
    """Schema for reading user."""
    id: uuid.UUID
    organization_id: uuid.UUID
    created_at: datetime
    last_login_at: Optional[datetime]


class UserLogin(SQLModel):
    """Schema for user login."""
    email: str
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
    org_id: str
