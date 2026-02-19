"""동의 기록 모델."""
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Text
from sqlmodel import Field, SQLModel

from app.core.snowflake import generate_snowflake_id


class ConsentRecord(SQLModel, table=True):
    """근로자 동의 기록."""

    __tablename__ = "consent_records"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    user_id: Optional[int] = Field(default=None, foreign_key="user.id", sa_type=BigInteger, index=True)
    invite_token: Optional[str] = Field(default=None, index=True, max_length=255)  # 미가입 근로자
    consent_type: str = Field(index=True, max_length=100)  # "privacy_collection" | "third_party_sharing" | "sensitive_info"
    consented: bool = Field(default=False)
    consented_at: datetime = Field(default_factory=datetime.utcnow)
    ip_address: Optional[str] = Field(default=None, max_length=45)
    user_agent: Optional[str] = Field(default=None, sa_type=Text)
    consent_version: str = Field(default="v1.0", max_length=20)
    organization_id: Optional[int] = Field(default=None, foreign_key="organization.id", sa_type=BigInteger, index=True)


class ConsentRecordCreate(SQLModel):
    """동의 기록 생성 요청."""
    consent_type: str
    consented: bool
    invite_token: Optional[str] = None
    consent_version: str = "v1.0"


class ConsentRecordRead(SQLModel):
    """동의 기록 응답."""
    id: int
    user_id: Optional[int]
    invite_token: Optional[str]
    consent_type: str
    consented: bool
    consented_at: datetime
    consent_version: str
    organization_id: Optional[int]


class BulkConsentRequest(SQLModel):
    """일괄 동의 기록 요청."""
    records: list[ConsentRecordCreate]
    invite_token: Optional[str] = None  # 미가입 근로자 공통 토큰
