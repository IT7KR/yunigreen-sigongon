"""initial schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-01-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel
from sqlalchemy.dialects import postgresql

revision: str = "001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "organization",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column("business_number", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("address", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("phone", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_organization_name", "organization", ["name"])

    op.create_table(
        "user",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("email", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("password_hash", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column("phone", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("role", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("last_login_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organization.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_user_email", "user", ["email"], unique=True)

    op.create_table(
        "pricebook",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=200), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organization.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "pricebook_revision",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("pricebook_id", sa.Uuid(), nullable=False),
        sa.Column("version", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("source_file", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("effective_from", sa.Date(), nullable=True),
        sa.Column("effective_until", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pricebook_id"], ["pricebook.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "catalog_item",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("pricebook_id", sa.Uuid(), nullable=False),
        sa.Column("code", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("name_ko", sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column("name_en", sqlmodel.sql.sqltypes.AutoString(length=300), nullable=True),
        sa.Column("specification", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("unit", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("item_type", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("material_family", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("category", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("subcategory", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pricebook_id"], ["pricebook.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_catalog_item_name_ko", "catalog_item", ["name_ko"])
    op.create_index("ix_catalog_item_material_family", "catalog_item", ["material_family"])

    op.create_table(
        "catalog_item_price",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=False),
        sa.Column("material_cost", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("labor_cost", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("unit_price", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["catalog_item_id"], ["catalog_item.id"]),
        sa.ForeignKeyConstraint(["revision_id"], ["pricebook_revision.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "catalog_item_alias",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(), nullable=False),
        sa.Column("alias_name", sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column("normalized_alias", sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column("source", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["catalog_item_id"], ["catalog_item.id"]),
        sa.ForeignKeyConstraint(["organization_id"], ["organization.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_catalog_item_alias_normalized", "catalog_item_alias", ["normalized_alias"])

    op.create_table(
        "project",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("pricebook_revision_id", sa.Uuid(), nullable=True),
        sa.Column("name", sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column("address", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column("client_name", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("client_phone", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("contracted_at", sa.DateTime(), nullable=True),
        sa.Column("completed_at", sa.DateTime(), nullable=True),
        sa.Column("warranty_expires_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organization.id"]),
        sa.ForeignKeyConstraint(["pricebook_revision_id"], ["pricebook_revision.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_project_status", "project", ["status"])

    op.create_table(
        "site_visit",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("technician_id", sa.Uuid(), nullable=False),
        sa.Column("visit_type", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("visited_at", sa.DateTime(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.ForeignKeyConstraint(["technician_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "photo",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("site_visit_id", sa.Uuid(), nullable=False),
        sa.Column("photo_type", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("caption", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("storage_path", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column("original_filename", sqlmodel.sql.sqltypes.AutoString(length=255), nullable=True),
        sa.Column("taken_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["site_visit_id"], ["site_visit.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "ai_diagnosis",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("site_visit_id", sa.Uuid(), nullable=False),
        sa.Column("model_name", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("leak_opinion_text", sa.Text(), nullable=True),
        sa.Column("confidence_score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("raw_response_json", postgresql.JSONB(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("processing_time_ms", sa.Integer(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["site_visit_id"], ["site_visit.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "ai_material_suggestion",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("ai_diagnosis_id", sa.Uuid(), nullable=False),
        sa.Column("suggested_name", sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column("suggested_spec", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("suggested_unit", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("suggested_quantity", sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column("matched_catalog_item_id", sa.Uuid(), nullable=True),
        sa.Column("match_confidence", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("match_method", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("is_confirmed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["ai_diagnosis_id"], ["ai_diagnosis.id"]),
        sa.ForeignKeyConstraint(["matched_catalog_item_id"], ["catalog_item.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "estimate",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("pricebook_revision_id", sa.Uuid(), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("subtotal", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("vat_amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("total_amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("issued_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.ForeignKeyConstraint(["pricebook_revision_id"], ["pricebook_revision.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "estimate_line",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("estimate_id", sa.Uuid(), nullable=False),
        sa.Column("catalog_item_id", sa.Uuid(), nullable=True),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("description", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column("specification", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("unit", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("quantity", sa.Numeric(precision=15, scale=4), nullable=False),
        sa.Column("unit_price_snapshot", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("source", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["estimate_id"], ["estimate.id"]),
        sa.ForeignKeyConstraint(["catalog_item_id"], ["catalog_item.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "contract",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("estimate_id", sa.Uuid(), nullable=False),
        sa.Column("contract_number", sqlmodel.sql.sqltypes.AutoString(length=50), nullable=True),
        sa.Column("contract_amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("sent_at", sa.DateTime(), nullable=True),
        sa.Column("signed_at", sa.DateTime(), nullable=True),
        sa.Column("start_date", sa.Date(), nullable=True),
        sa.Column("expected_end_date", sa.Date(), nullable=True),
        sa.Column("actual_end_date", sa.Date(), nullable=True),
        sa.Column("client_signature_path", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("company_signature_path", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("document_path", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.ForeignKeyConstraint(["estimate_id"], ["estimate.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "labor_contract",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("worker_name", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=False),
        sa.Column("worker_phone", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("work_date", sa.Date(), nullable=False),
        sa.Column("work_type", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("daily_rate", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("hours_worked", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("worker_signature_path", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("signed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "document_chunk",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("pricebook_revision_id", sa.Uuid(), nullable=True),
        sa.Column("chunk_text", sa.Text(), nullable=False),
        sa.Column("source_file", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=False),
        sa.Column("source_page", sa.Integer(), nullable=True),
        sa.Column("category", sqlmodel.sql.sqltypes.AutoString(length=100), nullable=True),
        sa.Column("embedding", postgresql.ARRAY(sa.Float()), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["pricebook_revision_id"], ["pricebook_revision.id"]),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "price_staging",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("organization_id", sa.Uuid(), nullable=False),
        sa.Column("revision_id", sa.Uuid(), nullable=True),
        sa.Column("extracted_name", sqlmodel.sql.sqltypes.AutoString(length=300), nullable=False),
        sa.Column("extracted_spec", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("extracted_unit", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=True),
        sa.Column("extracted_price", sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column("matched_catalog_item_id", sa.Uuid(), nullable=True),
        sa.Column("confidence", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("confidence_score", sa.Numeric(precision=5, scale=4), nullable=True),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("source_file", sqlmodel.sql.sqltypes.AutoString(length=500), nullable=True),
        sa.Column("source_page", sa.Integer(), nullable=True),
        sa.Column("reviewed_by_id", sa.Uuid(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organization.id"]),
        sa.ForeignKeyConstraint(["revision_id"], ["pricebook_revision.id"]),
        sa.ForeignKeyConstraint(["matched_catalog_item_id"], ["catalog_item.id"]),
        sa.ForeignKeyConstraint(["reviewed_by_id"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("price_staging")
    op.drop_table("document_chunk")
    op.drop_table("labor_contract")
    op.drop_table("contract")
    op.drop_table("estimate_line")
    op.drop_table("estimate")
    op.drop_table("ai_material_suggestion")
    op.drop_table("ai_diagnosis")
    op.drop_table("photo")
    op.drop_table("site_visit")
    op.drop_table("project")
    op.drop_index("ix_catalog_item_alias_normalized", "catalog_item_alias")
    op.drop_table("catalog_item_alias")
    op.drop_table("catalog_item_price")
    op.drop_index("ix_catalog_item_material_family", "catalog_item")
    op.drop_index("ix_catalog_item_name_ko", "catalog_item")
    op.drop_table("catalog_item")
    op.drop_table("pricebook_revision")
    op.drop_table("pricebook")
    op.drop_index("ix_user_email", "user")
    op.drop_table("user")
    op.drop_index("ix_organization_name", "organization")
    op.drop_table("organization")
