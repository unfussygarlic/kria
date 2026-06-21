---
name: admin-plan
description: Full architecture plan for the Kria Admin Dashboard — separate Next.js app covering user management, gig oversight, verification queue, support tickets, momentum audit, subscriptions, and system health
metadata:
  type: project
---

# Kria Admin Dashboard — Architecture Plan

A standalone web app (`frontend/admin/`) for Vishal to manage both Grid (Hosts) and Pocket (Runners) — support tickets, user lookups, verification queue, momentum auditing, and system monitoring.

**Why:** Separate app prevents mixing admin and host UX concerns. Own auth gate, own deployment. Completely invisible to regular users.

**URL plan:** `admin.trykria.com` (Vercel)

---

## Authentication

**Approach:** Add `is_admin BOOLEAN DEFAULT FALSE` to `profiles` table. FastAPI gets a `require_admin` dependency that checks this after JWT validation. All `/admin/*` endpoints gate behind it.

**Setup:** One-time SQL in Supabase editor: `UPDATE profiles SET is_admin = TRUE WHERE email = 'vs.therojgaar@gmail.com';`

**Frontend gate:** On page load, fetch profile, check `is_admin`, hard-redirect to login if false.

**Why not a separate admins table:** Unnecessary complexity for a single-admin setup. `is_admin` flag is simpler and sufficient.

---

## Sections

### 1. Overview (landing page)
Key metrics at a glance:
- Total users (Runners vs Hosts)
- Active gigs count
- Open support tickets
- Pending verifications
- Trial subscriptions expiring ≤7 days
- Applications in last 7 days
- Trend sparklines (7d / 30d)

### 2. Users
Searchable, filterable table of all users. Toggle: Runners / Hosts / All.

**Columns:** Name, email/phone, city, joined date, momentum score (runners), verification status, `is_active`, subscription plan.

**User detail drawer (click → opens):**
- Full profile fields
- Momentum score + band + `momentum_events` audit trail
- Gig history (posted or applied)
- Verification job status + history
- Subscription / trial status
- **Actions:** Suspend (`is_active = false`) / Reactivate, manually set `is_verified`, adjust momentum (requires reason, logs to `momentum_events` with `event_type = "admin_adjustment"`), delete account

### 3. Gigs
All gigs across all hosts. Filter: status (open/paused/completed/cancelled), category, city, date range.

**Columns:** Title, host name, category, city, date, slots, status, is_paused.

**Actions:** Force-close gig, delete gig, unpause gig.

### 4. Verification Queue
High operational value — currently a black box.

**Table:** All `verification_jobs` grouped by status (pending → processing → approved/failed). Shows user name, ID type, submitted time, time in queue, error code (for failed).

**Actions:** Re-queue failed job (reset status → `pending`), manually approve/reject (override Inspector — updates `verification_jobs.status` + `profiles.is_verified` + `profiles.verified_id_types`).

### 5. Support Tickets
Full ticket management (companion to Help & Support feature in Grid).

**Table:** All `support_queries` — category, subject, submitter name/email, status, submitted date.

**Detail view:** Read full message, write reply note, change status (`open` / `in_progress` / `resolved`).

**On resolve:** Resend fires "your query has been resolved" email to submitter with admin's note.

### 6. Momentum
Two sub-views:

- **Leaderboard:** Top runners by score, filterable by band (Newcomer → Legend), city. Useful for monitoring score distribution health.
- **Audit log:** Searchable `momentum_events` — who gained/lost what, why, when. Spot anomalies. Fire manual adjustment from here.

### 7. Subscriptions
All subscription rows. Filter by plan (trial/active/expired/cancelled). Shows trial expiry countdowns, highlights trials expiring in <7 days.

**Actions:** Extend trial (update `trial_ends_at`), cancel subscription, upgrade plan.

### 8. System Health
Live status checks:
- API `/health` ping
- Supabase DB connection
- Inspector service reachability (`http://inspector:8000/health`)
- Verification queue depth (jobs pending + age of oldest pending job)
- Optional: FastAPI error rate (if structured logs are available)

---

## Backend Work Required

| Feature | Work |
|---|---|
| `is_admin` flag | One migration — `ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN DEFAULT FALSE` |
| `require_admin` dependency | New FastAPI dep in `app/auth/middleware.py` — checks `is_admin` after JWT auth |
| All admin reads (users, gigs, tickets) | New `/admin/*` router — `routers/admin.py` — gated by `require_admin` |
| User suspend/reactivate | Already in `account.py` — re-expose to admin |
| Manual momentum adjustment | New endpoint — inserts to `momentum_events`, recalculates score |
| Manual verification override | New endpoint — updates `verification_jobs.status` + profile fields |
| Support ticket resolve + email | New endpoint — updates status, sends Resend email with note |
| Re-queue Inspector job | New endpoint — resets `verification_jobs.status` → `pending` |
| Queue depth metric | New endpoint — `COUNT(*) WHERE status IN ('pending','processing')` on `verification_jobs` |

---

## Tech Stack

Same as Grid:
- Next.js (App Router), Tailwind v4, lucide-react, Space Grotesk
- Same Supabase project (different RLS path — admin reads bypass via service key or `require_admin` gate)
- Same FastAPI backend (new `/admin/*` routes)
- Solar Flare dark theme as default (no light mode toggle needed — internal tool)

---

## Phased Plan

See [[admin-progress]] for current phase status.

### Phase 1 (current)
- New Next.js app scaffold (`frontend/admin/`)
- Auth gate (`is_admin` flag + migration + require_admin dep)
- Overview dashboard (metrics)
- Users section (search, detail, suspend/reactivate)
- Support Tickets (full ticket management + Resend resolve email)

### Phase 2
- Verification Queue (view, re-queue, manual override)
- Gigs section (all gigs, force-close, delete)

### Phase 3
- Momentum leaderboard + audit log + manual adjustment
- Subscriptions management
- System Health pings
