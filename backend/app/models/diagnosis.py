"""AI Diagnosis and Material Suggestion models."""
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Any, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import BigInteger, JSON

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.project import SiteVisit
    from app.models.pricebook import CatalogItem
    from app.models.user import User


class DiagnosisStatus(str, Enum):
    """AI Diagnosis status enumeration."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class MatchMethod(str, Enum):
    """Material match method enumeration."""
    EXACT = "exact"
    FUZZY = "fuzzy"
    EMBEDDING = "embedding"
    MANUAL = "manual"


class AIDiagnosisBase(SQLModel):
    """AI Diagnosis base fields."""
    model_name: str = Field(max_length=50)  # e.g., 'gemini-3.0-flash'
    model_version: Optional[str] = Field(default=None, max_length=50)


class AIDiagnosis(AIDiagnosisBase, table=True):
    """AI Diagnosis model - Gemini analysis results."""
    __tablename__ = "ai_diagnosis"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    site_visit_id: int = Field(foreign_key="site_visit.id", sa_type=BigInteger, index=True)
    
    # Output
    leak_opinion_text: str  # 누수소견서 본문
    field_opinion_text: Optional[str] = Field(default=None)  # 현장 의견
    confidence_score: Optional[Decimal] = Field(default=None, max_digits=3, decimal_places=2)
    
    # Raw response for debugging/audit (stored as JSON)
    raw_request_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    raw_response_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    # Status
    status: DiagnosisStatus = Field(default=DiagnosisStatus.COMPLETED)
    error_message: Optional[str] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    processing_time_ms: Optional[int] = Field(default=None)
    
    # Relationships
    suggestions: List["AIMaterialSuggestion"] = Relationship(back_populates="diagnosis")


class AIDiagnosisCreate(SQLModel):
    """Schema for creating AI diagnosis."""
    site_visit_id: int
    additional_notes: Optional[str] = None
    photo_ids: Optional[List[int]] = None


class AIDiagnosisRead(AIDiagnosisBase):
    """Schema for reading AI diagnosis."""
    id: int
    site_visit_id: int
    leak_opinion_text: str
    field_opinion_text: Optional[str]
    confidence_score: Optional[Decimal]
    status: DiagnosisStatus
    created_at: datetime
    processing_time_ms: Optional[int]


class AIMaterialSuggestionBase(SQLModel):
    """AI Material Suggestion base fields."""
    suggested_name: str = Field(max_length=255)
    suggested_spec: Optional[str] = Field(default=None, max_length=255)
    suggested_unit: Optional[str] = Field(default=None, max_length=20)
    suggested_quantity: Optional[Decimal] = Field(default=None, max_digits=10, decimal_places=2)


class AIMaterialSuggestion(AIMaterialSuggestionBase, table=True):
    """AI Material Suggestion model - Materials recommended by AI."""
    __tablename__ = "ai_material_suggestion"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    ai_diagnosis_id: int = Field(foreign_key="ai_diagnosis.id", sa_type=BigInteger, index=True)
    
    # Matching to our catalog
    matched_catalog_item_id: Optional[int] = Field(
        default=None, foreign_key="catalog_item.id", sa_type=BigInteger
    )
    match_confidence: Optional[Decimal] = Field(default=None, max_digits=3, decimal_places=2)
    match_method: Optional[MatchMethod] = Field(default=None)
    
    # For review
    is_confirmed: bool = Field(default=False)
    confirmed_by: Optional[int] = Field(default=None, foreign_key="user.id", sa_type=BigInteger)
    confirmed_at: Optional[datetime] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    diagnosis: Optional[AIDiagnosis] = Relationship(back_populates="suggestions")


class AIMaterialSuggestionRead(AIMaterialSuggestionBase):
    """Schema for reading AI material suggestion."""
    id: int
    ai_diagnosis_id: int
    matched_catalog_item_id: Optional[int]
    match_confidence: Optional[Decimal]
    match_method: Optional[MatchMethod]
    is_confirmed: bool
    created_at: datetime


class AIMaterialSuggestionUpdate(SQLModel):
    """Schema for updating AI material suggestion (confirmation)."""
    matched_catalog_item_id: Optional[int] = None
    is_confirmed: bool = False
