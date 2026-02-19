"""Base model configuration and mixins."""
from datetime import datetime
from typing import Any, Optional

from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field

from app.core.snowflake import generate_snowflake_id


class TimestampMixin(SQLModel):
    """Mixin for created_at and updated_at timestamps."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class TenantMixin(SQLModel):
    """Mixin for organization-scoped (tenant) models."""
    organization_id: Optional[int] = Field(
        default=None,
        foreign_key="organization.id",
        sa_type=BigInteger,
        index=True,
    )


def require_same_org(
    resource_org_id: Optional[int],
    current_user: Any,
    resource_name: str = "리소스",
) -> None:
    """Raise 403 if resource doesn't belong to current user's organization.

    Super admin (organization_id=None) always passes.
    """
    from fastapi import HTTPException

    # Super admin has no organization constraint, can access everything
    if current_user.organization_id is None:
        return
    if resource_org_id != current_user.organization_id:
        raise HTTPException(
            status_code=403,
            detail=f"이 {resource_name}에 접근할 권한이 없어요",
        )


class BaseModel(TimestampMixin):
    """Base model with Snowflake primary key and timestamps."""
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
