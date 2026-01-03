"""Base model configuration and mixins."""
import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class TimestampMixin(SQLModel):
    """Mixin for created_at and updated_at timestamps."""
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class BaseModel(TimestampMixin):
    """Base model with UUID primary key and timestamps."""
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
