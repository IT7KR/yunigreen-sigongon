"""Billing and Payment models for Toss Payments integration."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, TYPE_CHECKING
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.user import Organization


class SubscriptionPlan(str, Enum):
    """Subscription plan enumeration."""
    STARTER = "starter"
    STANDARD = "standard"
    PREMIUM = "premium"


class SubscriptionStatus(str, Enum):
    """Subscription status enumeration."""
    ACTIVE = "active"
    CANCELLED = "cancelled"
    EXPIRED = "expired"
    PAST_DUE = "past_due"


class PaymentStatus(str, Enum):
    """Payment status enumeration."""
    PENDING = "pending"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"


# Subscription Models
class SubscriptionBase(SQLModel):
    """Subscription base fields."""
    plan: SubscriptionPlan
    status: SubscriptionStatus = Field(default=SubscriptionStatus.ACTIVE)


class Subscription(SubscriptionBase, table=True):
    """Subscription model - Organization subscription with Toss Payments billing."""
    __tablename__ = "subscription"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    organization_id: int = Field(
        foreign_key="organization.id", sa_type=BigInteger,
        unique=True,
        index=True
    )

    # Toss Payments billing key for recurring payments (encrypted in production)
    billing_key: Optional[str] = Field(default=None, max_length=500)

    # Subscription period
    started_at: datetime = Field(default_factory=datetime.utcnow)
    expires_at: datetime
    cancelled_at: Optional[datetime] = Field(default=None)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    organization: Optional["Organization"] = Relationship()


class SubscriptionCreate(SQLModel):
    """Schema for creating subscription."""
    organization_id: int
    plan: SubscriptionPlan
    expires_at: datetime
    billing_key: Optional[str] = None


class SubscriptionRead(SubscriptionBase):
    """Schema for reading subscription."""
    id: int
    organization_id: int
    started_at: datetime
    expires_at: datetime
    cancelled_at: Optional[datetime]
    created_at: datetime


class SubscriptionUpdate(SQLModel):
    """Schema for updating subscription."""
    plan: Optional[SubscriptionPlan] = None
    status: Optional[SubscriptionStatus] = None
    billing_key: Optional[str] = None
    expires_at: Optional[datetime] = None
    cancelled_at: Optional[datetime] = None


# Payment Models
class PaymentBase(SQLModel):
    """Payment base fields."""
    amount: Decimal = Field(max_digits=15, decimal_places=2)
    method: Optional[str] = Field(default=None, max_length=50)  # 카드, 계좌이체, etc.


class Payment(PaymentBase, table=True):
    """Payment model - Toss Payments transaction records."""
    __tablename__ = "payment"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    subscription_id: int = Field(
        foreign_key="subscription.id", sa_type=BigInteger,
        index=True
    )
    organization_id: int = Field(
        foreign_key="organization.id", sa_type=BigInteger,
        index=True
    )

    # Toss Payments identifiers
    payment_key: str = Field(max_length=200, unique=True)  # Toss payment key
    order_id: str = Field(max_length=100, unique=True)  # Merchant order ID

    # Payment status and result
    status: PaymentStatus = Field(default=PaymentStatus.PENDING, index=True)
    paid_at: Optional[datetime] = Field(default=None)
    failed_at: Optional[datetime] = Field(default=None)
    failure_reason: Optional[str] = Field(default=None, max_length=500)

    # Receipt
    receipt_url: Optional[str] = Field(default=None, max_length=500)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    subscription: Optional["Subscription"] = Relationship()


class PaymentCreate(SQLModel):
    """Schema for creating payment."""
    subscription_id: int
    organization_id: int
    payment_key: str
    order_id: str
    amount: Decimal
    method: Optional[str] = None


class PaymentRead(PaymentBase):
    """Schema for reading payment."""
    id: int
    subscription_id: int
    organization_id: int
    payment_key: str
    order_id: str
    status: PaymentStatus
    paid_at: Optional[datetime]
    failed_at: Optional[datetime]
    failure_reason: Optional[str]
    receipt_url: Optional[str]
    created_at: datetime
