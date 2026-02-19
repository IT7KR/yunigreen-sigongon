"""모두싸인 전자서명 서비스 Adapter."""
import logging
from typing import Optional, Protocol, runtime_checkable

import httpx

logger = logging.getLogger(__name__)


@runtime_checkable
class SigningServiceProtocol(Protocol):
    """전자서명 서비스 프로토콜."""

    async def request_signature(self, document_url: str, signer_name: str, signer_email: str, signer_phone: str, contract_id: int) -> dict:
        """서명 요청 생성."""
        ...

    async def get_status(self, request_id: str) -> dict:
        """서명 요청 상태 조회."""
        ...

    async def cancel(self, request_id: str) -> bool:
        """서명 요청 취소."""
        ...

    async def download_document(self, request_id: str) -> bytes:
        """서명 완료 문서 다운로드."""
        ...


class ModusignService:
    """모두싸인 실 연동 서비스."""

    def __init__(self, api_key: str, api_url: str = "https://api.modusign.co.kr", callback_url: Optional[str] = None) -> None:
        self.api_key = api_key
        self.api_url = api_url.rstrip("/")
        self.callback_url = callback_url
        self._headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        }

    async def request_signature(self, document_url: str, signer_name: str, signer_email: str, signer_phone: str, contract_id: int) -> dict:
        """모두싸인 서명 요청 생성."""
        payload = {
            "document": {
                "title": f"계약서-{contract_id}",
                "file": {"url": document_url},
            },
            "participants": [
                {
                    "name": signer_name,
                    "email": signer_email,
                    "mobileNumber": signer_phone.replace("-", ""),
                    "signingMethod": {"type": "EMAIL"},
                }
            ],
        }
        if self.callback_url:
            payload["notification"] = {"callback": {"url": self.callback_url}}

        async with httpx.AsyncClient(timeout=30.0) as client:
            try:
                resp = await client.post(
                    f"{self.api_url}/documents",
                    headers=self._headers,
                    json=payload,
                )
                if resp.status_code in (200, 201):
                    data = resp.json()
                    return {
                        "request_id": data.get("id", ""),
                        "status": data.get("status", "sent"),
                        "document_url": document_url,
                    }
                logger.error(f"모두싸인 서명 요청 실패 {resp.status_code}: {resp.text}")
                raise ValueError(f"서명 요청 실패: {resp.text}")
            except httpx.RequestError as e:
                logger.error(f"모두싸인 연결 오류: {e}")
                raise

    async def get_status(self, request_id: str) -> dict:
        """모두싸인 서명 상태 조회."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.get(
                    f"{self.api_url}/documents/{request_id}",
                    headers=self._headers,
                )
                if resp.status_code == 200:
                    data = resp.json()
                    return {
                        "request_id": request_id,
                        "status": data.get("status", "sent"),
                        "signed_at": data.get("completedAt"),
                    }
                logger.error(f"모두싸인 상태 조회 실패 {resp.status_code}: {resp.text}")
                return {"request_id": request_id, "status": "unknown"}
            except httpx.RequestError as e:
                logger.error(f"모두싸인 상태 조회 연결 오류: {e}")
                return {"request_id": request_id, "status": "error"}

    async def cancel(self, request_id: str) -> bool:
        """모두싸인 서명 요청 취소."""
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(
                    f"{self.api_url}/documents/{request_id}/cancel",
                    headers=self._headers,
                )
                return resp.status_code in (200, 204)
            except httpx.RequestError as e:
                logger.error(f"모두싸인 취소 연결 오류: {e}")
                return False

    async def download_document(self, request_id: str) -> bytes:
        """서명 완료 문서 다운로드."""
        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                resp = await client.get(
                    f"{self.api_url}/documents/{request_id}/file",
                    headers=self._headers,
                )
                if resp.status_code == 200:
                    return resp.content
                logger.error(f"모두싸인 문서 다운로드 실패 {resp.status_code}")
                raise ValueError("문서 다운로드 실패")
            except httpx.RequestError as e:
                logger.error(f"모두싸인 다운로드 연결 오류: {e}")
                raise


class MockSigningService:
    """Mock 전자서명 서비스 (개발/테스트용)."""

    async def request_signature(self, document_url: str, signer_name: str, signer_email: str, signer_phone: str, contract_id: int) -> dict:
        request_id = f"mock_modusign_{contract_id}"
        logger.info(f"[MockModusign] request_signature: signer={signer_name}, contract={contract_id}")
        return {
            "request_id": request_id,
            "status": "sent",
            "document_url": document_url,
        }

    async def get_status(self, request_id: str) -> dict:
        logger.info(f"[MockModusign] get_status: {request_id}")
        return {"request_id": request_id, "status": "sent", "signed_at": None}

    async def cancel(self, request_id: str) -> bool:
        logger.info(f"[MockModusign] cancel: {request_id}")
        return True

    async def download_document(self, request_id: str) -> bytes:
        logger.info(f"[MockModusign] download_document: {request_id}")
        return b"Mock PDF document bytes"


_signing_service: Optional[object] = None


def get_signing_service():
    """전자서명 서비스 인스턴스 반환."""
    global _signing_service
    if _signing_service is None:
        from app.core.config import settings
        if getattr(settings, 'modusign_is_mock', True) or not getattr(settings, 'modusign_api_key', None):
            _signing_service = MockSigningService()
        else:
            _signing_service = ModusignService(
                api_key=settings.modusign_api_key,
                api_url=getattr(settings, 'modusign_api_url', 'https://api.modusign.co.kr'),
                callback_url=getattr(settings, 'modusign_callback_url', None),
            )
    return _signing_service
