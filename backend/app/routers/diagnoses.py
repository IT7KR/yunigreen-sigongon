"""AI 진단 API 라우터."""
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db, async_session_factory
from app.core.security import get_current_user
from app.services.diagnosis import DiagnosisService
import asyncio
import logging

logger = logging.getLogger(__name__)
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.project import Project, SiteVisit, Photo
from app.models.diagnosis import (
    AIDiagnosis,
    DiagnosisStatus,
    AIDiagnosisCreate,
    AIDiagnosisRead,
    AIMaterialSuggestion,
    AIMaterialSuggestionRead,
    AIMaterialSuggestionUpdate,
)
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


class FieldOpinionUpdateRequest(BaseModel):
    field_opinion_text: str


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
        )
    )


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
