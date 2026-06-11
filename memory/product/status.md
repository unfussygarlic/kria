---
name: Product Status
description: What's live, what's hidden, pending work
type: project
---

# Kria — Current Product Status

Last updated: 2026-06-10

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
- **Vercel env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`sb_publishable_xxx`), `NEXT_PUBLIC_API_URL=https://api.trykria.com/api/v1`
- **Features complete:**
  - Auth (email OTP — 6-digit code via Supabase built-in email, no Twilio needed), Dashboard, Post Gig (4-step), My Gigs, Gig Detail + Applicants + OTP
  - Events list, Create Event, Event Detail
  - **Applications inbox** — global view of all applicants with full profile modal, SkillGraph, signal legend, profile completion chips
  - Analytics Center, Profile
  - Dark/light theme toggle

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

## Open / Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| **Set up Supabase webhook** | High | Table: `gig_applications`, INSERT → `https://<api-domain>/api/v1/email/internal/application-created`, header `X-Webhook-Secret` |
| Show badges on applicant cards (Grid) | Medium | Display `BadgeList` in `ApplicantProfileModal` and applicant list rows using `verified_id_types` |
| Enable anti-spoof in prod | Medium | Set `ANTISPOOF_MODEL_ENABLED=True` in Inspector docker env once on controlled hardware/lighting |
| Grid: Host rating UI (sub-scores) | Medium | Post-gig: collect punctuality/communication/professionalism sub-scores when rating runner |
| Host onboarding flow in Grid | Medium | Currently assumes profile exists — new Hosts with no mobile profile will have `profile = null` |
| Pocket notification system | Medium | Discussed but not started — "first let's focus on Grid" |
| SVG logo integration (mobile) | Low | See `dev/todo.md` for details |
| Receiver real-time chat bug | Low | See `features/chat.md` |
| Host role in mobile | Future | Set `SHOW_HOST_ROLE = true` in 5 files to re-enable |
