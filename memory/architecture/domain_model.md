---
name: Domain Model & Database
description: All DB tables, columns, relationships, and migration history
type: reference
---

# Kria — Domain Model & Database

## Core Tables

### `profiles`
One row per user. **Created explicitly at onboarding completion** (migration 0024 made the auth trigger a no-op).
- `id` (uuid, FK → auth.users)
- `phone` (nullable), `email` (nullable, added migration 0023), `display_name` (NOT NULL), `first_name`, `last_name`
- `is_admin BOOLEAN NOT NULL DEFAULT FALSE` (migration 0030) — checked by `require_admin` FastAPI dep
- `default_role` TEXT ('runner' | 'host') — set at onboarding: Grid sets 'host', Pocket sets 'runner' (added migration 0025)
- `city`, `state`, `gender`, `date_of_birth`
- `worker_reputation` (0–5 float), `poster_reputation` (0–5 float)
- **isOnboarded check:** `first_name + date_of_birth + gender + city + state` all present (`authStore.ts:157`)
- **Identity verification fields:**
  - `id_verified` (bool) — TRUE when any ID type has been verified
  - `id_verified_at` (timestamp) — first verification timestamp (COALESCE, never overwritten)
  - `id_type` (text) — first ID type verified (COALESCE, never overwritten)
  - `is_verified` (bool) — same as `id_verified`, used as general "verified" flag
  - `verified_id_types` (jsonb array, default `[]`) — accumulates every verified ID type; uses `@> jsonb_build_array(:id_type)` containment check to avoid duplicates (migration 0014)
- **Streak fields** (added migration 0019):
  - `streak_count INT NOT NULL DEFAULT 0` — current consecutive-day streak
  - `longest_streak INT NOT NULL DEFAULT 0` — all-time peak streak
  - `last_active_date DATE` — date of last `update_streak` call (= last app open)
- **Profile completion fields** (used for Momentum profile bonus):
  - `id_verified` (bool) — 30 pts
  - `skills` (text[] / array) — 15 pts if non-empty
  - `bio` (text) — 10 pts if non-empty
  - `languages` (text[] / array) — 10 pts if non-empty
  - `work_experience` (jsonb array) — 10 pts if non-empty
  - `education_entries` (jsonb array) — 5 pts if non-empty

### `gigs`
Posted by a Host.
- `id`, `poster_id` (FK → profiles), `title`, `category`
- `description`, `company_name`
- `pay_amount`, `pay_type` (hourly/fixed)
- `event_date`, `shift_start`, `shift_end`, `report_time`
- `venue`, `city`, `state`
- `slots_total`, `slots_filled`
- `gender_preference`, `dress_code`, `languages_required`, `experience_required`, `requirements_note`
- `assignment_otp` (4-digit, shared across all accepted runners)
- `event_id` (nullable FK → events — NULL = standalone gig)
- `status` (active/filled/cancelled/completed)
- `momentum_boost` (integer)
- **Location fields** (added migration 0017):
  - `location_point` GEOGRAPHY(POINT,4326) — PostGIS; used by matching engine via `ST_Y`/`ST_X`; returns WKB hex from Supabase JS (unreadable)
  - `venue_lat` FLOAT nullable — plain mirror of `location_point` latitude; readable from Supabase JS
  - `venue_lng` FLOAT nullable — plain mirror of `location_point` longitude
  - `venue_formatted_address` TEXT nullable — Google Maps resolved address string
  - Set together via `PATCH /api/v1/gigs/{id}/location` after geocoding in Grid wizard

### `gigs` — additional columns (migration 0027, 0028)
- `is_paused BOOLEAN NOT NULL DEFAULT FALSE` — orthogonal to status; only pauseable when status is `open` or `in_progress`; paused gigs excluded from runner recommendations feed
- `first_application_notified BOOLEAN NOT NULL DEFAULT FALSE` — prevents duplicate first-application emails
- `last_burst_email_at TIMESTAMPTZ` — cooldown tracker for burst emails

### `email_unsubscribes`
Per-user, per-category unsubscribe registry (migration 0028).
- `id` UUID PK
- `user_id` UUID FK → profiles (CASCADE DELETE)
- `email` TEXT
- `category` TEXT DEFAULT 'reminders'
- `unsubscribed_at` TIMESTAMPTZ
- UNIQUE `(user_id, category)`

