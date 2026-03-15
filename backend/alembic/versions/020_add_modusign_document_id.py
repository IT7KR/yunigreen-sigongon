"""Add modusign_document_id to modusign_request table.

Revision ID: 020
Revises: 019
"""

from alembic import op
import sqlalchemy as sa

revision = "020_add_modusign_document_id"
down_revision = "019_encrypt_billing_key"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("modusign_request") as batch_op:
        batch_op.add_column(
            sa.Column("modusign_document_id", sa.String(200), nullable=True)
        )


def downgrade() -> None:
    with op.batch_alter_table("modusign_request") as batch_op:
        batch_op.drop_column("modusign_document_id")
