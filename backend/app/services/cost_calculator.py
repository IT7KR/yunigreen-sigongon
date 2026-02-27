"""건설 원가계산서 계산 엔진.

Korean construction cost calculation following official 원가계산서 formula.
All calculations use Decimal for financial precision.
"""
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional
from dataclasses import dataclass


@dataclass
class CostInputs:
    """Input values for cost calculation."""
    # From EstimateLine aggregation
    direct_material_cost: Decimal
    direct_labor_cost: Decimal
    equipment_cost: Decimal

    # Manual inputs
    indirect_material_cost: Decimal = Decimal("0")
    material_scrap: Decimal = Decimal("0")  # 작업설/부산물 (차감)
    waste_disposal_fee: Decimal = Decimal("0")  # 폐기물처리비

    # Rate overrides (None = use rate from ConstructionCostRate)
    override_indirect_labor_rate: Optional[Decimal] = None
    override_other_expense_rate: Optional[Decimal] = None
    override_general_admin_rate: Optional[Decimal] = None
    override_profit_rate: Optional[Decimal] = None

    # Conditions
    construction_days: int = 30
    enable_subcontract_guarantee: bool = False
    enable_equipment_guarantee: bool = False

    # Profit adjustment
    profit_adjustment: Decimal = Decimal("0")


@dataclass
class RateValues:
    """Rate values from ConstructionCostRate."""
    industrial_accident_rate: Decimal  # 산재보험
    employment_insurance_rate: Decimal  # 고용보험
    health_insurance_rate: Decimal  # 건강보험
    national_pension_rate: Decimal  # 국민연금
    longterm_care_rate: Decimal  # 장기요양 (건강보험료 대비 %)
    safety_management_rate: Decimal  # 산업안전보건관리비
    environmental_rate: Decimal  # 환경보전비
    indirect_labor_rate: Decimal  # 간접노무비
    other_expense_rate: Decimal  # 기타경비
    general_admin_rate: Decimal  # 일반관리비
    profit_rate_cap: Decimal  # 이윤 상한
    subcontract_guarantee_rate: Decimal  # 하도급보증
    equipment_guarantee_rate: Decimal  # 건설기계보증
    health_insurance_min_days: int
    pension_min_days: int
    longterm_care_min_days: int


@dataclass
class CostResult:
    """Calculated cost breakdown result."""
    # 재료비
    material_subtotal: Decimal

    # 노무비
    indirect_labor_amount: Decimal
    labor_subtotal: Decimal

    # 경비 항목
    accident_insurance: Decimal
    employment_insurance: Decimal
    health_insurance: Decimal
    national_pension: Decimal
    longterm_care: Decimal
    safety_management: Decimal
    environmental_fee: Decimal
    other_expense: Decimal
    subcontract_guarantee: Decimal
    equipment_guarantee: Decimal
    expense_subtotal: Decimal

    # 합계
    net_construction_cost: Decimal
    general_admin_fee: Decimal
    profit_amount: Decimal
    supply_amount: Decimal
    vat_amount: Decimal
    contract_amount: Decimal


def _pct(base: Decimal, rate: Decimal) -> Decimal:
    """Apply percentage rate (rate is in %, e.g. 3.56 means 3.56%)."""
    return (base * rate / Decimal("100")).quantize(Decimal("1"), rounding=ROUND_HALF_UP)


