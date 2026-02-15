# Kriya - Domain Model

**Last Updated:** 2026-02-14

## Core Entities

### User (Auth Layer)
- `id`: UUID (Supabase Auth)
- `phone`: string (primary identifier)
- `created_at`: timestamp

### Profile (Application Layer)
- `id`: UUID (FK to User)
- `display_name`: string
- `avatar_url`: string | null
- `bio`: string | null
- `date_of_birth`: date | null
- `gender`: enum (male, female, other, prefer_not_to_say) | null

**Location:**
- `location_lat`: decimal
- `location_lng`: decimal
- `location_label`: string (human-readable)
- `city`: string | null

**Student/Work Details:**
- `is_student`: boolean
- `college_name`: string | null
- `college_year`: int | null (1, 2, 3, 4, 5)
- `course`: string | null (e.g., "B.Tech CSE", "BBA")
- `college_id_verified`: boolean

**Skills & Languages:**
- `languages`: string[] (e.g., ["english", "hindi", "kannada"])
- `skills`: string[] (e.g., ["public_speaking", "sales", "tech_savvy"])

**Reputation:**
- `worker_reputation`: decimal (0.0 - 5.0)
- `poster_reputation`: decimal (0.0 - 5.0)
- `total_gigs_completed`: int (as worker)
- `total_gigs_posted`: int
- `reliability_score`: decimal (0.0 - 1.0)
- `no_show_count`: int

**Verification:**
- `is_verified`: boolean
- `phone_verified`: boolean (always true via OTP)
- `id_verified`: boolean (Aadhaar/college ID)

**Timestamps:**
- `created_at`: timestamp
- `updated_at`: timestamp

### Gig (Event-Focused)
- `id`: UUID
- `poster_id`: UUID (FK to Profile)

**Basic Info:**
- `title`: string
- `description`: text
- `category`: enum (event categories)
- `company_name`: string | null (who the gig is for)
- `event_name`: string | null (e.g., "Bangalore Tech Summit 2026")

**Payment:**
- `pay_amount`: decimal (INR)
- `pay_type`: enum (fixed, hourly, per_day)
- `pay_frequency`: enum (per_gig, daily, weekly) | null

**Location:**
- `venue_name`: string (e.g., "KTPO Convention Center")
- `location_lat`: decimal
- `location_lng`: decimal
- `location_label`: string (full address)
- `city`: string

**Timing (Shift-Based):**
- `event_date`: date (single day gig)
- `event_end_date`: date | null (multi-day events)
- `shift_start_time`: time (e.g., 09:00)
- `shift_end_time`: time (e.g., 18:00)
- `report_time`: time | null (arrive 30 mins early)
- `is_multi_day`: boolean

**Requirements:**
- `slots_total`: int (how many workers needed)
- `slots_filled`: int
- `gender_preference`: enum (any, male, female) | null
- `min_age`: int | null
- `max_age`: int | null
- `dress_code`: string | null (e.g., "Formal - black trousers, white shirt")
- `languages_required`: string[] (e.g., ["english", "kannada"])
- `skills_required`: string[] (e.g., ["public_speaking"])
- `experience_required`: boolean (need prior event experience?)
- `requirements_note`: text | null (additional requirements)

**Status & Visibility:**
- `status`: enum (draft, open, in_progress, completed, cancelled)
- `momentum_boost`: int (momentum spent to boost)
- `boost_expires_at`: timestamp | null

**Timestamps:**
- `created_at`: timestamp
- `updated_at`: timestamp
- `application_deadline`: timestamp | null
- `expires_at`: timestamp

### GigApplication
- `id`: UUID
- `gig_id`: UUID (FK to Gig)
- `applicant_id`: UUID (FK to Profile)
- `message`: text | null
- `status`: enum (pending, accepted, rejected, withdrawn)
- `applied_at`: timestamp
- `responded_at`: timestamp | null

### GigAssignment
- `id`: UUID
- `gig_id`: UUID (FK to Gig)
- `worker_id`: UUID (FK to Profile)
- `status`: enum (assigned, started, completed, no_show, disputed)
- `started_at`: timestamp | null
- `completed_at`: timestamp | null
- `worker_confirmed`: boolean
- `poster_confirmed`: boolean

