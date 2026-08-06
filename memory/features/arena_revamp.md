---
name: Arena Revamp (2026-08-07)
description: ArenaHero (streak + weekly delta + percentile) + contribution field + NextUnlocks badges section
type: project
---

# Arena Revamp (Pocket, 2026-08-07)

## Why

Arena felt like a dashboard, not a celebration. Comparing to [Duolingo streaks + leaderboards](https://citrusbits.com/how-gamification-has-catapulted-duolingo-strava-and-forest-to-the-top-of-their-respective-app-categories/) and [Strava's segmented competitions](https://trophy.so/blog/how-strava-uses-segmented-leaderboards-to-drive-engagement): three signals were missing that make gamified stats screens sticky — streak hero, trend delta, social proof.

Also: the backend `BreakdownItem.contribution` field was already being sent but never displayed in `MomentumBreakdown`, and locked badges gave zero indication of how close they were to unlocking.

## Backend

**New `GET /api/v1/momentum/me/percentile`** — returns `{ score, city, percentile, peer_count, scope }`. Percentile is city-scoped when the runner has a city AND there are ≥5 peers in that city with scores; otherwise falls back to global. Uses `momentum_profiles.worker_score` for cheap peer counts — slight staleness is fine for a social-proof number, not a hard ranking.

**Extended `BadgeOut` model with progress fields** — `progress_current`, `progress_target`, `unlock_hint`. Populated only for gig-count and streak milestone badges (identity/skill are binary; a progress bar would be misleading UX). Server owns the thresholds (`_MILESTONE_THRESHOLDS` in `routers/badges.py`) so the client doesn't duplicate logic.

## Pocket UI

**`<ArenaHero />`** at the top of Arena — one card with three signals:
1. **Streak** 🔥 — big amber number, "best N" subtitle. Falls back to "🌱 Start your first streak" at 0. Duolingo-style prominence.
2. **Weekly delta chip** — "+18 this week" (lime up-trend), "-5 this week" (coral down-trend), or "±0" muted. Client-side computed via `readWeeklyDelta()` — snapshots score to SecureStore on the first Arena open each ISO week, diffs on subsequent opens. Delta = null on first-ever open (no baseline yet). Graduates to server-computed when a `momentum_snapshots` table lands.
3. **Percentile chip** — "Top X% in Bengaluru" — amber, only shows when `peer_count ≥ 5`. Falls back to global scope when city lacks enough peers.

**Contribution field in MomentumBreakdown** — each signal row with data now shows a `+N pts` badge next to the label, band-coloured with a matching border. Makes the abstract progress bar concrete ("Punctuality is worth 42 pts to me right now").

**`<NextUnlocks />` section on Arena** — top 3 locked badges sorted by `progress_current / progress_target` descending. Each row: category-coloured icon ring → badge name + `3 / 5` progress → progress bar → unlock hint ("2 more gigs to unlock"). "All badges →" link routes to the full `/badges` screen (kept as-is; not merged into Arena to keep this diff focused).

## New files

- `frontend/pocket/lib/momentumSnapshot.ts` — `readWeeklyDelta()` client-side snapshot helper
- `frontend/pocket/components/arena/ArenaHero.tsx`
- `frontend/pocket/components/arena/NextUnlocks.tsx`

## Data flow additions

- `momentumStore.myPercentile` + `fetchMyPercentile()` (30-min TTL — ranking shifts slowly)
- `Badge` type in `lib/api/badges.ts` extended with `progress_current`, `progress_target`, `unlock_hint`

## Deferred (called out in the audit but not shipped)

- **City leaderboard** — needs new backend endpoint + opt-in privacy toggle. Percentile chip is the lite version.
- **Full merge of Badges page into Arena** — kept the standalone `/badges` screen; NextUnlocks section is the hook.
- **Momentum history chart** (7-day / 30-day trend line) — needs backend `momentum_snapshots` table with per-day rows.
