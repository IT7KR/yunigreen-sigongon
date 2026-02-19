"""SMS 인증 서비스 (Aligo)."""
import logging
import random
import time
from abc import ABC, abstractmethod
from typing import Optional

import httpx


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

    @abstractmethod
    async def send_alimtalk(self, phone: str, template_code: str, variables: dict) -> dict:
        """알림톡 발송. {message_id, success, message} 반환."""
        ...

    @abstractmethod
    async def send_sms(self, phone: str, message: str) -> dict:
        """일반 SMS 발송. {message_id, success, message} 반환."""
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

    async def send_alimtalk(self, phone: str, template_code: str, variables: dict) -> dict:
        msg_id = f"mock_alimtalk_{int(time.time())}"
        print(f"[MockSMS] 알림톡 → {phone} template={template_code} vars={variables}")
        return {"message_id": msg_id, "success": True, "message": "Mock 알림톡 발송 완료"}

    async def send_sms(self, phone: str, message: str) -> dict:
        msg_id = f"mock_sms_{int(time.time())}"
        print(f"[MockSMS] SMS → {phone}: {message}")
        return {"message_id": msg_id, "success": True, "message": "Mock SMS 발송 완료"}


class AligoSMSService(SMSService):
    """Aligo SMS 서비스 (실제 연동용)."""

    ALIGO_SMS_URL = "https://apis.aligo.in/send/"
    ALIGO_ALIMTALK_URL = "https://kakaoapi.aligo.in/akv10/alimtalk/send/"

    def __init__(self, api_key: str, user_id: str, sender: str) -> None:
        self.api_key = api_key
        self.user_id = user_id
        self.sender = sender
        self._logger = logging.getLogger(__name__)
        # In-memory OTP store for Aligo (OTP is sent via SMS, verified locally)
        self._otp_store: dict[str, dict] = {}

    async def send_otp(self, phone: str) -> str:
        """OTP 발송 (알리고 SMS 사용)."""
        code = f"{random.randint(0, 999999):06d}"
        request_id = f"otp_{random.randint(100000, 999999)}_{int(time.time())}"
        self._otp_store[request_id] = {
            "phone": phone,
            "code": code,
            "expires_at": time.time() + 300,
            "attempts": 0,
        }
        message = f"[시공ON] 인증번호는 [{code}]입니다. 5분 내 입력해주세요."
        result = await self.send_sms(phone, message)
        if not result.get("success"):
            self._logger.error(f"OTP SMS 발송 실패: {result}")
        return request_id

    async def verify_otp(self, request_id: str, code: str) -> bool:
        """OTP 검증."""
        entry = self._otp_store.get(request_id)
        if not entry:
            return False
        if time.time() > entry["expires_at"]:
            del self._otp_store[request_id]
            return False
        entry["attempts"] += 1
        if entry["attempts"] > 3:
            del self._otp_store[request_id]
            return False
        if entry["code"] != code:
            return False
        del self._otp_store[request_id]
        return True

    async def send_sms(self, phone: str, message: str) -> dict:
        """일반 SMS 발송."""
        payload = {
            "key": self.api_key,
            "user_id": self.user_id,
            "sender": self.sender,
            "receiver": phone,
            "msg": message,
            "testmode_yn": "N",
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(self.ALIGO_SMS_URL, data=payload)
                data = resp.json()
                success = data.get("result_code") == 1
                if not success:
                    self._logger.error(f"알리고 SMS 발송 실패: {data}")
                return {
                    "message_id": str(data.get("msg_id", "")),
                    "success": success,
                    "message": data.get("message", ""),
                }
            except Exception as e:
                self._logger.error(f"알리고 SMS 연결 오류: {e}")
                return {"message_id": "", "success": False, "message": str(e)}

    async def send_alimtalk(self, phone: str, template_code: str, variables: dict) -> dict:
        """카카오 알림톡 발송."""
        # Build template button/message from variables
        payload = {
            "apikey": self.api_key,
            "userid": self.user_id,
            "senderkey": self.sender,  # 카카오 발신프로필키 (알리고 설정)
            "tpl_code": template_code,
            "receiver_1": phone,
            "recvname_1": variables.get("name", ""),
            "template_params": str(variables),
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            try:
                resp = await client.post(self.ALIGO_ALIMTALK_URL, data=payload)
                data = resp.json()
                success = data.get("code") == 0
                if not success:
                    self._logger.error(f"알리고 알림톡 발송 실패: {data}")
                return {
                    "message_id": str(data.get("info", {}).get("mid", "")),
                    "success": success,
                    "message": data.get("message", ""),
                }
            except Exception as e:
                self._logger.error(f"알리고 알림톡 연결 오류: {e}")
                return {"message_id": "", "success": False, "message": str(e)}


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
