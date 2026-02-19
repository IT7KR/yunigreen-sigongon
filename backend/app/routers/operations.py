"""Auxiliary operations router for frontend API parity."""
from __future__ import annotations

import random
import secrets
from datetime import date, datetime, timedelta
from decimal import Decimal
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

from app.core.database import get_async_db
from app.core.exceptions import NotFoundException
from app.core.security import get_current_user, get_password_hash, verify_password
from app.models.billing import Payment, PaymentStatus, Subscription, SubscriptionPlan, SubscriptionStatus
from app.models.contract import LaborContract, LaborContractStatus
from app.models.diagnosis import AIDiagnosis
from app.models.operations import (
    AccountRequest,
    ActivityLog,
    AppNotification,
    DailyReport,
    DailyWorker,
    InsuranceRate,
    Invitation,
    InvitationStatus,
    MaterialOrder,
    MaterialOrderItem,
    MaterialOrderStatus,
    NotificationType,
    Partner,
    PartnerStatus,
    Paystub,
    PaystubItem,
    PaystubStatus,
    ProjectAccessPolicy,
    UtilityDocStatus,
    UtilityItem,
    UtilityStatus,
    UtilityTimeline,
    UserNotificationPrefs,
    WorkRecord,
    WorkerAccessRequest,
    WorkerDocument,
)
from app.models.project import Project, SiteVisit
from app.models.user import Organization, User, UserRole
from app.schemas.response import APIResponse, PaginatedResponse
from app.services.storage import storage_service

router = APIRouter()

DBSession = Annotated[AsyncSession, Depends(get_async_db)]
CurrentUser = Annotated[User, Depends(get_current_user)]


def _role_value(user: User) -> str:
    role = user.role
    return role.value if hasattr(role, "value") else str(role)


def _require_org_id(user: User) -> int:
    if user.organization_id is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="조직 정보가 필요한 요청이에요.",
        )
    return user.organization_id


async def _get_project_for_user(
    db: AsyncSession,
    project_id: int,
    user: User,
) -> Project:
    query = select(Project).where(Project.id == project_id)
    if user.organization_id is not None:
        query = query.where(Project.organization_id == user.organization_id)

    result = await db.execute(query)
    project = result.scalar_one_or_none()
    if not project:
        raise NotFoundException("project", project_id)
    return project


def _to_int(value: int | str) -> int:
    if isinstance(value, int):
        return value
    raw = str(value)
    if raw.isdigit():
        return int(raw)
    digits = "".join(ch for ch in raw if ch.isdigit())
    if digits:
        return int(digits)
    raise ValueError(f"Cannot parse integer from value: {value}")


def _to_iso(dt: datetime | None) -> str | None:
    return dt.isoformat() if dt else None


def _safe_decimal_to_int(value: Decimal | int | float | None) -> int:
    if value is None:
        return 0
    if isinstance(value, Decimal):
        return int(value)
    return int(value)


async def _log_activity(
    db: AsyncSession,
    user_id: int,
    action: str,
    description: str,
) -> None:
    db.add(
        ActivityLog(
            user_id=user_id,
            action=action,
            description=description,
            ip_address="0.0.0.0",
            device_info="web",
        )
    )
    await db.flush()


async def _get_or_create_notification_prefs(
    db: AsyncSession,
    user_id: int,
) -> UserNotificationPrefs:
    result = await db.execute(select(UserNotificationPrefs).where(UserNotificationPrefs.user_id == user_id))
    prefs = result.scalar_one_or_none()
    if prefs:
        return prefs

    prefs = UserNotificationPrefs(user_id=user_id)
    db.add(prefs)
    await db.flush()
    return prefs


async def _seed_utilities_if_empty(db: AsyncSession, project_id: int) -> None:
    count = (await db.execute(
        select(func.count()).select_from(UtilityItem).where(UtilityItem.project_id == project_id)
    )).scalar() or 0
    if count > 0:
        return

    today = date.today()
    month_str = f"{today.year}-{today.month:02d}"
    types = ["수도", "전기", "가스"]
    for idx, utility_type in enumerate(types):
        due_date = today + timedelta(days=7 + idx * 3)
        item = UtilityItem(
            project_id=project_id,
            type=utility_type,
            month=month_str,
            status=UtilityStatus.PENDING,
            amount=120000 + idx * 30000,
            due_date=due_date,
            doc_status=UtilityDocStatus.PENDING,
        )
        db.add(item)
    db.add(
        UtilityTimeline(
            project_id=project_id,
            date=datetime.utcnow(),
            message="수도광열비 정산 항목을 초기화했어요.",
        )
    )
    await db.flush()


async def _resolve_worker_user_id(db: AsyncSession, worker_id: str) -> int:
    candidate_id: Optional[int] = None

    if worker_id.isdigit():
        candidate_id = int(worker_id)
    elif worker_id.startswith("worker_") and worker_id.split("worker_", 1)[1].isdigit():
        candidate_id = int(worker_id.split("worker_", 1)[1])

    if candidate_id is not None:
        result = await db.execute(select(User).where(User.id == candidate_id))
        user = result.scalar_one_or_none()
        if user:
            return user.id

    result = await db.execute(select(User).where(User.username == worker_id))
    user = result.scalar_one_or_none()
    if user:
        return user.id

    # fallback worker account
    username = worker_id if worker_id.startswith("worker_") else f"worker_{worker_id}"
    fallback = User(
        username=username,
        name="작업자",
        phone=None,
        email=None,
        role=UserRole.WORKER,
        organization_id=None,
        password_hash=get_password_hash("123456"),
        is_active=True,
    )
    db.add(fallback)
    await db.flush()
    return fallback.id


async def _seed_worker_documents(db: AsyncSession, worker_user_id: int) -> list[WorkerDocument]:
    result = await db.execute(
        select(WorkerDocument).where(WorkerDocument.worker_id == worker_user_id)
    )
    docs = list(result.scalars().all())
    if docs:
        return docs

    defaults = [
        ("doc_1", "신분증"),
        ("doc_2", "안전교육 이수증"),
    ]
    for doc_id, name in defaults:
        db.add(
            WorkerDocument(
                worker_id=worker_user_id,
                document_id=doc_id,
                name=name,
                status="pending",
            )
        )
    await db.flush()
    result = await db.execute(select(WorkerDocument).where(WorkerDocument.worker_id == worker_user_id))
    return list(result.scalars().all())


async def _seed_paystub_if_empty(db: AsyncSession, worker_user_id: int) -> None:
    count = (await db.execute(
        select(func.count()).select_from(Paystub).where(Paystub.worker_id == worker_user_id)
    )).scalar() or 0
    if count > 0:
        return

    month = datetime.utcnow().strftime("%Y-%m")
    paystub = Paystub(
        worker_id=worker_user_id,
        month=month,
        title=f"{month} 급여명세서",
        total_amount=2600000,
        deductions=180000,
        net_amount=2420000,
        status=PaystubStatus.SENT,
        date=datetime.utcnow().strftime("%Y-%m-%d"),
    )
    db.add(paystub)
    await db.flush()

    for label, amount in [
        ("기본급", 2200000),
        ("연장수당", 400000),
        ("소득세", -120000),
        ("지방세", -12000),
        ("고용보험", -48000),
    ]:
        db.add(PaystubItem(paystub_id=paystub.id, label=label, amount=amount))
    await db.flush()


async def _ensure_labor_contract_stub(db: AsyncSession, contract_id: int) -> LaborContract:
    labor_contract = (await db.execute(select(LaborContract).where(LaborContract.id == contract_id))).scalar_one_or_none()
    if labor_contract:
        return labor_contract

    project = (await db.execute(select(Project).order_by(Project.created_at.asc()).limit(1))).scalar_one_or_none()
    if not project:
        org = (await db.execute(select(Organization).order_by(Organization.created_at.asc()).limit(1))).scalar_one_or_none()
        if not org:
            org = Organization(name="기본 조직", is_active=True)
            db.add(org)
            await db.flush()

        project = Project(
            name="기본 현장",
            address="미설정",
            organization_id=org.id,
            created_by=None,
        )
        db.add(project)
        await db.flush()

    labor_contract = LaborContract(
        id=contract_id,
        project_id=project.id,
        worker_name="현장근로자",
        worker_phone=None,
        work_date=date.today(),
        work_type="보통인부",
        daily_rate=Decimal("150000"),
        status=LaborContractStatus.SENT,
    )
    db.add(labor_contract)
    await db.flush()
    return labor_contract


def _calc_worker_deductions(
    total_labor_cost: int,
    rates: InsuranceRate,
) -> dict[str, int]:
    base = max(0, Decimal(total_labor_cost) - rates.income_deduction)
    income_tax = int((base * rates.simplified_tax_rate).quantize(Decimal("1")))
    resident_tax = int((Decimal(income_tax) * rates.local_tax_rate).quantize(Decimal("1")))
    health = int((Decimal(total_labor_cost) * rates.health_insurance_rate).quantize(Decimal("1")))
    care = int((Decimal(health) * rates.longterm_care_rate).quantize(Decimal("1")))
    pension = int((Decimal(total_labor_cost) * rates.national_pension_rate).quantize(Decimal("1")))
    employment = int((Decimal(total_labor_cost) * rates.employment_insurance_rate).quantize(Decimal("1")))
    total_deductions = income_tax + resident_tax + health + care + pension + employment
    net_pay = max(0, total_labor_cost - total_deductions)
    return {
        "income_tax": income_tax,
        "resident_tax": resident_tax,
        "health_insurance": health,
        "longterm_care": care,
        "national_pension": pension,
        "employment_insurance": employment,
        "total_deductions": total_deductions,
        "net_pay": net_pay,
    }


