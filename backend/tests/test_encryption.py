"""Fernet 암호화 유틸리티 테스트."""
import os

import pytest
from cryptography.fernet import Fernet

# 테스트용 유효한 Fernet 키를 모듈 임포트 전에 설정
TEST_KEY = Fernet.generate_key().decode()
os.environ["FIELD_ENCRYPTION_KEY"] = TEST_KEY

import app.core.encryption as enc_module
from app.core.encryption import EncryptedString, decrypt_value, encrypt_value, mask_ssn


@pytest.fixture(autouse=True)
def reset_fernet_cache():
    """각 테스트 전후로 Fernet 캐시를 초기화하여 테스트 간 격리를 보장합니다."""
    enc_module._fernet_cache = None
    os.environ["FIELD_ENCRYPTION_KEY"] = TEST_KEY
    yield
    enc_module._fernet_cache = None
    os.environ["FIELD_ENCRYPTION_KEY"] = TEST_KEY


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


def test_mask_ssn_short_input():
    """7자 미만의 유효하지 않은 입력은 원본을 그대로 반환해야 한다."""
    short = "12345"
    assert mask_ssn(short) == short


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


def test_missing_key_raises_error(monkeypatch):
    """FIELD_ENCRYPTION_KEY가 없으면 RuntimeError가 발생해야 한다."""
    monkeypatch.delenv("FIELD_ENCRYPTION_KEY", raising=False)
    enc_module._fernet_cache = None
    with pytest.raises(RuntimeError, match="FIELD_ENCRYPTION_KEY"):
        enc_module._get_fernet()


def test_invalid_key_raises_error(monkeypatch):
    """유효하지 않은 Fernet 키면 RuntimeError가 발생해야 한다."""
    monkeypatch.setenv("FIELD_ENCRYPTION_KEY", "this-is-not-a-valid-fernet-key")
    enc_module._fernet_cache = None
    with pytest.raises(RuntimeError, match="유효하지 않습니다"):
        enc_module._get_fernet()


def test_decrypt_invalid_token_raises_value_error():
    """잘못된 암호화 데이터 복호화 시 ValueError가 발생해야 한다."""
    with pytest.raises(ValueError, match="복호화에 실패했습니다"):
        decrypt_value("this-is-not-encrypted-data")


def test_fernet_cache_reuses_instance():
    """동일한 키로 _get_fernet()을 두 번 호출하면 같은 인스턴스를 반환해야 한다."""
    fernet1 = enc_module._get_fernet()
    fernet2 = enc_module._get_fernet()
    assert fernet1 is fernet2


def test_fernet_cache_refreshes_on_key_change(monkeypatch):
    """키가 변경되면 새 Fernet 인스턴스를 생성해야 한다."""
    fernet1 = enc_module._get_fernet()
    new_key = Fernet.generate_key().decode()
    monkeypatch.setenv("FIELD_ENCRYPTION_KEY", new_key)
    fernet2 = enc_module._get_fernet()
    assert fernet1 is not fernet2
