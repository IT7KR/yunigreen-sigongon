"""결제 및 구독 관리 API 라우터 - Toss Payments 연동."""
import uuid
import hmac
import hashlib
from datetime import datetime, timedelta
from typing import Annotated, Optional
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status, Header
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException
from app.models.user import User, Organization
from app.models.billing import (
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
    Payment,
    PaymentStatus,
)
from app.schemas.response import APIResponse, PaginatedResponse

router = APIRouter()

# Type aliases
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

# Plan pricing (KRW per year)
PLAN_PRICING = {
    SubscriptionPlan.STARTER: Decimal("99000"),
    SubscriptionPlan.STANDARD: Decimal("199000"),
    SubscriptionPlan.PREMIUM: Decimal("399000"),
}


# Request/Response Schemas
class ConfirmPaymentRequest(BaseModel):
    """결제 승인 요청."""
    payment_key: str
    order_id: str
    amount: Decimal


class IssueBillingKeyRequest(BaseModel):
    """정기결제 빌링키 발급 요청."""
    auth_key: str  # Toss widget에서 받은 인증키
    customer_key: Optional[str] = None  # 조직 ID 기반으로 생성 (선택)


class ChangePlanRequest(BaseModel):
    """플랜 변경 요청."""
    new_plan: Optional[SubscriptionPlan] = None
    plan: Optional[SubscriptionPlan] = None


class SubscriptionDetail(BaseModel):
    """구독 상세 정보."""
    id: int
    organization_id: int
    plan: str
    status: str
    started_at: datetime
    expires_at: datetime
    cancelled_at: Optional[datetime]
    has_billing_key: bool
    created_at: datetime


class PaymentListItem(BaseModel):
    """결제 목록 아이템."""
    id: int
    order_id: str
    amount: Decimal
    method: Optional[str]
    status: str
    paid_at: Optional[datetime]
    failed_at: Optional[datetime]
    failure_reason: Optional[str]
    receipt_url: Optional[str]
    created_at: datetime


class PaymentDetail(BaseModel):
    """결제 상세 정보."""
    id: int
    subscription_id: int
    organization_id: int
    payment_key: str
    order_id: str
    amount: Decimal
    method: Optional[str]
    status: str
    paid_at: Optional[datetime]
    failed_at: Optional[datetime]
    failure_reason: Optional[str]
    receipt_url: Optional[str]
    created_at: datetime
    updated_at: datetime


class WebhookEvent(BaseModel):
    """Toss Payments 웹훅 이벤트."""
    event_type: str  # PAYMENT_APPROVED, PAYMENT_FAILED, BILLING_KEY_ISSUED
    data: dict


@router.post("/billing/confirm", response_model=APIResponse[PaymentDetail], status_code=status.HTTP_200_OK)
async def confirm_payment(
    payment_data: ConfirmPaymentRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """결제 승인.

    Toss Payments에서 결제를 승인하고 결제 기록을 생성해요.
    서버에서 금액을 검증해서 위변조를 방지해요.
    """
    # Get organization and subscription
    org_result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    organization = org_result.scalar_one_or_none()

    if not organization:
        raise NotFoundException("organization", current_user.organization_id)

    sub_result = await db.execute(
        select(Subscription).where(Subscription.organization_id == organization.id)
    )
    subscription = sub_result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독 정보를 찾을 수 없어요",
        )

    # Validate amount against plan pricing
    expected_amount = PLAN_PRICING.get(subscription.plan)
    if not expected_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="플랜 정보가 올바르지 않아요",
        )

    if payment_data.amount != expected_amount:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"결제 금액이 일치하지 않아요. 예상: {expected_amount:,}원, 요청: {payment_data.amount:,}원",
        )

    # Check if payment already exists
    existing_payment = await db.execute(
        select(Payment).where(Payment.order_id == payment_data.order_id)
    )
    if existing_payment.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 처리된 주문이에요",
        )

    # TODO: Call Toss Payments API to confirm payment
    # For now, we'll create the payment record directly
    # In production, you should:
    # 1. Call Toss API: POST https://api.tosspayments.com/v1/payments/confirm
    # 2. Verify response
    # 3. Store payment details

    payment = Payment(
        subscription_id=subscription.id,
        organization_id=organization.id,
        payment_key=payment_data.payment_key,
        order_id=payment_data.order_id,
        amount=payment_data.amount,
        status=PaymentStatus.PAID,
        paid_at=datetime.utcnow(),
    )

    db.add(payment)

    # Update subscription expiry
    if subscription.expires_at < datetime.utcnow():
        # Expired subscription - start from now
        subscription.expires_at = datetime.utcnow() + timedelta(days=365)
    else:
        # Active subscription - extend from current expiry
        subscription.expires_at = subscription.expires_at + timedelta(days=365)

    subscription.status = SubscriptionStatus.ACTIVE
    subscription.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(payment)

    return APIResponse.ok(_to_payment_detail(payment))


