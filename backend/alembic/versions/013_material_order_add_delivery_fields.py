"""material_order_add_delivery_fields

Revision ID: 013_material_order_delivery
Revises: 012_add_ssn_fields
Create Date: 2026-03-13
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "013_material_order_delivery"
down_revision: Union[str, None] = "012_add_ssn_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_cols = [c["name"] for c in inspector.get_columns("material_order")]

    cols_to_add = [
        ("order_date", sa.Column("order_date", sa.Date(), nullable=True)),
        ("arrival_date", sa.Column("arrival_date", sa.Date(), nullable=True)),
        ("arrival_time", sa.Column("arrival_time", sa.String(10), nullable=True)),
        ("delivery_address", sa.Column("delivery_address", sa.String(500), nullable=True)),
        ("delivery_terms", sa.Column("delivery_terms", sa.String(100), nullable=True)),
        ("payment_terms", sa.Column("payment_terms", sa.String(200), nullable=True)),
        ("site_manager_name", sa.Column("site_manager_name", sa.String(50), nullable=True)),
        ("site_manager_phone", sa.Column("site_manager_phone", sa.String(20), nullable=True)),
    ]

    for col_name, col_def in cols_to_add:
        if col_name not in existing_cols:
            op.add_column("material_order", col_def)


def downgrade() -> None:
    op.drop_column("material_order", "site_manager_phone")
    op.drop_column("material_order", "site_manager_name")
    op.drop_column("material_order", "payment_terms")
    op.drop_column("material_order", "delivery_terms")
    op.drop_column("material_order", "delivery_address")
    op.drop_column("material_order", "arrival_time")
    op.drop_column("material_order", "arrival_date")
    op.drop_column("material_order", "order_date")
