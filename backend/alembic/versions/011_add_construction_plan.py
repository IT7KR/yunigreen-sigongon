"""add construction plan tables

Revision ID: 011_add_construction_plan
Revises: 010_add_signup_trial_policy_tables
Create Date: 2026-03-11
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "011_add_construction_plan"
down_revision: Union[str, None] = "010_add_signup_trial_policy_tables"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "construction_plan",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("project_id", sa.BigInteger(), nullable=False),
        sa.Column("organization_id", sa.BigInteger(), nullable=False),
        sa.Column("title", sa.String(length=200), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_by", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("project_id"),
    )
    op.create_index(
        "ix_construction_plan_project_id",
        "construction_plan",
        ["project_id"],
        unique=True,
    )
    op.create_index(
        "ix_construction_plan_organization_id",
        "construction_plan",
        ["organization_id"],
        unique=False,
    )

    op.create_table(
        "construction_phase",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("plan_id", sa.BigInteger(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("planned_start", sa.Date(), nullable=False),
        sa.Column("planned_end", sa.Date(), nullable=False),
        sa.Column("actual_start", sa.Date(), nullable=True),
        sa.Column("actual_end", sa.Date(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("completed_by", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_construction_phase_plan_id",
        "construction_phase",
        ["plan_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_construction_phase_plan_id", table_name="construction_phase")
    op.drop_table("construction_phase")
    op.drop_index("ix_construction_plan_organization_id", table_name="construction_plan")
    op.drop_index("ix_construction_plan_project_id", table_name="construction_plan")
    op.drop_table("construction_plan")
