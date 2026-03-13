"""add SSN fields to daily_worker and labor_contract

Revision ID: 012_add_ssn_fields
Revises: 011_add_construction_plan
Create Date: 2026-03-13
"""

from typing import Union

import sqlalchemy as sa
from alembic import op

revision: str = "012_add_ssn_fields"
down_revision: Union[str, None] = "011_add_construction_plan"
branch_labels = None
depends_on = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # daily_worker: 주민등록번호(암호화), 예금주, 안전이수증 필드 추가 (idempotent)
    existing_columns = {col["name"] for col in inspector.get_columns("daily_worker")}
    if "id_number_encrypted" not in existing_columns:
        op.add_column("daily_worker", sa.Column("id_number_encrypted", sa.String(500), nullable=True))
    if "account_holder_name" not in existing_columns:
        op.add_column("daily_worker", sa.Column("account_holder_name", sa.String(50), nullable=True))
    if "safety_cert_number" not in existing_columns:
        op.add_column("daily_worker", sa.Column("safety_cert_number", sa.String(100), nullable=True))
    if "safety_cert_issue_date" not in existing_columns:
        op.add_column("daily_worker", sa.Column("safety_cert_issue_date", sa.Date(), nullable=True))
    if "safety_cert_issuer" not in existing_columns:
        op.add_column("daily_worker", sa.Column("safety_cert_issuer", sa.String(100), nullable=True))

    # labor_contract: worker_id_number VARCHAR(20) → VARCHAR(500) (암호화 저장)
    lc_columns = {col["name"]: col for col in inspector.get_columns("labor_contract")}
    if "worker_id_number" in lc_columns:
        col_type = lc_columns["worker_id_number"]["type"]
        if hasattr(col_type, "length") and col_type.length != 500:
            op.alter_column(
                "labor_contract",
                "worker_id_number",
                existing_type=sa.String(col_type.length),
                type_=sa.String(500),
                existing_nullable=True,
            )


def downgrade() -> None:
    op.alter_column(
        "labor_contract",
        "worker_id_number",
        existing_type=sa.String(500),
        type_=sa.String(20),
        existing_nullable=True,
    )
    op.drop_column("daily_worker", "safety_cert_issuer")
    op.drop_column("daily_worker", "safety_cert_issue_date")
    op.drop_column("daily_worker", "safety_cert_number")
    op.drop_column("daily_worker", "account_holder_name")
    op.drop_column("daily_worker", "id_number_encrypted")
