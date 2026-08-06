---
name: Home Revamp (Pocket)
description: 2026-08-07 Home redesign — earnings hero, primary CTA, shrunk Momentum, growth nudge, pull-to-refresh
type: project
---

# Home Revamp — Pocket (2026-08-07)

## Why

Old Home led with the animated BandHeroCard (Momentum score). Great visual moment, but three problems the code audit + web research surfaced:

1. **No money signal.** Every best-in-class gig app puts earnings first — [DoorDash](https://dasher.doordash.com/en-us/blog/new-doordash-dasher-app) has an always-visible earnings pill, [Instacart](https://www.instacart.com/company/shopper-community/new-tools-to-track-your-earnings) has a real-time earnings progress tracker, [Uber Driver](https://www.uber.com/us/en/deliver/driver-app/) leads with weekly earnings by day. Kria's Home had zero mention of earnings anywhere.
2. **No primary CTA.** Runners see Momentum → then nothing tells them "do this next." DoorDash's "Dash Now" button is the model.
3. **Home collapses for new runners** — Badges section hides if 0 earned, Recent Gigs hides if 0 applications → new users saw ~60 % empty space.

## New layout (top → bottom)

1. **Top bar** — greeting + first name + avatar (unchanged)
2. **`<EarningsCard />`** — hero position. This-week ₹ big, `N gigs this week · Payout Friday` subtitle. Brand-new runners see a warm "Ready to earn?" invite instead of ₹0.
3. **`<PrimaryCTA />`** — big lime "Find gigs nearby" button with lime shadow. Subtitle: `12 new near Bengaluru today` when count is known, generic swipe copy otherwise. Taps → Explore.
4. **Hot near you** — existing GigMarquee (unchanged)
5. **`<MomentumChipRow />`** — Momentum SHRUNK from full hero to a compact row: [score badge] · [band pill + progress bar OR streak] · [→]. Taps → Arena.
6. **`<GrowthNudge />`** — dynamic single-item nudge. See priority below.
7. **Recent badges** — existing BadgeMarquee (only renders if earned > 0)
8. **Recent gigs** — existing FlatList of active applications (only renders if any)

Pull-to-refresh added — `<RefreshControl>` on the ScrollView. Refreshes momentum + applications + badges + earnings + nearby gigs in parallel.

## GrowthNudge priority

Only ONE nudge shows at a time. Priority order (highest first) picked in `pickNudge()`:

1. **Verify ID** — fires when `profile.verified_id_types.length === 0`. Highest business value: verified runners land more gigs.
2. **Complete profile** — fires when `!bio || bio.trim().length < 20 || skills.length < 3`. Bumps Momentum's profile-completion bonus.
3. **Next band** — fires when `momentum score` is within 150 pts of the next band threshold (100/300/500/700/900). Makes promotion feel close.
4. **Streak** — fires when `streak_count >= 3`. Loss-aversion nudge to defend the streak.

If none of the four fires, the component returns `null` and the section collapses cleanly (no empty rectangle).

Each nudge specifies an accent colour + eyebrow + title + sub + navigation target so the visual language stays consistent.

## Backend — new endpoint

`GET /api/v1/earnings/summary` at `backend/api/app/routers/earnings.py`. No auth-less variant; returns:

```
{
  this_week: float,           # ₹ from completed assignments since IST Monday 00:00
  last_week: float,
  lifetime_total: float,
  week_gig_count: int,
  lifetime_gig_count: int,
  next_payout_date: str,      # ISO date, next Friday IST (fixed cadence — no payouts table yet)
}
```

Aggregates `gig_assignments` joined with `gigs` where `asgn.status = 'completed'`. Weeks calculated in Asia/Kolkata via `(NOW() AT TIME ZONE 'Asia/Kolkata')::date` and `EXTRACT(ISODOW FROM today) - 1` (Monday-start).

**Payout date is a placeholder** — always next Friday, computed client-agnostic in `_next_friday_ist(today)`. Replace when a real payouts pipeline lands.

## Files

**New:**
- `backend/api/app/routers/earnings.py`
- `frontend/pocket/lib/api/earnings.ts`
- `frontend/pocket/stores/earningsStore.ts` (5-min TTL)
- `frontend/pocket/components/home/EarningsCard.tsx`
- `frontend/pocket/components/home/PrimaryCTA.tsx`
- `frontend/pocket/components/home/MomentumChipRow.tsx`
- `frontend/pocket/components/home/GrowthNudge.tsx`

**Modified:**
- `backend/api/app/main.py` — register earnings router
- `frontend/pocket/app/(main)/(tabs)/home.tsx` — layout rewrite, PTR, wiring
- `frontend/pocket/app/(main)/(tabs)/home.tsx` — added `sectionTight` style (14 px vertical rhythm for compact cards)

**Deprecated (still in file, no longer rendered):**
- `BandHeroCard` inline component in home.tsx
- `HeroSkeleton` inline component in home.tsx
- Not deleted in this pass to keep the diff surgical. Safe to remove in a hygiene commit.

## Deploy

Sequenced — backend must ship first because Pocket's earnings store fetches `/api/v1/earnings/summary` on mount:

```bash
# 1. Backend rebuild on EC2
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build kria-api -d

# 2. Pocket EAS update to closed-testing branch
```

If Pocket ships before the backend rebuild, the earnings card just shows its loading skeleton indefinitely — no crash, but ugly.

## Nice-to-haves (not shipped)

- Real payouts backend replacing `next_payout_date` hardcode
- Weekly earnings sparkline in the EarningsCard
- "N runners applied in the last hour" on Hot near you cards (needs a new applications-rate signal from the backend)
- Home widget for iOS/Android (system-level, requires eas-build native module)
