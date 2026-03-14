"""Change billing_key column from VARCHAR(500) to TEXT for Fernet-encrypted storage.

Existing plaintext billing keys (if any) will be invalidated after this migration.
This is acceptable in development; in production, re-issue billing keys after migration.

Revision ID: 019
Revises: 018
"""

from alembic import op
import sqlalchemy as sa

revision = "019"
down_revision = "018"
branch_labels = None
depends_on = None


def upgrade() -> None:
    with op.batch_alter_table("subscription") as batch_op:
        batch_op.alter_column(
            "billing_key",
            type_=sa.Text(),
            existing_nullable=True,
        )


def downgrade() -> None:
    with op.batch_alter_table("subscription") as batch_op:
        batch_op.alter_column(
            "billing_key",
            type_=sa.String(500),
            existing_nullable=True,
        )
