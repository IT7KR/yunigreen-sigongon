"""Update subscription plan enum: starter/standard/premium → trial/basic/pro

Revision ID: 006_update_subscription_plan_enum
Revises: 005_add_device_tokens
Create Date: 2026-02-27

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "006_update_subscription_plan_enum"
down_revision: Union[str, None] = "005_add_device_tokens"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL: ADD VALUE IF NOT EXISTS (can only add, not remove enum values)
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'trial'")
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'basic'")
    op.execute("ALTER TYPE subscriptionplan ADD VALUE IF NOT EXISTS 'pro'")

    # 기존 데이터 마이그레이션 (pre-launch이므로 데이터 거의 없음)
    op.execute("UPDATE subscription SET plan = 'basic' WHERE plan = 'starter'")
    op.execute("UPDATE subscription SET plan = 'pro' WHERE plan = 'standard'")
    op.execute("UPDATE subscription SET plan = 'pro' WHERE plan = 'premium'")


def downgrade() -> None:
    # PostgreSQL enum values cannot be removed, only data can be reverted
    op.execute("UPDATE subscription SET plan = 'starter' WHERE plan = 'basic'")
    op.execute("UPDATE subscription SET plan = 'standard' WHERE plan = 'pro'")
