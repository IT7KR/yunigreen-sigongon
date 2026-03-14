"""Signup trial policy helpers."""

from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.billing import OrganizationTrialOverride, SignupTrialPolicy

DEFAULT_TRIAL_MONTHS = 1
MAX_TRIAL_MONTHS = 24
MAX_TRIAL_DAYS = 365


@dataclass(frozen=True)
class TrialPolicyResolution:
    enabled: bool
    months: int
    source: str
    reason: str | None = None
    unit: str = "months"


def add_days(base: datetime, days: int) -> datetime:
    """Add days to a datetime."""
    if days <= 0:
        return base
    return base + timedelta(days=days)


def add_months(base: datetime, months: int) -> datetime:
    """Add calendar months while preserving the day when possible."""
    if months <= 0:
        return base

    month_index = (base.month - 1) + months
    year = base.year + (month_index // 12)
    month = (month_index % 12) + 1
    day = min(base.day, calendar.monthrange(year, month)[1])
    return base.replace(year=year, month=month, day=day)


def normalize_trial_months(raw_months: int) -> int:
    if raw_months < 0:
        return 0
    return min(raw_months, MAX_TRIAL_MONTHS)


def normalize_trial_duration(raw: int, unit: str) -> int:
    """Normalize trial duration based on unit, clamping to max."""
    if raw < 0:
        return 0
    if unit == "days":
        return min(raw, MAX_TRIAL_DAYS)
    return min(raw, MAX_TRIAL_MONTHS)


def calculate_trial_end(base: datetime, duration: int, unit: str) -> datetime:
    """Calculate trial end date based on unit."""
    if unit == "days":
        return add_days(base, duration)
    return add_months(base, duration)


async def get_or_create_signup_trial_policy(db: AsyncSession) -> SignupTrialPolicy:
    result = await db.execute(select(SignupTrialPolicy).limit(1))
    policy = result.scalar_one_or_none()
    if policy is not None:
        return policy

    policy = SignupTrialPolicy(
        default_trial_enabled=True,
        default_trial_months=DEFAULT_TRIAL_MONTHS,
    )
    db.add(policy)
    await db.flush()
    return policy


async def get_trial_override(
    db: AsyncSession,
    organization_id: int,
) -> OrganizationTrialOverride | None:
    result = await db.execute(
        select(OrganizationTrialOverride).where(
            OrganizationTrialOverride.organization_id == organization_id
        )
    )
    return result.scalar_one_or_none()


async def resolve_trial_policy(
    db: AsyncSession,
    organization_id: int | None = None,
) -> TrialPolicyResolution:
    global_policy = await get_or_create_signup_trial_policy(db)

    if organization_id is not None:
        override = await get_trial_override(db, organization_id)
        if override is not None:
            unit = getattr(override, "trial_unit", "months") or "months"
            months = normalize_trial_duration(override.trial_months, unit)
            enabled = override.trial_enabled and months > 0
            return TrialPolicyResolution(
                enabled=enabled,
                months=months if enabled else 0,
                source="override",
                reason=override.reason,
                unit=unit,
            )

    unit = getattr(global_policy, "default_trial_unit", "months") or "months"
    default_months = normalize_trial_duration(global_policy.default_trial_months, unit)
    enabled = global_policy.default_trial_enabled and default_months > 0
    return TrialPolicyResolution(
        enabled=enabled,
        months=default_months if enabled else 0,
        source="default" if enabled else "none",
        unit=unit,
    )
