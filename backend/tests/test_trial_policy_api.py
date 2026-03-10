"""Trial policy and post-signup billing API tests."""

from __future__ import annotations

from datetime import datetime
from types import SimpleNamespace

import pytest
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.main import app
from app.models.billing import (
    OrganizationTrialOverride,
    Payment,
    PaymentStatus,
    SignupTrialPolicy,
    Subscription,
    SubscriptionPlan,
    SubscriptionStatus,
)
from app.models.user import Organization, User, UserRole
from app.services.trial_policy import add_months


@pytest.fixture
async def trial_policy_context(test_db):
    super_admin = User(
        username="trial_policy_super_admin",
        name="플랫폼관리자",
        role=UserRole.SUPER_ADMIN,
        organization_id=None,
        phone="010-2000-0000",
        password_hash="hash",
        is_active=True,
    )
    org = Organization(
        name="기존 고객사",
        business_number="555-66-77777",
        rep_name="대표",
        rep_phone="010-2000-0001",
        rep_email="owner@example.com",
    )
    test_db.add(super_admin)
    test_db.add(org)
    await test_db.flush()

    company_admin = User(
        username="trial_policy_company_admin",
        name="기존 대표",
        role=UserRole.COMPANY_ADMIN,
        organization_id=org.id,
        phone="010-2000-0002",
        password_hash="hash",
        is_active=True,
    )
    test_db.add(company_admin)
    await test_db.commit()

    def _auth_user_for(user: User) -> SimpleNamespace:
        return SimpleNamespace(
            id=user.id,
            role=user.role,
            organization_id=user.organization_id,
        )

    current_user_holder: dict[str, SimpleNamespace] = {
        "user": _auth_user_for(super_admin)
    }

    async def _fake_user():
        return current_user_holder["user"]

    async def _override_db():
        try:
            yield test_db
            await test_db.commit()
        except Exception:
            await test_db.rollback()
            raise

    app.dependency_overrides[get_current_user] = _fake_user
    app.dependency_overrides[get_async_db] = _override_db

    yield {
        "db": test_db,
        "super_admin": super_admin,
        "company_admin": company_admin,
        "organization": org,
        "set_user": lambda user: current_user_holder.__setitem__(
            "user", _auth_user_for(user)
        ),
    }

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_async_db, None)


