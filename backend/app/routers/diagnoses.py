"""AI 진단 API 라우터."""
from datetime import datetime
from decimal import Decimal
from typing import Any, Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy import or_
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db, async_session_factory
from app.core.security import get_current_user
from app.services.diagnosis import DiagnosisService
from app.services.rag import RAGService
import logging

logger = logging.getLogger(__name__)
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.project import Project, SiteVisit, Photo
from app.models.pricebook import CatalogItem, CatalogItemPrice
from app.models.diagnosis import (
    AIDiagnosis,
    DiagnosisStatus,
    AIDiagnosisCreate,
    AIDiagnosisRead,
    AIMaterialSuggestion,
    AIMaterialSuggestionRead,
    AIMaterialSuggestionUpdate,
)
from app.schemas.vision import extract_vision_payload
from app.schemas.response import APIResponse

router = APIRouter()


async def run_ai_diagnosis_background(
    diagnosis_id: int,
    photo_paths: list[str],
    additional_notes: str | None,
):
    async with async_session_factory() as db:
        try:
            logger.info(f"Starting background diagnosis: {diagnosis_id}")
            service = DiagnosisService(db)
            await service.run_diagnosis(
                diagnosis_id=diagnosis_id,
                photo_paths=photo_paths,
                additional_notes=additional_notes,
            )
            logger.info(f"Background diagnosis completed: {diagnosis_id}")
        except Exception as e:
            logger.error(f"Background diagnosis failed: {diagnosis_id}, error: {e}")
            try:
                result = await db.execute(
                    select(AIDiagnosis).where(AIDiagnosis.id == diagnosis_id)
                )
                diagnosis = result.scalar_one_or_none()
                if diagnosis:
                    diagnosis.status = DiagnosisStatus.FAILED
                    diagnosis.error_message = str(e)
                    await db.commit()
            except Exception as update_error:
                logger.error(f"Failed to update diagnosis status: {update_error}")


DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class DiagnosisRequestResponse(BaseModel):
    diagnosis_id: int
    status: DiagnosisStatus
    message: str


class DiagnosisDetailResponse(AIDiagnosisRead):
    project_id: int
    suggested_materials: list[AIMaterialSuggestionRead] = []
    vision: Optional[dict[str, Any]] = None
    price_candidates: Optional[dict[str, Any]] = None
    price_mappings: Optional[dict[str, Any]] = None


class FieldOpinionUpdateRequest(BaseModel):
    field_opinion_text: str


class PriceCandidatesRequest(BaseModel):
    revision_id: Optional[int] = None
    top_k: int = Field(default=5, ge=1, le=20)
    include_rules: bool = True


class PriceCandidateRead(BaseModel):
    catalog_item_id: int
    catalog_item_price_id: int
    item_name: str
    specification: Optional[str] = None
    unit: str
    unit_price: Decimal
    source_ref: dict[str, Any]
    score: float
    excluded_reason: Optional[str] = None


class WorkItemCandidatesRead(BaseModel):
    work_id: str
    task: str
    expected_unit: str
    candidates: list[PriceCandidateRead]
    rule_context: list[dict[str, Any]] = []


class PriceCandidatesResponse(BaseModel):
    revision_id: int
    items: list[WorkItemCandidatesRead]


class MappingSelectRequest(BaseModel):
    revision_id: Optional[int] = None
    selections: dict[str, int] = Field(default_factory=dict)  # work_id -> catalog_item_price_id
    top_k: int = Field(default=5, ge=1, le=20)


class WorkItemMappingRead(BaseModel):
    work_id: str
    selected: Optional[PriceCandidateRead] = None
    alternatives: list[PriceCandidateRead] = []


class MappingSelectResponse(BaseModel):
    revision_id: int
    mappings: list[WorkItemMappingRead]


def _normalize_unit(unit: Optional[str]) -> str:
    if not unit:
        return "unknown"
    normalized = unit.strip().lower()
    mapping = {
        "㎡": "m2",
        "m²": "m2",
        "m2": "m2",
        "m": "m",
        "ea": "ea",
        "개": "ea",
        "개소": "ea",
        "식": "set",
        "set": "set",
        "kg": "kg",
        "l": "l",
        "ℓ": "l",
        "인": "인",
    }
    return mapping.get(normalized, normalized)


