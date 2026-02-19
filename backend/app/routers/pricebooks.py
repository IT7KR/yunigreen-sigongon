"""단가표 관리 API 라우터 (관리자 전용)."""
import tempfile
import os
from datetime import datetime, date
from typing import Annotated, Optional, List
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user, get_current_active_admin
from app.core.exceptions import NotFoundException
from app.core.snowflake import generate_snowflake_id
from app.models.user import User
from app.models.pricebook import (
    Pricebook,
    PricebookCreate,
    PricebookRead,
    PricebookRevision,
    PricebookRevisionCreate,
    PricebookRevisionRead,
    RevisionStatus,
    CatalogItem,
    CatalogItemCreate,
    CatalogItemRead,
    CatalogItemPrice,
    ItemType,
)
from app.models.price_staging import (
    PriceStaging,
    PriceStagingRead,
    PriceStagingReviewRequest,
    PriceStagingBulkReviewRequest,
    PriceStagingSummary,
    StagingStatus,
    ConfidenceLevel,
)
from app.schemas.response import APIResponse, PaginatedResponse
from app.services.price_extractor import PriceExtractor, generate_validation_report

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
AdminUser = Annotated[User, Depends(get_current_active_admin)]


class RevisionWithStats(PricebookRevisionRead):
    """단가표 버전 + 통계."""
    item_count: int = 0


class ActivateResponse(PricebookRevisionRead):
    """활성화 응답."""
    message: str


class UploadResponse(BaseModel):
    id: int
    version_label: str
    status: RevisionStatus
    processing_status: str
    message: str


# === 단가표 버전 API ===

@router.get(
    "/revisions",
    response_model=APIResponse[list[RevisionWithStats]],
)
async def list_revisions(
    db: DBSession,
    admin: AdminUser,
    pricebook_id: Optional[int] = None,
):
    """단가표 버전 목록 조회.
    
    모든 단가표 버전을 조회해요.
    """
    query = select(PricebookRevision)
    
    if pricebook_id:
        query = query.where(PricebookRevision.pricebook_id == pricebook_id)
    
    query = query.order_by(PricebookRevision.effective_from.desc())
    
    result = await db.execute(query)
    revisions = result.scalars().all()
    
    items = []
    for rev in revisions:
        # 품목 수 조회
        count_result = await db.execute(
            select(func.count())
            .select_from(CatalogItemPrice)
            .where(CatalogItemPrice.pricebook_revision_id == rev.id)
        )
        item_count = count_result.scalar() or 0
        
        items.append(
            RevisionWithStats(
                id=rev.id,
                pricebook_id=rev.pricebook_id,
                version_label=rev.version_label,
                effective_from=rev.effective_from,
                effective_to=rev.effective_to,
                status=rev.status,
                created_at=rev.created_at,
                activated_at=rev.activated_at,
                item_count=item_count,
            )
        )
    
    return APIResponse.ok(items)


