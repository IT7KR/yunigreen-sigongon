"""add composite unit price tables and estimate_line cost breakdown columns

Revision ID: 007_add_composite_and_line_costs
Revises: 006_update_subscription_plan_enum
Create Date: 2026-02-28

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "007_add_composite_and_line_costs"
down_revision: Union[str, None] = "006_update_subscription_plan_enum"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    # 1. composite_unit_price 테이블
    if "composite_unit_price" not in existing_tables:
        op.create_table(
            "composite_unit_price",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("pricebook_revision_id", sa.BigInteger(), nullable=False),
            sa.Column("name", sa.String(length=500), nullable=False),
            sa.Column("specification", sa.String(length=255), nullable=True),
            sa.Column("unit", sa.String(length=20), nullable=False),
            sa.Column("source_reference", sa.String(length=500), nullable=True),
            sa.Column("source_pdf_page", sa.Integer(), nullable=True),
            sa.Column("material_subtotal", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("labor_subtotal", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("equipment_subtotal", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("total_unit_price", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"),
            sa.Column("category_path", sa.String(length=255), nullable=True),
            sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.func.now()),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_composite_unit_price_pricebook_revision_id", "composite_unit_price", ["pricebook_revision_id"])

    # 2. composite_component 테이블
    if "composite_component" not in existing_tables:
        op.create_table(
            "composite_component",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("composite_id", sa.BigInteger(), nullable=False),
            sa.Column("catalog_item_id", sa.BigInteger(), nullable=True),
            sa.Column("name", sa.String(length=500), nullable=False),
            sa.Column("specification", sa.String(length=255), nullable=True),
            sa.Column("unit", sa.String(length=20), nullable=False),
            sa.Column("cost_type", sa.String(length=20), nullable=False),
            sa.Column("unit_price", sa.Numeric(precision=15, scale=2), nullable=False),
            sa.Column("quantity_per_unit", sa.Numeric(precision=10, scale=4), nullable=False),
            sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
            sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
            sa.Column("source_note", sa.String(length=255), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index("ix_composite_component_composite_id", "composite_component", ["composite_id"])
        op.create_index("ix_composite_component_catalog_item_id", "composite_component", ["catalog_item_id"])

    # 3. estimate_line 컬럼 추가
    existing_cols = {c["name"] for c in inspector.get_columns("estimate_line")}

    if "composite_unit_price_id" not in existing_cols:
        op.add_column("estimate_line", sa.Column("composite_unit_price_id", sa.BigInteger(), nullable=True))
        op.create_index("ix_estimate_line_composite_unit_price_id", "estimate_line", ["composite_unit_price_id"])

    if "material_amount" not in existing_cols:
        op.add_column("estimate_line", sa.Column("material_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"))

    if "labor_amount" not in existing_cols:
        op.add_column("estimate_line", sa.Column("labor_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"))

    if "equipment_amount" not in existing_cols:
        op.add_column("estimate_line", sa.Column("equipment_amount", sa.Numeric(precision=15, scale=2), nullable=False, server_default="0"))


def downgrade() -> None:
    op.drop_index("ix_estimate_line_composite_unit_price_id", table_name="estimate_line")
    op.drop_column("estimate_line", "composite_unit_price_id")
    op.drop_column("estimate_line", "material_amount")
    op.drop_column("estimate_line", "labor_amount")
    op.drop_column("estimate_line", "equipment_amount")
    op.drop_index("ix_composite_component_catalog_item_id", table_name="composite_component")
    op.drop_index("ix_composite_component_composite_id", table_name="composite_component")
    op.drop_table("composite_component")
    op.drop_index("ix_composite_unit_price_pricebook_revision_id", table_name="composite_unit_price")
    op.drop_table("composite_unit_price")
