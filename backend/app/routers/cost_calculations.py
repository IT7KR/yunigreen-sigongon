"""원가계산서 CRUD API 라우터."""
from decimal import Decimal
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlmodel import Session, select
import io
from datetime import datetime

from app.core.database import get_session
from app.core.auth import get_current_user
from app.models.user import User
from app.models.estimate import Estimate, EstimateLine
from app.models.cost_calculation import (
    ConstructionCostRate,
    CostCalculation,
    CostCalculationCreate,
    CostCalculationRead,
    CostCalculationUpdate,
    TargetPriceRequest,
    RateStatus,
)
from app.core.snowflake import generate_snowflake_id
from app.services.cost_calculator import (
    calculate,
    calculate_profit_adjustment,
    CostInputs,
    RateValues,
)

router = APIRouter()


def _get_active_rate(session: Session) -> ConstructionCostRate:
    """활성 건설 원가 요율 조회."""
    rate = session.exec(
        select(ConstructionCostRate).where(
            ConstructionCostRate.status == RateStatus.ACTIVE
        )
    ).first()
    if not rate:
        raise HTTPException(
            status_code=404,
            detail="활성 건설 원가 요율이 없어요. SA에게 문의해 주세요.",
        )
    return rate


def _build_rate_values(rate: ConstructionCostRate) -> RateValues:
    return RateValues(
        industrial_accident_rate=rate.industrial_accident_rate,
        employment_insurance_rate=rate.employment_insurance_rate,
        health_insurance_rate=rate.health_insurance_rate,
        national_pension_rate=rate.national_pension_rate,
        longterm_care_rate=rate.longterm_care_rate,
        safety_management_rate=rate.safety_management_rate,
        environmental_rate=rate.environmental_rate,
        indirect_labor_rate=rate.indirect_labor_rate,
        other_expense_rate=rate.other_expense_rate,
        general_admin_rate=rate.general_admin_rate,
        profit_rate_cap=rate.profit_rate_cap,
        subcontract_guarantee_rate=rate.subcontract_guarantee_rate,
        equipment_guarantee_rate=rate.equipment_guarantee_rate,
        health_insurance_min_days=rate.health_insurance_min_days,
        pension_min_days=rate.pension_min_days,
        longterm_care_min_days=rate.longterm_care_min_days,
    )


def _build_cost_inputs(calc: CostCalculation) -> CostInputs:
    return CostInputs(
        direct_material_cost=calc.direct_material_cost,
        direct_labor_cost=calc.direct_labor_cost,
        equipment_cost=calc.equipment_cost,
        indirect_material_cost=calc.indirect_material_cost,
        material_scrap=calc.material_scrap,
        waste_disposal_fee=calc.waste_disposal_fee,
        override_indirect_labor_rate=calc.override_indirect_labor_rate,
        override_other_expense_rate=calc.override_other_expense_rate,
        override_general_admin_rate=calc.override_general_admin_rate,
        override_profit_rate=calc.override_profit_rate,
        construction_days=calc.construction_days,
        enable_subcontract_guarantee=calc.enable_subcontract_guarantee,
        enable_equipment_guarantee=calc.enable_equipment_guarantee,
        profit_adjustment=calc.profit_adjustment,
    )


def _apply_result(calc: CostCalculation, result) -> None:
    """계산 결과를 CostCalculation 오브젝트에 적용."""
    calc.material_subtotal = result.material_subtotal
    calc.indirect_labor_amount = result.indirect_labor_amount
    calc.labor_subtotal = result.labor_subtotal
    calc.accident_insurance = result.accident_insurance
    calc.employment_insurance = result.employment_insurance
    calc.health_insurance = result.health_insurance
    calc.national_pension = result.national_pension
    calc.longterm_care = result.longterm_care
    calc.safety_management = result.safety_management
    calc.environmental_fee = result.environmental_fee
    calc.other_expense = result.other_expense
    calc.subcontract_guarantee = result.subcontract_guarantee
    calc.equipment_guarantee = result.equipment_guarantee
    calc.expense_subtotal = result.expense_subtotal
    calc.net_construction_cost = result.net_construction_cost
    calc.general_admin_fee = result.general_admin_fee
    calc.profit_amount = result.profit_amount
    calc.supply_amount = result.supply_amount
    calc.vat_amount = result.vat_amount
    calc.contract_amount = result.contract_amount
    calc.updated_at = datetime.utcnow()