@router.post(
    "/revisions",
    response_model=APIResponse[UploadResponse],
    status_code=status.HTTP_201_CREATED,
)
async def upload_revision(
    db: DBSession,
    admin: AdminUser,
    file: UploadFile = File(...),
    version_label: str = Form(...),
    effective_from: date = Form(...),
    pricebook_id: Optional[int] = Form(default=None),
):
    """단가표 PDF 업로드.
    
    PDF 파일을 업로드하고 파싱을 시작해요. 파싱이 완료되면 알림을 보내요.
    """
    # 파일 형식 확인
    if not file.content_type == "application/pdf":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="PDF 파일만 업로드할 수 있어요",
        )
    
    # 기본 Pricebook 조회 또는 생성
    if pricebook_id:
        pricebook_result = await db.execute(
            select(Pricebook).where(Pricebook.id == pricebook_id)
        )
        pricebook = pricebook_result.scalar_one_or_none()
        if not pricebook:
            raise NotFoundException("pricebook", pricebook_id)
    else:
        # 기본 Pricebook 조회 또는 생성
        pricebook_result = await db.execute(
            select(Pricebook).where(Pricebook.name == "종합적산정보")
        )
        pricebook = pricebook_result.scalar_one_or_none()
        
        if not pricebook:
            pricebook = Pricebook(
                name="종합적산정보",
                description="대한건설협회 종합적산정보",
                source_type="government",
            )
            db.add(pricebook)
            await db.flush()
    
    # 버전 생성
    revision = PricebookRevision(
        pricebook_id=pricebook.id,
        version_label=version_label,
        effective_from=effective_from,
        status=RevisionStatus.DRAFT,
        source_files=[{"filename": file.filename, "uploaded_at": datetime.utcnow().isoformat()}],
        created_by=admin.id,
    )
    
    db.add(revision)
    await db.commit()
    await db.refresh(revision)
    
    # PDF 파일 임시 저장
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename or "pricebook.pdf")
    
    try:
        content = await file.read()
        with open(temp_path, "wb") as f:
            f.write(content)
        
        # 동기적으로 PDF 처리 (작은 파일은 괜찮음)
        # 대용량 파일은 background_tasks 사용 권장
        staging_count = await process_pricebook_pdf(
            db=db,
            revision_id=revision.id,
            pdf_path=temp_path,
            filename=file.filename or "pricebook.pdf",
        )
        
        return APIResponse.ok({
            "id": str(revision.id),
            "version_label": revision.version_label,
            "status": revision.status.value,
            "processing_status": "completed",
            "staging_items_count": staging_count,
            "message": f"PDF에서 {staging_count}개 가격 항목을 추출했어요. 검토 후 승인해 주세요.",
        })
        
    finally:
        # 임시 파일 정리
        if os.path.exists(temp_path):
            os.remove(temp_path)
        if os.path.exists(temp_dir):
            os.rmdir(temp_dir)


@router.get(
    "/revisions/{revision_id}",
    response_model=APIResponse[RevisionWithStats],
)
async def get_revision(
    revision_id: int,
    db: DBSession,
    admin: AdminUser,
):
    """단가표 버전 상세 조회."""
    result = await db.execute(
        select(PricebookRevision).where(PricebookRevision.id == revision_id)
    )
    revision = result.scalar_one_or_none()
    
    if not revision:
        raise NotFoundException("pricebook", revision_id)
    
    # 품목 수 조회
    count_result = await db.execute(
        select(func.count())
        .select_from(CatalogItemPrice)
        .where(CatalogItemPrice.pricebook_revision_id == revision_id)
    )
    item_count = count_result.scalar() or 0
    
    return APIResponse.ok(
        RevisionWithStats(
            id=revision.id,
            pricebook_id=revision.pricebook_id,
            version_label=revision.version_label,
            effective_from=revision.effective_from,
            effective_to=revision.effective_to,
            status=revision.status,
            created_at=revision.created_at,
            activated_at=revision.activated_at,
            item_count=item_count,
        )
    )


@router.post(
    "/revisions/{revision_id}/activate",
    response_model=APIResponse[ActivateResponse],
)
async def activate_revision(
    revision_id: int,
    db: DBSession,
    admin: AdminUser,
):
    """단가표 버전 활성화.
    
    이 버전을 활성화하고, 이전 활성 버전은 deprecated 처리해요.
    """
    result = await db.execute(
        select(PricebookRevision).where(PricebookRevision.id == revision_id)
    )
    revision = result.scalar_one_or_none()
    
    if not revision:
        raise NotFoundException("pricebook", revision_id)
    
    if revision.status == RevisionStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="이미 활성화된 버전이에요",
        )
    
    # 기존 활성 버전 deprecated 처리
    old_active_result = await db.execute(
        select(PricebookRevision)
        .where(PricebookRevision.pricebook_id == revision.pricebook_id)
        .where(PricebookRevision.status == RevisionStatus.ACTIVE)
    )
    old_active = old_active_result.scalar_one_or_none()
    
    old_version_label = None
    if old_active:
        old_version_label = old_active.version_label
        old_active.status = RevisionStatus.DEPRECATED
        old_active.deprecated_at = datetime.utcnow()
        old_active.effective_to = revision.effective_from
    
    # 새 버전 활성화
    revision.status = RevisionStatus.ACTIVE
    revision.activated_at = datetime.utcnow()
    
    await db.commit()
    await db.refresh(revision)
    
    message = "활성화했어요"
    if old_version_label:
        message = f"활성화했어요. 이전 버전({old_version_label})은 deprecated 처리했어요."
    
    return APIResponse.ok(
        ActivateResponse(
            id=revision.id,
            pricebook_id=revision.pricebook_id,
            version_label=revision.version_label,
            effective_from=revision.effective_from,
            effective_to=revision.effective_to,
            status=revision.status,
            created_at=revision.created_at,
            activated_at=revision.activated_at,
            item_count=0,  # TODO
            message=message,
        )
    )


