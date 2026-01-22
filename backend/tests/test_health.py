"""Health check 테스트."""
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"


@pytest.mark.asyncio
async def test_root_redirect(async_client: AsyncClient):
    response = await async_client.get("/", follow_redirects=False)
    assert response.status_code in [200, 307]
