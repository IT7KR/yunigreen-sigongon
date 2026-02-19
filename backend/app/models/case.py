"""Season / Case based estimation domain models."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import BigInteger, JSON, Column, UniqueConstraint
from sqlmodel import SQLModel, Field

from app.core.snowflake import generate_snowflake_id


class DocumentStatus(str, Enum):
    """Document ingestion status."""

    QUEUED = "queued"
    RUNNING = "running"
    DONE = "done"
    FAILED = "failed"


class CaseStatus(str, Enum):
    """Case workflow status."""

    DRAFT = "draft"
    VISION_READY = "vision_ready"
    ESTIMATED = "estimated"


class ExportFileType(str, Enum):
    """Estimate export file type."""

    CSV = "csv"
    XLSX = "xlsx"


class SeasonCategoryPurpose(str, Enum):
    """Season document category purpose."""

    ESTIMATION = "estimation"
    LABOR_RULE = "labor_rule"
    LEGAL = "legal"
    SAFETY = "safety"


class SeasonBase(SQLModel):
    name: str = Field(max_length=100, index=True)
    is_active: bool = Field(default=False, index=True)


class Season(SeasonBase, table=True):
    __tablename__ = "season"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SeasonCategoryBase(SQLModel):
    season_id: int = Field(
        sa_column=Column(BigInteger, index=True, nullable=False)
    )
    name: str = Field(max_length=100)
    purpose: SeasonCategoryPurpose = Field(
        default=SeasonCategoryPurpose.ESTIMATION,
        index=True,
    )
    is_enabled: bool = Field(default=True, index=True)
    sort_order: int = Field(default=100)


class SeasonCategory(SeasonCategoryBase, table=True):
    __tablename__ = "season_category"
    __table_args__ = (
        UniqueConstraint("season_id", "name", name="uq_season_category_name"),
    )

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)


class SeasonDocumentBase(SQLModel):
    season_id: int = Field(
        sa_column=Column(BigInteger, index=True, nullable=False)
    )
    category: str = Field(max_length=100, index=True)
    title: str = Field(max_length=255)
    file_url: str = Field(max_length=500)
    version_hash: str = Field(max_length=128, index=True)
    status: DocumentStatus = Field(default=DocumentStatus.QUEUED, index=True)


class SeasonDocument(SeasonDocumentBase, table=True):
    __tablename__ = "season_document"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    uploaded_at: datetime = Field(default_factory=datetime.utcnow)
    last_error: Optional[str] = Field(default=None)
    failed_segments: Optional[list[dict]] = Field(default=None, sa_column=Column(JSON))


class TraceChunk(SQLModel, table=True):
    __tablename__ = "trace_chunk"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    season_id: int = Field(
        sa_column=Column(BigInteger, index=True, nullable=False)
    )
    doc_id: int = Field(
        sa_column=Column(BigInteger, index=True, nullable=False)
    )
    page: int = Field(index=True)
    section_title: Optional[str] = Field(default=None, max_length=255)
    text: str
    meta_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class CostItem(SQLModel, table=True):
    __tablename__ = "cost_item"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    season_id: int = Field(
        sa_column=Column(BigInteger, index=True, nullable=False)
    )
    source_doc_id: int = Field(
        sa_column=Column(
            BigInteger,
            index=True,
            nullable=False,
        )
    )

    category: Optional[str] = Field(default=None, max_length=100, index=True)
    item_name: str = Field(max_length=255, index=True)
    spec: Optional[str] = Field(default=None, max_length=255)
    unit: str = Field(max_length=30)
    unit_price: Decimal = Field(max_digits=15, decimal_places=2)

    source_doc_title: str = Field(max_length=255)
    source_page: int = Field(index=True)
    table_id: Optional[str] = Field(default=None, max_length=100)
    row_id: Optional[str] = Field(default=None, max_length=100)
    row_text: str

    embedding_vector: Optional[list[float]] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Case(SQLModel, table=True):
    __tablename__ = "diagnosis_case"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    user_id: int = Field(sa_type=BigInteger, index=True)
    organization_id: Optional[int] = Field(default=None, sa_type=BigInteger, index=True)
    season_id: int = Field(
        sa_column=Column(BigInteger, index=True, nullable=False)
    )
    status: CaseStatus = Field(default=CaseStatus.DRAFT, index=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CaseImage(SQLModel, table=True):
    __tablename__ = "case_image"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    case_id: int = Field(
        sa_column=Column(
            BigInteger,
            index=True,
            nullable=False,
        )
    )
    file_url: str = Field(max_length=500)
    meta_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VisionResult(SQLModel, table=True):
    __tablename__ = "vision_result"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    case_id: int = Field(
        sa_column=Column(
            BigInteger,
            index=True,
            nullable=False,
        )
    )
    model: str = Field(max_length=100)
    params_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    result_json: dict = Field(sa_column=Column(JSON))
    confidence: Optional[Decimal] = Field(default=None, max_digits=5, decimal_places=4)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class CaseEstimate(SQLModel, table=True):
    __tablename__ = "case_estimate"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    case_id: int = Field(
        sa_column=Column(
            BigInteger,
            index=True,
            nullable=False,
        )
    )
    version: int = Field(default=1)
    items_json: list[dict] = Field(sa_column=Column(JSON))
    totals_json: dict = Field(sa_column=Column(JSON))
    version_hash_snapshot: str = Field(max_length=512)
    created_at: datetime = Field(default_factory=datetime.utcnow)


class EstimateExport(SQLModel, table=True):
    __tablename__ = "estimate_export"

    id: int = Field(
        default_factory=generate_snowflake_id,
        sa_column=Column(BigInteger, primary_key=True),
    )
    estimate_id: int = Field(
        sa_column=Column(
            BigInteger,
            index=True,
            nullable=False,
        )
    )
    file_type: ExportFileType = Field(index=True)
    file_url: str = Field(max_length=500)
    created_at: datetime = Field(default_factory=datetime.utcnow)
