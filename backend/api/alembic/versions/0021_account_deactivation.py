"""Add account deactivation columns to profiles

Revision ID: 0021
Revises: 0020
Create Date: 2026-06-06
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0021"
down_revision: Union[str, None] = "0020"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE profiles
        ADD COLUMN IF NOT EXISTS is_active        BOOLEAN     NOT NULL DEFAULT TRUE,
        ADD COLUMN IF NOT EXISTS deactivated_at   TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS reactivate_at    TIMESTAMPTZ
    """)

    with op.get_context().autocommit_block():
        op.execute("""
            CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_reactivate_at
            ON profiles(reactivate_at)
            WHERE reactivate_at IS NOT NULL AND is_active = FALSE
        """)


def downgrade() -> None:
    with op.get_context().autocommit_block():
        op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_profiles_reactivate_at")
    op.execute("""
        ALTER TABLE profiles
        DROP COLUMN IF EXISTS reactivate_at,
        DROP COLUMN IF EXISTS deactivated_at,
        DROP COLUMN IF EXISTS is_active
    """)
