"""Add FTS search_vector columns and GIN indexes to gigs and events

Revision ID: 0012
Revises: 0011
Create Date: 2026-02-21

Strategy:
  - Stored generated tsvector column — auto-updates on INSERT/UPDATE, zero app code needed.
  - GIN index — O(log n) text search regardless of table size.
  - Partial indexes on status = 'open' for gigs — smaller index, faster filter scans.
  - No extra services required (Elasticsearch, etc.) for early scale.
"""

from alembic import op

revision = "0012"
down_revision = "0011"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # GENERATED ALWAYS AS fails because casting an enum (category) to text is
    # not IMMUTABLE in PostgreSQL. The canonical solution for tsvector maintenance
    # is a BEFORE INSERT OR UPDATE trigger — no immutability constraints apply.
    op.execute("""
-- ── Gigs: plain column + trigger ─────────────────────────────────────────────
ALTER TABLE gigs
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION gigs_search_vector_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english'::regconfig,
      coalesce(NEW.title, '') || ' ' ||
      coalesce(NEW.description, '') || ' ' ||
      coalesce(NEW.category::text, '')
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_gigs_search_vector ON gigs;
CREATE TRIGGER trg_gigs_search_vector
  BEFORE INSERT OR UPDATE OF title, description, category
  ON gigs
  FOR EACH ROW EXECUTE FUNCTION gigs_search_vector_update();

-- Backfill existing rows
UPDATE gigs SET search_vector =
  to_tsvector('english'::regconfig,
    coalesce(title, '') || ' ' ||
    coalesce(description, '') || ' ' ||
    coalesce(category::text, '')
  );

CREATE INDEX IF NOT EXISTS idx_gigs_fts
  ON gigs USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_gigs_open_date_id
  ON gigs(event_date ASC NULLS LAST, id)
  WHERE status = 'open';

CREATE INDEX IF NOT EXISTS idx_gigs_open_category
  ON gigs(category)
  WHERE status = 'open';


-- ── Events: plain column + trigger ───────────────────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS search_vector tsvector;

CREATE OR REPLACE FUNCTION events_search_vector_update() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  NEW.search_vector :=
    to_tsvector('english'::regconfig,
      coalesce(NEW.title, '') || ' ' ||
      coalesce(NEW.description, '')
    );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_events_search_vector ON events;
CREATE TRIGGER trg_events_search_vector
  BEFORE INSERT OR UPDATE OF title, description
  ON events
  FOR EACH ROW EXECUTE FUNCTION events_search_vector_update();

-- Backfill existing rows
UPDATE events SET search_vector =
  to_tsvector('english'::regconfig,
    coalesce(title, '') || ' ' ||
    coalesce(description, '')
  );

CREATE INDEX IF NOT EXISTS idx_events_fts
  ON events USING GIN(search_vector);

CREATE INDEX IF NOT EXISTS idx_events_date_id
  ON events(event_date ASC NULLS LAST, id)
  WHERE status IN ('open', 'draft');
    """)


def downgrade() -> None:
    op.execute("""
DROP TRIGGER IF EXISTS trg_events_search_vector ON events;
DROP FUNCTION IF EXISTS events_search_vector_update();
DROP INDEX IF EXISTS idx_events_date_id;
DROP INDEX IF EXISTS idx_events_fts;
ALTER TABLE events DROP COLUMN IF EXISTS search_vector;

DROP TRIGGER IF EXISTS trg_gigs_search_vector ON gigs;
DROP FUNCTION IF EXISTS gigs_search_vector_update();
DROP INDEX IF EXISTS idx_gigs_open_category;
DROP INDEX IF EXISTS idx_gigs_open_date_id;
DROP INDEX IF EXISTS idx_gigs_fts;
ALTER TABLE gigs DROP COLUMN IF EXISTS search_vector;
    """)
