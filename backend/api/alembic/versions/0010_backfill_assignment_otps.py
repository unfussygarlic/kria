"""Backfill OTPs for existing assigned gig_assignments

Revision ID: 0010
Revises: 0009
Create Date: 2026-02-21

Any assignments accepted before migration 0009 have otp = NULL.
Group them by gig_id so all workers on the same gig share one code (per-gig rule).
"""

from alembic import op

revision = "0010"
down_revision = "0009"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
-- For each gig that has at least one assignment with otp IS NULL,
-- generate one code and apply it to all assignments for that gig.
-- Uses substr(md5(random()::text), 1, 4) to get a 4-char hex string,
-- then maps it to digits 1000–9999 via (('x' || lpad(...))::bit(16)::int % 9000 + 1000).
DO $$
DECLARE
    r RECORD;
    v_otp TEXT;
BEGIN
    FOR r IN
        SELECT DISTINCT gig_id
        FROM gig_assignments
        WHERE otp IS NULL
    LOOP
        -- Generate a 4-digit number (1000–9999)
        v_otp := (1000 + floor(random() * 9000))::int::text;

        UPDATE gig_assignments
        SET otp = v_otp
        WHERE gig_id = r.gig_id
          AND otp IS NULL;
    END LOOP;
END;
$$;
    """)


def downgrade() -> None:
    # Downgrade just NULLs out the backfilled values — non-destructive
    op.execute("""
UPDATE gig_assignments SET otp = NULL;
    """)
