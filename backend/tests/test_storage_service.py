"""Storage Service 단위 테스트."""
import io
import pytest
from pathlib import Path
from unittest.mock import patch


# ── 헬퍼 ────────────────────────────────────────────────────────────────────


class MockUploadFile:
    """FastAPI UploadFile 목(mock) 구현체."""

    def __init__(self, content: bytes, filename: str, content_type: str):
        self.filename = filename
        self.content_type = content_type
        self.file = io.BytesIO(content)

    async def read(self) -> bytes:
        return self.file.read()

    async def seek(self, offset: int) -> None:
        self.file.seek(offset)


# Magic byte 상수
JPEG_MAGIC = b"\xff\xd8\xff\xe0" + b"\x00" * 8          # JPEG SOI + APP0
PNG_MAGIC  = b"\x89PNG\r\n\x1a\n" + b"\x00" * 8          # PNG signature
WEBP_MAGIC = b"RIFF" + b"\x00\x00\x00\x00" + b"WEBP"     # RIFF....WEBP (12 bytes)
RANDOM_BYTES = b"NOT_AN_IMAGE_AT_ALL" + b"\x00" * 20


# ── 1. Protocol 적합성 ────────────────────────────────────────────────────────


def test_local_storage_service_implements_protocol(tmp_path):
    """LocalStorageService가 StorageServiceProtocol을 만족하는지 검증."""
    from app.services.storage import LocalStorageService, StorageServiceProtocol

    svc = LocalStorageService(base_path=str(tmp_path))
    assert isinstance(svc, StorageServiceProtocol)


# ── 2. sanitize_path() ───────────────────────────────────────────────────────


def test_sanitize_path_normal(tmp_path):
    """정상 경로는 base_path 내부의 resolved Path를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    result = svc.sanitize_path("photos/project1/visit1/file.jpg")

    assert str(result).startswith(str(tmp_path.resolve()))


def test_sanitize_path_traversal_single_dotdot(tmp_path):
    """../etc/passwd 형태의 경로 순회 공격은 ValueError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(ValueError, match="경로 순회"):
        svc.sanitize_path("../etc/passwd")


def test_sanitize_path_traversal_double_dotdot(tmp_path):
    """../../secret 형태의 깊은 경로 순회 공격도 ValueError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(ValueError, match="경로 순회"):
        svc.sanitize_path("../../secret")


def test_sanitize_path_traversal_embedded_dotdot(tmp_path):
    """내부에 .. 가 포함된 경로도 순회 공격으로 차단해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(ValueError, match="경로 순회"):
        svc.sanitize_path("photos/../../../etc/passwd")


# ── 3. _validate_no_webshell() ───────────────────────────────────────────────


def test_validate_no_webshell_allows_normal_image(tmp_path):
    """정상 이미지 파일명(photo.jpg)은 예외 없이 통과해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    svc._validate_no_webshell("photo.jpg")  # 예외 없어야 함


def test_validate_no_webshell_blocks_php(tmp_path):
    """shell.php 파일은 StorageValidationError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService
    from app.core.exceptions import StorageValidationError

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(StorageValidationError):
        svc._validate_no_webshell("shell.php")


def test_validate_no_webshell_blocks_jsp(tmp_path):
    """shell.jsp 파일은 StorageValidationError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService
    from app.core.exceptions import StorageValidationError

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(StorageValidationError):
        svc._validate_no_webshell("shell.jsp")


def test_validate_no_webshell_blocks_py(tmp_path):
    """script.py 파일은 StorageValidationError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService
    from app.core.exceptions import StorageValidationError

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(StorageValidationError):
        svc._validate_no_webshell("script.py")


def test_validate_no_webshell_blocks_double_extension(tmp_path):
    """evil.php.jpg 이중 확장자 공격은 StorageValidationError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService
    from app.core.exceptions import StorageValidationError

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(StorageValidationError):
        svc._validate_no_webshell("evil.php.jpg")


def test_validate_no_webshell_blocks_htaccess(tmp_path):
    """.htaccess 파일은 StorageValidationError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService
    from app.core.exceptions import StorageValidationError

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(StorageValidationError):
        svc._validate_no_webshell(".htaccess")


