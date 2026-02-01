"""SMS 인증 서비스 (Aligo)."""
import random
import time
from abc import ABC, abstractmethod
from typing import Optional


class SMSService(ABC):
    """SMS 서비스 추상 클래스."""

    @abstractmethod
    async def send_otp(self, phone: str) -> str:
        """OTP 발송. request_id를 반환."""
        ...

    @abstractmethod
    async def verify_otp(self, request_id: str, code: str) -> bool:
        """OTP 검증."""
        ...


class MockSMSService(SMSService):
    """Mock SMS 서비스 (개발/테스트용).

    OTP를 메모리에 저장하고, 콘솔에 출력합니다.
    """

    def __init__(self) -> None:
        # {request_id: {"phone": str, "code": str, "expires_at": float, "attempts": int}}
        self._store: dict[str, dict] = {}

    async def send_otp(self, phone: str) -> str:
        code = f"{random.randint(0, 999999):06d}"
        request_id = f"otp_{random.randint(100000, 999999)}_{int(time.time())}"
        self._store[request_id] = {
            "phone": phone,
            "code": code,
            "expires_at": time.time() + 300,  # 5분 TTL
            "attempts": 0,
        }
        print(f"[MockSMS] OTP for {phone}: {code} (request_id: {request_id})")
        return request_id

    async def verify_otp(self, request_id: str, code: str) -> bool:
        entry = self._store.get(request_id)
        if not entry:
            return False
        if time.time() > entry["expires_at"]:
            del self._store[request_id]
            return False
        entry["attempts"] += 1
        if entry["attempts"] > 3:
            del self._store[request_id]
            return False
        if entry["code"] != code:
            return False
        del self._store[request_id]
        return True


class AligoSMSService(SMSService):
    """Aligo SMS 서비스 (실제 연동용 stub)."""

    def __init__(self, api_key: str, user_id: str, sender: str) -> None:
        self.api_key = api_key
        self.user_id = user_id
        self.sender = sender

    async def send_otp(self, phone: str) -> str:
        # TODO: 실제 Aligo API 연동
        raise NotImplementedError("Aligo API 연동 미구현")

    async def verify_otp(self, request_id: str, code: str) -> bool:
        # TODO: 실제 Aligo API 연동
        raise NotImplementedError("Aligo API 연동 미구현")


# 싱글턴 인스턴스
_sms_service: Optional[SMSService] = None


def get_sms_service() -> SMSService:
    """SMS 서비스 인스턴스 반환."""
    global _sms_service
    if _sms_service is None:
        from app.core.config import settings
        if settings.aligo_is_mock or not settings.aligo_api_key:
            _sms_service = MockSMSService()
        else:
            _sms_service = AligoSMSService(
                api_key=settings.aligo_api_key,
                user_id=settings.aligo_user_id or "",
                sender=settings.aligo_sender or "",
            )
    return _sms_service