# === 카탈로그 품목 API ===

@router.get(
    "/items",
    response_model=PaginatedResponse[CatalogItemRead],
)
async def list_catalog_items(
    db: DBSession,
    admin: AdminUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    search: Optional[str] = None,
    category: Optional[str] = None,
):
    """카탈로그 품목 목록 조회."""
    query = select(CatalogItem).where(CatalogItem.is_active == True)
    
    if search:
        search_filter = f"%{search}%"
        query = query.where(
            (CatalogItem.name_ko.ilike(search_filter)) |
            (CatalogItem.item_code.ilike(search_filter))
        )
    
    if category:
        query = query.where(CatalogItem.category_path.ilike(f"%{category}%"))
    
    # 전체 개수
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # 페이지네이션
    query = query.order_by(CatalogItem.category_path, CatalogItem.name_ko)
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return PaginatedResponse.create(
        items=[CatalogItemRead.model_validate(i) for i in items],
        page=page,
        per_page=per_page,
        total=total,
    )


@router.get(
    "/items/{item_id}/prices",
    response_model=APIResponse[list],
)
async def get_item_prices(
    item_id: int,
    db: DBSession,
    admin: AdminUser,
):
    """품목의 버전별 가격 조회."""
    # 품목 확인
    item_result = await db.execute(
        select(CatalogItem).where(CatalogItem.id == item_id)
    )
    item = item_result.scalar_one_or_none()
    
    if not item:
        raise NotFoundException("catalog_item", item_id)
    
    # 가격 조회
    prices_result = await db.execute(
        select(CatalogItemPrice, PricebookRevision)
        .join(PricebookRevision, CatalogItemPrice.pricebook_revision_id == PricebookRevision.id)
        .where(CatalogItemPrice.catalog_item_id == item_id)
        .order_by(PricebookRevision.effective_from.desc())
    )
    prices = prices_result.all()
    
    return APIResponse.ok([
        {
            "revision_id": price.pricebook_revision_id,
            "version_label": revision.version_label,
            "unit_price": str(price.unit_price),
            "effective_from": revision.effective_from.isoformat(),
            "status": revision.status.value,
        }
        for price, revision in prices
    ])


# ============================================================
# Staging API - 추출된 가격 검토/승인
# ============================================================

@router.get(
    "/revisions/{revision_id}/staging",
    response_model=PaginatedResponse[PriceStagingRead],
)
async def list_staging_items(
    revision_id: int,
    db: DBSession,
    admin: AdminUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=50, ge=1, le=100),
    status_filter: Optional[StagingStatus] = Query(default=None, alias="status"),
    confidence_filter: Optional[ConfidenceLevel] = Query(default=None, alias="confidence"),
    grounded_only: bool = Query(default=False),
):
    """Staging 항목 목록 조회.
    
    PDF에서 추출된 가격 항목들을 조회해요.
    검토가 필요한 항목부터 표시해요.
    """
    query = select(PriceStaging).where(
        PriceStaging.pricebook_revision_id == revision_id
    )
    
    if status_filter:
        query = query.where(PriceStaging.status == status_filter)
    
    if confidence_filter:
        query = query.where(PriceStaging.confidence_level == confidence_filter)
    
    if grounded_only:
        query = query.where(PriceStaging.is_grounded == True)
    
    # 정렬: 검토 필요 항목 먼저, 그 다음 신뢰도 낮은 순
    query = query.order_by(
        PriceStaging.status.desc(),  # needs_review 먼저
        PriceStaging.confidence_score.asc(),
        PriceStaging.item_name.asc(),
    )
    
    # 전체 개수
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # 페이지네이션
    query = query.offset((page - 1) * per_page).limit(per_page)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    return PaginatedResponse.create(
        items=[PriceStagingRead.model_validate(i) for i in items],
        page=page,
        per_page=per_page,
        total=total,
    )


