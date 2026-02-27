"""add device_tokens table for FCM push notifications

Revision ID: 005_add_device_tokens
Revises: 004_add_work_record_daily_rate
Create Date: 2026-02-26

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "005_add_device_tokens"
down_revision: Union[str, None] = "004_add_work_record_daily_rate"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing_tables = inspector.get_table_names()

    if "device_token" in existing_tables:
        return

    op.create_table(
        "device_token",
        sa.Column("id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column(
            "platform",
            sa.String(length=10),
            nullable=False,
            comment="'ios' or 'android'",
        ),
        sa.Column("token", sa.Text(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            onupdate=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # 사용자별 토큰 조회 인덱스
    op.create_index(
        "ix_device_token_user_id",
        "device_token",
        ["user_id"],
    )

    # 토큰 유니크 인덱스 (중복 등록 방지)
    op.create_index(
        "ix_device_token_token",
        "device_token",
        ["token"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("ix_device_token_token", table_name="device_token")
    op.drop_index("ix_device_token_user_id", table_name="device_token")
    op.drop_table("device_token")
