"""material_master_split_specification

Revision ID: 015_mat_master_split_spec
Revises: 014_mat_master_spec
Create Date: 2026-03-13
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "015_mat_master_split_spec"
down_revision: Union[str, None] = "014_mat_master_spec"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add new integer columns
    op.add_column('material_master', sa.Column('specification_part1', sa.Integer(), nullable=True))
    op.add_column('material_master', sa.Column('specification_part2', sa.Integer(), nullable=True))

    # Migrate existing "4/16" style data → part1=4, part2=16
    op.execute("""
        UPDATE material_master
        SET
            specification_part1 = CAST(SPLIT_PART(specification, '/', 1) AS INTEGER),
            specification_part2 = CAST(SPLIT_PART(specification, '/', 2) AS INTEGER)
        WHERE specification IS NOT NULL
          AND specification LIKE '%/%'
          AND SPLIT_PART(specification, '/', 1) ~ '^[0-9]+$'
          AND SPLIT_PART(specification, '/', 2) ~ '^[0-9]+$'
    """)

    # Drop old string column
    op.drop_column('material_master', 'specification')


def downgrade() -> None:
    # Re-add the string column
    op.add_column('material_master', sa.Column('specification', sa.String(255), nullable=True))

    # Restore combined string from integer parts
    op.execute("""
        UPDATE material_master
        SET specification = CAST(specification_part1 AS TEXT) || '/' || CAST(specification_part2 AS TEXT)
        WHERE specification_part1 IS NOT NULL
          AND specification_part2 IS NOT NULL
    """)

    # Drop the integer columns
    op.drop_column('material_master', 'specification_part2')
    op.drop_column('material_master', 'specification_part1')
