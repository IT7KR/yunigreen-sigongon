"""License record and file management APIs."""
from __future__ import annotations

import uuid
from datetime import datetime
from pathlib import Path
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.config import settings
from app.core.database import get_async_db
from app.core.security import get_current_user
from app.models.customer import CustomerMaster
from app.models.license import (
    LicenseFile,
    LicenseFilePageType,
    LicenseOwnerType,
    LicenseRecord,
    LicenseStatus,
)
from app.models.operations import Partner
from app.models.user import Organization, User
from app.schemas.response import APIResponse
from app.services.storage import storage_service

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]

ALLOWED_LICENSE_FILE_EXTENSIONS = {".pdf", ".jpg", ".jpeg", ".png", ".webp"}
ALLOWED_LICENSE_FILE_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
}
MAX_LICENSE_FILES_PER_RECORD = 10


class LicenseCreateRequest(BaseModel):
    owner_type: LicenseOwnerType
    owner_id: int
    license_name: str
    license_number: Optional[str] = None
    issuer: Optional[str] = None
    issued_on: Optional[datetime] = None
    expires_on: Optional[datetime] = None
    status: LicenseStatus = LicenseStatus.ACTIVE
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


class LicenseUpdateRequest(BaseModel):
    license_name: Optional[str] = None
    license_number: Optional[str] = None
    issuer: Optional[str] = None
    issued_on: Optional[datetime] = None
    expires_on: Optional[datetime] = None
    status: Optional[LicenseStatus] = None
    is_primary: Optional[bool] = None
    notes: Optional[str] = None


def _require_organization_id(current_user: User) -> int:
    if current_user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="고객사 사용자만 면허 정보를 관리할 수 있어요.",
        )
    return current_user.organization_id


def _normalize_optional_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    normalized = " ".join(value.strip().split())
    return normalized or None


def _normalize_required_text(value: str, field_name: str) -> str:
    normalized = " ".join(value.strip().split())
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"{field_name}을(를) 입력해 주세요.",
        )
    return normalized


async def _ensure_owner_exists(
    db: AsyncSession,
    organization_id: int,
    owner_type: LicenseOwnerType,
    owner_id: int,
) -> None:
    if owner_type == LicenseOwnerType.ORGANIZATION:
        if owner_id != organization_id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="조직 면허 정보 대상이 올바르지 않아요.",
            )
        exists = await db.execute(
            select(Organization.id).where(Organization.id == owner_id)
        )
        if not exists.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="조직 정보를 찾을 수 없어요.",
            )
        return

    if owner_type == LicenseOwnerType.CUSTOMER:
        exists = await db.execute(
            select(CustomerMaster.id)
            .where(CustomerMaster.id == owner_id)
            .where(CustomerMaster.organization_id == organization_id)
        )
        if not exists.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="발주처 정보를 찾을 수 없어요.",
            )
        return

    exists = await db.execute(
        select(Partner.id)
        .where(Partner.id == owner_id)
        .where(Partner.organization_id == organization_id)
    )
    if not exists.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="협력사 정보를 찾을 수 없어요.",
        )


async def _sync_owner_license_summary(
    db: AsyncSession,
    organization_id: int,
    owner_type: LicenseOwnerType,
    owner_id: int,
) -> None:
    if owner_type not {LicenseOwnerType.CUSTOMER, LicenseOwnerType.PARTNER}:
        return

    result = await db.execute(
        select(LicenseRecord)
        .where(LicenseRecord.organization_id == organization_id)
        .where(LicenseRecord.owner_type == owner_type)
        .where(LicenseRecord.owner_id == owner_id)
        .where(LicenseRecord.deleted_at == None)  # noqa: E712
        .order_by(
            LicenseRecord.is_primary.desc(),
            LicenseRecord.updated_at.desc(),
            LicenseRecord.created_at.desc(),
        )
    )
    records = result.scalars().all()
    summary = records[0].license_name if records else None

    if owner_type == LicenseOwnerType.CUSTOMER:
        customer = (
            await db.execute(
                select(CustomerMaster)
                .where(CustomerMaster.id == owner_id)
                .where(CustomerMaster.organization_id == organization_id)
            )
        ).scalar_one_or_none()
        if not customer:
            return
        customer.license_type = summary
        customer.updated_at = datetime.utcnow()
        return

    partner = (
        await db.execute(
            select(Partner)
            .where(Partner.id == owner_id)
            .where(Partner.organization_id == organization_id)
        )
    ).scalar_one_or_none()
    if not partner:
        return
    partner.license_type = summary
    partner.license = summary
    partner.updated_at = datetime.utcnow()


