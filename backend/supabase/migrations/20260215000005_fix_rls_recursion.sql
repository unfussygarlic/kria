-- Fix RLS infinite recursion on gigs table
--
-- Root cause: circular dependency between gigs and gig_applications RLS policies
--   gigs SELECT policy       → EXISTS on gig_applications (triggers its RLS)
--   gig_applications SELECT  → EXISTS on gigs             (triggers gigs RLS again)
--
-- Fix: SECURITY DEFINER functions bypass the calling table's RLS, breaking the cycle.

-- ── Helper: check if current user is assigned/applied to a gig ──────────────
-- SECURITY DEFINER → runs as function owner (bypasses gig_assignments / gig_applications RLS)
CREATE OR REPLACE FUNCTION is_gig_participant(gig_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gig_assignments
    WHERE gig_id = gig_uuid AND worker_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM gig_applications
    WHERE gig_id = gig_uuid AND applicant_id = auth.uid()
  );
$$;

-- ── Helper: check if current user is the poster of a gig ────────────────────
-- SECURITY DEFINER → runs as function owner (bypasses gigs RLS)
CREATE OR REPLACE FUNCTION is_gig_poster(gig_uuid UUID)
RETURNS BOOLEAN
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM gigs
    WHERE id = gig_uuid AND poster_id = auth.uid()
  );
$$;

-- ── Recreate gigs SELECT policy ─────────────────────────────────────────────
DROP POLICY IF EXISTS "Open gigs viewable by everyone" ON gigs;

CREATE POLICY "Open gigs viewable by everyone"
  ON gigs FOR SELECT
  USING (
    status = 'open'
    OR poster_id = auth.uid()
    OR is_gig_participant(id)
  );

-- ── Recreate gig_applications SELECT policy for posters ─────────────────────
DROP POLICY IF EXISTS "Posters can view applications to their gigs" ON gig_applications;

CREATE POLICY "Posters can view applications to their gigs"
  ON gig_applications FOR SELECT
  USING (
    is_gig_poster(gig_id)
  );
