"""애플리케이션 설정 관리."""
from functools import lru_cache
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """애플리케이션 설정."""
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
    )
    
    # 애플리케이션
    app_name: str = "Yunigreen API"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # 데이터베이스 (비동기)
    database_url: str = "postgresql+asyncpg://postgres:password@db:5432/yunigreen"
    
    # JWT 인증
    jwt_secret: str = "your-super-secret-key-change-in-production"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_days: int = 7
    
    # Gemini AI
    gemini_api_key: Optional[str] = None
    gemini_model: str = "gemini-2.0-flash"  # 또는 gemini-3.0-flash 사용 가능 시
    
    # 파일 업로드
    upload_dir: str = "/app/uploads"
    max_upload_size_mb: int = 10
    allowed_image_types: list[str] = ["image/jpeg", "image/png", "image/webp"]
    
    # CORS
    cors_origins: list[str] = ["http://localhost:3000"]
    
    @property
    def async_database_url(self) -> str:
        """비동기 데이터베이스 URL 반환."""
        # postgresql:// → postgresql+asyncpg://
        if self.database_url.startswith("postgresql://"):
            return self.database_url.replace(
                "postgresql://", "postgresql+asyncpg://"
            )
        return self.database_url


@lru_cache
def get_settings() -> Settings:
    """설정 인스턴스 반환 (캐시됨)."""
    return Settings()


settings = get_settings()
