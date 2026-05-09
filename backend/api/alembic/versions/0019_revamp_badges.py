"""Revamp badge definitions and add streak tracking to profiles

Revision ID: 0019
Revises: 0018
Create Date: 2026-05-09
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "0019"
down_revision: Union[str, None] = "0018"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Convert badge category from enum to text + check constraint ──────────
    # ALTER TYPE ... ADD VALUE cannot run inside a transaction, so we convert
    # the column to text and enforce values via CHECK constraint instead.
    op.execute("ALTER TABLE badges ALTER COLUMN category TYPE text USING category::text")
    op.execute("DROP TYPE IF EXISTS badge_category")
    op.execute("""
        ALTER TABLE badges ADD CONSTRAINT badge_category_check
        CHECK (category IN ('milestone', 'skill', 'reliability', 'community', 'streak', 'identity'))
    """)

    # ── Streak columns on profiles ───────────────────────────────────────────
    op.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS streak_count    INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS longest_streak  INTEGER NOT NULL DEFAULT 0")
    op.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_active_date DATE")

    # ── Replace badge seed data ──────────────────────────────────────────────
    op.execute("""
        DELETE FROM user_badges WHERE badge_id IN (SELECT id FROM badges);
        DELETE FROM badges;
    """)
    op.execute("""
INSERT INTO badges (code, name, description, category, requirements) VALUES
-- Newcomer
('newcomer',          'Newcomer',              'Joined the Kria community',              'milestone', '{}'),

-- Gig milestones
('first_gig',         'First Step',            'Completed your first gig',               'milestone', '{"gigs_completed": 1}'),
('gigs_3',            'On a Roll',             'Completed 3 gigs',                       'milestone', '{"gigs_completed": 3}'),
('gigs_5',            'Getting Started',       'Completed 5 gigs',                       'milestone', '{"gigs_completed": 5}'),
('gigs_10',           'Double Digits',         'Completed 10 gigs',                      'milestone', '{"gigs_completed": 10}'),
('gigs_20',           'Hustler',               'Completed 20 gigs',                      'milestone', '{"gigs_completed": 20}'),
('gigs_50',           'Pro',                   'Completed 50 gigs',                      'milestone', '{"gigs_completed": 50}'),
('gigs_100',          'Legend',                'Completed 100 gigs',                     'milestone', '{"gigs_completed": 100}'),

-- Daily streaks
('streak_10',         '10-Day Streak',         'Active on Kria for 10 consecutive days', 'streak',    '{"streak_days": 10}'),
('streak_50',         '50-Day Streak',         'Active for 50 consecutive days',         'streak',    '{"streak_days": 50}'),
('streak_100',        '100-Day Streak',        'Active for 100 consecutive days',        'streak',    '{"streak_days": 100}'),
('streak_200',        '200-Day Streak',        'Active for 200 consecutive days',        'streak',    '{"streak_days": 200}'),
('streak_500',        '500-Day Streak',        'Active for 500 consecutive days',        'streak',    '{"streak_days": 500}'),

-- ID verification
('id_aadhaar',        'Aadhaar Verified',      'Verified Aadhaar card',                  'identity',  '{"id_type": "aadhaar"}'),
('id_pan',            'PAN Verified',          'Verified PAN card',                      'identity',  '{"id_type": "pan"}'),
('id_driving_licence','Driving Licence',       'Verified driving licence',               'identity',  '{"id_type": "driving_licence"}'),
('id_passport',       'Passport Verified',     'Verified passport',                      'identity',  '{"id_type": "passport"}'),
('id_voter_id',       'Voter ID Verified',     'Verified voter ID',                      'identity',  '{"id_type": "voter_id"}')
ON CONFLICT (code) DO UPDATE SET
    name        = EXCLUDED.name,
    description = EXCLUDED.description,
    category    = EXCLUDED.category,
    requirements= EXCLUDED.requirements;
    """)


def downgrade() -> None:
    op.execute("DELETE FROM user_badges WHERE badge_id IN (SELECT id FROM badges)")
    op.execute("DELETE FROM badges")
    op.execute("ALTER TABLE badges DROP CONSTRAINT IF EXISTS badge_category_check")
    op.execute("CREATE TYPE badge_category AS ENUM ('milestone','skill','reliability','community')")
    op.execute("ALTER TABLE badges ALTER COLUMN category TYPE badge_category USING category::badge_category")
    op.execute("ALTER TABLE profiles DROP COLUMN IF EXISTS streak_count")
    op.execute("ALTER TABLE profiles DROP COLUMN IF EXISTS longest_streak")
    op.execute("ALTER TABLE profiles DROP COLUMN IF EXISTS last_active_date")