def test_validate_no_webshell_blocks_uppercase_php(tmp_path):
    """file.PHP (대문자) 도 대소문자 무관하게 차단해야 한다."""
    from app.services.storage import LocalStorageService
    from app.core.exceptions import StorageValidationError

    svc = LocalStorageService(base_path=str(tmp_path))
    with pytest.raises(StorageValidationError):
        svc._validate_no_webshell("file.PHP")


def test_validate_no_webshell_allows_pdf(tmp_path):
    """document.pdf는 예외 없이 통과해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    svc._validate_no_webshell("document.pdf")  # 예외 없어야 함


def test_validate_no_webshell_allows_hwp(tmp_path):
    """contract.hwp는 예외 없이 통과해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    svc._validate_no_webshell("contract.hwp")  # 예외 없어야 함


# ── 4. validate_image() ──────────────────────────────────────────────────────


def test_validate_image_jpeg_valid(tmp_path):
    """올바른 JPEG magic byte + image/jpeg content_type → True를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(JPEG_MAGIC, "photo.jpg", "image/jpeg")
    assert svc.validate_image(mock_file) is True


def test_validate_image_png_valid(tmp_path):
    """올바른 PNG magic byte + image/png content_type → True를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(PNG_MAGIC, "image.png", "image/png")
    assert svc.validate_image(mock_file) is True


def test_validate_image_jpeg_wrong_content_type(tmp_path):
    """JPEG 내용이지만 content_type이 image/png이면 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(JPEG_MAGIC, "photo.jpg", "image/png")
    assert svc.validate_image(mock_file) is False


def test_validate_image_no_content_type(tmp_path):
    """content_type이 없으면 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(JPEG_MAGIC, "photo.jpg", "")
    assert svc.validate_image(mock_file) is False


def test_validate_image_text_with_jpeg_content_type(tmp_path):
    """텍스트 내용이지만 image/jpeg content_type이면 magic byte 불일치로 False여야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(b"This is plain text content.", "fake.jpg", "image/jpeg")
    assert svc.validate_image(mock_file) is False


def test_validate_image_webp_valid(tmp_path):
    """올바른 WebP magic byte(RIFF....WEBP) + image/webp content_type → True여야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(WEBP_MAGIC + b"\x00" * 100, "image.webp", "image/webp")
    assert svc.validate_image(mock_file) is True


def test_validate_image_random_bytes_jpeg(tmp_path):
    """랜덤 바이트 + image/jpeg content_type → magic byte 불일치로 False여야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(RANDOM_BYTES, "fake.jpg", "image/jpeg")
    assert svc.validate_image(mock_file) is False


# ── 5. save_file() ───────────────────────────────────────────────────────────


async def test_save_file_returns_relative_path(tmp_path):
    """파일 저장 시 상대 경로 문자열을 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(b"file content", "test.jpg", "image/jpeg")

    result = await svc.save_file(mock_file, category="photos", subfolder="proj1/visit1")

    assert isinstance(result, str)
    assert "photos" in result
    assert "proj1" in result


async def test_save_file_actually_creates_file(tmp_path):
    """save_file 후 반환된 경로에 실제 파일이 존재해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    content = b"hello world"
    mock_file = MockUploadFile(content, "hello.txt", "text/plain")

    relative_path = await svc.save_file(mock_file, category="temp", subfolder="test")

    full_path = tmp_path / relative_path
    assert full_path.exists()
    assert full_path.read_bytes() == content


async def test_save_file_webshell_raises_before_writing(tmp_path):
    """웹쉘 파일명은 StorageValidationError가 발생하고 파일이 쓰이지 않아야 한다."""
    from app.services.storage import LocalStorageService
    from app.core.exceptions import StorageValidationError

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(b"<?php system($_GET['cmd']); ?>", "shell.php", "text/plain")

    with pytest.raises(StorageValidationError):
        await svc.save_file(mock_file, category="photos", subfolder="attack")

    php_files = list(tmp_path.rglob("*.php"))
    assert len(php_files) == 0


async def test_save_file_custom_filename_respected(tmp_path):
    """custom_filename 파라미터가 지정되면 해당 파일명으로 저장돼야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(b"signature data", "sig.png", "image/png")
    custom_name = "owner_20260315120000.png"

    result = await svc.save_file(
        mock_file,
        category="signatures",
        subfolder="contract-001",
        custom_filename=custom_name,
    )

    assert result.endswith(custom_name)
    assert (tmp_path / result).exists()