def calculate(inputs: CostInputs, rates: RateValues) -> CostResult:
    """
    원가계산서 계산 엔진.

    Formula sequence:
    재료비 소계 = 직접재료비 + 간접재료비 - 작업설/부산물
    간접노무비 = 직접노무비 × 간접노무비율
    노무비 소계 = 직접노무비 + 간접노무비

    산재보험료 = 노무비소계 × 산재보험율
    고용보험료 = 노무비소계 × 고용보험율
    건강보험료 = 직접노무비 × 건강보험율  (공사기간 >= min_days 때만)
    국민연금   = 직접노무비 × 국민연금율  (공사기간 >= min_days 때만)
    장기요양   = 건강보험료 × 장기요양율  (공사기간 >= min_days 때만)
    안전관리비 = (재료비소계 + 직접노무비) × 안전관리비율
    환경보전비 = (재료비소계 + 직접노무비 + 기계경비) × 환경보전비율
    기타경비   = (재료비소계 + 노무비소계) × 기타경비율
    하도급보증 = (재료비소계 + 직접노무비 + 경비소계) × 하도급보증율 (선택)
    건설기계보증 = 직접노무비 × 건설기계보증율 (선택)
    경비 소계 = SUM(모든 경비 항목)

    순공사원가 = 재료비소계 + 노무비소계 + 경비소계
    일반관리비 = 순공사원가 × 일반관리비율
    이윤 = (노무비소계 + 경비소계 + 일반관리비) × 이윤율 + 조정액
          단, 이윤율은 이윤상한(기본12%) 적용

    공급가액 = 순공사원가 + 일반관리비 + 폐기물처리비 + 이윤
    부가가치세 = 공급가액 × 10%
    도급액 = 공급가액 + 부가가치세
    """
    # Effective rates (override if provided)
    indirect_labor_rate = inputs.override_indirect_labor_rate or rates.indirect_labor_rate
    other_expense_rate = inputs.override_other_expense_rate or rates.other_expense_rate
    general_admin_rate = inputs.override_general_admin_rate or rates.general_admin_rate
    profit_rate = inputs.override_profit_rate or rates.profit_rate_cap

    # 재료비 소계
    material_subtotal = (
        inputs.direct_material_cost
        + inputs.indirect_material_cost
        - inputs.material_scrap
    )

    # 간접노무비
    indirect_labor_amount = _pct(inputs.direct_labor_cost, indirect_labor_rate)

    # 노무비 소계
    labor_subtotal = inputs.direct_labor_cost + indirect_labor_amount

    # 경비 계산
    accident_insurance = _pct(labor_subtotal, rates.industrial_accident_rate)
    employment_insurance = _pct(labor_subtotal, rates.employment_insurance_rate)

    # 조건부 항목 (공사일수 기반)
    if inputs.construction_days >= rates.health_insurance_min_days:
        health_insurance = _pct(inputs.direct_labor_cost, rates.health_insurance_rate)
    else:
        health_insurance = Decimal("0")

    if inputs.construction_days >= rates.pension_min_days:
        national_pension = _pct(inputs.direct_labor_cost, rates.national_pension_rate)
    else:
        national_pension = Decimal("0")

    if inputs.construction_days >= rates.longterm_care_min_days:
        # 장기요양 = 건강보험료 × 장기요양율%
        longterm_care = _pct(health_insurance, rates.longterm_care_rate)
    else:
        longterm_care = Decimal("0")

    safety_management = _pct(
        material_subtotal + inputs.direct_labor_cost,
        rates.safety_management_rate
    )
    environmental_fee = _pct(
        material_subtotal + inputs.direct_labor_cost + inputs.equipment_cost,
        rates.environmental_rate
    )
    other_expense = _pct(material_subtotal + labor_subtotal, other_expense_rate)

    # 선택 항목 (초기에는 하도급보증 계산 전에 경비소계 없이 계산, 이후 추가)
    subcontract_guarantee = Decimal("0")
    equipment_guarantee = Decimal("0")

    # 경비소계 (하도급/기계보증 제외한 합계)
    base_expense = (
        accident_insurance + employment_insurance + health_insurance
        + national_pension + longterm_care + safety_management
        + environmental_fee + other_expense
    )

    # 선택 항목 계산
    if inputs.enable_subcontract_guarantee:
        subcontract_guarantee = _pct(
            material_subtotal + inputs.direct_labor_cost + base_expense,
            rates.subcontract_guarantee_rate
        )

    if inputs.enable_equipment_guarantee:
        equipment_guarantee = _pct(
            inputs.direct_labor_cost,
            rates.equipment_guarantee_rate
        )

    expense_subtotal = base_expense + subcontract_guarantee + equipment_guarantee

    # 순공사원가
    net_construction_cost = material_subtotal + labor_subtotal + expense_subtotal

    # 일반관리비
    general_admin_fee = _pct(net_construction_cost, general_admin_rate)

    # 이윤 = (노무비소계 + 경비소계 + 일반관리비) × 이윤율 + 조정액
    profit_base = labor_subtotal + expense_subtotal + general_admin_fee
    profit_amount = _pct(profit_base, profit_rate) + inputs.profit_adjustment

    # 공급가액
    supply_amount = (
        net_construction_cost
        + general_admin_fee
        + inputs.waste_disposal_fee
        + profit_amount
    )

    # 부가가치세 (10%)
    vat_amount = _pct(supply_amount, Decimal("10"))

    # 도급액
    contract_amount = supply_amount + vat_amount

    return CostResult(
        material_subtotal=material_subtotal,
        indirect_labor_amount=indirect_labor_amount,
        labor_subtotal=labor_subtotal,
        accident_insurance=accident_insurance,
        employment_insurance=employment_insurance,
        health_insurance=health_insurance,
        national_pension=national_pension,
        longterm_care=longterm_care,
        safety_management=safety_management,
        environmental_fee=environmental_fee,
        other_expense=other_expense,
        subcontract_guarantee=subcontract_guarantee,
        equipment_guarantee=equipment_guarantee,
        expense_subtotal=expense_subtotal,
        net_construction_cost=net_construction_cost,
        general_admin_fee=general_admin_fee,
        profit_amount=profit_amount,
        supply_amount=supply_amount,
        vat_amount=vat_amount,
        contract_amount=contract_amount,
    )


