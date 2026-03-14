"""사용자 삭제 공통 서비스 (SA 삭제, 개인 탈퇴, 직원 퇴사 시나리오 공통 로직)."""
from __future__ import annotations

from datetime import datetime, timedelta
from typing import TYPE_CHECKING

from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.services.audit_log import write_activity_log

if TYPE_CHECKING:
    from app.models.user import User


RETENTION_YEARS = 5

# 비즈니스 데이터 체크 대상 테이블
# (module, class_name, fk_field, label)
BUSINESS_DATA_CHECKS = [
    ("project", "Project", "created_by", "프로젝트"),
    ("estimate", "Estimate", "created_by", "견적서"),
    ("construction_report", "ConstructionReport", "created_by", "시공보고서"),
    ("construction_plan", "ConstructionPlan", "created_by", "시공계획서"),
    ("cost_calculation", "CostCalculation", "created_by", "원가계산"),
    ("photo_album", "PhotoAlbum", "created_by", "사진앨범"),
    ("tax_invoice", "TaxInvoice", "created_by", "세금계산서"),
    ("operations", "DailyReport", "created_by", "일일보고서"),
    ("operations", "MaterialOrder", "created_by", "자재발주"),
    ("case", "Case", "user_id", "AI진단"),
    ("customer", "CustomerMaster", "created_by", "고객마스터"),
    ("pricebook", "PricebookRevision", "created_by", "단가산출서"),
]


def _create_snapshot(user: "User") -> dict:
    """삭제 전 사용자 정보를 dict로 반환."""
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "name": user.name,
        "phone": user.phone,
        "role": user.role.value if hasattr(user.role, "value") else str(user.role),
        "organization_id": user.organization_id,
        "is_active": user.is_active,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "last_login_at": user.last_login_at.isoformat() if user.last_login_at else None,
    }


def _anonymize_user(user: "User") -> None:
    """개인정보 익명화 (in-place 수정)."""
    now = datetime.utcnow()
    user.username = f"deleted_{user.id}_{int(now.timestamp())}"
    user.name = "삭제된 사용자"
    user.email = None
    user.phone = None
    user.password_hash = ""
    user.is_active = False


async def check_deletion_eligibility(
    db: AsyncSession,
    target_user: "User",
    admin: "User",
) -> dict:
    """삭제 가능 여부를 검사한다.

    Returns:
        {"deletable": bool, "blocking_reasons": [...], "business_data": {...}}
    """
    from app.models.user import User, UserRole

    blocking_reasons: list[dict] = []
    business_data: dict[str, int] = {}

    # 1. 자기 자신 삭제 시도
    if target_user.id == admin.id:
        blocking_reasons.append({
            "code": "CANNOT_DELETE_SELF",
            "message": "자기 자신은 삭제할 수 없어요",
        })

    # 2. 마지막 super_admin 보호
    if target_user.role == UserRole.SUPER_ADMIN:
        other_sa_count_result = await db.execute(
            select(User).where(
                User.role == UserRole.SUPER_ADMIN,
                User.is_active == True,  # noqa: E712
                User.deleted_at == None,  # noqa: E711
                User.id != target_user.id,
            )
        )
        other_sa_count = len(other_sa_count_result.scalars().all())
        if other_sa_count == 0:
            blocking_reasons.append({
                "code": "LAST_SUPER_ADMIN",
                "message": "마지막 슈퍼관리자는 삭제할 수 없어요",
            })

    # 3. 유일한 company_admin 보호
    from app.models.user import UserRole as UR
    if target_user.role == UR.COMPANY_ADMIN and target_user.organization_id is not None:
        other_ca_result = await db.execute(
            select(User).where(
                User.role == UR.COMPANY_ADMIN,
                User.organization_id == target_user.organization_id,
                User.is_active == True,  # noqa: E712
                User.deleted_at == None,  # noqa: E711
                User.id != target_user.id,
            )
        )
        other_ca_count = len(other_ca_result.scalars().all())
        if other_ca_count == 0:
            blocking_reasons.append({
                "code": "SOLE_COMPANY_ADMIN",
                "message": "해당 회사의 유일한 회사관리자는 삭제할 수 없어요",
            })

    # 4. 비즈니스 데이터 존재 여부
    from sqlalchemy import text as sa_text

    for module_name, class_name, fk_field, label in BUSINESS_DATA_CHECKS:
        try:
            module = __import__(f"app.models.{module_name}", fromlist=[class_name])
            model_cls = getattr(module, class_name)
            fk_col = getattr(model_cls, fk_field)
            count_result = await db.execute(
                select(model_cls).where(fk_col == target_user.id)
            )
            count = len(count_result.scalars().all())
            if count > 0:
                business_data[label] = count
        except (ImportError, AttributeError):
            # 해당 모듈/모델이 없으면 건너뜀
            continue

    if business_data:
        blocking_reasons.append({
            "code": "HAS_BUSINESS_DATA",
            "message": "비즈니스 데이터가 있어 삭제할 수 없어요",
            "details": business_data,
        })

    return {
        "deletable": len(blocking_reasons) == 0,
        "blocking_reasons": blocking_reasons,
        "business_data": business_data,
    }


