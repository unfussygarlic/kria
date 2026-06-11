"""Add push_token to profiles for Expo push notifications.

Revision ID: 0029
Revises: 0028
Create Date: 2026-06-11
"""

from alembic import op

revision = "0029"
down_revision = "0028"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE profiles
            ADD COLUMN IF NOT EXISTS push_token TEXT;

        CREATE INDEX IF NOT EXISTS idx_profiles_push_token
            ON profiles (push_token)
            WHERE push_token IS NOT NULL;
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS idx_profiles_push_token;
        ALTER TABLE profiles DROP COLUMN IF EXISTS push_token;
    """)
