"""Backfill project access policy records for existing projects.

Usage:
    cd backend && python3 scripts/backfill_project_access_policy.py
"""
from __future__ import annotations

import asyncio

from sqlalchemy import func
from sqlmodel import select

from app.core.database import async_session_factory
from app.models.operations import ProjectAccessPolicy
from app.models.project import Project
from app.models.user import User, UserRole


async def run() -> None:
    async with async_session_factory() as db:
        projects = (await db.execute(select(Project))).scalars().all()
        if not projects:
            print("No projects found.")
            return

        existing_policy_project_ids = {
            row[0]
            for row in (
                await db.execute(select(ProjectAccessPolicy.project_id))
            ).all()
        }

        created = 0
        for project in projects:
            if project.id in existing_policy_project_ids:
                continue

            manager_rows = (
                await db.execute(
                    select(User.id).where(
                        User.organization_id == project.organization_id,
                        User.role == UserRole.SITE_MANAGER,
                    )
                )
            ).all()
            manager_ids = [int(row[0]) for row in manager_rows]
            db.add(ProjectAccessPolicy(project_id=project.id, manager_ids=manager_ids))
            created += 1

        await db.commit()

        total = (await db.execute(select(func.count()).select_from(ProjectAccessPolicy))).scalar() or 0
        print(f"Backfill done. created={created}, total_policies={total}")


if __name__ == "__main__":
    asyncio.run(run())
