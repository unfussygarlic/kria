"""Add new profile fields: name, state, identity verification, experience

Revision ID: 0005
Revises: 0004
Create Date: 2026-02-15
"""

from alembic import op
import sqlalchemy as sa

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add 'non_binary' to the gender_type enum.
    # In PostgreSQL 12+ this can run inside a transaction.
    op.execute("ALTER TYPE gender_type ADD VALUE IF NOT EXISTS 'non_binary'")

    # New profile columns
    op.add_column("profiles", sa.Column("first_name", sa.Text, nullable=True))
    op.add_column("profiles", sa.Column("last_name", sa.Text, nullable=True))
    op.add_column("profiles", sa.Column("state", sa.Text, nullable=True))
    op.add_column("profiles", sa.Column("id_type", sa.Text, nullable=True))
    op.add_column("profiles", sa.Column("id_value", sa.Text, nullable=True))
    op.add_column(
        "profiles",
        sa.Column("id_verified_at", sa.TIMESTAMP(timezone=True), nullable=True),
    )
    op.add_column(
        "profiles",
        sa.Column("experience_summary", sa.Text, nullable=True),
    )


def downgrade() -> None:
    # Note: the 'non_binary' enum value cannot be removed in PostgreSQL.
    op.drop_column("profiles", "experience_summary")
    op.drop_column("profiles", "id_verified_at")
    op.drop_column("profiles", "id_value")
    op.drop_column("profiles", "id_type")
    op.drop_column("profiles", "state")
    op.drop_column("profiles", "last_name")
    op.drop_column("profiles", "first_name")
