"""Application-level referential integrity helpers.

DB FK를 사용하지 않는 대신, 쓰기 경로에서 참조 정합성을 서비스 레이어에서 강제한다.
"""
from __future__ import annotations

from typing import Any, Sequence

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import SQLModel, select

from app.core.exceptions import NotFoundException
from app.core.permissions import ensure_project_visible_to_user
from app.models.base import require_same_org


async def ensure_exists(
    db: AsyncSession,
    model: type[SQLModel],
    resource_id: int,
    resource_name: str,
) -> Any:
    """Ensure a resource exists and return the loaded row."""
    result = await db.execute(select(model).where(getattr(model, "id") == resource_id))
    row = result.scalar_one_or_none()
    if row is None:
        raise NotFoundException(resource_name, resource_id)
    return row


async def ensure_exists_in_org(
    db: AsyncSession,
    model: type[SQLModel],
    resource_id: int,
    current_user: Any,
    resource_name: str,
    org_field: str = "organization_id",
) -> Any:
    """Ensure a resource exists and belongs to current user's organization."""
    row = await ensure_exists(db, model, resource_id, resource_name)
    resource_org_id = getattr(row, org_field, None)
    require_same_org(resource_org_id, current_user, resource_name)
    if getattr(model, "__name__", "") == "Project":
        await ensure_project_visible_to_user(db, row, current_user)
    return row


async def ensure_ids_exist(
    db: AsyncSession,
    model: type[SQLModel],
    ids: Sequence[int],
    resource_name: str,
) -> None:
    """Ensure all ids exist for a model."""
    if not ids:
        return
    unique_ids = list(set(ids))
    count_result = await db.execute(
        select(func.count())
        .select_from(model)
        .where(getattr(model, "id").in_(unique_ids))
    )
    matched_count = int(count_result.scalar() or 0)
    if matched_count != len(unique_ids):
        missing = len(unique_ids) - matched_count
        raise NotFoundException(resource_name, f"{missing} ids missing")


async def ensure_not_referenced(
    db: AsyncSession,
    child_model: type[SQLModel],
    child_fk_field: str,
    parent_id: int,
    parent_resource_name: str,
) -> None:
    """Prevent delete/update if children still reference parent row."""
    count_result = await db.execute(
        select(func.count())
        .select_from(child_model)
        .where(getattr(child_model, child_fk_field) == parent_id)
    )
    if int(count_result.scalar() or 0) > 0:
        raise ValueError(f"{parent_resource_name} is referenced by {child_model.__name__}")
