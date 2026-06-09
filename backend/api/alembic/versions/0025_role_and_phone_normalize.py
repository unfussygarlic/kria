"""Add default_role to profiles; normalize phone numbers to E.164

- default_role ('runner' | 'host') marks how the account was created:
    runner → phone OTP via Pocket
    host   → email OTP via Grid
  Backfilled from existing data: non-kria.dev email → host, else → runner.

- Phone numbers normalized to +91XXXXXXXXXX (standard Indian E.164).
  Handles: +91..., 91..., and raw 10-digit numbers.

Revision ID: 0025
Revises: 0024
Create Date: 2026-06-10
"""

from alembic import op

revision = "0025"
down_revision = "0024"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── 1. Add default_role column ──────────────────────────────────────────────
    op.execute("""
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS default_role TEXT
  CHECK (default_role IN ('runner', 'host'))
    """)

    # Backfill: real email (not the @kria.dev dev-auth address) → host, else → runner.
    op.execute("""
UPDATE public.profiles
SET default_role = CASE
  WHEN email IS NOT NULL AND email NOT LIKE '%@kria.dev' THEN 'host'
  ELSE 'runner'
END
WHERE default_role IS NULL
    """)

    # ── 2. Normalize phone numbers to E.164 (+91XXXXXXXXXX) ────────────────────
    # Strips any spaces/dashes first, then handles the three observed formats:
    #   +91XXXXXXXXXX  → already correct, leave alone
    #   91XXXXXXXXXX   → prepend +
    #   XXXXXXXXXX     → prepend +91  (10-digit Indian mobile)
    op.execute(r"""
UPDATE public.profiles
SET phone = CASE
  WHEN regexp_replace(phone, '[\s\-]', '', 'g') ~ '^\+91[6-9][0-9]{9}$'
    THEN regexp_replace(phone, '[\s\-]', '', 'g')
  WHEN regexp_replace(phone, '[\s\-]', '', 'g') ~ '^91[6-9][0-9]{9}$'
    THEN '+' || regexp_replace(phone, '[\s\-]', '', 'g')
  WHEN regexp_replace(phone, '[\s\-]', '', 'g') ~ '^[6-9][0-9]{9}$'
    THEN '+91' || regexp_replace(phone, '[\s\-]', '', 'g')
  ELSE phone
END
WHERE phone IS NOT NULL
    """)


def downgrade() -> None:
    op.execute("ALTER TABLE public.profiles DROP COLUMN IF EXISTS default_role")
    # Phone normalization is not reversible (original formats are unknown).
