"""add construction_cost_rate and cost_calculation tables

Revision ID: 008_add_cost_calculation
Revises: 007_add_composite_and_line_costs
Create Date: 2026-02-28

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "008_add_cost_calculation"
down_revision: Union[str, None] = "007_add_composite_and_line_costs"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. construction_cost_rate 테이블
    if "construction_cost_rate" not in existing_tables:
        op.create_table(
            "construction_cost_rate",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("label", sa.String(length=100), nullable=False),
            sa.Column("effective_from", sa.Date(), nullable=False),
            sa.Column("effective_to", sa.Date(), nullable=False),
            sa.Column("status", sa.String(length=20), nullable=False, server_default="active"),
            # 법정 요율
            sa.Column("industrial_accident_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="3.5600"),
            sa.Column("employment_insurance_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="1.0100"),
            sa.Column("health_insurance_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="3.5450"),
            sa.Column("national_pension_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="4.5000"),
            sa.Column("longterm_care_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="12.9500"),
            sa.Column("safety_management_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="3.1100"),
            sa.Column("environmental_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="0.3000"),
            # 편집 가능 기본값
            sa.Column("indirect_labor_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="15.0000"),
            sa.Column("other_expense_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="4.6000"),
            sa.Column("general_admin_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="5.5000"),
            sa.Column("profit_rate_cap", sa.Numeric(precision=8, scale=4), nullable=False, server_default="12.0000"),
            sa.Column("subcontract_guarantee_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="0.0810"),
            sa.Column("equipment_guarantee_rate", sa.Numeric(precision=8, scale=4), nullable=False, server_default="0.1000"),
            # 조건부 규칙
            sa.Column("health_insurance_min_days", sa.Integer(), nullable=False, server_default="31"),
            sa.Column("pension_min_days", sa.Integer(), nullable=False, server_default="31"),
            sa.Column("longterm_care_min_days", sa.Integer(), nullable=False, server_default="31"),
            # 감사
            sa.Column("created_by", sa.BigInteger(), nullable=True),
            sa.Column("updated_by", sa.BigInteger(), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_construction_cost_rate_status", "construction_cost_rate", ["status"])

    # 2. cost_calculation 테이블
    if "cost_calculation" not in existing_tables:
        op.create_table(
            "cost_calculation",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("estimate_id", sa.BigInteger(), nullable=False),
            sa.Column("rate_id", sa.BigInteger(), nullable=False),
            # 집계값
            sa.Column("direct_material_cost", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("direct_labor_cost", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("equipment_cost", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            # 수동 입력
            sa.Column("indirect_material_cost", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("material_scrap", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("waste_disposal_fee", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            # 요율 오버라이드
            sa.Column("override_indirect_labor_rate", sa.Numeric(precision=8, scale=4), nullable=True),
            sa.Column("override_other_expense_rate", sa.Numeric(precision=8, scale=4), nullable=True),
            sa.Column("override_general_admin_rate", sa.Numeric(precision=8, scale=4), nullable=True),
            sa.Column("override_profit_rate", sa.Numeric(precision=8, scale=4), nullable=True),
            # 조건
            sa.Column("construction_days", sa.Integer(), nullable=False, server_default="30"),
            sa.Column("enable_subcontract_guarantee", sa.Boolean(), nullable=False, server_default="false"),
            sa.Column("enable_equipment_guarantee", sa.Boolean(), nullable=False, server_default="false"),
            # 이윤 조정
            sa.Column("profit_adjustment", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("target_contract_amount", sa.Numeric(precision=15, scale=2), nullable=True),
            # 계산 결과
            sa.Column("material_subtotal", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("indirect_labor_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("labor_subtotal", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("accident_insurance", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("employment_insurance", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("health_insurance", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("national_pension", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("longterm_care", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("safety_management", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("environmental_fee", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("other_expense", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("subcontract_guarantee", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("equipment_guarantee", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("expense_subtotal", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("net_construction_cost", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("general_admin_fee", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("profit_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("supply_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("vat_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("contract_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            # 공개 여부
            sa.Column("is_visible", sa.Boolean(), nullable=False, server_default="true"),
            # 타임스탬프
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
            sa.UniqueConstraint("estimate_id", name="uq_cost_calculation_estimate_id"),
        )
        op.create_index("ix_cost_calculation_estimate_id", "cost_calculation", ["estimate_id"])
        op.create_index("ix_cost_calculation_rate_id", "cost_calculation", ["rate_id"])


def downgrade() -> None:
    op.drop_index("ix_cost_calculation_rate_id", table_name="cost_calculation")
    op.drop_index("ix_cost_calculation_estimate_id", table_name="cost_calculation")
    op.drop_table("cost_calculation")
    op.drop_index("ix_construction_cost_rate_status", table_name="construction_cost_rate")
    op.drop_table("construction_cost_rate")