async def _ensure_diagnosis_access(
    diagnosis_id: int,
    db: AsyncSession,
    current_user: User,
) -> tuple[AIDiagnosis, Project]:
    diagnosis_result = await db.execute(
        select(AIDiagnosis).where(AIDiagnosis.id == diagnosis_id)
    )
    diagnosis = diagnosis_result.scalar_one_or_none()
    if not diagnosis:
        raise NotFoundException("diagnosis", diagnosis_id)

    visit_result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == diagnosis.site_visit_id)
    )
    visit = visit_result.scalar_one_or_none()
    if not visit:
        raise NotFoundException("diagnosis", diagnosis_id)

    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise NotFoundException("diagnosis", diagnosis_id)
    return diagnosis, project


def _keywords_from_work_item(work_item: dict[str, Any]) -> list[str]:
    terms: list[str] = []
    lookup = work_item.get("price_lookup", {})
    if isinstance(lookup, dict):
        primary = lookup.get("primary_query")
        if isinstance(primary, str):
            terms.extend(primary.split())
        for term in lookup.get("must_terms", []) or []:
            if isinstance(term, str):
                terms.extend(term.split())
    for key in ("task", "scope_location", "trade"):
        value = work_item.get(key)
        if isinstance(value, str):
            terms.extend(value.split())
    unique = []
    seen: set[str] = set()
    for term in terms:
        t = term.strip().lower()
        if len(t) < 2 or t in seen:
            continue
        seen.add(t)
        unique.append(t)
    return unique


def _score_catalog_item(
    item_name: str,
    specification: Optional[str],
    category_path: Optional[str],
    unit: str,
    expected_unit: str,
    keywords: list[str],
    source_page: Optional[int],
) -> float:
    haystack = " ".join(
        p for p in [item_name, specification or "", category_path or ""] if p
    ).lower()
    score = 0.0
    for kw in keywords:
        if kw in haystack:
            score += 1.2
    normalized_unit = _normalize_unit(unit)
    normalized_expected = _normalize_unit(expected_unit)
    if normalized_expected != "unknown":
        if normalized_unit == normalized_expected:
            score += 3.0
        else:
            score -= 2.5
    if source_page:
        score += 0.3
    return score


async def _build_candidates_for_work_item(
    db: AsyncSession,
    revision_id: int,
    work_item: dict[str, Any],
    top_k: int,
    include_rules: bool,
) -> WorkItemCandidatesRead:
    lookup = work_item.get("price_lookup", {}) if isinstance(work_item, dict) else {}
    expected_unit = _normalize_unit(
        lookup.get("expected_unit", "unknown") if isinstance(lookup, dict) else "unknown"
    )
    keywords = _keywords_from_work_item(work_item)

    query = (
        select(CatalogItemPrice, CatalogItem)
        .join(CatalogItem, CatalogItem.id == CatalogItemPrice.catalog_item_id)
        .where(CatalogItemPrice.pricebook_revision_id == revision_id)
    )

    if keywords:
        like_filters = []
        for token in keywords[:8]:
            pattern = f"%{token}%"
            like_filters.append(CatalogItem.name_ko.ilike(pattern))
            like_filters.append(CatalogItem.specification.ilike(pattern))
            like_filters.append(CatalogItem.category_path.ilike(pattern))
        query = query.where(or_(*like_filters))

    result = await db.execute(query.limit(300))
    rows = result.all()

    scored_candidates: list[PriceCandidateRead] = []
    for price_row, catalog_item in rows:
        candidate_score = _score_catalog_item(
            item_name=catalog_item.name_ko,
            specification=catalog_item.specification,
            category_path=catalog_item.category_path,
            unit=catalog_item.base_unit,
            expected_unit=expected_unit,
            keywords=keywords,
            source_page=price_row.source_pdf_page,
        )
        scored_candidates.append(
            PriceCandidateRead(
                catalog_item_id=catalog_item.id,
                catalog_item_price_id=price_row.id,
                item_name=catalog_item.name_ko,
                specification=catalog_item.specification,
                unit=_normalize_unit(catalog_item.base_unit),
                unit_price=price_row.unit_price,
                source_ref={
                    "source_page": price_row.source_pdf_page,
                    "source_row_hint": price_row.source_row_text,
                    "revision_id": revision_id,
                },
                score=round(candidate_score, 4),
                excluded_reason=None,
            )
        )

    scored_candidates.sort(key=lambda c: c.score, reverse=True)
    candidates = scored_candidates[:top_k]

    rule_context: list[dict[str, Any]] = []
    if include_rules:
        rag_service = RAGService(db)
        query_text = " ".join(
            p for p in [
                lookup.get("primary_query", "") if isinstance(lookup, dict) else "",
                work_item.get("task", "") if isinstance(work_item, dict) else "",
            ] if p
        ).strip()
        if query_text:
            try:
                rag_results = await rag_service.search(
                    query=query_text,
                    top_k=3,
                    revision_id=revision_id,
                )
                for row in rag_results:
                    rule_context.append(
                        {
                            "chunk_text": row.get("chunk_text", ""),
                            "source_file": row.get("source_file"),
                            "source_page": row.get("source_page"),
                            "category": row.get("category"),
                            "relevance_score": row.get("relevance_score", 0.0),
                        }
                    )
            except Exception as exc:
                logger.warning("RAG rule lookup failed for diagnosis candidates: %s", exc)

    return WorkItemCandidatesRead(
        work_id=str(work_item.get("work_id") or ""),
        task=str(work_item.get("task") or ""),
        expected_unit=expected_unit,
        candidates=candidates,
        rule_context=rule_context,
    )


