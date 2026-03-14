"""준공사진첩 API 라우터."""
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
from app.core.permissions import get_project_for_user
from app.core.security import get_current_user
from app.core.exceptions import NotFoundException
from app.models.user import User
from app.models.project import Photo
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
    id: int
    project_id: int
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
    id: int
    project_id: int
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
    photo_ids: List[int]


class ReorderPhotosItem(BaseModel):
    """사진 순서 변경 아이템."""
    photo_id: int
    sort_order: int


class ReorderPhotosRequest(BaseModel):
    """사진 순서 변경 요청."""
    photos: List[ReorderPhotosItem]


async def _get_album_photos(db: DBSession, album_id: int) -> List[AlbumPhotoDetail]:
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


async def _ensure_project_access(
    db: DBSession,
    project_id: int,
    current_user: User,
):
    return await get_project_for_user(db, project_id, current_user)


async def _get_album_for_user(
    db: DBSession,
    album_id: int,
    current_user: User,
) -> PhotoAlbum:
    album = (
        await db.execute(select(PhotoAlbum).where(PhotoAlbum.id == album_id))
    ).scalar_one_or_none()
    if not album:
        raise NotFoundException("photo_album", album_id)
    await _ensure_project_access(db, album.project_id, current_user)
    return album


@router.get("/projects/{project_id}/albums", response_model=PaginatedResponse[PhotoAlbumListItem])
async def list_project_albums(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    """프로젝트의 앨범 목록 조회.

    프로젝트에 속한 준공사진첩 목록을 조회해요.
    """
    await _ensure_project_access(db, project_id, current_user)

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
    project_id: int,
    album_data: CreateAlbumRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """새 앨범 생성.

    프로젝트에 새 준공사진첩을 만들어요.
    """
    await _ensure_project_access(db, project_id, current_user)

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
    album_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범 상세 조회.

    앨범의 상세 정보와 포함된 사진들을 확인해요.
    """
    album = await _get_album_for_user(db, album_id, current_user)

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
    album_id: int,
    album_data: UpdateAlbumRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범 수정.

    앨범 정보를 수정해요.
    """
    album = await _get_album_for_user(db, album_id, current_user)

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
    album_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범 삭제.

    앨범을 삭제해요. 초안(draft) 상태인 앨범만 삭제할 수 있어요.
    """
    album = await _get_album_for_user(db, album_id, current_user)

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
    album_id: int,
    photos_data: AddPhotosRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범에 사진 추가.

    선택한 사진들을 앨범에 추가해요.
    """
    album = await _get_album_for_user(db, album_id, current_user)

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
    album_id: int,
    photo_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범에서 사진 제거.

    앨범에서 특정 사진을 제거해요.
    """
    album = await _get_album_for_user(db, album_id, current_user)

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
    album_id: int,
    reorder_data: ReorderPhotosRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    """앨범 사진 순서 변경.

    앨범 내 사진들의 순서를 재정렬해요.
    """
    album = await _get_album_for_user(db, album_id, current_user)

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


async def _generate_album_pdf(
    photos: list,
    album_name: str,
    project_name: str,
    columns: int,
) -> bytes:
    """Pillow으로 사진 앨범 PDF를 생성해요."""
    from PIL import Image, ImageDraw, ImageFont
    import io as _io

    # A4 at 150 DPI
    PAGE_W, PAGE_H = 1240, 1754
    MARGIN = 40
    HEADER_H = 80
    CELL_PADDING = 10

    col_count = columns
    available_w = PAGE_W - 2 * MARGIN
    cell_w = (available_w - (col_count - 1) * CELL_PADDING) // col_count
    cell_h = int(cell_w * 0.75)  # 4:3 aspect ratio

    pages = []
    current_page = Image.new("RGB", (PAGE_W, PAGE_H), "white")
    draw = ImageDraw.Draw(current_page)

    # Header
    draw.rectangle([MARGIN, MARGIN, PAGE_W - MARGIN, MARGIN + HEADER_H - 10], fill="#f0f0f0")
    draw.text((MARGIN + 10, MARGIN + 10), f"{project_name} - {album_name}", fill="black")

    row_start_y = MARGIN + HEADER_H
    col_idx = 0
    row_idx = 0

    for photo in photos:
        x = MARGIN + col_idx * (cell_w + CELL_PADDING)
        y = row_start_y + row_idx * (cell_h + CELL_PADDING + 20)

        # New page if needed
        if y + cell_h > PAGE_H - MARGIN:
            pages.append(current_page)
            current_page = Image.new("RGB", (PAGE_W, PAGE_H), "white")
            draw = ImageDraw.Draw(current_page)
            col_idx = 0
            row_idx = 0
            x = MARGIN
            y = MARGIN

        # Try to load photo
        try:
            photo_bytes = photo.get("_bytes")
            if photo_bytes:
                img = Image.open(_io.BytesIO(photo_bytes))
                img = img.convert("RGB")
                img.thumbnail((cell_w, cell_h))
                # Center in cell
                offset_x = (cell_w - img.width) // 2
                offset_y = (cell_h - img.height) // 2
                current_page.paste(img, (x + offset_x, y + offset_y))
        except Exception:
            # Draw placeholder on error
            draw.rectangle([x, y, x + cell_w, y + cell_h], outline="#cccccc", fill="#f5f5f5")
            draw.text((x + 10, y + cell_h // 2), "사진 없음", fill="#999999")

        # Caption
        caption = photo.get("caption") or ""
        if caption:
            draw.text((x, y + cell_h + 2), caption[:30], fill="#555555")

        col_idx += 1
        if col_idx >= col_count:
            col_idx = 0
            row_idx += 1

    pages.append(current_page)

    # Save as multi-page PDF
    buf = _io.BytesIO()
    if len(pages) == 1:
        pages[0].save(buf, format="PDF")
    else:
        pages[0].save(buf, format="PDF", save_all=True, append_images=pages[1:])

    return buf.getvalue()


@router.get("/albums/{album_id}/export")
async def export_album_as_pdf(
    album_id: int,
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

    project = await _ensure_project_access(db, album.project_id, current_user)

    # Get photos with details
    photos = await _get_album_photos(db, album_id)

    # Load photo bytes for PDF generation
    from app.services.storage import get_storage_service
    storage = get_storage_service()

    photos_with_bytes = []
    for p in photos:
        photo_dict = {
            "id": p.id,
            "caption": p.caption_override or p.caption,
            "sort_order": p.sort_order,
        }
        try:
            photo_dict["_bytes"] = await storage.read_file(p.storage_path)
        except Exception:
            photo_dict["_bytes"] = None
        photos_with_bytes.append(photo_dict)

    columns = 3 if album.layout == AlbumLayoutType.THREE_COLUMN else 4
    pdf_bytes = await _generate_album_pdf(
        photos=photos_with_bytes,
        album_name=album.name,
        project_name=project.name,
        columns=columns,
    )

    from urllib.parse import quote
    filename = quote(f"{album.name}.pdf")
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename*=UTF-8''{filename}",
            "Content-Length": str(len(pdf_bytes)),
        },
    )
