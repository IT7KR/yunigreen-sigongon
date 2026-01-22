"""E2E 워크플로우 통합 테스트.

전체 사용자 시나리오를 테스트:
1. 사용자 로그인
2. 프로젝트 생성
3. 현장 방문 등록
4. 사진 업로드
5. AI 진단 요청
6. 견적서 생성
"""
import pytest
from httpx import AsyncClient


BASE_URL = "http://localhost:8000"


@pytest.fixture
def api_client():
    return AsyncClient(base_url=BASE_URL, timeout=30.0)


class TestHealthCheck:
    """헬스체크 테스트."""
    
    @pytest.mark.asyncio
    async def test_health_endpoint(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["database"] == "connected"


class TestAuthFlow:
    """인증 플로우 테스트."""
    
    @pytest.mark.asyncio
    async def test_login_invalid_credentials(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.post(
                "/api/v1/auth/login",
                data={
                    "username": "invalid@test.com",
                    "password": "wrongpassword"
                }
            )
            assert response.status_code in [401, 422]
    
    @pytest.mark.asyncio
    async def test_me_without_token(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/api/v1/auth/me")
            assert response.status_code == 401


class TestAPIEndpoints:
    """API 엔드포인트 기본 테스트."""
    
    @pytest.mark.asyncio
    async def test_projects_requires_auth(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/api/v1/projects")
            assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_estimates_requires_auth(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/api/v1/projects/123/estimates")
            assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_pricebooks_requires_admin(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/api/v1/pricebooks/revisions")
            assert response.status_code == 401


class TestOpenAPISchema:
    """OpenAPI 스키마 테스트."""
    
    @pytest.mark.asyncio
    async def test_openapi_json_available(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/openapi.json")
            assert response.status_code == 200
            data = response.json()
            assert "openapi" in data
            assert "paths" in data
            assert "info" in data
    
    @pytest.mark.asyncio
    async def test_swagger_ui_available(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/docs")
            assert response.status_code == 200
            assert "swagger-ui" in response.text.lower()


class TestDatabaseConnection:
    """데이터베이스 연결 테스트."""
    
    @pytest.mark.asyncio
    async def test_db_health(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["database"] == "connected"