@router.post(
    "/site-visits/{visit_id}/diagnose",
    response_model=APIResponse[DiagnosisRequestResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_diagnosis(
    visit_id: int,
    request_data: AIDiagnosisCreate,
    background_tasks: BackgroundTasks,
    db: DBSession,
    current_user: CurrentUser,
):
    """AI 진단 요청.
    
    현장 사진을 AI가 분석해요. 약 30초 정도 걸려요.
    """
    # 현장 방문 확인
    visit_result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == visit_id)
    )
    visit = visit_result.scalar_one_or_none()
    
    if not visit:
        raise NotFoundException("site_visit", visit_id)
    
    # 프로젝트 권한 확인
    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("site_visit", visit_id)
    
    # 사진 확인
    if request_data.photo_ids:
        photos_result = await db.execute(
            select(Photo)
            .where(Photo.id.in_(request_data.photo_ids))
            .where(Photo.site_visit_id == visit_id)
        )
        photos = photos_result.scalars().all()
    else:
        # 모든 사진 사용
        photos_result = await db.execute(
            select(Photo).where(Photo.site_visit_id == visit_id)
        )
        photos = photos_result.scalars().all()
    
    if not photos:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="분석할 사진이 없어요. 먼저 사진을 올려주세요.",
        )
    
    # 진단 레코드 생성 (pending 상태)
    diagnosis = AIDiagnosis(
        site_visit_id=visit_id,
        model_name="gemini-3.0-flash",
        status=DiagnosisStatus.PENDING,
        leak_opinion_text="",  # 분석 후 업데이트
        field_opinion_text=None,
    )
    
    db.add(diagnosis)
    await db.commit()
    await db.refresh(diagnosis)
    
    background_tasks.add_task(
        run_ai_diagnosis_background,
        diagnosis_id=diagnosis.id,
        photo_paths=[p.storage_path for p in photos],
        additional_notes=request_data.additional_notes,
    )
    
    return APIResponse.ok(
        DiagnosisRequestResponse(
            diagnosis_id=diagnosis.id,
            status=DiagnosisStatus.PROCESSING,
            message="AI 분석을 시작했어요. 약 30초 정도 걸려요.",
        )
    )


