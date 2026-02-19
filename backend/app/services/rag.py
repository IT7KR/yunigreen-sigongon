"""RAG (Retrieval-Augmented Generation) 서비스."""
import math
from typing import Optional
import re

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.models.rag import DocumentChunk
from app.models.pricebook import PricebookRevision


class RAGService:
    
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def search(
        self,
        query: str,
        top_k: int = 5,
        revision_id: Optional[int] = None,
        category: Optional[str] = None,
    ) -> list[dict]:
        query_embedding = await self._get_embedding(query)

        if self._is_zero_vector(query_embedding):
            results = await self._keyword_search(
                query=query,
                top_k=top_k,
                revision_id=revision_id,
                category=category,
            )
        else:
            results = await self._vector_search(
                query_embedding,
                top_k=top_k,
                revision_id=revision_id,
                category=category,
            )
        
        return [
            {
                "chunk_text": chunk.chunk_text,
                "source_file": chunk.source_file,
                "source_page": chunk.source_page,
                "category": chunk.category,
                "relevance_score": score,
            }
            for chunk, score in results
        ]
    
    async def _get_embedding(self, text: str) -> list[float]:
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
        revision_id: Optional[int] = None,
        category: Optional[str] = None,
    ) -> list[tuple[DocumentChunk, float]]:
        base_query = select(DocumentChunk)
        
        if revision_id:
            base_query = base_query.where(
                DocumentChunk.pricebook_revision_id == revision_id
            )
        
        if category:
            base_query = base_query.where(
                DocumentChunk.category == category
            )
        
        result = await self.db.execute(base_query.limit(100))
        chunks = result.scalars().all()
        
        scored_chunks = []
        for chunk in chunks:
            if chunk.embedding:
                score = self._cosine_similarity(query_embedding, chunk.embedding)
                scored_chunks.append((chunk, score))
        
        scored_chunks.sort(key=lambda x: x[1], reverse=True)
        return scored_chunks[:top_k]

    async def _keyword_search(
        self,
        query: str,
        top_k: int,
        revision_id: Optional[int] = None,
        category: Optional[str] = None,
    ) -> list[tuple[DocumentChunk, float]]:
        base_query = select(DocumentChunk)

        if revision_id:
            base_query = base_query.where(
                DocumentChunk.pricebook_revision_id == revision_id
            )

        if category:
            base_query = base_query.where(
                DocumentChunk.category == category
            )

        result = await self.db.execute(base_query.limit(300))
        chunks = result.scalars().all()

        tokens = [t for t in re.findall(r"[가-힣A-Za-z0-9]+", query.lower()) if len(t) >= 2]
        if not tokens:
            return [(chunk, 0.0) for chunk in chunks[:top_k]]

        scored: list[tuple[DocumentChunk, float]] = []
        for chunk in chunks:
            text = (chunk.chunk_text or "").lower()
            score = 0.0
            for token in tokens:
                if token in text:
                    score += 1.0
            if score > 0:
                scored.append((chunk, score))

        scored.sort(key=lambda row: row[1], reverse=True)
        return scored[:top_k]

    def _is_zero_vector(self, vector: list[float]) -> bool:
        if not vector:
            return True
        return all(abs(v) < 1e-12 for v in vector)
    
    def _cosine_similarity(self, vec_a: list[float], vec_b: list[float]) -> float:
        if len(vec_a) != len(vec_b):
            return 0.0
        
        dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        
        if norm_a == 0 or norm_b == 0:
            return 0.0
        
        return dot_product / (norm_a * norm_b)
    
    async def add_document(
        self,
        text: str,
        source_file: str,
        source_page: int,
        revision_id: int,
        category: Optional[str] = None,
    ) -> DocumentChunk:
        embedding = await self._get_embedding(text)
        
        chunk = DocumentChunk(
            pricebook_revision_id=revision_id,
            chunk_text=text,
            source_file=source_file,
            source_page=source_page,
            category=category,
            embedding=embedding,
        )
        
        self.db.add(chunk)
        await self.db.commit()
        await self.db.refresh(chunk)
        
        return chunk
    
    async def get_categories(self) -> list[str]:
        return [
            "시공방법",
            "할증규정",
            "품질기준",
            "안전수칙",
            "자재규격",
            "공법선정",
        ]
