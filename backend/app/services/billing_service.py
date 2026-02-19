"""토스페이먼츠 결제 서비스 Adapter."""
import base64
import hmac
import hashlib
import logging
from typing import Optional, Protocol, runtime_checkable

import httpx

logger = logging.getLogger(__name__)


@runtime_checkable
class PaymentServiceProtocol(Protocol):
    """결제 서비스 프로토콜."""

    async def confirm_payment(self, payment_key: str, order_id: str, amount: str) -> dict:
        """결제 승인."""
        ...

    async def issue_billing_key(self, auth_key: str, customer_key: str) -> dict:
        """정기결제 빌링키 발급."""
        ...

    async def charge_billing(self, billing_key: str, amount: str, order_id: str, order_name: str, customer_key: str) -> dict:
        """빌링키로 자동결제."""
        ...

    async def verify_webhook(self, body: bytes, signature: Optional[str]) -> bool:
        """웹훅 시그니처 검증."""
        ...


class TossPaymentsService:
    """Toss Payments 실 연동 서비스."""

    BASE_URL = "https://api.tosspayments.com/v1"

    def __init__(self, secret_key: str, webhook_secret: Optional[str] = None) -> None:
        self.secret_key = secret_key
        self.webhook_secret = webhook_secret
        # Basic auth: base64(secret_key + ":")
        credentials = base64.b64encode(f"{secret_key}:".encode()).decode()
        self._auth_header = f"Basic {credentials}"

    async def confirm_payment(self, payment_key: str, order_id: str, amount: str) -> dict:
        """토스 결제 승인 API 호출."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{self.BASE_URL}/payments/confirm",
                    headers={
                        "Authorization": self._auth_header,
                        "Content-Type": "application/json",
                    },
                    json={
                        "paymentKey": payment_key,
                        "orderId": order_id,
                        "amount": amount,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.error(f"토스 결제 승인 실패 {resp.status_code}: {resp.text}")
                raise ValueError(f"결제 승인 실패: {resp.json().get('message', resp.text)}")
            except httpx.RequestError as e:
                logger.error(f"토스 결제 승인 연결 오류: {e}")
                raise

    async def issue_billing_key(self, auth_key: str, customer_key: str) -> dict:
        """빌링키 발급 API 호출."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{self.BASE_URL}/billing/authorizations/issue",
                    headers={
                        "Authorization": self._auth_header,
                        "Content-Type": "application/json",
                    },
                    json={
                        "authKey": auth_key,
                        "customerKey": customer_key,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.error(f"빌링키 발급 실패 {resp.status_code}: {resp.text}")
                raise ValueError(f"빌링키 발급 실패: {resp.json().get('message', resp.text)}")
            except httpx.RequestError as e:
                logger.error(f"빌링키 발급 연결 오류: {e}")
                raise

    async def charge_billing(self, billing_key: str, amount: str, order_id: str, order_name: str, customer_key: str) -> dict:
        """빌링키로 자동결제."""
        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{self.BASE_URL}/billing/{billing_key}",
                    headers={
                        "Authorization": self._auth_header,
                        "Content-Type": "application/json",
                    },
                    json={
                        "amount": amount,
                        "orderId": order_id,
                        "orderName": order_name,
                        "customerKey": customer_key,
                    },
                )
                if resp.status_code == 200:
                    return resp.json()
                logger.error(f"자동결제 실패 {resp.status_code}: {resp.text}")
                raise ValueError(f"자동결제 실패: {resp.json().get('message', resp.text)}")
            except httpx.RequestError as e:
                logger.error(f"자동결제 연결 오류: {e}")
                raise

    async def verify_webhook(self, body: bytes, signature: Optional[str]) -> bool:
        """웹훅 시그니처 검증."""
        if not self.webhook_secret or not signature:
            return True  # 시크릿 미설정 시 검증 건너뜀
        expected = hmac.new(
            self.webhook_secret.encode(),
            body,
            hashlib.sha256,
        ).hexdigest()
        return hmac.compare_digest(expected, signature)


class MockPaymentService:
    """Mock 결제 서비스 (개발/테스트용)."""

    async def confirm_payment(self, payment_key: str, order_id: str, amount: str) -> dict:
        logger.info(f"[MockPayment] confirm_payment: key={payment_key}, order={order_id}, amount={amount}")
        return {
            "paymentKey": payment_key,
            "orderId": order_id,
            "amount": int(amount),
            "status": "DONE",
            "method": "카드",
            "approvedAt": "2026-01-01T00:00:00+09:00",
            "receiptUrl": f"https://mock.tosspayments.com/receipt/{payment_key}",
        }

    async def issue_billing_key(self, auth_key: str, customer_key: str) -> dict:
        logger.info(f"[MockPayment] issue_billing_key: auth={auth_key}, customer={customer_key}")
        mock_billing_key = f"mock_billing_{customer_key}"
        return {
            "billingKey": mock_billing_key,
            "customerKey": customer_key,
            "authenticatedAt": "2026-01-01T00:00:00+09:00",
        }

    async def charge_billing(self, billing_key: str, amount: str, order_id: str, order_name: str, customer_key: str) -> dict:
        logger.info(f"[MockPayment] charge_billing: key={billing_key}, amount={amount}")
        return {
            "paymentKey": f"mock_billing_charge_{order_id}",
            "orderId": order_id,
            "amount": int(amount),
            "status": "DONE",
        }

    async def verify_webhook(self, body: bytes, signature: Optional[str]) -> bool:
        return True  # Mock은 항상 통과


_payment_service: Optional[object] = None


def get_payment_service():
    """결제 서비스 인스턴스 반환."""
    global _payment_service
    if _payment_service is None:
        from app.core.config import settings
        if settings.toss_is_mock or not settings.toss_secret_key:
            _payment_service = MockPaymentService()
        else:
            _payment_service = TossPaymentsService(
                secret_key=settings.toss_secret_key,
                webhook_secret=settings.toss_webhook_secret,
            )
    return _payment_service
