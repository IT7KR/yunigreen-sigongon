"""add otp_record table

Revision ID: 009_add_otp_record
Revises: 008_add_cost_calculation
Create Date: 2026-02-28
"""
from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "009_add_otp_record"
down_revision: Union[str, None] = "008_add_cost_calculation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "otp_record",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("request_id", sa.String(length=100), nullable=False),
        sa.Column("phone", sa.String(length=20), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("attempts", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_used", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("request_id"),
    )
    op.create_index("ix_otp_record_request_id", "otp_record", ["request_id"])
    op.create_index("ix_otp_record_phone", "otp_record", ["phone"])


def downgrade() -> None:
    op.drop_index("ix_otp_record_phone", table_name="otp_record")
    op.drop_index("ix_otp_record_request_id", table_name="otp_record")
    op.drop_table("otp_record")
