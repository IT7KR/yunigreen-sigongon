"""파일 스토리지 서비스."""
import uuid
import shutil
import logging
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Protocol, runtime_checkable
from datetime import datetime

from fastapi import UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)


@runtime_checkable
class StorageServiceProtocol(Protocol):
    """스토리지 서비스 인터페이스."""

    async def save_file(
        self,
        file: UploadFile,
        category: str,
        subfolder: str,
        custom_filename: Optional[str] = None,
    ) -> str: ...

    async def save_bytes(
        self,
        data: bytes,
        category: str,
        subfolder: str,
        filename: str,
    ) -> str: ...

    async def read_file(self, relative_path: str) -> bytes: ...

    async def delete_file(self, relative_path: str) -> bool: ...

    async def delete_directory(self, relative_path: str) -> bool: ...

    def file_exists(self, relative_path: str) -> bool: ...

    def get_url(self, relative_path: str) -> str: ...

    def validate_image(self, file: UploadFile) -> bool: ...

    def validate_file_size(self, file: UploadFile) -> bool: ...


@dataclass
class ImageResizeConfig:
    """이미지 리사이징 설정."""

    max_width: int = 1920
    max_height: int = 1080
    quality: int = 85          # JPEG 품질 (1-95)
    format: str = "JPEG"       # 저장 포맷
    keep_aspect_ratio: bool = True


def _resize_image_bytes(data: bytes, config: ImageResizeConfig) -> bytes:
    """이미지 바이트를 리사이징하여 반환. Pillow 미설치 시 원본 반환."""
    try:
        from PIL import Image
        import io as _io
        img = Image.open(_io.BytesIO(data))
        # EXIF orientation 보정
        try:
            from PIL import ImageOps
            img = ImageOps.exif_transpose(img)
        except Exception:
            pass
        # 리사이징 필요 여부 판단
        if img.width > config.max_width or img.height > config.max_height:
            img.thumbnail(
                (config.max_width, config.max_height),
                Image.Resampling.LANCZOS,
            )
        # RGB 변환 (PNG RGBA → JPEG 변환 시 필요)
        if config.format == "JPEG" and img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
        buf = _io.BytesIO()
        img.save(buf, format=config.format, quality=config.quality, optimize=True)
        return buf.getvalue()
    except ImportError:
        logger.warning("Pillow 미설치 - 이미지 리사이징 스킵")
        return data
    except Exception as e:
        logger.warning(f"이미지 리사이징 실패, 원본 사용: {e}")
        return data


