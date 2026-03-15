"""Add trial_unit columns to signup_trial_policy and organization_trial_override.

Revision ID: 018_add_trial_unit_columns
Revises: 017_user_deletion_lifecycle
Create Date: 2026-03-15
"""

from typing import Union

from alembic import op
import sqlalchemy as sa

revision: str = "018_add_trial_unit_columns"
down_revision: Union[str, None] = "017_user_deletion_lifecycle"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "signup_trial_policy",
        sa.Column("default_trial_unit", sa.String(10), nullable=False, server_default="months"),
    )
    op.add_column(
        "organization_trial_override",
        sa.Column("trial_unit", sa.String(10), nullable=False, server_default="months"),
    )


def downgrade() -> None:
    op.drop_column("organization_trial_override", "trial_unit")
    op.drop_column("signup_trial_policy", "default_trial_unit")
