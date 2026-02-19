import io
from datetime import datetime
from decimal import Decimal
from typing import Any, Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.core.exceptions import (
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
from app.schemas.vision import extract_vision_payload
from app.services.pdf_generator import generate_estimate_pdf
from app.services.referential_integrity import ensure_exists, ensure_exists_in_org

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class EstimateWithLines(EstimateRead):
    """견적서 + 항목 목록."""
    lines: list[EstimateLineRead] = []
    range_total_min: Optional[Decimal] = None
    range_total_max: Optional[Decimal] = None
    range_unconfirmed_lines: int = 0


class IssueResponse(EstimateRead):
    """발행 응답."""
    message: str = "견적서를 발행했어요"


@router.get(
    "/projects/{project_id}/estimates",
    response_model=APIResponse[list[EstimateRead]],
)
async def list_estimates(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """프로젝트 견적서 목록 조회.
    
    프로젝트의 모든 견적서를 조회해요.
    """
    await ensure_exists_in_org(db, Project, project_id, current_user, "project")
    
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
    project_id: int,
    estimate_data: EstimateCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """견적서 생성.
    
    AI 진단 결과를 바탕으로 견적서를 만들어요.
    단가는 프로젝트에 연결된 단가표 버전을 사용해요.
    """
    project = await ensure_exists_in_org(db, Project, project_id, current_user, "project")
    
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
    
    lines: list[EstimateLine] = []
    range_total_min = Decimal("0")
    range_total_max = Decimal("0")
    range_unconfirmed_lines = 0
    
    # AI 진단 결과에서 자재 추천 가져오기
    if estimate_data.diagnosis_id:
        diagnosis = await ensure_exists(
            db,
            AIDiagnosis,
            estimate_data.diagnosis_id,
            "diagnosis",
        )
        await db.refresh(diagnosis, ["suggestions"])

        mapped_lines, mapping_meta = await _build_lines_from_price_mappings(
            db=db,
            diagnosis=diagnosis,
            estimate_id=estimate.id,
            revision_id=project.pricebook_revision_id,
        )
        lines.extend(mapped_lines)
        range_total_min += mapping_meta["range_total_min"]
        range_total_max += mapping_meta["range_total_max"]
        range_unconfirmed_lines += mapping_meta["unconfirmed_lines"]

        # Backward compatibility: if structured mappings are absent, use legacy material suggestions.
        if not lines:
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
                range_total_min += amount
                range_total_max += amount
    
    # 합계 계산
    subtotal = sum(line.amount for line in lines)
    vat_amount = subtotal * Decimal("0.1")
    total_amount = subtotal + vat_amount
    
    estimate.subtotal = subtotal
    estimate.vat_amount = vat_amount
    estimate.total_amount = total_amount
    if range_total_max > range_total_min or range_unconfirmed_lines > 0:
        range_note = (
            f"[자동산출] 범위합계 {range_total_min:,.0f}원 ~ {range_total_max:,.0f}원, "
            f"미확정 항목 {range_unconfirmed_lines}건"
        )
        estimate.notes = (
            f"{estimate.notes}\n{range_note}".strip()
            if estimate.notes else range_note
        )
    
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
            range_total_min=range_total_min,
            range_total_max=range_total_max,
            range_unconfirmed_lines=range_unconfirmed_lines,
        )
    )


@router.get(
    "/estimates/{estimate_id}",
    response_model=APIResponse[EstimateWithLines],
)
async def get_estimate(
    estimate_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """견적서 상세 조회.
    
    견적서 상세 정보와 모든 항목을 조회해요.
    """
    estimate = await ensure_exists(db, Estimate, estimate_id, "estimate")
    await ensure_exists_in_org(db, Project, estimate.project_id, current_user, "project")
    
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
    estimate_id: int,
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
    estimate_id: int,
    line_id: int,
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
    estimate_id: int,
    line_id: int,
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
    estimate_id: int,
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
    estimate_id: int,
    db: DBSession,
    current_user: CurrentUser,
    format: str = Query(default="pdf", pattern="^(xlsx|pdf)$"),
):
    estimate = await ensure_exists(db, Estimate, estimate_id, "estimate")
    project = await ensure_exists_in_org(db, Project, estimate.project_id, current_user, "project")
    
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


