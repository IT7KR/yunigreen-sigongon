"""Fernet 암호화 유틸리티 테스트."""
import os

from cryptography.fernet import Fernet

# 테스트용 유효한 Fernet 키를 모듈 임포트 전에 설정
TEST_KEY = Fernet.generate_key().decode()
os.environ["FIELD_ENCRYPTION_KEY"] = TEST_KEY

from app.core.encryption import EncryptedString, decrypt_value, encrypt_value, mask_ssn


def test_encrypt_decrypt_roundtrip():
    """암호화 후 복호화하면 원본 값이 복원되어야 한다."""
    value = "9001011234567"
    encrypted = encrypt_value(value)
    assert encrypted != value
    assert decrypt_value(encrypted) == value


def test_encrypt_none_returns_none():
    """None 입력 시 None을 반환해야 한다."""
    assert encrypt_value(None) is None
    assert decrypt_value(None) is None


def test_mask_ssn_no_dash():
    """대시 없는 주민등록번호 마스킹."""
    assert mask_ssn("9001011234567") == "900101-1******"


def test_mask_ssn_with_dash():
    """대시 있는 주민등록번호 마스킹."""
    assert mask_ssn("900101-1234567") == "900101-1******"


def test_mask_ssn_none():
    """None 입력 시 None을 반환해야 한다."""
    assert mask_ssn(None) is None


def test_encrypted_string_type_decorator():
    """EncryptedString TypeDecorator의 process_bind_param / process_result_value 동작."""
    col_type = EncryptedString()

    # process_bind_param: None → None
    assert col_type.process_bind_param(None, None) is None

    # process_result_value: None → None
    assert col_type.process_result_value(None, None) is None

    # 암호화 → 복호화 라운드트립
    original = "sensitive-data-12345"
    encrypted = col_type.process_bind_param(original, None)
    assert encrypted != original
    decrypted = col_type.process_result_value(encrypted, None)
    assert decrypted == original


def test_encrypt_various_strings():
    """다양한 문자열 암호화/복호화 테스트."""
    test_values = [
        "hello world",
        "한국어 문자열",
        "1234567890",
        "special!@#$%^&*()",
    ]
    for value in test_values:
        encrypted = encrypt_value(value)
        assert encrypted != value, f"암호화 실패: {value}"
        assert decrypt_value(encrypted) == value, f"복호화 실패: {value}"


def test_missing_key_raises_error():
    """FIELD_ENCRYPTION_KEY가 없으면 RuntimeError가 발생해야 한다."""
    import importlib

    original_key = os.environ.pop("FIELD_ENCRYPTION_KEY", None)
    try:
        import app.core.encryption as enc_module
        try:
            enc_module._get_fernet()
            assert False, "RuntimeError가 발생해야 함"
        except RuntimeError as e:
            assert "FIELD_ENCRYPTION_KEY" in str(e)
    finally:
        # 원래 키 복원
        if original_key:
            os.environ["FIELD_ENCRYPTION_KEY"] = original_key


def test_invalid_key_raises_error():
    """유효하지 않은 Fernet 키면 RuntimeError가 발생해야 한다."""
    os.environ["FIELD_ENCRYPTION_KEY"] = "this-is-not-a-valid-fernet-key"
    try:
        import app.core.encryption as enc_module
        try:
            enc_module._get_fernet()
            assert False, "RuntimeError가 발생해야 함"
        except RuntimeError as e:
            assert "유효하지 않습니다" in str(e)
    finally:
        os.environ["FIELD_ENCRYPTION_KEY"] = TEST_KEY
