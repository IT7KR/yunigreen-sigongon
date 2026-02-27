"""Cost Calculation models — 건설 원가 요율 및 원가계산서."""
from datetime import datetime, date
from decimal import Decimal
from enum import Enum
from typing import Optional

from sqlalchemy import BigInteger
from sqlmodel import SQLModel, Field, Relationship

from app.core.snowflake import generate_snowflake_id


class RateStatus(str, Enum):
    """건설 원가 요율 상태."""
    ACTIVE = "active"
    DEPRECATED = "deprecated"


# ---------------------------------------------------------------------------
# ConstructionCostRate
# ---------------------------------------------------------------------------

class ConstructionCostRate(SQLModel, table=True):
    """SA가 관리하는 건설 원가 요율 (반기별)."""
    __tablename__ = "construction_cost_rate"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)
    label: str = Field(max_length=100)  # e.g. "2025년 하반기"
    effective_from: date
    effective_to: date
    status: RateStatus = Field(default=RateStatus.ACTIVE, index=True)

    # ── 법정 요율 (SA only) ────────────────────────────────────────────────
    industrial_accident_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("3.56"))    # 산재보험
    employment_insurance_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("1.01"))    # 고용보험
    health_insurance_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("3.545"))   # 건강보험
    national_pension_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("4.50"))    # 국민연금
    longterm_care_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("12.95"))   # 장기요양 (건강보험료 대비 %)
    safety_management_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("3.11"))    # 산업안전보건관리비
    environmental_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("0.30"))    # 환경보전비

    # ── 편집 가능한 기본값 ─────────────────────────────────────────────────
    indirect_labor_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("15.00"))   # 간접노무비
    other_expense_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("4.60"))    # 기타경비
    general_admin_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("5.50"))    # 일반관리비
    profit_rate_cap: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("12.00"))   # 이윤 상한
    subcontract_guarantee_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("0.081"))   # 하도급보증
    equipment_guarantee_rate: Decimal = Field(
        max_digits=8, decimal_places=4, default=Decimal("0.10"))    # 건설기계보증

    # ── 조건부 규칙 ───────────────────────────────────────────────────────
    health_insurance_min_days: int = Field(default=31)   # 건강보험 최소 공사일수
    pension_min_days: int = Field(default=31)
    longterm_care_min_days: int = Field(default=31)

    # ── 감사 필드 ──────────────────────────────────────────────────────────
    created_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    updated_by: Optional[int] = Field(default=None, sa_type=BigInteger)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# CostCalculation
# ---------------------------------------------------------------------------

class CostCalculation(SQLModel, table=True):
    """견적서에 1:1 연결되는 원가계산서."""
    __tablename__ = "cost_calculation"

    id: int = Field(default_factory=generate_snowflake_id, primary_key=True, sa_type=BigInteger)

    # FK — Estimate (1:1)
    estimate_id: int = Field(sa_type=BigInteger, index=True, unique=True)
    # FK — ConstructionCostRate
    rate_id: int = Field(sa_type=BigInteger, index=True)

    # ── 집계값 (EstimateLine에서 자동 계산) ───────────────────────────────
    direct_material_cost: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    direct_labor_cost: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    equipment_cost: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))

    # ── 수동 입력 ──────────────────────────────────────────────────────────
    indirect_material_cost: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    material_scrap: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))   # 작업설/부산물
    waste_disposal_fee: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))

    # ── 요율 오버라이드 (Optional) ─────────────────────────────────────────
    override_indirect_labor_rate: Optional[Decimal] = Field(
        max_digits=8, decimal_places=4, default=None)
    override_other_expense_rate: Optional[Decimal] = Field(
        max_digits=8, decimal_places=4, default=None)
    override_general_admin_rate: Optional[Decimal] = Field(
        max_digits=8, decimal_places=4, default=None)
    override_profit_rate: Optional[Decimal] = Field(
        max_digits=8, decimal_places=4, default=None)

    # ── 조건 ──────────────────────────────────────────────────────────────
    construction_days: int = Field(default=30)             # 공사기간 (일)
    enable_subcontract_guarantee: bool = Field(default=False)
    enable_equipment_guarantee: bool = Field(default=False)

    # ── 이윤 조정 ──────────────────────────────────────────────────────────
    profit_adjustment: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    target_contract_amount: Optional[Decimal] = Field(
        max_digits=15, decimal_places=2, default=None)

    # ── 계산 결과 (서버 산출) ──────────────────────────────────────────────
    material_subtotal: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    indirect_labor_amount: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    labor_subtotal: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    accident_insurance: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    employment_insurance: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    health_insurance: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    national_pension: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    longterm_care: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    safety_management: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    environmental_fee: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    other_expense: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    subcontract_guarantee: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    equipment_guarantee: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    expense_subtotal: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    net_construction_cost: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    general_admin_fee: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    profit_amount: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    supply_amount: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    vat_amount: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))
    contract_amount: Decimal = Field(
        max_digits=15, decimal_places=2, default=Decimal("0"))

    # ── 공개 여부 ──────────────────────────────────────────────────────────
    is_visible: bool = Field(default=True)

    # ── 타임스탬프 ─────────────────────────────────────────────────────────
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


# ---------------------------------------------------------------------------
# Schemas — ConstructionCostRate
# ---------------------------------------------------------------------------