def _calc_to_dict(calc: CostCalculation, rate: Optional[ConstructionCostRate] = None) -> dict:
    d = {
        "id": str(calc.id),
        "estimate_id": str(calc.estimate_id),
        "rate_id": str(calc.rate_id),
        "direct_material_cost": str(calc.direct_material_cost),
        "direct_labor_cost": str(calc.direct_labor_cost),
        "equipment_cost": str(calc.equipment_cost),
        "indirect_material_cost": str(calc.indirect_material_cost),
        "material_scrap": str(calc.material_scrap),
        "waste_disposal_fee": str(calc.waste_disposal_fee),
        "override_indirect_labor_rate": str(calc.override_indirect_labor_rate) if calc.override_indirect_labor_rate else None,
        "override_other_expense_rate": str(calc.override_other_expense_rate) if calc.override_other_expense_rate else None,
        "override_general_admin_rate": str(calc.override_general_admin_rate) if calc.override_general_admin_rate else None,
        "override_profit_rate": str(calc.override_profit_rate) if calc.override_profit_rate else None,
        "construction_days": calc.construction_days,
        "enable_subcontract_guarantee": calc.enable_subcontract_guarantee,
        "enable_equipment_guarantee": calc.enable_equipment_guarantee,
        "profit_adjustment": str(calc.profit_adjustment),
        "target_contract_amount": str(calc.target_contract_amount) if calc.target_contract_amount else None,
        "material_subtotal": str(calc.material_subtotal),
        "indirect_labor_amount": str(calc.indirect_labor_amount),
        "labor_subtotal": str(calc.labor_subtotal),
        "accident_insurance": str(calc.accident_insurance),
        "employment_insurance": str(calc.employment_insurance),
        "health_insurance": str(calc.health_insurance),
        "national_pension": str(calc.national_pension),
        "longterm_care": str(calc.longterm_care),
        "safety_management": str(calc.safety_management),
        "environmental_fee": str(calc.environmental_fee),
        "other_expense": str(calc.other_expense),
        "subcontract_guarantee": str(calc.subcontract_guarantee),
        "equipment_guarantee": str(calc.equipment_guarantee),
        "expense_subtotal": str(calc.expense_subtotal),
        "net_construction_cost": str(calc.net_construction_cost),
        "general_admin_fee": str(calc.general_admin_fee),
        "profit_amount": str(calc.profit_amount),
        "supply_amount": str(calc.supply_amount),
        "vat_amount": str(calc.vat_amount),
        "contract_amount": str(calc.contract_amount),
        "is_visible": calc.is_visible,
        "created_at": calc.created_at.isoformat() if calc.created_at else None,
        "updated_at": calc.updated_at.isoformat() if calc.updated_at else None,
    }
    if rate:
        d["rate"] = {
            "id": str(rate.id),
            "label": rate.label,
            "indirect_labor_rate": str(rate.indirect_labor_rate),
            "general_admin_rate": str(rate.general_admin_rate),
            "profit_rate_cap": str(rate.profit_rate_cap),
            "industrial_accident_rate": str(rate.industrial_accident_rate),
            "employment_insurance_rate": str(rate.employment_insurance_rate),
            "health_insurance_rate": str(rate.health_insurance_rate),
            "national_pension_rate": str(rate.national_pension_rate),
            "longterm_care_rate": str(rate.longterm_care_rate),
            "safety_management_rate": str(rate.safety_management_rate),
            "environmental_rate": str(rate.environmental_rate),
            "other_expense_rate": str(rate.other_expense_rate),
            "subcontract_guarantee_rate": str(rate.subcontract_guarantee_rate),
            "equipment_guarantee_rate": str(rate.equipment_guarantee_rate),
            "health_insurance_min_days": rate.health_insurance_min_days,
            "pension_min_days": rate.pension_min_days,
            "longterm_care_min_days": rate.longterm_care_min_days,
        }
    return d