def calculate_profit_adjustment(
    target_contract_amount: Decimal,
    inputs: CostInputs,
    rates: RateValues,
) -> Decimal:
    """
    목표 도급액에서 이윤 조정액을 역산.

    Steps:
    1. target_supply = target_contract / 1.10 (VAT 역산)
    2. Calculate everything except profit and adjustment
    3. required_profit = target_supply - (net_cost + admin_fee + waste_fee)
    4. base_profit = (labor_sub + expense_sub + admin_fee) × profit_rate
    5. adjustment = required_profit - base_profit
    """
    # Calculate base values (without profit_adjustment)
    zero_adj_inputs = CostInputs(
        direct_material_cost=inputs.direct_material_cost,
        direct_labor_cost=inputs.direct_labor_cost,
        equipment_cost=inputs.equipment_cost,
        indirect_material_cost=inputs.indirect_material_cost,
        material_scrap=inputs.material_scrap,
        waste_disposal_fee=inputs.waste_disposal_fee,
        override_indirect_labor_rate=inputs.override_indirect_labor_rate,
        override_other_expense_rate=inputs.override_other_expense_rate,
        override_general_admin_rate=inputs.override_general_admin_rate,
        override_profit_rate=inputs.override_profit_rate,
        construction_days=inputs.construction_days,
        enable_subcontract_guarantee=inputs.enable_subcontract_guarantee,
        enable_equipment_guarantee=inputs.enable_equipment_guarantee,
        profit_adjustment=Decimal("0"),  # No adjustment for base calc
    )

    base_result = calculate(zero_adj_inputs, rates)

    # Target supply (reverse VAT)
    target_supply = (target_contract_amount / Decimal("1.10")).quantize(
        Decimal("1"), rounding=ROUND_HALF_UP
    )

    # Required profit
    required_profit = (
        target_supply
        - base_result.net_construction_cost
        - base_result.general_admin_fee
        - inputs.waste_disposal_fee
    )

    # Base profit (without adjustment)
    base_profit = base_result.profit_amount  # This is base profit with 0 adjustment

    # Adjustment
    adjustment = required_profit - base_profit
    return adjustment.quantize(Decimal("1"), rounding=ROUND_HALF_UP)
