"""Add structured work_experience and education_entries to profiles

Revision ID: 0011
Revises: 0010
Create Date: 2026-02-21

work_experience: JSON array of { company, role, from_year, to_year (null = current) }
education_entries: JSON array of { college, degree, field, passing_year }

The old flat columns (is_student, college_name, college_year, course, experience_summary)
are kept as-is for backward compat but are no longer written by the app after this migration.
"""

from alembic import op

revision = "0011"
down_revision = "0010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS work_experience   JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS education_entries JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN profiles.work_experience IS
  'Array of {company, role, from_year, to_year (null = currently working)}';

COMMENT ON COLUMN profiles.education_entries IS
  'Array of {college, degree, field, passing_year}. '
  'passing_year > current year means still a student.';
    """)


def downgrade() -> None:
    op.execute("""
ALTER TABLE profiles
  DROP COLUMN IF EXISTS work_experience,
  DROP COLUMN IF EXISTS education_entries;
    """)
