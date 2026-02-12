"""RAG 검색 API 라우터."""
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.response import APIResponse
from app.services.rag import RAGService

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class RAGSearchRequest(BaseModel):
    """RAG 검색 요청."""
    query: str
    top_k: int = 5
    pricebook_revision_id: Optional[int] = None


class RAGSearchResult(BaseModel):
    """RAG 검색 결과."""
    chunk_text: str
    source_file: str
    source_page: Optional[int] = None
    category: Optional[str] = None
    relevance_score: float


@router.post(
    "/search",
    response_model=APIResponse[list[RAGSearchResult]],
)
async def search_guidelines(
    request: RAGSearchRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    rag_service = RAGService(db)
    
    results = await rag_service.search(
        query=request.query,
        top_k=request.top_k,
        revision_id=request.pricebook_revision_id,
    )
    
    if not results:
        return APIResponse.ok([])
    
    return APIResponse.ok([
        RAGSearchResult(
            chunk_text=r["chunk_text"],
            source_file=r["source_file"],
            source_page=r.get("source_page"),
            category=r.get("category"),
            relevance_score=r["relevance_score"],
        )
        for r in results
    ])


@router.get(
    "/categories",
    response_model=APIResponse[list[str]],
)
async def list_categories(
    db: DBSession,
    current_user: CurrentUser,
):
    rag_service = RAGService(db)
    categories = await rag_service.get_categories()
    return APIResponse.ok(categories)