### `profile_reminder_log`
Tracks profile-incomplete reminder sends to prevent spam (migration 0028).
- `user_id` UUID PK FK → profiles (CASCADE DELETE)
- `last_sent_at` TIMESTAMPTZ
- `send_count` INT DEFAULT 1

### `events`
Container for multiple gigs.
- `id`, `poster_id` (FK → profiles)
- `title`, `description`, `venue`, `city`
- `event_date`, `is_multi_day`, `end_date`

### `gig_applications`
- `id`, `gig_id`, `applicant_id` (FK → profiles)
- `status`: `pending` → `accepted` / `rejected` / `withdrawn`
- `applied_at`

### `gig_assignments`
Created when an application is accepted.
- `id`, `gig_id`, `worker_id` (FK → profiles), `application_id`
- `status`: `assigned` → `checked_in` → `completed` / `no_show` / `left_early` / `disputed`
- `assignment_otp` (same OTP as gig)
- `otp_verified_at` (timestamp — set when runner checks in; used for on_time_rate calculation)

### `ratings`
Submitted after gig completion.
- `id`, `gig_id`, `rater_id`, `ratee_id`
- `rating_type`: `'worker_rating'` | `'poster_rating'`
- `score` (1–10 overall)
- `comment` (optional)
- Sub-scores (worker_rating only, submitted by Host via Grid, optional):
  - `punctuality_score` (1–5)
  - `communication_score` (1–5)
  - `professionalism_score` (1–5)
- Unique constraint: `(gig_id, rater_id, rating_type)`

### `momentum_profiles`
One-to-one with profiles. Computed trust scores for Runners.
- `user_id` (FK → profiles)
- `worker_score` (0–1000, default 0), `poster_score` (0–1000, default 0)
- **`signal_scores` jsonb NOT NULL DEFAULT '{}'** (migration 0016) — primary signal storage. Keys match signal file names. `null` value = no data yet.
  ```json
  { "show_rate": 0.92, "on_time_rate": 0.85, "performance_score": 4.2, "communication_score": null }
  ```
- **Legacy individual signal columns** (still in DB, no longer written/read by new code):
  - `worker_show_rate`, `worker_on_time_rate`, `worker_performance_score`, `worker_communication_score`, `worker_professionalism_score` (all NUMERIC(4,2), nullable)
- `worker_penalty_points` INT (accumulated; subtracted in score formula)
- **Removed columns** (0013): `worker_response_rate`, `worker_consistency_score`

### `momentum_events`
Immutable append-only audit log of every score change.
- `user_id`, `role`, `event_type`, `delta`, `score_after`, `reason`, `gig_id`

### `badges`
Badge definitions — seeded by migration, not user-writable.
- `id` (uuid), `code` (text, unique), `name`, `description`
- `category` (text, CHECK IN ('milestone','streak','identity','skill','reliability','community'))
- 18 badges seeded: newcomer · gig milestones (1/3/5/10/20/50/100) · streak milestones (10/50/100/200/500) · ID badges (id_aadhaar/id_pan/id_driving_licence/id_passport/id_voter_id)

### `user_badges`
Junction table — earned badges per user.
- `id`, `profile_id` (FK → profiles), `badge_id` (FK → badges)
- `earned_at` (timestamptz, default NOW())
- UNIQUE `(profile_id, badge_id)` — prevents duplicate awards; `INSERT ... ON CONFLICT DO NOTHING` pattern used in `badge_service.py`

### `support_queries` (migration 0030)
Submitted via Grid Help & Support page. Managed from Admin Dashboard Tickets section.
- `id` UUID PK
- `user_id` UUID FK → profiles (ON DELETE SET NULL, nullable)
- `category` TEXT — `account | gigs | checkin | payments | runners | technical | other`
- `subject` TEXT, `message` TEXT, `email` TEXT (submitter email for reply)
- `status` TEXT DEFAULT `open` — `open | in_progress | resolved`
- `admin_note` TEXT — written by admin on resolve, included in resolution email
- `created_at`, `updated_at` TIMESTAMPTZ (auto-updated by trigger)

### Chat Tables (hidden feature)
- `conversations`, `messages`, `conversation_participants`
- Code preserved, tab hidden

## Entity Relationships

```
profiles ──< gigs (poster_id)
profiles ──< gig_applications (applicant_id)
profiles ──< gig_assignments (worker_id)
profiles ──< ratings (rater_id, ratee_id)
profiles ──1 momentum_profiles
momentum_profiles ... momentum_events (audit log)
gigs ──< gig_applications
gigs ──< gig_assignments
gigs ──< ratings
events ──< gigs (event_id nullable FK)
```

