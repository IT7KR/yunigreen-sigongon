"""user deletion lifecycle fields and audit log

Revision ID: 017_user_deletion_lifecycle
Revises: 016_add_construction_plan_sections
Create Date: 2026-03-15
"""

from typing import Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects.postgresql import JSON

revision: str = "017_user_deletion_lifecycle"
down_revision: Union[str, None] = "016_add_construction_plan_sections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # ── 1. user 테이블에 컬럼 추가 ───────────────────────────────────────────
    existing_cols = {c["name"] for c in inspector.get_columns("user")}

    if "deleted_at" not in existing_cols:
        op.add_column("user", sa.Column("deleted_at", sa.DateTime(), nullable=True))
    if "deleted_by" not in existing_cols:
        op.add_column("user", sa.Column("deleted_by", sa.BigInteger(), nullable=True))
    if "deletion_reason" not in existing_cols:
        op.add_column("user", sa.Column("deletion_reason", sa.String(length=500), nullable=True))
    if "withdrawal_requested_at" not in existing_cols:
        op.add_column("user", sa.Column("withdrawal_requested_at", sa.DateTime(), nullable=True))
    if "withdrawal_scheduled_at" not in existing_cols:
        op.add_column("user", sa.Column("withdrawal_scheduled_at", sa.DateTime(), nullable=True))
    if "withdrawal_reason" not in existing_cols:
        op.add_column("user", sa.Column("withdrawal_reason", sa.String(length=500), nullable=True))
    if "terminated_at" not in existing_cols:
        op.add_column("user", sa.Column("terminated_at", sa.DateTime(), nullable=True))
    if "terminated_by" not in existing_cols:
        op.add_column("user", sa.Column("terminated_by", sa.BigInteger(), nullable=True))

    # ── 2. username/email unique 제약 → partial unique index로 전환 ───────────
    existing_indexes = {idx["name"] for idx in inspector.get_indexes("user")}
    existing_unique_constraints = {
        uc["name"] for uc in inspector.get_unique_constraints("user")
    }

    # username: 기존 unique constraint/index 제거
    for old_name in ("ix_user_username", "uq_user_username"):
        if old_name in existing_indexes:
            op.drop_index(old_name, table_name="user")
        if old_name in existing_unique_constraints:
            op.drop_constraint(old_name, "user", type_="unique")

    # email: 기존 unique constraint/index 제거
    for old_name in ("ix_user_email", "uq_user_email"):
        if old_name in existing_indexes:
            op.drop_index(old_name, table_name="user")
        if old_name in existing_unique_constraints:
            op.drop_constraint(old_name, "user", type_="unique")

    # partial unique index 생성
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ix_user_username_active
        ON "user" (username)
        WHERE deleted_at IS NULL
        """
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS ix_user_email_active
        ON "user" (email)
        WHERE deleted_at IS NULL AND email IS NOT NULL
        """
    )

    # ── 3. 유예 배치용 인덱스 ────────────────────────────────────────────────
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_user_withdrawal_scheduled
        ON "user" (withdrawal_scheduled_at)
        WHERE withdrawal_scheduled_at IS NOT NULL AND deleted_at IS NULL
        """
    )

    # ── 4. deleted_at 인덱스 ─────────────────────────────────────────────────
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_user_deleted_at
        ON "user" (deleted_at)
        WHERE deleted_at IS NOT NULL
        """
    )

    # ── 5. user_deletion_log 테이블 생성 ─────────────────────────────────────
    existing_tables = inspector.get_table_names()
    if "user_deletion_log" not in existing_tables:
        op.create_table(
            "user_deletion_log",
            sa.Column("id", sa.BigInteger(), nullable=False),
            sa.Column("user_id", sa.BigInteger(), nullable=False),
            sa.Column("deletion_type", sa.String(length=30), nullable=False),
            sa.Column("deleted_by", sa.BigInteger(), nullable=True),
            sa.Column("reason", sa.Text(), nullable=True),
            sa.Column("user_snapshot", JSON(), nullable=False),
            sa.Column("organization_id", sa.BigInteger(), nullable=True),
            sa.Column("retention_expires_at", sa.DateTime(), nullable=False),
            sa.Column("purged_at", sa.DateTime(), nullable=True),
            sa.Column("deleted_at", sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint("id"),
        )
        op.create_index(
            "ix_user_deletion_log_user_id",
            "user_deletion_log",
            ["user_id"],
            unique=False,
        )
        op.create_index(
            "ix_user_deletion_log_deletion_type",
            "user_deletion_log",
            ["deletion_type"],
            unique=False,
        )
        op.create_index(
            "ix_user_deletion_log_organization_id",
            "user_deletion_log",
            ["organization_id"],
            unique=False,
        )
        op.create_index(
            "ix_user_deletion_log_retention_expires_at",
            "user_deletion_log",
            ["retention_expires_at"],
            unique=False,
        )


def downgrade() -> None:
    # ── user_deletion_log 제거 ────────────────────────────────────────────────
    op.drop_index("ix_user_deletion_log_retention_expires_at", table_name="user_deletion_log")
    op.drop_index("ix_user_deletion_log_organization_id", table_name="user_deletion_log")
    op.drop_index("ix_user_deletion_log_deletion_type", table_name="user_deletion_log")
    op.drop_index("ix_user_deletion_log_user_id", table_name="user_deletion_log")
    op.drop_table("user_deletion_log")

    # ── partial index 제거 ────────────────────────────────────────────────────
    op.execute("DROP INDEX IF EXISTS ix_user_deleted_at")
    op.execute("DROP INDEX IF EXISTS ix_user_withdrawal_scheduled")
    op.execute("DROP INDEX IF EXISTS ix_user_email_active")
    op.execute("DROP INDEX IF EXISTS ix_user_username_active")

    # ── 원래 unique index 복구 ────────────────────────────────────────────────
    op.create_index("ix_user_username", "user", ["username"], unique=True)
    op.create_index("ix_user_email", "user", ["email"], unique=True)

    # ── user 컬럼 제거 ────────────────────────────────────────────────────────
    op.drop_column("user", "terminated_by")
    op.drop_column("user", "terminated_at")
    op.drop_column("user", "withdrawal_reason")
    op.drop_column("user", "withdrawal_scheduled_at")
    op.drop_column("user", "withdrawal_requested_at")
    op.drop_column("user", "deletion_reason")
    op.drop_column("user", "deleted_by")
    op.drop_column("user", "deleted_at")