@pytest.mark.asyncio
async def test_register_applies_default_trial_policy_in_months(
    async_client,
    trial_policy_context,
):
    db = trial_policy_context["db"]

    policy = SignupTrialPolicy(
        default_trial_enabled=True,
        default_trial_months=3,
    )
    db.add(policy)
    await db.commit()

    response = await async_client.post(
        "/api/v1/auth/register",
        json={
          "username": "signup_trial_user",
          "password": "Password!123",
          "phone": "010-3333-4444",
          "email": "signup-trial@example.com",
          "company_name": "트라이얼 건설",
          "business_number": "123-45-67890",
          "representative_name": "홍길동",
          "rep_phone": "010-3333-5555",
          "rep_email": "owner@trial.example.com",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    org = (
        await db.execute(
            select(Organization).where(Organization.business_number == "123-45-67890")
        )
    ).scalar_one()
    subscription = (
        await db.execute(
            select(Subscription).where(Subscription.organization_id == org.id)
        )
    ).scalar_one()

    assert subscription.plan == SubscriptionPlan.TRIAL
    assert subscription.status == SubscriptionStatus.ACTIVE
    assert subscription.expires_at == add_months(subscription.started_at, 3)


@pytest.mark.asyncio
async def test_register_without_trial_policy_creates_no_subscription(
    async_client,
    trial_policy_context,
):
    db = trial_policy_context["db"]

    policy = SignupTrialPolicy(
        default_trial_enabled=False,
        default_trial_months=0,
    )
    db.add(policy)
    await db.commit()

    response = await async_client.post(
        "/api/v1/auth/register",
        json={
          "username": "signup_without_trial_user",
          "password": "Password!123",
          "phone": "010-4444-5555",
          "email": "signup-no-trial@example.com",
          "company_name": "노트라이얼 건설",
          "business_number": "223-45-67890",
          "representative_name": "김대표",
          "rep_phone": "010-4444-6666",
          "rep_email": "owner@notrial.example.com",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True

    org = (
        await db.execute(
            select(Organization).where(Organization.business_number == "223-45-67890")
        )
    ).scalar_one()
    subscription = (
        await db.execute(
            select(Subscription).where(Subscription.organization_id == org.id)
        )
    ).scalar_one_or_none()

    assert subscription is None


@pytest.mark.asyncio
async def test_confirm_payment_creates_subscription_when_missing(
    async_client,
    trial_policy_context,
):
    db = trial_policy_context["db"]
    set_user = trial_policy_context["set_user"]
    company_admin = trial_policy_context["company_admin"]
    org = trial_policy_context["organization"]
    set_user(company_admin)

    response = await async_client.post(
        "/api/v1/billing/confirm",
        json={
            "payment_key": "mock_payment_key",
            "order_id": "ORDER_BASIC_001",
            "amount": 588000,
            "plan": "basic",
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "paid"

    subscription = (
        await db.execute(
            select(Subscription).where(Subscription.organization_id == org.id)
        )
    ).scalar_one()
    payment = (
        await db.execute(
            select(Payment).where(Payment.organization_id == org.id)
        )
    ).scalar_one()

    assert subscription.plan == SubscriptionPlan.BASIC
    assert subscription.status == SubscriptionStatus.ACTIVE
    assert subscription.expires_at > datetime.utcnow()
    assert payment.status == PaymentStatus.PAID
    assert payment.amount == 588000


@pytest.mark.asyncio
async def test_admin_trial_policy_endpoints_update_default_policy(
    async_client,
    trial_policy_context,
):
    db = trial_policy_context["db"]

    get_response = await async_client.get("/api/v1/admin/billing/trial-policy")
    assert get_response.status_code == 200
    assert get_response.json()["data"]["default_trial_enabled"] is True

    update_response = await async_client.put(
        "/api/v1/admin/billing/trial-policy",
        json={
            "default_trial_enabled": True,
            "default_trial_months": 6,
        },
    )

    assert update_response.status_code == 200
    payload = update_response.json()
    assert payload["success"] is True
    assert payload["data"]["default_trial_months"] == 6

    policy = (await db.execute(select(SignupTrialPolicy))).scalar_one()
    assert policy.default_trial_enabled is True
    assert policy.default_trial_months == 6


@pytest.mark.asyncio
async def test_tenant_trial_override_endpoint_creates_and_withdraws_trial(
    async_client,
    trial_policy_context,
):
    db = trial_policy_context["db"]
    org = trial_policy_context["organization"]

    enable_response = await async_client.put(
        f"/api/v1/admin/tenants/{org.id}/trial-policy",
        json={
            "trial_enabled": True,
            "trial_months": 2,
            "reason": "파트너 온보딩 지원",
        },
    )

    assert enable_response.status_code == 200
    enable_payload = enable_response.json()
    assert enable_payload["success"] is True
    assert enable_payload["data"]["trial_enabled"] is True
    assert enable_payload["data"]["trial_months"] == 2

    override = (
        await db.execute(
            select(OrganizationTrialOverride).where(
                OrganizationTrialOverride.organization_id == org.id
            )
        )
    ).scalar_one()
    subscription = (
        await db.execute(
            select(Subscription).where(Subscription.organization_id == org.id)
        )
    ).scalar_one()

    assert override.trial_enabled is True
    assert override.trial_months == 2
    assert override.reason == "파트너 온보딩 지원"
    assert subscription.plan == SubscriptionPlan.TRIAL
    assert subscription.status == SubscriptionStatus.ACTIVE

    disable_response = await async_client.put(
        f"/api/v1/admin/tenants/{org.id}/trial-policy",
        json={
            "trial_enabled": False,
            "trial_months": 0,
            "reason": "유료 전환 준비",
        },
    )

    assert disable_response.status_code == 200
    disable_payload = disable_response.json()
    assert disable_payload["success"] is True
    assert disable_payload["data"]["trial_enabled"] is False

    await db.refresh(subscription)
    assert subscription.status == SubscriptionStatus.EXPIRED
    assert subscription.expires_at <= datetime.utcnow()