# ── 6. read_file() ───────────────────────────────────────────────────────────


async def test_read_file_returns_correct_bytes(tmp_path):
    """파일을 저장하고 read_file로 읽으면 동일한 내용이 반환돼야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    content = b"contract content bytes"
    mock_file = MockUploadFile(content, "contract.pdf", "application/pdf")

    relative_path = await svc.save_file(mock_file, category="contracts", subfolder="c001")
    read_back = await svc.read_file(relative_path)

    assert read_back == content


async def test_read_file_nonexistent_raises(tmp_path):
    """존재하지 않는 경로에 대해 StorageFileNotFoundError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService
    from app.core.exceptions import StorageFileNotFoundError

    svc = LocalStorageService(base_path=str(tmp_path))

    with pytest.raises(StorageFileNotFoundError):
        await svc.read_file("photos/nonexistent/file.jpg")


async def test_read_file_path_traversal_raises(tmp_path):
    """경로 순회 시도는 ValueError를 발생시켜야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))

    with pytest.raises(ValueError, match="경로 순회"):
        await svc.read_file("../../etc/passwd")


# ── 7. get_url() ─────────────────────────────────────────────────────────────


def test_get_url_forward_slash_path(tmp_path):
    """상대 경로 → /api/v1/files/{path} 형식 URL을 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    url = svc.get_url("photos/proj/visit/file.jpg")

    assert url == "/api/v1/files/photos/proj/visit/file.jpg"


def test_get_url_backslash_normalized(tmp_path):
    """백슬래시(Windows 스타일) 경로도 슬래시로 정규화돼야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    url = svc.get_url("photos\\proj\\visit\\file.jpg")

    assert "\\" not in url
    assert url == "/api/v1/files/photos/proj/visit/file.jpg"


def test_get_url_simple_path(tmp_path):
    """단순 파일명도 올바른 URL 형식으로 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    url = svc.get_url("temp/file.jpg")

    assert url == "/api/v1/files/temp/file.jpg"


# ── 8. delete_file() ─────────────────────────────────────────────────────────


async def test_delete_file_existing_returns_true(tmp_path):
    """존재하는 파일 삭제 시 True를 반환하고 파일이 없어져야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(b"to be deleted", "delete_me.jpg", "image/jpeg")
    relative_path = await svc.save_file(mock_file, category="temp", subfolder="del_test")

    result = await svc.delete_file(relative_path)

    assert result is True
    assert not (tmp_path / relative_path).exists()


async def test_delete_file_nonexistent_returns_false(tmp_path):
    """존재하지 않는 파일 삭제 시 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))

    result = await svc.delete_file("photos/nonexistent/ghost.jpg")

    assert result is False


# ── 9. validate_file_size() ──────────────────────────────────────────────────


def test_validate_file_size_under_limit(tmp_path):
    """10MB 미만 파일은 True를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    small_content = b"x" * (5 * 1024 * 1024)  # 5MB
    mock_file = MockUploadFile(small_content, "small.jpg", "image/jpeg")

    assert svc.validate_file_size(mock_file) is True


def test_validate_file_size_over_limit(tmp_path):
    """10MB 초과 파일은 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    large_content = b"x" * (11 * 1024 * 1024)  # 11MB
    mock_file = MockUploadFile(large_content, "large.jpg", "image/jpeg")

    assert svc.validate_file_size(mock_file) is False


