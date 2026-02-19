"""현장대리인 경력증명서 만료 리마인더 서비스."""
from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.models.field_representative import (
    CareerReminderStage,
    FieldRepresentative,
    FieldRepresentativeCareerReminderLog,
)
from app.models.operations import AppNotification, NotificationType
from app.models.user import User, UserRole
from app.services.sms import get_sms_service


def _resolve_reminder_stage(
    uploaded_at: datetime,
    today: date,
) -> Optional[tuple[CareerReminderStage, date, int, date]]:
    """업로드 시점을 기준으로 오늘 발송할 리마인더 단계를 계산해요."""
    expiry_date = (uploaded_at + timedelta(days=90)).date()
    remaining_days = (expiry_date - today).days

    if remaining_days == 30:
        return CareerReminderStage.D_30, expiry_date, remaining_days, expiry_date
    if remaining_days == 14:
        return CareerReminderStage.D_14, expiry_date, remaining_days, expiry_date
    if remaining_days == 7:
        return CareerReminderStage.D_7, expiry_date, remaining_days, expiry_date
    if remaining_days == 0:
        return CareerReminderStage.D_0, expiry_date, remaining_days, expiry_date

    # 만료 후 7일 주기 리마인더 (D+7, D+14, ...)
    if remaining_days < 0 and abs(remaining_days) % 7 == 0:
        return CareerReminderStage.EXPIRED_WEEKLY, today, remaining_days, expiry_date

    return None


def _build_reminder_message(
    representative_name: str,
    remaining_days: int,
    expiry_date: date,
) -> str:
    """알림 본문을 생성해요."""
    expiry_str = expiry_date.isoformat()

    if remaining_days > 0:
        return (
            f"[현장대리인] {representative_name}님의 경력증명서 만료 {remaining_days}일 전입니다. "
            f"(만료일: {expiry_str})"
        )
    if remaining_days == 0:
        return (
            f"[현장대리인] {representative_name}님의 경력증명서가 오늘 만료됩니다. "
            f"(만료일: {expiry_str})"
        )
    return (
        f"[현장대리인] {representative_name}님의 경력증명서가 만료 후 {abs(remaining_days)}일 경과했습니다. "
        f"(만료일: {expiry_str})"
    )


async def _load_notification_receivers(
    db: AsyncSession,
    organization_id: int,
) -> list[User]:
    """알림 수신 대상(회사 관리자/현장관리자)을 조회해요."""
    result = await db.execute(
        select(User)
        .where(User.organization_id == organization_id)
        .where(User.is_active.is_(True))
        .where(
            User.role.in_(
                [UserRole.COMPANY_ADMIN, UserRole.SITE_MANAGER],
            )
        )
    )
    return list(result.scalars().all())


async def run_field_representative_career_reminders(
    db: AsyncSession,
    *,
    run_date: Optional[date] = None,
    organization_id: Optional[int] = None,
) -> dict:
    """경력증명서 90일 리마인더를 실행해요.

    - 인앱 알림은 항상 생성 시도
    - 알림톡은 추가 채널로 시도하고 실패해도 업무를 차단하지 않아요
    """
    today = run_date or datetime.utcnow().date()
    now = datetime.utcnow()
    sms_service = get_sms_service()

    query = select(FieldRepresentative).where(
        FieldRepresentative.career_cert_uploaded_at.is_not(None),
    )
    if organization_id is not None:
        query = query.where(FieldRepresentative.organization_id == organization_id)

    representatives = list((await db.execute(query)).scalars().all())

    stats = {
        "run_date": today.isoformat(),
        "organization_id": organization_id,
        "checked_count": len(representatives),
        "eligible_count": 0,
        "notifications_created": 0,
        "alimtalk_success": 0,
        "alimtalk_failure": 0,
        "skipped_duplicate": 0,
        "skipped_no_receiver": 0,
    }

    for representative in representatives:
        uploaded_at = representative.career_cert_uploaded_at
        if not uploaded_at:
            continue

        stage_result = _resolve_reminder_stage(uploaded_at, today)
        if not stage_result:
            continue

        stats["eligible_count"] += 1
        stage, target_date, remaining_days, expiry_date = stage_result

        duplicate_check = await db.execute(
            select(FieldRepresentativeCareerReminderLog.id)
            .where(
                FieldRepresentativeCareerReminderLog.representative_id == representative.id,
            )
            .where(FieldRepresentativeCareerReminderLog.reminder_stage == stage)
            .where(FieldRepresentativeCareerReminderLog.target_date == target_date)
        )
        if duplicate_check.scalar_one_or_none() is not None:
            stats["skipped_duplicate"] += 1
            continue

        receivers = await _load_notification_receivers(db, representative.organization_id)
        if not receivers:
            stats["skipped_no_receiver"] += 1
            continue

        message = _build_reminder_message(
            representative_name=representative.name,
            remaining_days=remaining_days,
            expiry_date=expiry_date,
        )

        in_app_sent = False
        alimtalk_sent = False
        alimtalk_errors: list[str] = []

        for receiver in receivers:
            db.add(
                AppNotification(
                    user_id=receiver.id,
                    type=NotificationType.NOTICE,
                    title="현장대리인 경력증명서 만료 알림",
                    message=message,
                    time=now.strftime("%H:%M"),
                    read=False,
                )
            )
            stats["notifications_created"] += 1
            in_app_sent = True

            if not receiver.phone:
                continue

            try:
                result = await sms_service.send_alimtalk(
                    phone=receiver.phone,
                    template_code="FIELD_REP_CAREER_REMINDER",
                    variables={
                        "name": receiver.name,
                        "representative_name": representative.name,
                        "remaining_days": str(remaining_days),
                        "expiry_date": target_date.isoformat(),
                    },
                )
                if result.get("success"):
                    stats["alimtalk_success"] += 1
                    alimtalk_sent = True
                else:
                    stats["alimtalk_failure"] += 1
                    message_text = result.get("message")
                    if message_text:
                        alimtalk_errors.append(str(message_text))
            except Exception as exc:  # noqa: BLE001 - 알림 실패는 로깅 후 계속 진행
                stats["alimtalk_failure"] += 1
                alimtalk_errors.append(str(exc))

        db.add(
            FieldRepresentativeCareerReminderLog(
                representative_id=representative.id,
                organization_id=representative.organization_id,
                reminder_stage=stage,
                target_date=target_date,
                remaining_days=remaining_days,
                in_app_sent=in_app_sent,
                alimtalk_sent=alimtalk_sent,
                alimtalk_error=("\n".join(alimtalk_errors)[:2000] if alimtalk_errors else None),
            )
        )

    await db.flush()
    return stats