@router.get(
    "/revisions/{revision_id}/staging/summary",
    response_model=APIResponse[PriceStagingSummary],
)
async def get_staging_summary(
    revision_id: int,
    db: DBSession,
    admin: AdminUser,
):
    """Staging 요약 조회.
    
    검토 진행 상황을 한눈에 확인할 수 있어요.
    """
    # 전체 개수
    total_result = await db.execute(
        select(func.count()).select_from(PriceStaging)
        .where(PriceStaging.pricebook_revision_id == revision_id)
    )
    total = total_result.scalar() or 0
    
    # 상태별 개수
    status_counts = {}
    for st in StagingStatus:
        count_result = await db.execute(
            select(func.count()).select_from(PriceStaging)
            .where(PriceStaging.pricebook_revision_id == revision_id)
            .where(PriceStaging.status == st)
        )
        status_counts[st.value] = count_result.scalar() or 0
    
    # 고신뢰도 개수
    high_conf_result = await db.execute(
        select(func.count()).select_from(PriceStaging)
        .where(PriceStaging.pricebook_revision_id == revision_id)
        .where(PriceStaging.confidence_level == ConfidenceLevel.HIGH)
    )
    high_confidence = high_conf_result.scalar() or 0
    
    # Grounded 개수
    grounded_result = await db.execute(
        select(func.count()).select_from(PriceStaging)
        .where(PriceStaging.pricebook_revision_id == revision_id)
        .where(PriceStaging.is_grounded == True)
    )
    grounded = grounded_result.scalar() or 0
    
    # 이상치 개수
    anomaly_result = await db.execute(
        select(func.count()).select_from(PriceStaging)
        .where(PriceStaging.pricebook_revision_id == revision_id)
        .where(PriceStaging.anomaly_flags != None)
    )
    anomaly = anomaly_result.scalar() or 0
    
    return APIResponse.ok(
        PriceStagingSummary(
            revision_id=revision_id,
            total_items=total,
            pending_count=status_counts.get("pending", 0),
            approved_count=status_counts.get("approved", 0),
            rejected_count=status_counts.get("rejected", 0),
            needs_review_count=status_counts.get("needs_review", 0),
            high_confidence_count=high_confidence,
            grounded_count=grounded,
            anomaly_count=anomaly,
        )
    )


@router.post(
    "/staging/{staging_id}/review",
    response_model=APIResponse[PriceStagingRead],
)
async def review_staging_item(
    staging_id: int,
    review: PriceStagingReviewRequest,
    db: DBSession,
    admin: AdminUser,
):
    """Staging 항목 검토.
    
    추출된 가격을 승인하거나 거부해요.
    """
    result = await db.execute(
        select(PriceStaging).where(PriceStaging.id == staging_id)
    )
    staging = result.scalar_one_or_none()
    
    if not staging:
        raise NotFoundException("staging", staging_id)
    
    # 수정 적용
    if review.corrected_price is not None:
        staging.unit_price_extracted = review.corrected_price
    if review.corrected_item_name:
        staging.item_name = review.corrected_item_name
    if review.corrected_unit:
        staging.unit = review.corrected_unit
    
    # 상태 업데이트
    staging.status = review.action
    staging.reviewed_at = datetime.utcnow()
    staging.reviewed_by = admin.id
    staging.review_note = review.review_note
    
    await db.commit()
    await db.refresh(staging)
    
    return APIResponse.ok(PriceStagingRead.model_validate(staging))


