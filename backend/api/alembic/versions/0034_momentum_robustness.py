"""Momentum robustness overhaul: penalty rows, richer audit, half-life ready.

Fixes two classes of bug and lays the groundwork for time-decayed scoring:

1. Debounce race: applicants.py wrote worker_penalty_points then called
   recalculate_momentum(), which silently no-oped inside 60s of a prior
   recalc. The penalty was persisted but the score wasn't recomputed,
   so scores appeared to plunge on the *next* unrelated event. Root cause
   is that penalty writes and score writes lived in different paths.

2. Monotonic penalties: worker_penalty_points only grew. A no-show 6 months
   ago still docked 100 pts forever. This migration replaces the integer
   column with a row-per-penalty table so recalculate.py can compute a
   time-decayed effective total instead.

Also extends momentum_events with score_before / signal_snapshot /
penalty_snapshot / actor_id so support can reconstruct exactly why a score
moved without spelunking through git history and gig assignments.

Backfill strategy for existing worker_penalty_points:
- For every gig_assignment with status IN ('no_show', 'left_early'),
  insert a penalty row dated to the gig's event_date. This reconstructs
  the audit trail from real events.
- Any residual (users whose stored penalty > reconstructed penalties)
  gets a single 'legacy_adjustment' row dated to today so the total
  matches what the previous system charged them. Zero score change on
  first recalc; only future decay differs.

Revision ID: 0034
Revises: 0033
Create Date: 2026-08-07
"""

from alembic import op

revision = "0034"
down_revision = "0033"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
-- ── momentum_penalties ────────────────────────────────────────────────────────
-- Row-per-penalty replacement for momentum_profiles.worker_penalty_points.
-- The old integer column stays for one migration cycle (dropped in 0035)
-- so a rollback is possible.

CREATE TABLE momentum_penalties (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id        UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  assignment_id  UUID REFERENCES gig_assignments(id) ON DELETE SET NULL,
  gig_id         UUID REFERENCES gigs(id) ON DELETE SET NULL,
  kind           TEXT NOT NULL CHECK (kind IN (
                   'no_show', 'left_early', 'late_cancellation',
                   'repeated_dispute', 'legacy_adjustment'
                 )),
  points         INTEGER NOT NULL CHECK (points > 0),
  occurred_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_momentum_penalties_user
  ON momentum_penalties (user_id, occurred_at DESC);

-- Idempotency: never charge the same assignment twice for the same kind.
-- Partial index so legacy_adjustment (with NULL assignment_id) is exempt.
CREATE UNIQUE INDEX idx_momentum_penalties_uniq_assignment
  ON momentum_penalties (assignment_id, kind)
  WHERE assignment_id IS NOT NULL;

ALTER TABLE momentum_penalties ENABLE ROW LEVEL SECURITY;

CREATE POLICY mpe_select_own ON momentum_penalties
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY mpe_insert_system ON momentum_penalties
  FOR INSERT WITH CHECK (false);

-- ── momentum_events audit extensions ─────────────────────────────────────────
-- Columns are nullable so existing rows remain valid. New writes populate
-- all four so support can answer "what changed and who caused it".

ALTER TABLE momentum_events
  ADD COLUMN IF NOT EXISTS score_before             INTEGER,
  ADD COLUMN IF NOT EXISTS signal_snapshot          JSONB,
  ADD COLUMN IF NOT EXISTS penalty_snapshot         JSONB,
  ADD COLUMN IF NOT EXISTS actor_id                 UUID
    REFERENCES profiles(id) ON DELETE SET NULL;

-- ── Backfill from historical assignments ─────────────────────────────────────
-- Insert one penalty row per past no_show / left_early. Dated to the gig's
-- event_date so time-decay math treats them as historical (starts decaying
-- immediately instead of "penalty was applied today").
-- Assignments without a gig event_date are skipped (shouldn't happen; guard).

INSERT INTO momentum_penalties (user_id, assignment_id, gig_id, kind, points, occurred_at, notes)
SELECT
  asgn.worker_id,
  asgn.id,
  asgn.gig_id,
  asgn.status::text,
  CASE asgn.status::text
    WHEN 'no_show'    THEN 100
    WHEN 'left_early' THEN 50
    ELSE 0
  END,
  (g.event_date::timestamp AT TIME ZONE 'Asia/Kolkata'),
  'backfilled from historical gig_assignment'
FROM gig_assignments asgn
JOIN gigs g ON g.id = asgn.gig_id
WHERE asgn.status::text IN ('no_show', 'left_early')
  AND g.event_date IS NOT NULL
ON CONFLICT (assignment_id, kind) WHERE assignment_id IS NOT NULL
DO NOTHING;

-- Reconcile: if a user's stored worker_penalty_points exceeds what we
-- reconstructed, add a legacy_adjustment for the residual dated to today
-- so their effective score is unchanged at the moment of migration.

INSERT INTO momentum_penalties (user_id, kind, points, occurred_at, notes)
SELECT
  mp.user_id,
  'legacy_adjustment',
  (mp.worker_penalty_points - COALESCE(reconstructed.total, 0))::int,
  NOW(),
  'residual after backfill; no historical assignment to attribute to'
FROM momentum_profiles mp
LEFT JOIN (
  SELECT user_id, SUM(points) AS total
  FROM momentum_penalties
  GROUP BY user_id
) reconstructed ON reconstructed.user_id = mp.user_id
WHERE mp.worker_penalty_points > COALESCE(reconstructed.total, 0);

    """)


def downgrade() -> None:
    op.execute("""
ALTER TABLE momentum_events
  DROP COLUMN IF EXISTS actor_id,
  DROP COLUMN IF EXISTS penalty_snapshot,
  DROP COLUMN IF EXISTS signal_snapshot,
  DROP COLUMN IF EXISTS score_before;

DROP POLICY IF EXISTS mpe_insert_system ON momentum_penalties;
DROP POLICY IF EXISTS mpe_select_own    ON momentum_penalties;

DROP INDEX IF EXISTS idx_momentum_penalties_uniq_assignment;
DROP INDEX IF EXISTS idx_momentum_penalties_user;
DROP TABLE IF EXISTS momentum_penalties;
    """)
