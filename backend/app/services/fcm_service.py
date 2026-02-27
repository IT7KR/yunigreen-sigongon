"""FCM 푸시 알림 서비스 (Firebase Cloud Messaging)."""
import logging
from typing import Optional, Protocol, runtime_checkable

logger = logging.getLogger(__name__)


@runtime_checkable
class FCMServiceProtocol(Protocol):
    """FCM 서비스 프로토콜."""

    async def send_to_token(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        """단일 디바이스에 푸시 발송.

        Returns:
            {"success": bool, "message_id": str | None, "error": str | None}
        """
        ...

    async def send_to_tokens(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        """여러 디바이스에 멀티캐스트 푸시 발송.

        Returns:
            {"success_count": int, "failure_count": int, "responses": list}
        """
        ...

    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        """FCM 토픽 구독자 전체에 발송."""
        ...


class MockFCMService:
    """Mock FCM 서비스 (개발/테스트용).

    실제 Firebase를 호출하지 않고 콘솔에 출력합니다.
    """

    async def send_to_token(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        masked = f"{token[:8]}...{token[-4:]}" if len(token) > 12 else token
        logger.info(
            "[MockFCM] send_to_token → token=%s title=%s body=%s data=%s",
            masked, title, body, data,
        )
        return {"success": True, "message_id": f"mock_msg_{masked}", "error": None}

    async def send_to_tokens(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        logger.info("[MockFCM] send_to_tokens → count=%d title=%s", len(tokens), title)
        return {
            "success_count": len(tokens),
            "failure_count": 0,
            "responses": [{"success": True} for _ in tokens],
        }

    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        logger.info("[MockFCM] send_to_topic → topic=%s title=%s", topic, title)
        return {"success": True, "message_id": f"mock_topic_{topic}", "error": None}


class RealFCMService:
    """Firebase Cloud Messaging 실 연동 서비스.

    사전 준비:
    1. pip install firebase-admin
    2. Firebase Console에서 서비스 계정 키 JSON 다운로드
    3. 환경변수 FIREBASE_CREDENTIALS_PATH 또는 FIREBASE_CREDENTIALS_JSON 설정
       (또는 Settings.firebase_credentials_path / firebase_credentials_json)
    """

    def __init__(
        self,
        credentials_path: Optional[str] = None,
        credentials_json: Optional[str] = None,
    ) -> None:
        self._initialized = False
        self._credentials_path = credentials_path
        self._credentials_json = credentials_json

    def _ensure_initialized(self) -> None:
        """firebase_admin 초기화 (지연 초기화)."""
        if self._initialized:
            return

        try:
            import firebase_admin
            from firebase_admin import credentials

            if firebase_admin._DEFAULT_APP_NAME not in firebase_admin._apps:
                if self._credentials_json:
                    import json
                    cred = credentials.Certificate(json.loads(self._credentials_json))
                elif self._credentials_path:
                    cred = credentials.Certificate(self._credentials_path)
                else:
                    cred = credentials.ApplicationDefault()

                firebase_admin.initialize_app(cred)

            self._initialized = True
        except ImportError as e:
            raise RuntimeError(
                "firebase-admin 패키지가 필요합니다. "
                "pip install firebase-admin 을 실행하세요."
            ) from e

    async def send_to_token(
        self,
        token: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        self._ensure_initialized()
        try:
            from firebase_admin import messaging
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={k: str(v) for k, v in (data or {}).items()},
                token=token,
                apns=messaging.APNSConfig(
                    payload=messaging.APNSPayload(
                        aps=messaging.Aps(sound="default"),
                    ),
                ),
                android=messaging.AndroidConfig(
                    priority="high",
                    notification=messaging.AndroidNotification(
                        sound="default",
                        channel_id="sigongon_default",
                    ),
                ),
            )
            message_id = messaging.send(message)
            logger.info("[FCM] Sent, message_id=%s", message_id)
            return {"success": True, "message_id": message_id, "error": None}
        except Exception as e:
            logger.error("[FCM] send_to_token failed: %s", e)
            return {"success": False, "message_id": None, "error": str(e)}

    async def send_to_tokens(
        self,
        tokens: list[str],
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        self._ensure_initialized()
        try:
            from firebase_admin import messaging
            msg = messaging.MulticastMessage(
                notification=messaging.Notification(title=title, body=body),
                data={k: str(v) for k, v in (data or {}).items()},
                tokens=tokens,
            )
            batch = messaging.send_each_for_multicast(msg)
            logger.info(
                "[FCM] Multicast: success=%d, failure=%d",
                batch.success_count, batch.failure_count,
            )
            return {
                "success_count": batch.success_count,
                "failure_count": batch.failure_count,
                "responses": [
                    {
                        "success": r.success,
                        "message_id": r.message_id,
                        "error": str(r.exception) if r.exception else None,
                    }
                    for r in batch.responses
                ],
            }
        except Exception as e:
            logger.error("[FCM] send_to_tokens failed: %s", e)
            return {
                "success_count": 0,
                "failure_count": len(tokens),
                "responses": [{"success": False, "error": str(e)} for _ in tokens],
            }

    async def send_to_topic(
        self,
        topic: str,
        title: str,
        body: str,
        data: Optional[dict] = None,
    ) -> dict:
        self._ensure_initialized()
        try:
            from firebase_admin import messaging
            message = messaging.Message(
                notification=messaging.Notification(title=title, body=body),
                data={k: str(v) for k, v in (data or {}).items()},
                topic=topic,
            )
            message_id = messaging.send(message)
            return {"success": True, "message_id": message_id, "error": None}
        except Exception as e:
            logger.error("[FCM] send_to_topic failed: %s", e)
            return {"success": False, "message_id": None, "error": str(e)}


# 싱글톤 인스턴스 (기존 서비스 Adapter 패턴과 동일)
_fcm_service: Optional[FCMServiceProtocol] = None


def get_fcm_service() -> FCMServiceProtocol:
    """FCM 서비스 팩토리 (싱글톤).

    settings.firebase_is_mock = False이고
    credentials_path 또는 credentials_json이 설정된 경우 실 서비스 반환.
    그 외 Mock 반환.
    """
    global _fcm_service
    if _fcm_service is not None:
        return _fcm_service

    from app.core.config import settings

    if not settings.firebase_is_mock and (
        settings.firebase_credentials_path or settings.firebase_credentials_json
    ):
        logger.info("[FCM] 실 Firebase 서비스 사용")
        _fcm_service = RealFCMService(
            credentials_path=settings.firebase_credentials_path,
            credentials_json=settings.firebase_credentials_json,
        )
    else:
        logger.info("[FCM] Mock 서비스 사용 (firebase_is_mock=True 또는 credentials 미설정)")
        _fcm_service = MockFCMService()

    return _fcm_service