async def _get_or_create_insurance_rate(
    db: AsyncSession,
    organization_id: int,
    year: int,
) -> InsuranceRate:
    result = await db.execute(
        select(InsuranceRate).where(
            InsuranceRate.organization_id == organization_id,
            InsuranceRate.effective_year == year,
        )
    )
    rate = result.scalar_one_or_none()
    if rate:
        return rate

    rate = InsuranceRate(organization_id=organization_id, effective_year=year)
    db.add(rate)
    await db.flush()
    return rate


# ----------------------------
# Project access / reports
# ----------------------------


class ProjectAccessUpdateRequest(BaseModel):
    manager_ids: list[str]


@router.get("/projects/{project_id}/access", response_model=APIResponse[dict])
async def get_project_access_policy(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)

    result = await db.execute(
        select(ProjectAccessPolicy).where(ProjectAccessPolicy.project_id == project_id)
    )
    policy = result.scalar_one_or_none()

    manager_ids = [] if not policy else [str(mid) for mid in (policy.manager_ids or [])]
    return APIResponse.ok({"project_id": str(project_id), "manager_ids": manager_ids})


@router.put("/projects/{project_id}/access", response_model=APIResponse[dict])
async def update_project_access_policy(
    project_id: int,
    payload: ProjectAccessUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)

    manager_ids = [_to_int(v) for v in payload.manager_ids]

    result = await db.execute(
        select(ProjectAccessPolicy).where(ProjectAccessPolicy.project_id == project_id)
    )
    policy = result.scalar_one_or_none()
    now = datetime.utcnow()

    if not policy:
        policy = ProjectAccessPolicy(project_id=project_id, manager_ids=manager_ids, updated_at=now)
        db.add(policy)
    else:
        policy.manager_ids = manager_ids
        policy.updated_at = now

    await _log_activity(db, current_user.id, "settings_change", f"프로젝트 {project_id} 접근권한 수정")

    return APIResponse.ok({
        "project_id": str(project_id),
        "manager_ids": [str(mid) for mid in manager_ids],
    })


class DailyReportCreateRequest(BaseModel):
    work_date: date
    weather: Optional[str] = None
    temperature: Optional[str] = None
    work_description: str
    tomorrow_plan: Optional[str] = None
    photos: list[str] = []


@router.get("/projects/{project_id}/daily-reports", response_model=APIResponse[list[dict]])
async def list_daily_reports(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)

    result = await db.execute(
        select(DailyReport)
        .where(DailyReport.project_id == project_id)
        .order_by(DailyReport.work_date.desc(), DailyReport.created_at.desc())
    )
    reports = result.scalars().all()

    return APIResponse.ok([
        {
            "id": str(r.id),
            "project_id": str(r.project_id),
            "work_date": r.work_date.isoformat(),
            "weather": r.weather,
            "temperature": r.temperature,
            "work_description": r.work_description,
            "tomorrow_plan": r.tomorrow_plan,
            "photos": r.photos,
            "photo_count": len(r.photos or []),
            "created_at": r.created_at.isoformat(),
        }
        for r in reports
    ])


@router.post("/projects/{project_id}/daily-reports", response_model=APIResponse[dict], status_code=status.HTTP_201_CREATED)
async def create_daily_report(
    project_id: int,
    payload: DailyReportCreateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)

    report = DailyReport(
        project_id=project_id,
        work_date=payload.work_date,
        weather=payload.weather,
        temperature=payload.temperature,
        work_description=payload.work_description,
        tomorrow_plan=payload.tomorrow_plan,
        photos=payload.photos,
        created_by=current_user.id,
    )
    db.add(report)

    await _log_activity(db, current_user.id, "project_update", f"프로젝트 {project_id} 작업일지 등록")

    await db.flush()
    return APIResponse.ok(
        {
            "id": str(report.id),
            "project_id": str(report.project_id),
            "work_date": report.work_date.isoformat(),
            "weather": report.weather,
            "temperature": report.temperature,
            "work_description": report.work_description,
            "tomorrow_plan": report.tomorrow_plan,
            "photos": report.photos,
            "created_at": report.created_at.isoformat(),
        }
    )


class UtilityStatusPatchRequest(BaseModel):
    status: Optional[UtilityStatus] = None
    doc_status: Optional[UtilityDocStatus] = None


@router.get("/projects/{project_id}/utilities", response_model=APIResponse[dict])
async def get_utilities(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)
    await _seed_utilities_if_empty(db, project_id)

    items_result = await db.execute(
        select(UtilityItem)
        .where(UtilityItem.project_id == project_id)
        .order_by(UtilityItem.due_date.asc())
    )
    timeline_result = await db.execute(
        select(UtilityTimeline)
        .where(UtilityTimeline.project_id == project_id)
        .order_by(UtilityTimeline.date.desc())
    )

    items = items_result.scalars().all()
    timeline = timeline_result.scalars().all()

    return APIResponse.ok(
        {
            "items": [
                {
                    "id": str(item.id),
                    "type": item.type,
                    "month": item.month,
                    "status": item.status.value,
                    "amount": item.amount,
                    "due_date": item.due_date.isoformat(),
                    "doc_status": item.doc_status.value,
                }
                for item in items
            ],
            "timeline": [
                {
                    "id": str(t.id),
                    "date": t.date.isoformat(),
                    "message": t.message,
                }
                for t in timeline
            ],
        }
    )


@router.patch("/projects/{project_id}/utilities/{utility_id}", response_model=APIResponse[dict])
async def patch_utility_status(
    project_id: int,
    utility_id: int,
    payload: UtilityStatusPatchRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)

    result = await db.execute(
        select(UtilityItem)
        .where(UtilityItem.id == utility_id)
        .where(UtilityItem.project_id == project_id)
    )
    item = result.scalar_one_or_none()
    if not item:
        raise NotFoundException("utility", utility_id)

    now = datetime.utcnow()
    if payload.status is not None:
        item.status = payload.status
    if payload.doc_status is not None:
        item.doc_status = payload.doc_status
    item.updated_at = now

    status_label = item.status.value
    db.add(
        UtilityTimeline(
            project_id=project_id,
            utility_item_id=item.id,
            date=now,
            message=f"{item.month} {item.type} 상태를 {status_label}로 변경했어요.",
        )
    )

    return APIResponse.ok({"id": str(item.id)})


class MaterialOrderItemInput(BaseModel):
    description: str
    specification: Optional[str] = None
    unit: str
    quantity: Decimal
    unit_price: Decimal


class MaterialOrderCreateRequest(BaseModel):
    items: list[MaterialOrderItemInput]
    notes: Optional[str] = None


class MaterialOrderStatusPatchRequest(BaseModel):
    status: str


@router.get("/projects/{project_id}/material-orders", response_model=APIResponse[list[dict]])
async def list_material_orders(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)

    result = await db.execute(
        select(MaterialOrder)
        .where(MaterialOrder.project_id == project_id)
        .order_by(MaterialOrder.created_at.desc())
    )
    orders = result.scalars().all()

    items_result = await db.execute(
        select(MaterialOrderItem)
        .where(MaterialOrderItem.material_order_id.in_([o.id for o in orders]))
    ) if orders else None
    item_rows = items_result.scalars().all() if items_result else []

    by_order: dict[int, list[MaterialOrderItem]] = {}
    for row in item_rows:
        by_order.setdefault(row.material_order_id, []).append(row)

    return APIResponse.ok([
        {
            "id": str(order.id),
            "project_id": str(order.project_id),
            "order_number": order.order_number,
            "status": order.status.value,
            "total_amount": order.total_amount,
            "requested_at": _to_iso(order.requested_at),
            "confirmed_at": _to_iso(order.confirmed_at),
            "delivered_at": _to_iso(order.delivered_at),
            "created_at": order.created_at.isoformat(),
            "items": [
                {
                    "id": str(i.id),
                    "description": i.description,
                    "specification": i.specification,
                    "unit": i.unit,
                    "quantity": float(i.quantity),
                    "unit_price": float(i.unit_price),
                    "amount": float(i.amount),
                }
                for i in by_order.get(order.id, [])
            ],
        }
        for order in orders
    ])


@router.post("/projects/{project_id}/material-orders", response_model=APIResponse[dict], status_code=status.HTTP_201_CREATED)
async def create_material_order(
    project_id: int,
    payload: MaterialOrderCreateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)

    if not payload.items:
        raise HTTPException(status_code=400, detail="발주 품목이 필요해요")

    order_number = f"MO-{datetime.utcnow().strftime('%Y%m%d')}-{secrets.token_hex(2).upper()}"
    order = MaterialOrder(
        project_id=project_id,
        order_number=order_number,
        status=MaterialOrderStatus.DRAFT,
        notes=payload.notes,
        created_by=current_user.id,
    )
    db.add(order)
    await db.flush()

    total = Decimal("0")
    for row in payload.items:
        amount = row.quantity * row.unit_price
        total += amount
        db.add(
            MaterialOrderItem(
                material_order_id=order.id,
                description=row.description,
                specification=row.specification,
                unit=row.unit,
                quantity=row.quantity,
                unit_price=row.unit_price,
                amount=amount,
            )
        )

    order.total_amount = int(total)

    return APIResponse.ok(
        {
            "id": str(order.id),
            "order_number": order.order_number,
            "status": order.status.value,
            "total_amount": order.total_amount,
        }
    )


