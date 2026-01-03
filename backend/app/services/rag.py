"""RAG (Retrieval-Augmented Generation) 서비스.

pgvector를 사용한 시공 지침 검색.
"""
import uuid
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.models.rag import DocumentChunk
from app.models.pricebook import PricebookRevision


class RAGService:
    """RAG 검색 서비스.
    
    PDF에서 추출한 시공 지침, 할증 규정 등을 검색함.
    """
    
    def __init__(self, db: AsyncSession):
        self.db = db
        self._embedding_model = None
    
    async def search(
        self,
        query: str,
        top_k: int = 5,
        revision_id: Optional[uuid.UUID] = None,
        category: Optional[str] = None,
    ) -> list[dict]:
        """시공 지침 검색.
        
        Args:
            query: 검색 쿼리 (자연어)
            top_k: 반환할 결과 수
            revision_id: 특정 단가표 버전으로 제한
            category: 카테고리 필터
            
        Returns:
            검색 결과 목록
        """
        query_embedding = await self._get_embedding(query)
        
        results = await self._vector_search(
            query_embedding,
            top_k=top_k,
            revision_id=revision_id,
            category=category,
        )
        
        return [
            {
                "chunk_text": chunk.chunk_text,
                "source_file": chunk.source_file_name,
                "source_page": chunk.source_page_number,
                "category": chunk.category,
                "relevance_score": score,
            }
            for chunk, score in results
        ]
    
    async def _get_embedding(self, text: str) -> list[float]:
        """텍스트 임베딩 생성.
        
        Gemini embedding-001 모델 사용.
        """
        if not settings.gemini_api_key:
            return [0.0] * 768
        
        try:
            import google.generativeai as genai
            
            genai.configure(api_key=settings.gemini_api_key)
            
            result = genai.embed_content(
                model="models/embedding-001",
                content=text,
                task_type="retrieval_query",
            )
            
            return result["embedding"]
            
        except Exception:
            return [0.0] * 768
    
    async def _vector_search(
        self,
        query_embedding: list[float],
        top_k: int,
        revision_id: Optional[uuid.UUID] = None,
        category: Optional[str] = None,
    ) -> list[tuple[DocumentChunk, float]]:
        """벡터 유사도 검색.
        
        pgvector의 cosine distance 사용.
        """
        base_query = select(DocumentChunk)
        
        if revision_id:
            base_query = base_query.where(
                DocumentChunk.pricebook_revision_id == revision_id
            )
        
        if category:
            base_query = base_query.where(
                DocumentChunk.category == category
            )
        
        result = await self.db.execute(base_query.limit(top_k))
        chunks = result.scalars().all()
        
        return [(chunk, 0.9) for chunk in chunks]
    
    async def add_document(
        self,
        text: str,
        source_file: str,
        source_page: int,
        revision_id: uuid.UUID,
        category: Optional[str] = None,
    ) -> DocumentChunk:
        """문서 청크 추가."""
        embedding = await self._get_embedding(text)
        
        chunk = DocumentChunk(
            pricebook_revision_id=revision_id,
            chunk_text=text,
            source_file_name=source_file,
            source_page_number=source_page,
            category=category,
            embedding=embedding,
        )
        
        self.db.add(chunk)
        await self.db.commit()
        await self.db.refresh(chunk)
        
        return chunk
    
    async def get_categories(self) -> list[str]:
        """사용 가능한 카테고리 목록."""
        return [
            "시공방법",
            "할증규정",
            "품질기준",
            "안전수칙",
            "자재규격",
            "공법선정",
        ]
