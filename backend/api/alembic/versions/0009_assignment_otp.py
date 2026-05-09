"""Add OTP check-in columns to gig_assignments

Revision ID: 0009
Revises: 0008
Create Date: 2026-02-21

Per-gig OTP flow:
  - otp: 6-char code generated when first worker is accepted for a gig.
         All workers on the same gig share the same value for now.
         Future: generate per-row for per-assignment OTP (no schema change needed).
  - otp_verified_at: set when the runner successfully enters the code.
                     NULL = not yet verified (pending or no-show).
"""

from alembic import op

revision = "0009"
down_revision = "0008"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
ALTER TABLE gig_assignments
  ADD COLUMN otp              VARCHAR(4),
  ADD COLUMN otp_verified_at  TIMESTAMPTZ;

COMMENT ON COLUMN gig_assignments.otp IS
  'Check-in OTP shown to host. Shared across all assignments for the same gig (per-gig mode). '
  'Change generation logic in accept_applicant to switch to per-assignment mode.';

COMMENT ON COLUMN gig_assignments.otp_verified_at IS
  'Timestamp when runner successfully entered the OTP. NULL until verified.';
    """)


def downgrade() -> None:
    op.execute("""
ALTER TABLE gig_assignments
  DROP COLUMN IF EXISTS otp_verified_at,
  DROP COLUMN IF EXISTS otp;
    """)
