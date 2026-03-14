"""최고관리자 고객사(Organization) 관리 API."""
from datetime import datetime
from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_active_admin
from app.models.user import Organization, User
from app.models.billing import (
    Subscription, SubscriptionPlan, SubscriptionStatus,
    Payment, PaymentStatus, OrganizationTrialOverride,
    SignupTrialPolicy,
)
from app.schemas.response import APIResponse, PaginatedResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
AdminUser = Annotated[User, Depends(get_current_active_admin)]


def _require_super_admin(admin: User) -> None:
    role = admin.role.value if hasattr(admin.role, "value") else str(admin.role)
    if role != "super_admin":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="슈퍼관리자 전용 기능입니다.")


# ── Response schemas ──────────────────────────────────────────────────────────

class TenantListItem(BaseModel):
    id: str
    name: str
    plan: str
    users_count: int
    projects_count: int
    created_at: str
    billing_amount: int
    status: str  # "active" | "inactive"


class TenantUserItem(BaseModel):
    id: str
    name: str
    phone: str
    email: str
    role: str
    last_login_at: Optional[str] = None


class PaymentItem(BaseModel):
    id: str
    date: str
    amount: int
    status: str  # "paid" | "failed"


class ProjectStats(BaseModel):
    draft: int
    in_progress: int
    completed: int
    total: int


class TenantDetail(BaseModel):
    id: str
    name: str
    business_number: Optional[str]
    representative: Optional[str]
    rep_phone: Optional[str]
    rep_email: Optional[str]
    contact_name: Optional[str]
    contact_phone: Optional[str]
    contact_position: Optional[str]
    plan: str
    users_count: int
    projects_count: int
    created_at: str
    subscription_start_date: str
    subscription_end_date: str
    is_custom_trial: bool
    billing_amount: int
    days_remaining: int
    is_active: bool
    users: List[TenantUserItem]
    payment_history: List[PaymentItem]
    project_stats: ProjectStats
    trial_override_enabled: Optional[bool]
    trial_override_months: Optional[int]
    trial_override_reason: Optional[str]
    effective_trial_enabled: bool
    effective_trial_months: int
    trial_source: Optional[str]


# ── Request schemas ───────────────────────────────────────────────────────────

class TenantCreateRequest(BaseModel):
    name: str
    business_number: Optional[str] = None
    representative: Optional[str] = None
    rep_phone: Optional[str] = None
    rep_email: Optional[str] = None
    plan: str = "none"
    subscription_end_date: Optional[str] = None


class TenantUpdateRequest(BaseModel):
    name: Optional[str] = None
    business_number: Optional[str] = None
    representative: Optional[str] = None
    rep_phone: Optional[str] = None
    rep_email: Optional[str] = None
    contact_name: Optional[str] = None
    contact_phone: Optional[str] = None
    contact_position: Optional[str] = None


class TenantActiveRequest(BaseModel):
    is_active: bool


class TenantPlanRequest(BaseModel):
    plan: str
    subscription_end_date: Optional[str] = None
    billing_amount: Optional[int] = None


class TrialPolicyRequest(BaseModel):
    trial_enabled: bool
    trial_months: int
    reason: Optional[str] = None


# ── Helpers ───────────────────────────────────────────────────────────────────

PLAN_PRICES = {"basic": 588000, "pro": 1188000, "trial": 0, "none": 0}


async def _get_org_or_404(org_id: str, db: AsyncSession) -> Organization:
    try:
        org_id_int = int(org_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="고객사를 찾을 수 없어요.")
    org = await db.get(Organization, org_id_int)
    if not org:
        raise HTTPException(status_code=404, detail="고객사를 찾을 수 없어요.")
    return org


async def _get_subscription(org_id: int, db: AsyncSession) -> Optional[Subscription]:
    result = await db.execute(
        select(Subscription).where(Subscription.organization_id == org_id)
    )
    return result.scalar_one_or_none()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("", response_model=PaginatedResponse[TenantListItem])
