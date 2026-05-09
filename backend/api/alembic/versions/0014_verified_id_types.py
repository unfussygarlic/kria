"""Add verified_id_types jsonb array to profiles for multi-ID verification

Revision ID: 0014
Revises: 0013
Create Date: 2026-05-07

Changes:
  - profiles.verified_id_types: jsonb array of verified ID type strings
    e.g. ["aadhaar", "pan", "passport"]
  - id_verified (bool) is preserved for backward-compat with momentum scoring
    and is set TRUE whenever verified_id_types becomes non-empty
"""

from alembic import op

revision = "0014"
down_revision = "0013"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS verified_id_types jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Backfill: if a user already has id_verified=TRUE and id_type is set,
-- carry that type into the new array.
UPDATE profiles
SET verified_id_types = jsonb_build_array(id_type)
WHERE id_verified = TRUE AND id_type IS NOT NULL AND verified_id_types = '[]'::jsonb;
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE profiles DROP COLUMN IF EXISTS verified_id_types;")