class ConstructionCostRateCreate(SQLModel):
    """ConstructionCostRate 생성 스키마."""
    label: str
    effective_from: date
    effective_to: date
    status: RateStatus = RateStatus.ACTIVE

    # 법정 요율
    industrial_accident_rate: Decimal = Decimal("3.56")
    employment_insurance_rate: Decimal = Decimal("1.01")
    health_insurance_rate: Decimal = Decimal("3.545")
    national_pension_rate: Decimal = Decimal("4.50")
    longterm_care_rate: Decimal = Decimal("12.95")
    safety_management_rate: Decimal = Decimal("3.11")
    environmental_rate: Decimal = Decimal("0.30")

    # 편집 가능 기본값
    indirect_labor_rate: Decimal = Decimal("15.00")
    other_expense_rate: Decimal = Decimal("4.60")
    general_admin_rate: Decimal = Decimal("5.50")
    profit_rate_cap: Decimal = Decimal("12.00")
    subcontract_guarantee_rate: Decimal = Decimal("0.081")
    equipment_guarantee_rate: Decimal = Decimal("0.10")

    # 조건부 규칙
    health_insurance_min_days: int = 31
    pension_min_days: int = 31
    longterm_care_min_days: int = 31


class ConstructionCostRateRead(SQLModel):
    """ConstructionCostRate 읽기 스키마."""
    id: int
    label: str
    effective_from: date
    effective_to: date
    status: RateStatus

    industrial_accident_rate: Decimal
    employment_insurance_rate: Decimal
    health_insurance_rate: Decimal
    national_pension_rate: Decimal
    longterm_care_rate: Decimal
    safety_management_rate: Decimal
    environmental_rate: Decimal

    indirect_labor_rate: Decimal
    other_expense_rate: Decimal
    general_admin_rate: Decimal
    profit_rate_cap: Decimal
    subcontract_guarantee_rate: Decimal
    equipment_guarantee_rate: Decimal

    health_insurance_min_days: int
    pension_min_days: int
    longterm_care_min_days: int

    created_by: Optional[int]
    updated_by: Optional[int]
    created_at: datetime
    updated_at: datetime


class ConstructionCostRateUpdate(SQLModel):
    """ConstructionCostRate 수정 스키마 (모든 필드 Optional)."""
    label: Optional[str] = None
    effective_from: Optional[date] = None
    effective_to: Optional[date] = None
    status: Optional[RateStatus] = None

    industrial_accident_rate: Optional[Decimal] = None
    employment_insurance_rate: Optional[Decimal] = None
    health_insurance_rate: Optional[Decimal] = None
    national_pension_rate: Optional[Decimal] = None
    longterm_care_rate: Optional[Decimal] = None
    safety_management_rate: Optional[Decimal] = None
    environmental_rate: Optional[Decimal] = None

    indirect_labor_rate: Optional[Decimal] = None
    other_expense_rate: Optional[Decimal] = None
    general_admin_rate: Optional[Decimal] = None
    profit_rate_cap: Optional[Decimal] = None
    subcontract_guarantee_rate: Optional[Decimal] = None
    equipment_guarantee_rate: Optional[Decimal] = None

    health_insurance_min_days: Optional[int] = None
    pension_min_days: Optional[int] = None
    longterm_care_min_days: Optional[int] = None


# ---------------------------------------------------------------------------
# Schemas — CostCalculation
# ---------------------------------------------------------------------------

class CostCalculationCreate(SQLModel):
    """CostCalculation 생성 스키마."""
    estimate_id: int
    rate_id: int
    construction_days: int = 30


class CostCalculationRead(SQLModel):
    """CostCalculation 읽기 스키마."""
    id: int
    estimate_id: int
    rate_id: int

    direct_material_cost: Decimal
    direct_labor_cost: Decimal
    equipment_cost: Decimal

    indirect_material_cost: Decimal
    material_scrap: Decimal
    waste_disposal_fee: Decimal

    override_indirect_labor_rate: Optional[Decimal]
    override_other_expense_rate: Optional[Decimal]
    override_general_admin_rate: Optional[Decimal]
    override_profit_rate: Optional[Decimal]

    construction_days: int
    enable_subcontract_guarantee: bool
    enable_equipment_guarantee: bool

    profit_adjustment: Decimal
    target_contract_amount: Optional[Decimal]

    material_subtotal: Decimal
    indirect_labor_amount: Decimal
    labor_subtotal: Decimal
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
    net_construction_cost: Decimal
    general_admin_fee: Decimal
    profit_amount: Decimal
    supply_amount: Decimal
    vat_amount: Decimal
    contract_amount: Decimal

    is_visible: bool
    created_at: datetime
    updated_at: datetime


class CostCalculationUpdate(SQLModel):
    """CostCalculation 수정 스키마."""
    # 수동 입력
    indirect_material_cost: Optional[Decimal] = None
    material_scrap: Optional[Decimal] = None
    waste_disposal_fee: Optional[Decimal] = None

    # 요율 오버라이드
    override_indirect_labor_rate: Optional[Decimal] = None
    override_other_expense_rate: Optional[Decimal] = None
    override_general_admin_rate: Optional[Decimal] = None
    override_profit_rate: Optional[Decimal] = None

    # 조건
    construction_days: Optional[int] = None
    enable_subcontract_guarantee: Optional[bool] = None
    enable_equipment_guarantee: Optional[bool] = None

    # 이윤 조정
    profit_adjustment: Optional[Decimal] = None
    target_contract_amount: Optional[Decimal] = None

    # 공개 여부
    is_visible: Optional[bool] = None


class TargetPriceRequest(SQLModel):
    """목표 계약금액 역산 요청 스키마."""
    target_contract_amount: Decimal
