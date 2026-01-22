"""파일 스토리지 서비스."""
import uuid
import os
import shutil
import logging
from pathlib import Path
from typing import Optional, BinaryIO
from datetime import datetime

from fastapi import UploadFile

from app.core.config import settings

logger = logging.getLogger(__name__)


class StorageService:
    """로컬 파일 스토리지 서비스."""
    
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
    
    async def save_photo(
        self,
        file: UploadFile,
        project_id: str,
        visit_id: str,
    ) -> str:
        """사진 파일 저장."""
        return await self._save_file(
            file=file,
            category="photos",
            subfolder=f"{project_id}/{visit_id}",
        )
    
    async def save_contract(
        self,
        file: UploadFile,
        contract_id: str,
    ) -> str:
        """계약서 파일 저장."""
        return await self._save_file(
            file=file,
            category="contracts",
            subfolder=contract_id,
        )
    
    async def save_signature(
        self,
        file: UploadFile,
        contract_id: str,
        signer_type: str,
    ) -> str:
        """서명 이미지 저장."""
        return await self._save_file(
            file=file,
            category="signatures",
            subfolder=contract_id,
            custom_filename=f"{signer_type}_{datetime.now().strftime('%Y%m%d%H%M%S')}.png",
        )
    
    async def save_pricebook(
        self,
        file: UploadFile,
        organization_id: str,
    ) -> str:
        """단가표 PDF 저장."""
        return await self._save_file(
            file=file,
            category="pricebooks",
            subfolder=organization_id,
        )
    
    async def _save_file(
        self,
        file: UploadFile,
        category: str,
        subfolder: str,
        custom_filename: Optional[str] = None,
    ) -> str:
        """파일 저장 공통 로직."""
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
    
    async def save_bytes(
        self,
        data: bytes,
        category: str,
        subfolder: str,
        filename: str,
    ) -> str:
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
    
    def get_absolute_path(self, relative_path: str) -> Path:
        """상대 경로를 절대 경로로 변환."""
        return self.base_path / relative_path
    
    def file_exists(self, relative_path: str) -> bool:
        """파일 존재 여부 확인."""
        return (self.base_path / relative_path).exists()
    
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
    
    def _get_extension(self, filename: str) -> str:
        """파일 확장자 추출."""
        if "." in filename:
            return "." + filename.rsplit(".", 1)[1].lower()
        return ""
    
    def validate_image(self, file: UploadFile) -> bool:
        """이미지 파일 유효성 검증."""
        if not file.content_type:
            return False
        
        allowed_types = settings.allowed_image_types
        return file.content_type in allowed_types
    
    def validate_file_size(self, file: UploadFile) -> bool:
        """파일 크기 검증."""
        max_size = settings.max_upload_size_mb * 1024 * 1024
        
        file.file.seek(0, 2)
        size = file.file.tell()
        file.file.seek(0)
        
        return size <= max_size


storage_service = StorageService()
