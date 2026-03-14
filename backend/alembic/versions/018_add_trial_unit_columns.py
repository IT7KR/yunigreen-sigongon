"""Add trial_unit columns to signup_trial_policy and organization_trial_override.

Revision ID: 018
Revises: 017
"""

from alembic import op
import sqlalchemy as sa

revision = "018"
down_revision = "017"
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
