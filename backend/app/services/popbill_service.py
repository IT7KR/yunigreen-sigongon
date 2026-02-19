"""팝빌 세금계산서 서비스 Adapter."""
import logging
from dataclasses import dataclass
from typing import Optional, Protocol, runtime_checkable

import httpx

logger = logging.getLogger(__name__)


@dataclass
class TaxInvoiceIssueResult:
    """세금계산서 발행 결과."""

    issue_id: str
    issue_url: Optional[str] = None


@runtime_checkable
class TaxInvoiceServiceProtocol(Protocol):
    """세금계산서 서비스 프로토콜."""

    async def issue(self, tax_invoice_id: int, write_date: str, memo: Optional[str] = None) -> TaxInvoiceIssueResult:
        """세금계산서 발행."""
        ...

    async def cancel_issue(self, issue_id: str, memo: Optional[str] = None) -> bool:
        """세금계산서 발행 취소."""
        ...

    async def get_popup_url(self, issue_id: str, user_id: str) -> str:
        """팝빌 세금계산서 팝업 URL 조회."""
        ...


class MockTaxInvoiceService:
    """Mock 세금계산서 서비스 (개발/테스트용)."""

    async def issue(self, tax_invoice_id: int, write_date: str, memo: Optional[str] = None) -> TaxInvoiceIssueResult:
        from datetime import datetime

        issue_id = f"PBILL-{datetime.now().strftime('%Y%m%d%H%M%S')}-{tax_invoice_id}"
        issue_url = f"https://popbill.example.com/taxinvoice/{issue_id}"
        logger.info(f"[MockPopbill] issue: tax_invoice_id={tax_invoice_id}, issue_id={issue_id}")
        return TaxInvoiceIssueResult(issue_id=issue_id, issue_url=issue_url)

    async def cancel_issue(self, issue_id: str, memo: Optional[str] = None) -> bool:
        logger.info(f"[MockPopbill] cancel_issue: issue_id={issue_id}")
        return True

    async def get_popup_url(self, issue_id: str, user_id: str) -> str:
        url = f"https://popbill.example.com/taxinvoice/{issue_id}"
        logger.info(f"[MockPopbill] get_popup_url: issue_id={issue_id}, url={url}")
        return url


class PopbillService:
    """팝빌 세금계산서 실 서비스 (HTTP API)."""

    def __init__(self, link_id: str, secret_key: str, corp_num: str, is_test: bool = True) -> None:
        self.link_id = link_id
        self.secret_key = secret_key
        self.corp_num = corp_num
        self.is_test = is_test
        self.base_url = "https://testbill.popbill.com" if is_test else "https://bill.popbill.com"

    async def _get_session_token(self) -> str:
        """팝빌 세션 토큰 발급 (HMAC-SHA1 인증)."""
        import base64
        import hashlib
        import hmac
        import time

        now = int(time.time())
        message = f"{self.link_id}\n{now}"
        secret = self.secret_key.encode() if isinstance(self.secret_key, str) else self.secret_key
        sig = hmac.new(secret, message.encode(), hashlib.sha1)
        signature = base64.b64encode(sig.digest()).decode()

        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(
                    f"{self.base_url}/Account/Token",
                    json={
                        "LinkID": self.link_id,
                        "Timestamp": now,
                        "Signature": signature,
                    },
                )
                resp.raise_for_status()
                data = resp.json()
                return data["SessionToken"]
            except httpx.RequestError as e:
                logger.error(f"팝빌 세션 토큰 발급 연결 오류: {e}")
                raise
            except Exception as e:
                logger.error(f"팝빌 세션 토큰 발급 실패: {e}")
                raise

    async def issue(self, tax_invoice_id: int, write_date: str, memo: Optional[str] = None) -> TaxInvoiceIssueResult:
        """팝빌 세금계산서 발행.

        실 연동 시 팝빌 TaxInvoice Issue API를 호출해요.
        현재는 세션 토큰 기반 구조만 마련되어 있으며,
        전체 구현은 KTNET/팝빌 SDK 문서 확인 후 완성 예정이에요.
        """
        # Full implementation requires KTNET/Popbill SDK documentation.
        # Structure: obtain session token → POST /Taxinvoice/{corpNum}/{mgtKey}/Issue
        issue_id = f"PBILL-{write_date}-{tax_invoice_id}"
        logger.info(f"[Popbill] issue: tax_invoice_id={tax_invoice_id}, issue_id={issue_id}")
        return TaxInvoiceIssueResult(issue_id=issue_id)

    async def cancel_issue(self, issue_id: str, memo: Optional[str] = None) -> bool:
        """팝빌 세금계산서 발행 취소."""
        # Full implementation: POST /Taxinvoice/{corpNum}/{mgtKey}/Cancel
        logger.info(f"[Popbill] cancel_issue: issue_id={issue_id}")
        return True

    async def get_popup_url(self, issue_id: str, user_id: str) -> str:
        """팝빌 세금계산서 팝업 URL 조회."""
        # Full implementation: GET /Taxinvoice/{corpNum}/PopUp?mgtKey={issue_id}&userID={user_id}
        url = f"{self.base_url}/TaxInvoice/View/{issue_id}"
        logger.info(f"[Popbill] get_popup_url: issue_id={issue_id}, url={url}")
        return url


_tax_invoice_service: Optional[object] = None


def get_tax_invoice_service() -> TaxInvoiceServiceProtocol:
    """세금계산서 서비스 인스턴스 반환."""
    global _tax_invoice_service
    if _tax_invoice_service is None:
        from app.core.config import settings

        if settings.popbill_is_mock or not settings.popbill_link_id:
            _tax_invoice_service = MockTaxInvoiceService()
        else:
            _tax_invoice_service = PopbillService(
                link_id=settings.popbill_link_id,
                secret_key=settings.popbill_secret_key or "",
                corp_num=settings.popbill_corp_num or "",
                is_test=settings.popbill_is_test,
            )
    return _tax_invoice_service  # type: ignore[return-value]
