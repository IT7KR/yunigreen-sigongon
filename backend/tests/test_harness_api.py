"""Harness API tests."""
from types import SimpleNamespace

import pytest
from httpx import AsyncClient

from app.core.security import get_current_user
from app.main import app


@pytest.fixture
def auth_override():
    async def _fake_user():
        return SimpleNamespace(
            id=1,
            role="super_admin",
            is_active=True,
            organization_id=None,
        )

    app.dependency_overrides[get_current_user] = _fake_user
    yield
    app.dependency_overrides.pop(get_current_user, None)


@pytest.mark.asyncio
async def test_harness_run_api(async_client: AsyncClient, auth_override):
    response = await async_client.post(
        "/api/v1/harness/runs",
        json={"harness_types": ["code", "ai"]},
    )
    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert data["status"] in {"passed", "failed"}
    assert "id" in data
    assert len(data["checks"]) > 0


@pytest.mark.asyncio
async def test_harness_metrics_api(async_client: AsyncClient, auth_override):
    response = await async_client.get("/api/v1/harness/metrics?window_days=7")
    assert response.status_code == 200

    body = response.json()
    assert body["success"] is True
    data = body["data"]
    assert "total_runs" in data
    assert "pass_rate" in data
