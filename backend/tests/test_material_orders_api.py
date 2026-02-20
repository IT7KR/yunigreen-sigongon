"""Material order API tests for status transitions and role permissions."""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from types import SimpleNamespace

import pytest
from httpx import AsyncClient

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.main import app
from app.models.operations import ProjectAccessPolicy
from app.models.pricebook import (
    CatalogItem,
    CatalogItemPrice,
    ItemType,
    Pricebook,
    PricebookRevision,
    RevisionStatus,
)
from app.models.project import Project
from app.models.user import Organization, User, UserRole


@pytest.fixture
async def material_order_context(test_db):
    org = Organization(name="자재발주조직", business_number="111-22-33333")
    test_db.add(org)
    await test_db.flush()

    company_admin = User(
        username="material_company_admin",
        name="대표",
        role=UserRole.COMPANY_ADMIN,
        organization_id=org.id,
        phone="010-1000-0001",
        password_hash="hash",
        is_active=True,
    )
    site_manager = User(
        username="material_site_manager",
        name="현장소장",
        role=UserRole.SITE_MANAGER,
        organization_id=org.id,
        phone="010-1000-0002",
        password_hash="hash",
        is_active=True,
    )
    test_db.add(company_admin)
    test_db.add(site_manager)
    await test_db.flush()

    pricebook = Pricebook(name="테스트 단가집", description="자재발주 테스트")
    test_db.add(pricebook)
    await test_db.flush()

    revision = PricebookRevision(
        pricebook_id=pricebook.id,
        version_label="2026-H1",
        effective_from=date(2026, 1, 1),
        status=RevisionStatus.ACTIVE,
        created_by=company_admin.id,
    )
    test_db.add(revision)
    await test_db.flush()

    project = Project(
        name="자재발주 테스트 현장",
        address="서울시 강남구",
        organization_id=org.id,
        created_by=company_admin.id,
        pricebook_revision_id=revision.id,
    )
    test_db.add(project)
    await test_db.flush()

    test_db.add(
        ProjectAccessPolicy(
            project_id=project.id,
            manager_ids=[site_manager.id],
        )
    )

    catalog_item = CatalogItem(
        item_code="MAT-001",
        item_type=ItemType.MATERIAL,
        name_ko="우레탄 방수재",
        base_unit="m2",
        is_active=True,
    )
    test_db.add(catalog_item)
    await test_db.flush()

    catalog_price = CatalogItemPrice(
        pricebook_revision_id=revision.id,
        catalog_item_id=catalog_item.id,
        unit_price=Decimal("15000"),
    )
    test_db.add(catalog_price)
    await test_db.commit()

    def _auth_user_for(user: User) -> SimpleNamespace:
        return SimpleNamespace(
            id=user.id,
            role=user.role,
            organization_id=user.organization_id,
        )

    current_user_holder: dict[str, SimpleNamespace] = {
        "user": _auth_user_for(company_admin)
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
        "set_user": lambda user: current_user_holder.__setitem__(
            "user", _auth_user_for(user)
        ),
        "company_admin": company_admin,
        "site_manager": site_manager,
        "project": project,
        "revision": revision,
        "catalog_item": catalog_item,
    }

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_async_db, None)


async def _create_order(
    async_client: AsyncClient,
    *,
    project_id: int,
    catalog_item_id: int,
    quantity: int = 2,
):
    response = await async_client.post(
        f"/api/v1/projects/{project_id}/material-orders",
        json={
            "items": [
                {
                    "catalog_item_id": catalog_item_id,
                    "quantity": quantity,
                }
            ]
        },
    )
    assert response.status_code == 201
    return response.json()["data"]


@pytest.mark.asyncio
async def test_material_order_lifecycle_sets_expected_fields(
    async_client: AsyncClient,
    material_order_context,
):
    project = material_order_context["project"]
    catalog_item = material_order_context["catalog_item"]

    created = await _create_order(
        async_client,
        project_id=project.id,
        catalog_item_id=catalog_item.id,
    )
    order_id = created["id"]
    assert created["status"] == "draft"
    assert created["total_amount"] == 30000

    requested = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "requested"},
    )
    assert requested.status_code == 200
    assert requested.json()["data"]["status"] == "requested"

    invoice_received = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={
            "status": "invoice_received",
            "invoice_number": "INV-2026-0001",
            "invoice_amount": 30000,
            "invoice_file_url": "https://files.example.com/inv-2026-0001.pdf",
        },
    )
    assert invoice_received.status_code == 200
    assert invoice_received.json()["data"]["status"] == "invoice_received"

    payment_completed = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "payment_completed"},
    )
    assert payment_completed.status_code == 200

    shipped = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "shipped"},
    )
    assert shipped.status_code == 200

    delivered = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "delivered"},
    )
    assert delivered.status_code == 200

    closed = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "closed"},
    )
    assert closed.status_code == 200
    assert closed.json()["data"]["status"] == "closed"

    detail = await async_client.get(f"/api/v1/material-orders/{order_id}")
    assert detail.status_code == 200
    payload = detail.json()["data"]
    assert payload["status"] == "closed"
    assert payload["invoice_number"] == "INV-2026-0001"
    assert payload["invoice_amount"] == 30000
    assert payload["invoice_file_url"] == "https://files.example.com/inv-2026-0001.pdf"
    assert payload["requested_at"] is not None
    assert payload["confirmed_at"] is not None
    assert payload["payment_at"] is not None
    assert payload["shipped_at"] is not None
    assert payload["delivered_at"] is not None
    assert payload["received_at"] is not None
    assert payload["received_by_user_id"] is not None
    assert payload["closed_at"] is not None


