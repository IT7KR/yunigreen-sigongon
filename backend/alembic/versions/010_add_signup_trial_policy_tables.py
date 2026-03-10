"""add signup trial policy tables

Revision ID: 010_add_signup_trial_policy_tables
Revises: 009_add_otp_record
Create Date: 2026-03-06
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "010_add_signup_trial_policy_tables"
down_revision: Union[str, None] = "009_add_otp_record"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "signup_trial_policy",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column(
            "default_trial_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "default_trial_months",
            sa.Integer(),
            nullable=False,
            server_default="1",
        ),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "organization_trial_override",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("organization_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "trial_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
        sa.Column(
            "trial_months",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
        sa.Column("reason", sa.String(length=500), nullable=True),
        sa.Column("updated_by_user_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id"),
    )
    op.create_index(
        "ix_organization_trial_override_organization_id",
        "organization_trial_override",
        ["organization_id"],
        unique=True,
    )
    op.create_index(
        "ix_organization_trial_override_updated_by_user_id",
        "organization_trial_override",
        ["updated_by_user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_organization_trial_override_updated_by_user_id",
        table_name="organization_trial_override",
    )
    op.drop_index(
        "ix_organization_trial_override_organization_id",
        table_name="organization_trial_override",
    )
    op.drop_table("organization_trial_override")
    op.drop_table("signup_trial_policy")