@router.post("/billing/billing-key", response_model=APIResponse[SubscriptionDetail], status_code=status.HTTP_200_OK)
async def issue_billing_key(
    billing_data: IssueBillingKeyRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """정기결제 빌링키 발급.

    Toss 위젯에서 받은 인증키로 빌링키를 발급하고 저장해요.
    """
    # Get organization and subscription
    org_result = await db.execute(
        select(Organization).where(Organization.id == current_user.organization_id)
    )
    organization = org_result.scalar_one_or_none()

    if not organization:
        raise NotFoundException("organization", current_user.organization_id)

    sub_result = await db.execute(
        select(Subscription).where(Subscription.organization_id == organization.id)
    )
    subscription = sub_result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독 정보를 찾을 수 없어요",
        )

    # TODO: Call Toss Payments API to issue billing key
    # For now, we'll store the auth_key as billing_key
    # In production, you should:
    # 1. Call Toss API: POST https://api.tosspayments.com/v1/billing/authorizations/issue
    # 2. Get billing key from response
    # 3. Encrypt billing key before storing

    subscription.billing_key = billing_data.auth_key  # In production: encrypt this
    subscription.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(subscription)

    return APIResponse.ok(_to_subscription_detail(subscription))


@router.get("/billing/subscription", response_model=APIResponse[SubscriptionDetail])
async def get_subscription(
    db: DBSession,
    current_user: CurrentUser,
):
    """현재 구독 정보 조회.

    조직의 구독 정보를 확인해요.
    """
    sub_result = await db.execute(
        select(Subscription).where(Subscription.organization_id == current_user.organization_id)
    )
    subscription = sub_result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독 정보를 찾을 수 없어요",
        )

    return APIResponse.ok(_to_subscription_detail(subscription))


@router.put("/billing/subscription", response_model=APIResponse[SubscriptionDetail])
async def change_plan(
    plan_data: ChangePlanRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """플랜 변경.

    구독 플랜을 변경해요. 업그레이드 시 일할 계산으로 차액을 청구해요.
    """
    sub_result = await db.execute(
        select(Subscription).where(Subscription.organization_id == current_user.organization_id)
    )
    subscription = sub_result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독 정보를 찾을 수 없어요",
        )

    if subscription.status != SubscriptionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="활성 상태의 구독만 플랜을 변경할 수 있어요",
        )

    target_plan = plan_data.new_plan or plan_data.plan
    if target_plan is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="변경할 플랜이 필요해요",
        )

    if subscription.plan == target_plan:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 해당 플랜을 사용 중이에요",
        )

    old_plan = subscription.plan
    old_price = PLAN_PRICING[old_plan]
    new_price = PLAN_PRICING[target_plan]

    # Calculate proration
    now = datetime.utcnow()
    days_remaining = (subscription.expires_at - now).days

    if days_remaining > 0:
        # Calculate refund for unused time on old plan
        daily_old_price = old_price / Decimal("365")
        refund_amount = daily_old_price * Decimal(str(days_remaining))

        # Calculate cost for remaining time on new plan
        daily_new_price = new_price / Decimal("365")
        new_charge = daily_new_price * Decimal(str(days_remaining))

        proration_amount = new_charge - refund_amount

        # TODO: Process proration payment if amount > 0
        # For now, we'll just log it
        if proration_amount > 0:
            # Create a proration payment record
            payment = Payment(
                subscription_id=subscription.id,
                organization_id=current_user.organization_id,
                payment_key=f"proration-{uuid.uuid4()}",
                order_id=f"proration-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}-{uuid.uuid4().hex[:8]}",
                amount=proration_amount,
                method="proration",
                status=PaymentStatus.PENDING,
            )
            db.add(payment)

    # Update plan
    subscription.plan = target_plan
    subscription.updated_at = datetime.utcnow()

    await db.commit()
    await db.refresh(subscription)

    return APIResponse.ok(_to_subscription_detail(subscription))


@router.delete("/billing/subscription", response_model=APIResponse[SubscriptionDetail])
async def cancel_subscription(
    db: DBSession,
    current_user: CurrentUser,
):
    """구독 취소.

    구독을 취소해요. 만료일까지는 계속 사용할 수 있어요.
    """
    sub_result = await db.execute(
        select(Subscription).where(Subscription.organization_id == current_user.organization_id)
    )
    subscription = sub_result.scalar_one_or_none()

    if not subscription:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="구독 정보를 찾을 수 없어요",
        )

    if subscription.status == SubscriptionStatus.CANCELLED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 취소된 구독이에요",
        )

    subscription.status = SubscriptionStatus.CANCELLED
    subscription.cancelled_at = datetime.utcnow()
    subscription.updated_at = datetime.utcnow()

    # Clear billing key to prevent auto-renewal
    subscription.billing_key = None

    await db.commit()
    await db.refresh(subscription)

    return APIResponse.ok(_to_subscription_detail(subscription))


