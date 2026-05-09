"""Rescale Momentum: 0-1000, 6 bands, nullable signals, drop unused columns

Revision ID: 0013
Revises: 0012
Create Date: 2026-05-06

Changes:
  - worker_score / poster_score: range 300-850 → 0-1000, default 500 → 0
  - Signal columns made nullable (NULL = no data yet, excluded from scoring)
  - Drop worker_response_rate, worker_consistency_score (no data path)
  - Add worker_communication_score, worker_professionalism_score
  - Reset all scores to 0 (will rebuild naturally on next gig events)
"""

from alembic import op

revision = "0013"
down_revision = "0012"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
-- ── Score range ───────────────────────────────────────────────────────────────
ALTER TABLE momentum_profiles
  DROP CONSTRAINT IF EXISTS momentum_profiles_worker_score_check,
  DROP CONSTRAINT IF EXISTS momentum_profiles_poster_score_check,
  ADD CONSTRAINT momentum_profiles_worker_score_check CHECK (worker_score BETWEEN 0 AND 1000),
  ADD CONSTRAINT momentum_profiles_poster_score_check CHECK (poster_score BETWEEN 0 AND 1000),
  ALTER COLUMN worker_score SET DEFAULT 0,
  ALTER COLUMN poster_score SET DEFAULT 0;

-- ── Make signal columns nullable ──────────────────────────────────────────────
-- NULL means "no data yet" — excluded from score calculation rather than treated as 0.
ALTER TABLE momentum_profiles
  ALTER COLUMN worker_show_rate         DROP NOT NULL,
  ALTER COLUMN worker_on_time_rate      DROP NOT NULL,
  ALTER COLUMN worker_performance_score DROP NOT NULL,
  ALTER COLUMN worker_show_rate         DROP DEFAULT,
  ALTER COLUMN worker_on_time_rate      DROP DEFAULT,
  ALTER COLUMN worker_performance_score DROP DEFAULT;

-- ── Drop signals with no data path ───────────────────────────────────────────
ALTER TABLE momentum_profiles
  DROP COLUMN IF EXISTS worker_response_rate,
  DROP COLUMN IF EXISTS worker_consistency_score;

-- ── Add new computable signals ────────────────────────────────────────────────
ALTER TABLE momentum_profiles
  ADD COLUMN IF NOT EXISTS worker_communication_score   NUMERIC(4,2),
  ADD COLUMN IF NOT EXISTS worker_professionalism_score NUMERIC(4,2);

-- ── Reset all scores so they rebuild from real data ───────────────────────────
UPDATE momentum_profiles SET
  worker_score               = 0,
  poster_score               = 0,
  worker_show_rate           = NULL,
  worker_on_time_rate        = NULL,
  worker_performance_score   = NULL,
  worker_communication_score = NULL,
  worker_professionalism_score = NULL;
    """)


def downgrade() -> None:
    op.execute("""
ALTER TABLE momentum_profiles
  DROP CONSTRAINT IF EXISTS momentum_profiles_worker_score_check,
  DROP CONSTRAINT IF EXISTS momentum_profiles_poster_score_check,
  ADD CONSTRAINT momentum_profiles_worker_score_check CHECK (worker_score BETWEEN 300 AND 850),
  ADD CONSTRAINT momentum_profiles_poster_score_check CHECK (poster_score BETWEEN 300 AND 850),
  ALTER COLUMN worker_score SET DEFAULT 500,
  ALTER COLUMN poster_score SET DEFAULT 500,
  ALTER COLUMN worker_show_rate         SET NOT NULL,
  ALTER COLUMN worker_on_time_rate      SET NOT NULL,
  ALTER COLUMN worker_performance_score SET NOT NULL,
  DROP COLUMN IF EXISTS worker_communication_score,
  DROP COLUMN IF EXISTS worker_professionalism_score,
  ADD COLUMN worker_response_rate    NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  ADD COLUMN worker_consistency_score NUMERIC(5,4) NOT NULL DEFAULT 1.0;
    """)
