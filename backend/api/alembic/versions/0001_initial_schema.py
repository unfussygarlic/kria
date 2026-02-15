"""Initial schema: extensions, enums, tables, indexes, triggers

Revision ID: 0001
Revises: None
Create Date: 2026-02-14
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("""
-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Enums
CREATE TYPE gig_category AS ENUM (
  'registration_desk', 'ushering', 'booth_staff', 'brand_ambassador',
  'sampling', 'lead_generation', 'hospitality', 'tech_support',
  'photography', 'social_media', 'anchoring', 'promotional',
  'general_support', 'other'
);

CREATE TYPE pay_type AS ENUM ('fixed', 'hourly', 'per_day');

CREATE TYPE gig_status AS ENUM ('draft', 'open', 'in_progress', 'completed', 'cancelled');

CREATE TYPE application_status AS ENUM ('pending', 'accepted', 'rejected', 'withdrawn');

CREATE TYPE assignment_status AS ENUM (
  'assigned', 'checked_in', 'completed', 'no_show', 'left_early', 'disputed'
);

CREATE TYPE rating_type AS ENUM ('worker_rating', 'poster_rating');

CREATE TYPE gender_type AS ENUM ('male', 'female', 'other', 'prefer_not_to_say');

CREATE TYPE gender_preference AS ENUM ('any', 'male', 'female');

CREATE TYPE momentum_tx_type AS ENUM (
  'gig_completion', 'rating_bonus', 'reliability_bonus', 'first_gig_bonus',
  'streak_bonus', 'referral_bonus', 'boost_spend', 'fee_reduction_spend',
  'priority_matching_spend', 'no_show_penalty', 'left_early_penalty'
);

CREATE TYPE badge_category AS ENUM ('milestone', 'skill', 'reliability', 'community');

-- Profiles (extends Supabase auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  date_of_birth DATE,
  gender gender_type,
  location_point GEOGRAPHY(POINT, 4326),
  location_label TEXT,
  city TEXT,
  is_student BOOLEAN DEFAULT TRUE,
  college_name TEXT,
  college_year INTEGER CHECK (college_year >= 1 AND college_year <= 5),
  course TEXT,
  college_id_url TEXT,
  college_id_verified BOOLEAN DEFAULT FALSE,
  languages TEXT[] DEFAULT ARRAY['english'],
  skills TEXT[] DEFAULT ARRAY[]::TEXT[],
  worker_reputation DECIMAL(3,2) DEFAULT NULL,
  poster_reputation DECIMAL(3,2) DEFAULT NULL,
  total_gigs_completed INTEGER DEFAULT 0,
  total_gigs_posted INTEGER DEFAULT 0,
  reliability_score DECIMAL(3,2) DEFAULT 1.00,
  no_show_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  phone_verified BOOLEAN DEFAULT TRUE,
  id_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Gigs
CREATE TABLE gigs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  poster_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category gig_category NOT NULL,
  company_name TEXT,
  event_name TEXT,
  pay_amount DECIMAL(10,2) NOT NULL CHECK (pay_amount > 0),
  pay_type pay_type NOT NULL DEFAULT 'fixed',
  venue_name TEXT NOT NULL,
  location_point GEOGRAPHY(POINT, 4326),
  location_label TEXT,
  city TEXT NOT NULL,
  event_date DATE NOT NULL,
  event_end_date DATE,
  shift_start_time TIME NOT NULL,
  shift_end_time TIME NOT NULL,
  report_time TIME,
  is_multi_day BOOLEAN DEFAULT FALSE,
  slots_total INTEGER DEFAULT 1 CHECK (slots_total >= 1),
  slots_filled INTEGER DEFAULT 0,
  gender_preference gender_preference DEFAULT 'any',
  min_age INTEGER CHECK (min_age >= 18),
  max_age INTEGER CHECK (max_age <= 65),
  dress_code TEXT,
  languages_required TEXT[] DEFAULT ARRAY['english'],
  skills_required TEXT[] DEFAULT ARRAY[]::TEXT[],
  experience_required BOOLEAN DEFAULT FALSE,
  requirements_note TEXT,
  status gig_status DEFAULT 'draft',
  momentum_boost INTEGER DEFAULT 0 CHECK (momentum_boost >= 0),
  boost_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  application_deadline TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  CONSTRAINT valid_slots CHECK (slots_filled <= slots_total),
  CONSTRAINT valid_age_range CHECK (min_age IS NULL OR max_age IS NULL OR min_age <= max_age),
  CONSTRAINT valid_date_range CHECK (event_end_date IS NULL OR event_end_date >= event_date),
  CONSTRAINT valid_shift_time CHECK (shift_end_time > shift_start_time)
);

-- Gig Applications
CREATE TABLE gig_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status application_status DEFAULT 'pending',
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  UNIQUE(gig_id, applicant_id)
);

-- Gig Assignments
CREATE TABLE gig_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status assignment_status DEFAULT 'assigned',
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  checked_in_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  worker_confirmed BOOLEAN DEFAULT FALSE,
  poster_confirmed BOOLEAN DEFAULT FALSE,
  checkin_location GEOGRAPHY(POINT, 4326),
  UNIQUE(gig_id, worker_id)
);

