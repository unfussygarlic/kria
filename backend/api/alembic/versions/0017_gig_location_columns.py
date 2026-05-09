"""Add plain venue_lat, venue_lng, venue_formatted_address columns to gigs.

PostGIS location_point returns WKB hex from Supabase JS — unreadable on the
client. These plain columns mirror it so the mobile app and Grid can render
a tappable Google Maps link without PostGIS overhead.

Revision ID: 0017
Revises: 0016
Create Date: 2026-05-08
"""

from alembic import op
import sqlalchemy as sa

revision = "0017"
down_revision = "0016"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("gigs", sa.Column("venue_lat", sa.Float(), nullable=True))
    op.add_column("gigs", sa.Column("venue_lng", sa.Float(), nullable=True))
    op.add_column("gigs", sa.Column("venue_formatted_address", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("gigs", "venue_formatted_address")
    op.drop_column("gigs", "venue_lng")
    op.drop_column("gigs", "venue_lat")