def _serialize_license_file(file: LicenseFile) -> dict:
    return {
        "id": str(file.id),
        "license_record_id": str(file.license_record_id),
        "storage_path": file.storage_path,
        "original_filename": file.original_filename,
        "mime_type": file.mime_type,
        "file_size_bytes": file.file_size_bytes,
        "page_type": file.page_type.value,
        "sort_order": file.sort_order,
        "uploaded_at": file.uploaded_at.isoformat(),
    }


def _serialize_license_record(record: LicenseRecord, files: list[dict]) -> dict:
    return {
        "id": str(record.id),
        "organization_id": str(record.organization_id),
        "owner_type": record.owner_type.value,
        "owner_id": str(record.owner_id),
        "license_name": record.license_name,
        "license_number": record.license_number,
        "issuer": record.issuer,
        "issued_on": record.issued_on.isoformat() if record.issued_on else None,
        "expires_on": record.expires_on.isoformat() if record.expires_on else None,
        "status": record.status.value,
        "is_primary": record.is_primary,
        "notes": record.notes,
        "created_at": record.created_at.isoformat(),
        "updated_at": record.updated_at.isoformat(),
        "files": files,
    }


async def _get_license_record_or_404(
    db: AsyncSession,
    organization_id: int,
    license_id: int,
) -> LicenseRecord:
    result = await db.execute(
        select(LicenseRecord)
        .where(LicenseRecord.id == license_id)
        .where(LicenseRecord.organization_id == organization_id)
        .where(LicenseRecord.deleted_at == None)  # noqa: E712
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="면허 정보를 찾을 수 없어요.",
        )
    return record


def _validate_upload_file(file: UploadFile) -> None:
    ext = Path(file.filename or "").suffix.lower()
    if ext not in ALLOWED_LICENSE_FILE_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="PDF 또는 이미지 파일만 업로드할 수 있어요.",
        )
    if file.content_type and file.content_type.lower() not in ALLOWED_LICENSE_FILE_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="지원하지 않는 파일 형식이에요.",
        )
    if not storage_service.validate_file_size(file):
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"파일은 {settings.max_upload_size_mb}MB 이하로 올려주세요.",
        )


@router.get("", response_model=APIResponse[list[dict]])
async def list_licenses(
    db: DBSession,
    current_user: CurrentUser,
    owner_type: LicenseOwnerType,
    owner_id: int,
    include_deleted: bool = False,
):
    organization_id = _require_organization_id(current_user)
    await _ensure_owner_exists(db, organization_id, owner_type, owner_id)

    query = (
        select(LicenseRecord)
        .where(LicenseRecord.organization_id == organization_id)
        .where(LicenseRecord.owner_type == owner_type)
        .where(LicenseRecord.owner_id == owner_id)
        .order_by(
            LicenseRecord.is_primary.desc(),
            LicenseRecord.updated_at.desc(),
            LicenseRecord.created_at.desc(),
        )
    )
    if not include_deleted:
        query = query.where(LicenseRecord.deleted_at == None)  # noqa: E712

    records = (await db.execute(query)).scalars().all()
    if not records:
        return APIResponse.ok([])

    record_ids = [record.id for record in records]
    file_query = (
        select(LicenseFile)
        .where(LicenseFile.organization_id == organization_id)
        .where(LicenseFile.license_record_id.in_(record_ids))
        .order_by(LicenseFile.sort_order.asc(), LicenseFile.uploaded_at.asc())
    )
    if not include_deleted:
        file_query = file_query.where(LicenseFile.deleted_at == None)  # noqa: E712

    files = (await db.execute(file_query)).scalars().all()
    files_by_record_id: dict[int, list[dict]] = {}
    for item in files:
        files_by_record_id.setdefault(item.license_record_id, []).append(
            _serialize_license_file(item)
        )

    return APIResponse.ok(
        [
            _serialize_license_record(
                record,
                files_by_record_id.get(record.id, []),
            )
            for record in records
        ]
    )