class LocalStorageService:
    """로컬 파일 스토리지 서비스."""

    # Magic bytes for allowed image types
    _IMAGE_MAGIC_BYTES: dict[str, list[bytes]] = {
        "image/jpeg": [b"\xff\xd8\xff"],
        "image/png": [b"\x89PNG\r\n\x1a\n"],
        "image/webp": [b"RIFF", b"WEBP"],  # RIFF....WEBP
        "image/gif": [b"GIF87a", b"GIF89a"],
    }

    # Blocked dangerous extensions (웹쉘 차단)
    _DANGEROUS_EXTENSIONS: frozenset[str] = frozenset({
        ".php", ".php3", ".php4", ".php5", ".phtml",
        ".jsp", ".jspx", ".asp", ".aspx", ".ascx",
        ".py", ".rb", ".pl", ".sh", ".bash", ".cgi",
        ".exe", ".dll", ".so", ".bat", ".cmd", ".ps1",
        ".htaccess", ".htpasswd",
        ".shtml", ".shtm",
    })

    def __init__(self, base_path: Optional[str] = None):
        self.base_path = Path(base_path or settings.upload_dir)
        self._ensure_directories()

    def _ensure_directories(self) -> None:
        """기본 디렉토리 구조 생성."""
        directories = [
            self.base_path,
            self.base_path / "photos",
            self.base_path / "contracts",
            self.base_path / "signatures",
            self.base_path / "pricebooks",
            self.base_path / "temp",
        ]
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)

    def sanitize_path(self, relative_path: str) -> Path:
        """경로 순회 공격 방지: base_path 내부인지 검증."""
        resolved = (self.base_path / relative_path).resolve()
        base_resolved = self.base_path.resolve()
        if not str(resolved).startswith(str(base_resolved)):
            raise ValueError(f"경로 순회 시도가 감지됐어요: {relative_path}")
        return resolved

    # 내부 호출용 alias
    _sanitize_path = sanitize_path

    def _get_absolute_path(self, relative_path: str) -> Path:
        """상대 경로를 절대 경로로 변환 (내부용)."""
        return self.base_path / relative_path

    def _check_magic_bytes(self, content_type: str, header: bytes) -> bool:
        """Magic byte로 실제 파일 타입 검증."""
        magic_list = self._IMAGE_MAGIC_BYTES.get(content_type)
        if not magic_list:
            return False
        # WebP는 특수 처리: RIFF....WEBP 형식
        if content_type == "image/webp":
            return header[:4] == b"RIFF" and header[8:12] == b"WEBP"
        return any(header[:len(magic)] == magic for magic in magic_list)

    def _validate_no_webshell(self, filename: str) -> None:
        """웹쉘 업로드 차단: 위험한 확장자 거부."""
        if not filename:
            return
        name_lower = filename.lower()
        # 다중 확장자 공격 방지 (e.g., shell.php.jpg)
        parts = name_lower.split(".")
        for part in parts[1:]:  # 첫 번째 부분(파일명)은 제외
            if f".{part}" in self._DANGEROUS_EXTENSIONS:
                from app.core.exceptions import StorageValidationError
                raise StorageValidationError(
                    f"업로드할 수 없는 파일 형식이에요. (.{part})"
                )

    # ── 하위호환 편의 메서드 ─────────────────────────────────────────

    async def save_photo(self, file: UploadFile, project_id: str, visit_id: str) -> str:
        """사진 파일 저장."""
        return await self.save_file(file=file, category="photos", subfolder=f"{project_id}/{visit_id}")

    async def save_contract(self, file: UploadFile, contract_id: str) -> str:
        """계약서 파일 저장."""
        return await self.save_file(file=file, category="contracts", subfolder=contract_id)

    async def save_signature(self, file: UploadFile, contract_id: str, signer_type: str) -> str:
        """서명 이미지 저장."""
        return await self.save_file(
            file=file,
            category="signatures",
            subfolder=contract_id,
            custom_filename=f"{signer_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png",
        )

    async def save_pricebook(self, file: UploadFile, organization_id: str) -> str:
        """단가표 PDF 저장."""
        return await self.save_file(file=file, category="pricebooks", subfolder=organization_id)

    async def save_photo_with_resize(
        self,
        file: UploadFile,
        project_id: str,
        visit_id: str,
        resize_config: Optional[ImageResizeConfig] = None,
    ) -> str:
        """사진 파일 저장 (선택적 리사이징 지원).

        Args:
            resize_config: None이면 리사이징 없이 원본 저장.
                           기본값(ImageResizeConfig())이면 1920x1080, JPEG 85% 품질.
        """
        if resize_config is None:
            return await self.save_photo(file, project_id, visit_id)

        content = await file.read()
        await file.seek(0)

        resized = _resize_image_bytes(content, resize_config)

        # 리사이징된 bytes로 저장
        ext = ".jpg" if resize_config.format == "JPEG" else f".{resize_config.format.lower()}"
        filename = f"{uuid.uuid4().hex}{ext}"
        return await self.save_bytes(
            data=resized,
            category="photos",
            subfolder=f"{project_id}/{visit_id}",
            filename=filename,
        )

    # ── StorageServiceProtocol 구현 ──────────────────────────────────

    async def save_file(
        self,
        file: UploadFile,
        category: str,
        subfolder: str,
        custom_filename: Optional[str] = None,
    ) -> str:
        """파일 저장 공통 로직."""
        # 웹쉘 차단 검사
        if file.filename:
            self._validate_no_webshell(file.filename)

        target_dir = self.base_path / category / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)

        if custom_filename:
            filename = custom_filename
        else:
            ext = self._get_extension(file.filename or "")
            filename = f"{uuid.uuid4().hex}{ext}"

        file_path = target_dir / filename

        try:
            content = await file.read()
            with open(file_path, "wb") as f:
                f.write(content)

            relative_path = str(file_path.relative_to(self.base_path))
            logger.info(f"File saved: {relative_path}")
            return relative_path

        except Exception as e:
            logger.error(f"Failed to save file: {e}")
            raise
        finally:
            await file.seek(0)

    async def save_bytes(self, data: bytes, category: str, subfolder: str, filename: str) -> str:
        """바이트 데이터 직접 저장."""
        target_dir = self.base_path / category / subfolder
        target_dir.mkdir(parents=True, exist_ok=True)

        file_path = target_dir / filename

        try:
            with open(file_path, "wb") as f:
                f.write(data)

            relative_path = str(file_path.relative_to(self.base_path))
            logger.info(f"Bytes saved: {relative_path}")
            return relative_path

        except Exception as e:
            logger.error(f"Failed to save bytes: {e}")
            raise

    async def read_file(self, relative_path: str) -> bytes:
        """파일 내용 읽기."""
        safe_path = self._sanitize_path(relative_path)
        if not safe_path.exists():
            from app.core.exceptions import StorageFileNotFoundError
            raise StorageFileNotFoundError(relative_path)
        return safe_path.read_bytes()

    async def delete_file(self, relative_path: str) -> bool:
        """파일 삭제."""
        file_path = self.base_path / relative_path
        if not file_path.exists():
            logger.warning(f"File not found for deletion: {relative_path}")
            return False
        try:
            file_path.unlink()
            logger.info(f"File deleted: {relative_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete file: {e}")
            return False

    async def delete_directory(self, relative_path: str) -> bool:
        """디렉토리 및 모든 내용 삭제."""
        dir_path = self.base_path / relative_path
        if not dir_path.exists():
            logger.warning(f"Directory not found for deletion: {relative_path}")
            return False
        try:
            shutil.rmtree(dir_path)
            logger.info(f"Directory deleted: {relative_path}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete directory: {e}")
            return False

    def file_exists(self, relative_path: str) -> bool:
        """파일 존재 여부 확인."""
        return (self.base_path / relative_path).exists()

    def get_url(self, relative_path: str) -> str:
        """파일 접근 URL 반환 (로컬: /api/v1/files/{path})."""
        # Normalize path separators
        normalized = relative_path.replace("\\", "/")
        return f"/api/v1/files/{normalized}"

    def validate_image(self, file: UploadFile) -> bool:
        """이미지 파일 유효성 검증 (Content-Type + magic byte 검사)."""
        if not file.content_type:
            return False
        if file.content_type not in settings.allowed_image_types:
            return False
        # Magic byte 검증: 실제 파일 내용 확인
        try:
            header = file.file.read(12)
            file.file.seek(0)
            return self._check_magic_bytes(file.content_type, header)
        except Exception:
            return False

    def validate_file_size(self, file: UploadFile) -> bool:
        """파일 크기 검증."""
        max_size = settings.max_upload_size_mb * 1024 * 1024
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        return size <= max_size

    def _get_extension(self, filename: str) -> str:
        """파일 확장자 추출."""
        if "." in filename:
            return "." + filename.rsplit(".", 1)[1].lower()
        return ""


# 하위호환: 기존 StorageService import가 깨지지 않도록
StorageService = LocalStorageService


_storage_instance: Optional[StorageServiceProtocol] = None


def get_storage_service() -> StorageServiceProtocol:
    """스토리지 서비스 인스턴스 반환 (팩토리)."""
    global _storage_instance
    if _storage_instance is not None:
        return _storage_instance
    _storage_instance = LocalStorageService()
    return _storage_instance


# 하위호환: 기존 import 깨지지 않음
storage_service: StorageServiceProtocol = get_storage_service()
