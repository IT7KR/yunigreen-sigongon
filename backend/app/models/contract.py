"""Contract and LaborContract models."""
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.project import Project


class ContractStatus(str, Enum):
    """Contract status enumeration."""

    DRAFT = "draft"
    SENT = "sent"
    SIGNED = "signed"
    ACTIVE = "active"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class ContractTemplateType(str, Enum):
    """계약서 템플릿 유형."""

    PUBLIC_OFFICE = "public_office"
    PRIVATE_STANDARD = "private_standard"


class ContractKind(str, Enum):
    """계약 운영 유형."""

    PRIVATE_STANDARD = "private_standard"
    PUBLIC_PLATFORM = "public_platform"


class ContractExecutionMode(str, Enum):
    """계약 체결 실행 모드."""

    MODUSIGN = "modusign"
    UPLOAD_ONLY = "upload_only"


class PublicPlatformType(str, Enum):
    """관공서 외부 플랫폼 구분."""

    NARAJANGTEO = "narajangteo"
    S2B = "s2b"
    ETC = "etc"


class LaborContractStatus(str, Enum):
    """Labor contract status enumeration."""

    DRAFT = "draft"
    SENT = "sent"
    SIGNED = "signed"
    PAID = "paid"


class ContractBase(SQLModel):
    """Contract base fields."""

    contract_number: Optional[str] = Field(default=None, max_length=50, unique=True)
    notes: Optional[str] = Field(default=None)
    special_terms: Optional[str] = Field(default=None)


class Contract(ContractBase, table=True):
    """Contract model - Legal contract based on estimate."""

    __tablename__ = "contract"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(sa_type=BigInteger, index=True)
    estimate_id: int = Field(sa_type=BigInteger, index=True)

    # Compatibility fields
    contract_amount: Decimal = Field(max_digits=15, decimal_places=2)
    template_type: ContractTemplateType = Field(
        default=ContractTemplateType.PUBLIC_OFFICE,
        index=True,
    )

    # V2 routing and execution
    contract_kind: ContractKind = Field(default=ContractKind.PUBLIC_PLATFORM, index=True)
    execution_mode: ContractExecutionMode = Field(
        default=ContractExecutionMode.UPLOAD_ONLY,
        index=True,
    )

    # Amount snapshots
    supply_amount: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)
    vat_amount: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)
    total_amount: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)

    # Contract terms
    delay_penalty_rate: Optional[Decimal] = Field(default=None, max_digits=8, decimal_places=6)
    retention_rate: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=4)

    performance_bond_required: bool = Field(default=False)
    performance_bond_rate: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=4)
    performance_bond_amount: Optional[Decimal] = Field(default=None, max_digits=15, decimal_places=2)

    defect_warranty_required: bool = Field(default=False)
    defect_warranty_rate: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=4)
    defect_warranty_period_months: Optional[int] = Field(default=None)

    # Party snapshots
    owner_name: Optional[str] = Field(default=None, max_length=150)
    owner_business_number: Optional[str] = Field(default=None, max_length=30)
    owner_representative_name: Optional[str] = Field(default=None, max_length=100)
    owner_address: Optional[str] = Field(default=None)
    owner_phone: Optional[str] = Field(default=None, max_length=30)

    contractor_name: Optional[str] = Field(default=None, max_length=150)
    contractor_business_number: Optional[str] = Field(default=None, max_length=30)
    contractor_representative_name: Optional[str] = Field(default=None, max_length=100)
    contractor_address: Optional[str] = Field(default=None)
    contractor_phone: Optional[str] = Field(default=None, max_length=30)

    # Public platform metadata
    public_platform_type: Optional[PublicPlatformType] = Field(default=None, index=True)
    public_notice_number: Optional[str] = Field(default=None, max_length=100)
    public_bid_number: Optional[str] = Field(default=None, max_length=100)
    public_contract_reference: Optional[str] = Field(default=None, max_length=100)

    # Status
    status: ContractStatus = Field(default=ContractStatus.DRAFT, index=True)

    # Dates
    created_at: datetime = Field(default_factory=datetime.utcnow)
    sent_at: Optional[datetime] = Field(default=None)
    signed_at: Optional[datetime] = Field(default=None)

    # Legacy dates
    start_date: Optional[date] = Field(default=None)
    expected_end_date: Optional[date] = Field(default=None)
    actual_end_date: Optional[date] = Field(default=None)

    # V2 dates
    contract_date: Optional[date] = Field(default=None)
    work_start_date: Optional[date] = Field(default=None)
    work_end_date: Optional[date] = Field(default=None)

    # Signatures
    client_signature_path: Optional[str] = Field(default=None, max_length=500)
    company_signature_path: Optional[str] = Field(default=None, max_length=500)

    # Document storage
    document_path: Optional[str] = Field(default=None, max_length=500)  # Legacy generated PDF path
    generated_document_path: Optional[str] = Field(default=None, max_length=500)
    source_document_path: Optional[str] = Field(default=None, max_length=500)

    schema_version: str = Field(default="v2", max_length=20)

    # Relationships
    project: Optional["Project"] = Relationship(
        back_populates="contracts",
        sa_relationship_kwargs={
            "primaryjoin": "Contract.project_id == Project.id",
            "foreign_keys": "[Contract.project_id]",
        },
    )
    warranty_items: List["ContractWarrantyItem"] = Relationship(
        back_populates="contract",
        sa_relationship_kwargs={
            "primaryjoin": "Contract.id == ContractWarrantyItem.contract_id",
            "foreign_keys": "[ContractWarrantyItem.contract_id]",
        },
    )


