"""현장 방문 및 사진 API 라우터."""
import uuid
import os
from datetime import datetime
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.database import get_async_db
from app.core.security import get_current_user
from app.core.exceptions import (
    NotFoundException, 
    FileTooLargeException, 
    InvalidFileTypeException,
)
from app.models.user import User
from app.models.project import (
    Project,
    SiteVisit,
    SiteVisitCreate,
    SiteVisitRead,
    Photo,
    PhotoType,
    PhotoRead,
    VisitType,
)
from app.schemas.response import APIResponse
from app.services.storage import storage_service

router = APIRouter()


# 타입 별칭
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

# 허용 파일 형식
ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"]
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB


class SiteVisitWithPhotos(SiteVisitRead):
    """현장 방문 정보 + 사진 목록."""
    photos: list[PhotoRead] = []
    technician_name: Optional[str] = None


# === 현장 방문 API ===

@router.post(
    "/projects/{project_id}/site-visits",
    response_model=APIResponse[SiteVisitRead],
    status_code=status.HTTP_201_CREATED,
)
async def create_site_visit(
    project_id: uuid.UUID,
    visit_data: SiteVisitCreate,
    db: DBSession,
    current_user: CurrentUser,
):
    """현장 방문 기록 생성.
    
    프로젝트에 현장 방문 기록을 추가해요.
    """
    # 프로젝트 확인
    result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = result.scalar_one_or_none()
    
    if not project:
        raise NotFoundException("project", project_id)
    
    # 현장 방문 생성
    site_visit = SiteVisit(
        project_id=project_id,
        technician_id=current_user.id,
        visit_type=visit_data.visit_type,
        visited_at=visit_data.visited_at,
        notes=visit_data.notes,
    )
    
    db.add(site_visit)
    await db.commit()
    await db.refresh(site_visit)
    
    return APIResponse.ok(
        SiteVisitRead(
            id=site_visit.id,
            project_id=site_visit.project_id,
            technician_id=site_visit.technician_id,
            visit_type=site_visit.visit_type,
            visited_at=site_visit.visited_at,
            notes=site_visit.notes,
            created_at=site_visit.created_at,
            photo_count=0,
        )
    )


