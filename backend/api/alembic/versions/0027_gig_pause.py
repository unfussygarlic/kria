"""Add is_paused column to gigs table.

Hosts can pause a gig to stop runners from seeing it without cancelling it.
is_paused is orthogonal to status — a gig stays 'open' while paused so
unpausing restores it with zero bookkeeping.

Revision ID: 0027
Revises: 0026
Create Date: 2026-06-10
"""

from alembic import op

revision = "0027"
down_revision = "0026"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE gigs ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE;
        CREATE INDEX IF NOT EXISTS idx_gigs_not_paused ON gigs (poster_id) WHERE NOT is_paused;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS idx_gigs_not_paused;
        ALTER TABLE gigs DROP COLUMN IF EXISTS is_paused;
    """)
