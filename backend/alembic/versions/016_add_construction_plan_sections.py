"""add construction plan sections (labor, material, text fields)

Revision ID: 016_add_construction_plan_sections
Revises: 015_mat_master_split_spec
Create Date: 2026-03-13
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "016_add_construction_plan_sections"
down_revision: Union[str, None] = "015_mat_master_split_spec"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. construction_labor_plan 테이블
    if "construction_labor_plan" not in existing_tables:
        op.create_table(
            "construction_labor_plan",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("plan_id", sa.BigInteger(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("job_title", sa.String(length=100), nullable=False),
            sa.Column("headcount", sa.Integer(), nullable=False, server_default="1"),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_construction_labor_plan_plan_id",
            "construction_labor_plan",
            ["plan_id"],
            unique=False,
        )

    # 2. construction_material_plan 테이블
    if "construction_material_plan" not in existing_tables:
        op.create_table(
            "construction_material_plan",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("plan_id", sa.BigInteger(), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("material_name", sa.String(length=200), nullable=False),
            sa.Column("quantity", sa.String(length=100), nullable=False),
            sa.Column("start_date", sa.Date(), nullable=False),
            sa.Column("end_date", sa.Date(), nullable=False),
            sa.Column("created_at", sa.DateTime(), nullable=False),
            sa.Column("updated_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_construction_material_plan_plan_id",
            "construction_material_plan",
            ["plan_id"],
            unique=False,
        )

    # 3. construction_plan 컬럼 추가
    existing_cols = [c["name"] for c in inspector.get_columns("construction_plan")]
    if "safety_plan" not in existing_cols:
        op.add_column("construction_plan", sa.Column("safety_plan", sa.Text(), nullable=True))
    if "equipment_plan" not in existing_cols:
        op.add_column("construction_plan", sa.Column("equipment_plan", sa.Text(), nullable=True))
    if "waste_plan" not in existing_cols:
        op.add_column("construction_plan", sa.Column("waste_plan", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("construction_plan", "waste_plan")
    op.drop_column("construction_plan", "equipment_plan")
    op.drop_column("construction_plan", "safety_plan")

    op.drop_index("ix_construction_material_plan_plan_id", table_name="construction_material_plan")
    op.drop_table("construction_material_plan")

    op.drop_index("ix_construction_labor_plan_plan_id", table_name="construction_labor_plan")
    op.drop_table("construction_labor_plan")