-- Ratings
CREATE TABLE ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gig_id UUID NOT NULL REFERENCES gigs(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ratee_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating_type rating_type NOT NULL,
  score INTEGER NOT NULL CHECK (score >= 1 AND score <= 5),
  comment TEXT,
  punctuality_score INTEGER CHECK (punctuality_score >= 1 AND punctuality_score <= 5),
  communication_score INTEGER CHECK (communication_score >= 1 AND communication_score <= 5),
  professionalism_score INTEGER CHECK (professionalism_score >= 1 AND professionalism_score <= 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT no_self_rating CHECK (rater_id != ratee_id),
  UNIQUE(gig_id, rater_id, rating_type)
);

-- Momentum Wallets
CREATE TABLE momentum_wallets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0 CHECK (balance >= 0),
  lifetime_earned INTEGER DEFAULT 0,
  lifetime_spent INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Momentum Transactions
CREATE TABLE momentum_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_id UUID NOT NULL REFERENCES momentum_wallets(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  type momentum_tx_type NOT NULL,
  reference_id UUID,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  category badge_category NOT NULL,
  requirements JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Badges
CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, badge_id)
);

-- Indexes: profiles
CREATE INDEX idx_profiles_location ON profiles USING GIST (location_point);
CREATE INDEX idx_profiles_city ON profiles (city);
CREATE INDEX idx_profiles_college ON profiles (college_name) WHERE college_name IS NOT NULL;
CREATE INDEX idx_profiles_is_student ON profiles (is_student);

-- Indexes: gigs
CREATE INDEX idx_gigs_poster ON gigs (poster_id);
CREATE INDEX idx_gigs_status ON gigs (status);
CREATE INDEX idx_gigs_category ON gigs (category);
CREATE INDEX idx_gigs_city ON gigs (city);
CREATE INDEX idx_gigs_location ON gigs USING GIST (location_point);
CREATE INDEX idx_gigs_event_date ON gigs (event_date);
CREATE INDEX idx_gigs_open ON gigs (status, event_date) WHERE status = 'open';
CREATE INDEX idx_gigs_created ON gigs (created_at DESC);

-- Indexes: applications
CREATE INDEX idx_applications_gig ON gig_applications (gig_id);
CREATE INDEX idx_applications_applicant ON gig_applications (applicant_id);
CREATE INDEX idx_applications_pending ON gig_applications (gig_id, status) WHERE status = 'pending';

-- Indexes: assignments
CREATE INDEX idx_assignments_gig ON gig_assignments (gig_id);
CREATE INDEX idx_assignments_worker ON gig_assignments (worker_id);
CREATE INDEX idx_assignments_status ON gig_assignments (status);

-- Indexes: ratings + momentum
CREATE INDEX idx_ratings_ratee ON ratings (ratee_id);
CREATE INDEX idx_ratings_gig ON ratings (gig_id);
CREATE INDEX idx_momentum_tx_wallet ON momentum_transactions (wallet_id);
CREATE INDEX idx_momentum_tx_created ON momentum_transactions (created_at DESC);

-- Auto-update updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER gigs_updated_at
  BEFORE UPDATE ON gigs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER momentum_wallets_updated_at
  BEFORE UPDATE ON momentum_wallets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Distance calculation helper
CREATE OR REPLACE FUNCTION distance_km(point1 GEOGRAPHY, point2 GEOGRAPHY)
RETURNS DECIMAL AS $$
BEGIN
  RETURN ST_Distance(point1, point2) / 1000;
END;
$$ LANGUAGE plpgsql IMMUTABLE;
    """)


def downgrade() -> None:
    # Drop in reverse dependency order
    op.execute("""
DROP FUNCTION IF EXISTS distance_km(GEOGRAPHY, GEOGRAPHY);
DROP TRIGGER IF EXISTS momentum_wallets_updated_at ON momentum_wallets;
DROP TRIGGER IF EXISTS gigs_updated_at ON gigs;
DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
DROP FUNCTION IF EXISTS update_updated_at();
DROP TABLE IF EXISTS user_badges;
DROP TABLE IF EXISTS badges;
DROP TABLE IF EXISTS momentum_transactions;
DROP TABLE IF EXISTS momentum_wallets;
DROP TABLE IF EXISTS ratings;
DROP TABLE IF EXISTS gig_assignments;
DROP TABLE IF EXISTS gig_applications;
DROP TABLE IF EXISTS gigs;
DROP TABLE IF EXISTS profiles;
DROP TYPE IF EXISTS badge_category;
DROP TYPE IF EXISTS momentum_tx_type;
DROP TYPE IF EXISTS gender_preference;
DROP TYPE IF EXISTS gender_type;
DROP TYPE IF EXISTS rating_type;
DROP TYPE IF EXISTS assignment_status;
DROP TYPE IF EXISTS application_status;
DROP TYPE IF EXISTS gig_status;
DROP TYPE IF EXISTS pay_type;
DROP TYPE IF EXISTS gig_category;
    """)
