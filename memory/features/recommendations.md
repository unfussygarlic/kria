---
name: Recommendations & Matching Engine
description: Location-aware gig matching for Runners — module structure, scoring, geocoding, GPS flow
type: reference
---

# Recommendations & Matching Engine

## ⚠️ Dead Code Warning

`backend/api/app/services/matching.py` is **dead code** — nothing imports it. The live matching engine is `backend/api/app/recommendations/engine.py` (imported by `routers/gigs.py` as `from app.recommendations.engine import match_gigs_for_worker`).

Both files define nearly-identical `_fetch_open_gigs`, `score_gig`, `match_gigs_for_worker` functions — a legacy of the recommendations refactor. Editing the wrong one deploys "successfully" but has zero runtime effect. The 2026-08-05 expired-gigs fix was initially applied to `services/matching.py` and would have shipped with the bug still present. Both files got the fix eventually; the services file should be **deleted** in a standalone hygiene commit.

Verify before matching-related changes:
```bash
grep -rn "from app.services.matching\|services import matching" backend/api/
# → must return zero
```

## Backend Module

`backend/api/app/recommendations/` — standalone module for all recommendation logic. Imported in `main.py` as `from app.recommendations import router`.

| File | Purpose |
|------|---------|
| `__init__.py` | Empty — keeps module import pattern consistent with `momentum/` |
| `models.py` | `GeocodeRequest`, `GeocodeResponse`, `LocationUpdateRequest` (has `formatted_address: str = ""`) |
| `geo.py` | `haversine_km()`, `GeocodedLocation` dataclass, `async geocode_venue()` (calls Google Maps API) |
| `engine.py` | Full matching logic: `score_gig()`, `match_gigs_for_worker()`, fetch helpers |
| `router.py` | `POST /api/v1/recommendations/geocode` — requires auth to prevent API key abuse |

## Matching Engine Scoring

5-signal weighted score (`engine.py`):

| Signal | Weight |
|--------|--------|
| Trust match (poster momentum) | 35% |
| Distance | 25% |
| Category match (runner's past gigs) | 20% |
| Pay score | 10% |
| Recency | 10% |

Distance scoring only activates when both gig `location_point` (PostGIS) and runner GPS are present. Falls back gracefully to 0 distance score if either is missing.

## Gig Expiry Filter (2026-08-05)

`_fetch_open_gigs()` in `engine.py` filters expired gigs via the canonical rule:
```sql
WHERE status = 'open'
  AND NOT is_paused
  AND event_date IS NOT NULL
  AND (event_date::timestamp + shift_end_time::time)
      > (NOW() AT TIME ZONE 'Asia/Kolkata')
```
Matches the convention used by `/assignments/finalize-expired`. **Never fall back to `event_date >= CURRENT_DATE`** — that misses gigs ending earlier today. Original bug fixed 2026-08-05.

## Host Summary on Match Response (2026-08-05)

`ScoredGig` now includes `host: HostSummary | null` (id, display_name, avatar_url, is_verified, poster_reputation). Batch-fetched by `_fetch_host_summaries()` — one query keyed by poster IDs, joins on `profiles`.

Pocket surfaces this via `HostAvatarChip` on the swipe card and gig detail. See `features/gig_card.md`.

## Geocoding

- **Provider:** Google Maps Geocoding API (server-side only via FastAPI)
- **Region bias:** `region=in` for India-first results
- **Cost:** ~$5/1000 requests — 70K free/month. Each "Fetch Location" click = 1 request. Hosts can re-fetch (each click = 1 new request).
- **API key:** `GOOGLE_MAPS_API_KEY` in `.env.dev` (gitignored) → passed to container via `docker-compose.yml` env
- **Auth guard:** Geocode endpoint requires valid JWT to prevent unauthenticated key abuse
- **Failure handling:** Returns 422 if geocoding fails or key not configured; Grid shows inline error "Could not resolve venue. You can still post without a pin."

## Runner GPS (Mobile)

`frontend/pocket/app/(main)/(tabs)/explore.tsx`:
- `expo-location` already installed (`"*"` in package.json)
- `init()` async function on mount: `requestForegroundPermissionsAsync` → `getCurrentPositionAsync(Accuracy.Balanced)` → stored in `locationRef` (useRef, not state — no re-render)
- GPS passed to both `fetchGigs(undefined, locationRef.current)` and prefetch `fetchMoreGigs(locationRef.current)`
- Silent fallback if permission denied — matching still works without coordinates

## Google Maps Deep Link (free)

URL pattern: `https://www.google.com/maps/search/?api=1&query={lat},{lng}`

Zero API cost, opens native Maps app on device. Used in:
- `gig/[id].tsx` — Gig Detail venue row
- `space.tsx` — RunnerTab accepted gig venue row

Both use `Linking.openURL()` from React Native.