class ContractWarrantyItem(SQLModel, table=True):
    """Per-work-type defect warranty details."""

    __tablename__ = "contract_warranty_item"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    contract_id: int = Field(sa_type=BigInteger, index=True)
    work_type: str = Field(max_length=120)
    warranty_rate: Optional[Decimal] = Field(default=None, max_digits=6, decimal_places=4)
    warranty_period_months: Optional[int] = Field(default=None)
    notes: Optional[str] = Field(default=None)
    created_at: datetime = Field(default_factory=datetime.utcnow)

    contract: Optional[Contract] = Relationship(
        back_populates="warranty_items",
        sa_relationship_kwargs={
            "primaryjoin": "ContractWarrantyItem.contract_id == Contract.id",
            "foreign_keys": "[ContractWarrantyItem.contract_id]",
        },
    )


class ContractWarrantyItemCreate(SQLModel):
    work_type: str
    warranty_rate: Optional[Decimal] = None
    warranty_period_months: Optional[int] = None
    notes: Optional[str] = None


class ContractWarrantyItemRead(ContractWarrantyItemCreate):
    id: int


class ContractCreate(SQLModel):
    """Schema for creating contract."""

    project_id: int
    estimate_id: int
    contract_amount: Decimal
    template_type: ContractTemplateType = ContractTemplateType.PUBLIC_OFFICE
    contract_kind: Optional[ContractKind] = None
    execution_mode: Optional[ContractExecutionMode] = None

    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    contract_date: Optional[date] = None
    work_start_date: Optional[date] = None
    work_end_date: Optional[date] = None

    supply_amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None

    delay_penalty_rate: Optional[Decimal] = None
    retention_rate: Optional[Decimal] = None

    performance_bond_required: bool = False
    performance_bond_rate: Optional[Decimal] = None
    performance_bond_amount: Optional[Decimal] = None

    defect_warranty_required: bool = False
    defect_warranty_rate: Optional[Decimal] = None
    defect_warranty_period_months: Optional[int] = None

    owner_name: Optional[str] = None
    owner_business_number: Optional[str] = None
    owner_representative_name: Optional[str] = None
    owner_address: Optional[str] = None
    owner_phone: Optional[str] = None

    contractor_name: Optional[str] = None
    contractor_business_number: Optional[str] = None
    contractor_representative_name: Optional[str] = None
    contractor_address: Optional[str] = None
    contractor_phone: Optional[str] = None

    public_platform_type: Optional[PublicPlatformType] = None
    public_notice_number: Optional[str] = None
    public_bid_number: Optional[str] = None
    public_contract_reference: Optional[str] = None
    source_document_path: Optional[str] = None
    generated_document_path: Optional[str] = None

    notes: Optional[str] = None
    special_terms: Optional[str] = None

    warranty_items: List[ContractWarrantyItemCreate] = Field(default_factory=list)