@router.post(
    "/revisions/{revision_id}/staging/bulk-review",
    response_model=APIResponse[dict],
)
async def bulk_review_staging(
    revision_id: int,
    bulk_review: PriceStagingBulkReviewRequest,
    db: DBSession,
    admin: AdminUser,
):
    """Staging 일괄 검토.
    
    여러 항목을 한 번에 승인하거나 거부해요.
    """
    result = await db.execute(
        select(PriceStaging)
        .where(PriceStaging.pricebook_revision_id == revision_id)
        .where(PriceStaging.id.in_(bulk_review.staging_ids))
    )
    items = result.scalars().all()
    
    updated_count = 0
    for item in items:
        item.status = bulk_review.action
        item.reviewed_at = datetime.utcnow()
        item.reviewed_by = admin.id
        item.review_note = bulk_review.review_note
        updated_count += 1
    
    await db.commit()
    
    return APIResponse.ok({
        "updated_count": updated_count,
        "message": f"{updated_count}개 항목을 {bulk_review.action.value} 처리했어요.",
    })


@router.post(
    "/revisions/{revision_id}/staging/auto-approve",
    response_model=APIResponse[dict],
)
async def auto_approve_staging(
    revision_id: int,
    db: DBSession,
    admin: AdminUser,
    min_confidence: float = Query(default=0.9, ge=0.7, le=1.0),
    require_grounding: bool = Query(default=True),
):
    """고신뢰도 항목 자동 승인.
    
    Grounding 검증 통과 + 높은 신뢰도 항목을 일괄 승인해요.
    """
    query = (
        select(PriceStaging)
        .where(PriceStaging.pricebook_revision_id == revision_id)
        .where(PriceStaging.status == StagingStatus.PENDING)
        .where(PriceStaging.confidence_score >= min_confidence)
    )
    
    if require_grounding:
        query = query.where(PriceStaging.is_grounded == True)
    
    result = await db.execute(query)
    items = result.scalars().all()
    
    approved_count = 0
    for item in items:
        item.status = StagingStatus.APPROVED
        item.reviewed_at = datetime.utcnow()
        item.reviewed_by = admin.id
        item.review_note = f"자동 승인 (confidence >= {min_confidence})"
        approved_count += 1
    
    await db.commit()
    
    return APIResponse.ok({
        "approved_count": approved_count,
        "message": f"{approved_count}개 항목을 자동 승인했어요.",
    })


@router.get(
    "/revisions/{revision_id}/validate",
    response_model=APIResponse[dict],
)
async def validate_revision(
    revision_id: int,
    db: DBSession,
    admin: AdminUser,
):
    """적산 개정안 파싱 결과 검증 리포트 반환.

    Staging 항목들의 품명·단가·단위·Grounding 여부 등을 검사하고
    경고/오류 목록을 반환해요.
    """
    # 버전 존재 확인
    rev_result = await db.execute(
        select(PricebookRevision).where(PricebookRevision.id == revision_id)
    )
    revision = rev_result.scalar_one_or_none()

    if not revision:
        raise NotFoundException("pricebook", revision_id)

    # 해당 버전의 모든 staging 항목 조회
    staging_result = await db.execute(
        select(PriceStaging)
        .where(PriceStaging.pricebook_revision_id == revision_id)
        .order_by(PriceStaging.item_name.asc())
    )
    items = staging_result.scalars().all()

    report = generate_validation_report(items)

    return APIResponse.ok({
        "total_items": report.total_items,
        "valid_count": report.valid_count,
        "warning_count": report.warning_count,
        "error_count": report.error_count,
        "is_valid": report.is_valid,
        "issues": [
            {
                "item_index": issue.item_index,
                "item_name": issue.item_name,
                "field": issue.field,
                "severity": issue.severity.value,
                "message": issue.message,
                "value": issue.value,
            }
            for issue in report.issues
        ],
    })


