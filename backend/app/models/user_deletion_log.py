"""사용자 삭제 감사 기록 (PIPA 파기 기록)."""
from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Column, Text
from sqlalchemy.dialects.postgresql import JSON
from sqlmodel import Field, SQLModel

from app.core.snowflake import generate_snowflake_id


class DeletionType:
    """삭제 유형 상수."""
    ADMIN_CLEANUP = "admin_cleanup"
    SELF_WITHDRAWAL = "self_withdrawal"
    EMPLOYEE_TERMINATION = "employee_termination"


class UserDeletionLog(SQLModel, table=True):
    """사용자 삭제 감사 기록."""
    __tablename__ = "user_deletion_log"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    user_id: int = Field(sa_column=Column(BigInteger, nullable=False, index=True))
    deletion_type: str = Field(max_length=30, index=True)
    deleted_by: Optional[int] = Field(
        default=None, sa_column=Column(BigInteger, nullable=True)
    )
    reason: Optional[str] = Field(
        default=None, sa_column=Column(Text, nullable=True)
    )
    user_snapshot: dict = Field(
        default_factory=dict,
        sa_column=Column(JSON, nullable=False),
    )
    organization_id: Optional[int] = Field(
        default=None, sa_column=Column(BigInteger, nullable=True, index=True)
    )
    retention_expires_at: datetime = Field(index=True)
    purged_at: Optional[datetime] = Field(default=None)
    deleted_at: datetime = Field(default_factory=datetime.utcnow)