async def execute_sa_deletion(
    db: AsyncSession,
    target_user: "User",
    admin: "User",
    reason: str,
) -> None:
    """SA 삭제를 실행한다 (soft delete + 익명화 + 감사 로그)."""
    from app.models.user_deletion_log import UserDeletionLog, DeletionType
    from app.models.operations import UserNotificationPrefs, AppNotification
    from app.models.device_token import DeviceToken

    now = datetime.utcnow()

    # 1. 스냅샷 생성
    snapshot = _create_snapshot(target_user)

    # 2. UserDeletionLog 생성
    deletion_log = UserDeletionLog(
        user_id=target_user.id,
        deletion_type=DeletionType.ADMIN_CLEANUP,
        deleted_by=admin.id,
        reason=reason,
        user_snapshot=snapshot,
        organization_id=target_user.organization_id,
        retention_expires_at=now + timedelta(days=5 * 365),
    )
    db.add(deletion_log)

    # 3. 개인정보 익명화
    _anonymize_user(target_user)

    # 4. soft delete 필드 설정
    target_user.deleted_at = now
    target_user.deleted_by = admin.id
    target_user.deletion_reason = reason

    # 5. 관련 데이터 삭제
    # DeviceToken
    device_token_result = await db.execute(
        select(DeviceToken).where(DeviceToken.user_id == target_user.id)
    )
    for token in device_token_result.scalars().all():
        await db.delete(token)

    # UserNotificationPrefs
    prefs_result = await db.execute(
        select(UserNotificationPrefs).where(UserNotificationPrefs.user_id == target_user.id)
    )
    for pref in prefs_result.scalars().all():
        await db.delete(pref)

    # AppNotification
    notif_result = await db.execute(
        select(AppNotification).where(AppNotification.user_id == target_user.id)
    )
    for notif in notif_result.scalars().all():
        await db.delete(notif)

    # 6. 활동 로그 기록
    await write_activity_log(
        db,
        user_id=admin.id,
        action="user.delete",
        description=f"사용자 삭제: user_id={target_user.id}, reason={reason}",
    )


