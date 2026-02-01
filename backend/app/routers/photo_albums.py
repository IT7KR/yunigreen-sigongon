"""준공사진첩 API 라우터."""
import uuid
from datetime import datetime
from typing import Annotated, Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import func
from sqlalchemy.orm import selectinload
from sqlmodel import select

from app.core.database import get_async_db
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.project import Project, Photo
from app.models.photo_album import (
    PhotoAlbum,
    PhotoAlbumStatus,
    AlbumLayoutType,
    PhotoAlbumCreate,
    PhotoAlbumRead,
    PhotoAlbumUpdate,
    AlbumPhoto,
    AlbumPhotoCreate,
)
from app.schemas.response import APIResponse, PaginatedResponse

router = APIRouter()

# Type aliases
DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


# Response Schemas
class PhotoAlbumListItem(BaseModel):
    """앨범 목록 아이템."""
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: Optional[str]
    layout: str
    status: str
    photo_count: int = 0
    created_at: datetime
    updated_at: datetime


class AlbumPhotoDetail(BaseModel):
    """앨범 사진 상세."""
    id: str
    album_photo_id: str
    storage_path: str
    caption: Optional[str]
    caption_override: Optional[str]
    photo_type: str
    taken_at: Optional[str]
    sort_order: int


class PhotoAlbumDetail(BaseModel):
    """앨범 상세 정보."""
    id: uuid.UUID
    project_id: uuid.UUID
    name: str
    description: Optional[str]
    layout: str
    status: str
    photos: List[AlbumPhotoDetail] = []
    created_at: datetime
    updated_at: datetime


class CreateAlbumRequest(BaseModel):
    """앨범 생성 요청."""
    name: str
    description: Optional[str] = None
    layout: Optional[str] = "three_column"


class UpdateAlbumRequest(BaseModel):
    """앨범 수정 요청."""
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[str] = None
    status: Optional[str] = None


class AddPhotosRequest(BaseModel):
    """사진 추가 요청."""
    photo_ids: List[uuid.UUID]


class ReorderPhotosItem(BaseModel):
    """사진 순서 변경 아이템."""
    photo_id: uuid.UUID
    sort_order: int


class ReorderPhotosRequest(BaseModel):
    """사진 순서 변경 요청."""
    photos: List[ReorderPhotosItem]


async def _get_album_photos(db: DBSession, album_id: uuid.UUID) -> List[AlbumPhotoDetail]:
    """Get photos for an album with full details."""
    album_photos_result = await db.execute(
        select(AlbumPhoto)
        .where(AlbumPhoto.album_id == album_id)
        .order_by(AlbumPhoto.sort_order)
    )
    album_photos = album_photos_result.scalars().all()

    photos = []
    for album_photo in album_photos:
        photo_result = await db.execute(
            select(Photo).where(Photo.id == album_photo.photo_id)
        )
        photo = photo_result.scalar_one_or_none()
        if photo:
            photos.append(AlbumPhotoDetail(
                id=str(photo.id),
                album_photo_id=str(album_photo.id),
                storage_path=photo.storage_path,
                caption=photo.caption,
                caption_override=album_photo.caption_override,
                photo_type=photo.photo_type.value,
                taken_at=photo.taken_at.isoformat() if photo.taken_at else None,
                sort_order=album_photo.sort_order,
            ))
    return photos


