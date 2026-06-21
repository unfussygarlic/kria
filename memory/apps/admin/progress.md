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

**Status: COMPLETE ✅**

### Tasks

| Task | Status | Notes |
|------|--------|-------|
| `frontend/admin/` Next.js app scaffold | ✅ | Dark Ops theme, Space Grotesk + JetBrains Mono, Tailwind v4, lucide-react |
| Migration: `is_admin BOOLEAN` on profiles | ✅ | Migration 0030, applied via `alembic upgrade head` on EC2 |
| Migration: `support_queries` table | ✅ | Migration 0030, same file as is_admin |
| FastAPI: `require_admin` dependency | ✅ | `app/auth/middleware.py` — `AdminUser` type alias |
| FastAPI: `routers/admin.py` router | ✅ | `GET /admin/support/tickets`, `PATCH /admin/support/tickets/{id}`, `GET /admin/stats/overview` |
| FastAPI: `routers/support.py` | ✅ | `POST /support/submit` — insert + Resend to admin + ack email to user |
| Admin auth gate (frontend) | ✅ | `_AdminLayoutClient.tsx` — `getUser()` + `is_admin` check, redirects if false |
| Login page with admin gate | ✅ | `app/login/page.tsx` — email OTP, denies non-admins before session creation |
| Icon rail navigation | ✅ | 48px fixed rail, 8 sections, hover tooltips, lime active state |
| Overview page | ✅ | Live clock, system health strip, bento metric tiles with count-up animation, runner/host split bar |
| Users page (list) | ✅ | Search + role filter, band-colored rows, `ShieldCheck` for verified users |
| Users page (detail drawer) | ✅ | Slide-in from right, momentum bar, profile details, suspend/reactivate actions |
| Support Tickets page | ✅ | Split panel, category colors, status tabs, resolve via FastAPI (sends email), in-progress action |
| Verification Queue page | ✅ | 4-column kanban, live age counters, blink-border animation for processing |
| Gigs / Momentum / Subscriptions / Health pages | ✅ | Stub pages (Phase 2/3) |
| Grid: Help & Support page | ✅ | `app/(dashboard)/support/page.tsx` — 4-section FAQ accordion + categorized form |
| Grid: TopBar dropdown "Help & Support" link | ✅ | Between Settings and Sign Out divider |
| Admin deployed to Vercel | ✅ | `admin.trykria.com`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` env var |
| Admin granted to coreofkria@gmail.com | ✅ | Inserted via Supabase SQL editor (display_name required for NOT NULL constraint) |

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
