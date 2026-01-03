"""AI 진단 API 라우터."""
import uuid
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
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


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


class DiagnosisRequestResponse:
    """진단 요청 응답."""
    diagnosis_id: uuid.UUID
    status: DiagnosisStatus
    message: str


class DiagnosisDetailResponse(AIDiagnosisRead):
    """진단 상세 응답."""
    suggested_materials: list[AIMaterialSuggestionRead] = []


@router.post(
    "/site-visits/{visit_id}/diagnose",
    response_model=APIResponse[DiagnosisRequestResponse],
    status_code=status.HTTP_202_ACCEPTED,
)
async def request_diagnosis(
    visit_id: uuid.UUID,
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
    )
    
    db.add(diagnosis)
    await db.commit()
    await db.refresh(diagnosis)
    
    # 백그라운드로 AI 분석 실행
    # TODO: 실제 서비스 구현 후 연결
    # background_tasks.add_task(
    #     run_ai_diagnosis,
    #     diagnosis_id=diagnosis.id,
    #     photo_paths=[p.storage_path for p in photos],
    #     additional_notes=request_data.additional_notes,
    # )
    
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
    diagnosis_id: uuid.UUID,
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
    if not project_result.scalar_one_or_none():
        raise NotFoundException("diagnosis", diagnosis_id)
    
    # 자재 추천 로드
    await db.refresh(diagnosis, ["suggestions"])
    
    return APIResponse.ok(
        DiagnosisDetailResponse(
            id=diagnosis.id,
            site_visit_id=diagnosis.site_visit_id,
            model_name=diagnosis.model_name,
            model_version=diagnosis.model_version,
            leak_opinion_text=diagnosis.leak_opinion_text,
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
    visit_id: uuid.UUID,
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
    "/diagnoses/{diagnosis_id}/suggestions/{suggestion_id}",
    response_model=APIResponse[AIMaterialSuggestionRead],
)
async def update_suggestion(
    diagnosis_id: uuid.UUID,
    suggestion_id: uuid.UUID,
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
