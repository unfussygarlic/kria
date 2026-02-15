-- Kriya Database Functions
-- Auth triggers, momentum handling, gig lifecycle
-- Created: 2026-02-14

-- ===========================================
-- AUTH: Auto-create profile and wallets
-- ===========================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (id, phone, display_name)
  VALUES (
    NEW.id,
    NEW.phone,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User')
  );

  -- Create momentum wallet
  INSERT INTO public.momentum_wallets (profile_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ===========================================
-- MOMENTUM: Add/spend functions
-- ===========================================

CREATE OR REPLACE FUNCTION add_momentum(
  p_profile_id UUID,
  p_amount INTEGER,
  p_type momentum_tx_type,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS momentum_transactions AS $$
DECLARE
  v_wallet_id UUID;
  v_transaction momentum_transactions;
BEGIN
  SELECT id INTO v_wallet_id
  FROM momentum_wallets
  WHERE profile_id = p_profile_id;

  IF v_wallet_id IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;

  INSERT INTO momentum_transactions (wallet_id, amount, type, reference_id, description)
  VALUES (v_wallet_id, p_amount, p_type, p_reference_id, p_description)
  RETURNING * INTO v_transaction;

  UPDATE momentum_wallets
  SET
    balance = balance + p_amount,
    lifetime_earned = CASE WHEN p_amount > 0 THEN lifetime_earned + p_amount ELSE lifetime_earned END,
    lifetime_spent = CASE WHEN p_amount < 0 THEN lifetime_spent + ABS(p_amount) ELSE lifetime_spent END
  WHERE id = v_wallet_id;

  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION spend_momentum(
  p_profile_id UUID,
  p_amount INTEGER,
  p_type momentum_tx_type,
  p_reference_id UUID DEFAULT NULL,
  p_description TEXT DEFAULT NULL
) RETURNS momentum_transactions AS $$
DECLARE
  v_balance INTEGER;
BEGIN
  SELECT balance INTO v_balance
  FROM momentum_wallets
  WHERE profile_id = p_profile_id;

  IF v_balance < p_amount THEN
    RAISE EXCEPTION 'Insufficient momentum. Have: %, Need: %', v_balance, p_amount;
  END IF;

  RETURN add_momentum(p_profile_id, -p_amount, p_type, p_reference_id, p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- APPLICATIONS: Accept and create assignment
-- ===========================================

CREATE OR REPLACE FUNCTION accept_application(
  p_application_id UUID
) RETURNS gig_assignments AS $$
DECLARE
  v_app gig_applications;
  v_gig gigs;
  v_assignment gig_assignments;
BEGIN
  SELECT * INTO v_app FROM gig_applications WHERE id = p_application_id;

  IF v_app IS NULL THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF v_app.status != 'pending' THEN
    RAISE EXCEPTION 'Application not pending';
  END IF;

  SELECT * INTO v_gig FROM gigs WHERE id = v_app.gig_id;

  IF v_gig.slots_filled >= v_gig.slots_total THEN
    RAISE EXCEPTION 'All slots filled';
  END IF;

  -- Update application
  UPDATE gig_applications
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_application_id;

  -- Create assignment
  INSERT INTO gig_assignments (gig_id, worker_id)
  VALUES (v_app.gig_id, v_app.applicant_id)
  RETURNING * INTO v_assignment;

  -- Update slots
  UPDATE gigs
  SET
    slots_filled = slots_filled + 1,
    status = CASE
      WHEN slots_filled + 1 >= slots_total THEN 'in_progress'::gig_status
      ELSE status
    END
  WHERE id = v_app.gig_id;

  RETURN v_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ASSIGNMENTS: Check-in worker
-- ===========================================

CREATE OR REPLACE FUNCTION checkin_worker(
  p_assignment_id UUID,
  p_location GEOGRAPHY DEFAULT NULL
) RETURNS gig_assignments AS $$
DECLARE
  v_assignment gig_assignments;
BEGIN
  UPDATE gig_assignments
  SET
    status = 'checked_in',
    checked_in_at = NOW(),
    checkin_location = p_location
  WHERE id = p_assignment_id
    AND worker_id = auth.uid()
    AND status = 'assigned'
  RETURNING * INTO v_assignment;

  IF v_assignment IS NULL THEN
    RAISE EXCEPTION 'Assignment not found or already checked in';
  END IF;

  RETURN v_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ASSIGNMENTS: Complete gig
-- ===========================================

CREATE OR REPLACE FUNCTION complete_assignment(
  p_assignment_id UUID,
  p_confirmer_role TEXT  -- 'worker' or 'poster'
) RETURNS gig_assignments AS $$
DECLARE
  v_assignment gig_assignments;
  v_gig gigs;
BEGIN
  SELECT * INTO v_assignment FROM gig_assignments WHERE id = p_assignment_id;
  SELECT * INTO v_gig FROM gigs WHERE id = v_assignment.gig_id;

  -- Verify caller is participant
  IF p_confirmer_role = 'worker' AND v_assignment.worker_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF p_confirmer_role = 'poster' AND v_gig.poster_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Update confirmation
  IF p_confirmer_role = 'worker' THEN
    UPDATE gig_assignments SET worker_confirmed = true WHERE id = p_assignment_id;
  ELSE
    UPDATE gig_assignments SET poster_confirmed = true WHERE id = p_assignment_id;
  END IF;

  -- Refresh
  SELECT * INTO v_assignment FROM gig_assignments WHERE id = p_assignment_id;

  -- If both confirmed
  IF v_assignment.worker_confirmed AND v_assignment.poster_confirmed THEN
    UPDATE gig_assignments
    SET status = 'completed', completed_at = NOW()
    WHERE id = p_assignment_id;

    -- Award momentum
    PERFORM add_momentum(
      v_assignment.worker_id,
      50,
      'gig_completion',
      v_gig.id,
      'Completed: ' || v_gig.title
    );

    PERFORM add_momentum(
      v_gig.poster_id,
      30,
      'gig_completion',
      v_gig.id,
      'Gig completed: ' || v_gig.title
    );

    -- Update stats
    UPDATE profiles
    SET total_gigs_completed = total_gigs_completed + 1
    WHERE id = v_assignment.worker_id;

    -- Check if all slots done
    IF (SELECT COUNT(*) FROM gig_assignments WHERE gig_id = v_gig.id AND status = 'completed') >= v_gig.slots_total THEN
      UPDATE gigs SET status = 'completed' WHERE id = v_gig.id;
    END IF;
  END IF;

  SELECT * INTO v_assignment FROM gig_assignments WHERE id = p_assignment_id;
  RETURN v_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- ASSIGNMENTS: Mark no-show
-- ===========================================

CREATE OR REPLACE FUNCTION mark_no_show(
  p_assignment_id UUID
) RETURNS gig_assignments AS $$
DECLARE
  v_assignment gig_assignments;
  v_gig gigs;
BEGIN
  SELECT * INTO v_assignment FROM gig_assignments WHERE id = p_assignment_id;
  SELECT * INTO v_gig FROM gigs WHERE id = v_assignment.gig_id;

  -- Only poster can mark no-show
  IF v_gig.poster_id != auth.uid() THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  UPDATE gig_assignments
  SET status = 'no_show'
  WHERE id = p_assignment_id;

  -- Penalty
  PERFORM add_momentum(
    v_assignment.worker_id,
    -100,
    'no_show_penalty',
    v_gig.id,
    'No-show penalty: ' || v_gig.title
  );

  -- Update stats
  UPDATE profiles
  SET
    no_show_count = no_show_count + 1,
    reliability_score = GREATEST(0, reliability_score - 0.1)
  WHERE id = v_assignment.worker_id;

  -- Free up slot
  UPDATE gigs
  SET slots_filled = GREATEST(0, slots_filled - 1)
  WHERE id = v_gig.id;

  SELECT * INTO v_assignment FROM gig_assignments WHERE id = p_assignment_id;
  RETURN v_assignment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- RATINGS: Update reputation on rating
-- ===========================================

CREATE OR REPLACE FUNCTION update_reputation_on_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_avg DECIMAL(3,2);
  v_count INTEGER;
BEGIN
  SELECT AVG(score)::DECIMAL(3,2), COUNT(*)
  INTO v_avg, v_count
  FROM ratings
  WHERE ratee_id = NEW.ratee_id
    AND rating_type = NEW.rating_type;

  IF NEW.rating_type = 'worker_rating' THEN
    UPDATE profiles
    SET worker_reputation = CASE WHEN v_count >= 3 THEN v_avg ELSE NULL END
    WHERE id = NEW.ratee_id;
  ELSE
    UPDATE profiles
    SET poster_reputation = CASE WHEN v_count >= 3 THEN v_avg ELSE NULL END
    WHERE id = NEW.ratee_id;
  END IF;

  -- Bonus for good ratings
  IF NEW.score >= 4 THEN
    PERFORM add_momentum(
      NEW.ratee_id,
      CASE WHEN NEW.score = 5 THEN 20 ELSE 10 END,
      'rating_bonus',
      NEW.gig_id,
      'Received ' || NEW.score || '-star rating'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_rating_created
  AFTER INSERT ON ratings
  FOR EACH ROW EXECUTE FUNCTION update_reputation_on_rating();

-- ===========================================
-- SEARCH: Get nearby open gigs
-- ===========================================

CREATE OR REPLACE FUNCTION get_nearby_gigs(
  p_location GEOGRAPHY,
  p_radius_km DECIMAL DEFAULT 50,
  p_category gig_category DEFAULT NULL,
  p_city TEXT DEFAULT NULL
) RETURNS SETOF gigs AS $$
BEGIN
  RETURN QUERY
  SELECT g.*
  FROM gigs g
  WHERE g.status = 'open'
    AND g.event_date >= CURRENT_DATE
    AND (p_city IS NULL OR g.city = p_city)
    AND (p_category IS NULL OR g.category = p_category)
    AND ST_DWithin(g.location_point, p_location, p_radius_km * 1000)
  ORDER BY
    g.momentum_boost DESC,
    g.event_date ASC,
    g.created_at DESC;
END;
$$ LANGUAGE plpgsql STABLE;
