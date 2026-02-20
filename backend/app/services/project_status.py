"""프로젝트 상태 전이 공통 유틸."""

from datetime import datetime, timedelta
from typing import Optional

from app.models.project import Project, ProjectStatus


def apply_project_status_update(
    project: Project,
    new_status: ProjectStatus,
    changed_at: Optional[datetime] = None,
) -> bool:
    """프로젝트 상태를 변경하고 상태별 타임스탬프를 갱신해요."""
    now = changed_at or datetime.utcnow()
    has_status_changed = project.status != new_status

    project.status = new_status
    project.updated_at = now

    if new_status == ProjectStatus.CONTRACTED and not project.contracted_at:
        project.contracted_at = now
    elif new_status == ProjectStatus.IN_PROGRESS and not project.started_at:
        project.started_at = now
    elif new_status == ProjectStatus.COMPLETED:
        if not project.completed_at:
            project.completed_at = now
        project.warranty_expires_at = project.completed_at + timedelta(days=365 * 3)

    return has_status_changed
