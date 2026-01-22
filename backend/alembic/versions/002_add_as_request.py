"""add as_request table

Revision ID: 002_as_request
Revises: 001_initial
Create Date: 2026-01-04

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
import sqlmodel

revision: str = "002_as_request"
down_revision: Union[str, None] = "001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "as_request",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("project_id", sa.Uuid(), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("status", sqlmodel.sql.sqltypes.AutoString(length=20), nullable=False),
        sa.Column("photos", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.Column("resolved_at", sa.DateTime(), nullable=True),
        sa.Column("created_by", sa.Uuid(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["project.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["user.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_as_request_project_id", "as_request", ["project_id"])
    op.create_index("ix_as_request_status", "as_request", ["status"])

    op.add_column("project", sa.Column("started_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("project", "started_at")
    op.drop_index("ix_as_request_status", "as_request")
    op.drop_index("ix_as_request_project_id", "as_request")
    op.drop_table("as_request")
