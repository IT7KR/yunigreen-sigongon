"""자재 매칭 API - HITL 워크플로우.

워크플로우:
1. AI가 자재 추천 → match() 호출 → 후보 목록 반환
2. 신뢰도 >= 0.9: 자동 확정
3. 신뢰도 < 0.9: 사용자에게 후보 제시 → 선택 → confirm_match()
4. 선택 결과가 alias로 저장 → 다음부터 자동 매칭
"""
from typing import Annotated, Optional, List
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.models.user import User
from app.models.pricebook import CatalogItemAliasCreate
from app.services.material_matcher import MaterialMatcher, MatchResult, MatchCandidate
from app.schemas.response import APIResponse

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class MatchCandidateResponse(SQLModel):
    """매칭 후보 응답."""
    catalog_item_id: int
    name_ko: str
    specification: Optional[str]
    unit: str
    material_family: Optional[str]
    match_score: float
    match_reason: str
    unit_price: Optional[Decimal] = None


class MatchResultResponse(SQLModel):
    """매칭 결과 응답."""
    is_confident: bool
    best_match: Optional[MatchCandidateResponse]
    candidates: List[MatchCandidateResponse]
    normalized_query: str
    extracted_tokens: List[str]


class MatchRequest(SQLModel):
    """매칭 요청."""
    suggested_name: str
    suggested_spec: Optional[str] = None
    suggested_unit: Optional[str] = None
    revision_id: Optional[int] = None


class ConfirmMatchRequest(SQLModel):
    """매칭 확정 요청."""
    original_text: str
    catalog_item_id: int


class BatchMatchRequest(SQLModel):
    """일괄 매칭 요청."""
    items: List[MatchRequest]
    revision_id: Optional[int] = None


class BatchConfirmRequest(SQLModel):
    """일괄 확정 요청."""
    confirmations: List[ConfirmMatchRequest]


def _to_response(candidate: MatchCandidate) -> MatchCandidateResponse:
    return MatchCandidateResponse(
        catalog_item_id=candidate.catalog_item_id,
        name_ko=candidate.name_ko,
        specification=candidate.specification,
        unit=candidate.unit,
        material_family=candidate.material_family,
        match_score=candidate.match_score,
        match_reason=candidate.match_reason,
        unit_price=candidate.unit_price,
    )


@router.post(
    "/match",
    response_model=APIResponse[MatchResultResponse],
)
async def match_material(
    request: MatchRequest,
    db: DBSession,
    user: CurrentUser,
):
    """자재명 매칭.
    
    AI가 추천한 자재명을 단가표 품목과 매칭해요.
    - is_confident=True: 자동 확정 가능
    - is_confident=False: 후보 중에서 선택이 필요해요
    """
    matcher = MaterialMatcher(db)
    
    result = await matcher.match(
        suggested_name=request.suggested_name,
        suggested_spec=request.suggested_spec,
        suggested_unit=request.suggested_unit,
        revision_id=request.revision_id,
    )
    
    return APIResponse.ok(MatchResultResponse(
        is_confident=result.is_confident,
        best_match=_to_response(result.best_match) if result.best_match else None,
        candidates=[_to_response(c) for c in result.candidates],
        normalized_query=result.normalized_query,
        extracted_tokens=result.extracted_tokens,
    ))


@router.post(
    "/match/batch",
    response_model=APIResponse[List[MatchResultResponse]],
)
async def batch_match_materials(
    request: BatchMatchRequest,
    db: DBSession,
    user: CurrentUser,
):
    """여러 자재 일괄 매칭.
    
    진단 결과의 모든 추천 자재를 한 번에 매칭해요.
    """
    matcher = MaterialMatcher(db)
    results = []
    
    for item in request.items:
        result = await matcher.match(
            suggested_name=item.suggested_name,
            suggested_spec=item.suggested_spec,
            suggested_unit=item.suggested_unit,
            revision_id=request.revision_id or item.revision_id,
        )
        
        results.append(MatchResultResponse(
            is_confident=result.is_confident,
            best_match=_to_response(result.best_match) if result.best_match else None,
            candidates=[_to_response(c) for c in result.candidates],
            normalized_query=result.normalized_query,
            extracted_tokens=result.extracted_tokens,
        ))
    
    return APIResponse.ok(results)


@router.post(
    "/match/confirm",
    response_model=APIResponse[dict],
)
async def confirm_match(
    request: ConfirmMatchRequest,
    db: DBSession,
    user: CurrentUser,
):
    """매칭 확정 (학습 루프).
    
    사용자가 선택한 매칭을 저장해요.
    다음에 같은 텍스트가 나오면 자동으로 매칭돼요.
    """
    matcher = MaterialMatcher(db)
    
    alias = await matcher.confirm_match(
        original_text=request.original_text,
        catalog_item_id=request.catalog_item_id,
        user_id=user.id,
    )
    
    await db.commit()
    
    return APIResponse.ok({
        "alias_id": str(alias.id),
        "original_text": request.original_text,
        "catalog_item_id": str(request.catalog_item_id),
        "message": "매칭을 저장했어요. 다음부터 자동으로 매칭돼요.",
    })


@router.post(
    "/match/confirm/batch",
    response_model=APIResponse[dict],
)
async def batch_confirm_matches(
    request: BatchConfirmRequest,
    db: DBSession,
    user: CurrentUser,
):
    """여러 매칭 일괄 확정.
    
    여러 자재 매칭을 한 번에 저장해요.
    """
    matcher = MaterialMatcher(db)
    confirmed_count = 0
    
    for confirmation in request.confirmations:
        await matcher.confirm_match(
            original_text=confirmation.original_text,
            catalog_item_id=confirmation.catalog_item_id,
            user_id=user.id,
        )
        confirmed_count += 1
    
    await db.commit()
    
    return APIResponse.ok({
        "confirmed_count": confirmed_count,
        "message": f"{confirmed_count}개 매칭을 저장했어요.",
    })


@router.get(
    "/families",
    response_model=APIResponse[List[str]],
)
async def list_material_families(
    db: DBSession,
    user: CurrentUser,
):
    """자재 패밀리 목록 조회.
    
    등록된 자재 패밀리(상위 분류) 목록을 조회해요.
    """
    from sqlmodel import select
    from app.models.pricebook import CatalogItem
    
    result = await db.execute(
        select(CatalogItem.material_family)
        .where(CatalogItem.material_family != None)
        .where(CatalogItem.is_active == True)
        .distinct()
    )
    families = [row[0] for row in result.all() if row[0]]
    
    return APIResponse.ok(sorted(families))
