"""Operations and auxiliary domain models for frontend parity."""
from datetime import datetime, date, timedelta
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import BigInteger, Column, JSON, UniqueConstraint, Text
from sqlmodel import SQLModel, Field

from app.core.snowflake import generate_snowflake_id


class PartnerStatus(str, Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"


class InvitationStatus(str, Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    EXPIRED = "expired"
    REVOKED = "revoked"


class UtilityStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"


class UtilityDocStatus(str, Enum):
    PENDING = "pending"
    SUBMITTED = "submitted"


class MaterialOrderStatus(str, Enum):
    DRAFT = "draft"
    REQUESTED = "requested"
    CONFIRMED = "confirmed"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"


class NotificationType(str, Enum):
    CONTRACT = "contract"
    PAYSTUB = "paystub"
    NOTICE = "notice"


class PaystubStatus(str, Enum):
    SENT = "sent"
    CONFIRMED = "confirmed"


class ProjectAccessPolicy(SQLModel, table=True):
    __tablename__ = "project_access_policy"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    project_id: int = Field(sa_column=Column(BigInteger, unique=True, nullable=False, index=True))
    manager_ids: list[int] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DailyReport(SQLModel, table=True):
    __tablename__ = "daily_report"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    project_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    work_date: date = Field(index=True)
    weather: Optional[str] = Field(default=None, max_length=30)
    temperature: Optional[str] = Field(default=None, max_length=30)
    work_description: str = Field(sa_column=Column(Text, nullable=False))
    tomorrow_plan: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    photos: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    created_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UtilityItem(SQLModel, table=True):
    __tablename__ = "utility_item"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    project_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    type: str = Field(max_length=20)
    month: str = Field(max_length=7)  # YYYY-MM
    status: UtilityStatus = Field(default=UtilityStatus.PENDING, index=True)
    amount: int = Field(default=0)
    due_date: date
    doc_status: UtilityDocStatus = Field(default=UtilityDocStatus.PENDING)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class UtilityTimeline(SQLModel, table=True):
    __tablename__ = "utility_timeline"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    project_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    utility_item_id: Optional[int] = Field(default=None, sa_column=Column(BigInteger, nullable=True, index=True))
    date: datetime = Field(default_factory=datetime.utcnow)
    message: str = Field(max_length=255)


class MaterialOrder(SQLModel, table=True):
    __tablename__ = "material_order"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    project_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    order_number: str = Field(max_length=60, index=True)
    status: MaterialOrderStatus = Field(default=MaterialOrderStatus.DRAFT, index=True)
    total_amount: int = Field(default=0)
    notes: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    requested_at: Optional[datetime] = Field(default=None)
    confirmed_at: Optional[datetime] = Field(default=None)
    delivered_at: Optional[datetime] = Field(default=None)
    created_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class MaterialOrderItem(SQLModel, table=True):
    __tablename__ = "material_order_item"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    material_order_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    description: str = Field(max_length=255)
    specification: Optional[str] = Field(default=None, max_length=255)
    unit: str = Field(max_length=20)
    quantity: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    unit_price: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)
    amount: Decimal = Field(default=Decimal("0"), max_digits=15, decimal_places=2)


class Partner(SQLModel, table=True):
    __tablename__ = "partner"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    organization_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    name: str = Field(max_length=255)
    representative_name: Optional[str] = Field(default=None, max_length=100)
    representative_phone: Optional[str] = Field(default=None, max_length=20)
    business_number: Optional[str] = Field(default=None, max_length=20, index=True)
    contact_name: Optional[str] = Field(default=None, max_length=100)
    contact_phone: Optional[str] = Field(default=None, max_length=20)
    license_type: Optional[str] = Field(default=None, max_length=100)
    is_women_owned: bool = Field(default=False)
    # Legacy compatibility fields
    biz_no: Optional[str] = Field(default=None, max_length=20, index=True)
    owner: Optional[str] = Field(default=None, max_length=100)
    license: Optional[str] = Field(default=None, max_length=100)
    is_female_owned: bool = Field(default=False)
    status: PartnerStatus = Field(default=PartnerStatus.ACTIVE)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Invitation(SQLModel, table=True):
    __tablename__ = "invitation"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    organization_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    phone: str = Field(max_length=20, index=True)
    name: str = Field(max_length=100)
    role: str = Field(max_length=20)
    status: InvitationStatus = Field(default=InvitationStatus.PENDING, index=True)
    token: str = Field(max_length=120, index=True, unique=True)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(days=7))
    accepted_at: Optional[datetime] = Field(default=None)
    accepted_user_id: Optional[int] = Field(default=None, sa_type=BigInteger, index=True)
    created_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class UserNotificationPrefs(SQLModel, table=True):
    __tablename__ = "user_notification_prefs"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    user_id: int = Field(sa_column=Column(BigInteger, nullable=False, unique=True, index=True))
    email_notifications: bool = Field(default=True)
    project_status_change: bool = Field(default=True)
    estimate_contract_alerts: bool = Field(default=True)
    daily_report_alerts: bool = Field(default=True)
    platform_announcements: bool = Field(default=True)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ActivityLog(SQLModel, table=True):
    __tablename__ = "activity_log"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    user_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    action: str = Field(max_length=50, index=True)
    description: str = Field(max_length=255)
    ip_address: str = Field(default="0.0.0.0", max_length=45)
    device_info: str = Field(default="unknown", max_length=255)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class AccountRequest(SQLModel, table=True):
    __tablename__ = "account_request"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    user_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    type: str = Field(max_length=30, index=True)  # deactivation|deletion
    reason: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    status: str = Field(default="requested", max_length=30)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class DailyWorker(SQLModel, table=True):
    __tablename__ = "daily_worker"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    organization_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    name: str = Field(max_length=100, index=True)
    job_type: str = Field(max_length=100)
    job_type_code: str = Field(default="", max_length=30)
    team: str = Field(default="", max_length=100)
    hire_date: date
    visa_status: Optional[str] = Field(default=None, max_length=20)
    nationality_code: Optional[str] = Field(default=None, max_length=20)
    english_name: Optional[str] = Field(default=None, max_length=100)
    birth_date: str = Field(max_length=10)
    gender: int = Field(default=1)
    address: str = Field(default="", max_length=255)
    daily_rate: Decimal = Field(default=Decimal("0"), max_digits=12, decimal_places=2)
    account_number: str = Field(default="", max_length=50)
    bank_name: str = Field(default="", max_length=100)
    phone: str = Field(default="", max_length=20, index=True)
    is_foreign: bool = Field(default=False)
    registration_status: str = Field(default="registered", max_length=30)
    invite_token: Optional[str] = Field(default=None, max_length=120)
    has_id_card: bool = Field(default=False)
    has_safety_cert: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WorkRecord(SQLModel, table=True):
    __tablename__ = "work_record"
    __table_args__ = (
        UniqueConstraint("worker_id", "project_id", "work_date", name="uq_work_record_worker_project_date"),
    )

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    worker_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    project_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    work_date: date = Field(index=True)
    man_days: Decimal = Field(default=Decimal("1"), max_digits=4, decimal_places=1)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class InsuranceRate(SQLModel, table=True):
    __tablename__ = "insurance_rate"
    __table_args__ = (
        UniqueConstraint("organization_id", "effective_year", name="uq_insurance_rate_org_year"),
    )

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    organization_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    effective_year: int = Field(index=True)
    income_deduction: Decimal = Field(default=Decimal("150000"), max_digits=12, decimal_places=2)
    simplified_tax_rate: Decimal = Field(default=Decimal("0.027"), max_digits=8, decimal_places=6)
    local_tax_rate: Decimal = Field(default=Decimal("0.1"), max_digits=8, decimal_places=6)
    employment_insurance_rate: Decimal = Field(default=Decimal("0.009"), max_digits=8, decimal_places=6)
    health_insurance_rate: Decimal = Field(default=Decimal("0.03595"), max_digits=8, decimal_places=6)
    longterm_care_rate: Decimal = Field(default=Decimal("0.1314"), max_digits=8, decimal_places=6)
    national_pension_rate: Decimal = Field(default=Decimal("0.045"), max_digits=8, decimal_places=6)
    pension_upper_limit: Decimal = Field(default=Decimal("6170000"), max_digits=15, decimal_places=2)
    pension_lower_limit: Decimal = Field(default=Decimal("390000"), max_digits=15, decimal_places=2)
    health_premium_upper: Decimal = Field(default=Decimal("7822560"), max_digits=15, decimal_places=2)
    health_premium_lower: Decimal = Field(default=Decimal("19780"), max_digits=15, decimal_places=2)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class WorkerAccessRequest(SQLModel, table=True):
    __tablename__ = "worker_access_request"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    phone: str = Field(max_length=20, index=True)
    code: str = Field(max_length=10)
    worker_id: Optional[int] = Field(default=None, sa_column=Column(BigInteger, nullable=True, index=True))
    verified: bool = Field(default=False)
    expires_at: datetime = Field(default_factory=lambda: datetime.utcnow() + timedelta(minutes=10))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class WorkerContractView(SQLModel, table=True):
    """Worker-facing contract metadata bound to labor_contract."""

    __tablename__ = "worker_contract_view"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    labor_contract_id: int = Field(sa_column=Column(BigInteger, nullable=False, unique=True, index=True))
    worker_id: Optional[int] = Field(default=None, sa_column=Column(BigInteger, nullable=True, index=True))
    content: str = Field(default="", sa_column=Column(Text, nullable=False))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Paystub(SQLModel, table=True):
    __tablename__ = "paystub"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    worker_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    month: str = Field(max_length=7)
    title: str = Field(max_length=100)
    total_amount: int = Field(default=0)
    deductions: int = Field(default=0)
    net_amount: int = Field(default=0)
    status: PaystubStatus = Field(default=PaystubStatus.SENT, index=True)
    date: str = Field(max_length=30)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class PaystubItem(SQLModel, table=True):
    __tablename__ = "paystub_item"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    paystub_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    label: str = Field(max_length=100)
    amount: int = Field(default=0)


