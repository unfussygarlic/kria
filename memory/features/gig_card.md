---
name: Gig Card
description: Pocket swipe card — overlays (host chip, spots pulse, time pill), typography fallback, deck depth, threshold haptics, celebratory apply
type: reference
---

# Gig Card (Pocket Explore Deck)

The swipe card is what makes runners want to apply. Below is the current state after the 2026-08-05 upgrade.

## Composition

Every card is a **cover-shaped canvas** (4:5 aspect ratio, ~62% screen height, 24px radius) with a fixed overlay stack. Two branches for the canvas:

1. **Photo branch** — `gig.cover_image_url` present. Full-bleed compositor-rendered PNG. Category chip, TITLE, PAY, VENUE, HOST NAME are baked into the PNG at gig creation (see `features/gig_cover_images.md`).
2. **Fallback branch** — `<FallbackHero>` inline component: category-color gradient with a huge tinted watermark of the category label + a bottom text zone mirroring the compositor's baked layout (chip → title → pay → venue). Same overlay positions so both branches feel identical.

Both branches live in `frontend/pocket/components/gig/JobCard.tsx` under the `explore` variant. The compact `space`/`event` variants use the hand-built list card, unchanged.

## Overlay Stack (positions absolute)

| Position | Element | Behavior |
|----------|---------|----------|
| Top-left | `TimeToStartPill` | Lime pill "Starts in 2h 15m". Only renders when shift is within 24h. Silent otherwise. |
| Top-right (vertical stack, gap 8) | `MomentumBadge` (chip) | Live poster momentum score. |
| ↓ | `boostBadge` | Only if `gig.momentum_boost > 0`. |
| ↓ | `SpotsChipOverlay` | Pulses (opacity 1 ↔ 0.55, 700ms sine) when ≤3 spots. Color escalates: neutral → amber (≤3) → coral (last spot). |
| Bottom-left | `HostAvatarChip` | 32px avatar (or initial), verified-blue check overlay bottom-right of the circle, star rating chip appended when `poster_reputation != null`. |

All overlays use `pointerEvents: "none"` — the outer card catches all gestures.

## Data flow (host summary)

Backend `/api/v1/gigs/match` returns a `host: HostSummary | null` per `ScoredGig`:
- `id`, `display_name`, `avatar_url`, `is_verified`, `poster_reputation`
- Batch-fetched via `_fetch_host_summaries()` in `backend/api/app/recommendations/engine.py` — one query keyed by poster IDs

Pocket gigStore mirrors this as `hosts: Record<posterId, HostSummary>` (parallel to `posterScores`), populated by `fetchGigs`/`fetchMoreGigs` and hydrated on demand by `fetchHost(posterId)` — Supabase profiles select, used by gig detail on cold-load (deep link with no prior explore prefetch).

Explore passes both `posterMomentum={posterScores[gig.id]}` and `host={hosts[gig.poster_id]}` down through `SwipeableJobCard` → `JobCard`.

Gig detail (`app/(main)/gig/[id].tsx`) renders the same `HostAvatarChip` below title/pay.

## Deck Depth (peek cards)

`explore.tsx` renders 2 back cards behind the front `SwipeableJobCard`:
- `peekCardMid` (N+1) — scale 0.96, translateY 12, opacity 0.65
- `peekCardBack` (N+2) — scale 0.92, translateY 24, opacity 0.35

Back cards are plain `JobCard` instances with `pointerEvents="none"` — only the front card catches gestures. `deckCenter` is `position: relative` so absolute-positioned back cards stack correctly.

## Swipe feel (SwipeableJobCard)

- **Threshold-crossing haptics** — `Haptics.selectionAsync()` fires the moment the drag crosses the apply/nav commit line. Arms/disarms via a `useRef` flag (`applyArmed`, `rightArmed`, `leftArmed`) so it doesn't spam.
- **Celebratory apply overlay** — icon springs from 0.6 → 1.15 as user commits, backed by a scaling white radial glow (`applyGlow`, `borderRadius: 110`, 220×220). Icon bumped 52 → 64px.
- **Apply / slide-off** — existing spring-bounce + slide-off animations with `Haptics.impactAsync(Medium)` on apply, `Light` on slide.

## Files

- `frontend/pocket/components/gig/JobCard.tsx` — main card, `SpotsChipOverlay`, `TimeToStartPill`, `FallbackHero` all inline
- `frontend/pocket/components/gig/HostAvatarChip.tsx` — standalone chip component
- `frontend/pocket/components/gig/SwipeableJobCard.tsx` — gesture + overlays + haptics
- `frontend/pocket/app/(main)/(tabs)/explore.tsx` — deck depth wiring, host prop
- `frontend/pocket/stores/gigStore.ts` — `hosts` map, `fetchHost` action
- `frontend/pocket/lib/api/gigs.ts` — `HostSummary` type, `MatchedGig.host` field
- `backend/api/app/models/gig.py` — `HostSummary`, `ScoredGig.host`
- `backend/api/app/recommendations/engine.py` — `_fetch_host_summaries()`

## Do-not-touch invariants

- Cover branch **must** stay `pointerEvents="none"` — SwipeableJobCard depends on this so the outer PanResponder catches everything.
- FallbackHero is `aspectRatio: 4/5` on purpose — must match the cover image aspect so overlay positions land identically on both branches.
- `SpotsChipOverlay`, `TimeToStartPill`, `FallbackHero` are defined inline in JobCard.tsx (co-located). Don't refactor them into standalone components without a reason — they're gig-card-specific.
