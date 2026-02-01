"""E2E 전체 워크플로우 테스트.

실행 중인 Docker 컨테이너에 대해 API를 테스트합니다.
테스트 사용자는 시드 데이터로 미리 생성되어 있다고 가정합니다.
"""
import pytest
import uuid
from datetime import datetime

from httpx import AsyncClient


BASE_URL = "http://localhost:8000"


@pytest.fixture
def api_client():
    return AsyncClient(base_url=BASE_URL, timeout=30.0)


class TestHealthAndDocs:
    """헬스체크 및 문서 테스트."""
    
    @pytest.mark.asyncio
    async def test_health_check(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["database"] == "connected"
    
    @pytest.mark.asyncio
    async def test_openapi_schema(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/openapi.json")
            assert response.status_code == 200
            schema = response.json()
            
            assert schema["info"]["title"] == "SigongOn API"
            assert "/api/v1/auth/login" in schema["paths"]
            assert "/api/v1/projects" in schema["paths"]
    
    @pytest.mark.asyncio
    async def test_swagger_docs(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/docs")
            assert response.status_code == 200
            assert "swagger-ui" in response.text.lower()
    
    @pytest.mark.asyncio
    async def test_redoc_docs(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/redoc")
            assert response.status_code == 200


class TestAuthenticationSecurity:
    """인증 보안 테스트."""
    
    @pytest.mark.asyncio
    async def test_protected_routes_require_auth(self, api_client: AsyncClient):
        async with api_client as client:
            protected_routes = [
                "/api/v1/auth/me",
                "/api/v1/projects",
                "/api/v1/pricebooks/revisions",
            ]
            
            for route in protected_routes:
                response = await client.get(route)
                assert response.status_code == 401, f"Route {route} should require auth"
    
    @pytest.mark.asyncio
    async def test_invalid_token_rejected(self, api_client: AsyncClient):
        async with api_client as client:
            headers = {"Authorization": "Bearer invalid_token_12345"}
            response = await client.get("/api/v1/auth/me", headers=headers)
            assert response.status_code == 401
    
    @pytest.mark.asyncio
    async def test_malformed_auth_header_rejected(self, api_client: AsyncClient):
        async with api_client as client:
            headers = {"Authorization": "InvalidScheme token123"}
            response = await client.get("/api/v1/auth/me", headers=headers)
            assert response.status_code in [401, 403]
    
    @pytest.mark.asyncio
    async def test_login_with_invalid_credentials(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.post(
                "/api/v1/auth/login",
                data={
                    "username": "nonexistent@test.com",
                    "password": "wrongpassword"
                }
            )
            assert response.status_code in [401, 422]


class TestAPIValidation:
    """API 입력 검증 테스트."""
    
    @pytest.mark.asyncio
    async def test_invalid_uuid_format(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.get("/api/v1/projects/not-a-valid-uuid")
            assert response.status_code in [401, 422]
    
    @pytest.mark.asyncio
    async def test_missing_required_fields(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.post(
                "/api/v1/auth/login",
                data={}
            )
            assert response.status_code == 422


class TestCORS:
    """CORS 설정 테스트."""
    
    @pytest.mark.asyncio
    async def test_cors_headers_present(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.options(
                "/api/v1/auth/login",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "POST",
                }
            )
            assert response.status_code in [200, 204]


class TestErrorResponses:
    """에러 응답 형식 테스트."""
    
    @pytest.mark.asyncio
    async def test_404_response_format(self, api_client: AsyncClient):
        async with api_client as client:
            fake_uuid = str(uuid.uuid4())
            headers = {"Authorization": "Bearer fake_token"}
            
            response = await client.get(f"/api/v1/nonexistent/endpoint")
            assert response.status_code == 404
    
    @pytest.mark.asyncio
    async def test_method_not_allowed(self, api_client: AsyncClient):
        async with api_client as client:
            response = await client.delete("/health")
            assert response.status_code == 405


class TestRateLimitingAndPerformance:
    """속도 제한 및 성능 테스트."""
    
    @pytest.mark.asyncio
    async def test_concurrent_requests(self, api_client: AsyncClient):
        import asyncio
        
        async with api_client as client:
            async def make_request():
                return await client.get("/health")
            
            tasks = [make_request() for _ in range(10)]
            responses = await asyncio.gather(*tasks)
            
            for response in responses:
                assert response.status_code == 200
    
    @pytest.mark.asyncio
    async def test_response_time(self, api_client: AsyncClient):
        import time
        
        async with api_client as client:
            start = time.time()
            response = await client.get("/health")
            elapsed = time.time() - start
            
            assert response.status_code == 200
            assert elapsed < 1.0, f"Response took {elapsed:.2f}s, expected < 1s"
