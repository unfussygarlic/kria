"""Add events table and link gigs to events

Revision ID: 0006
Revises: 0005
Create Date: 2026-02-15
"""

from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
-- Events table: groups multiple jobs under one event (e.g. a wedding)
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  venue_name TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT,
  event_date DATE NOT NULL,
  event_end_date DATE,
  is_multi_day BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'open'
    CHECK (status IN ('draft', 'open', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT valid_event_date_range CHECK (
    event_end_date IS NULL OR event_end_date >= event_date
  )
);

CREATE INDEX idx_events_poster ON events (poster_id);
CREATE INDEX idx_events_date   ON events (event_date);
CREATE INDEX idx_events_status ON events (status);

CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: poster owns their events; everyone can read open events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

CREATE POLICY events_poster_all ON events
  FOR ALL
  USING (poster_id = auth.uid());

CREATE POLICY events_read_open ON events
  FOR SELECT
  USING (status = 'open');

-- Link gigs to events (nullable — standalone gigs have event_id = NULL)
ALTER TABLE gigs ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE CASCADE;
CREATE INDEX idx_gigs_event ON gigs (event_id) WHERE event_id IS NOT NULL;
    """)


def downgrade() -> None:
    op.execute("""
DROP INDEX IF EXISTS idx_gigs_event;
ALTER TABLE gigs DROP COLUMN IF EXISTS event_id;
DROP POLICY IF EXISTS events_read_open ON events;
DROP POLICY IF EXISTS events_poster_all ON events;
DROP TRIGGER IF EXISTS events_updated_at ON events;
DROP INDEX IF EXISTS idx_events_status;
DROP INDEX IF EXISTS idx_events_date;
DROP INDEX IF EXISTS idx_events_poster;
DROP TABLE IF EXISTS events;
    """)