@router.get("/projects/{project_id}/albums", response_model=PaginatedResponse[PhotoAlbumListItem])
async def list_project_albums(
    project_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    """프로젝트의 앨범 목록 조회.

    프로젝트에 속한 준공사진첩 목록을 조회해요.
    """
    # Verify project access
    project_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()

    if not project:
        raise NotFoundException("project", project_id)

    # Build query
    query = select(PhotoAlbum).where(PhotoAlbum.project_id == project_id)

    # Filter by status
    if status_filter:
        query = query.where(PhotoAlbum.status == status_filter)

    # Get total count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Apply pagination
    query = query.order_by(PhotoAlbum.created_at.desc())
    query = query.offset((page - 1) * per_page).limit(per_page)
    query = query.options(selectinload(PhotoAlbum.album_photos))

    result = await db.execute(query)
    albums = result.scalars().all()

    # Convert to response items
    items = [
        PhotoAlbumListItem(
            id=album.id,
            project_id=album.project_id,
            name=album.name,
            description=album.description,
            layout=album.layout.value,
            status=album.status.value,
            photo_count=len(album.album_photos) if album.album_photos else 0,
            created_at=album.created_at,
            updated_at=album.updated_at,
        )
        for album in albums
    ]

    return PaginatedResponse.create(
        items=items,
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post("/projects/{project_id}/albums", response_model=APIResponse[PhotoAlbumDetail], status_code=status.HTTP_201_CREATED)
async def create_album(
    project_id: uuid.UUID,
    album_data: CreateAlbumRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """새 앨범 생성.

    프로젝트에 새 준공사진첩을 만들어요.
    """
    # Verify project access
    project_result = await db.execute(
        select(Project)
        .where(Project.id == project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()

    if not project:
        raise NotFoundException("project", project_id)

    # Create album
    album = PhotoAlbum(
        project_id=project_id,
        name=album_data.name,
        description=album_data.description,
        layout=AlbumLayoutType(album_data.layout) if album_data.layout else AlbumLayoutType.THREE_COLUMN,
        created_by=current_user.id,
    )

    db.add(album)
    await db.commit()
    await db.refresh(album)

    return APIResponse.ok(
        PhotoAlbumDetail(
            id=album.id,
            project_id=album.project_id,
            name=album.name,
            description=album.description,
            layout=album.layout.value,
            status=album.status.value,
            photos=[],
            created_at=album.created_at,
            updated_at=album.updated_at,
        )
    )


@router.get("/albums/{album_id}", response_model=APIResponse[PhotoAlbumDetail])
async def get_album(
    album_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범 상세 조회.

    앨범의 상세 정보와 포함된 사진들을 확인해요.
    """
    result = await db.execute(
        select(PhotoAlbum)
        .where(PhotoAlbum.id == album_id)
        .options(selectinload(PhotoAlbum.album_photos))
    )
    album = result.scalar_one_or_none()

    if not album:
        raise NotFoundException("photo_album", album_id)

    # Verify access through project
    project_result = await db.execute(
        select(Project)
        .where(Project.id == album.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("photo_album", album_id)

    # Get photos with details
    photos = await _get_album_photos(db, album_id)

    return APIResponse.ok(
        PhotoAlbumDetail(
            id=album.id,
            project_id=album.project_id,
            name=album.name,
            description=album.description,
            layout=album.layout.value,
            status=album.status.value,
            photos=photos,
            created_at=album.created_at,
            updated_at=album.updated_at,
        )
    )


@router.put("/albums/{album_id}", response_model=APIResponse[PhotoAlbumDetail])
async def update_album(
    album_id: uuid.UUID,
    album_data: UpdateAlbumRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범 수정.

    앨범 정보를 수정해요.
    """
    result = await db.execute(
        select(PhotoAlbum).where(PhotoAlbum.id == album_id)
    )
    album = result.scalar_one_or_none()

    if not album:
        raise NotFoundException("photo_album", album_id)

    # Verify access through project
    project_result = await db.execute(
        select(Project)
        .where(Project.id == album.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("photo_album", album_id)

    # Update fields
    update_data = album_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "layout" and value:
            setattr(album, field, AlbumLayoutType(value))
        elif field == "status" and value:
            setattr(album, field, PhotoAlbumStatus(value))
        else:
            setattr(album, field, value)

    album.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(album)

    # Get photos with details
    photos = await _get_album_photos(db, album_id)

    return APIResponse.ok(
        PhotoAlbumDetail(
            id=album.id,
            project_id=album.project_id,
            name=album.name,
            description=album.description,
            layout=album.layout.value,
            status=album.status.value,
            photos=photos,
            created_at=album.created_at,
            updated_at=album.updated_at,
        )
    )


@router.delete("/albums/{album_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_album(
    album_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범 삭제.

    앨범을 삭제해요. 초안(draft) 상태인 앨범만 삭제할 수 있어요.
    """
    result = await db.execute(
        select(PhotoAlbum).where(PhotoAlbum.id == album_id)
    )
    album = result.scalar_one_or_none()

    if not album:
        raise NotFoundException("photo_album", album_id)

    # Verify access through project
    project_result = await db.execute(
        select(Project)
        .where(Project.id == album.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("photo_album", album_id)

    # Only allow deleting draft albums
    if album.status != PhotoAlbumStatus.DRAFT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="초안 상태의 앨범만 삭제할 수 있어요",
        )

    # Delete album photos first
    await db.execute(
        select(AlbumPhoto).where(AlbumPhoto.album_id == album_id)
    )

    await db.delete(album)
    await db.commit()


@router.post("/albums/{album_id}/photos", response_model=APIResponse[PhotoAlbumDetail])
async def add_photos_to_album(
    album_id: uuid.UUID,
    photos_data: AddPhotosRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범에 사진 추가.

    선택한 사진들을 앨범에 추가해요.
    """
    result = await db.execute(
        select(PhotoAlbum).where(PhotoAlbum.id == album_id)
    )
    album = result.scalar_one_or_none()

    if not album:
        raise NotFoundException("photo_album", album_id)

    # Verify access through project
    project_result = await db.execute(
        select(Project)
        .where(Project.id == album.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("photo_album", album_id)

    # Get current max sort_order
    existing_photos_result = await db.execute(
        select(AlbumPhoto)
        .where(AlbumPhoto.album_id == album_id)
        .order_by(AlbumPhoto.sort_order.desc())
        .limit(1)
    )
    last_photo = existing_photos_result.scalar_one_or_none()
    next_sort_order = (last_photo.sort_order + 1) if last_photo else 1

    # Add photos to album
    for photo_id in photos_data.photo_ids:
        # Verify photo exists
        photo_result = await db.execute(
            select(Photo).where(Photo.id == photo_id)
        )
        if not photo_result.scalar_one_or_none():
            raise NotFoundException("photo", photo_id)

        # Check if photo already in album
        existing = await db.execute(
            select(AlbumPhoto)
            .where(AlbumPhoto.album_id == album_id)
            .where(AlbumPhoto.photo_id == photo_id)
        )
        if existing.scalar_one_or_none():
            continue  # Skip if already added

        # Add to album
        album_photo = AlbumPhoto(
            album_id=album_id,
            photo_id=photo_id,
            sort_order=next_sort_order,
        )
        db.add(album_photo)
        next_sort_order += 1

    album.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(album)

    # Get photos with details
    photos = await _get_album_photos(db, album_id)

    return APIResponse.ok(
        PhotoAlbumDetail(
            id=album.id,
            project_id=album.project_id,
            name=album.name,
            description=album.description,
            layout=album.layout.value,
            status=album.status.value,
            photos=photos,
            created_at=album.created_at,
            updated_at=album.updated_at,
        )
    )


@router.delete("/albums/{album_id}/photos/{photo_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_photo_from_album(
    album_id: uuid.UUID,
    photo_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범에서 사진 제거.

    앨범에서 특정 사진을 제거해요.
    """
    # Verify album exists and user has access
    album_result = await db.execute(
        select(PhotoAlbum).where(PhotoAlbum.id == album_id)
    )
    album = album_result.scalar_one_or_none()

    if not album:
        raise NotFoundException("photo_album", album_id)

    # Verify access through project
    project_result = await db.execute(
        select(Project)
        .where(Project.id == album.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("photo_album", album_id)

    # Find and delete the album-photo relationship
    album_photo_result = await db.execute(
        select(AlbumPhoto)
        .where(AlbumPhoto.album_id == album_id)
        .where(AlbumPhoto.photo_id == photo_id)
    )
    album_photo = album_photo_result.scalar_one_or_none()

    if not album_photo:
        raise NotFoundException("photo", photo_id)

    await db.delete(album_photo)
    album.updated_at = datetime.utcnow()
    await db.commit()


@router.put("/albums/{album_id}/photos/reorder", response_model=APIResponse[PhotoAlbumDetail])
async def reorder_album_photos(
    album_id: uuid.UUID,
    reorder_data: ReorderPhotosRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범 사진 순서 변경.

    앨범 내 사진들의 순서를 재정렬해요.
    """
    result = await db.execute(
        select(PhotoAlbum).where(PhotoAlbum.id == album_id)
    )
    album = result.scalar_one_or_none()

    if not album:
        raise NotFoundException("photo_album", album_id)

    # Verify access through project
    project_result = await db.execute(
        select(Project)
        .where(Project.id == album.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    if not project_result.scalar_one_or_none():
        raise NotFoundException("photo_album", album_id)

    # Update sort orders
    for photo_order in reorder_data.photos:
        album_photo_result = await db.execute(
            select(AlbumPhoto)
            .where(AlbumPhoto.album_id == album_id)
            .where(AlbumPhoto.photo_id == photo_order.photo_id)
        )
        album_photo = album_photo_result.scalar_one_or_none()

        if album_photo:
            album_photo.sort_order = photo_order.sort_order

    album.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(album)

    # Get photos with details
    photos = await _get_album_photos(db, album_id)

    return APIResponse.ok(
        PhotoAlbumDetail(
            id=album.id,
            project_id=album.project_id,
            name=album.name,
            description=album.description,
            layout=album.layout.value,
            status=album.status.value,
            photos=photos,
            created_at=album.created_at,
            updated_at=album.updated_at,
        )
    )


@router.get("/albums/{album_id}/export")
async def export_album_as_pdf(
    album_id: uuid.UUID,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범을 PDF로 내보내기.

    선택한 레이아웃(3단 또는 4단)으로 PDF를 생성해요.
    """
    result = await db.execute(
        select(PhotoAlbum)
        .where(PhotoAlbum.id == album_id)
        .options(selectinload(PhotoAlbum.album_photos))
    )
    album = result.scalar_one_or_none()

    if not album:
        raise NotFoundException("photo_album", album_id)

    # Verify access through project
    project_result = await db.execute(
        select(Project)
        .where(Project.id == album.project_id)
        .where(Project.organization_id == current_user.organization_id)
    )
    project = project_result.scalar_one_or_none()
    if not project:
        raise NotFoundException("photo_album", album_id)

    # Get photos with details
    photos = await _get_album_photos(db, album_id)

    # TODO: Implement actual PDF generation with reportlab or weasyprint
    # For now, return JSON data that can be used by frontend to generate PDF
    return APIResponse.ok({
        "album_id": str(album_id),
        "album_name": album.name,
        "project_name": project.name,
        "layout": album.layout.value,
        "columns": 3 if album.layout == AlbumLayoutType.THREE_COLUMN else 4,
        "photo_count": len(photos),
        "photos": [
            {
                "id": p.id,
                "storage_path": p.storage_path,
                "caption": p.caption_override or p.caption,
                "sort_order": p.sort_order,
            }
            for p in photos
        ],
        "message": "PDF 생성 데이터입니다. 클라이언트에서 PDF를 생성하세요.",
    })
