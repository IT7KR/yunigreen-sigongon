"""Customer master service helpers."""
from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.customer import CustomerKind, CustomerMaster


def normalize_optional_text(value: Optional[str]) -> Optional[str]:
    """Normalize optional text by trimming whitespace."""
    if value is None:
        return None
    normalized = " ".join(value.strip().split())
    return normalized or None


def normalize_phone(phone: Optional[str]) -> Optional[str]:
    """Normalize phone number to digits only."""
    if not phone:
        return None
    digits = "".join(ch for ch in phone if ch.isdigit())
    return digits or None


def resolve_customer_phone(
    phone: Optional[str] = None,
    representative_phone: Optional[str] = None,
    contact_phone: Optional[str] = None,
) -> Optional[str]:
    """Choose a canonical phone for identity and legacy compatibility."""
    for candidate in (phone, representative_phone, contact_phone):
        normalized = normalize_optional_text(candidate)
        if normalized:
            return normalized
    return None


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
    representative_phone: Optional[str] = None,
    contact_phone: Optional[str] = None,
    include_inactive: bool = True,
) -> Optional[CustomerMaster]:
    """Find customer master by normalized identity key."""
    normalized_name = normalize_customer_name(name)
    normalized_phone = normalize_phone(
        resolve_customer_phone(
            phone=phone,
            representative_phone=representative_phone,
            contact_phone=contact_phone,
        )
    )

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
    customer_kind: Optional[CustomerKind] = None,
    representative_name: Optional[str] = None,
    representative_phone: Optional[str] = None,
    business_number: Optional[str] = None,
    contact_name: Optional[str] = None,
    contact_phone: Optional[str] = None,
    license_type: Optional[str] = None,
    is_women_owned: Optional[bool] = None,
) -> CustomerMaster:
    """Upsert customer master by name + normalized phone."""
    normalized_name = normalize_customer_name(name)
    resolved_phone = resolve_customer_phone(
        phone=phone,
        representative_phone=representative_phone,
        contact_phone=contact_phone,
    )
    normalized_phone = normalize_phone(resolved_phone)

    normalized_representative_name = normalize_optional_text(representative_name)
    normalized_representative_phone = normalize_optional_text(representative_phone)
    normalized_business_number = normalize_optional_text(business_number)
    normalized_contact_name = normalize_optional_text(contact_name)
    normalized_contact_phone = normalize_optional_text(contact_phone)
    normalized_license_type = normalize_optional_text(license_type)
    normalized_memo = normalize_optional_text(memo)

    existing = await find_customer_master_by_identity(
        db=db,
        organization_id=organization_id,
        name=normalized_name,
        phone=resolved_phone,
        include_inactive=True,
    )
    if existing:
        changed = False
        if existing.phone != resolved_phone:
            existing.phone = resolved_phone
            changed = True
        if existing.normalized_phone != normalized_phone:
            existing.normalized_phone = normalized_phone
            changed = True
        if customer_kind is not None and existing.customer_kind != customer_kind:
            existing.customer_kind = customer_kind
            changed = True
        if representative_name is not None and existing.representative_name != normalized_representative_name:
            existing.representative_name = normalized_representative_name
            changed = True
        if representative_phone is not None and existing.representative_phone != normalized_representative_phone:
            existing.representative_phone = normalized_representative_phone
            changed = True
        if business_number is not None and existing.business_number != normalized_business_number:
            existing.business_number = normalized_business_number
            changed = True
        if contact_name is not None and existing.contact_name != normalized_contact_name:
            existing.contact_name = normalized_contact_name
            changed = True
        if contact_phone is not None and existing.contact_phone != normalized_contact_phone:
            existing.contact_phone = normalized_contact_phone
            changed = True
        if license_type is not None and existing.license_type != normalized_license_type:
            existing.license_type = normalized_license_type
            changed = True
        if is_women_owned is not None and existing.is_women_owned != is_women_owned:
            existing.is_women_owned = is_women_owned
            changed = True
        if memo is not None and existing.memo != normalized_memo:
            existing.memo = normalized_memo
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
        customer_kind=customer_kind or CustomerKind.COMPANY,
        representative_name=normalized_representative_name,
        representative_phone=normalized_representative_phone,
        business_number=normalized_business_number,
        contact_name=normalized_contact_name,
        contact_phone=normalized_contact_phone,
        license_type=normalized_license_type,
        is_women_owned=is_women_owned if is_women_owned is not None else False,
        phone=resolved_phone,
        normalized_phone=normalized_phone,
        memo=normalized_memo,
        is_active=True,
        created_by=actor_id,
        updated_by=actor_id,
    )
    db.add(customer)
    await db.flush()
    return customer
