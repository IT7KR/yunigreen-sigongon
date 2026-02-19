"""Season estimation governance API tests."""

from __future__ import annotations

from decimal import Decimal

import pytest
from httpx import AsyncClient

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.main import app
from app.models.case import (
    Case,
    CaseStatus,
    CostItem,
    DocumentStatus,
    Season,
    SeasonCategory,
    SeasonCategoryPurpose,
    SeasonDocument,
    VisionResult,
)
from app.models.user import User, UserRole


@pytest.fixture
async def governance_context(test_db):
    admin_user = User(
        username="sa_governance",
        name="거버넌스관리자",
        role=UserRole.SUPER_ADMIN,
        organization_id=None,
        password_hash="hash",
        is_active=True,
    )
    test_db.add(admin_user)
    await test_db.flush()

    season = Season(name="2026H1", is_active=True)
    test_db.add(season)
    await test_db.flush()

    category = SeasonCategory(
        season_id=season.id,
        name="적산 자료",
        purpose=SeasonCategoryPurpose.ESTIMATION,
        is_enabled=True,
        sort_order=100,
    )
    test_db.add(category)
    await test_db.flush()

    enabled_done_doc = SeasonDocument(
        season_id=season.id,
        category=category.name,
        title="enabled-done-doc",
        file_url="pricebooks/enabled-done-doc.pdf",
        version_hash="enabled-done-vh",
        status=DocumentStatus.DONE,
        is_enabled=True,
    )
    disabled_done_doc = SeasonDocument(
        season_id=season.id,
        category=category.name,
        title="disabled-done-doc",
        file_url="pricebooks/disabled-done-doc.pdf",
        version_hash="disabled-done-vh",
        status=DocumentStatus.DONE,
        is_enabled=False,
    )
    enabled_running_doc = SeasonDocument(
        season_id=season.id,
        category=category.name,
        title="enabled-running-doc",
        file_url="pricebooks/enabled-running-doc.pdf",
        version_hash="enabled-running-vh",
        status=DocumentStatus.RUNNING,
        is_enabled=True,
    )
    test_db.add(enabled_done_doc)
    test_db.add(disabled_done_doc)
    test_db.add(enabled_running_doc)
    await test_db.flush()

    enabled_cost_item = CostItem(
        season_id=season.id,
        source_doc_id=enabled_done_doc.id,
        category=category.name,
        item_name="우레탄",
        spec="기본",
        unit="ea",
        unit_price=Decimal("1000"),
        source_doc_title=enabled_done_doc.title,
        source_page=10,
        table_id="T-01",
        row_id="R-01",
        row_text="우레탄 ea 1,000",
    )
    disabled_cost_item = CostItem(
        season_id=season.id,
        source_doc_id=disabled_done_doc.id,
        category=category.name,
        item_name="우레탄 방수",
        spec="기본",
        unit="ea",
        unit_price=Decimal("9000"),
        source_doc_title=disabled_done_doc.title,
        source_page=11,
        table_id="T-02",
        row_id="R-05",
        row_text="우레탄 방수 ea 9,000",
    )
    test_db.add(enabled_cost_item)
    test_db.add(disabled_cost_item)
    await test_db.flush()

    case = Case(
        user_id=admin_user.id,
        organization_id=None,
        season_id=season.id,
        status=CaseStatus.VISION_READY,
    )
    test_db.add(case)
    await test_db.flush()

    vision = VisionResult(
        case_id=case.id,
        model="gemini-3.0-flash",
        params_json={"response_mime_type": "application/json"},
        result_json={
            "findings": [],
            "work_items": [
                {"name": "우레탄 방수", "required": True},
            ],
            "materials": [],
            "confidence": 0.9,
            "questions_for_user": [],
        },
        confidence=Decimal("0.9"),
    )
    test_db.add(vision)
    await test_db.commit()

    async def _fake_user():
        return admin_user

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
        "season": season,
        "category": category,
        "enabled_done_doc": enabled_done_doc,
        "disabled_done_doc": disabled_done_doc,
        "enabled_running_doc": enabled_running_doc,
        "case": case,
    }

    app.dependency_overrides.pop(get_current_user, None)
    app.dependency_overrides.pop(get_async_db, None)


@pytest.mark.asyncio
async def test_governance_overview_counts_only_done_enabled_cost_items(
    async_client: AsyncClient,
    governance_context,
):
    season = governance_context["season"]
    enabled_done_doc = governance_context["enabled_done_doc"]
    enabled_running_doc = governance_context["enabled_running_doc"]
    disabled_done_doc = governance_context["disabled_done_doc"]

    response = await async_client.get("/api/v1/admin/estimation-governance/overview")
    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    data = body["data"]

    assert data["active_season"]["id"] == season.id
    assert len(data["enabled_categories"]) == 1
    assert data["effective_cost_item_count"] == 1

    enabled_doc_ids = {row["id"] for row in data["enabled_documents"]}
    assert enabled_doc_ids == {enabled_done_doc.id, enabled_running_doc.id}
    assert disabled_done_doc.id not in enabled_doc_ids


@pytest.mark.asyncio
async def test_update_admin_document_toggle_filters_list_results(
    async_client: AsyncClient,
    governance_context,
):
    season = governance_context["season"]
    enabled_running_doc = governance_context["enabled_running_doc"]

    patch_response = await async_client.patch(
        f"/api/v1/admin/documents/{enabled_running_doc.id}",
        json={"is_enabled": False},
    )
    assert patch_response.status_code == 200
    patch_data = patch_response.json()["data"]
    assert patch_data["id"] == enabled_running_doc.id
    assert patch_data["is_enabled"] is False

    list_response = await async_client.get(
        "/api/v1/admin/documents",
        params={
            "season_id": season.id,
            "purpose": "estimation",
            "is_enabled": True,
        },
    )
    assert list_response.status_code == 200
    listed_ids = {row["id"] for row in list_response.json()["data"]}
    assert enabled_running_doc.id not in listed_ids


@pytest.mark.asyncio
async def test_create_case_estimate_ignores_disabled_documents(
    async_client: AsyncClient,
    governance_context,
):
    case = governance_context["case"]
    enabled_done_doc = governance_context["enabled_done_doc"]

    response = await async_client.post(f"/api/v1/cases/{case.id}/estimate")
    assert response.status_code == 200

    estimate = response.json()["data"]
    assert estimate["items"]
    first_line = estimate["items"][0]

    assert first_line["unit_price"] == 1000.0
    assert first_line["evidence"][0]["doc_title"] == enabled_done_doc.title


@pytest.mark.asyncio
async def test_upload_admin_document_with_file(async_client: AsyncClient, governance_context):
    season = governance_context["season"]
    category = governance_context["category"]

    response = await async_client.post(
        "/api/v1/admin/documents/upload",
        data={
            "season_id": str(season.id),
            "category_id": str(category.id),
            "title": "업로드 문서",
        },
        files={
            "file": ("uploaded-pricebook.pdf", b"%PDF-1.7 mock content", "application/pdf"),
        },
    )
    assert response.status_code == 201

    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["title"] == "업로드 문서"
    assert data["status"] == "queued"
    assert data["is_enabled"] is True
    assert data["file_url"].startswith(f"pricebooks/{season.id}/")
