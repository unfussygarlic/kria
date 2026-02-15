"""Seed badge definitions

Revision ID: 0004
Revises: 0003
Create Date: 2026-02-14
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0004"
down_revision: Union[str, None] = "0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
INSERT INTO badges (code, name, description, category, requirements) VALUES
('first_gig',        'First Step',        'Completed your first gig',                       'milestone',    '{"gigs_completed": 1}'),
('gigs_10',          'Getting Started',   'Completed 10 gigs',                               'milestone',    '{"gigs_completed": 10}'),
('gigs_25',          'Rising Star',       'Completed 25 gigs',                               'milestone',    '{"gigs_completed": 25}'),
('gigs_50',          'Veteran',           'Completed 50 gigs',                               'milestone',    '{"gigs_completed": 50}'),
('gigs_100',         'Century',           'Completed 100 gigs',                              'milestone',    '{"gigs_completed": 100}'),
('perfect_10',       'Reliable',          '10 gigs with no issues',                          'reliability',  '{"perfect_streak": 10}'),
('no_show_zero',     'Always There',      'Zero no-shows',                                   'reliability',  '{"no_shows": 0, "min_gigs": 10}'),
('early_bird',       'Early Bird',        'Checked in early 10 times',                       'reliability',  '{"early_checkins": 10}'),
('registration_pro', 'Registration Pro',  'Completed 10 registration desk gigs',             'skill',        '{"category": "registration_desk", "count": 10}'),
('booth_expert',     'Booth Expert',      'Completed 10 booth staff gigs',                   'skill',        '{"category": "booth_staff", "count": 10}'),
('brand_star',       'Brand Star',        'Completed 10 brand ambassador gigs',              'skill',        '{"category": "brand_ambassador", "count": 10}'),
('event_master',     'Event Master',      'Worked 5 different event types',                  'skill',        '{"unique_categories": 5}'),
('first_post',       'Organizer',         'Posted your first gig',                           'community',    '{"gigs_posted": 1}'),
('top_rated',        'Top Rated',         'Maintained 4.8+ rating for 20 gigs',              'community',    '{"min_rating": 4.8, "min_gigs": 20}'),
('momentum_500',     'Momentum Builder',  'Earned 500 momentum',                             'community',    '{"momentum_earned": 500}'),
('momentum_2000',    'Momentum Master',   'Earned 2000 momentum',                            'community',    '{"momentum_earned": 2000}')
ON CONFLICT (code) DO NOTHING;
    """)


def downgrade() -> None:
    op.execute("""
DELETE FROM badges WHERE code IN (
  'first_gig', 'gigs_10', 'gigs_25', 'gigs_50', 'gigs_100',
  'perfect_10', 'no_show_zero', 'early_bird',
  'registration_pro', 'booth_expert', 'brand_star', 'event_master',
  'first_post', 'top_rated', 'momentum_500', 'momentum_2000'
);
    """)