async def list_tenants(
    db: DBSession,
    admin: AdminUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=10, ge=1, le=100),
    search: Optional[str] = None,
    plan: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    _require_super_admin(admin)

    query = select(Organization)
    if search:
        query = query.where(Organization.name.ilike(f"%{search}%"))
    if status_filter == "active":
        query = query.where(Organization.is_active == True)  # noqa: E712
    elif status_filter == "inactive":
        query = query.where(Organization.is_active == False)  # noqa: E712

    # Filter by plan requires join with Subscription
    if plan and plan != "none":
        valid_values = [p.value for p in SubscriptionPlan]
        sub_plan = SubscriptionPlan(plan) if plan in valid_values else None
        if sub_plan:
            sub_ids = (await db.execute(
                select(Subscription.organization_id).where(Subscription.plan == sub_plan)
            )).scalars().all()
            query = query.where(Organization.id.in_(sub_ids))
    elif plan == "none":
        subbed_ids = (await db.execute(select(Subscription.organization_id))).scalars().all()
        query = query.where(Organization.id.not_in(subbed_ids))

    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(Organization.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    orgs = (await db.execute(query)).scalars().all()

    # Fetch subscriptions for these orgs
    org_ids = [o.id for o in orgs]
    subs_map: dict[int, Subscription] = {}
    if org_ids:
        subs_result = await db.execute(
            select(Subscription).where(Subscription.organization_id.in_(org_ids))
        )
        subs_map = {s.organization_id: s for s in subs_result.scalars().all()}

    # Fetch user counts
    user_counts: dict[int, int] = {}
    if org_ids:
        user_counts_result = await db.execute(
            select(User.organization_id, func.count(User.id))
            .where(User.organization_id.in_(org_ids))
            .group_by(User.organization_id)
        )
        user_counts = {row[0]: row[1] for row in user_counts_result.all()}

    items = []
    for org in orgs:
        sub = subs_map.get(org.id)
        plan_val = sub.plan.value if sub else "none"
        billing_amount = PLAN_PRICES.get(plan_val, 0)
        users_count = user_counts.get(org.id, 0)
        items.append(TenantListItem(
            id=str(org.id),
            name=org.name,
            plan=plan_val,
            users_count=users_count,
            projects_count=0,
            created_at=org.created_at.isoformat(),
            billing_amount=billing_amount,
            status="active" if org.is_active else "inactive",
        ))

    return PaginatedResponse.create(items=items, page=page, per_page=per_page, total=total)


@router.post("", response_model=APIResponse[TenantListItem], status_code=201)
async def create_tenant(
    body: TenantCreateRequest,
    db: DBSession,
    admin: AdminUser,
):
    _require_super_admin(admin)

    org = Organization(
        name=body.name,
        business_number=body.business_number,
        rep_name=body.representative,
        rep_phone=body.rep_phone,
        rep_email=body.rep_email,
        is_active=True,
    )
    db.add(org)
    await db.flush()  # get org.id

    if body.plan and body.plan != "none":
        try:
            sub_plan = SubscriptionPlan(body.plan)
        except ValueError:
            sub_plan = SubscriptionPlan.TRIAL
        now = datetime.utcnow()
        expires_at = (
            datetime.fromisoformat(body.subscription_end_date)
            if body.subscription_end_date
            else datetime(now.year + 1, now.month, now.day)
        )
        sub = Subscription(
            organization_id=org.id,
            plan=sub_plan,
            status=SubscriptionStatus.ACTIVE,
            started_at=now,
            expires_at=expires_at,
        )
        db.add(sub)

    await db.commit()
    await db.refresh(org)

    return APIResponse(
        success=True,
        data=TenantListItem(
            id=str(org.id),
            name=org.name,
            plan=body.plan or "none",
            users_count=0,
            projects_count=0,
            created_at=org.created_at.isoformat(),
            billing_amount=PLAN_PRICES.get(body.plan or "none", 0),
            status="active",
        ),
    )


@router.get("/{tenant_id}", response_model=APIResponse[TenantDetail])
async def get_tenant(
    tenant_id: str,
    db: DBSession,
    admin: AdminUser,
):
    _require_super_admin(admin)
    org = await _get_org_or_404(tenant_id, db)
    org_id = org.id

    sub = await _get_subscription(org_id, db)

    # Users (non-deleted)
    users_result = await db.execute(
        select(User).where(User.organization_id == org_id, User.deleted_at == None)  # noqa: E711
    )
    users = users_result.scalars().all()

    # Payments
    payments_result = await db.execute(
        select(Payment)
        .where(Payment.organization_id == org_id)
        .order_by(Payment.created_at.desc())
    )
    payments = payments_result.scalars().all()

    # Trial override
    override_result = await db.execute(
        select(OrganizationTrialOverride).where(OrganizationTrialOverride.organization_id == org_id)
    )
    override = override_result.scalar_one_or_none()

    # Global trial policy (latest)
    policy_result = await db.execute(
        select(SignupTrialPolicy).order_by(SignupTrialPolicy.created_at.desc())
    )
    policy = policy_result.scalars().first()

    now = datetime.utcnow()
    plan_val = sub.plan.value if sub else "none"
    expires_at = sub.expires_at if sub else now
    days_remaining = max(0, (expires_at - now).days) if sub else 0
    billing_amount = PLAN_PRICES.get(plan_val, 0)

    effective_enabled = (
        override.trial_enabled if override else (policy.default_trial_enabled if policy else False)
    )
    effective_months = (
        override.trial_months if override else (policy.default_trial_months if policy else 0)
    )
    trial_source: Optional[str] = None
    if plan_val == "trial":
        trial_source = "override" if override else ("default" if policy else None)

    user_items = [
        TenantUserItem(
            id=str(u.id),
            name=u.name or "",
            phone=u.phone or "",
            email=u.email or "",
            role=u.role.value if hasattr(u.role, "value") else str(u.role),
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
        )
        for u in users
    ]

    payment_items = [
        PaymentItem(
            id=str(p.id),
            date=(p.paid_at or p.created_at).strftime("%Y-%m-%d"),
            amount=int(p.amount),
            status="paid" if p.status == PaymentStatus.PAID else "failed",
        )
        for p in payments
        if p.status in (PaymentStatus.PAID, PaymentStatus.FAILED)
    ]

    detail = TenantDetail(
        id=str(org.id),
        name=org.name,
        business_number=org.business_number,
        representative=org.rep_name,
        rep_phone=org.rep_phone,
        rep_email=org.rep_email,
        contact_name=org.contact_name,
        contact_phone=org.contact_phone,
        contact_position=org.contact_position,
        plan=plan_val,
        users_count=len(users),
        projects_count=0,
        created_at=org.created_at.isoformat(),
        subscription_start_date=(sub.started_at.isoformat() if sub else now.isoformat()),
        subscription_end_date=(sub.expires_at.isoformat() if sub else ""),
        is_custom_trial=bool(override and override.trial_enabled),
        billing_amount=billing_amount,
        days_remaining=days_remaining,
        is_active=org.is_active,
        users=user_items,
        payment_history=payment_items,
        project_stats=ProjectStats(draft=0, in_progress=0, completed=0, total=0),
        trial_override_enabled=override.trial_enabled if override else None,
        trial_override_months=override.trial_months if override else None,
        trial_override_reason=override.reason if override else None,
        effective_trial_enabled=effective_enabled,
        effective_trial_months=effective_months,
        trial_source=trial_source,
    )
    return APIResponse(success=True, data=detail)


@router.patch("/{tenant_id}", response_model=APIResponse[dict])
async def update_tenant(
    tenant_id: str,
    body: TenantUpdateRequest,
    db: DBSession,
    admin: AdminUser,
):
    _require_super_admin(admin)
    org = await _get_org_or_404(tenant_id, db)

    if body.name is not None:
        org.name = body.name
    if body.business_number is not None:
        org.business_number = body.business_number
    if body.representative is not None:
        org.rep_name = body.representative
    if body.rep_phone is not None:
        org.rep_phone = body.rep_phone
    if body.rep_email is not None:
        org.rep_email = body.rep_email
    if body.contact_name is not None:
        org.contact_name = body.contact_name
    if body.contact_phone is not None:
        org.contact_phone = body.contact_phone
    if body.contact_position is not None:
        org.contact_position = body.contact_position
    org.updated_at = datetime.utcnow()

    db.add(org)
    await db.commit()
    return APIResponse(success=True, data={"id": str(org.id)})


@router.patch("/{tenant_id}/active", response_model=APIResponse[dict])
async def set_tenant_active(
    tenant_id: str,
    body: TenantActiveRequest,
    db: DBSession,
    admin: AdminUser,
):
    _require_super_admin(admin)
    org = await _get_org_or_404(tenant_id, db)
    org.is_active = body.is_active
    org.updated_at = datetime.utcnow()
    db.add(org)
    await db.commit()
    return APIResponse(success=True, data={"id": str(org.id), "is_active": org.is_active})


@router.patch("/{tenant_id}/plan", response_model=APIResponse[dict])
async def change_tenant_plan(
    tenant_id: str,
    body: TenantPlanRequest,
    db: DBSession,
    admin: AdminUser,
):
    _require_super_admin(admin)
    org = await _get_org_or_404(tenant_id, db)
    org_id = org.id

    sub = await _get_subscription(org_id, db)

    if body.plan == "none":
        if sub:
            await db.delete(sub)
    else:
        try:
            sub_plan = SubscriptionPlan(body.plan)
        except ValueError:
            raise HTTPException(status_code=400, detail="유효하지 않은 요금제입니다.")
        now = datetime.utcnow()
        expires_at = (
            datetime.fromisoformat(body.subscription_end_date)
            if body.subscription_end_date
            else datetime(now.year + 1, now.month, now.day)
        )
        if sub:
            sub.plan = sub_plan
            sub.expires_at = expires_at
            sub.updated_at = datetime.utcnow()
            db.add(sub)
        else:
            new_sub = Subscription(
                organization_id=org_id,
                plan=sub_plan,
                status=SubscriptionStatus.ACTIVE,
                started_at=datetime.utcnow(),
                expires_at=expires_at,
            )
            db.add(new_sub)

    await db.commit()
    return APIResponse(success=True, data={"id": str(org.id)})


@router.delete("/{tenant_id}", response_model=APIResponse[dict])
async def delete_tenant(
    tenant_id: str,
    db: DBSession,
    admin: AdminUser,
):
    _require_super_admin(admin)
    org = await _get_org_or_404(tenant_id, db)

    # Deactivate all users in this org before deleting
    users_result = await db.execute(
        select(User).where(User.organization_id == org.id)
    )
    for u in users_result.scalars().all():
        u.is_active = False
        db.add(u)

    await db.delete(org)
    await db.commit()
    return APIResponse(success=True, data={"id": tenant_id})


@router.post("/{tenant_id}/trial-policy", response_model=APIResponse[dict])
async def set_trial_policy(
    tenant_id: str,
    body: TrialPolicyRequest,
    db: DBSession,
    admin: AdminUser,
):
    _require_super_admin(admin)
    org = await _get_org_or_404(tenant_id, db)

    override_result = await db.execute(
        select(OrganizationTrialOverride).where(OrganizationTrialOverride.organization_id == org.id)
    )
    override = override_result.scalar_one_or_none()

    if override:
        override.trial_enabled = body.trial_enabled
        override.trial_months = body.trial_months if body.trial_enabled else 0
        override.reason = body.reason
        override.updated_by_user_id = admin.id
        override.updated_at = datetime.utcnow()
        db.add(override)
    else:
        override = OrganizationTrialOverride(
            organization_id=org.id,
            trial_enabled=body.trial_enabled,
            trial_months=body.trial_months if body.trial_enabled else 0,
            reason=body.reason,
            updated_by_user_id=admin.id,
        )
        db.add(override)

    await db.commit()
    return APIResponse(success=True, data={"id": str(org.id), "trial_enabled": body.trial_enabled})
