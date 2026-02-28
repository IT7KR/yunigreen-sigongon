"""OTP 인증번호 레코드 모델."""
from datetime import datetime
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field

from app.core.snowflake import generate_snowflake_id


class OtpRecord(SQLModel, table=True):
    """OTP 인증번호 영속화 레코드."""

    __tablename__ = "otp_record"

    id: int = Field(
        default_factory=generate_snowflake_id,
        primary_key=True,
        sa_type=BigInteger,
    )
    request_id: str = Field(max_length=100, unique=True, index=True)
    phone: str = Field(max_length=20, index=True)
    code: str = Field(max_length=10)
    expires_at: datetime = Field()
    attempts: int = Field(default=0)
    is_used: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