def test_validate_file_size_exactly_at_limit(tmp_path):
    """정확히 10MB 파일은 True를 반환해야 한다 (경계값)."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    exact_content = b"x" * (10 * 1024 * 1024)  # 정확히 10MB
    mock_file = MockUploadFile(exact_content, "exact.jpg", "image/jpeg")

    assert svc.validate_file_size(mock_file) is True


# ── 10. ImageResizeConfig 기본값 ──────────────────────────────────────────────


def test_image_resize_config_defaults():
    """ImageResizeConfig 기본값이 합리적인 값으로 설정돼야 한다."""
    from app.services.storage import ImageResizeConfig

    config = ImageResizeConfig()

    assert config.max_width == 1920
    assert config.max_height == 1080
    assert config.quality == 85
    assert config.format == "JPEG"
    assert config.keep_aspect_ratio is True


def test_image_resize_config_custom_values():
    """ImageResizeConfig에 사용자 정의 값이 올바르게 설정돼야 한다."""
    from app.services.storage import ImageResizeConfig

    config = ImageResizeConfig(max_width=800, max_height=600, quality=70)

    assert config.max_width == 800
    assert config.max_height == 600
    assert config.quality == 70


# ── 11. _resize_image_bytes() Pillow 폴백 ────────────────────────────────────


def test_resize_image_bytes_non_image_returns_original():
    """이미지가 아닌 바이트 입력 시 예외 없이 원본 바이트를 반환해야 한다."""
    from app.services.storage import _resize_image_bytes, ImageResizeConfig

    garbage = b"this is not an image at all 12345"
    config = ImageResizeConfig()

    result = _resize_image_bytes(garbage, config)

    assert result == garbage


def test_resize_image_bytes_pillow_import_error_returns_original():
    """Pillow가 없는 환경에서는 원본 바이트를 그대로 반환해야 한다."""
    from app.services.storage import _resize_image_bytes, ImageResizeConfig
    import builtins

    original_import = builtins.__import__

    def mock_import(name, *args, **kwargs):
        if name == "PIL" or name.startswith("PIL."):
            raise ImportError("No module named 'PIL'")
        return original_import(name, *args, **kwargs)

    config = ImageResizeConfig()
    data = b"fake image data"

    with patch("builtins.__import__", side_effect=mock_import):
        result = _resize_image_bytes(data, config)

    assert result == data


# ── 12. _ensure_directories() ────────────────────────────────────────────────


def test_ensure_directories_creates_subdirs(tmp_path):
    """LocalStorageService 초기화 시 필수 하위 디렉토리들이 생성돼야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))

    expected_dirs = ["photos", "contracts", "signatures", "pricebooks", "temp"]
    for dirname in expected_dirs:
        assert (tmp_path / dirname).is_dir(), f"{dirname} 디렉토리가 없음"


# ── 13. file_exists() ────────────────────────────────────────────────────────


async def test_file_exists_true_after_save(tmp_path):
    """파일 저장 후 file_exists가 True를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(b"exists check", "check.txt", "text/plain")
    relative_path = await svc.save_file(mock_file, category="temp", subfolder="exist_test")

    assert svc.file_exists(relative_path) is True


async def test_file_exists_false_after_delete(tmp_path):
    """파일 삭제 후 file_exists가 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    mock_file = MockUploadFile(b"to delete", "del.txt", "text/plain")
    relative_path = await svc.save_file(mock_file, category="temp", subfolder="del_test2")

    await svc.delete_file(relative_path)

    assert svc.file_exists(relative_path) is False


def test_file_exists_false_for_nonexistent(tmp_path):
    """존재하지 않는 경로에 대해 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))

    assert svc.file_exists("photos/does/not/exist.jpg") is False


# ── 14. save_bytes() ─────────────────────────────────────────────────────────


async def test_save_bytes_creates_file(tmp_path):
    """save_bytes로 저장한 데이터가 파일로 올바르게 저장돼야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    data = b"raw bytes data 12345"
    filename = "output.bin"

    relative_path = await svc.save_bytes(
        data=data, category="temp", subfolder="bytes_test", filename=filename
    )

    full_path = tmp_path / relative_path
    assert full_path.exists()
    assert full_path.read_bytes() == data


