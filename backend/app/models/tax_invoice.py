"""TaxInvoice models for Popbill tax invoice integration (팝빌 세금계산서 연동)."""
import uuid
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.project import Project
    from app.models.user import User
    from app.models.user import Organization


class TaxInvoiceStatus(str, Enum):
    """Tax invoice status enumeration."""
    DRAFT = "draft"
    ISSUED = "issued"
    CANCELLED = "cancelled"
    FAILED = "failed"


class TaxInvoiceType(str, Enum):
    """Tax invoice type enumeration."""
    REGULAR = "regular"  # 일반
    SIMPLIFIED = "simplified"  # 간이


class TaxInvoiceBase(SQLModel):
    """TaxInvoice base fields."""
    # Popbill reference
    mgtkey: str = Field(max_length=50, index=True)  # 관리번호, unique per organization

    # Invoice details
    invoice_type: TaxInvoiceType = Field(default=TaxInvoiceType.REGULAR)
    supply_amount: Decimal = Field(max_digits=15, decimal_places=2)  # 공급가액
    tax_amount: Decimal = Field(max_digits=15, decimal_places=2)  # 세액
    total_amount: Decimal = Field(max_digits=15, decimal_places=2)  # 합계

    # Supplier info (공급자)
    supplier_corp_num: str = Field(max_length=20)  # 사업자번호
    supplier_name: str = Field(max_length=255)  # 상호
    supplier_ceo: Optional[str] = Field(default=None, max_length=100)  # 대표자
    supplier_address: Optional[str] = Field(default=None)
    supplier_email: Optional[str] = Field(default=None, max_length=100)

    # Buyer info (공급받는자)
    buyer_corp_num: str = Field(max_length=20)  # 사업자번호
    buyer_name: str = Field(max_length=255)  # 상호
    buyer_ceo: Optional[str] = Field(default=None, max_length=100)
    buyer_address: Optional[str] = Field(default=None)
    buyer_email: Optional[str] = Field(default=None, max_length=100)

    # Description
    description: Optional[str] = Field(default=None)  # 품목명
    remark: Optional[str] = Field(default=None)  # 비고

    # Issue date
    issue_date: Optional[date] = Field(default=None)  # 작성일자


class TaxInvoice(TaxInvoiceBase, table=True):
    """TaxInvoice model - Popbill tax invoice integration."""
    __tablename__ = "tax_invoice"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(foreign_key="project.id", index=True)
    organization_id: uuid.UUID = Field(foreign_key="organization.id", index=True)

    # Popbill issue ID (set after successful issue)
    issue_id: Optional[str] = Field(default=None, max_length=50, unique=True, index=True)

    # Status
    status: TaxInvoiceStatus = Field(default=TaxInvoiceStatus.DRAFT, index=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
    issued_at: Optional[datetime] = Field(default=None)
    cancelled_at: Optional[datetime] = Field(default=None)

    # Audit
    created_by: uuid.UUID = Field(foreign_key="user.id")

    # Relationships
    project: Optional["Project"] = Relationship()


class TaxInvoiceCreate(SQLModel):
    """Schema for creating tax invoice."""
    project_id: uuid.UUID
    mgtkey: str

    # Invoice details
    invoice_type: TaxInvoiceType = TaxInvoiceType.REGULAR
    supply_amount: Decimal
    tax_amount: Decimal
    total_amount: Decimal

    # Supplier info (공급자)
    supplier_corp_num: str
    supplier_name: str
    supplier_ceo: Optional[str] = None
    supplier_address: Optional[str] = None
    supplier_email: Optional[str] = None

    # Buyer info (공급받는자)
    buyer_corp_num: str
    buyer_name: str
    buyer_ceo: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_email: Optional[str] = None

    # Description
    description: Optional[str] = None
    remark: Optional[str] = None

    # Issue date
    issue_date: Optional[date] = None


class TaxInvoiceRead(TaxInvoiceBase):
    """Schema for reading tax invoice."""
    id: uuid.UUID
    project_id: uuid.UUID
    organization_id: uuid.UUID
    issue_id: Optional[str]
    status: TaxInvoiceStatus
    created_at: datetime
    updated_at: datetime
    issued_at: Optional[datetime]
    cancelled_at: Optional[datetime]
    created_by: uuid.UUID


class TaxInvoiceUpdate(SQLModel):
    """Schema for updating tax invoice (only allowed in DRAFT status)."""
    mgtkey: Optional[str] = None

    # Invoice details
    invoice_type: Optional[TaxInvoiceType] = None
    supply_amount: Optional[Decimal] = None
    tax_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None

    # Supplier info (공급자)
    supplier_corp_num: Optional[str] = None
    supplier_name: Optional[str] = None
    supplier_ceo: Optional[str] = None
    supplier_address: Optional[str] = None
    supplier_email: Optional[str] = None

    # Buyer info (공급받는자)
    buyer_corp_num: Optional[str] = None
    buyer_name: Optional[str] = None
    buyer_ceo: Optional[str] = None
    buyer_address: Optional[str] = None
    buyer_email: Optional[str] = None

    # Description
    description: Optional[str] = None
    remark: Optional[str] = None

    # Issue date
    issue_date: Optional[date] = None


class TaxInvoiceIssue(SQLModel):
    """Schema for issuing tax invoice with Popbill."""
    # Memo or additional notes for the issuance
    memo: Optional[str] = None
    # Force issue even if validation warnings exist
    force_issue: bool = False
