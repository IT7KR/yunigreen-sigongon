"""Base model configuration and mixins."""
from datetime import datetime
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field

from app.core.snowflake import generate_snowflake_id


class TimestampMixin(SQLModel):
    """Mixin for created_at and updated_at timestamps."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BaseModel(TimestampMixin):
    """Base model with Snowflake primary key and timestamps."""
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
