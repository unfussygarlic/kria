-- Kria RLS Policies
-- Row Level Security for all tables
-- Created: 2026-02-14

-- ===========================================
-- ENABLE RLS
-- ===========================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE gigs ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE gig_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE momentum_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE momentum_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- PROFILES
-- ===========================================

CREATE POLICY "Profiles viewable by everyone"
  ON profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ===========================================
-- GIGS
-- ===========================================

-- Anyone can view open gigs
CREATE POLICY "Open gigs viewable by everyone"
  ON gigs FOR SELECT
  USING (
    status = 'open'
    OR poster_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gig_applications
      WHERE gig_id = gigs.id AND applicant_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM gig_assignments
      WHERE gig_id = gigs.id AND worker_id = auth.uid()
    )
  );

CREATE POLICY "Authenticated users can create gigs"
  ON gigs FOR INSERT
  WITH CHECK (auth.uid() = poster_id);

CREATE POLICY "Posters can update own gigs"
  ON gigs FOR UPDATE
  USING (auth.uid() = poster_id);

CREATE POLICY "Posters can delete draft gigs"
  ON gigs FOR DELETE
  USING (auth.uid() = poster_id AND status = 'draft');

-- ===========================================
-- APPLICATIONS
-- ===========================================

CREATE POLICY "Posters can view applications to their gigs"
  ON gig_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE id = gig_applications.gig_id AND poster_id = auth.uid()
    )
  );

CREATE POLICY "Applicants can view own applications"
  ON gig_applications FOR SELECT
  USING (applicant_id = auth.uid());

CREATE POLICY "Users can apply to open gigs"
  ON gig_applications FOR INSERT
  WITH CHECK (
    auth.uid() = applicant_id
    AND EXISTS (
      SELECT 1 FROM gigs
      WHERE id = gig_id
        AND status = 'open'
        AND poster_id != auth.uid()
        AND slots_filled < slots_total
    )
  );

CREATE POLICY "Applicants can withdraw"
  ON gig_applications FOR UPDATE
  USING (applicant_id = auth.uid())
  WITH CHECK (status = 'withdrawn');

CREATE POLICY "Posters can respond to applications"
  ON gig_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE id = gig_applications.gig_id AND poster_id = auth.uid()
    )
  );

-- ===========================================
-- ASSIGNMENTS
-- ===========================================

CREATE POLICY "Assignment participants can view"
  ON gig_assignments FOR SELECT
  USING (
    worker_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM gigs
      WHERE id = gig_assignments.gig_id AND poster_id = auth.uid()
    )
  );

CREATE POLICY "Posters can create assignments"
  ON gig_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE id = gig_id AND poster_id = auth.uid()
    )
  );

CREATE POLICY "Workers can update own assignments"
  ON gig_assignments FOR UPDATE
  USING (worker_id = auth.uid());

CREATE POLICY "Posters can update assignments"
  ON gig_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM gigs
      WHERE id = gig_assignments.gig_id AND poster_id = auth.uid()
    )
  );

-- ===========================================
-- RATINGS
-- ===========================================

CREATE POLICY "Ratings viewable by everyone"
  ON ratings FOR SELECT
  USING (true);

CREATE POLICY "Participants can rate after completion"
  ON ratings FOR INSERT
  WITH CHECK (
    auth.uid() = rater_id
    AND EXISTS (
      SELECT 1 FROM gig_assignments ga
      JOIN gigs g ON ga.gig_id = g.id
      WHERE ga.gig_id = ratings.gig_id
        AND ga.status = 'completed'
        AND (
          (ga.worker_id = auth.uid() AND g.poster_id = ratee_id)
          OR
          (g.poster_id = auth.uid() AND ga.worker_id = ratee_id)
        )
    )
  );

-- ===========================================
-- MOMENTUM
-- ===========================================

CREATE POLICY "Users can view own momentum wallet"
  ON momentum_wallets FOR SELECT
  USING (profile_id = auth.uid());

CREATE POLICY "System creates momentum wallet"
  ON momentum_wallets FOR INSERT
  WITH CHECK (profile_id = auth.uid());

CREATE POLICY "Users can view own momentum transactions"
  ON momentum_transactions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM momentum_wallets
      WHERE id = momentum_transactions.wallet_id
        AND profile_id = auth.uid()
    )
  );

-- ===========================================
-- BADGES
-- ===========================================

CREATE POLICY "Badges viewable by everyone"
  ON badges FOR SELECT
  USING (true);

CREATE POLICY "User badges viewable by everyone"
  ON user_badges FOR SELECT
  USING (true);
