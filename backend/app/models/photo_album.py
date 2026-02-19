"""PhotoAlbum models for 준공사진첩 (completion photo album) feature."""
from datetime import datetime
from enum import Enum
from typing import Optional, List, TYPE_CHECKING
from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id

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

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    project_id: int = Field(sa_type=BigInteger, index=True)

    # Timestamps
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    # Audit
    created_by: int = Field(sa_type=BigInteger)

    # Relationships
    album_photos: List["AlbumPhoto"] = Relationship(
        back_populates="album",
        sa_relationship_kwargs={
            "primaryjoin": "PhotoAlbum.id == AlbumPhoto.album_id",
            "foreign_keys": "[AlbumPhoto.album_id]",
        },
    )


class PhotoAlbumCreate(PhotoAlbumBase):
    """Schema for creating photo album."""
    project_id: int


class PhotoAlbumRead(PhotoAlbumBase):
    """Schema for reading photo album."""
    id: int
    project_id: int
    created_at: datetime
    updated_at: datetime
    created_by: int


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

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    album_id: int = Field(sa_type=BigInteger, index=True)
    photo_id: int = Field(sa_type=BigInteger, index=True)

    created_at: datetime = Field(default_factory=datetime.utcnow)

    # Relationships
    album: Optional["PhotoAlbum"] = Relationship(
        back_populates="album_photos",
        sa_relationship_kwargs={
            "primaryjoin": "AlbumPhoto.album_id == PhotoAlbum.id",
            "foreign_keys": "[AlbumPhoto.album_id]",
        },
    )


class AlbumPhotoCreate(AlbumPhotoBase):
    """Schema for creating album photo."""
    album_id: int
    photo_id: int


class AlbumPhotoRead(AlbumPhotoBase):
    """Schema for reading album photo."""
    id: int
    album_id: int
    photo_id: int
    created_at: datetime