class ContractRead(ContractBase):
    """Schema for reading contract."""

    id: int
    project_id: int
    estimate_id: int
    contract_amount: Decimal
    template_type: ContractTemplateType
    contract_kind: ContractKind
    execution_mode: ContractExecutionMode
    status: ContractStatus
    created_at: datetime
    signed_at: Optional[datetime]

    start_date: Optional[date]
    expected_end_date: Optional[date]
    contract_date: Optional[date]
    work_start_date: Optional[date]
    work_end_date: Optional[date]

    supply_amount: Optional[Decimal]
    vat_amount: Optional[Decimal]
    total_amount: Optional[Decimal]


class ContractUpdate(SQLModel):
    """Schema for updating contract."""

    status: Optional[ContractStatus] = None

    start_date: Optional[date] = None
    expected_end_date: Optional[date] = None
    actual_end_date: Optional[date] = None
    contract_date: Optional[date] = None
    work_start_date: Optional[date] = None
    work_end_date: Optional[date] = None

    supply_amount: Optional[Decimal] = None
    vat_amount: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    contract_amount: Optional[Decimal] = None

    delay_penalty_rate: Optional[Decimal] = None
    retention_rate: Optional[Decimal] = None

    performance_bond_required: Optional[bool] = None
    performance_bond_rate: Optional[Decimal] = None
    performance_bond_amount: Optional[Decimal] = None

    defect_warranty_required: Optional[bool] = None
    defect_warranty_rate: Optional[Decimal] = None
    defect_warranty_period_months: Optional[int] = None

    owner_name: Optional[str] = None
    owner_business_number: Optional[str] = None
    owner_representative_name: Optional[str] = None
    owner_address: Optional[str] = None
    owner_phone: Optional[str] = None

    contractor_name: Optional[str] = None
    contractor_business_number: Optional[str] = None
    contractor_representative_name: Optional[str] = None
    contractor_address: Optional[str] = None
    contractor_phone: Optional[str] = None

    public_platform_type: Optional[PublicPlatformType] = None
    public_notice_number: Optional[str] = None
    public_bid_number: Optional[str] = None
    public_contract_reference: Optional[str] = None
    source_document_path: Optional[str] = None
    generated_document_path: Optional[str] = None

    contract_kind: Optional[ContractKind] = None
    execution_mode: Optional[ContractExecutionMode] = None
    template_type: Optional[ContractTemplateType] = None

    notes: Optional[str] = None
    special_terms: Optional[str] = None

    warranty_items: Optional[List[ContractWarrantyItemCreate]] = None


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

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(sa_type=BigInteger, index=True)

    # Worker info (sensitive - should be encrypted in production)
    worker_id_number: Optional[str] = Field(default=None, max_length=20)  # 주민등록번호

    # Status
    status: LaborContractStatus = Field(default=LaborContractStatus.DRAFT)

    # Signatures
    worker_signature_path: Optional[str] = Field(default=None, max_length=500)
    signed_at: Optional[datetime] = Field(default=None)

    created_at: datetime = Field(default_factory=datetime.utcnow)
    created_by: Optional[int] = Field(default=None, sa_type=BigInteger)


class LaborContractCreate(LaborContractBase):
    """Schema for creating labor contract."""

    project_id: int


class LaborContractRead(LaborContractBase):
    """Schema for reading labor contract."""

    id: int
    project_id: int
    status: LaborContractStatus
    signed_at: Optional[datetime]
    created_at: datetime


class LaborContractUpdate(SQLModel):
    """Schema for updating labor contract."""

    status: Optional[LaborContractStatus] = None
    hours_worked: Optional[Decimal] = None
