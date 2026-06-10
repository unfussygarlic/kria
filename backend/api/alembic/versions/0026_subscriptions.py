"""Add subscriptions table for trial and billing management.

trial_duration_days is stored per-user at signup time so future changes to
DEFAULT_TRIAL_DAYS in config never affect existing users' trial periods.

Revision ID: 0026
Revises: 0025
Create Date: 2026-06-10
"""

from alembic import op

revision = "0026"
down_revision = "0025"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
CREATE TABLE public.subscriptions (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan                TEXT        NOT NULL DEFAULT 'trial'
                                  CHECK (plan IN ('trial', 'active', 'expired', 'cancelled')),
  trial_ends_at       TIMESTAMPTZ,
  trial_duration_days INTEGER     NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id)
);

CREATE INDEX idx_subscriptions_user_id      ON public.subscriptions (user_id);
CREATE INDEX idx_subscriptions_trial_ends   ON public.subscriptions (trial_ends_at)
  WHERE trial_ends_at IS NOT NULL;
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS public.subscriptions")
