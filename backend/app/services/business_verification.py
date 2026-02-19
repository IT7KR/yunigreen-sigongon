"""사업자 상태 검증 서비스 - 국세청 사업자 상태조회 API."""
import logging
from dataclasses import dataclass
from enum import Enum
from typing import Optional, Protocol


logger = logging.getLogger(__name__)


class BusinessStatus(str, Enum):
    ACTIVE = "계속사업자"      # b_stt_cd = "01"
    SUSPENDED = "휴업자"      # b_stt_cd = "02"
    CLOSED = "폐업자"         # b_stt_cd = "03"
    UNKNOWN = "조회불가"


@dataclass
class BusinessVerificationResult:
    business_number: str
    status: BusinessStatus
    status_code: str
    tax_type: Optional[str] = None    # 과세유형 (일반과세자/간이과세자/면세사업자)
    company_name: Optional[str] = None


class BusinessVerificationProtocol(Protocol):
    async def verify(self, business_number: str) -> BusinessVerificationResult:
        ...


class MockBusinessVerificationService:
    """목 사업자 검증 서비스."""

    async def verify(self, business_number: str) -> BusinessVerificationResult:
        # Mock: 모든 사업자번호를 계속사업자로 반환
        logger.debug(f"[MockBusinessVerification] verify: {business_number}")
        return BusinessVerificationResult(
            business_number=business_number,
            status=BusinessStatus.ACTIVE,
            status_code="01",
            tax_type="일반과세자",
        )


class BusinessVerificationService:
    """국세청 사업자 상태조회 실 서비스."""

    API_URL = "https://api.odcloud.kr/api/nts-businessman/v1/status"

    def __init__(self, api_key: str) -> None:
        self.api_key = api_key

    async def verify(self, business_number: str) -> BusinessVerificationResult:
        import httpx

        # 하이픈 제거
        b_no = business_number.replace("-", "")

        async with httpx.AsyncClient() as client:
            try:
                resp = await client.post(
                    self.API_URL,
                    params={"serviceKey": self.api_key},
                    json={"b_no": [b_no]},
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json",
                    },
                    timeout=10.0,
                )
                resp.raise_for_status()
                data = resp.json()
            except httpx.HTTPStatusError as e:
                logger.error(f"국세청 API HTTP 오류: {e}")
                return BusinessVerificationResult(
                    business_number=business_number,
                    status=BusinessStatus.UNKNOWN,
                    status_code="",
                )
            except Exception as e:
                logger.error(f"국세청 API 연결 오류: {e}")
                return BusinessVerificationResult(
                    business_number=business_number,
                    status=BusinessStatus.UNKNOWN,
                    status_code="",
                )

        items = data.get("data", [])
        if not items:
            return BusinessVerificationResult(
                business_number=business_number,
                status=BusinessStatus.UNKNOWN,
                status_code="",
            )

        item = items[0]
        status_code = item.get("b_stt_cd", "")
        status_map = {
            "01": BusinessStatus.ACTIVE,
            "02": BusinessStatus.SUSPENDED,
            "03": BusinessStatus.CLOSED,
        }
        status = status_map.get(status_code, BusinessStatus.UNKNOWN)

        return BusinessVerificationResult(
            business_number=business_number,
            status=status,
            status_code=status_code,
            tax_type=item.get("tax_type"),
        )


# 싱글턴 인스턴스
_business_verification_service: Optional[BusinessVerificationProtocol] = None


def get_business_verification_service() -> BusinessVerificationProtocol:
    """사업자 검증 서비스 인스턴스 반환."""
    global _business_verification_service
    if _business_verification_service is None:
        from app.core.config import settings
        if settings.business_verification_is_mock or not settings.business_verification_api_key:
            _business_verification_service = MockBusinessVerificationService()
        else:
            _business_verification_service = BusinessVerificationService(
                api_key=settings.business_verification_api_key,
            )
    return _business_verification_service
