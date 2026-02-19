"""Authorization helpers for role-based and project-scoped access."""
from __future__ import annotations

from typing import Any, Sequence

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.exceptions import NotFoundException
from app.models.operations import ProjectAccessPolicy
from app.models.project import Project

ROLE_SUPER_ADMIN = "super_admin"
ROLE_COMPANY_ADMIN = "company_admin"
ROLE_SITE_MANAGER = "site_manager"
ROLE_WORKER = "worker"

_KNOWN_ROLES = {
    ROLE_SUPER_ADMIN,
    ROLE_COMPANY_ADMIN,
    ROLE_SITE_MANAGER,
    ROLE_WORKER,
}

_INVITE_RULES: dict[str, set[str]] = {
    ROLE_SUPER_ADMIN: {ROLE_COMPANY_ADMIN},
    ROLE_COMPANY_ADMIN: {ROLE_SITE_MANAGER},
}


def role_value(user: Any) -> str:
    role = getattr(user, "role", None)
    if hasattr(role, "value"):
        return str(role.value)
    return str(role)


def is_role(user: Any, role_name: str) -> bool:
    return role_value(user) == role_name


def _normalize_role(role: Any) -> str:
    if hasattr(role, "value"):
        return str(role.value)
    return str(role)


def ensure_can_create_invitation(inviter: Any, target_role: Any) -> None:
    inviter_role = role_value(inviter)
    target = _normalize_role(target_role)

    if inviter_role not in _KNOWN_ROLES:
        raise HTTPException(status_code=403, detail="초대 권한이 없어요")

    allowed_targets = _INVITE_RULES.get(inviter_role, set())
    if target not in allowed_targets:
        raise HTTPException(status_code=403, detail="해당 역할로 초대할 권한이 없어요")


async def _load_project_in_scope(
    db: AsyncSession,
    project_id: int,
    current_user: Any,
) -> Project | None:
    query = select(Project).where(Project.id == project_id)
    if getattr(current_user, "organization_id", None) is not None:
        query = query.where(Project.organization_id == current_user.organization_id)

    return (await db.execute(query)).scalar_one_or_none()


def _policy_manager_ids(policy: ProjectAccessPolicy | None) -> set[int]:
    if not policy or not policy.manager_ids:
        return set()

    normalized: set[int] = set()
    for value in policy.manager_ids:
        try:
            normalized.add(int(value))
        except (TypeError, ValueError):
            continue
    return normalized


async def ensure_project_visible_to_user(
    db: AsyncSession,
    project: Project,
    current_user: Any,
) -> None:
    user_role = role_value(current_user)
    if user_role == ROLE_WORKER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="근로자 계정은 프로젝트에 접근할 수 없어요",
        )

    if user_role in {ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN}:
        return

    if user_role != ROLE_SITE_MANAGER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 프로젝트에 접근할 권한이 없어요",
        )

    policy = (
        await db.execute(
            select(ProjectAccessPolicy).where(
                ProjectAccessPolicy.project_id == project.id
            )
        )
    ).scalar_one_or_none()

    manager_ids = _policy_manager_ids(policy)
    if int(current_user.id) not in manager_ids:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="이 프로젝트에 접근할 권한이 없어요",
        )


async def get_project_for_user(
    db: AsyncSession,
    project_id: int,
    current_user: Any,
    *,
    resource_name: str = "project",
) -> Project:
    project = await _load_project_in_scope(db, project_id, current_user)
    if not project:
        raise NotFoundException(resource_name, project_id)

    await ensure_project_visible_to_user(db, project, current_user)
    return project


async def filter_projects_for_user(
    db: AsyncSession,
    projects: Sequence[Project],
    current_user: Any,
) -> list[Project]:
    user_role = role_value(current_user)

    if user_role == ROLE_WORKER:
        return []

    if user_role in {ROLE_SUPER_ADMIN, ROLE_COMPANY_ADMIN}:
        return list(projects)

    if user_role != ROLE_SITE_MANAGER:
        return []

    project_ids = [project.id for project in projects]
    if not project_ids:
        return []

    policies = (
        await db.execute(
            select(ProjectAccessPolicy).where(ProjectAccessPolicy.project_id.in_(project_ids))
        )
    ).scalars().all()

    allowed_ids = {
        policy.project_id
        for policy in policies
        if int(current_user.id) in _policy_manager_ids(policy)
    }

    return [project for project in projects if project.id in allowed_ids]