@router.get(
    "/diagnoses/{diagnosis_id}",
    response_model=APIResponse[DiagnosisDetailResponse],
)
async def get_diagnosis(
    diagnosis_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """진단 결과 조회.
    
    AI 진단 결과를 확인해요.
    """
    result = await db.execute(
        select(AIDiagnosis).where(AIDiagnosis.id == diagnosis_id)
    )
    diagnosis = result.scalar_one_or_none()
    
    if not diagnosis:
        raise NotFoundException("diagnosis", diagnosis_id)
    
    # 권한 확인 (현장 방문 -> 프로젝트)
    visit_result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == diagnosis.site_visit_id)
    )
    visit = visit_result.scalar_one_or_none()
    
    if not visit:
        raise NotFoundException("diagnosis", diagnosis_id)
    
    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise NotFoundException("diagnosis", diagnosis_id)
    
    await db.refresh(diagnosis, ["suggestions"])

    raw_payload = diagnosis.raw_response_json or {}
    vision_payload = raw_payload.get("vision_v2", raw_payload if isinstance(raw_payload, dict) else None)
    
    return APIResponse.ok(
        DiagnosisDetailResponse(
            id=diagnosis.id,
            site_visit_id=diagnosis.site_visit_id,
            project_id=project.id,
            model_name=diagnosis.model_name,
            model_version=diagnosis.model_version,
            leak_opinion_text=diagnosis.leak_opinion_text,
            field_opinion_text=diagnosis.field_opinion_text,
            confidence_score=diagnosis.confidence_score,
            status=diagnosis.status,
            created_at=diagnosis.created_at,
            processing_time_ms=diagnosis.processing_time_ms,
            suggested_materials=[
                AIMaterialSuggestionRead.model_validate(s) 
                for s in (diagnosis.suggestions or [])
            ],
            vision=vision_payload if isinstance(vision_payload, dict) else None,
            price_candidates=raw_payload.get("price_candidates") if isinstance(raw_payload, dict) else None,
            price_mappings=raw_payload.get("price_mappings") if isinstance(raw_payload, dict) else None,
        )
    )


@router.post(
    "/diagnoses/{diagnosis_id}/price-candidates",
    response_model=APIResponse[PriceCandidatesResponse],
)
async def build_price_candidates(
    diagnosis_id: int,
    payload: PriceCandidatesRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """Vision work_items를 단가 후보로 확장.

    - selected는 확정하지 않고 후보 목록만 제공해요.
    - 근거(source_ref)와 RAG 규칙 컨텍스트를 함께 반환해요.
    """
    diagnosis, project = await _ensure_diagnosis_access(diagnosis_id, db, current_user)
    vision = extract_vision_payload(diagnosis.raw_response_json)
    if not vision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="구조화 진단 데이터가 없어요. 먼저 진단을 실행해 주세요.",
        )

    revision_id = payload.revision_id or project.pricebook_revision_id
    if not revision_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="프로젝트에 연결된 단가표 버전이 없어요.",
        )

    items: list[WorkItemCandidatesRead] = []
    for work_item in vision.work_items:
        item = await _build_candidates_for_work_item(
            db=db,
            revision_id=revision_id,
            work_item=work_item.model_dump(mode="json"),
            top_k=payload.top_k,
            include_rules=payload.include_rules,
        )
        items.append(item)

    response_payload = PriceCandidatesResponse(
        revision_id=revision_id,
        items=items,
    )

    raw_payload: dict[str, Any] = diagnosis.raw_response_json or {}
    raw_payload["vision_v2"] = vision.model_dump(mode="json")
    raw_payload["price_candidates"] = response_payload.model_dump(mode="json")
    diagnosis.raw_response_json = raw_payload
    await db.commit()

    return APIResponse.ok(response_payload)


