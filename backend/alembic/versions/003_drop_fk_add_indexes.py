"""drop foreign keys and add application-driven indexes

Revision ID: 003_drop_fk_add_indexes
Revises: 002_as_request
Create Date: 2026-02-19

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "003_drop_fk_add_indexes"
down_revision: Union[str, None] = "002_as_request"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


INDEX_SPECS: list[tuple[str, str, tuple[str, ...]]] = [
    ("ix_project_org_status_created_at", "project", ("organization_id", "status", "created_at")),
    ("ix_site_visit_project_visited_at", "site_visit", ("project_id", "visited_at")),
    ("ix_photo_site_visit_created_at", "photo", ("site_visit_id", "created_at")),
    ("ix_estimate_project_version", "estimate", ("project_id", "version")),
    ("ix_estimate_line_estimate_sort_order", "estimate_line", ("estimate_id", "sort_order")),
    ("ix_ai_diagnosis_site_visit_created_at", "ai_diagnosis", ("site_visit_id", "created_at")),
    ("ix_ai_material_suggestion_diag_confirmed", "ai_material_suggestion", ("ai_diagnosis_id", "is_confirmed")),
    ("ix_photo_album_project_created_at", "photo_album", ("project_id", "created_at")),
    ("ix_album_photo_album_sort_order", "album_photo", ("album_id", "sort_order")),
    ("ix_tax_invoice_project_created_at", "tax_invoice", ("project_id", "created_at")),
    ("ix_payment_org_created_at", "payment", ("organization_id", "created_at")),
    ("ix_material_order_project_created_at", "material_order", ("project_id", "created_at")),
    ("ix_invitation_org_created_at", "invitation", ("organization_id", "created_at")),
    ("ix_daily_worker_org_created_at", "daily_worker", ("organization_id", "created_at")),
    ("ix_work_record_project_work_date", "work_record", ("project_id", "work_date")),
    ("ix_work_record_worker_work_date", "work_record", ("worker_id", "work_date")),
    ("ix_insurance_rate_org_year", "insurance_rate", ("organization_id", "effective_year")),
    ("ix_paystub_worker_created_at", "paystub", ("worker_id", "created_at")),
    ("ix_app_notification_user_read_created_at", "app_notification", ("user_id", "read", "created_at")),
]


def _table_exists(inspector: sa.Inspector, table_name: str) -> bool:
    return table_name in inspector.get_table_names()


def _columns_exist(inspector: sa.Inspector, table_name: str, columns: tuple[str, ...]) -> bool:
    if not _table_exists(inspector, table_name):
        return False
    existing_columns = {col["name"] for col in inspector.get_columns(table_name)}
    return all(col in existing_columns for col in columns)


def _create_index_if_possible(
    inspector: sa.Inspector,
    index_name: str,
    table_name: str,
    columns: tuple[str, ...],
) -> None:
    if not _columns_exist(inspector, table_name, columns):
        return
    columns_sql = ", ".join(f'"{column}"' for column in columns)
    op.execute(sa.text(f'CREATE INDEX IF NOT EXISTS "{index_name}" ON "{table_name}" ({columns_sql})'))


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    # Drop all existing FK constraints. Referential integrity is enforced in application services.
    for table_name in inspector.get_table_names():
        for fk in inspector.get_foreign_keys(table_name):
            fk_name = fk.get("name")
            if fk_name:
                op.drop_constraint(fk_name, table_name, type_="foreignkey")

    for index_name, table_name, columns in INDEX_SPECS:
        _create_index_if_possible(inspector, index_name, table_name, columns)


def downgrade() -> None:
    # FK restore is intentionally omitted; this migration codifies the no-FK policy.
    for index_name, _table_name, _columns in reversed(INDEX_SPECS):
        op.execute(sa.text(f'DROP INDEX IF EXISTS "{index_name}"'))
