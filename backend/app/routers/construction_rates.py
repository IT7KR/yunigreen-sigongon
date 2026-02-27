"""건설 원가 요율 관리 라우터 (SA 전용)."""
from datetime import date
from decimal import Decimal
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.database import get_session
from app.core.auth import get_current_user
from app.models.user import User, UserRole
from app.models.cost_calculation import (
    ConstructionCostRate,
    ConstructionCostRateCreate,
    ConstructionCostRateRead,
    ConstructionCostRateUpdate,
    RateStatus,
)
from app.core.snowflake import generate_snowflake_id
from datetime import datetime

router = APIRouter()


def require_super_admin(current_user: User = Depends(get_current_user)) -> User:
    """SA만 접근 가능."""
    if current_user.role != UserRole.SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="슈퍼 어드민만 접근할 수 있어요")
    return current_user


@router.get("/construction-rates", response_model=list)
async def list_construction_rates(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """건설 원가 요율 목록 조회."""
    rates = session.exec(
        select(ConstructionCostRate).order_by(ConstructionCostRate.effective_from.desc())
    ).all()
    return {
        "success": True,
        "data": [
            {
                "id": str(r.id),
                "label": r.label,
                "effective_from": str(r.effective_from),
                "effective_to": str(r.effective_to),
                "status": r.status,
                "industrial_accident_rate": str(r.industrial_accident_rate),
                "employment_insurance_rate": str(r.employment_insurance_rate),
                "health_insurance_rate": str(r.health_insurance_rate),
                "national_pension_rate": str(r.national_pension_rate),
                "longterm_care_rate": str(r.longterm_care_rate),
                "safety_management_rate": str(r.safety_management_rate),
                "environmental_rate": str(r.environmental_rate),
                "indirect_labor_rate": str(r.indirect_labor_rate),
                "other_expense_rate": str(r.other_expense_rate),
                "general_admin_rate": str(r.general_admin_rate),
                "profit_rate_cap": str(r.profit_rate_cap),
                "subcontract_guarantee_rate": str(r.subcontract_guarantee_rate),
                "equipment_guarantee_rate": str(r.equipment_guarantee_rate),
                "health_insurance_min_days": r.health_insurance_min_days,
                "pension_min_days": r.pension_min_days,
                "longterm_care_min_days": r.longterm_care_min_days,
                "created_at": r.created_at.isoformat() if r.created_at else None,
            }
            for r in rates
        ],
    }


@router.post("/construction-rates")
async def create_construction_rate(
    data: ConstructionCostRateCreate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin),
):
    """신규 건설 원가 요율 등록 (SA 전용)."""
    rate = ConstructionCostRate(
        id=generate_snowflake_id(),
        **data.model_dump(),
        created_by=current_user.id,
        updated_by=current_user.id,
    )
    session.add(rate)
    session.commit()
    session.refresh(rate)
    return {"success": True, "data": {"id": str(rate.id), "label": rate.label}}


@router.patch("/construction-rates/{rate_id}")
async def update_construction_rate(
    rate_id: int,
    data: ConstructionCostRateUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin),
):
    """건설 원가 요율 수정 (SA 전용)."""
    rate = session.get(ConstructionCostRate, rate_id)
    if not rate:
        raise HTTPException(status_code=404, detail="요율을 찾을 수 없어요")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(rate, key, value)
    rate.updated_by = current_user.id
    rate.updated_at = datetime.utcnow()

    session.add(rate)
    session.commit()
    return {"success": True, "data": {"id": str(rate.id)}}


@router.post("/construction-rates/{rate_id}/activate")
async def activate_construction_rate(
    rate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(require_super_admin),
):
    """요율 활성화 - 다른 모든 요율은 deprecated 처리 (SA 전용)."""
    rate = session.get(ConstructionCostRate, rate_id)
    if not rate:
        raise HTTPException(status_code=404, detail="요율을 찾을 수 없어요")

    # Deprecate all others
    all_rates = session.exec(select(ConstructionCostRate)).all()
    for r in all_rates:
        r.status = RateStatus.DEPRECATED if r.id != rate_id else RateStatus.ACTIVE
        r.updated_at = datetime.utcnow()
        session.add(r)

    session.commit()
    return {"success": True, "data": None}
