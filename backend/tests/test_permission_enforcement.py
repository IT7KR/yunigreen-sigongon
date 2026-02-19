"""Permission enforcement tests for project visibility, invitations, and worker scope."""

from __future__ import annotations

import pytest
from httpx import AsyncClient

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.main import app
from app.models.operations import ProjectAccessPolicy
from app.models.project import Project
from app.models.user import Organization, User, UserRole


@pytest.fixture
async def permission_context(test_db):
    org_a = Organization(name="조직A", business_number="111-11-11111")
    test_db.add(org_a)
    await test_db.flush()

    super_admin = User(
        username="super_admin",
        name="슈퍼관리자",
        role=UserRole.SUPER_ADMIN,
        organization_id=None,
        password_hash="hash",
        is_active=True,
    )
    company_admin = User(
        username="company_admin_a",
        name="대표A",
        role=UserRole.COMPANY_ADMIN,
        organization_id=org_a.id,
        phone="010-1000-0001",
        password_hash="hash",
        is_active=True,
    )
    site_manager_a1 = User(
        username="site_manager_a1",
        name="소장A1",
        role=UserRole.SITE_MANAGER,
        organization_id=org_a.id,
        phone="010-1000-0002",
        password_hash="hash",
        is_active=True,
    )
    site_manager_a2 = User(
        username="site_manager_a2",
        name="소장A2",
        role=UserRole.SITE_MANAGER,
        organization_id=org_a.id,
        phone="010-1000-0003",
        password_hash="hash",
        is_active=True,
    )
    worker_a = User(
        username="worker_a",
        name="근로자A",
        role=UserRole.WORKER,
        organization_id=None,
        phone="010-1000-9001",
        password_hash="hash",
        is_active=True,
    )
    worker_b = User(
        username="worker_b",
        name="근로자B",
        role=UserRole.WORKER,
        organization_id=None,
        phone="010-1000-9002",
        password_hash="hash",
        is_active=True,
    )
    test_db.add(super_admin)
    test_db.add(company_admin)
    test_db.add(site_manager_a1)
    test_db.add(site_manager_a2)
    test_db.add(worker_a)
    test_db.add(worker_b)
    await test_db.flush()

    project_a1 = Project(
        name="A1 현장",
        address="서울",
        organization_id=org_a.id,
        created_by=company_admin.id,
    )
    project_a2 = Project(
        name="A2 현장",
        address="부산",
        organization_id=org_a.id,
        created_by=company_admin.id,
    )
    test_db.add(project_a1)
    test_db.add(project_a2)
    await test_db.flush()

    test_db.add(
        ProjectAccessPolicy(
            project_id=project_a1.id,
            manager_ids=[site_manager_a1.id],
        )
    )
    test_db.add(
        ProjectAccessPolicy(
            project_id=project_a2.id,
            manager_ids=[site_manager_a2.id],
        )
    )
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
        "super_admin": super_admin,
        "company_admin": company_admin,
        "site_manager_a1": site_manager_a1,
        "site_manager_a2": site_manager_a2,
        "worker_a": worker_a,
        "worker_b": worker_b,
        "org_a": org_a,
        "project_a1": project_a1,
        "project_a2": project_a2,
    }

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_async_db, None)


@pytest.mark.asyncio
async def test_site_manager_project_visibility_is_enforced(async_client: AsyncClient, permission_context):
    set_user = permission_context["set_user"]
    site_manager_a1 = permission_context["site_manager_a1"]
    site_manager_a2 = permission_context["site_manager_a2"]
    project_a1 = permission_context["project_a1"]
    project_a2 = permission_context["project_a2"]

    set_user(site_manager_a1)
    list_response = await async_client.get("/api/v1/projects")
    assert list_response.status_code == 200
    items = list_response.json()["items"]
    assert [str(item["id"]) for item in items] == [str(project_a1.id)]

    allowed_response = await async_client.get(f"/api/v1/projects/{project_a1.id}/daily-reports")
    assert allowed_response.status_code == 200

    denied_response = await async_client.get(f"/api/v1/projects/{project_a2.id}/daily-reports")
    assert denied_response.status_code == 403

    set_user(site_manager_a2)
    denied_response_2 = await async_client.get(f"/api/v1/projects/{project_a1.id}")
    assert denied_response_2.status_code == 403


@pytest.mark.asyncio
async def test_invitation_role_guard_is_enforced(async_client: AsyncClient, permission_context):
    set_user = permission_context["set_user"]
    company_admin = permission_context["company_admin"]
    site_manager_a1 = permission_context["site_manager_a1"]
    super_admin = permission_context["super_admin"]
    org_a = permission_context["org_a"]

    set_user(company_admin)
    forbidden_for_company_admin = await async_client.post(
        "/api/v1/invitations",
        json={"phone": "010-9000-0001", "name": "잘못된초대", "role": "company_admin"},
    )
    assert forbidden_for_company_admin.status_code == 403

    allowed_for_company_admin = await async_client.post(
        "/api/v1/invitations",
        json={"phone": "010-9000-0002", "name": "현장소장초대", "role": "site_manager"},
    )
    assert allowed_for_company_admin.status_code == 201

    set_user(site_manager_a1)
    forbidden_for_site_manager = await async_client.post(
        "/api/v1/invitations",
        json={"phone": "010-9000-0003", "name": "권한없음", "role": "site_manager"},
    )
    assert forbidden_for_site_manager.status_code == 403

    set_user(super_admin)
    missing_org_for_super_admin = await async_client.post(
        "/api/v1/invitations",
        json={"phone": "010-9000-0004", "name": "대표초대", "role": "company_admin"},
    )
    assert missing_org_for_super_admin.status_code == 400

    allowed_for_super_admin = await async_client.post(
        "/api/v1/invitations",
        json={
            "phone": "010-9000-0005",
            "name": "대표초대",
            "role": "company_admin",
            "organization_id": str(org_a.id),
        },
    )
    assert allowed_for_super_admin.status_code == 201

    forbidden_target_for_super_admin = await async_client.post(
        "/api/v1/invitations",
        json={
            "phone": "010-9000-0006",
            "name": "잘못된대상",
            "role": "site_manager",
            "organization_id": str(org_a.id),
        },
    )
    assert forbidden_target_for_super_admin.status_code == 403


