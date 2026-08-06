---
name: Product Status
description: What's live, what's hidden, pending work
type: project
---

# Kria — Current Product Status

Last updated: 2026-08-06

## 2026-08-05 — Big session (three back-to-back rounds)

**Reviewer bug fixes:**
- Pocket applicants momentum was hardcoded to 500 (wrong field name) — now reads `item.momentum_score`
- Expired gigs shown in Pocket Explore / Home / Space — backend `_fetch_open_gigs` in `recommendations/engine.py` now uses `(event_date + shift_end_time) > NOW() IST`. Client filters in Space + Home added.
- Grid pause/resume worked on expired gigs — hidden client-side + backend 400 guard in `pause_gig`/`unpause_gig`.
- Grid showed "Open" for expired gigs — now single `<ExpiredBadge>` replaces the badge instead of appending. Applied to gigs list/detail + events list + event JobCard.
- **Critical trap caught:** `services/matching.py` is dead code. Live path is `recommendations/engine.py`. Both got the fix; dead file should be deleted in a hygiene commit.

**Gig Card v3 (Phase 1 + 2):** rich cover overlays (HostAvatarChip, pulsing SpotsChipOverlay, TimeToStartPill), backend `HostSummary` on `/gigs/match`, deck depth (peek cards), threshold haptics, celebratory apply overlay. See `features/gig_card.md`.

**App-wide design overhaul (Phase 3 + PKG-A/B/C/D):**
- Fallback card redesigned to mirror compositor layout (`FallbackHero` inline in JobCard)
- Grid host-photo upload in gig-creation wizard (Basic Info step)
- `styles.actionText` bug in applicants finally fixed (was open 5+ weeks)
- Skeleton loaders on gig detail / applicants / event detail
- Empty state copy pass (applicants + Space)
- Host chip on gig detail
- Streak flame on Home hero (`StreakStat` with pulsing 🔥)
- Band level-up celebration on Arena (`LevelUpModal`, first-load-guarded)
- Post-OTP check-in celebration in Space GigDetailSheet (1.5s full-sheet)
- Pre-login intro carousel (`app/(auth)/intro.tsx`, 3 slides, SecureStore persistence)
- Login trust row (Secure OTP · Verified hosts · Paid weekly)
- Profile tab: bio + skills chips + streak stat with 🔥 surfaced; history cards elevated (removed opacity fade, added completed/no-show dots)
- Public runner profile: migration 0032, `/api/v1/public/runners/{slug}` endpoint, `trykria.com/p/{slug}` landing page, native Share sheet from Profile → "Share Profile"

## Mobile App (Runners)

- **Host role hidden:** `SHOW_HOST_ROLE = false` in four files:
  - `frontend/pocket/app/(auth)/role-select.tsx` — auto-sets Runner, skips screen
  - `frontend/pocket/app/(main)/(tabs)/_layout.tsx` — always `RunnerTabsNavigator`
  - `frontend/pocket/app/(main)/(tabs)/home.tsx` — always `RunnerActions`
  - `frontend/pocket/app/(main)/(tabs)/space.tsx` — always `RunnerTab`
  - `frontend/pocket/app/(main)/(tabs)/explore.tsx` — `isHost = false` hardcoded
- **Host code preserved** — all Host components exist, just unreachable
- **To re-enable Host:** set `SHOW_HOST_ROLE = true` in all five files above

## Momentum (Complete — v1 + Profile Bonus)

- 0–1000 scale, 6 bands, skill graph radar chart
- Backend isolated in `app/momentum/` module
- 5 gig signals: show_rate, on_time_rate, performance_score, communication_score, professionalism_score
- NULL-safe scoring — score unlocks as signals accumulate
- **Profile completion bonus:** 6 profile fields → up to 80 pts additive bonus (outside credibility formula). New runners see non-zero score from day 1.
- Penalty system wired (no_show: 100pts)
- `momentum_events` audit log populated on every score change
- Sub-scores collected from Host ratings (punctuality, communication, professionalism)
- Migration 0013 applied
- All `compute_worker_breakdown` callers updated to handle 3-tuple return

## Grid (Host Dashboard)

- **Status:** Live at `grid.trykria.com` (Vercel) — deployed 2026-05-09
- **Deploy:** `cd frontend/grid && vercel --prod`
- **Vercel env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_xxx`), `NEXT_PUBLIC_API_URL=https://api.trykria.com/api/v1`
- **Features complete:**
  - Auth (email OTP — 6-digit code via Supabase built-in email, no Twilio needed), Dashboard, Post Gig (4-step), My Gigs, Gig Detail + Applicants + OTP
  - Events list, Create Event, Event Detail
  - **Applications inbox** — global view of all applicants with full profile modal, SkillGraph, signal legend, profile completion chips
  - Analytics Center, Profile
  - Dark/light theme toggle
  - **`/login` scroll-story landing page** (redesigned 2026-07-20) — explains what Grid does for employers before asking them to sign in; combined marketing page + sticky sign-in card. See `apps/grid/overview.md` "Login / Landing Page" section. No real social-proof/stats section yet — deliberately deferred until real usage numbers exist post-launch.

## Landing Page

- **Status:** Live at trykria.com (Vercel)
- **Repo folder:** `landing-page/`
- **Features:** Hero, Why Kria, Momentum section, Waitlist form, i18n (EN/हि/த)

## Chat Feature

- **Status:** Hidden — tab `href: null`, code fully preserved
- **Tables exist:** `conversations`, `messages`, `conversation_participants`
- **Known bug:** Receiver doesn't see messages in real-time (see `features/chat.md`)
- **Do NOT install:** `react-native-gifted-chat` or `react-native-keyboard-controller` — fatal crash with Expo Go SDK 54