@router.get("/estimates/{estimate_id}/pdf")
async def export_estimate_pdf_alias(
    estimate_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """프론트 호환용 PDF 별칭 경로."""
    return await export_estimate(
        estimate_id=estimate_id,
        db=db,
        current_user=current_user,
        format="pdf",
    )


# === Helper Functions ===

async def _build_lines_from_price_mappings(
    db: AsyncSession,
    diagnosis: AIDiagnosis,
    estimate_id: int,
    revision_id: int,
) -> tuple[list[EstimateLine], dict[str, Any]]:
    raw_payload = diagnosis.raw_response_json if isinstance(diagnosis.raw_response_json, dict) else {}
    vision = extract_vision_payload(raw_payload)
    if not vision:
        return [], {
            "range_total_min": Decimal("0"),
            "range_total_max": Decimal("0"),
            "unconfirmed_lines": 0,
        }

    mappings = raw_payload.get("price_mappings", {})
    mapping_rows = mappings.get("mappings", []) if isinstance(mappings, dict) else []
    mapping_by_work_id: dict[str, dict[str, Any]] = {}
    for row in mapping_rows:
        if not isinstance(row, dict):
            continue
        work_id = row.get("work_id")
        if isinstance(work_id, str):
            mapping_by_work_id[work_id] = row

    lines: list[EstimateLine] = []
    range_total_min = Decimal("0")
    range_total_max = Decimal("0")
    unconfirmed_lines = 0
    sort_order = 1

    for work_item in vision.work_items:
        work_id = work_item.work_id or ""
        mapping_row = mapping_by_work_id.get(work_id)
        selected = mapping_row.get("selected") if isinstance(mapping_row, dict) else None
        if not isinstance(selected, dict):
            unconfirmed_lines += 1
            continue

        selected_price_id = selected.get("catalog_item_price_id")
        if not selected_price_id:
            unconfirmed_lines += 1
            continue

        try:
            selected_price_id_int = int(selected_price_id)
        except (TypeError, ValueError):
            unconfirmed_lines += 1
            continue

        price_result = await db.execute(
            select(CatalogItemPrice, CatalogItem)
            .join(CatalogItem, CatalogItem.id == CatalogItemPrice.catalog_item_id)
            .where(
                CatalogItemPrice.id == selected_price_id_int,
                CatalogItemPrice.pricebook_revision_id == revision_id,
            )
        )
        joined = price_result.first()
        if not joined:
            unconfirmed_lines += 1
            continue
        price_row, catalog_item = joined

        quantity_value: Decimal
        quantity_min: Decimal
        quantity_max: Decimal
        if work_item.quantity.value is not None:
            quantity_value = Decimal(str(work_item.quantity.value))
            quantity_min = quantity_value
            quantity_max = quantity_value
        elif work_item.quantity.range is not None:
            quantity_min = Decimal(str(work_item.quantity.range.min))
            quantity_max = Decimal(str(work_item.quantity.range.max))
            quantity_value = quantity_min
        else:
            quantity_value = Decimal("0")
            quantity_min = Decimal("0")
            quantity_max = Decimal("0")
            unconfirmed_lines += 1

        unit_price = price_row.unit_price
        amount = quantity_value * unit_price
        range_total_min += quantity_min * unit_price
        range_total_max += quantity_max * unit_price

        source_ref = selected.get("source_ref", {}) if isinstance(selected, dict) else {}
        source_page = source_ref.get("source_page") if isinstance(source_ref, dict) else None
        specification_parts = [
            catalog_item.specification or "",
            work_item.scope_location or "",
        ]
        if source_page:
            specification_parts.append(f"근거 p.{source_page}")
        if quantity_max > quantity_min:
            specification_parts.append(f"수량범위 {quantity_min}~{quantity_max}")
        specification = " | ".join(part for part in specification_parts if part)

        line = EstimateLine(
            estimate_id=estimate_id,
            sort_order=sort_order,
            description=work_item.task or catalog_item.name_ko,
            specification=specification,
            unit=selected.get("unit") or catalog_item.base_unit,
            quantity=quantity_value,
            unit_price_snapshot=unit_price,
            amount=amount,
            catalog_item_id=catalog_item.id,
            source=LineSource.AI,
            ai_suggestion_id=None,
        )
        db.add(line)
        lines.append(line)
        sort_order += 1

    return lines, {
        "range_total_min": range_total_min,
        "range_total_max": range_total_max,
        "unconfirmed_lines": unconfirmed_lines,
    }

async def _get_editable_estimate(
    estimate_id: int,
    current_user: User,
    db: AsyncSession,
) -> Estimate:
    """수정 가능한 견적서 조회."""
    estimate = await ensure_exists(db, Estimate, estimate_id, "estimate")
    await ensure_exists_in_org(db, Project, estimate.project_id, current_user, "project")
    
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