async def check_termination_eligibility(
    db: AsyncSession,
    target_user: "User",
    admin: "User",
) -> dict:
    """퇴사 처리 가능 여부를 검사한다."""
    blocking_reasons = []

    # 자기 자신
    if target_user.id == admin.id:
        blocking_reasons.append({
            "code": "CANNOT_TERMINATE_SELF",
            "message": "자기 자신은 퇴사 처리할 수 없어요.",
        })

    # company_admin은 퇴사 대상 아님
    role_val = target_user.role.value if hasattr(target_user.role, "value") else str(target_user.role)
    if role_val in ("super_admin", "company_admin"):
        blocking_reasons.append({
            "code": "INVALID_ROLE",
            "message": "관리자 계정은 퇴사 처리할 수 없어요. 시스템 관리자에게 문의해 주세요.",
        })

    # 같은 조직 확인 (super_admin은 모든 조직 퇴사 처리 가능)
    admin_role = admin.role.value if hasattr(admin.role, "value") else str(admin.role)
    if admin_role != "super_admin" and target_user.organization_id != admin.organization_id:
        blocking_reasons.append({
            "code": "DIFFERENT_ORG",
            "message": "다른 조직의 직원은 퇴사 처리할 수 없어요.",
        })

    # 담당 프로젝트 조회 (ProjectAccessPolicy.manager_ids에 포함된 프로젝트)
    assigned_projects = []
    try:
        from app.models.operations import ProjectAccessPolicy
        from app.models.project import Project
        policies = await db.execute(select(ProjectAccessPolicy))
        for policy in policies.scalars().all():
            if target_user.id in (policy.manager_ids or []):
                # 프로젝트 이름 조회
                proj = await db.execute(
                    select(Project).where(Project.id == policy.project_id)
                )
                p = proj.scalar_one_or_none()
                if p:
                    assigned_projects.append({
                        "project_id": str(p.id),
                        "project_name": p.name,
                        "status": p.status.value if hasattr(p.status, "value") else str(p.status),
                    })
    except Exception:
        pass

    return {
        "can_terminate": len(blocking_reasons) == 0,
        "blocking_reasons": blocking_reasons,
        "assigned_projects": assigned_projects,
    }


async def execute_termination(
    db: AsyncSession,
    target_user: "User",
    admin: "User",
    reason: str,
) -> None:
    """Scenario C: 직원 퇴사 처리 실행."""
    from app.models.user_deletion_log import UserDeletionLog, DeletionType

    now = datetime.utcnow()

    # 1. 스냅샷
    snapshot = _create_snapshot(target_user)
    log = UserDeletionLog(
        user_id=target_user.id,
        deletion_type=DeletionType.EMPLOYEE_TERMINATION,
        deleted_by=admin.id,
        reason=reason,
        user_snapshot=snapshot,
        organization_id=target_user.organization_id,
        retention_expires_at=now + timedelta(days=RETENTION_YEARS * 365),
        deleted_at=now,
    )
    db.add(log)

    # 2. 익명화 (퇴사자용 이름)
    target_user.username = f"terminated_{target_user.id}_{int(now.timestamp())}"
    target_user.name = "퇴사한 직원"
    target_user.email = None
    target_user.phone = None
    target_user.password_hash = ""
    target_user.is_active = False

    # 3. 퇴사 필드
    target_user.terminated_at = now
    target_user.terminated_by = admin.id
    target_user.deleted_at = now
    target_user.deleted_by = admin.id
    target_user.deletion_reason = reason
    target_user.updated_at = now

    # 4. ProjectAccessPolicy에서 제거
    try:
        from app.models.operations import ProjectAccessPolicy
        policies = await db.execute(select(ProjectAccessPolicy))
        for policy in policies.scalars().all():
            if target_user.id in (policy.manager_ids or []):
                policy.manager_ids = [
                    mid for mid in policy.manager_ids if mid != target_user.id
                ]
    except Exception:
        pass

    # 5. 시스템 부수 데이터 정리
    from app.models.device_token import DeviceToken
    from app.models.operations import UserNotificationPrefs, AppNotification
    for model_cls, fk in [
        (DeviceToken, "user_id"),
        (UserNotificationPrefs, "user_id"),
        (AppNotification, "user_id"),
    ]:
        try:
            fk_col = getattr(model_cls, fk)
            items = await db.execute(select(model_cls).where(fk_col == target_user.id))
            for item in items.scalars().all():
                await db.delete(item)
        except Exception:
            continue

    # 6. 감사 로그
    await write_activity_log(
        db, admin.id, "user_terminated",
        f"직원 {snapshot['name']}({target_user.id}) 퇴사 처리. 사유: {reason}",
    )


