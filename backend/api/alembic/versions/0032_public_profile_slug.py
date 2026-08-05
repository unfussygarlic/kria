"""Add public_slug to profiles for shareable runner profile URLs.

Each profile gets a URL-friendly slug used at trykria.com/p/{slug} so runners
can share their "career passport" with hosts before/after a gig. Slugs are
generated from first_name + last 6 chars of the user id (e.g. "renu-8ab3d1")
and stored lowercase.

Revision ID: 0032
Revises: 0031
Create Date: 2026-08-05
"""

from alembic import op

revision = "0032"
down_revision = "0031"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE profiles ADD COLUMN IF NOT EXISTS public_slug TEXT UNIQUE;

        -- Backfill: {slugified_first_name}-{last 6 chars of id}. Unaccented,
        -- lowercase, non-alphanumerics collapsed to nothing. Handles rows
        -- with no first_name by falling back to "runner".
        UPDATE profiles
        SET public_slug = LOWER(
            REGEXP_REPLACE(
                COALESCE(NULLIF(first_name, ''), 'runner'),
                '[^a-zA-Z0-9]+', '', 'g'
            )
        ) || '-' || RIGHT(id::text, 6)
        WHERE public_slug IS NULL;

        CREATE INDEX IF NOT EXISTS idx_profiles_public_slug ON profiles (public_slug);
    """)


def downgrade() -> None:
    op.execute("""
        DROP INDEX IF EXISTS idx_profiles_public_slug;
        ALTER TABLE profiles DROP COLUMN IF EXISTS public_slug;
    """)
