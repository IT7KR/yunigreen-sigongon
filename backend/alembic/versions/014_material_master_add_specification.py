"""material_master_add_specification

Revision ID: 014_material_master_specification
Revises: 013_material_order_delivery
Create Date: 2026-03-13
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "014_mat_master_spec"
down_revision: Union[str, None] = "013_material_order_delivery"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('material_master', sa.Column('specification', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('material_master', 'specification')