@router.post(
    "/diagnoses/{diagnosis_id}/mappings/select",
    response_model=APIResponse[MappingSelectResponse],
)
async def select_price_mappings(
    diagnosis_id: int,
    payload: MappingSelectRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """work_item별 단가 selected + alternatives 확정.

    단위 불일치는 selected로 확정하지 않고 alternatives로만 남깁니다.
    """
    diagnosis, project = await _ensure_diagnosis_access(diagnosis_id, db, current_user)
    vision = extract_vision_payload(diagnosis.raw_response_json)
    if not vision:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="구조화 진단 데이터가 없어요. 먼저 진단을 실행해 주세요.",
        )

    revision_id = payload.revision_id or project.pricebook_revision_id
    if not revision_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="프로젝트에 연결된 단가표 버전이 없어요.",
        )

    mapping_rows: list[WorkItemMappingRead] = []
    for work_item in vision.work_items:
        work_dict = work_item.model_dump(mode="json")
        candidate_bundle = await _build_candidates_for_work_item(
            db=db,
            revision_id=revision_id,
            work_item=work_dict,
            top_k=payload.top_k,
            include_rules=False,
        )
        candidates = candidate_bundle.candidates
        expected_unit = _normalize_unit(candidate_bundle.expected_unit)
        selected_candidate: Optional[PriceCandidateRead] = None

        requested_price_id = payload.selections.get(work_item.work_id or "")
        if requested_price_id:
            for candidate in candidates:
                if candidate.catalog_item_price_id == requested_price_id:
                    selected_candidate = candidate
                    break

        if selected_candidate is None and candidates:
            for candidate in candidates:
                if expected_unit == "unknown" or _normalize_unit(candidate.unit) == expected_unit:
                    selected_candidate = candidate
                    break
            if selected_candidate is None:
                selected_candidate = candidates[0]

        alternatives: list[PriceCandidateRead] = []
        for candidate in candidates:
            if selected_candidate and candidate.catalog_item_price_id == selected_candidate.catalog_item_price_id:
                continue
            if expected_unit != "unknown" and _normalize_unit(candidate.unit) != expected_unit:
                candidate.excluded_reason = "expected_unit_mismatch"
            alternatives.append(candidate)

        if selected_candidate and expected_unit != "unknown":
            if _normalize_unit(selected_candidate.unit) != expected_unit:
                selected_candidate.excluded_reason = "expected_unit_mismatch"
                alternatives.insert(0, selected_candidate)
                selected_candidate = None

        mapping_rows.append(
            WorkItemMappingRead(
                work_id=work_item.work_id or "",
                selected=selected_candidate,
                alternatives=alternatives[:3],
            )
        )

    response_payload = MappingSelectResponse(
        revision_id=revision_id,
        mappings=mapping_rows,
    )

    raw_payload: dict[str, Any] = diagnosis.raw_response_json or {}
    raw_payload["vision_v2"] = vision.model_dump(mode="json")
    raw_payload["price_mappings"] = response_payload.model_dump(mode="json")
    diagnosis.raw_response_json = raw_payload
    await db.commit()

    return APIResponse.ok(response_payload)


@router.get(
    "/site-visits/{visit_id}/diagnoses",
    response_model=APIResponse[list[AIDiagnosisRead]],
)
async def list_diagnoses(
    visit_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """현장 방문의 진단 목록 조회.
    
    현장 방문에 대한 모든 AI 진단 기록을 조회해요.
    """
    # 현장 방문 권한 확인
    visit_result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == visit_id)
    )
    visit = visit_result.scalar_one_or_none()
    
    if not visit:
        raise NotFoundException("site_visit", visit_id)
    
    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("site_visit", visit_id)
    
    # 진단 목록 조회
    result = await db.execute(
        select(AIDiagnosis)
        .where(AIDiagnosis.site_visit_id == visit_id)
        .order_by(AIDiagnosis.created_at.desc())
    )
    diagnoses = result.scalars().all()
    
    return APIResponse.ok([
        AIDiagnosisRead.model_validate(d) for d in diagnoses
    ])


@router.patch(
    "/diagnoses/{diagnosis_id}/field-opinion",
    response_model=APIResponse[dict],
)
async def update_diagnosis_field_opinion(
    diagnosis_id: int,
    payload: FieldOpinionUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    diagnosis_result = await db.execute(
        select(AIDiagnosis).where(AIDiagnosis.id == diagnosis_id)
    )
    diagnosis = diagnosis_result.scalar_one_or_none()
    if not diagnosis:
        raise NotFoundException("diagnosis", diagnosis_id)

    visit_result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == diagnosis.site_visit_id)
    )
    visit = visit_result.scalar_one_or_none()
    if not visit:
        raise NotFoundException("diagnosis", diagnosis_id)

    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("diagnosis", diagnosis_id)

    diagnosis.field_opinion_text = payload.field_opinion_text
    await db.commit()
    await db.refresh(diagnosis)

    return APIResponse.ok(
        {
            "id": str(diagnosis.id),
            "field_opinion_text": diagnosis.field_opinion_text,
            "updated_at": datetime.utcnow().isoformat(),
        }
    )


