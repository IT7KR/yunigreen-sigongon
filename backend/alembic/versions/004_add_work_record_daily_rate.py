"""add daily_rate to work_record

Revision ID: 004_add_work_record_daily_rate
Revises: 003_drop_fk_add_indexes
Create Date: 2026-02-25

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "004_add_work_record_daily_rate"
down_revision: Union[str, None] = "003_drop_fk_add_indexes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Check if column already exists
    columns = {col["name"] for col in inspector.get_columns("work_record")}
    if "daily_rate" in columns:
        return

    # Add daily_rate column with default 0
    op.add_column(
        "work_record",
        sa.Column("daily_rate", sa.Numeric(12, 2), nullable=False, server_default="0"),
    )

    # Backfill from daily_worker.daily_rate
    op.execute(sa.text("""
        UPDATE work_record wr
        SET daily_rate = dw.daily_rate
        FROM daily_worker dw
        WHERE wr.worker_id = dw.id
    """))


def downgrade() -> None:
    op.drop_column("work_record", "daily_rate")