## Identity Verification (Complete — multi-ID + Inspector wired)

- Multi-ID flow: Aadhaar, PAN, Driving Licence, Passport, Voter ID — verified independently
- Each verified ID earns a badge; `photo_verified` meta-badge appears automatically
- Badge system: `SingleBadge` + `BadgeList` components in `components/ui/VerifiedBadges.tsx`
- In-app camera: `VerificationCamera` (expo-camera) with spotlight mask overlay — NOT `expo-image-picker`
  - ID mode: rectangle guide + corner brackets (ISO ID-1 aspect)
  - Selfie mode: oval face guide; capture window is deliberately larger than oval (gives Inspector face context)
- Backend proxies to Inspector (`perceptrons/inspector/`) via `httpx`
- Inspector joins `kria-network` in `docker-compose.dev.yml`
- DB: `verified_id_types jsonb[]` accumulates all verified IDs (migration 0014 applied)
- Anti-spoof: disabled in dev (`ANTISPOOF_MODEL_ENABLED=False`); enable in prod

## Gig Pause (Complete)

- `is_paused` column on gigs (migration 0027)
- `POST /gigs/{id}/pause` + `POST /gigs/{id}/unpause` endpoints
- Pause/Resume buttons in Grid: gigs list, gig detail, event detail job cards
- Paused gigs excluded from runner recommendations feed
- Paused badge shown inline with status badge

## Email Notifications (Backend complete — webhook pending setup)

- **Provider:** Resend (`noreply@trykria.com`), domain `trykria.com` verified
- **3 email types:** first application (once per gig), burst (5+ in 30 min, 6h cooldown), profile reminders (14-day interval, max 4)
- **Trigger:** Supabase DB webhook on `gig_applications INSERT` → `POST /api/v1/email/internal/application-created`
- **⚠️ Supabase webhook NOT yet configured** — must be set up in Supabase dashboard before emails fire
- Profile reminders run daily at 09:00 UTC via APScheduler
- Unsubscribe: HMAC-signed links → `GET /api/v1/email/unsubscribe` → styled confirmation page
- Migration 0028 applied (via SQL editor + manual stamp)

## Grid (Host Dashboard) — Navigation Changes (2026-06-21)

- **Sidebar order:** Dashboard → Gigs → Events → Applications → Analytics → Subscription
- **Profile/Settings/Sign Out** moved from sidebar to TopBar profile dropdown
- **Onboarding bypass fixed:** all three auth checkpoints now gate on `first_name` not just profile row existence

## Admin Dashboard (Phase 1 Complete — 2026-06-21)

- Separate Next.js app at `frontend/admin/`, live at `admin.trykria.com` (Vercel)
- **Auth:** `coreofkria@gmail.com` is admin (`is_admin = TRUE` in profiles). Any other email is denied.
- **Login:** email OTP → checks `is_admin` → denies with message if false
- **Sections live:** Overview (bento metrics, live clock, system health), Users (band-colored table + slide-in drawer), Support Tickets (split panel + resolve emails), Verification Queue (kanban)
- **Stub sections (Phase 2/3):** Gigs, Momentum, Subscriptions, System Health
- **Backend:** `routers/admin.py` (ticket list/patch + overview stats), `routers/support.py` (submit endpoint), `require_admin` FastAPI dep in `auth/middleware.py`
- **Migration 0030:** `is_admin BOOLEAN` on profiles + `support_queries` table — applied via EC2 alembic
- **Env var:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new Supabase key format, `sb_publishable_...`)
- **CORS:** `admin.trykria.com` added to `_PROD_ORIGINS` in `main.py`
- Full progress: `memory/apps/admin/progress.md`

## Help & Support (Grid — Complete 2026-06-21)

- `/support` page at `app/(dashboard)/support/page.tsx`
- **FAQ tab:** 4-section accordion (Getting Started, Gigs & Applications, Momentum & Ratings, Account & Billing)
- **Query form:** 7 categories, subject (120c), message (2000c), submits via `POST /api/v1/support/submit` (stores `user_id`)
- **My Tickets tab:** `GET /support/my-tickets` — shows status, message, admin note ("Response from Kria") per ticket. Email fallback for old tickets where `user_id = NULL`.
- On submit: inserts to `support_queries`, emails `coreofkria@gmail.com`, sends ack to user
- Linked from TopBar profile dropdown: Help & Support (HelpCircle icon) between Settings and Sign Out

## Open / Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| **Set up Supabase webhook** | High | Table: `gig_applications`, INSERT → `https://api.trykria.com/api/v1/email/internal/application-created`, header `X-Webhook-Secret` |
| **Admin Phase 2** | Medium | Verification re-queue/approve via FastAPI admin endpoints; Gigs management page |
| **Admin Phase 3** | Low | Momentum leaderboard + audit log; Subscriptions management; System Health radar rings |
| Show badges on applicant cards (Grid) | Medium | Display `BadgeList` in `ApplicantProfileModal` and applicant list rows using `verified_id_types` |
| Enable anti-spoof in prod | Medium | Set `ANTISPOOF_MODEL_ENABLED=True` in Inspector docker env once on controlled hardware/lighting |
| Grid: Host rating UI (sub-scores) | Medium | Post-gig: collect punctuality/communication/professionalism sub-scores when rating runner |
| Pocket notification system | Medium | Discussed but not started |
| SVG logo integration (mobile) | Low | See `dev/todo.md` for details |
| Receiver real-time chat bug | Low | See `features/chat.md` |
| Host role in mobile | Future | Set `SHOW_HOST_ROLE = true` in 5 files to re-enable |