class WorkerDocument(SQLModel, table=True):
    __tablename__ = "worker_document"
    __table_args__ = (
        UniqueConstraint("worker_id", "document_id", name="uq_worker_document_worker_doc"),
    )

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    worker_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    document_id: str = Field(max_length=60, index=True)
    name: str = Field(max_length=100)
    status: str = Field(default="pending", max_length=30)
    storage_path: Optional[str] = Field(default=None, max_length=500)
    uploaded_at: Optional[datetime] = Field(default=None)


class AppNotification(SQLModel, table=True):
    __tablename__ = "app_notification"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    user_id: Optional[int] = Field(default=None, sa_column=Column(BigInteger, nullable=True, index=True))
    type: NotificationType = Field(default=NotificationType.NOTICE)
    title: str = Field(max_length=120)
    message: str = Field(max_length=500)
    time: str = Field(max_length=40)
    read: bool = Field(default=False, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class ModusignRequest(SQLModel, table=True):
    __tablename__ = "modusign_request"

    id: int = Field(default_factory=generate_snowflake_id, sa_column=Column(BigInteger, primary_key=True))
    contract_id: int = Field(sa_column=Column(BigInteger, nullable=False, unique=True, index=True))
    status: str = Field(default="pending", max_length=30)
    signer_name: str = Field(max_length=100)
    signer_email: str = Field(max_length=255)
    signer_phone: Optional[str] = Field(default=None, max_length=20)
    sent_at: datetime = Field(default_factory=datetime.utcnow)
    signed_at: Optional[datetime] = Field(default=None)
    expired_at: Optional[datetime] = Field(default=None)
    document_url: Optional[str] = Field(default=None, max_length=500)
