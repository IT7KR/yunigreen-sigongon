"""필드 암호화 유틸리티 (Fernet 대칭 암호화)."""
import os
from typing import Optional

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import String
from sqlalchemy.types import TypeDecorator

# Fernet 인스턴스 캐시: (key, Fernet 인스턴스) 튜플로 저장하여
# 환경변수 키가 바뀌면 새 인스턴스를 생성합니다.
_fernet_cache: tuple[str, Fernet] | None = None


def _get_fernet() -> Fernet:
    """환경변수에서 Fernet 인스턴스를 반환합니다 (키가 바뀌지 않으면 캐시 사용)."""
    global _fernet_cache

    key = os.environ.get("FIELD_ENCRYPTION_KEY", "")
    if not key:
        raise RuntimeError("FIELD_ENCRYPTION_KEY 환경변수가 설정되지 않았습니다.")

    # 캐시된 인스턴스가 있고 키가 동일하면 재사용
    if _fernet_cache is not None and _fernet_cache[0] == key:
        return _fernet_cache[1]

    try:
        fernet = Fernet(key.encode() if isinstance(key, str) else key)
    except (ValueError, TypeError) as e:
        raise RuntimeError(f"FIELD_ENCRYPTION_KEY가 유효하지 않습니다: {e}")

    _fernet_cache = (key, fernet)
    return fernet


def encrypt_value(value: Optional[str]) -> Optional[str]:
    """문자열 값을 Fernet으로 암호화합니다.

    Args:
        value: 암호화할 문자열. None이면 None을 반환합니다.

    Returns:
        암호화된 문자열 또는 None.
    """
    if value is None:
        return None
    fernet = _get_fernet()
    return fernet.encrypt(value.encode("utf-8")).decode("utf-8")


def decrypt_value(value: Optional[str]) -> Optional[str]:
    """Fernet으로 암호화된 문자열을 복호화합니다.

    Args:
        value: 복호화할 암호화된 문자열. None이면 None을 반환합니다.

    Returns:
        복호화된 문자열 또는 None.

    Raises:
        ValueError: 복호화에 실패한 경우 (잘못된 토큰 또는 키 불일치).
    """
    if value is None:
        return None
    fernet = _get_fernet()
    try:
        return fernet.decrypt(value.encode("utf-8")).decode("utf-8")
    except InvalidToken as e:
        raise ValueError(
            "복호화에 실패했습니다. 암호화 키가 일치하지 않거나 데이터가 손상되었습니다."
        ) from e


def mask_ssn(value: Optional[str]) -> Optional[str]:
    """주민등록번호를 마스킹합니다.

    입력 형식:
        - 대시 없음: "9001011234567"  → "900101-1******"
        - 대시 있음: "900101-1234567" → "900101-1******"

    Args:
        value: 주민등록번호 문자열. None이면 None을 반환합니다.

    Returns:
        마스킹된 주민등록번호 또는 None.
        입력이 너무 짧거나 유효하지 않은 경우(대시 제거 후 7자 미만)에는
        원본 값을 그대로 반환합니다.
    """
    if value is None:
        return None
    # 대시 제거 후 처리
    digits = value.replace("-", "")
    # 유효하지 않은 입력(7자 미만)은 원본 반환 — 의도적 동작
    if len(digits) < 7:
        return value
    front = digits[:6]   # 생년월일 6자리
    gender = digits[6]   # 성별 코드 1자리
    return f"{front}-{gender}******"


class EncryptedString(TypeDecorator):
    """DB 저장 시 자동으로 암호화/복호화하는 SQLAlchemy TypeDecorator.

    컬럼 선언 예시::

        class Worker(SQLModel, table=True):
            ssn: Optional[str] = Field(
                default=None,
                sa_type=EncryptedString(),
            )

    암호화된 텍스트는 평문보다 길기 때문에 내부 저장 타입은 String(500)입니다.
    """

    impl = String(500)
    cache_ok = True

    def process_bind_param(self, value: Optional[str], dialect) -> Optional[str]:
        """Python → DB: 암호화."""
        return encrypt_value(value)

    def process_result_value(self, value: Optional[str], dialect) -> Optional[str]:
        """DB → Python: 복호화."""
        return decrypt_value(value)