### Rating
- `id`: UUID
- `gig_id`: UUID (FK to Gig)
- `rater_id`: UUID (FK to Profile)
- `ratee_id`: UUID (FK to Profile)
- `rating_type`: enum (worker_rating, poster_rating)
- `score`: int (1-5)
- `comment`: text | null
- `created_at`: timestamp

### MomentumWallet
- `id`: UUID
- `profile_id`: UUID (FK to Profile, unique)
- `balance`: int (current momentum)
- `lifetime_earned`: int
- `lifetime_spent`: int
- `updated_at`: timestamp

### MomentumTransaction
- `id`: UUID
- `wallet_id`: UUID (FK to MomentumWallet)
- `amount`: int (positive = earn, negative = spend)
- `type`: enum (gig_completion, rating_bonus, reliability_bonus, boost_spend, fee_reduction)
- `reference_id`: UUID | null (gig_id or other context)
- `description`: string
- `created_at`: timestamp

### Badge
- `id`: UUID
- `code`: string (unique identifier)
- `name`: string
- `description`: text
- `icon_url`: string
- `category`: enum (milestone, skill, community)

### UserBadge
- `id`: UUID
- `profile_id`: UUID (FK to Profile)
- `badge_id`: UUID (FK to Badge)
- `earned_at`: timestamp

### EarningsWallet
- `id`: UUID
- `profile_id`: UUID (FK to Profile, unique)
- `balance_inr`: decimal
- `lifetime_earned_inr`: decimal
- `lifetime_withdrawn_inr`: decimal
- `updated_at`: timestamp

### EarningsTransaction
- `id`: UUID
- `wallet_id`: UUID (FK to EarningsWallet)
- `amount_inr`: decimal
- `type`: enum (gig_payment, withdrawal, refund, bonus)
- `status`: enum (pending, completed, failed)
- `reference_id`: UUID | null
- `description`: string
- `created_at`: timestamp

---

## Entity Relationships

```
User 1:1 Profile
Profile 1:N Gig (as poster)
Profile 1:N GigApplication (as applicant)
Profile 1:N GigAssignment (as worker)
Profile 1:N Rating (as rater)
Profile 1:N Rating (as ratee)
Profile 1:1 MomentumWallet
Profile 1:1 EarningsWallet
Profile N:N Badge (via UserBadge)
Gig 1:N GigApplication
Gig 1:N GigAssignment
Gig 1:N Rating
MomentumWallet 1:N MomentumTransaction
EarningsWallet 1:N EarningsTransaction
```

---

## Enums

### GigCategory (Event & Brand Activation Focus)
- registration_desk      → Check-in, badge printing, guest list
- ushering              → Crowd management, seating, directions
- booth_staff           → Exhibition/trade show booth manning
- brand_ambassador      → Product promotion, brand representation
- sampling              → Product sampling, distribution
- lead_generation       → Collecting contacts, surveys, sign-ups
- hospitality           → Guest handling, VIP management, F&B service
- tech_support          → AV assistance, event tech, setup help
- photography           → Event photography/videography assistant
- social_media          → Live coverage, content creation
- anchoring             → Hosting, emceeing, announcements
- promotional           → Flyer distribution, street teams
- general_support       → General event assistance
- other

### GigStatus
- draft
- open
- in_progress
- completed
- cancelled

### PayType
- fixed        → One-time payment for entire gig
- hourly       → Per hour rate
- per_day      → Daily rate (for multi-day events)

### ApplicationStatus
- pending
- accepted
- rejected
- withdrawn

### AssignmentStatus
- assigned      → Worker confirmed, waiting for event
- checked_in    → Worker arrived at venue
- completed     → Gig finished successfully
- no_show       → Worker didn't show up
- left_early    → Worker left before shift ended
- disputed      → Issue raised by either party

### Gender
- male
- female
- other
- prefer_not_to_say

### GenderPreference (for gig requirements)
- any
- male
- female

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-14 | Initial domain model created |
| 2026-02-14 | Pivoted to event staffing focus - revised categories, added student fields, shift-based timing |