## Migration History

| File | Description |
|------|-------------|
| `0001_initial_schema.py` | profiles table |
| `0002_rls_policies.py` | baseline RLS |
| `0003_functions.py` | DB functions |
| `0004_seed_badges.py` | seed data |
| `0005_add_profile_fields.py` | profile fields |
| `0006_events.py` | events table + gigs.event_id FK |
| `0007_chat.py` | conversations, messages, conversation_participants |
| `0008_momentum.py` | momentum_profiles + momentum_events |
| `0009_assignment_otp.py` | assignment OTP column |
| `0010_backfill_assignment_otps.py` | OTP backfill |
| `0011_profile_experience_education.py` | profile education/experience fields |
| `0012_search_indexes.py` | search performance indexes |
| `0013_momentum_rescale.py` | Score range 0–1000; signals nullable; drop response_rate/consistency_score; add communication_score/professionalism_score; reset all scores to 0 |
| `0014_verified_id_types.py` | ADD `verified_id_types jsonb NOT NULL DEFAULT '[]'`; backfills from `id_type` for existing verified users |
| `0015_verification_jobs.py` | ADD `verification_jobs` table for async ID verification queue (pending→processing→verified/failed) |
| `0016_momentum_signal_scores.py` | ADD `signal_scores jsonb NOT NULL DEFAULT '{}'` to `momentum_profiles`; migrates existing individual signal column data into JSONB |
| `0017_gig_location_columns.py` | ADD `venue_lat FLOAT`, `venue_lng FLOAT`, `venue_formatted_address TEXT` (nullable) to `gigs`; plain mirrors of PostGIS `location_point` for Supabase JS readability |
| `0018_gig_categories_revamp.py` | Converts `gig_category` enum to text + CHECK constraint; updates category values to 17-item set (event_registration, usher, booth_staff, promoter, sampling_promoter, lead_collection, event_helper, hospitality_staff, guest_management, front_desk, event_tech_support, sound_light_assistant, photographer, videographer, social_media_creator, emcee, other) |
| `0019_revamp_badges.py` | Converts `badge_category` enum to text + CHECK; ADD `streak_count`, `longest_streak`, `last_active_date` to `profiles`; rebuilds badge seed data with 18 new badges across milestone/streak/identity |

| `0020_performance_indexes.py` | Performance indexes |
| `0021_account_deactivation.py` | Account deactivation |
| `0022_nullable_phone.py` | Makes profiles.phone nullable |
| `0023_add_email_to_profiles.py` | ADD `email TEXT` (nullable, unique) to profiles; update handle_new_user to store email |
| `0024_defer_profile_creation.py` | handle_new_user made no-op; profile created at onboarding; wallet created by on_profile_created trigger on profiles INSERT |
| `0025_role_and_phone_normalize.py` | ADD `default_role TEXT CHECK IN ('runner','host')` to profiles; backfill from email domain; normalize phone → E.164 (+91XXXXXXXXXX) |
| `0026_subscriptions.py` | `subscriptions` table — id, user_id (UNIQUE FK), plan (trial/active/expired/cancelled), trial_ends_at, trial_duration_days |
| `0027_gig_pause.py` | ADD `is_paused BOOLEAN DEFAULT FALSE` to gigs; partial index on `(poster_id) WHERE NOT is_paused` |
| `0028_email_tracking.py` | ADD `first_application_notified`, `last_burst_email_at` to gigs; CREATE `email_unsubscribes`, `profile_reminder_log` tables |
| `0029_...py` | (check alembic/versions/ for exact name) |
| `0030_admin_support.py` | ADD `is_admin BOOLEAN NOT NULL DEFAULT FALSE` to profiles; CREATE `support_queries` table with indexes + auto-update trigger |

**Applied migrations:** 0001–0030 confirmed, all applied via EC2 `alembic upgrade head`.

**Next migration number:** `0031`

Migrations live at: `backend/api/alembic/versions/`
Auto-run on backend startup.

## RLS Critical Rule

Never use `EXISTS (SELECT FROM table_B)` in table_A's RLS if table_B's RLS also queries table_A. Use a `SECURITY DEFINER` function instead to avoid circular dependency / infinite recursion.

## Frontend Types

`frontend/pocket/types/database.ts` — manually maintained. Must be updated whenever DB columns are added or changed.