@pytest.mark.asyncio
async def test_worker_can_access_only_own_worker_endpoints(async_client: AsyncClient, permission_context):
    set_user = permission_context["set_user"]
    worker_a = permission_context["worker_a"]
    worker_b = permission_context["worker_b"]
    company_admin = permission_context["company_admin"]
    project_a1 = permission_context["project_a1"]

    set_user(worker_a)
    own_paystubs = await async_client.get(f"/api/v1/workers/{worker_a.id}/paystubs")
    assert own_paystubs.status_code == 200

    foreign_paystubs = await async_client.get(f"/api/v1/workers/{worker_b.id}/paystubs")
    assert foreign_paystubs.status_code == 403

    worker_project_access = await async_client.get(f"/api/v1/projects/{project_a1.id}/daily-reports")
    assert worker_project_access.status_code == 403

    set_user(company_admin)
    admin_using_worker_endpoint = await async_client.get(f"/api/v1/workers/{worker_a.id}/paystubs")
    assert admin_using_worker_endpoint.status_code == 403


@pytest.mark.asyncio
async def test_site_manager_can_submit_but_cannot_approve_construction_report(
    async_client: AsyncClient,
    permission_context,
):
    set_user = permission_context["set_user"]
    site_manager_a1 = permission_context["site_manager_a1"]
    project_a1 = permission_context["project_a1"]

    set_user(site_manager_a1)
    create_response = await async_client.post(
        f"/api/v1/projects/{project_a1.id}/construction-reports/start",
        json={
            "construction_name": "A1 착공계",
            "site_address": "서울시 강남구",
            "start_date": "2026-02-20",
            "expected_end_date": "2026-03-05",
            "supervisor_name": "현장소장",
            "supervisor_phone": "010-1000-0002",
        },
    )
    assert create_response.status_code == 201
    report_id = create_response.json()["data"]["id"]

    submit_response = await async_client.post(
        f"/api/v1/construction-reports/{report_id}/submit"
    )
    assert submit_response.status_code == 200
    assert submit_response.json()["data"]["status"] == "submitted"

    approve_response = await async_client.post(
        f"/api/v1/construction-reports/{report_id}/approve"
    )
    assert approve_response.status_code == 403


@pytest.mark.asyncio
async def test_company_admin_can_approve_or_reject_submitted_construction_report(
    async_client: AsyncClient,
    permission_context,
):
    set_user = permission_context["set_user"]
    site_manager_a1 = permission_context["site_manager_a1"]
    company_admin = permission_context["company_admin"]
    project_a1 = permission_context["project_a1"]

    set_user(site_manager_a1)
    start_create_response = await async_client.post(
        f"/api/v1/projects/{project_a1.id}/construction-reports/start",
        json={
            "construction_name": "A1 착공계",
            "site_address": "서울시 강남구",
            "start_date": "2026-02-20",
            "expected_end_date": "2026-03-05",
            "supervisor_name": "현장소장",
            "supervisor_phone": "010-1000-0002",
        },
    )
    assert start_create_response.status_code == 201
    start_report_id = start_create_response.json()["data"]["id"]

    start_submit_response = await async_client.post(
        f"/api/v1/construction-reports/{start_report_id}/submit"
    )
    assert start_submit_response.status_code == 200

    set_user(company_admin)
    start_approve_response = await async_client.post(
        f"/api/v1/construction-reports/{start_report_id}/approve"
    )
    assert start_approve_response.status_code == 200
    assert start_approve_response.json()["data"]["status"] == "approved"

    set_user(site_manager_a1)
    completion_create_response = await async_client.post(
        f"/api/v1/projects/{project_a1.id}/construction-reports/completion",
        json={
            "actual_end_date": "2026-03-06",
            "final_amount": "12000000",
            "defect_warranty_period": 36,
        },
    )
    assert completion_create_response.status_code == 201
    completion_report_id = completion_create_response.json()["data"]["id"]

    completion_submit_response = await async_client.post(
        f"/api/v1/construction-reports/{completion_report_id}/submit"
    )
    assert completion_submit_response.status_code == 200

    set_user(company_admin)
    completion_reject_response = await async_client.post(
        f"/api/v1/construction-reports/{completion_report_id}/reject",
        params={"reason": "보완 필요"},
    )
    assert completion_reject_response.status_code == 200
    assert completion_reject_response.json()["data"]["status"] == "rejected"