async def request_withdrawal(
    db: AsyncSession,
    user: "User",
    reason: str,
) -> dict:
    """Scenario B1: 탈퇴 신청. 30일 유예 기간 시작."""
    from app.models.user import User, UserRole

    now = datetime.utcnow()

    # 이미 탈퇴 신청 중
    if user.withdrawal_requested_at is not None:
        raise ValueError("이미 탈퇴가 신청되어 있어요.")

    # super_admin은 탈퇴 불가
    role_val = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role_val == "super_admin":
        raise ValueError("최고관리자 계정은 직접 탈퇴할 수 없어요.")

    # 유일한 company_admin 체크
    if role_val == "company_admin" and user.organization_id:
        count_result = await db.execute(
            select(func.count()).select_from(User).where(
                User.role == UserRole.COMPANY_ADMIN,
                User.organization_id == user.organization_id,
                User.is_active == True,  # noqa: E712
                User.deleted_at == None,  # noqa: E711
                User.id != user.id,
            )
        )
        if int(count_result.scalar() or 0) == 0:
            raise ValueError("조직의 유일한 대표이므로 탈퇴할 수 없어요. 다른 대표를 먼저 지정해 주세요.")

    scheduled_at = now + timedelta(days=30)
    user.withdrawal_requested_at = now
    user.withdrawal_scheduled_at = scheduled_at
    user.withdrawal_reason = reason
    user.updated_at = now

    await write_activity_log(db, user.id, "withdrawal_request", "회원 탈퇴 신청")

    return {
        "requested_at": now.isoformat(),
        "scheduled_at": scheduled_at.isoformat(),
    }


async def cancel_withdrawal(
    db: AsyncSession,
    user: "User",
) -> None:
    """Scenario B1: 탈퇴 철회."""
    if user.withdrawal_requested_at is None:
        raise ValueError("진행 중인 탈퇴 요청이 없어요.")

    user.withdrawal_requested_at = None
    user.withdrawal_scheduled_at = None
    user.withdrawal_reason = None
    user.updated_at = datetime.utcnow()

    await write_activity_log(db, user.id, "withdrawal_cancel", "회원 탈퇴 철회")


async def execute_withdrawal(
    db: AsyncSession,
    user: "User",
) -> None:
    """Scenario B1: 유예 만료 후 탈퇴 자동 실행."""
    from app.models.user_deletion_log import UserDeletionLog, DeletionType

    now = datetime.utcnow()

    # 스냅샷
    snapshot = _create_snapshot(user)
    log = UserDeletionLog(
        user_id=user.id,
        deletion_type=DeletionType.SELF_WITHDRAWAL,
        deleted_by=None,
        reason=user.withdrawal_reason,
        user_snapshot=snapshot,
        organization_id=user.organization_id,
        retention_expires_at=now + timedelta(days=RETENTION_YEARS * 365),
        deleted_at=now,
    )
    db.add(log)

    # 익명화
    _anonymize_user(user)

    # Soft delete
    user.deleted_at = now
    user.deletion_reason = user.withdrawal_reason
    user.updated_at = now

    # 시스템 부수 데이터 정리
    from app.models.device_token import DeviceToken
    from app.models.operations import UserNotificationPrefs, AppNotification
    for model_cls, fk in [
        (DeviceToken, "user_id"),
        (UserNotificationPrefs, "user_id"),
        (AppNotification, "user_id"),
    ]:
        try:
            fk_col = getattr(model_cls, fk)
            items = await db.execute(select(model_cls).where(fk_col == user.id))
            for item in items.scalars().all():
                await db.delete(item)
        except Exception:
            continue

    await write_activity_log(db, user.id, "withdrawal_executed", "회원 탈퇴 자동 실행")
