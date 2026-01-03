"""Contract and LaborContract models."""
import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.estimate import Estimate
    from app.models.user import User


class ContractStatus(str, Enum):
    """Contract status enumeration."""
    DRAFT = "draft"
    SENT = "sent"
    SIGNED = "signed"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class LaborContractStatus(str, Enum):
    """Labor contract status enumeration."""
    DRAFT = "draft"
    SENT = "sent"
    SIGNED = "signed"
    PAID = "paid"


# Contract Models
class ContractBase(SQLModel):
    """Contract base fields."""
    contract_number: Optional[str] = Field(default=None, max_length=50, unique=True)
    notes: Optional[str] = Field(default=None)


class Contract(ContractBase, table=True):
    """Contract model - Legal contract based on estimate."""
    __tablename__ = "contract"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(foreign_key="project.id", index=True)
    estimate_id: uuid.UUID = Field(foreign_key="estimate.id")
    
    # Contract details
    contract_amount: Decimal = Field(max_digits=15, decimal_places=2)
    
    # Status
    status: ContractStatus = Field(default=ContractStatus.DRAFT, index=True)
    
    # Dates
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = Field(default=None)
    signed_at: Optional[datetime] = Field(default=None)
    start_date: Optional[date] = Field(default=None)
    expected_end_date: Optional[date] = Field(default=None)
    actual_end_date: Optional[date] = Field(default=None)
    
    # Signatures
    client_signature_path: Optional[str] = Field(default=None, max_length=500)
    company_signature_path: Optional[str] = Field(default=None, max_length=500)
    
    # Document storage
    document_path: Optional[str] = Field(default=None, max_length=500)  # Generated PDF path
    
    # Relationships
    project: Optional["Project"] = Relationship(back_populates="contracts")


class ContractCreate(SQLModel):
    """Schema for creating contract."""
    project_id: uuid.UUID
    estimate_id: uuid.UUID
    contract_amount: Decimal
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None


class ContractRead(ContractBase):
    """Schema for reading contract."""
    id: uuid.UUID
    project_id: uuid.UUID
    estimate_id: uuid.UUID
    contract_amount: Decimal
    status: ContractStatus
    created_at: datetime
    signed_at: Optional[datetime]
    start_date: Optional[date]
    expected_end_date: Optional[date]


class ContractUpdate(SQLModel):
    """Schema for updating contract."""
    status: Optional[ContractStatus] = None
    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    notes: Optional[str] = None


# Labor Contract Models
class LaborContractBase(SQLModel):
    """Labor Contract base fields."""
    worker_name: str = Field(max_length=100)
    worker_phone: Optional[str] = Field(default=None, max_length=20)
    work_date: date
    work_type: Optional[str] = Field(default=None, max_length=100)  # e.g., '방수공', '미장공'
    daily_rate: Decimal = Field(max_digits=10, decimal_places=2)
    hours_worked: Optional[Decimal] = Field(default=None, max_digits=4, decimal_places=1)


class LaborContract(LaborContractBase, table=True):
    """Labor Contract model - 일용직 계약."""
    __tablename__ = "labor_contract"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(foreign_key="project.id", index=True)
    
    # Worker info (sensitive - should be encrypted in production)
    worker_id_number: Optional[str] = Field(default=None, max_length=20)  # 주민등록번호
    
    # Status
    status: LaborContractStatus = Field(default=LaborContractStatus.DRAFT)
    
    # Signatures
    worker_signature_path: Optional[str] = Field(default=None, max_length=500)
    signed_at: Optional[datetime] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")


class LaborContractCreate(LaborContractBase):
    """Schema for creating labor contract."""
    project_id: uuid.UUID


class LaborContractRead(LaborContractBase):
    """Schema for reading labor contract."""
    id: uuid.UUID
    project_id: uuid.UUID
    status: LaborContractStatus
    signed_at: Optional[datetime]
    created_at: datetime


class LaborContractUpdate(SQLModel):
    """Schema for updating labor contract."""
    status: Optional[LaborContractStatus] = None
    hours_worked: Optional[Decimal] = None