async def test_save_bytes_returns_relative_path(tmp_path):
    """save_bytes가 올바른 상대 경로를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))

    relative_path = await svc.save_bytes(
        data=b"test", category="photos", subfolder="p1/v1", filename="img.jpg"
    )

    assert "photos" in relative_path
    assert "p1" in relative_path
    assert relative_path.endswith("img.jpg")


# ── 15. delete_directory() ───────────────────────────────────────────────────


async def test_delete_directory_removes_all_contents(tmp_path):
    """디렉토리 삭제 시 그 안의 파일도 모두 제거돼야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    for i in range(3):
        mock_file = MockUploadFile(f"content {i}".encode(), f"file{i}.txt", "text/plain")
        await svc.save_file(mock_file, category="photos", subfolder="proj_del/visit1")

    result = await svc.delete_directory("photos/proj_del")

    assert result is True
    assert not (tmp_path / "photos" / "proj_del").exists()


async def test_delete_directory_nonexistent_returns_false(tmp_path):
    """존재하지 않는 디렉토리 삭제 시 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))

    result = await svc.delete_directory("photos/nonexistent_dir")

    assert result is False


# ── 16. get_storage_service() 싱글턴 ─────────────────────────────────────────


def test_get_storage_service_returns_protocol_instance():
    """get_storage_service()가 StorageServiceProtocol 인스턴스를 반환해야 한다."""
    from app.services.storage import get_storage_service, StorageServiceProtocol

    svc = get_storage_service()
    assert isinstance(svc, StorageServiceProtocol)


def test_get_storage_service_singleton():
    """get_storage_service()를 두 번 호출하면 동일한 인스턴스를 반환해야 한다."""
    from app.services.storage import get_storage_service

    svc1 = get_storage_service()
    svc2 = get_storage_service()
    assert svc1 is svc2


# ── 17. StorageService 하위호환 alias ────────────────────────────────────────


def test_storage_service_alias_is_local_storage_service():
    """StorageService가 LocalStorageService의 alias임을 확인해야 한다."""
    from app.services.storage import StorageService, LocalStorageService

    assert StorageService is LocalStorageService


# ── 18. _check_magic_bytes() 세부 테스트 ─────────────────────────────────────


def test_check_magic_bytes_webp_valid(tmp_path):
    """RIFF....WEBP 형식의 WebP magic byte 검증이 True를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    result = svc._check_magic_bytes("image/webp", WEBP_MAGIC)

    assert result is True


def test_check_magic_bytes_webp_invalid_header(tmp_path):
    """RIFF로 시작하지만 WEBP가 없는 경우 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    non_webp = b"RIFF" + b"\x00\x00\x00\x00" + b"WAVE"  # WAV 파일
    result = svc._check_magic_bytes("image/webp", non_webp)

    assert result is False


def test_check_magic_bytes_unknown_content_type(tmp_path):
    """알 수 없는 content_type은 False를 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    result = svc._check_magic_bytes("application/octet-stream", JPEG_MAGIC)

    assert result is False


# ── 19. _get_extension() ─────────────────────────────────────────────────────


def test_get_extension_with_extension(tmp_path):
    """확장자가 있는 파일명에서 올바른 확장자(소문자)를 추출해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    assert svc._get_extension("photo.JPG") == ".jpg"


def test_get_extension_without_extension(tmp_path):
    """확장자가 없는 파일명은 빈 문자열을 반환해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    assert svc._get_extension("noextension") == ""


def test_get_extension_multiple_dots(tmp_path):
    """여러 점이 있는 파일명은 마지막 확장자만 추출해야 한다."""
    from app.services.storage import LocalStorageService

    svc = LocalStorageService(base_path=str(tmp_path))
    assert svc._get_extension("archive.tar.gz") == ".gz"