@pytest.mark.asyncio
async def test_site_manager_cannot_update_finance_states(
    async_client: AsyncClient,
    material_order_context,
):
    set_user = material_order_context["set_user"]
    site_manager = material_order_context["site_manager"]
    project = material_order_context["project"]
    catalog_item = material_order_context["catalog_item"]

    created = await _create_order(
        async_client,
        project_id=project.id,
        catalog_item_id=catalog_item.id,
    )
    order_id = created["id"]

    set_user(site_manager)
    requested = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "requested"},
    )
    assert requested.status_code == 200

    forbidden = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "invoice_received"},
    )
    assert forbidden.status_code == 403


@pytest.mark.asyncio
async def test_site_manager_can_mark_delivered_but_not_closed(
    async_client: AsyncClient,
    material_order_context,
):
    set_user = material_order_context["set_user"]
    site_manager = material_order_context["site_manager"]
    project = material_order_context["project"]
    catalog_item = material_order_context["catalog_item"]

    created = await _create_order(
        async_client,
        project_id=project.id,
        catalog_item_id=catalog_item.id,
    )
    order_id = created["id"]

    await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "requested"},
    )
    await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "invoice_received"},
    )
    await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "payment_completed"},
    )
    await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "shipped"},
    )

    set_user(site_manager)
    delivered = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "delivered"},
    )
    assert delivered.status_code == 200
    assert delivered.json()["data"]["status"] == "delivered"

    closed = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "closed"},
    )
    assert closed.status_code == 403


@pytest.mark.asyncio
async def test_cancel_requires_reason(
    async_client: AsyncClient,
    material_order_context,
):
    project = material_order_context["project"]
    catalog_item = material_order_context["catalog_item"]

    created = await _create_order(
        async_client,
        project_id=project.id,
        catalog_item_id=catalog_item.id,
    )
    order_id = created["id"]

    without_reason = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "cancelled"},
    )
    assert without_reason.status_code == 400

    with_reason = await async_client.patch(
        f"/api/v1/material-orders/{order_id}",
        json={"status": "cancelled", "reason": "현장 일정 변경"},
    )
    assert with_reason.status_code == 200
    assert with_reason.json()["data"]["status"] == "cancelled"

    detail = await async_client.get(f"/api/v1/material-orders/{order_id}")
    assert detail.status_code == 200
    assert "[취소사유] 현장 일정 변경" in (detail.json()["data"]["notes"] or "")


@pytest.mark.asyncio
async def test_mobile_summary_amount_is_hidden_for_site_manager(
    async_client: AsyncClient,
    material_order_context,
):
    set_user = material_order_context["set_user"]
    company_admin = material_order_context["company_admin"]
    site_manager = material_order_context["site_manager"]
    project = material_order_context["project"]
    catalog_item = material_order_context["catalog_item"]

    await _create_order(
        async_client,
        project_id=project.id,
        catalog_item_id=catalog_item.id,
    )

    set_user(site_manager)
    mobile_for_site_manager = await async_client.get(
        f"/api/v1/projects/{project.id}/material-orders/mobile"
    )
    assert mobile_for_site_manager.status_code == 200
    site_manager_rows = mobile_for_site_manager.json()["data"]
    assert len(site_manager_rows) == 1
    assert site_manager_rows[0]["summary_amount"] is None

    set_user(company_admin)
    mobile_for_admin = await async_client.get(
        f"/api/v1/projects/{project.id}/material-orders/mobile"
    )
    assert mobile_for_admin.status_code == 200
    admin_rows = mobile_for_admin.json()["data"]
    assert len(admin_rows) == 1
    assert admin_rows[0]["summary_amount"] == 30000


@pytest.mark.asyncio
async def test_site_manager_cannot_override_catalog_price(
    async_client: AsyncClient,
    material_order_context,
):
    set_user = material_order_context["set_user"]
    site_manager = material_order_context["site_manager"]
    project = material_order_context["project"]
    revision = material_order_context["revision"]
    catalog_item = material_order_context["catalog_item"]

    set_user(site_manager)
    response = await async_client.post(
        f"/api/v1/projects/{project.id}/material-orders",
        json={
            "items": [
                {
                    "catalog_item_id": catalog_item.id,
                    "pricebook_revision_id": revision.id,
                    "quantity": 1,
                    "unit_price": 12000,
                    "override_reason": "긴급 대체 단가",
                }
            ]
        },
    )
    assert response.status_code == 403
