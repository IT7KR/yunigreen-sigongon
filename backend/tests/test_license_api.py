"""License API tests for CRUD, file upload, and summary sync."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.main import app
from app.models.customer import CustomerMaster
from app.models.operations import Partner
from app.models.user import Organization, User, UserRole


@pytest.fixture
async def license_api_context(test_db):
    org = Organization(name="유니그린개발")
    test_db.add(org)
    await test_db.flush()

    current_user = User(
        username="license_admin",
        name="관리자",
        role=UserRole.COMPANY_ADMIN,
        organization_id=org.id,
        password_hash="test_hash",
        is_active=True,
    )
    test_db.add(current_user)
    await test_db.flush()

    customer = CustomerMaster(
        organization_id=org.id,
        name="발주처 A",
    )
    test_db.add(customer)

    partner = Partner(
        organization_id=org.id,
        name="협력사 A",
        representative_name="홍길동",
        business_number="123-45-67890",
    )
    test_db.add(partner)

    other_org = Organization(name="타사")
    test_db.add(other_org)
    await test_db.flush()
    foreign_customer = CustomerMaster(
        organization_id=other_org.id,
        name="타사 발주처",
    )
    test_db.add(foreign_customer)
    await test_db.commit()

    async def _fake_user():
        return current_user

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
        "org": org,
        "user": current_user,
        "customer": customer,
        "partner": partner,
        "foreign_customer": foreign_customer,
    }

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_async_db, None)


@pytest.mark.asyncio
async def test_customer_license_crud_and_file_upload(async_client: AsyncClient, license_api_context):
    customer = license_api_context["customer"]

    create_response = await async_client.post(
        "/api/v1/licenses",
        json={
            "owner_type": "customer",
            "owner_id": customer.id,
            "license_name": "건축공사업",
            "is_primary": True,
        },
    )
    assert create_response.status_code == 201
    create_payload = create_response.json()["data"]
    license_id = create_payload["id"]

    customer_response = await async_client.get(f"/api/v1/customers/{customer.id}")
    assert customer_response.status_code == 200
    assert customer_response.json()["data"]["license_type"] == "건축공사업"

    upload_response = await async_client.post(
        f"/api/v1/licenses/{license_id}/files",
        files={"file": ("license.pdf", b"%PDF-1.4 mock", "application/pdf")},
        data={"page_type": "front"},
    )
    assert upload_response.status_code == 200
    uploaded_file = upload_response.json()["data"]
    assert uploaded_file["original_filename"] == "license.pdf"

    list_response = await async_client.get(
        "/api/v1/licenses",
        params={"owner_type": "customer", "owner_id": customer.id},
    )
    assert list_response.status_code == 200
    records = list_response.json()["data"]
    assert len(records) == 1
    assert len(records[0]["files"]) == 1
    assert records[0]["files"][0]["page_type"] == "front"

    delete_response = await async_client.delete(f"/api/v1/licenses/{license_id}")
    assert delete_response.status_code == 200
    assert delete_response.json()["data"]["deleted"] is True

    customer_after_delete = await async_client.get(f"/api/v1/customers/{customer.id}")
    assert customer_after_delete.status_code == 200
    assert customer_after_delete.json()["data"]["license_type"] is None


@pytest.mark.asyncio
async def test_partner_license_sync_and_cross_org_guard(async_client: AsyncClient, license_api_context):
    partner = license_api_context["partner"]
    foreign_customer = license_api_context["foreign_customer"]

    partner_license_response = await async_client.post(
        "/api/v1/licenses",
        json={
            "owner_type": "partner",
            "owner_id": partner.id,
            "license_name": "실내건축공사업",
            "is_primary": True,
        },
    )
    assert partner_license_response.status_code == 201

    partners_response = await async_client.get("/api/v1/partners")
    assert partners_response.status_code == 200
    partners = partners_response.json()["data"]
    target = next(item for item in partners if item["id"] == str(partner.id))
    assert target["license_type"] == "실내건축공사업"
    assert target["license"] == "실내건축공사업"

    cross_org_response = await async_client.post(
        "/api/v1/licenses",
        json={
            "owner_type": "customer",
            "owner_id": foreign_customer.id,
            "license_name": "타사면허",
        },
    )
    assert cross_org_response.status_code == 404