@router.post("/estimates/{estimate_id}/cost-calculation")
async def create_cost_calculation(
    estimate_id: int,
    data: Optional[CostCalculationCreate] = None,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """원가계산서 생성."""
    estimate = session.get(Estimate, estimate_id)
    if not estimate:
        raise HTTPException(status_code=404, detail="견적서를 찾을 수 없어요")

    # Check not already exists
    existing = session.exec(
        select(CostCalculation).where(CostCalculation.estimate_id == estimate_id)
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="이미 원가계산서가 존재해요")

    # Get active rate
    rate = _get_active_rate(session)

    # Aggregate EstimateLine costs
    lines = session.exec(
        select(EstimateLine).where(EstimateLine.estimate_id == estimate_id)
    ).all()

    direct_material = sum(line.material_amount for line in lines)
    direct_labor = sum(line.labor_amount for line in lines)
    equipment = sum(line.equipment_amount for line in lines)

    construction_days = data.construction_days if data and data.construction_days else 30

    calc = CostCalculation(
        id=generate_snowflake_id(),
        estimate_id=estimate_id,
        rate_id=rate.id,
        direct_material_cost=direct_material,
        direct_labor_cost=direct_labor,
        equipment_cost=equipment,
        construction_days=construction_days,
    )

    # Run calculation
    inputs = _build_cost_inputs(calc)
    rate_values = _build_rate_values(rate)
    result = calculate(inputs, rate_values)
    _apply_result(calc, result)

    session.add(calc)
    session.commit()
    session.refresh(calc)

    return {"success": True, "data": _calc_to_dict(calc, rate)}


@router.get("/estimates/{estimate_id}/cost-calculation")
async def get_cost_calculation(
    estimate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """원가계산서 조회."""
    calc = session.exec(
        select(CostCalculation).where(CostCalculation.estimate_id == estimate_id)
    ).first()
    if not calc:
        return {"success": True, "data": None}

    rate = session.get(ConstructionCostRate, calc.rate_id)
    return {"success": True, "data": _calc_to_dict(calc, rate)}


@router.patch("/estimates/{estimate_id}/cost-calculation")
async def update_cost_calculation(
    estimate_id: int,
    data: CostCalculationUpdate,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """원가계산서 수정 및 재계산."""
    calc = session.exec(
        select(CostCalculation).where(CostCalculation.estimate_id == estimate_id)
    ).first()
    if not calc:
        raise HTTPException(status_code=404, detail="원가계산서를 찾을 수 없어요")

    update_data = data.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(calc, key, value)

    rate = session.get(ConstructionCostRate, calc.rate_id)
    if not rate:
        rate = _get_active_rate(session)
        calc.rate_id = rate.id

    inputs = _build_cost_inputs(calc)
    rate_values = _build_rate_values(rate)
    result = calculate(inputs, rate_values)
    _apply_result(calc, result)

    session.add(calc)
    session.commit()
    session.refresh(calc)

    return {"success": True, "data": _calc_to_dict(calc, rate)}


@router.post("/estimates/{estimate_id}/cost-calculation/recalculate")
async def recalculate_cost_calculation(
    estimate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """EstimateLine 변경 후 강제 재계산."""
    calc = session.exec(
        select(CostCalculation).where(CostCalculation.estimate_id == estimate_id)
    ).first()
    if not calc:
        raise HTTPException(status_code=404, detail="원가계산서를 찾을 수 없어요")

    # Re-aggregate lines
    lines = session.exec(
        select(EstimateLine).where(EstimateLine.estimate_id == estimate_id)
    ).all()
    calc.direct_material_cost = sum(line.material_amount for line in lines)
    calc.direct_labor_cost = sum(line.labor_amount for line in lines)
    calc.equipment_cost = sum(line.equipment_amount for line in lines)

    rate = session.get(ConstructionCostRate, calc.rate_id)
    if not rate:
        rate = _get_active_rate(session)
        calc.rate_id = rate.id

    inputs = _build_cost_inputs(calc)
    rate_values = _build_rate_values(rate)
    result = calculate(inputs, rate_values)
    _apply_result(calc, result)

    session.add(calc)
    session.commit()
    session.refresh(calc)

    return {"success": True, "data": _calc_to_dict(calc, rate)}


@router.post("/estimates/{estimate_id}/cost-calculation/target-price")
async def calculate_target_price(
    estimate_id: int,
    data: TargetPriceRequest,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """목표 도급액에서 이윤 조정액 역산."""
    calc = session.exec(
        select(CostCalculation).where(CostCalculation.estimate_id == estimate_id)
    ).first()
    if not calc:
        raise HTTPException(status_code=404, detail="원가계산서를 찾을 수 없어요")

    rate = session.get(ConstructionCostRate, calc.rate_id)
    if not rate:
        rate = _get_active_rate(session)

    inputs = _build_cost_inputs(calc)
    rate_values = _build_rate_values(rate)

    adjustment = calculate_profit_adjustment(data.target_contract_amount, inputs, rate_values)

    return {"success": True, "data": {"profit_adjustment": str(adjustment)}}


@router.get("/estimates/{estimate_id}/cost-calculation/export")
async def export_cost_calculation(
    estimate_id: int,
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user),
):
    """원가계산서 엑셀 다운로드."""
    calc = session.exec(
        select(CostCalculation).where(CostCalculation.estimate_id == estimate_id)
    ).first()
    if not calc:
        raise HTTPException(status_code=404, detail="원가계산서를 찾을 수 없어요")

    rate = session.get(ConstructionCostRate, calc.rate_id)

    from app.services.cost_calculation_export import generate_cost_calculation_sheet

    # Convert to dicts
    def d(v):
        return str(v) if v is not None else "0"

    calc_dict = {
        "direct_material_cost": d(calc.direct_material_cost),
        "direct_labor_cost": d(calc.direct_labor_cost),
        "equipment_cost": d(calc.equipment_cost),
        "indirect_material_cost": d(calc.indirect_material_cost),
        "material_scrap": d(calc.material_scrap),
        "waste_disposal_fee": d(calc.waste_disposal_fee),
        "override_indirect_labor_rate": d(calc.override_indirect_labor_rate) if calc.override_indirect_labor_rate else None,
        "override_other_expense_rate": d(calc.override_other_expense_rate) if calc.override_other_expense_rate else None,
        "override_general_admin_rate": d(calc.override_general_admin_rate) if calc.override_general_admin_rate else None,
        "override_profit_rate": d(calc.override_profit_rate) if calc.override_profit_rate else None,
        "construction_days": calc.construction_days,
        "enable_subcontract_guarantee": calc.enable_subcontract_guarantee,
        "enable_equipment_guarantee": calc.enable_equipment_guarantee,
        "profit_adjustment": d(calc.profit_adjustment),
        "material_subtotal": d(calc.material_subtotal),
        "indirect_labor_amount": d(calc.indirect_labor_amount),
        "labor_subtotal": d(calc.labor_subtotal),
        "accident_insurance": d(calc.accident_insurance),
        "employment_insurance": d(calc.employment_insurance),
        "health_insurance": d(calc.health_insurance),
        "national_pension": d(calc.national_pension),
        "longterm_care": d(calc.longterm_care),
        "safety_management": d(calc.safety_management),
        "environmental_fee": d(calc.environmental_fee),
        "other_expense": d(calc.other_expense),
        "subcontract_guarantee": d(calc.subcontract_guarantee),
        "equipment_guarantee": d(calc.equipment_guarantee),
        "expense_subtotal": d(calc.expense_subtotal),
        "net_construction_cost": d(calc.net_construction_cost),
        "general_admin_fee": d(calc.general_admin_fee),
        "profit_amount": d(calc.profit_amount),
        "supply_amount": d(calc.supply_amount),
        "vat_amount": d(calc.vat_amount),
        "contract_amount": d(calc.contract_amount),
    }
    rate_dict = {
        "industrial_accident_rate": str(rate.industrial_accident_rate) if rate else "3.56",
        "employment_insurance_rate": str(rate.employment_insurance_rate) if rate else "1.01",
        "health_insurance_rate": str(rate.health_insurance_rate) if rate else "3.545",
        "national_pension_rate": str(rate.national_pension_rate) if rate else "4.50",
        "longterm_care_rate": str(rate.longterm_care_rate) if rate else "12.95",
        "safety_management_rate": str(rate.safety_management_rate) if rate else "3.11",
        "environmental_rate": str(rate.environmental_rate) if rate else "0.30",
        "indirect_labor_rate": str(rate.indirect_labor_rate) if rate else "15.00",
        "other_expense_rate": str(rate.other_expense_rate) if rate else "4.60",
        "general_admin_rate": str(rate.general_admin_rate) if rate else "5.50",
        "profit_rate_cap": str(rate.profit_rate_cap) if rate else "12.00",
        "subcontract_guarantee_rate": str(rate.subcontract_guarantee_rate) if rate else "0.081",
        "equipment_guarantee_rate": str(rate.equipment_guarantee_rate) if rate else "0.10",
        "health_insurance_min_days": rate.health_insurance_min_days if rate else 31,
        "pension_min_days": rate.pension_min_days if rate else 31,
        "longterm_care_min_days": rate.longterm_care_min_days if rate else 31,
    }

    file_bytes = generate_cost_calculation_sheet(calc_dict, rate_dict)

    return StreamingResponse(
        io.BytesIO(file_bytes),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=원가계산서_{estimate_id}.xlsx"},
    )
