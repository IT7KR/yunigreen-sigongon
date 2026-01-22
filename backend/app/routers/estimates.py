import io
import uuid
from datetime import datetime
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.core.exceptions import (
    NotFoundException, 
    EstimateLockedException,
    NoPricebookActiveException,
)
from app.models.user import User
from app.models.project import Project
from app.models.diagnosis import AIDiagnosis, AIMaterialSuggestion
from app.models.pricebook import PricebookRevision, CatalogItemPrice, CatalogItem
from app.models.estimate import (
    Estimate,
    EstimateStatus,
    EstimateCreate,
    EstimateRead,
    EstimateUpdate,
    EstimateLine,
    EstimateLineCreate,
    EstimateLineRead,
    EstimateLineUpdate,
    LineSource,
)
from app.schemas.response import APIResponse, PaginatedResponse
from app.services.pdf_generator import generate_estimate_pdf

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class EstimateWithLines(EstimateRead):
    """견적서 + 항목 목록."""
    lines: list[EstimateLineRead] = []


class IssueResponse(EstimateRead):
    """발행 응답."""
    message: str = "견적서를 발행했어요"


@router.get(
    "/projects/{project_id}/estimates",
    response_model=APIResponse[list[EstimateRead]],
)
async def list_estimates(
    project_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 견적서 목록 조회.
    
    프로젝트의 모든 견적서를 조회해요.
    """
    # 프로젝트 권한 확인
    project_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("project", project_id)
    
    # 견적서 목록 조회
    result = await db.execute(
        select(Estimate)
        .where(Estimate.project_id == project_id)
        .order_by(Estimate.version.desc())
    )
    estimates = result.scalars().all()
    
    return APIResponse.ok([EstimateRead.model_validate(e) for e in estimates])


@router.post(
    "/projects/{project_id}/estimates",
    response_model=APIResponse[EstimateWithLines],
    status_code=status.HTTP_201_CREATED,
)
async def create_estimate(
    project_id: uuid.UUID,
    estimate_data: EstimateCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """견적서 생성.
    
    AI 진단 결과를 바탕으로 견적서를 만들어요.
    단가는 프로젝트에 연결된 단가표 버전을 사용해요.
    """
    # 프로젝트 확인
    project_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    if not project.pricebook_revision_id:
        raise NoPricebookActiveException()
    
    # 다음 버전 번호
    version_result = await db.execute(
        select(func.max(Estimate.version))
        .where(Estimate.project_id == project_id)
    )
    max_version = version_result.scalar() or 0
    
    # 견적서 생성
    estimate = Estimate(
        project_id=project_id,
        version=max_version + 1,
        pricebook_revision_id=project.pricebook_revision_id,
        created_by=current_user.id,
    )
    
    db.add(estimate)
    await db.flush()  # ID 생성
    
    lines = []
    
    # AI 진단 결과에서 자재 추천 가져오기
    if estimate_data.diagnosis_id:
        diagnosis_result = await db.execute(
            select(AIDiagnosis).where(AIDiagnosis.id == estimate_data.diagnosis_id)
        )
        diagnosis = diagnosis_result.scalar_one_or_none()
        
        if diagnosis:
            await db.refresh(diagnosis, ["suggestions"])
            
            for idx, suggestion in enumerate(diagnosis.suggestions or []):
                # 확인된 것만 포함 옵션
                if estimate_data.include_confirmed_only and not suggestion.is_confirmed:
                    continue
                
                # 카탈로그 품목 가격 조회
                unit_price = Decimal("0")
                if suggestion.matched_catalog_item_id:
                    price_result = await db.execute(
                        select(CatalogItemPrice)
                        .where(
                            CatalogItemPrice.catalog_item_id == suggestion.matched_catalog_item_id,
                            CatalogItemPrice.pricebook_revision_id == project.pricebook_revision_id,
                        )
                    )
                    price = price_result.scalar_one_or_none()
                    if price:
                        unit_price = price.unit_price
                
                quantity = suggestion.suggested_quantity or Decimal("1")
                amount = quantity * unit_price
                
                line = EstimateLine(
                    estimate_id=estimate.id,
                    sort_order=idx + 1,
                    description=suggestion.suggested_name,
                    specification=suggestion.suggested_spec or "",
                    unit=suggestion.suggested_unit or "EA",
                    quantity=quantity,
                    unit_price_snapshot=unit_price,
                    amount=amount,
                    catalog_item_id=suggestion.matched_catalog_item_id,
                    source=LineSource.AI,
                    ai_suggestion_id=suggestion.id,
                )
                db.add(line)
                lines.append(line)
    
    # 합계 계산
    subtotal = sum(line.amount for line in lines)
    vat_amount = subtotal * Decimal("0.1")
    total_amount = subtotal + vat_amount
    
    estimate.subtotal = subtotal
    estimate.vat_amount = vat_amount
    estimate.total_amount = total_amount
    
    await db.commit()
    await db.refresh(estimate)
    
    return APIResponse.ok(
        EstimateWithLines(
            id=estimate.id,
            project_id=estimate.project_id,
            version=estimate.version,
            pricebook_revision_id=estimate.pricebook_revision_id,
            notes=estimate.notes,
            status=estimate.status,
            subtotal=estimate.subtotal,
            vat_amount=estimate.vat_amount,
            total_amount=estimate.total_amount,
            created_at=estimate.created_at,
            issued_at=estimate.issued_at,
            lines=[EstimateLineRead.model_validate(l) for l in lines],
        )
    )


@router.get(
    "/estimates/{estimate_id}",
    response_model=APIResponse[EstimateWithLines],
)
async def get_estimate(
    estimate_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """견적서 상세 조회.
    
    견적서 상세 정보와 모든 항목을 조회해요.
    """
    result = await db.execute(
        select(Estimate).where(Estimate.id == estimate_id)
    )
    estimate = result.scalar_one_or_none()
    
    if not estimate:
        raise NotFoundException("estimate", estimate_id)
    
    # 프로젝트 권한 확인
    project_result = await db.execute(
        select(Project)
        .where(Project.id == estimate.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("estimate", estimate_id)
    
    # 항목 로드
    await db.refresh(estimate, ["lines"])
    
    return APIResponse.ok(
        EstimateWithLines(
            id=estimate.id,
            project_id=estimate.project_id,
            version=estimate.version,
            pricebook_revision_id=estimate.pricebook_revision_id,
            notes=estimate.notes,
            status=estimate.status,
            subtotal=estimate.subtotal,
            vat_amount=estimate.vat_amount,
            total_amount=estimate.total_amount,
            created_at=estimate.created_at,
            issued_at=estimate.issued_at,
            lines=[
                EstimateLineRead.model_validate(l) 
                for l in sorted(estimate.lines or [], key=lambda x: x.sort_order)
            ],
        )
    )


@router.post(
    "/estimates/{estimate_id}/lines",
    response_model=APIResponse[EstimateLineRead],
    status_code=status.HTTP_201_CREATED,
)
async def add_estimate_line(
    estimate_id: uuid.UUID,
    line_data: EstimateLineCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """견적 항목 추가.
    
    견적서에 새 항목을 추가해요.
    """
    # 견적서 확인
    estimate = await _get_editable_estimate(estimate_id, current_user, db)
    
    # 금액 계산
    amount = line_data.quantity * line_data.unit_price_snapshot
    
    line = EstimateLine(
        estimate_id=estimate_id,
        sort_order=line_data.sort_order,
        description=line_data.description,
        specification=line_data.specification,
        unit=line_data.unit,
        quantity=line_data.quantity,
        unit_price_snapshot=line_data.unit_price_snapshot,
        amount=amount,
        catalog_item_id=line_data.catalog_item_id,
        source=LineSource.MANUAL,
        last_edited_by=current_user.id,
    )
    
    db.add(line)
    
    # 합계 재계산
    await _recalculate_totals(estimate, db)
    
    await db.commit()
    await db.refresh(line)
    
    return APIResponse.ok(EstimateLineRead.model_validate(line))


@router.patch(
    "/estimates/{estimate_id}/lines/{line_id}",
    response_model=APIResponse[EstimateLineRead],
)
async def update_estimate_line(
    estimate_id: uuid.UUID,
    line_id: uuid.UUID,
    line_data: EstimateLineUpdate,
    db: DBSession,
    current_user: CurrentUser,
):
    """견적 항목 수정.
    
    견적서 항목을 수정해요. 발행된 견적서는 수정할 수 없어요.
    """
    # 견적서 확인
    estimate = await _get_editable_estimate(estimate_id, current_user, db)
    
    # 항목 확인
    line_result = await db.execute(
        select(EstimateLine)
        .where(EstimateLine.id == line_id)
        .where(EstimateLine.estimate_id == estimate_id)
    )
    line = line_result.scalar_one_or_none()
    
    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="견적 항목을 찾을 수 없어요",
        )
    
    # 필드 업데이트
    update_data = line_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(line, field, value)
    
    # 금액 재계산
    line.amount = line.quantity * line.unit_price_snapshot
    line.updated_at = datetime.utcnow()
    line.last_edited_by = current_user.id
    
    # 합계 재계산
    await _recalculate_totals(estimate, db)
    
    await db.commit()
    await db.refresh(line)
    
    return APIResponse.ok(EstimateLineRead.model_validate(line))


@router.delete(
    "/estimates/{estimate_id}/lines/{line_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_estimate_line(
    estimate_id: uuid.UUID,
    line_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """견적 항목 삭제.
    
    견적서 항목을 삭제해요.
    """
    estimate = await _get_editable_estimate(estimate_id, current_user, db)
    
    line_result = await db.execute(
        select(EstimateLine)
        .where(EstimateLine.id == line_id)
        .where(EstimateLine.estimate_id == estimate_id)
    )
    line = line_result.scalar_one_or_none()
    
    if not line:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="견적 항목을 찾을 수 없어요",
        )
    
    await db.delete(line)
    
    # 합계 재계산
    await _recalculate_totals(estimate, db)
    
    await db.commit()


@router.post(
    "/estimates/{estimate_id}/issue",
    response_model=APIResponse[IssueResponse],
)
async def issue_estimate(
    estimate_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """견적서 발행.
    
    견적서를 발행해요. 발행하면 단가가 확정되고 수정할 수 없어요.
    """
    estimate = await _get_editable_estimate(estimate_id, current_user, db)
    
    # 항목 확인
    await db.refresh(estimate, ["lines"])
    
    if not estimate.lines:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="견적 항목이 없어요. 항목을 추가해 주세요.",
        )
    
    # 발행
    estimate.status = EstimateStatus.ISSUED
    estimate.issued_at = datetime.utcnow()
    estimate.issued_by = current_user.id
    
    await db.commit()
    await db.refresh(estimate)
    
    response = IssueResponse(
        id=estimate.id,
        project_id=estimate.project_id,
        version=estimate.version,
        pricebook_revision_id=estimate.pricebook_revision_id,
        notes=estimate.notes,
        status=estimate.status,
        subtotal=estimate.subtotal,
        vat_amount=estimate.vat_amount,
        total_amount=estimate.total_amount,
        created_at=estimate.created_at,
        issued_at=estimate.issued_at,
        message="견적서를 발행했어요",
    )
    
    return APIResponse.ok(response)


@router.get(
    "/estimates/{estimate_id}/export",
)
async def export_estimate(
    estimate_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
    format: str = Query(default="pdf", pattern="^(xlsx|pdf)$"),
):
    result = await db.execute(
        select(Estimate).where(Estimate.id == estimate_id)
    )
    estimate = result.scalar_one_or_none()
    
    if not estimate:
        raise NotFoundException("estimate", estimate_id)
    
    project_result = await db.execute(
        select(Project)
        .where(Project.id == estimate.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise NotFoundException("estimate", estimate_id)
    
    await db.refresh(estimate, ["lines"])
    
    if format == "pdf":
        lines_data = [
            {
                "description": line.description,
                "specification": line.specification,
                "unit": line.unit,
                "quantity": float(line.quantity),
                "unit_price": float(line.unit_price_snapshot),
                "amount": float(line.amount),
            }
            for line in sorted(estimate.lines or [], key=lambda x: x.sort_order)
        ]
        
        pdf_bytes = generate_estimate_pdf(
            estimate_id=str(estimate.id),
            project_name=project.name,
            client_name=project.client_name or "",
            client_address=project.address or "",
            estimate_version=estimate.version,
            lines=lines_data,
            subtotal=estimate.subtotal,
            vat_amount=estimate.vat_amount,
            total_amount=estimate.total_amount,
            issued_at=estimate.issued_at,
            notes=estimate.notes,
        )
        
        from urllib.parse import quote
        filename = f"estimate_v{estimate.version}.pdf"
        filename_utf8 = f"견적서_{project.name}_v{estimate.version}.pdf"
        
        return StreamingResponse(
            io.BytesIO(pdf_bytes),
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=\"{filename}\"; filename*=UTF-8''{quote(filename_utf8)}"
            }
        )
    
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Excel 내보내기 기능은 준비 중이에요",
    )


# === Helper Functions ===

async def _get_editable_estimate(
    estimate_id: uuid.UUID,
    current_user: User,
    db: AsyncSession,
) -> Estimate:
    """수정 가능한 견적서 조회."""
    result = await db.execute(
        select(Estimate).where(Estimate.id == estimate_id)
    )
    estimate = result.scalar_one_or_none()
    
    if not estimate:
        raise NotFoundException("estimate", estimate_id)
    
    # 권한 확인
    project_result = await db.execute(
        select(Project)
        .where(Project.id == estimate.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("estimate", estimate_id)
    
    # 발행 상태 확인
    if estimate.status != EstimateStatus.DRAFT:
        raise EstimateLockedException()
    
    return estimate


async def _recalculate_totals(estimate: Estimate, db: AsyncSession) -> None:
    """견적서 합계 재계산."""
    await db.refresh(estimate, ["lines"])
    
    subtotal = sum(line.amount for line in (estimate.lines or []))
    vat_amount = subtotal * Decimal("0.1")
    total_amount = subtotal + vat_amount
    
    estimate.subtotal = subtotal
    estimate.vat_amount = vat_amount
    estimate.total_amount = total_amount
    estimate.updated_at = datetime.utcnow()
