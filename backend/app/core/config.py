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
    app_name: str = "SigongOn API"
    app_version: str = "0.1.0"
    debug: bool = False
    
    # 데이터베이스 (비동기)
    database_url: str = "postgresql+asyncpg://postgres:password@db:5432/sigongon"
    
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
    harness_data_dir: str = ".runtime/harness_runs"
    
    # CORS
    cors_origins: list[str] = [
        "http://localhost:3000",
        "http://localhost:3033",
        "http://localhost:3034",
        "http://localhost:3133",
        "http://localhost:3134",
    ]

    # Snowflake ID
    snowflake_worker_id: int = 1

    # Toss Payments (토스페이먼츠)
    toss_client_key: Optional[str] = None
    toss_secret_key: Optional[str] = None
    toss_webhook_secret: Optional[str] = None

    # Popbill (팝빌 세금계산서)
    popbill_link_id: Optional[str] = None
    popbill_secret_key: Optional[str] = None
    popbill_corp_num: Optional[str] = None  # 유니그린 사업자번호
    popbill_is_test: bool = True  # 테스트 환경 여부

    # Aligo SMS
    aligo_api_key: Optional[str] = None
    aligo_user_id: Optional[str] = None
    aligo_sender: Optional[str] = None
    aligo_is_mock: bool = True
    
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
