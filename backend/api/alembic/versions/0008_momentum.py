"""Add momentum_profiles and momentum_events tables

Revision ID: 0008
Revises: 0007
Create Date: 2026-02-21
"""

from alembic import op

revision = "0008"
down_revision = "0007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
-- ── momentum_profiles ─────────────────────────────────────────────────────────
-- One row per user. Stores the current computed FICO-style scores (300–850)
-- and the raw rolling signals used to derive them.
-- Raw signals are INTERNAL — never exposed directly via API outside the
-- authenticated breakdown endpoint.

CREATE TABLE momentum_profiles (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id          UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  UNIQUE (user_id),

  -- Computed scores (300–850, default 500 for new users)
  worker_score     INTEGER NOT NULL DEFAULT 500
                     CHECK (worker_score BETWEEN 300 AND 850),
  poster_score     INTEGER NOT NULL DEFAULT 500
                     CHECK (poster_score BETWEEN 300 AND 850),

  -- Worker rolling signals (rates: 0.0–1.0; performance: 0.0–5.0)
  worker_show_rate          NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  worker_on_time_rate       NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  worker_performance_score  NUMERIC(4,2) NOT NULL DEFAULT 5.0,
  worker_response_rate      NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  worker_consistency_score  NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  worker_penalty_points     INTEGER      NOT NULL DEFAULT 0,
  worker_gig_count          INTEGER      NOT NULL DEFAULT 0,

  -- Poster rolling signals
  poster_payment_rate       NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  poster_rating             NUMERIC(4,2) NOT NULL DEFAULT 5.0,
  poster_accuracy_rate      NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  poster_resolution_speed   NUMERIC(5,4) NOT NULL DEFAULT 1.0,
  poster_penalty_points     INTEGER      NOT NULL DEFAULT 0,
  poster_gig_count          INTEGER      NOT NULL DEFAULT 0,

  last_calculated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mp_user ON momentum_profiles (user_id);

CREATE TRIGGER momentum_profiles_updated_at
  BEFORE UPDATE ON momentum_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create a momentum_profile row whenever a new profile is created
CREATE OR REPLACE FUNCTION create_momentum_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO momentum_profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_create_momentum
  AFTER INSERT ON profiles
  FOR EACH ROW EXECUTE FUNCTION create_momentum_profile();

-- Back-fill: create momentum_profiles for existing users
INSERT INTO momentum_profiles (user_id)
SELECT id FROM profiles
ON CONFLICT (user_id) DO NOTHING;

-- ── momentum_events ───────────────────────────────────────────────────────────
-- Append-only audit log of every score change event.
-- Useful for investigating score history and detecting farming.

CREATE TABLE momentum_events (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID    NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role        TEXT    NOT NULL CHECK (role IN ('worker', 'poster')),
  event_type  TEXT    NOT NULL,  -- 'gig_complete', 'no_show', 'non_payment', etc.
  delta       INTEGER NOT NULL,  -- positive or negative score change
  score_after INTEGER NOT NULL,  -- score value after applying delta
  reason      TEXT,              -- human-readable explanation
  gig_id      UUID    REFERENCES gigs(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_momentum_events_user ON momentum_events (user_id, created_at DESC);
CREATE INDEX idx_momentum_events_gig  ON momentum_events (gig_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE momentum_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE momentum_events   ENABLE ROW LEVEL SECURITY;

-- Public read: anyone can see scores (but not breakdown signals — that's API-level)
-- Full row access is restricted; the API exposes only curated fields.
CREATE POLICY mp_select_any ON momentum_profiles
  FOR SELECT USING (true);

-- Only the system (via SECURITY DEFINER functions) writes to momentum_profiles
CREATE POLICY mp_insert_system ON momentum_profiles
  FOR INSERT WITH CHECK (false);  -- blocked for direct client inserts

CREATE POLICY mp_update_system ON momentum_profiles
  FOR UPDATE USING (false);  -- blocked for direct client updates

-- Events: users can see their own history only
CREATE POLICY me_select_own ON momentum_events
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY me_insert_system ON momentum_events
  FOR INSERT WITH CHECK (false);  -- only written by backend
    """)


def downgrade() -> None:
    op.execute("""
DROP TRIGGER  IF EXISTS profiles_create_momentum    ON profiles;
DROP FUNCTION IF EXISTS create_momentum_profile();

DROP TRIGGER  IF EXISTS momentum_profiles_updated_at ON momentum_profiles;

DROP POLICY IF EXISTS me_insert_system  ON momentum_events;
DROP POLICY IF EXISTS me_select_own     ON momentum_events;
DROP POLICY IF EXISTS mp_update_system  ON momentum_profiles;
DROP POLICY IF EXISTS mp_insert_system  ON momentum_profiles;
DROP POLICY IF EXISTS mp_select_any     ON momentum_profiles;

DROP INDEX IF EXISTS idx_momentum_events_gig;
DROP INDEX IF EXISTS idx_momentum_events_user;
DROP TABLE IF EXISTS momentum_events;

DROP INDEX IF EXISTS idx_mp_user;
DROP TABLE IF EXISTS momentum_profiles;
    """)
