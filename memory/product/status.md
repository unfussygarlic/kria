---
name: Product Status
description: What's live, what's hidden, pending work
type: project
---

# Kria — Current Product Status

Last updated: 2026-05-07

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

- **Status:** Fully built at `grid/`, not yet deployed
- **Live URL (planned):** grid.trykria.com
- **Setup needed:** `cd grid && npm install`, create `grid/.env.local` from `.env.local.example`
- **Features complete:**
  - Auth (OTP), Dashboard, Post Gig (4-step), My Gigs, Gig Detail + Applicants + OTP
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

## Open / Pending Items

| Item | Priority | Notes |
|------|----------|-------|
| Deploy Grid to grid.trykria.com | High | Run `npm install`, set `.env.local`, deploy to Vercel |
| Show badges on applicant cards (Grid) | Medium | Display `BadgeList` in `ApplicantProfileModal` and applicant list rows using `verified_id_types` |
| Enable anti-spoof in prod | Medium | Set `ANTISPOOF_MODEL_ENABLED=True` in Inspector docker env once on controlled hardware/lighting |
| Grid: Host rating UI (sub-scores) | Medium | Post-gig: collect punctuality/communication/professionalism sub-scores when rating runner |
| Host onboarding flow in Grid | Medium | Currently assumes profile exists — new Hosts with no mobile profile will have `profile = null` |
| SVG logo integration (mobile) | Low | See `dev/todo.md` for details |
| Receiver real-time chat bug | Low | See `features/chat.md` |
| Host role in mobile | Future | Set `SHOW_HOST_ROLE = true` in 5 files to re-enable |