@router.get(
    "/projects/{project_id}/site-visits",
    response_model=APIResponse[list[SiteVisitWithPhotos]],
)
async def list_site_visits(
    project_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """현장 방문 목록 조회.
    
    프로젝트의 모든 현장 방문 기록을 조회해요.
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
    
    # 방문 기록 조회
    result = await db.execute(
        select(SiteVisit)
        .where(SiteVisit.project_id == project_id)
        .order_by(SiteVisit.visited_at.desc())
    )
    visits = result.scalars().all()
    
    # 응답 변환
    items = []
    for visit in visits:
        await db.refresh(visit, ["photos"])
        items.append(
            SiteVisitWithPhotos(
                id=visit.id,
                project_id=visit.project_id,
                technician_id=visit.technician_id,
                visit_type=visit.visit_type,
                visited_at=visit.visited_at,
                notes=visit.notes,
                created_at=visit.created_at,
                photo_count=len(visit.photos) if visit.photos else 0,
                photos=[PhotoRead.model_validate(p) for p in (visit.photos or [])],
            )
        )
    
    return APIResponse.ok(items)


@router.get(
    "/site-visits/{visit_id}",
    response_model=APIResponse[SiteVisitWithPhotos],
)
async def get_site_visit(
    visit_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """현장 방문 상세 조회.
    
    현장 방문 기록의 상세 정보를 확인해요.
    """
    result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == visit_id)
    )
    visit = result.scalar_one_or_none()
    
    if not visit:
        raise NotFoundException("site_visit", visit_id)
    
    # 프로젝트 권한 확인
    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("site_visit", visit_id)
    
    await db.refresh(visit, ["photos"])
    
    return APIResponse.ok(
        SiteVisitWithPhotos(
            id=visit.id,
            project_id=visit.project_id,
            technician_id=visit.technician_id,
            visit_type=visit.visit_type,
            visited_at=visit.visited_at,
            notes=visit.notes,
            created_at=visit.created_at,
            photo_count=len(visit.photos) if visit.photos else 0,
            photos=[PhotoRead.model_validate(p) for p in (visit.photos or [])],
        )
    )


# === 사진 API ===

@router.post(
    "/site-visits/{visit_id}/photos",
    response_model=APIResponse[PhotoRead],
    status_code=status.HTTP_201_CREATED,
)
async def upload_photo(
    visit_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    photo_type: PhotoType = Form(default=PhotoType.BEFORE),
    caption: Optional[str] = Form(default=None),
):
    """사진 업로드.
    
    현장 방문에 사진을 올려요. JPEG, PNG, WebP 형식만 가능해요.
    """
    # 현장 방문 확인
    result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == visit_id)
    )
    visit = result.scalar_one_or_none()
    
    if not visit:
        raise NotFoundException("site_visit", visit_id)
    
    # 프로젝트 권한 확인
    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("site_visit", visit_id)
    
    if not storage_service.validate_image(file):
        raise InvalidFileTypeException(["JPEG", "PNG", "WebP"])
    
    if not storage_service.validate_file_size(file):
        raise FileTooLargeException(10)
    
    storage_path = await storage_service.save_photo(
        file=file,
        project_id=str(visit.project_id),
        visit_id=str(visit_id),
    )
    
    content = await file.read()
    await file.seek(0)
    
    # 사진 레코드 생성
    photo = Photo(
        site_visit_id=visit_id,
        photo_type=photo_type,
        caption=caption,
        storage_path=storage_path,
        original_filename=file.filename,
        file_size_bytes=len(content),
        mime_type=file.content_type,
        taken_at=datetime.utcnow(),  # TODO: EXIF에서 추출
    )
    
    db.add(photo)
    await db.commit()
    await db.refresh(photo)
    
    return APIResponse.ok(PhotoRead.model_validate(photo))


@router.get(
    "/site-visits/{visit_id}/photos",
    response_model=APIResponse[list[PhotoRead]],
)
async def list_photos(
    visit_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """사진 목록 조회.
    
    현장 방문에 올린 사진 목록을 조회해요.
    """
    # 현장 방문 확인
    result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == visit_id)
    )
    visit = result.scalar_one_or_none()
    
    if not visit:
        raise NotFoundException("site_visit", visit_id)
    
    # 프로젝트 권한 확인
    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("site_visit", visit_id)
    
    # 사진 조회
    photos_result = await db.execute(
        select(Photo)
        .where(Photo.site_visit_id == visit_id)
        .order_by(Photo.created_at.asc())
    )
    photos = photos_result.scalars().all()
    
    return APIResponse.ok([PhotoRead.model_validate(p) for p in photos])


@router.delete(
    "/photos/{photo_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_photo(
    photo_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """사진 삭제.
    
    올린 사진을 삭제해요.
    """
    result = await db.execute(
        select(Photo).where(Photo.id == photo_id)
    )
    photo = result.scalar_one_or_none()
    
    if not photo:
        raise NotFoundException("photo", photo_id)
    
    # 현장 방문 -> 프로젝트 권한 확인
    visit_result = await db.execute(
        select(SiteVisit).where(SiteVisit.id == photo.site_visit_id)
    )
    visit = visit_result.scalar_one_or_none()
    
    if not visit:
        raise NotFoundException("photo", photo_id)
    
    project_result = await db.execute(
        select(Project)
        .where(Project.id == visit.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("photo", photo_id)
    
    # 실제 파일 삭제
    if photo.storage_path:
        await storage_service.delete_file(photo.storage_path)
    
    await db.delete(photo)
    await db.commit()
