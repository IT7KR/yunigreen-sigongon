"""사업자 통합 검증 API TDD 테스트.

POST /api/v1/auth/verify-business 엔드포인트 테스트.

RED-GREEN 순서:
1. 먼저 이 테스트를 실행해 FAIL(RED) 확인
2. 구현 코드가 존재하면 PASS(GREEN) 확인
"""

from __future__ import annotations

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import AsyncClient

from app.core.database import get_async_db
from app.main import app
from app.models.user import Organization
from app.services.business_verification import (
    BusinessStatus,
    BusinessVerificationResult,
)

ENDPOINT = "/api/v1/auth/verify-business"


# ---------------------------------------------------------------------------
# Fixture
# ---------------------------------------------------------------------------


@pytest.fixture
async def business_verify_context(test_db):
    """DB 오버라이드 픽스처.

    test_db를 앱 의존성으로 주입하고, 테스트 종료 후 정리한다.
    test_license_api.py 패턴과 동일하게 _override_db 방식을 사용한다.
    """

    async def _override_db():
        try:
            yield test_db
            await test_db.commit()
        except Exception:
            await test_db.rollback()
            raise

    app.dependency_overrides[get_async_db] = _override_db

    yield test_db

    app.dependency_overrides.pop(get_async_db, None)


# ---------------------------------------------------------------------------
# Helper
# ---------------------------------------------------------------------------


def _make_mock_svc(
    verify_status_code: str = "01",
    verify_tax_type: str | None = "일반과세자",
) -> MagicMock:
    """verify 결과를 설정한 Mock 서비스 반환."""
    mock_svc = MagicMock()

    status_map = {
        "01": BusinessStatus.ACTIVE,
        "02": BusinessStatus.SUSPENDED,
        "03": BusinessStatus.CLOSED,
        "": BusinessStatus.UNKNOWN,
    }
    mock_svc.verify = AsyncMock(
        return_value=BusinessVerificationResult(
            business_number="123-45-67890",
            status=status_map.get(verify_status_code, BusinessStatus.UNKNOWN),
            status_code=verify_status_code,
            tax_type=verify_tax_type,
        )
    )
    return mock_svc


# ---------------------------------------------------------------------------
# 테스트 케이스
# ---------------------------------------------------------------------------


@pytest.mark.asyncio
async def test_returns_duplicate_when_business_number_already_registered(
    async_client: AsyncClient, business_verify_context
):
    """이미 DB에 등록된 사업자번호를 전송하면 duplicate 상태를 반환한다.

    RED: 엔드포인트가 없거나 중복 체크 로직이 없으면 FAIL.
    GREEN: DB 중복 확인 후 {"status": "duplicate"} 반환.
    """
    test_db = business_verify_context
    existing_org = Organization(name="기존 법인", business_number="123-45-67890")
    test_db.add(existing_org)
    await test_db.commit()

    response = await async_client.post(
        ENDPOINT,
        json={"business_number": "123-45-67890"},
    )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "duplicate"


@pytest.mark.asyncio
async def test_returns_active_for_valid_business_with_matching_name(
    async_client: AsyncClient, business_verify_context
):
    """verify() status_code="01" → active + tax_type 반환.

    RED: verify() status_code 매핑 로직이 없으면 FAIL.
    GREEN: {"status": "active", "tax_type": "일반과세자"} 반환.
    """
    mock_svc = _make_mock_svc(
        verify_status_code="01",
        verify_tax_type="일반과세자",
    )

    with patch(
        "app.services.business_verification.get_business_verification_service",
        return_value=mock_svc,
    ):
        response = await async_client.post(
            ENDPOINT,
            json={"business_number": "111-22-33333"},
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "active"
    assert data["tax_type"] == "일반과세자"


@pytest.mark.asyncio
async def test_returns_suspended_for_suspended_business(
    async_client: AsyncClient, business_verify_context
):
    """verify() status_code="02" → suspended 반환.

    RED: "02" 매핑 로직이 없으면 FAIL.
    GREEN: {"status": "suspended", "tax_type": null} 반환.
    """
    mock_svc = _make_mock_svc(
        verify_status_code="02",
        verify_tax_type=None,
    )

    with patch(
        "app.services.business_verification.get_business_verification_service",
        return_value=mock_svc,
    ):
        response = await async_client.post(
            ENDPOINT,
            json={"business_number": "222-33-44444"},
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "suspended"
    assert data["tax_type"] is None


@pytest.mark.asyncio
async def test_returns_closed_for_closed_business(
    async_client: AsyncClient, business_verify_context
):
    """verify() status_code="03" → closed 반환.

    RED: "03" 매핑 로직이 없으면 FAIL.
    GREEN: {"status": "closed", "tax_type": null} 반환.
    """
    mock_svc = _make_mock_svc(
        verify_status_code="03",
        verify_tax_type=None,
    )

    with patch(
        "app.services.business_verification.get_business_verification_service",
        return_value=mock_svc,
    ):
        response = await async_client.post(
            ENDPOINT,
            json={"business_number": "333-44-55555"},
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "closed"
    assert data["tax_type"] is None


@pytest.mark.asyncio
async def test_returns_unknown_when_nts_api_unavailable(
    async_client: AsyncClient, business_verify_context
):
    """verify() status_code="" → unknown 반환.

    RED: 알 수 없는 status_code 처리 로직이 없으면 FAIL.
    GREEN: {"status": "unknown"} 반환.
    """
    mock_svc = _make_mock_svc(
        verify_status_code="",
        verify_tax_type=None,
    )

    with patch(
        "app.services.business_verification.get_business_verification_service",
        return_value=mock_svc,
    ):
        response = await async_client.post(
            ENDPOINT,
            json={"business_number": "444-55-66666"},
        )

    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "unknown"


@pytest.mark.asyncio
async def test_returns_422_when_business_number_missing(
    async_client: AsyncClient, business_verify_context
):
    """business_number 없이 요청하면 422 Unprocessable Entity 반환.

    RED: Pydantic 스키마 검증이 없으면 FAIL.
    GREEN: FastAPI/Pydantic 자동 검증으로 422 반환.
    """
    response = await async_client.post(
        ENDPOINT,
        json={"company_name": "법인명만 전송"},
    )

    assert response.status_code == 422


