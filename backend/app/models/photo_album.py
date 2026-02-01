"""PhotoAlbum models for 준공사진첩 (completion photo album) feature."""
import uuid
from datetime import datetime
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlmodel import SQLModel, Field, Relationship

if TYPE_CHECKING:
    from app.models.project import Project, Photo
    from app.models.user import User


class AlbumLayoutType(str, Enum):
    """Album layout type enumeration."""
    THREE_COLUMN = "three_column"
    FOUR_COLUMN = "four_column"


class PhotoAlbumStatus(str, Enum):
    """Photo album status enumeration."""
    DRAFT = "draft"
    PUBLISHED = "published"


class PhotoAlbumBase(SQLModel):
    """PhotoAlbum base fields."""
    name: str = Field(max_length=255)
    description: Optional[str] = Field(default=None)
    layout: AlbumLayoutType = Field(default=AlbumLayoutType.THREE_COLUMN)
    status: PhotoAlbumStatus = Field(default=PhotoAlbumStatus.DRAFT)


class PhotoAlbum(PhotoAlbumBase, table=True):
    """PhotoAlbum model - Completion photo album for projects."""
    __tablename__ = "photo_album"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    project_id: uuid.UUID = Field(foreign_key="project.id", index=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Audit
    created_by: uuid.UUID = Field(foreign_key="user.id")

    # Relationships
    album_photos: List["AlbumPhoto"] = Relationship(back_populates="album")


class PhotoAlbumCreate(PhotoAlbumBase):
    """Schema for creating photo album."""
    project_id: uuid.UUID


class PhotoAlbumRead(PhotoAlbumBase):
    """Schema for reading photo album."""
    id: uuid.UUID
    project_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    created_by: uuid.UUID


class PhotoAlbumUpdate(SQLModel):
    """Schema for updating photo album."""
    name: Optional[str] = None
    description: Optional[str] = None
    layout: Optional[AlbumLayoutType] = None
    status: Optional[PhotoAlbumStatus] = None


# AlbumPhoto Models (Junction table)
class AlbumPhotoBase(SQLModel):
    """AlbumPhoto base fields."""
    sort_order: int = Field(default=0)
    caption_override: Optional[str] = Field(default=None)


class AlbumPhoto(AlbumPhotoBase, table=True):
    """AlbumPhoto model - Junction table for album-photo relationship."""
    __tablename__ = "album_photo"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    album_id: uuid.UUID = Field(foreign_key="photo_album.id", index=True)
    photo_id: uuid.UUID = Field(foreign_key="photo.id", index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    album: Optional["PhotoAlbum"] = Relationship(back_populates="album_photos")


class AlbumPhotoCreate(AlbumPhotoBase):
    """Schema for creating album photo."""
    album_id: uuid.UUID
    photo_id: uuid.UUID


class AlbumPhotoRead(AlbumPhotoBase):
    """Schema for reading album photo."""
    id: uuid.UUID
    album_id: uuid.UUID
    photo_id: uuid.UUID
    created_at: datetime
