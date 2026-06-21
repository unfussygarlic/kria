"""Add is_admin to profiles and create support_queries table

Revision ID: 0030
Revises: 0029
Create Date: 2026-06-21
"""
from alembic import op
import sqlalchemy as sa

revision = "0030"
down_revision = "0029"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # is_admin flag on profiles
    op.add_column(
        "profiles",
        sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"),
    )

    # support_queries table
    op.execute("""
        CREATE TABLE IF NOT EXISTS support_queries (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
            category    TEXT NOT NULL,
            subject     TEXT NOT NULL,
            message     TEXT NOT NULL,
            email       TEXT NOT NULL,
            status      TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'in_progress', 'resolved')),
            admin_note  TEXT,
            created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
            updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_support_queries_status
        ON support_queries (status, created_at DESC)
    """)

    op.execute("""
        CREATE INDEX IF NOT EXISTS idx_support_queries_user
        ON support_queries (user_id)
    """)

    # Auto-update updated_at
    op.execute("""
        CREATE OR REPLACE FUNCTION update_support_query_updated_at()
        RETURNS TRIGGER LANGUAGE plpgsql AS $$
        BEGIN
            NEW.updated_at = NOW();
            RETURN NEW;
        END;
        $$
    """)
    op.execute("""
        DROP TRIGGER IF EXISTS trg_support_queries_updated_at ON support_queries;
        CREATE TRIGGER trg_support_queries_updated_at
        BEFORE UPDATE ON support_queries
        FOR EACH ROW EXECUTE FUNCTION update_support_query_updated_at()
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_support_queries_updated_at ON support_queries")
    op.execute("DROP FUNCTION IF EXISTS update_support_query_updated_at()")
    op.execute("DROP TABLE IF EXISTS support_queries")
    op.drop_column("profiles", "is_admin")
