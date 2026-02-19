"""Warranty A/S request API tests."""

from __future__ import annotations

from datetime import datetime, timedelta

import pytest
from httpx import AsyncClient

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.main import app
from app.models.project import ASRequest, ASRequestStatus, Project, ProjectStatus
from app.models.user import Organization, User, UserRole


@pytest.fixture
async def warranty_context(test_db):
    org = Organization(name="하자보증조직", business_number="123-45-67890")
    test_db.add(org)
    await test_db.flush()

    company_admin = User(
        username="warranty_admin",
        name="보증담당자",
        role=UserRole.COMPANY_ADMIN,
        organization_id=org.id,
        password_hash="hash",
        is_active=True,
    )
    test_db.add(company_admin)
    await test_db.flush()

    project = Project(
        name="하자보증 테스트 현장",
        address="서울시 중구",
        organization_id=org.id,
        status=ProjectStatus.WARRANTY,
        created_by=company_admin.id,
        completed_at=datetime.utcnow() - timedelta(days=14),
        warranty_expires_at=datetime.utcnow() + timedelta(days=180),
    )
    test_db.add(project)
    await test_db.flush()

    as_request = ASRequest(
        project_id=project.id,
        description="준공 후 우천 시 누수 재발생",
        status=ASRequestStatus.PENDING,
        created_by=company_admin.id,
    )
    test_db.add(as_request)
    await test_db.commit()

    current_user_holder: dict[str, User] = {"user": company_admin}

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
        "set_user": lambda user: current_user_holder.__setitem__("user", user),
        "project": project,
        "as_request": as_request,
        "company_admin": company_admin,
    }

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_async_db, None)


@pytest.mark.asyncio
async def test_update_as_request_status_to_resolved(async_client: AsyncClient, warranty_context):
    project = warranty_context["project"]
    as_request = warranty_context["as_request"]

    response = await async_client.patch(
        f"/api/v1/projects/{project.id}/warranty/as-requests/{as_request.id}",
        json={"status": "resolved"},
    )
    assert response.status_code == 200
    payload = response.json()
    assert payload["success"] is True
    assert payload["data"]["status"] == "resolved"
    assert payload["data"]["resolved_at"] is not None

    warranty_response = await async_client.get(f"/api/v1/projects/{project.id}/warranty")
    assert warranty_response.status_code == 200
    warranty_payload = warranty_response.json()
    assert warranty_payload["success"] is True
    assert warranty_payload["data"]["as_requests"][0]["status"] == "resolved"


@pytest.mark.asyncio
async def test_cancelled_request_cannot_move_directly_to_resolved(
    async_client: AsyncClient,
    warranty_context,
):
    project = warranty_context["project"]
    as_request = warranty_context["as_request"]

    cancel_response = await async_client.patch(
        f"/api/v1/projects/{project.id}/warranty/as-requests/{as_request.id}",
        json={"status": "cancelled"},
    )
    assert cancel_response.status_code == 200

    invalid_response = await async_client.patch(
        f"/api/v1/projects/{project.id}/warranty/as-requests/{as_request.id}",
        json={"status": "resolved"},
    )
    assert invalid_response.status_code == 400
    assert "변경할 수 없어요" in invalid_response.json()["detail"]
