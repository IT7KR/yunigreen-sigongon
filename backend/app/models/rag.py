"""RAG / Vector Embeddings models."""
import uuid
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.pricebook import PricebookRevision


class DocumentChunkBase(SQLModel):
    """Document Chunk base fields."""
    source_file: Optional[str] = Field(default=None, max_length=255)
    source_page: Optional[int] = Field(default=None)
    chunk_text: str
    chunk_index: Optional[int] = Field(default=None)
    category: Optional[str] = Field(default=None, max_length=100)  # e.g., '할증규정', '시공방법'


class DocumentChunk(DocumentChunkBase, table=True):
    """Document Chunk model - Text chunks for RAG.
    
    Note: The embedding field uses pgvector extension.
    In actual usage, you need to ensure pgvector is installed and configured.
    The vector dimension (768) depends on the embedding model used.
    """
    __tablename__ = "document_chunk"
    
    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    pricebook_revision_id: Optional[uuid.UUID] = Field(
        default=None, foreign_key="pricebook_revision.id", index=True
    )
    
    # Note: embedding field is handled separately due to pgvector type
    # In production, use: embedding: List[float] with proper pgvector setup
    # embedding vector(768)  -- Dimension depends on model (e.g., text-embedding-ada-002)
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    # Relationships
    revision: Optional["PricebookRevision"] = Relationship(back_populates="document_chunks")


class DocumentChunkCreate(DocumentChunkBase):
    """Schema for creating document chunk."""
    pricebook_revision_id: Optional[uuid.UUID] = None
    embedding: Optional[List[float]] = None  # Vector embedding


class DocumentChunkRead(DocumentChunkBase):
    """Schema for reading document chunk."""
    id: uuid.UUID
    pricebook_revision_id: Optional[uuid.UUID]
    created_at: datetime


class RAGSearchRequest(SQLModel):
    """Schema for RAG search request."""
    query: str
    top_k: int = 5
    pricebook_revision_id: Optional[uuid.UUID] = None


class RAGSearchResult(SQLModel):
    """Schema for RAG search result."""
    chunk_text: str
    source_file: Optional[str]
    source_page: Optional[int]
    category: Optional[str]
    relevance_score: float