@router.get("/material-orders/{order_id}", response_model=APIResponse[dict])
async def get_material_order(
    order_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    result = await db.execute(select(MaterialOrder).where(MaterialOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("material_order", order_id)

    await _get_project_for_user(db, order.project_id, current_user)

    item_result = await db.execute(
        select(MaterialOrderItem)
        .where(MaterialOrderItem.material_order_id == order.id)
        .order_by(MaterialOrderItem.id.asc())
    )
    order_items = item_result.scalars().all()

    return APIResponse.ok(
        {
            "id": str(order.id),
            "project_id": str(order.project_id),
            "order_number": order.order_number,
            "status": order.status.value,
            "items": [
                {
                    "id": str(item.id),
                    "description": item.description,
                    "specification": item.specification,
                    "unit": item.unit,
                    "quantity": float(item.quantity),
                    "unit_price": float(item.unit_price),
                    "amount": float(item.amount),
                }
                for item in order_items
            ],
            "total_amount": order.total_amount,
            "requested_at": _to_iso(order.requested_at),
            "confirmed_at": _to_iso(order.confirmed_at),
            "delivered_at": _to_iso(order.delivered_at),
            "notes": order.notes,
            "created_at": order.created_at.isoformat(),
        }
    )


@router.patch("/material-orders/{order_id}", response_model=APIResponse[dict])
async def update_material_order_status(
    order_id: int,
    payload: MaterialOrderStatusPatchRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    result = await db.execute(select(MaterialOrder).where(MaterialOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("material_order", order_id)

    await _get_project_for_user(db, order.project_id, current_user)

    try:
        next_status = MaterialOrderStatus(payload.status)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="유효하지 않은 발주 상태예요") from exc

    order.status = next_status
    now = datetime.utcnow()
    if next_status == MaterialOrderStatus.REQUESTED:
        order.requested_at = now
    elif next_status == MaterialOrderStatus.CONFIRMED:
        order.confirmed_at = now
    elif next_status == MaterialOrderStatus.DELIVERED:
        order.delivered_at = now
    order.updated_at = now

    return APIResponse.ok(
        {
            "id": str(order.id),
            "status": order.status.value,
            "message": "발주 상태를 변경했어요.",
        }
    )


@router.delete("/material-orders/{order_id}", response_model=APIResponse[dict])
async def cancel_material_order(
    order_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    result = await db.execute(select(MaterialOrder).where(MaterialOrder.id == order_id))
    order = result.scalar_one_or_none()
    if not order:
        raise NotFoundException("material_order", order_id)

    await _get_project_for_user(db, order.project_id, current_user)
    order.status = MaterialOrderStatus.CANCELLED
    order.updated_at = datetime.utcnow()
    return APIResponse.ok({"id": str(order.id), "message": "발주를 취소했어요."})


@router.get("/projects/{project_id}/diagnoses", response_model=APIResponse[list[dict]])
async def list_project_diagnoses(
    project_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    await _get_project_for_user(db, project_id, current_user)

    visit_ids_result = await db.execute(
        select(SiteVisit.id).where(SiteVisit.project_id == project_id)
    )
    visit_ids = [row[0] for row in visit_ids_result.all()]

    if not visit_ids:
        return APIResponse.ok([])

    result = await db.execute(
        select(AIDiagnosis)
        .where(AIDiagnosis.site_visit_id.in_(visit_ids))
        .order_by(AIDiagnosis.created_at.desc())
    )
    diagnoses = result.scalars().all()

    return APIResponse.ok([
        {
            "id": str(d.id),
            "site_visit_id": str(d.site_visit_id),
            "status": d.status.value,
            "leak_opinion_text": d.leak_opinion_text,
            "created_at": d.created_at.isoformat(),
            "model_name": d.model_name,
        }
        for d in diagnoses
    ])


# ----------------------------
# Partners
# ----------------------------


class PartnerCreateRequest(BaseModel):
    name: str
    owner: str
    biz_no: str
    license: Optional[str] = None
    is_female_owned: bool = False


class PartnerUpdateRequest(BaseModel):
    name: Optional[str] = None
    owner: Optional[str] = None
    biz_no: Optional[str] = None
    license: Optional[str] = None
    is_female_owned: Optional[bool] = None


@router.get("/partners", response_model=APIResponse[list[dict]])
async def list_partners(
    db: DBSession,
    current_user: CurrentUser,
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(default=None, alias="status"),
):
    org_id = _require_org_id(current_user)

    query = select(Partner).where(Partner.organization_id == org_id)
    if search:
        like = f"%{search}%"
        query = query.where(
            (Partner.name.ilike(like)) |
            (Partner.owner.ilike(like)) |
            (Partner.biz_no.ilike(like))
        )
    if status_filter:
        try:
            query = query.where(Partner.status == PartnerStatus(status_filter))
        except ValueError:
            pass

    query = query.order_by(Partner.created_at.desc())
    result = await db.execute(query)
    items = result.scalars().all()

    return APIResponse.ok([
        {
            "id": str(p.id),
            "name": p.name,
            "biz_no": p.biz_no,
            "owner": p.owner,
            "license": p.license or "",
            "is_female_owned": p.is_female_owned,
            "status": p.status.value,
        }
        for p in items
    ])


@router.post("/partners", response_model=APIResponse[dict], status_code=status.HTTP_201_CREATED)
async def create_partner(
    payload: PartnerCreateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    partner = Partner(
        organization_id=org_id,
        name=payload.name,
        owner=payload.owner,
        biz_no=payload.biz_no,
        license=payload.license,
        is_female_owned=payload.is_female_owned,
        status=PartnerStatus.ACTIVE,
    )
    db.add(partner)
    await db.flush()

    return APIResponse.ok(
        {
            "id": str(partner.id),
            "name": partner.name,
            "owner": partner.owner,
            "biz_no": partner.biz_no,
            "license": partner.license,
            "is_female_owned": partner.is_female_owned,
            "status": partner.status.value,
        }
    )


@router.patch("/partners/{partner_id}", response_model=APIResponse[dict])
async def update_partner(
    partner_id: int,
    payload: PartnerUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    result = await db.execute(
        select(Partner)
        .where(Partner.id == partner_id)
        .where(Partner.organization_id == org_id)
    )
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundException("partner", partner_id)

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(partner, field, value)
    partner.updated_at = datetime.utcnow()

    return APIResponse.ok(
        {
            "id": str(partner.id),
            "name": partner.name,
            "owner": partner.owner,
            "biz_no": partner.biz_no,
            "license": partner.license,
            "is_female_owned": partner.is_female_owned,
            "status": partner.status.value,
        }
    )


@router.delete("/partners/{partner_id}", response_model=APIResponse[dict])
async def delete_partner(
    partner_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    result = await db.execute(
        select(Partner)
        .where(Partner.id == partner_id)
        .where(Partner.organization_id == org_id)
    )
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundException("partner", partner_id)

    await db.delete(partner)
    return APIResponse.ok({"deleted": True})


@router.post("/partners/{partner_id}/toggle-status", response_model=APIResponse[dict])
async def toggle_partner_status(
    partner_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    result = await db.execute(
        select(Partner)
        .where(Partner.id == partner_id)
        .where(Partner.organization_id == org_id)
    )
    partner = result.scalar_one_or_none()
    if not partner:
        raise NotFoundException("partner", partner_id)

    partner.status = (
        PartnerStatus.INACTIVE if partner.status == PartnerStatus.ACTIVE else PartnerStatus.ACTIVE
    )
    partner.updated_at = datetime.utcnow()

    return APIResponse.ok(
        {
            "id": str(partner.id),
            "status": partner.status.value,
            "message": "협력사 상태를 변경했어요.",
        }
    )


# ----------------------------
# Invitations
# ----------------------------


class InvitationCreateRequest(BaseModel):
    phone: str
    name: str
    role: str


class InvitationAcceptRequest(BaseModel):
    password: str


@router.post("/invitations", response_model=APIResponse[dict], status_code=status.HTTP_201_CREATED)
async def create_invitation(
    payload: InvitationCreateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    token = secrets.token_urlsafe(24)
    invitation = Invitation(
        organization_id=org_id,
        phone=payload.phone,
        name=payload.name,
        role=payload.role,
        token=token,
        status=InvitationStatus.PENDING,
        created_by=current_user.id,
        expires_at=datetime.utcnow() + timedelta(days=7),
    )
    db.add(invitation)
    await db.flush()

    # 초대 알림톡 발송
    try:
        from app.services.sms import get_sms_service
        sms_service = get_sms_service()
        invite_url = f"/accept-invite/{token}"
        await sms_service.send_alimtalk(
            phone=payload.phone,
            template_code="USER_INVITE",
            variables={
                "name": payload.name or "고객",
                "invite_url": invite_url,
            },
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"초대 알림톡 발송 실패 (무시): {e}")
    # 알림톡 실패해도 초대 생성은 성공으로 처리

    return APIResponse.ok(
        {
            "id": str(invitation.id),
            "token": invitation.token,
            "invite_url": f"/accept-invite/{invitation.token}",
        }
    )


@router.get("/invitations", response_model=PaginatedResponse[dict])
async def list_invitations(
    db: DBSession,
    current_user: CurrentUser,
    status_filter: Optional[InvitationStatus] = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    org_id = _require_org_id(current_user)

    query = select(Invitation).where(Invitation.organization_id == org_id)
    if status_filter:
        query = query.where(Invitation.status == status_filter)

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0

    result = await db.execute(
        query.order_by(Invitation.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    invitations = result.scalars().all()

    return PaginatedResponse.create(
        items=[
            {
                "id": str(i.id),
                "phone": i.phone,
                "name": i.name,
                "role": i.role,
                "status": i.status.value,
                "created_at": i.created_at.isoformat(),
                "expires_at": i.expires_at.isoformat(),
            }
            for i in invitations
        ],
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post("/invitations/{invitation_id}/resend", response_model=APIResponse[dict])
async def resend_invitation(
    invitation_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    result = await db.execute(
        select(Invitation)
        .where(Invitation.id == invitation_id)
        .where(Invitation.organization_id == org_id)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise NotFoundException("invitation", invitation_id)

    invitation.token = secrets.token_urlsafe(24)
    invitation.expires_at = datetime.utcnow() + timedelta(days=7)
    invitation.status = InvitationStatus.PENDING

    # 재초대 알림톡 발송
    try:
        from app.services.sms import get_sms_service
        sms_service = get_sms_service()
        invite_url = f"/accept-invite/{invitation.token}"
        await sms_service.send_alimtalk(
            phone=invitation.phone,
            template_code="USER_INVITE",
            variables={
                "name": invitation.name or "고객",
                "invite_url": invite_url,
            },
        )
    except Exception as e:
        import logging
        logging.getLogger(__name__).warning(f"재초대 알림톡 발송 실패 (무시): {e}")
    # 알림톡 실패해도 재초대 처리는 성공으로 처리

    return APIResponse.ok(
        {
            "id": str(invitation.id),
            "token": invitation.token,
            "invite_url": f"/accept-invite/{invitation.token}",
        }
    )


@router.post("/invitations/{invitation_id}/revoke", response_model=APIResponse[dict])
async def revoke_invitation(
    invitation_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    result = await db.execute(
        select(Invitation)
        .where(Invitation.id == invitation_id)
        .where(Invitation.organization_id == org_id)
    )
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise NotFoundException("invitation", invitation_id)

    invitation.status = InvitationStatus.REVOKED

    return APIResponse.ok({"id": str(invitation.id), "status": "revoked"})


@router.get("/invitations/{token}", response_model=APIResponse[dict])
async def get_invitation_by_token(
    token: str,
    db: DBSession,
):
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise NotFoundException("invitation", token)

    if invitation.status == InvitationStatus.REVOKED or invitation.expires_at < datetime.utcnow():
        return APIResponse.fail("INVITATION_EXPIRED", "만료되었거나 취소된 초대예요.")

    org = (await db.execute(select(Organization).where(Organization.id == invitation.organization_id))).scalar_one_or_none()

    return APIResponse.ok(
        {
            "id": str(invitation.id),
            "email": "",
            "name": invitation.name,
            "role": invitation.role,
            "organization_name": org.name if org else "",
            "status": invitation.status.value,
            "expires_at": invitation.expires_at.isoformat(),
        }
    )


@router.post("/invitations/{token}/accept", response_model=APIResponse[dict])
async def accept_invitation(
    token: str,
    payload: InvitationAcceptRequest,
    db: DBSession,
):
    result = await db.execute(select(Invitation).where(Invitation.token == token))
    invitation = result.scalar_one_or_none()
    if not invitation:
        raise NotFoundException("invitation", token)

    if invitation.status in {InvitationStatus.REVOKED, InvitationStatus.ACCEPTED}:
        raise HTTPException(status_code=400, detail="이미 처리된 초대예요.")
    if invitation.expires_at < datetime.utcnow():
        raise HTTPException(status_code=400, detail="만료된 초대예요.")

    existing = await db.execute(
        select(User).where(
            User.phone == invitation.phone,
            User.organization_id == invitation.organization_id,
        )
    )
    user = existing.scalar_one_or_none()

    if not user:
        username = f"{invitation.phone.replace('-', '')}_{secrets.token_hex(2)}"
        try:
            role = UserRole(invitation.role)
        except ValueError:
            role = UserRole.SITE_MANAGER

        user = User(
            username=username,
            email=None,
            name=invitation.name,
            phone=invitation.phone,
            role=role,
            organization_id=invitation.organization_id,
            password_hash=get_password_hash(payload.password),
            is_active=True,
        )
        db.add(user)
        await db.flush()
    else:
        user.password_hash = get_password_hash(payload.password)
        user.is_active = True

    invitation.status = InvitationStatus.ACCEPTED
    invitation.accepted_at = datetime.utcnow()
    invitation.accepted_user_id = user.id

    return APIResponse.ok({"id": str(invitation.id), "status": invitation.status.value})


# ----------------------------
# My page
# ----------------------------


class ProfileUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None


class NotificationPrefsUpdateRequest(BaseModel):
    email_notifications: bool
    project_status_change: bool
    estimate_contract_alerts: bool
    daily_report_alerts: bool
    platform_announcements: bool


class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str


class AccountDeletionRequest(BaseModel):
    password: str
    reason: Optional[str] = None


@router.patch("/me/profile", response_model=APIResponse[dict])
async def update_my_profile(
    payload: ProfileUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(current_user, field, value)
    current_user.updated_at = datetime.utcnow()
    await _log_activity(db, current_user.id, "profile_update", "프로필 수정")

    return APIResponse.ok(
        {
            "id": str(current_user.id),
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
        }
    )


@router.get("/me/notification-prefs", response_model=APIResponse[dict])
async def get_my_notification_prefs(
    db: DBSession,
    current_user: CurrentUser,
):
    prefs = await _get_or_create_notification_prefs(db, current_user.id)
    return APIResponse.ok(
        {
            "user_id": str(current_user.id),
            "email_notifications": prefs.email_notifications,
            "project_status_change": prefs.project_status_change,
            "estimate_contract_alerts": prefs.estimate_contract_alerts,
            "daily_report_alerts": prefs.daily_report_alerts,
            "platform_announcements": prefs.platform_announcements,
        }
    )


@router.put("/me/notification-prefs", response_model=APIResponse[dict])
async def update_my_notification_prefs(
    payload: NotificationPrefsUpdateRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    prefs = await _get_or_create_notification_prefs(db, current_user.id)

    prefs.email_notifications = payload.email_notifications
    prefs.project_status_change = payload.project_status_change
    prefs.estimate_contract_alerts = payload.estimate_contract_alerts
    prefs.daily_report_alerts = payload.daily_report_alerts
    prefs.platform_announcements = payload.platform_announcements
    prefs.updated_at = datetime.utcnow()

    await _log_activity(db, current_user.id, "settings_change", "알림 설정 변경")

    return APIResponse.ok(
        {
            "user_id": str(current_user.id),
            "email_notifications": prefs.email_notifications,
            "project_status_change": prefs.project_status_change,
            "estimate_contract_alerts": prefs.estimate_contract_alerts,
            "daily_report_alerts": prefs.daily_report_alerts,
            "platform_announcements": prefs.platform_announcements,
        }
    )


@router.get("/me/activity-log", response_model=PaginatedResponse[dict])
async def get_my_activity_log(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
):
    query = select(ActivityLog).where(ActivityLog.user_id == current_user.id)
    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0

    result = await db.execute(
        query.order_by(ActivityLog.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )
    logs = result.scalars().all()

    return PaginatedResponse.create(
        items=[
            {
                "id": str(log.id),
                "user_id": str(log.user_id),
                "action": log.action,
                "description": log.description,
                "ip_address": log.ip_address,
                "device_info": log.device_info,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
        page=page,
        per_page=per_page,
        total=total,
    )


@router.post("/me/change-password", response_model=APIResponse[dict])
async def change_my_password(
    payload: ChangePasswordRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    if not verify_password(payload.current_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="현재 비밀번호가 올바르지 않아요")

    current_user.password_hash = get_password_hash(payload.new_password)
    current_user.updated_at = datetime.utcnow()

    await _log_activity(db, current_user.id, "password_change", "비밀번호 변경")

    return APIResponse.ok({"changed": True})


@router.post("/me/logout-all-devices", response_model=APIResponse[dict])
async def logout_all_devices(
    db: DBSession,
    current_user: CurrentUser,
):
    await _log_activity(db, current_user.id, "logout", "모든 기기 로그아웃")
    return APIResponse.ok({"logged_out": True})


@router.post("/me/account-deactivation", response_model=APIResponse[dict])
async def request_account_deactivation(
    db: DBSession,
    current_user: CurrentUser,
):
    current_user.is_active = False
    current_user.updated_at = datetime.utcnow()
    db.add(AccountRequest(user_id=current_user.id, type="deactivation", status="requested"))
    await _log_activity(db, current_user.id, "settings_change", "계정 비활성화")

    return APIResponse.ok({"requested": True})


@router.post("/me/account-deletion", response_model=APIResponse[dict])
async def request_account_deletion(
    payload: AccountDeletionRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    if not verify_password(payload.password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="비밀번호가 올바르지 않아요")

    current_user.is_active = False
    current_user.updated_at = datetime.utcnow()

    db.add(
        AccountRequest(
            user_id=current_user.id,
            type="deletion",
            reason=payload.reason,
            status="requested",
        )
    )
    await _log_activity(db, current_user.id, "settings_change", "회원탈퇴 요청")

    return APIResponse.ok({"requested": True})


# ----------------------------
# Labor domain
# ----------------------------


@router.get("/labor/overview", response_model=APIResponse[dict])
async def get_labor_overview(
    db: DBSession,
    current_user: CurrentUser,
):
    role = _role_value(current_user)

    worker_query = select(DailyWorker)
    if current_user.organization_id is not None:
        worker_query = worker_query.where(DailyWorker.organization_id == current_user.organization_id)

    workers = (await db.execute(worker_query.order_by(DailyWorker.created_at.desc()))).scalars().all()

    unsigned_contracts_query = select(func.count()).select_from(LaborContract).where(
        LaborContract.status.in_([LaborContractStatus.DRAFT, LaborContractStatus.SENT])
    )

    pending_paystubs_query = select(func.count()).select_from(Paystub).where(Paystub.status == PaystubStatus.SENT)

    if current_user.organization_id is not None:
        project_ids = [row[0] for row in (await db.execute(select(Project.id).where(Project.organization_id == current_user.organization_id))).all()]
        if project_ids:
            unsigned_contracts_query = unsigned_contracts_query.where(LaborContract.project_id.in_(project_ids))
        else:
            unsigned_contracts_query = unsigned_contracts_query.where(False)

    unsigned_contracts = (await db.execute(unsigned_contracts_query)).scalar() or 0
    pending_paystubs = (await db.execute(pending_paystubs_query)).scalar() or 0

    today = date.today()
    worker_rows = []
    for worker in workers:
        worker_rows.append(
            {
                "id": str(worker.id),
                "name": worker.name,
                "role": worker.job_type,
                "status": "active",
                "contract_status": "signed" if worker.registration_status == "registered" else "pending",
                "last_work_date": today.isoformat(),
            }
        )

    return APIResponse.ok(
        {
            "summary": {
                "active_workers": len(workers),
                "pending_paystubs": pending_paystubs,
                "unsigned_contracts": unsigned_contracts,
            },
            "workers": worker_rows,
        }
    )


@router.post("/labor/paystubs/batch-send", response_model=APIResponse[dict])
async def batch_send_paystubs(
    db: DBSession,
    current_user: CurrentUser,
):
    query = select(Paystub).where(Paystub.status == PaystubStatus.SENT)
    pending = (await db.execute(query)).scalars().all()

    for paystub in pending:
        paystub.status = PaystubStatus.CONFIRMED

    return APIResponse.ok(
        {
            "sent_count": len(pending),
            "message": f"{len(pending)}건의 지급명세서를 발송했어요.",
        }
    )


class DailyWorkerUpsertRequest(BaseModel):
    name: str
    job_type: str = "보통인부"
    job_type_code: str = ""
    team: str = ""
    hire_date: str
    visa_status: Optional[str] = None
    nationality_code: Optional[str] = None
    english_name: Optional[str] = None
    birth_date: str
    gender: int
    address: str = ""
    daily_rate: Decimal
    account_number: str = ""
    bank_name: str = ""
    phone: str = ""
    is_foreign: bool = False
    organization_id: Optional[str] = None


@router.get("/labor/daily-workers", response_model=APIResponse[list[dict]])
async def list_daily_workers(
    db: DBSession,
    current_user: CurrentUser,
):
    query = select(DailyWorker)
    if current_user.organization_id is not None:
        query = query.where(DailyWorker.organization_id == current_user.organization_id)
    query = query.order_by(DailyWorker.created_at.desc())

    workers = (await db.execute(query)).scalars().all()

    return APIResponse.ok([
        {
            "id": str(w.id),
            "name": w.name,
            "job_type": w.job_type,
            "job_type_code": w.job_type_code,
            "team": w.team,
            "hire_date": w.hire_date.isoformat(),
            "visa_status": w.visa_status,
            "nationality_code": w.nationality_code,
            "english_name": w.english_name,
            "birth_date": w.birth_date,
            "gender": w.gender,
            "address": w.address,
            "daily_rate": int(w.daily_rate),
            "account_number": w.account_number,
            "bank_name": w.bank_name,
            "phone": w.phone,
            "is_foreign": w.is_foreign,
            "organization_id": str(w.organization_id),
            "registration_status": w.registration_status,
            "invite_token": w.invite_token,
            "has_id_card": w.has_id_card,
            "has_safety_cert": w.has_safety_cert,
        }
        for w in workers
    ])


@router.post("/labor/daily-workers", response_model=APIResponse[dict])
async def create_daily_worker(
    payload: DailyWorkerUpsertRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    if current_user.organization_id is not None:
        org_id = current_user.organization_id
    else:
        if not payload.organization_id:
            raise HTTPException(status_code=400, detail="organization_id가 필요해요")
        try:
            org_id = _to_int(payload.organization_id)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="organization_id 형식이 올바르지 않아요") from exc

    worker = DailyWorker(
        organization_id=org_id,
        name=payload.name,
        job_type=payload.job_type,
        job_type_code=payload.job_type_code,
        team=payload.team,
        hire_date=date.fromisoformat(payload.hire_date),
        visa_status=payload.visa_status,
        nationality_code=payload.nationality_code,
        english_name=payload.english_name,
        birth_date=payload.birth_date,
        gender=payload.gender,
        address=payload.address,
        daily_rate=payload.daily_rate,
        account_number=payload.account_number,
        bank_name=payload.bank_name,
        phone=payload.phone,
        is_foreign=payload.is_foreign,
    )
    db.add(worker)
    await db.flush()

    return APIResponse.ok({"id": str(worker.id)})


@router.patch("/labor/daily-workers/{worker_id}", response_model=APIResponse[dict])
async def update_daily_worker(
    worker_id: int,
    payload: DailyWorkerUpsertRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    query = select(DailyWorker).where(DailyWorker.id == worker_id)
    if current_user.organization_id is not None:
        query = query.where(DailyWorker.organization_id == current_user.organization_id)

    worker = (await db.execute(query)).scalar_one_or_none()
    if not worker:
        raise NotFoundException("daily_worker", worker_id)

    worker.name = payload.name
    worker.job_type = payload.job_type
    worker.job_type_code = payload.job_type_code
    worker.team = payload.team
    worker.hire_date = date.fromisoformat(payload.hire_date)
    worker.visa_status = payload.visa_status
    worker.nationality_code = payload.nationality_code
    worker.english_name = payload.english_name
    worker.birth_date = payload.birth_date
    worker.gender = payload.gender
    worker.address = payload.address
    worker.daily_rate = payload.daily_rate
    worker.account_number = payload.account_number
    worker.bank_name = payload.bank_name
    worker.phone = payload.phone
    worker.is_foreign = payload.is_foreign
    worker.updated_at = datetime.utcnow()

    return APIResponse.ok({"id": str(worker.id)})


@router.delete("/labor/daily-workers/{worker_id}", response_model=APIResponse[dict])
async def delete_daily_worker(
    worker_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    query = select(DailyWorker).where(DailyWorker.id == worker_id)
    if current_user.organization_id is not None:
        query = query.where(DailyWorker.organization_id == current_user.organization_id)

    worker = (await db.execute(query)).scalar_one_or_none()
    if not worker:
        raise NotFoundException("daily_worker", worker_id)

    await db.delete(worker)
    return APIResponse.ok({"id": str(worker.id)})


class WorkRecordInput(BaseModel):
    worker_id: str
    project_id: str
    work_date: str
    man_days: Decimal


class WorkRecordBatchRequest(BaseModel):
    records: list[WorkRecordInput]


@router.get("/labor/work-records", response_model=APIResponse[list[dict]])
async def get_work_records(
    db: DBSession,
    current_user: CurrentUser,
    project_id: str,
    year: int,
    month: int,
):
    project_int = _to_int(project_id)
    await _get_project_for_user(db, project_int, current_user)

    month_start = date(year, month, 1)
    month_end = date(year + (month // 12), (month % 12) + 1, 1)

    result = await db.execute(
        select(WorkRecord)
        .where(WorkRecord.project_id == project_int)
        .where(WorkRecord.work_date >= month_start)
        .where(WorkRecord.work_date < month_end)
    )
    rows = result.scalars().all()

    return APIResponse.ok([
        {
            "id": str(r.id),
            "worker_id": str(r.worker_id),
            "project_id": str(r.project_id),
            "work_date": r.work_date.isoformat(),
            "man_days": float(r.man_days),
        }
        for r in rows
    ])


@router.post("/labor/work-records/batch", response_model=APIResponse[dict])
async def upsert_work_records(
    payload: WorkRecordBatchRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    updated = 0

    for record in payload.records:
        worker_id = _to_int(record.worker_id)
        project_id = _to_int(record.project_id)

        await _get_project_for_user(db, project_id, current_user)

        work_date = date.fromisoformat(record.work_date)
        existing = await db.execute(
            select(WorkRecord)
            .where(WorkRecord.worker_id == worker_id)
            .where(WorkRecord.project_id == project_id)
            .where(WorkRecord.work_date == work_date)
        )
        row = existing.scalar_one_or_none()

        if row:
            row.man_days = record.man_days
            row.updated_at = datetime.utcnow()
        else:
            db.add(
                WorkRecord(
                    worker_id=worker_id,
                    project_id=project_id,
                    work_date=work_date,
                    man_days=record.man_days,
                )
            )
        updated += 1

    return APIResponse.ok({"updated_count": updated})


@router.delete("/labor/work-records/{work_record_id}", response_model=APIResponse[dict])
async def delete_work_record(
    work_record_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    result = await db.execute(select(WorkRecord).where(WorkRecord.id == work_record_id))
    row = result.scalar_one_or_none()
    if not row:
        raise NotFoundException("work_record", work_record_id)

    await _get_project_for_user(db, row.project_id, current_user)
    await db.delete(row)

    return APIResponse.ok({"id": str(work_record_id)})


def _build_work_days(records: list[WorkRecord]) -> dict[int, float]:
    out: dict[int, float] = {}
    for row in records:
        out[row.work_date.day] = float(row.man_days)
    return out


async def _build_site_report(
    db: AsyncSession,
    organization_id: int,
    project_id: int,
    year: int,
    month: int,
) -> dict:
    project = (await db.execute(select(Project).where(Project.id == project_id))).scalar_one_or_none()
    if not project:
        raise NotFoundException("project", project_id)

    month_start = date(year, month, 1)
    month_end = date(year + (month // 12), (month % 12) + 1, 1)

    workers = (await db.execute(
        select(DailyWorker)
        .where(DailyWorker.organization_id == organization_id)
        .order_by(DailyWorker.name.asc())
    )).scalars().all()

    work_rows = (await db.execute(
        select(WorkRecord)
        .where(WorkRecord.project_id == project_id)
        .where(WorkRecord.work_date >= month_start)
        .where(WorkRecord.work_date < month_end)
    )).scalars().all()

    by_worker: dict[int, list[WorkRecord]] = {}
    for row in work_rows:
        by_worker.setdefault(row.worker_id, []).append(row)

    rates = await _get_or_create_insurance_rate(db, organization_id, year)

    entries = []
    totals = {
        "total_labor_cost": 0,
        "total_income_tax": 0,
        "total_resident_tax": 0,
        "total_health_insurance": 0,
        "total_longterm_care": 0,
        "total_national_pension": 0,
        "total_employment_insurance": 0,
        "total_deductions": 0,
        "total_net_pay": 0,
    }

    for worker in workers:
        worker_records = by_worker.get(worker.id, [])
        work_days = _build_work_days(worker_records)
        total_man_days = sum(work_days.values())
        total_days = len([v for v in work_days.values() if v > 0])
        labor_cost = int((Decimal(worker.daily_rate) * Decimal(str(total_man_days))))

        deductions = _calc_worker_deductions(labor_cost, rates)

        entry = {
            "worker_id": str(worker.id),
            "worker_name": worker.name,
            "job_type": worker.job_type,
            "team": worker.team,
            "ssn_masked": f"{worker.birth_date}-{worker.gender}******",
            "daily_rate": int(worker.daily_rate),
            "work_days": work_days,
            "total_days": total_days,
            "total_man_days": float(total_man_days),
            "total_labor_cost": labor_cost,
            **deductions,
        }
        entries.append(entry)

        totals["total_labor_cost"] += labor_cost
        totals["total_income_tax"] += deductions["income_tax"]
        totals["total_resident_tax"] += deductions["resident_tax"]
        totals["total_health_insurance"] += deductions["health_insurance"]
        totals["total_longterm_care"] += deductions["longterm_care"]
        totals["total_national_pension"] += deductions["national_pension"]
        totals["total_employment_insurance"] += deductions["employment_insurance"]
        totals["total_deductions"] += deductions["total_deductions"]
        totals["total_net_pay"] += deductions["net_pay"]

    org = (await db.execute(select(Organization).where(Organization.id == organization_id))).scalar_one_or_none()

    return {
        "project_id": str(project.id),
        "project_name": project.name,
        "year": year,
        "month": month,
        "organization_name": org.name if org else "",
        "entries": entries,
        "totals": totals,
    }


@router.get("/labor/reports/site", response_model=APIResponse[dict])
async def generate_site_report(
    db: DBSession,
    current_user: CurrentUser,
    project_id: str,
    year: int,
    month: int,
):
    org_id = _require_org_id(current_user)
    project_int = _to_int(project_id)
    await _get_project_for_user(db, project_int, current_user)

    report = await _build_site_report(db, org_id, project_int, year, month)
    return APIResponse.ok(report)


@router.get("/labor/reports/consolidated", response_model=APIResponse[dict])
async def generate_consolidated_report(
    db: DBSession,
    current_user: CurrentUser,
    year: int,
    month: int,
):
    org_id = _require_org_id(current_user)

    project_rows = (await db.execute(select(Project).where(Project.organization_id == org_id))).scalars().all()
    project_ids = [p.id for p in project_rows]

    entries: list[dict] = []
    totals = {
        "total_labor_cost": 0,
        "total_income_tax": 0,
        "total_resident_tax": 0,
        "total_health_insurance": 0,
        "total_longterm_care": 0,
        "total_national_pension": 0,
        "total_employment_insurance": 0,
        "total_deductions": 0,
        "total_net_pay": 0,
    }

    for project in project_rows:
        site_report = await _build_site_report(db, org_id, project.id, year, month)
        entries.extend(site_report["entries"])
        for key in totals:
            totals[key] += site_report["totals"][key]

    org = (await db.execute(select(Organization).where(Organization.id == org_id))).scalar_one_or_none()

    return APIResponse.ok(
        {
            "year": year,
            "month": month,
            "organization_name": org.name if org else "",
            "projects": [{"id": str(p.id), "name": p.name} for p in project_rows],
            "entries": entries,
            "totals": totals,
        }
    )


class InsuranceRateUpsertRequest(BaseModel):
    effective_year: int
    income_deduction: Decimal
    simplified_tax_rate: Decimal
    local_tax_rate: Decimal
    employment_insurance_rate: Decimal
    health_insurance_rate: Decimal
    longterm_care_rate: Decimal
    national_pension_rate: Decimal
    pension_upper_limit: Decimal
    pension_lower_limit: Decimal
    health_premium_upper: Decimal
    health_premium_lower: Decimal


@router.get("/labor/insurance-rates", response_model=APIResponse[list[dict]])
async def get_insurance_rates(
    db: DBSession,
    current_user: CurrentUser,
    year: Optional[int] = None,
):
    org_id = _require_org_id(current_user)

    query = select(InsuranceRate).where(InsuranceRate.organization_id == org_id)
    if year:
        query = query.where(InsuranceRate.effective_year == year)

    query = query.order_by(InsuranceRate.effective_year.desc())
    rows = (await db.execute(query)).scalars().all()

    return APIResponse.ok([
        {
            "id": str(r.id),
            "effective_year": r.effective_year,
            "income_deduction": float(r.income_deduction),
            "simplified_tax_rate": float(r.simplified_tax_rate),
            "local_tax_rate": float(r.local_tax_rate),
            "employment_insurance_rate": float(r.employment_insurance_rate),
            "health_insurance_rate": float(r.health_insurance_rate),
            "longterm_care_rate": float(r.longterm_care_rate),
            "national_pension_rate": float(r.national_pension_rate),
            "pension_upper_limit": float(r.pension_upper_limit),
            "pension_lower_limit": float(r.pension_lower_limit),
            "health_premium_upper": float(r.health_premium_upper),
            "health_premium_lower": float(r.health_premium_lower),
        }
        for r in rows
    ])


@router.post("/labor/insurance-rates", response_model=APIResponse[dict])
async def create_insurance_rate(
    payload: InsuranceRateUpsertRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    rate = InsuranceRate(
        organization_id=org_id,
        effective_year=payload.effective_year,
        income_deduction=payload.income_deduction,
        simplified_tax_rate=payload.simplified_tax_rate,
        local_tax_rate=payload.local_tax_rate,
        employment_insurance_rate=payload.employment_insurance_rate,
        health_insurance_rate=payload.health_insurance_rate,
        longterm_care_rate=payload.longterm_care_rate,
        national_pension_rate=payload.national_pension_rate,
        pension_upper_limit=payload.pension_upper_limit,
        pension_lower_limit=payload.pension_lower_limit,
        health_premium_upper=payload.health_premium_upper,
        health_premium_lower=payload.health_premium_lower,
    )
    db.add(rate)
    await db.flush()

    return APIResponse.ok({"id": str(rate.id)})


@router.patch("/labor/insurance-rates/{rate_id}", response_model=APIResponse[dict])
async def update_insurance_rate(
    rate_id: int,
    payload: InsuranceRateUpsertRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    rate = (await db.execute(
        select(InsuranceRate)
        .where(InsuranceRate.id == rate_id)
        .where(InsuranceRate.organization_id == org_id)
    )).scalar_one_or_none()
    if not rate:
        raise NotFoundException("insurance_rate", rate_id)

    rate.effective_year = payload.effective_year
    rate.income_deduction = payload.income_deduction
    rate.simplified_tax_rate = payload.simplified_tax_rate
    rate.local_tax_rate = payload.local_tax_rate
    rate.employment_insurance_rate = payload.employment_insurance_rate
    rate.health_insurance_rate = payload.health_insurance_rate
    rate.longterm_care_rate = payload.longterm_care_rate
    rate.national_pension_rate = payload.national_pension_rate
    rate.pension_upper_limit = payload.pension_upper_limit
    rate.pension_lower_limit = payload.pension_lower_limit
    rate.health_premium_upper = payload.health_premium_upper
    rate.health_premium_lower = payload.health_premium_lower
    rate.updated_at = datetime.utcnow()

    return APIResponse.ok({"id": str(rate.id)})


# ----------------------------
# Worker app and notifications
# ----------------------------


class WorkerAccessRequestBody(BaseModel):
    phone: str


class WorkerVerifyRequestBody(BaseModel):
    request_id: str
    code: str


class WorkerInviteVerifyRequestBody(BaseModel):
    invite_token: str


@router.post("/workers/access", response_model=APIResponse[dict])
async def request_worker_access(
    payload: WorkerAccessRequestBody,
    db: DBSession,
):
    code = f"{random.randint(0, 999999):06d}"
    record = WorkerAccessRequest(
        phone=payload.phone,
        code=code,
        expires_at=datetime.utcnow() + timedelta(minutes=10),
    )
    db.add(record)
    await db.flush()

    return APIResponse.ok({"request_id": str(record.id)})


@router.post("/workers/verify", response_model=APIResponse[dict])
async def verify_worker_access(
    payload: WorkerVerifyRequestBody,
    db: DBSession,
):
    request_id = _to_int(payload.request_id)
    record = (await db.execute(select(WorkerAccessRequest).where(WorkerAccessRequest.id == request_id))).scalar_one_or_none()
    if not record:
        raise NotFoundException("worker_access_request", payload.request_id)

    if record.expires_at < datetime.utcnow() or record.code != payload.code:
        raise HTTPException(status_code=400, detail="인증번호를 다시 확인해 주세요")

    record.verified = True

    user_result = await db.execute(select(User).where(User.phone == record.phone, User.role == UserRole.WORKER))
    worker_user = user_result.scalar_one_or_none()

    if not worker_user:
        username = f"worker_{record.phone.replace('-', '')}"
        worker_user = User(
            username=username,
            name="현장근로자",
            phone=record.phone,
            email=None,
            role=UserRole.WORKER,
            organization_id=None,
            password_hash=get_password_hash(record.phone.replace("-", "")[-4:] or "1234"),
            is_active=True,
        )
        db.add(worker_user)
        await db.flush()

    record.worker_id = worker_user.id

    return APIResponse.ok({"worker_id": str(worker_user.id)})


@router.post("/workers/invite/verify", response_model=APIResponse[dict])
async def verify_worker_invite(
    payload: WorkerInviteVerifyRequestBody,
    db: DBSession,
):
    username = f"worker_invite_{payload.invite_token[-8:]}"
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    if not user:
        user = User(
            username=username,
            name="초대 근로자",
            phone=None,
            email=None,
            role=UserRole.WORKER,
            organization_id=None,
            password_hash=get_password_hash("123456"),
            is_active=True,
        )
        db.add(user)
        await db.flush()

    return APIResponse.ok({"worker_id": str(user.id)})


class WorkerSignRequest(BaseModel):
    signature_data: str


@router.get("/workers/contracts/{contract_id}", response_model=APIResponse[dict])
async def get_worker_contract(
    contract_id: int,
    db: DBSession,
):
    labor_contract = await _ensure_labor_contract_stub(db, contract_id)

    project = (await db.execute(select(Project).where(Project.id == labor_contract.project_id))).scalar_one_or_none()

    content = (
        f"본 계약은 {project.name if project else '현장'}에서 {labor_contract.work_date.isoformat()}에 수행되는 "
        f"{labor_contract.work_type or '일용 근로'} 업무에 대한 계약입니다."
    )

    status_value = "signed" if labor_contract.status in {LaborContractStatus.SIGNED, LaborContractStatus.PAID} else "pending"

    return APIResponse.ok(
        {
            "id": str(labor_contract.id),
            "project_name": project.name if project else "",
            "work_date": labor_contract.work_date.isoformat(),
            "role": labor_contract.work_type or "근로자",
            "daily_rate": int(labor_contract.daily_rate),
            "status": status_value,
            "content": content,
        }
    )


@router.post("/workers/contracts/{contract_id}/sign", response_model=APIResponse[dict])
async def sign_worker_contract(
    contract_id: int,
    payload: WorkerSignRequest,
    db: DBSession,
):
    labor_contract = await _ensure_labor_contract_stub(db, contract_id)

    labor_contract.status = LaborContractStatus.SIGNED
    labor_contract.signed_at = datetime.utcnow()
    labor_contract.worker_signature_path = f"signatures/workers/{contract_id}.png"

    return APIResponse.ok({"id": str(labor_contract.id), "status": "signed", "signed_at": labor_contract.signed_at.isoformat()})


@router.get("/workers/{worker_id}/paystubs", response_model=APIResponse[list[dict]])
async def get_worker_paystubs(
    worker_id: str,
    db: DBSession,
):
    worker_user_id = await _resolve_worker_user_id(db, worker_id)
    await _seed_paystub_if_empty(db, worker_user_id)

    rows = (await db.execute(
        select(Paystub)
        .where(Paystub.worker_id == worker_user_id)
        .order_by(Paystub.created_at.desc())
    )).scalars().all()

    return APIResponse.ok([
        {
            "id": str(r.id),
            "month": r.month,
            "amount": r.net_amount,
            "status": r.status.value,
            "date": r.date,
        }
        for r in rows
    ])


@router.get("/workers/{worker_id}/paystubs/{paystub_id}", response_model=APIResponse[dict])
async def get_worker_paystub(
    worker_id: str,
    paystub_id: int,
    db: DBSession,
):
    worker_user_id = await _resolve_worker_user_id(db, worker_id)

    paystub = (await db.execute(
        select(Paystub)
        .where(Paystub.id == paystub_id)
        .where(Paystub.worker_id == worker_user_id)
    )).scalar_one_or_none()
    if not paystub:
        raise NotFoundException("paystub", paystub_id)

    items = (await db.execute(
        select(PaystubItem).where(PaystubItem.paystub_id == paystub.id)
    )).scalars().all()

    return APIResponse.ok(
        {
            "id": str(paystub.id),
            "title": paystub.title,
            "total_amount": paystub.total_amount,
            "deductions": paystub.deductions,
            "net_amount": paystub.net_amount,
            "items": [{"label": item.label, "amount": item.amount} for item in items],
            "status": paystub.status.value,
        }
    )


@router.post("/workers/{worker_id}/paystubs/{paystub_id}/ack", response_model=APIResponse[dict])
async def ack_worker_paystub(
    worker_id: str,
    paystub_id: int,
    db: DBSession,
):
    worker_user_id = await _resolve_worker_user_id(db, worker_id)

    paystub = (await db.execute(
        select(Paystub)
        .where(Paystub.id == paystub_id)
        .where(Paystub.worker_id == worker_user_id)
    )).scalar_one_or_none()
    if not paystub:
        raise NotFoundException("paystub", paystub_id)

    paystub.status = PaystubStatus.CONFIRMED
    return APIResponse.ok({"received_at": datetime.utcnow().isoformat()})


@router.get("/workers/{worker_id}/profile", response_model=APIResponse[dict])
async def get_worker_profile(
    worker_id: str,
    db: DBSession,
):
    worker_user_id = await _resolve_worker_user_id(db, worker_id)

    user = (await db.execute(select(User).where(User.id == worker_user_id))).scalar_one_or_none()
    if not user:
        raise NotFoundException("user", worker_id)

    docs = await _seed_worker_documents(db, worker_user_id)

    return APIResponse.ok(
        {
            "id": str(user.id),
            "name": user.name,
            "role": "근로자",
            "documents": [
                {
                    "id": d.document_id,
                    "name": d.name,
                    "status": "submitted" if d.status == "submitted" else "pending",
                }
                for d in docs
            ],
        }
    )


@router.post("/workers/{worker_id}/documents/{doc_id}", response_model=APIResponse[dict])
async def upload_worker_document(
    worker_id: str,
    doc_id: str,
    db: DBSession,
    file: UploadFile = File(...),
):
    worker_user_id = await _resolve_worker_user_id(db, worker_id)

    docs = await _seed_worker_documents(db, worker_user_id)
    target = next((d for d in docs if d.document_id == doc_id), None)
    if not target:
        target = WorkerDocument(
            worker_id=worker_user_id,
            document_id=doc_id,
            name=doc_id,
            status="pending",
        )
        db.add(target)
        await db.flush()

    content = await file.read()
    await file.seek(0)
    ext = (file.filename or "file").split(".")[-1]
    storage_path = await storage_service.save_bytes(
        data=content,
        category="contracts",
        subfolder=f"workers/{worker_user_id}",
        filename=f"{doc_id}_{int(datetime.utcnow().timestamp())}.{ext}",
    )

    target.storage_path = storage_path
    target.status = "submitted"
    target.uploaded_at = datetime.utcnow()

    return APIResponse.ok(
        {
            "id": str(target.id),
            "document_id": target.document_id,
            "storage_path": target.storage_path,
            "status": "submitted",
            "uploaded_at": target.uploaded_at.isoformat() if target.uploaded_at else datetime.utcnow().isoformat(),
        }
    )


@router.get("/notifications", response_model=APIResponse[list[dict]])
async def get_notifications(
    db: DBSession,
):
    rows = (await db.execute(
        select(AppNotification)
        .order_by(AppNotification.created_at.desc())
        .limit(20)
    )).scalars().all()

    if not rows:
        now = datetime.utcnow()
        defaults = [
            AppNotification(type=NotificationType.NOTICE, title="시스템 안내", message="새로운 공지사항이 있습니다.", time=now.strftime("%H:%M"), read=False),
            AppNotification(type=NotificationType.CONTRACT, title="계약 알림", message="근로계약서 서명 요청이 도착했습니다.", time=(now - timedelta(hours=2)).strftime("%H:%M"), read=False),
        ]
        for item in defaults:
            db.add(item)
        await db.flush()
        rows = defaults

    return APIResponse.ok(
        [
            {
                "id": str(n.id),
                "type": n.type.value,
                "title": n.title,
                "message": n.message,
                "time": n.time,
                "read": n.read,
            }
            for n in rows
        ]
    )


@router.post("/notifications/{notification_id}/read", response_model=APIResponse[dict])
async def mark_notification_read(
    notification_id: int,
    db: DBSession,
):
    notification = (await db.execute(select(AppNotification).where(AppNotification.id == notification_id))).scalar_one_or_none()
    if not notification:
        raise NotFoundException("notification", notification_id)

    notification.read = True
    return APIResponse.ok({"id": str(notification.id), "read": notification.read})


# ----------------------------
# Billing / SA
# ----------------------------


class PaymentMethodRequest(BaseModel):
    card_number: str
    expiry: str


class CustomTrialRequest(BaseModel):
    end_date: str
    reason: Optional[str] = None


@router.get("/billing/overview", response_model=APIResponse[dict])
async def get_billing_overview(
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    subscription = (await db.execute(select(Subscription).where(Subscription.organization_id == org_id))).scalar_one_or_none()
    if not subscription:
        return APIResponse.ok(
            {
                "plan": "",
                "subscription_start_date": None,
                "subscription_end_date": "",
                "days_remaining": 0,
                "is_custom_trial": True,
                "billing_amount": 0,
                "seats_used": 0,
                "seats_total": 0,
                "history": [],
            }
        )

    payments = (await db.execute(
        select(Payment)
        .where(Payment.organization_id == org_id)
        .order_by(Payment.created_at.desc())
        .limit(20)
    )).scalars().all()

    plan_label = {
        SubscriptionPlan.STARTER: "STARTER",
        SubscriptionPlan.STANDARD: "STANDARD",
        SubscriptionPlan.PREMIUM: "PREMIUM",
    }.get(subscription.plan, subscription.plan.value)

    now = datetime.utcnow()
    days_remaining = max(0, (subscription.expires_at.date() - now.date()).days)

    return APIResponse.ok(
        {
            "plan": plan_label,
            "subscription_start_date": subscription.started_at.isoformat(),
            "subscription_end_date": subscription.expires_at.isoformat(),
            "days_remaining": days_remaining,
            "is_custom_trial": subscription.plan == SubscriptionPlan.STARTER and not subscription.billing_key,
            "billing_amount": int(_safe_decimal_to_int(next((p.amount for p in payments if p.status == PaymentStatus.PAID), 0))),
            "seats_used": 0,
            "seats_total": 999,
            "scheduled_plan": None,
            "scheduled_plan_date": None,
            "history": [
                {
                    "id": str(p.id),
                    "date": p.created_at.strftime("%Y-%m-%d"),
                    "description": f"{plan_label} 구독 결제",
                    "amount": int(_safe_decimal_to_int(p.amount)),
                    "status": "paid" if p.status == PaymentStatus.PAID else "failed",
                }
                for p in payments
            ],
        }
    )


@router.post("/billing/payment-method", response_model=APIResponse[dict])
async def change_payment_method(
    payload: PaymentMethodRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    org_id = _require_org_id(current_user)

    subscription = (await db.execute(select(Subscription).where(Subscription.organization_id == org_id))).scalar_one_or_none()
    if not subscription:
        raise HTTPException(status_code=404, detail="구독 정보를 찾을 수 없어요")

    subscription.billing_key = f"manual_{payload.card_number[-4:]}_{payload.expiry}"
    subscription.updated_at = datetime.utcnow()

    return APIResponse.ok(
        {
            "billing_key": subscription.billing_key,
            "payment_method": {
                "brand": "card",
                "last4": payload.card_number[-4:],
                "expires": payload.expiry,
            },
            "message": "결제수단을 변경했어요.",
        }
    )


@router.get("/admin/sa-dashboard", response_model=APIResponse[dict])
async def get_sa_dashboard(
    db: DBSession,
    current_user: CurrentUser,
):
    if _role_value(current_user) != "super_admin":
        raise HTTPException(status_code=403, detail="슈퍼관리자만 접근 가능해요")

    total_tenants = (await db.execute(select(func.count()).select_from(Organization))).scalar() or 0
    total_users = (await db.execute(select(func.count()).select_from(User))).scalar() or 0

    monthly_revenue = (await db.execute(
        select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.status == PaymentStatus.PAID)
    )).scalar() or Decimal("0")

    recent_orgs = (await db.execute(
        select(Organization).order_by(Organization.created_at.desc()).limit(5)
    )).scalars().all()

    plan_counts_raw = (await db.execute(
        select(Subscription.plan, func.count())
        .group_by(Subscription.plan)
    )).all()
    plan_distribution = []
    for plan, count in plan_counts_raw:
        plan_distribution.append({
            "plan": plan.value,
            "count": count,
            "percentage": round((count / total_tenants * 100), 1) if total_tenants else 0,
        })

    # UI currently expects nested dashboard payload.
    stats_payload = {
        "total_tenants": total_tenants,
        "total_users": total_users,
        "monthly_revenue": int(monthly_revenue),
        "new_signups": len(recent_orgs),
        "tenants_growth": 0,
        "users_growth": 0,
        "revenue_growth": 0,
        "signups_growth": 0,
    }

    # Build last 6 months of revenue history
    now_dt = datetime.utcnow()
    monthly_revenue_list = []
    for i in range(5, -1, -1):
        m_date = now_dt - timedelta(days=30 * i)
        monthly_revenue_list.append(
            {
                "month": m_date.strftime("%Y-%m"),
                "label": m_date.strftime("%m월"),
                "amount": int(monthly_revenue) if i == 0 else 0,
            }
        )

    return APIResponse.ok(
        {
            # Flattened keys for API client compatibility
            "total_tenants": stats_payload["total_tenants"],
            "active_tenants": stats_payload["total_tenants"],
            "total_revenue": stats_payload["monthly_revenue"],
            "recent_signups": [
                {
                    "id": str(org.id),
                    "company_name": org.name,
                    "plan": "starter",
                    "created_at": org.created_at.isoformat(),
                }
                for org in recent_orgs
            ],
            "subscription_breakdown": {p["plan"]: p["count"] for p in plan_distribution},
            # Nested keys for current dashboard page compatibility
            "stats": stats_payload,
            "recent_activity": [
                {
                    "id": str(org.id),
                    "type": "tenant",
                    "title": "신규 고객사 등록",
                    "description": org.name,
                    "timestamp": org.created_at.isoformat(),
                }
                for org in recent_orgs
            ],
            "monthly_revenue": monthly_revenue_list,
            "plan_distribution": plan_distribution,
        }
    )


@router.get("/admin/subscriptions/expiring", response_model=APIResponse[dict])
async def get_expiring_subscriptions(
    db: DBSession,
    current_user: CurrentUser,
    days: int = 30,
):
    """만료 임박 구독 목록 (super admin 전용)."""
    if _role_value(current_user) != "super_admin":
        raise HTTPException(status_code=403, detail="슈퍼관리자만 접근 가능해요")

    cutoff = datetime.utcnow() + timedelta(days=days)
    expiring_subs = (
        await db.execute(
            select(Subscription, Organization)
            .join(Organization, Subscription.organization_id == Organization.id)
            .where(
                Subscription.expires_at <= cutoff,
                Subscription.status == SubscriptionStatus.ACTIVE,
            )
            .order_by(Subscription.expires_at.asc())
        )
    ).all()

    items = []
    for sub, org in expiring_subs:
        days_remaining = max(0, (sub.expires_at.date() - datetime.utcnow().date()).days)
        plan_map = {
            SubscriptionPlan.STARTER: "스타터",
            SubscriptionPlan.STANDARD: "스탠다드",
            SubscriptionPlan.PREMIUM: "프리미엄",
        }
        items.append(
            {
                "id": str(sub.id),
                "company_name": org.name,
                "plan": plan_map.get(sub.plan, sub.plan.value),
                "expires_at": sub.expires_at.strftime("%Y-%m-%d"),
                "days_remaining": days_remaining,
            }
        )

    return APIResponse.ok({"items": items, "total": len(items)})


@router.get("/admin/tenants", response_model=PaginatedResponse[dict])
async def list_tenants(
    db: DBSession,
    current_user: CurrentUser,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    search: Optional[str] = None,
):
    if _role_value(current_user) != "super_admin":
        raise HTTPException(status_code=403, detail="슈퍼관리자만 접근 가능해요")

    query = select(Organization)
    if search:
        query = query.where(Organization.name.ilike(f"%{search}%"))

    total = (await db.execute(select(func.count()).select_from(query.subquery()))).scalar() or 0
    orgs = (await db.execute(
        query.order_by(Organization.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
    )).scalars().all()

    items = []
    for org in orgs:
        users_count = (await db.execute(select(func.count()).select_from(User).where(User.organization_id == org.id))).scalar() or 0
        projects_count = (await db.execute(select(func.count()).select_from(Project).where(Project.organization_id == org.id))).scalar() or 0
        subscription = (await db.execute(select(Subscription).where(Subscription.organization_id == org.id))).scalar_one_or_none()

        plan = "trial"
        if subscription:
            if subscription.plan == SubscriptionPlan.STARTER:
                plan = "basic"
            elif subscription.plan == SubscriptionPlan.STANDARD:
                plan = "pro"
            elif subscription.plan == SubscriptionPlan.PREMIUM:
                plan = "pro"

        items.append(
            {
                "id": str(org.id),
                "name": org.name,
                "plan": plan,
                "users_count": users_count,
                "projects_count": projects_count,
                "created_at": org.created_at.isoformat(),
                "billing_amount": 0,
            }
        )

    return PaginatedResponse.create(items=items, page=page, per_page=per_page, total=total)


@router.get("/admin/tenants/{tenant_id}", response_model=APIResponse[dict])
async def get_tenant(
    tenant_id: int,
    db: DBSession,
    current_user: CurrentUser,
):
    if _role_value(current_user) != "super_admin":
        raise HTTPException(status_code=403, detail="슈퍼관리자만 접근 가능해요")

    org = (await db.execute(select(Organization).where(Organization.id == tenant_id))).scalar_one_or_none()
    if not org:
        raise NotFoundException("tenant", tenant_id)

    users_count = (await db.execute(select(func.count()).select_from(User).where(User.organization_id == org.id))).scalar() or 0
    projects_count = (await db.execute(select(func.count()).select_from(Project).where(Project.organization_id == org.id))).scalar() or 0

    subscription = (await db.execute(select(Subscription).where(Subscription.organization_id == org.id))).scalar_one_or_none()

    now = datetime.utcnow()
    if subscription:
        plan = "basic" if subscription.plan == SubscriptionPlan.STARTER else "pro"
        start_date = subscription.started_at.isoformat()
        end_date = subscription.expires_at.isoformat()
        billing_amount = int(
            _safe_decimal_to_int(
                (await db.execute(
                    select(func.coalesce(func.sum(Payment.amount), 0)).where(Payment.organization_id == org.id)
                )).scalar() or 0
            )
        )
    else:
        plan = "trial"
        start_date = org.created_at.isoformat()
        end_date = (org.created_at + timedelta(days=30)).isoformat()
        billing_amount = 0

    return APIResponse.ok(
        {
            "id": str(org.id),
            "name": org.name,
            "plan": plan,
            "users_count": users_count,
            "projects_count": projects_count,
            "created_at": org.created_at.isoformat(),
            "business_number": org.business_number,
            "representative": org.rep_name,
            "rep_phone": org.rep_phone,
            "rep_email": org.rep_email,
            "contact_name": org.contact_name,
            "contact_phone": org.contact_phone,
            "contact_position": org.contact_position,
            "subscription_start_date": start_date,
            "subscription_end_date": end_date,
            "is_custom_trial": plan == "trial",
            "billing_amount": billing_amount,
            "is_active": org.is_active,
        }
    )


@router.post("/admin/tenants/{tenant_id}/custom-trial", response_model=APIResponse[dict])
async def set_custom_trial_period(
    tenant_id: int,
    payload: CustomTrialRequest,
    db: DBSession,
    current_user: CurrentUser,
):
    if _role_value(current_user) != "super_admin":
        raise HTTPException(status_code=403, detail="슈퍼관리자만 접근 가능해요")

    org = (await db.execute(select(Organization).where(Organization.id == tenant_id))).scalar_one_or_none()
    if not org:
        raise NotFoundException("tenant", tenant_id)

    end_date = datetime.fromisoformat(payload.end_date.replace("Z", "+00:00")).replace(tzinfo=None)

    sub = (await db.execute(select(Subscription).where(Subscription.organization_id == org.id))).scalar_one_or_none()
    if not sub:
        sub = Subscription(
            organization_id=org.id,
            plan=SubscriptionPlan.STARTER,
            status=SubscriptionStatus.ACTIVE,
            started_at=datetime.utcnow(),
            expires_at=end_date,
        )
        db.add(sub)
        await db.flush()
    else:
        sub.expires_at = end_date
        sub.updated_at = datetime.utcnow()

    return APIResponse.ok(
        {
            "id": str(org.id),
            "subscription_end_date": end_date.isoformat(),
            "is_custom_trial": True,
        }
    )
