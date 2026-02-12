"""RAG / Vector Embeddings models."""
from datetime import datetime
from typing import Optional, List, TYPE_CHECKING

from sqlalchemy import BigInteger, Column, Float
from sqlalchemy.dialects.postgresql import ARRAY
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id

if TYPE_CHECKING:
    from app.models.pricebook import PricebookRevision


class DocumentChunkBase(SQLModel):
    source_file: Optional[str] = Field(default=None, max_length=255)
    source_page: Optional[int] = Field(default=None)
    chunk_text: str
    chunk_index: Optional[int] = Field(default=None)
    category: Optional[str] = Field(default=None, max_length=100)
    chapter: Optional[str] = Field(default=None, max_length=255)
    section: Optional[str] = Field(default=None, max_length=255)


class DocumentChunk(DocumentChunkBase, table=True):
    __tablename__ = "document_chunk"
    
    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    pricebook_revision_id: Optional[int] = Field(
        default=None, foreign_key="pricebook_revision.id", sa_type=BigInteger, index=True
    )
    
    embedding: Optional[List[float]] = Field(default=None, sa_column=Column(ARRAY(Float)))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    
    revision: Optional["PricebookRevision"] = Relationship(back_populates="document_chunks")


class DocumentChunkCreate(DocumentChunkBase):
    """Schema for creating document chunk."""
    pricebook_revision_id: Optional[int] = None
    embedding: Optional[List[float]] = None  # Vector embedding


class DocumentChunkRead(DocumentChunkBase):
    """Schema for reading document chunk."""
    id: int
    pricebook_revision_id: Optional[int]
    created_at: datetime


class RAGSearchRequest(SQLModel):
    """Schema for RAG search request."""
    query: str
    top_k: int = 5
    pricebook_revision_id: Optional[int] = None


class RAGSearchResult(SQLModel):
    """Schema for RAG search result."""
    chunk_text: str
    source_file: Optional[str]
    source_page: Optional[int]
    category: Optional[str]
    relevance_score: float