@router.patch(
    "/diagnoses/{diagnosis_id}/suggestions/{suggestion_id}",
    response_model=APIResponse[AIMaterialSuggestionRead],
)
async def update_suggestion(
    diagnosis_id: int,
    suggestion_id: int,
    update_data: AIMaterialSuggestionUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """자재 매칭 확인/수정.
    
    AI가 추천한 자재를 확인하거나 다른 자재로 수정해요.
    """
    # 진단 권한 확인
    diagnosis_result = await db.execute(
        select(AIDiagnosis).where(AIDiagnosis.id == diagnosis_id)
    )
    diagnosis = diagnosis_result.scalar_one_or_none()
    
    if not diagnosis:
        raise NotFoundException("diagnosis", diagnosis_id)
    
    # 현장 방문 -> 프로젝트 권한 확인
    visit_result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == diagnosis.site_visit_id)
    )
    visit = visit_result.scalar_one_or_none()
    
    if not visit:
        raise NotFoundException("diagnosis", diagnosis_id)
    
    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("diagnosis", diagnosis_id)
    
    # 자재 추천 조회
    suggestion_result = await db.execute(
        select(AIMaterialSuggestion)
        .where(AIMaterialSuggestion.id == suggestion_id)
        .where(AIMaterialSuggestion.ai_diagnosis_id == diagnosis_id)
    )
    suggestion = suggestion_result.scalar_one_or_none()
    
    if not suggestion:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="자재 추천을 찾을 수 없어요",
        )
    
    # 업데이트
    if update_data.matched_catalog_item_id is not None:
        suggestion.matched_catalog_item_id = update_data.matched_catalog_item_id
    
    if update_data.is_confirmed:
        suggestion.is_confirmed = True
        suggestion.confirmed_by = current_user.id
        suggestion.confirmed_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(suggestion)

    return APIResponse.ok(AIMaterialSuggestionRead.model_validate(suggestion))


@router.get("/diagnoses/{diagnosis_id}/pdf")
async def download_diagnosis_pdf(
    diagnosis_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """AI 소견서 PDF 다운로드."""
    import io as _io
    from urllib.parse import quote
    from app.services.pdf_generator import generate_diagnosis_pdf

    # Load diagnosis
    result = await db.execute(
        select(AIDiagnosis).where(AIDiagnosis.id == diagnosis_id)
    )
    diagnosis = result.scalar_one_or_none()
    if not diagnosis:
        raise NotFoundException("diagnosis", diagnosis_id)

    # Load site visit and project for context
    visit_result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == diagnosis.site_visit_id)
    )
    site_visit = visit_result.scalar_one_or_none()

    project_name = "미상"
    site_address = "미상"
    if site_visit:
        proj_result = await db.execute(
            select(Project)
            .where(Project.id == site_visit.project_id)
            .where(Project.organization_id == current_user.organization_id)
        )
        project = proj_result.scalar_one_or_none()
        if not project:
            raise NotFoundException("diagnosis", diagnosis_id)
        project_name = project.name
        site_address = project.address or project.name

    photo_paths: list[str] = []
    if site_visit:
        photo_result = await db.execute(
            select(Photo)
            .where(Photo.site_visit_id == site_visit.id)
            .order_by(Photo.created_at.desc())
            .limit(8)
        )
        photo_paths = [photo.storage_path for photo in photo_result.scalars().all()]

    # Load material suggestions
    mat_result = await db.execute(
        select(AIMaterialSuggestion).where(
            AIMaterialSuggestion.ai_diagnosis_id == diagnosis_id
        )
    )
    suggestions = mat_result.scalars().all()
    material_list = [
        {
            "item_name": s.suggested_name,
            "spec": s.suggested_spec or "",
            "quantity": str(s.suggested_quantity or ""),
            "unit": s.suggested_unit or "",
        }
        for s in suggestions[:10]
    ]

    pdf_bytes = generate_diagnosis_pdf(
        diagnosis_id=diagnosis_id,
        project_name=project_name,
        site_address=site_address,
        diagnosed_at=diagnosis.created_at,
        leak_opinion_text=diagnosis.leak_opinion_text or "",
        field_opinion_text=diagnosis.field_opinion_text,
        material_suggestions=material_list,
        photo_paths=photo_paths,
    )

    filename = f"소견서_{diagnosis_id}.pdf"
    encoded_filename = quote(filename, safe="")

    return StreamingResponse(
        _io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{encoded_filename}",
        },
    )
