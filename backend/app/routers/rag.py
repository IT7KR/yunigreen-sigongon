"""RAG 검색 API 라우터."""
import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.models.user import User
from app.schemas.response import APIResponse

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class RAGSearchRequest(BaseModel):
    """RAG 검색 요청."""
    query: str
    top_k: int = 5
    pricebook_revision_id: Optional[uuid.UUID] = None


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
    """시공 지침 검색.
    
    자연어로 시공 방법, 할증 규정 등을 검색해요.
    
    예시 쿼리:
    - "옥상 우레탄 방수 시공 시 주의사항"
    - "10층 이상 건물 할증율"
    - "방수 시트 겹침 폭 규정"
    """
    # TODO: 실제 RAG 서비스 구현
    # 현재는 더미 응답
    
    # 예시 응답
    dummy_results = [
        RAGSearchResult(
            chunk_text=(
                "우레탄계 도막방수 시공 시 바탕면의 함수율이 10% 이하로 "
                "건조된 상태에서 시공하여야 한다. 우천 시 또는 기온이 5°C 이하인 "
                "경우 시공을 금한다."
            ),
            source_file="종합적산정보건축부문.pdf",
            source_page=245,
            category="시공방법",
            relevance_score=0.92,
        ),
        RAGSearchResult(
            chunk_text=(
                "10층 이상 건물의 경우 노무비에 매 5개층당 1%씩 할증을 적용한다. "
                "단, 최대 할증율은 10%를 초과할 수 없다."
            ),
            source_file="종합적산정보공통부문.pdf",
            source_page=18,
            category="할증규정",
            relevance_score=0.78,
        ),
    ]
    
    return APIResponse.ok(dummy_results[:request.top_k])


@router.get(
    "/categories",
    response_model=APIResponse[list[str]],
)
async def list_categories(
    db: DBSession,
    current_user: CurrentUser,
):
    """검색 카테고리 목록.
    
    사용 가능한 검색 카테고리를 조회해요.
    """
    categories = [
        "시공방법",
        "할증규정",
        "품질기준",
        "안전수칙",
        "자재규격",
        "공법선정",
    ]
    
    return APIResponse.ok(categories)
