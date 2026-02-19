"""Audit log helper shared across routers."""
from __future__ import annotations

from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.operations import ActivityLog


async def write_activity_log(
    db: AsyncSession,
    user_id: Optional[int],
    action: str,
    description: str,
    *,
    ip_address: str = "0.0.0.0",
    device_info: str = "web",
) -> None:
    """Persist audit event when actor is known.

    Some flows (invite-token based consent) have no authenticated user yet.
    In those cases we skip ActivityLog insert because user_id is mandatory.
    """
    if not user_id:
        return

    db.add(
        ActivityLog(
            user_id=user_id,
            action=action,
            description=description,
            ip_address=ip_address,
            device_info=device_info,
        )
    )
    await db.flush()

