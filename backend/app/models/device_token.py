"""FCM 디바이스 토큰 모델."""
from datetime import datetime

from sqlalchemy import BigInteger, Text
from sqlmodel import Field, SQLModel

from app.core.snowflake import generate_snowflake_id


class DeviceToken(SQLModel, table=True):
    """FCM 푸시 알림 디바이스 토큰."""

    __tablename__ = "device_token"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    user_id: int = Field(sa_type=BigInteger, index=True)
    platform: str = Field(max_length=10)  # 'ios' | 'android'
    token: str = Field(sa_type=Text, unique=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class DeviceTokenCreate(SQLModel):
    """디바이스 토큰 등록 요청."""

    token: str
    platform: str  # 'ios' | 'android'


class DeviceTokenRead(SQLModel):
    """디바이스 토큰 응답."""

    id: int
    user_id: int
    platform: str
    token: str
    created_at: datetime