@router.post(
    "/revisions/{revision_id}/promote",
    response_model=APIResponse[dict],
)
async def promote_approved_staging(
    revision_id: int,
    db: DBSession,
    admin: AdminUser,
):
    """승인된 Staging을 정식 DB로 이동.
    
    승인된 모든 staging 항목을 CatalogItemPrice로 이동해요.
    이 작업 후에만 견적 생성에서 해당 가격을 사용할 수 있어요.
    """
    # 승인된 항목 조회
    result = await db.execute(
        select(PriceStaging)
        .where(PriceStaging.pricebook_revision_id == revision_id)
        .where(PriceStaging.status == StagingStatus.APPROVED)
        .where(PriceStaging.promoted_price_id == None)  # 아직 promote 안 된 것만
    )
    approved_items = result.scalars().all()
    
    if not approved_items:
        return APIResponse.ok({
            "promoted_count": 0,
            "message": "이동할 항목이 없어요. 먼저 항목을 승인해 주세요.",
        })
    
    promoted_count = 0
    
    for staging in approved_items:
        # 카탈로그 항목 찾기 또는 생성
        catalog_item = await _get_or_create_catalog_item(
            db=db,
            item_name=staging.item_name,
            specification=staging.specification,
            unit=staging.unit,
        )
        
        # 가격 레코드 생성
        price = CatalogItemPrice(
            id=generate_snowflake_id(),
            pricebook_revision_id=revision_id,
            catalog_item_id=catalog_item.id,
            unit_price=staging.unit_price_extracted,
            source_pdf_page=staging.source_page,
            source_row_text=staging.source_text_snippet[:200] if staging.source_text_snippet else None,
        )
        db.add(price)
        
        # staging에 promote 기록
        staging.promoted_price_id = price.id
        promoted_count += 1
    
    await db.commit()
    
    return APIResponse.ok({
        "promoted_count": promoted_count,
        "message": f"{promoted_count}개 가격을 정식 DB에 등록했어요. 이제 견적에서 사용할 수 있어요.",
    })


# ============================================================
# Helper Functions
# ============================================================

async def process_pricebook_pdf(
    db: AsyncSession,
    revision_id: int,
    pdf_path: str,
    filename: str,
) -> int:
    """PDF에서 가격 추출하여 staging에 저장.
    
    Returns:
        추출된 항목 수
    """
    try:
        from pypdf import PdfReader
    except ImportError:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="pypdf 패키지가 설치되지 않았어요",
        )
    
    # PDF에서 페이지별 텍스트 추출
    reader = PdfReader(pdf_path)
    pages = []
    
    for page_num, page in enumerate(reader.pages, start=1):
        text = page.extract_text() or ""
        if text.strip():
            pages.append((page_num, text))
    
    if not pages:
        return 0
    
    # PriceExtractor로 가격 추출 및 staging 저장
    extractor = PriceExtractor(db)
    staging_items = await extractor.extract_from_pages(
        pages=pages,
        source_file=filename,
        revision_id=revision_id,
    )
    
    await db.commit()
    
    return len(staging_items)


async def _get_or_create_catalog_item(
    db: AsyncSession,
    item_name: str,
    specification: Optional[str],
    unit: str,
) -> CatalogItem:
    """카탈로그 항목 조회 또는 생성."""
    # 기존 항목 검색
    query = select(CatalogItem).where(CatalogItem.name_ko == item_name)
    if specification:
        query = query.where(CatalogItem.specification == specification)
    
    result = await db.execute(query)
    item = result.scalar_one_or_none()
    
    if item:
        return item
    
    # 새 항목 생성
    item_type = _determine_item_type(item_name)
    
    new_item = CatalogItem(
        id=generate_snowflake_id(),
        item_type=item_type,
        name_ko=item_name,
        specification=specification,
        base_unit=unit,
        is_active=True,
    )
    db.add(new_item)
    await db.flush()
    
    return new_item


def _determine_item_type(item_name: str) -> ItemType:
    """품명으로 항목 유형 결정."""
    labor_keywords = ["공", "인부", "기능공", "기술자", "조공", "보통인부", "노무"]
    equipment_keywords = ["기계", "장비", "크레인", "펌프", "믹서", "임대"]
    
    for kw in labor_keywords:
        if kw in item_name:
            return ItemType.LABOR
    
    for kw in equipment_keywords:
        if kw in item_name:
            return ItemType.EQUIPMENT
    
    return ItemType.MATERIAL
