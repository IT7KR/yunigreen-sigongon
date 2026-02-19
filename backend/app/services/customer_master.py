"""Customer master service helpers."""
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.customer import CustomerMaster


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """Normalize phone number to digits only."""
    if not phone:
        return None
    digits = "".join(ch for ch in phone if ch.isdigit())
    return digits or None


def normalize_customer_name(name: str) -> str:
    """Normalize customer name for consistent lookups."""
    return " ".join(name.strip().split())


async def get_customer_master_for_org(
    db: AsyncSession,
    organization_id: int,
    customer_id: int,
    include_inactive: bool = True,
) -> Optional[CustomerMaster]:
    """Load customer master by id with organization scope."""
    query = select(CustomerMaster).where(
        CustomerMaster.id == customer_id,
        CustomerMaster.organization_id == organization_id,
    )
    if not include_inactive:
        query = query.where(CustomerMaster.is_active == True)  # noqa: E712

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def find_customer_master_by_identity(
    db: AsyncSession,
    organization_id: int,
    name: str,
    phone: Optional[str] = None,
    include_inactive: bool = True,
) -> Optional[CustomerMaster]:
    """Find customer master by normalized identity key."""
    normalized_name = normalize_customer_name(name)
    normalized_phone = normalize_phone(phone)

    query = select(CustomerMaster).where(
        CustomerMaster.organization_id == organization_id,
        CustomerMaster.name == normalized_name,
        CustomerMaster.normalized_phone == normalized_phone,
    )
    if not include_inactive:
        query = query.where(CustomerMaster.is_active == True)  # noqa: E712

    result = await db.execute(query)
    return result.scalar_one_or_none()


async def upsert_customer_master(
    db: AsyncSession,
    organization_id: int,
    name: str,
    phone: Optional[str] = None,
    memo: Optional[str] = None,
    actor_id: Optional[int] = None,
) -> CustomerMaster:
    """Upsert customer master by name + normalized phone."""
    normalized_name = normalize_customer_name(name)
    normalized_phone = normalize_phone(phone)

    existing = await find_customer_master_by_identity(
        db=db,
        organization_id=organization_id,
        name=normalized_name,
        phone=phone,
        include_inactive=True,
    )
    if existing:
        changed = False
        if existing.phone != phone:
            existing.phone = phone
            changed = True
        if existing.normalized_phone != normalized_phone:
            existing.normalized_phone = normalized_phone
            changed = True
        if memo is not None and existing.memo != memo:
            existing.memo = memo
            changed = True
        if not existing.is_active:
            existing.is_active = True
            changed = True

        if changed:
            existing.updated_at = datetime.utcnow()
            existing.updated_by = actor_id
            await db.flush()
        return existing

    customer = CustomerMaster(
        organization_id=organization_id,
        name=normalized_name,
        phone=phone,
        normalized_phone=normalized_phone,
        memo=memo,
        is_active=True,
        created_by=actor_id,
        updated_by=actor_id,
    )
    db.add(customer)
    await db.flush()
    return customer
