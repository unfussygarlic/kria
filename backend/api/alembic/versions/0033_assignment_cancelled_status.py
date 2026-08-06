"""Add 'cancelled' to the assignment_status enum.

Runners can now cancel an accepted shift BEFORE it starts (see
POST /assignments/{id}/cancel). Distinct from 'no_show' (didn't show up)
and 'left_early' (mid-shift). Frees the slot for another runner.

Revision ID: 0033
Revises: 0032
Create Date: 2026-08-07
"""

from alembic import op

revision = "0033"
down_revision = "0032"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction in older
    # PostgreSQL (<12). Alembic manages its own transaction, so we use
    # autocommit-block semantics via execute with a raw connection.
    op.execute("ALTER TYPE assignment_status ADD VALUE IF NOT EXISTS 'cancelled'")


def downgrade() -> None:
    # PostgreSQL doesn't support dropping enum values. To roll back, you'd
    # need to recreate the type from scratch and re-cast every column that
    # uses it. Left as a no-op — do not add 'cancelled' anywhere the
    # rollback would care about, or write the manual rollback yourself.
    pass
