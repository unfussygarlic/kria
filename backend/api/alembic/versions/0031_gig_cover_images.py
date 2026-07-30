"""Add cover_image_url and cover_image_square_url to gigs table.

Auto-generated cover art (template-based, not AI) rendered server-side via
Pillow and stored in Supabase Storage. See backend/api/app/covers/ and
memory/features/gig_cover_images.md. cover_image_square_url is the
center-cropped 1080x1080 variant for OG/WhatsApp link previews.

Revision ID: 0031
Revises: 0030
Create Date: 2026-07-30
"""

from alembic import op

revision = "0031"
down_revision = "0030"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        ALTER TABLE gigs ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
        ALTER TABLE gigs ADD COLUMN IF NOT EXISTS cover_image_square_url TEXT;
    """)


def downgrade() -> None:
    op.execute("""
        ALTER TABLE gigs DROP COLUMN IF EXISTS cover_image_square_url;
        ALTER TABLE gigs DROP COLUMN IF EXISTS cover_image_url;
    """)