@router.post("", response_model=APIResponse[dict], status_code=status.HTTP_201_CREATED)
async def create_license(
    payload: LicenseCreateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    organization_id = _require_organization_id(current_user)
    await _ensure_owner_exists(db, organization_id, payload.owner_type, payload.owner_id)

    active_count = (
        await db.execute(
            select(func.count())
            .select_from(LicenseRecord)
            .where(LicenseRecord.organization_id == organization_id)
            .where(LicenseRecord.owner_type == payload.owner_type)
            .where(LicenseRecord.owner_id == payload.owner_id)
            .where(LicenseRecord.deleted_at == None)  # noqa: E712
        )
    ).scalar_one()
    is_primary = payload.is_primary if payload.is_primary is not None else active_count == 0

    if is_primary:
        existing_primaries = (
            await db.execute(
                select(LicenseRecord)
                .where(LicenseRecord.organization_id == organization_id)
                .where(LicenseRecord.owner_type == payload.owner_type)
                .where(LicenseRecord.owner_id == payload.owner_id)
                .where(LicenseRecord.deleted_at == None)  # noqa: E712
                .where(LicenseRecord.is_primary == True)  # noqa: E712
            )
        ).scalars().all()
        for item in existing_primaries:
            item.is_primary = False
            item.updated_at = datetime.utcnow()

    record = LicenseRecord(
        organization_id=organization_id,
        owner_type=payload.owner_type,
        owner_id=payload.owner_id,
        license_name=_normalize_required_text(payload.license_name, "면허명"),
        license_number=_normalize_optional_text(payload.license_number),
        issuer=_normalize_optional_text(payload.issuer),
        issued_on=payload.issued_on.date() if payload.issued_on else None,
        expires_on=payload.expires_on.date() if payload.expires_on else None,
        status=payload.status,
        is_primary=is_primary,
        notes=_normalize_optional_text(payload.notes),
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    db.add(record)
    await db.flush()

    await _sync_owner_license_summary(
        db=db,
        organization_id=organization_id,
        owner_type=payload.owner_type,
        owner_id=payload.owner_id,
    )

    return APIResponse.ok(_serialize_license_record(record, []))


@router.patch("/{license_id}", response_model=APIResponse[dict])
async def update_license(
    license_id: int,
    payload: LicenseUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    organization_id = _require_organization_id(current_user)
    record = await _get_license_record_or_404(db, organization_id, license_id)

    updates = payload.model_dump(exclude_unset=True)

    if "license_name" in updates:
        record.license_name = _normalize_required_text(updates["license_name"], "면허명")
    if "license_number" in updates:
        record.license_number = _normalize_optional_text(updates["license_number"])
    if "issuer" in updates:
        record.issuer = _normalize_optional_text(updates["issuer"])
    if "issued_on" in updates:
        issued_on = updates["issued_on"]
        record.issued_on = issued_on.date() if issued_on else None
    if "expires_on" in updates:
        expires_on = updates["expires_on"]
        record.expires_on = expires_on.date() if expires_on else None
    if "status" in updates:
        record.status = updates["status"]
    if "notes" in updates:
        record.notes = _normalize_optional_text(updates["notes"])

    if updates.get("is_primary") is True:
        existing_primaries = (
            await db.execute(
                select(LicenseRecord)
                .where(LicenseRecord.organization_id == organization_id)
                .where(LicenseRecord.owner_type == record.owner_type)
                .where(LicenseRecord.owner_id == record.owner_id)
                .where(LicenseRecord.deleted_at == None)  # noqa: E712
                .where(LicenseRecord.is_primary == True)  # noqa: E712
                .where(LicenseRecord.id != record.id)
            )
        ).scalars().all()
        for item in existing_primaries:
            item.is_primary = False
            item.updated_at = datetime.utcnow()
        record.is_primary = True
    elif updates.get("is_primary") is False:
        record.is_primary = False

    record.updated_at = datetime.utcnow()
    await db.flush()

    files = (
        await db.execute(
            select(LicenseFile)
            .where(LicenseFile.organization_id == organization_id)
            .where(LicenseFile.license_record_id == record.id)
            .where(LicenseFile.deleted_at == None)  # noqa: E712
            .order_by(LicenseFile.sort_order.asc(), LicenseFile.uploaded_at.asc())
        )
    ).scalars().all()

    await _sync_owner_license_summary(
        db=db,
        organization_id=organization_id,
        owner_type=record.owner_type,
        owner_id=record.owner_id,
    )

    return APIResponse.ok(
        _serialize_license_record(record, [_serialize_license_file(item) for item in files])
    )


@router.delete("/{license_id}", response_model=APIResponse[dict])
async def delete_license(
    license_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    organization_id = _require_organization_id(current_user)
    record = await _get_license_record_or_404(db, organization_id, license_id)

    now = datetime.utcnow()
    record.deleted_at = now
    record.updated_at = now

    files = (
        await db.execute(
            select(LicenseFile)
            .where(LicenseFile.organization_id == organization_id)
            .where(LicenseFile.license_record_id == record.id)
            .where(LicenseFile.deleted_at == None)  # noqa: E712
        )
    ).scalars().all()
    for item in files:
        item.deleted_at = now

    await _sync_owner_license_summary(
        db=db,
        organization_id=organization_id,
        owner_type=record.owner_type,
        owner_id=record.owner_id,
    )

    return APIResponse.ok({"deleted": True, "id": str(record.id)})


@router.post("/{license_id}/files", response_model=APIResponse[dict])
async def upload_license_file(
    license_id: int,
    db: DBSession,
    current_user: CurrentUser,
    file: UploadFile = File(...),
    page_type: LicenseFilePageType = Form(default=LicenseFilePageType.UNKNOWN),
    sort_order: Optional[int] = Form(default=None),
):
    organization_id = _require_organization_id(current_user)
    record = await _get_license_record_or_404(db, organization_id, license_id)
    _validate_upload_file(file)

    active_count = (
        await db.execute(
            select(func.count())
            .select_from(LicenseFile)
            .where(LicenseFile.organization_id == organization_id)
            .where(LicenseFile.license_record_id == record.id)
            .where(LicenseFile.deleted_at == None)  # noqa: E712
        )
    ).scalar_one()
    if active_count >= MAX_LICENSE_FILES_PER_RECORD:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"면허별 첨부파일은 최대 {MAX_LICENSE_FILES_PER_RECORD}개까지 등록할 수 있어요.",
        )

    content = await file.read()
    await file.seek(0)

    original_filename = file.filename or f"license-{record.id}.bin"
    ext = Path(original_filename).suffix.lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    storage_path = await storage_service.save_bytes(
        data=content,
        category="licenses",
        subfolder=f"{organization_id}/{record.id}",
        filename=filename,
    )

    if sort_order is None:
        max_sort = (
            await db.execute(
                select(func.max(LicenseFile.sort_order))
                .where(LicenseFile.organization_id == organization_id)
                .where(LicenseFile.license_record_id == record.id)
                .where(LicenseFile.deleted_at == None)  # noqa: E712
            )
        ).scalar_one()
        resolved_sort_order = (max_sort or 0) + 10
    else:
        resolved_sort_order = sort_order

    license_file = LicenseFile(
        organization_id=organization_id,
        license_record_id=record.id,
        storage_path=storage_path,
        original_filename=original_filename,
        mime_type=file.content_type,
        file_size_bytes=len(content),
        page_type=page_type,
        sort_order=resolved_sort_order,
        uploaded_at=datetime.utcnow(),
    )
    db.add(license_file)
    await db.flush()

    return APIResponse.ok(_serialize_license_file(license_file))


@router.delete("/{license_id}/files/{file_id}", response_model=APIResponse[dict])
async def delete_license_file(
    license_id: int,
    file_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    organization_id = _require_organization_id(current_user)
    await _get_license_record_or_404(db, organization_id, license_id)

    license_file = (
        await db.execute(
            select(LicenseFile)
            .where(LicenseFile.id == file_id)
            .where(LicenseFile.organization_id == organization_id)
            .where(LicenseFile.license_record_id == license_id)
            .where(LicenseFile.deleted_at == None)  # noqa: E712
        )
    ).scalar_one_or_none()
    if not license_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="면허 첨부파일을 찾을 수 없어요.",
        )

    license_file.deleted_at = datetime.utcnow()
    await db.flush()

    return APIResponse.ok({"deleted": True, "id": str(license_file.id)})
