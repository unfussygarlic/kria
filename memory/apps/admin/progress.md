---
name: admin-progress
description: Phase-by-phase build progress for the Admin Dashboard
metadata:
  type: project
---

# Admin Dashboard — Build Progress

See [[admin-plan]] for full architecture and section details.

Last updated: 2026-06-21

---

## Phase 1 — Auth + Overview + Users + Support Tickets

**Status: NOT STARTED**

### Tasks

| Task | Status | Notes |
|------|--------|-------|
| `frontend/admin/` Next.js app scaffold | ⬜ | Mirror Grid setup: App Router, Tailwind v4, lucide-react, Space Grotesk |
| Migration: `is_admin BOOLEAN` on profiles | ⬜ | Next migration number — check `backend/api/alembic/versions/` for latest |
| FastAPI: `require_admin` dependency | ⬜ | `app/auth/middleware.py` — check `is_admin` after JWT validation |
| FastAPI: `routers/admin.py` router | ⬜ | All admin endpoints gated by `require_admin` |
| Admin auth gate (frontend) | ⬜ | On load: fetch profile, check `is_admin`, redirect if false |
| Overview page | ⬜ | Metrics: users, active gigs, open tickets, pending verifications, trials expiring ≤7d, 7d application count |
| Users page (list) | ⬜ | Searchable table, toggle Runners/Hosts/All |
| Users page (detail drawer) | ⬜ | Full profile, momentum history, verification status, actions |
| User actions: suspend/reactivate | ⬜ | Reuse `account.py` logic via admin endpoint |
| Migration: `support_queries` table | ⬜ | id, user_id, category, subject, message, email, status, created_at, admin_note |
| FastAPI: support submit endpoint | ⬜ | `POST /admin/support/submit` — insert + Resend notification to admin inbox |
| Support Tickets page (list) | ⬜ | Category, subject, submitter, status, date |
| Support Tickets page (detail + resolve) | ⬜ | Read message, write note, change status, send resolve email |
| FastAPI: support resolve endpoint | ⬜ | `PATCH /admin/support/{id}/resolve` — update status + send Resend email to user |
| Grid: Help & Support page | ⬜ | FAQ accordion + categorized submission form |
| Grid: TopBar dropdown "Help & Support" link | ⬜ | Between Settings and Sign Out divider |

---

## Phase 2 — Verification Queue + Gigs

**Status: NOT STARTED**

### Tasks

| Task | Status | Notes |
|------|--------|-------|
| Verification Queue page | ⬜ | All `verification_jobs`, grouped by status, time in queue |
| FastAPI: admin re-queue endpoint | ⬜ | Reset job status → `pending` |
| FastAPI: manual verify/reject endpoint | ⬜ | Override Inspector — update job + profile |
| Gigs page (admin view) | ⬜ | All gigs across all hosts, filter by status/category/city |
| FastAPI: admin gig endpoints | ⬜ | Force-close, delete, unpause |

---

## Phase 3 — Momentum + Subscriptions + System Health

**Status: NOT STARTED**

### Tasks

| Task | Status | Notes |
|------|--------|-------|
| Momentum leaderboard page | ⬜ | Top runners by score, filter by band/city |
| Momentum audit log page | ⬜ | Searchable `momentum_events` table |
| FastAPI: admin manual momentum adjustment | ⬜ | Insert to `momentum_events` + recalculate score |
| Subscriptions management page | ⬜ | All rows, filter by plan, trial countdowns |
| FastAPI: extend trial / cancel subscription | ⬜ | Admin-only endpoints |
| System Health page | ⬜ | API ping, Supabase ping, Inspector ping, queue depth |
| FastAPI: health/admin endpoint | ⬜ | Returns queue depth + Inspector status |