@router.get("/billing/payments", response_model=PaginatedResponse[PaymentListItem])
async def list_payments(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    """결제 내역 조회.

    조직의 결제 내역을 페이지별로 조회해요.
    """
    # Build query
    query = select(Payment).where(Payment.organization_id == current_user.organization_id)

    # Filter by status
    if status_filter:
        try:
            status_enum = PaymentStatus(status_filter)
            query = query.where(Payment.status == status_enum)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"잘못된 상태 값이에요: {status_filter}",
            )

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    query = query.order_by(Payment.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)

    result = await db.execute(query)
    payments = result.scalars().all()

    # Convert to response items
    items = [
        PaymentListItem(
            id=payment.id,
            order_id=payment.order_id,
            amount=payment.amount,
            method=payment.method,
            status=payment.status.value,
            paid_at=payment.paid_at,
            failed_at=payment.failed_at,
            failure_reason=payment.failure_reason,
            receipt_url=payment.receipt_url,
            created_at=payment.created_at,
        )
        for payment in payments
    ]

    return PaginatedResponse.create(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post("/billing/webhook", status_code=status.HTTP_200_OK)
async def handle_webhook(
    request: Request,
    db: DBSession,
    toss_signature: Optional[str] = Header(default=None, alias="X-Toss-Signature"),
):
    """Toss Payments 웹훅 처리.

    Toss Payments에서 보내는 이벤트를 처리해요.
    PAYMENT_APPROVED, PAYMENT_FAILED, BILLING_KEY_ISSUED 등의 이벤트를 처리해요.
    """
    # Get raw body for signature verification
    body = await request.body()

    # TODO: Verify webhook signature
    # In production, you should:
    # 1. Get webhook secret from config
    # 2. Calculate HMAC-SHA256 signature
    # 3. Compare with toss_signature header
    # Example:
    # webhook_secret = get_settings().toss_webhook_secret
    # expected_signature = hmac.new(
    #     webhook_secret.encode(),
    #     body,
    #     hashlib.sha256
    # ).hexdigest()
    # if not hmac.compare_digest(expected_signature, toss_signature or ""):
    #     raise HTTPException(status_code=400, detail="Invalid signature")

    # Parse event
    event_data = await request.json()
    event_type = event_data.get("eventType")
    data = event_data.get("data", {})

    if event_type == "PAYMENT_APPROVED":
        # Update payment status to paid
        payment_key = data.get("paymentKey")
        if payment_key:
            result = await db.execute(
                select(Payment).where(Payment.payment_key == payment_key)
            )
            payment = result.scalar_one_or_none()

            if payment:
                payment.status = PaymentStatus.PAID
                payment.paid_at = datetime.utcnow()
                payment.receipt_url = data.get("receiptUrl")
                payment.method = data.get("method")
                payment.updated_at = datetime.utcnow()
                await db.commit()

    elif event_type == "PAYMENT_FAILED":
        # Update payment status to failed
        payment_key = data.get("paymentKey")
        if payment_key:
            result = await db.execute(
                select(Payment).where(Payment.payment_key == payment_key)
            )
            payment = result.scalar_one_or_none()

            if payment:
                payment.status = PaymentStatus.FAILED
                payment.failed_at = datetime.utcnow()
                payment.failure_reason = data.get("failureReason")
                payment.updated_at = datetime.utcnow()
                await db.commit()

    elif event_type == "BILLING_KEY_ISSUED":
        # Update subscription with billing key
        customer_key = data.get("customerKey")
        billing_key = data.get("billingKey")

        if customer_key and billing_key:
            # Extract organization_id from customer_key
            # Assuming customer_key format: "org-{organization_id}"
            if customer_key.startswith("org-"):
                org_id_str = customer_key[4:]
                try:
                    org_id = int(org_id_str)
                    result = await db.execute(
                        select(Subscription).where(Subscription.organization_id == org_id)
                    )
                    subscription = result.scalar_one_or_none()

                    if subscription:
                        # TODO: Encrypt billing_key in production
                        subscription.billing_key = billing_key
                        subscription.updated_at = datetime.utcnow()
                        await db.commit()
                except ValueError:
                    pass  # Invalid int format

    return {"status": "ok", "received": event_type}


# Helper functions
def _to_subscription_detail(subscription: Subscription) -> SubscriptionDetail:
    """Convert subscription model to detail response."""
    return SubscriptionDetail(
        id=subscription.id,
        organization_id=subscription.organization_id,
        plan=subscription.plan.value,
        status=subscription.status.value,
        started_at=subscription.started_at,
        expires_at=subscription.expires_at,
        cancelled_at=subscription.cancelled_at,
        has_billing_key=subscription.billing_key is not None,
        created_at=subscription.created_at,
    )


def _to_payment_detail(payment: Payment) -> PaymentDetail:
    """Convert payment model to detail response."""
    return PaymentDetail(
        id=payment.id,
        subscription_id=payment.subscription_id,
        organization_id=payment.organization_id,
        payment_key=payment.payment_key,
        order_id=payment.order_id,
        amount=payment.amount,
        method=payment.method,
        status=payment.status.value,
        paid_at=payment.paid_at,
        failed_at=payment.failed_at,
        failure_reason=payment.failure_reason,
        receipt_url=payment.receipt_url,
        created_at=payment.created_at,
        updated_at=payment.updated_at,
    )
