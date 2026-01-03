"""AI Diagnosis and Material Suggestion models."""
import uuid
from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Optional, List, Any, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship, Column
from sqlalchemy import JSON

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
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    site_visit_id: uuid.UUID = Field(foreign_key="site_visit.id", index=True)
    
    # Output
    leak_opinion_text: str  # 누수소견서 본문
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
    site_visit_id: uuid.UUID
    additional_notes: Optional[str] = None
    photo_ids: Optional[List[uuid.UUID]] = None


class AIDiagnosisRead(AIDiagnosisBase):
    """Schema for reading AI diagnosis."""
    id: uuid.UUID
    site_visit_id: uuid.UUID
    leak_opinion_text: str
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
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    ai_diagnosis_id: uuid.UUID = Field(foreign_key="ai_diagnosis.id", index=True)
    
    # Matching to our catalog
    matched_catalog_item_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="catalog_item.id"
    )
    match_confidence: Optional[Decimal] = Field(default=None, max_digits=3, decimal_places=2)
    match_method: Optional[MatchMethod] = Field(default=None)
    
    # For review
    is_confirmed: bool = Field(default=False)
    confirmed_by: Optional[uuid.UUID] = Field(default=None, foreign_key="user.id")
    confirmed_at: Optional[datetime] = Field(default=None)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    diagnosis: Optional[AIDiagnosis] = Relationship(back_populates="suggestions")


class AIMaterialSuggestionRead(AIMaterialSuggestionBase):
    """Schema for reading AI material suggestion."""
    id: uuid.UUID
    ai_diagnosis_id: uuid.UUID
    matched_catalog_item_id: Optional[uuid.UUID]
    match_confidence: Optional[Decimal]
    match_method: Optional[MatchMethod]
    is_confirmed: bool
    created_at: datetime


class AIMaterialSuggestionUpdate(SQLModel):
    """Schema for updating AI material suggestion (confirmation)."""
    matched_catalog_item_id: Optional[uuid.UUID] = None
    is_confirmed: bool = False
