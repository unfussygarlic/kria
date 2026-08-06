# Gigs Feature

## Matching engine location (READ FIRST)

Live matching path is `backend/api/app/recommendations/engine.py`, NOT `services/matching.py`. See `features/recommendations.md` — the services file is dead code and should not be edited.

## Canonical gig expiry rule (2026-08-05)

```sql
(event_date::timestamp + shift_end_time::time)
    > (NOW() AT TIME ZONE 'Asia/Kolkata')
```

Used by:
- `_fetch_open_gigs()` in `recommendations/engine.py` (backend match)
- `/assignments/finalize-expired` in `routers/applicants.py`
- Pause/unpause guards in `routers/gigs.py` (`_assert_gig_owner` computes `is_expired` for the pause guard using `COALESCE(event_end_date, event_date) < (NOW() AT TIME ZONE 'Asia/Kolkata')::date` — day granularity is intentional there since Grid's `isExpired` helper also works day-granularity)

Client mirrors:
- Pocket Space `isUpcoming()` — same rule with `shift_end_time` fallback `"23:59"`
- Pocket Home `activeApplications` memo — filters expired applications
- Grid `isExpired(gig)` — day-granularity check for the "Expired" badge

**Never fall back to `event_date >= CURRENT_DATE` alone** — that misses gigs ending earlier today. Original bug fixed 2026-08-05.

## Host summary on match response

`ScoredGig.host: HostSummary | null` — new field added 2026-08-05. Powers the swipe-card `HostAvatarChip`. See `features/gig_card.md`.

## Gig Lifecycle

```
Host creates gig (status: active)
  → Runners see gig in Explore
  → Runner applies (gig_applications: pending)
  → Host accepts → gig_assignments: assigned
  → Runner checks in via OTP → gig_assignments: checked_in
  → Gig ends → gig_assignments: completed / no_show / left_early / disputed
  → gig status: filled (when slots_filled = slots_total)
```

## Gig Creation (Mobile — Host, currently hidden)

Via `supabase.from("gigs").insert(...)` directly. No FastAPI needed.

## Gig Creation (Grid — 4-step wizard)

1. **Category** — emoji-grouped role picker (NOT a flat 14-category list — see Categories below)
2. **Basic Info** — title, company, description, slots, pay amount + type
3. **Schedule** — venue, city, date, shift start/end, report time
   - "Fetch Location" button appears when venue + city are filled
   - Calls `POST /api/v1/recommendations/geocode` (server-side Google Maps, auth required)
   - Shows resolved address + lat/lng inline; clears automatically when venue/city changes
4. **Requirements** — gender preference, dress code, languages, experience, note

On submit:
1. `supabase.from("gigs").insert({...}).select().single()` — creates gig row
2. If geocoded: `PATCH /api/v1/gigs/{id}/location` — sets `location_point` (PostGIS), `venue_lat`, `venue_lng`, `venue_formatted_address`
3. `POST /api/v1/gigs/{id}/cover` (fire-and-forget) — generates auto cover art, see [[gig_cover_images]]
4. Redirect to `/gigs/${gig.id}`

**Key files:** `frontend/grid/app/(dashboard)/gigs/new/page.tsx`, `frontend/grid/lib/api/recommendations.ts`, `frontend/grid/lib/api/gigs.ts`

## Categories (corrected 2026-07-30 — previous "14 categories" list here was stale/wrong)

`gigs.category` is a specific role (`GigCategory` type, `frontend/grid/types/index.ts`), grouped in the wizard UI into 6 groups (`ROLE_GROUPS` in `gigs/new/page.tsx`):

| Group (emoji) | Roles (`category` DB values) |
|---|---|
| 🎪 Event & Promotion | `event_registration`, `usher`, `booth_staff`, `promoter`, `sampling_promoter`, `lead_collection`, `event_helper` |
| 🍽️ Hospitality | `hospitality_staff`, `guest_management`, `front_desk` |
| 💻 Technical Support | `event_tech_support`, `sound_light_assistant` |
| 📸 Media & Content | `photographer`, `videographer`, `social_media_creator` |
| 🎤 Stage & Hosting | `emcee` |
| 🔧 Other | `other` |

Kria is an **event-staffing** marketplace specifically, not a general gig marketplace (no delivery/retail/security/etc. categories exist). This 6-group taxonomy is also what `backend/api/app/covers/manifest.py` maps cover-image templates onto — keep both in sync if the wizard's groups change.

## OTP Check-in Flow

1. When Host accepts an applicant → `assignment_otp` is set on the `gig` (4-digit code, shared across all accepted runners for that gig)
2. Host sees OTP on gig detail page (mobile + Grid) in a lime-bordered card
3. Runner enters OTP in mobile app (Space tab) → triggers check-in → `gig_assignments.status = checked_in`

OTP source: `assignment_otp` field on the gig. Displayed from `accepted.find(a => a.assignment_otp)?.assignment_otp` in Grid.

## Explore / Matching

Runners see gigs via the Explore tab (Flames). Matching endpoint: `GET /api/v1/gigs/matches`.

**Prefetch:** When ≤10 cards remain, `fetchMoreGigs()` is triggered automatically.

**Filtering:** Already-applied gigs and gigs posted by the user are excluded from the deck.

## Applicants Screen (Mobile)

`gig/applicants/[gigId].tsx` — dark gradient header, Applicants title.

Per-applicant:
- Avatar (initials)
- Name, city, gigs completed
- Worker Momentum badge
- Accept / Reject (pending tab)
- Mark No-Show (accepted tab, after gig date)

## Applicants API (FastAPI)

| Endpoint | Description |
|----------|-------------|
| `GET /api/v1/gigs/mine` | Returns `PostedGigsResponse` — lightweight summary of host's posted gigs with `pending_count`; used by Grid Applications page chip strip. MUST be registered before `/{gig_id}` routes in `gigs.py` to avoid shadowing. |
| `GET /api/v1/gigs/{id}/applicants` | Returns `ApplicantListResponse`. Query params: `sort` (`momentum_desc`\|`momentum_asc`\|`newest`\|`oldest`, default `momentum_desc`) and `status` (alias for `filter_status`: `pending`\|`accepted`\|`all`, default `all`). Dynamic ORDER BY from a fixed dict (not user f-string). |
| `POST /api/v1/applicants/{id}/accept` | Accepts an applicant, creates assignment, sets OTP |
| `POST /api/v1/applicants/{id}/reject` | Rejects an applicant |
| `POST /api/v1/assignments/{id}/no-show` | Marks a runner as no-show (triggers momentum penalty) |

### `GET /gigs/mine` SQL

```sql
SELECT g.id, g.title, g.city, g.event_date::TEXT, g.status,
       g.slots_total, g.slots_filled,
       COUNT(ga.id) FILTER (WHERE ga.status = 'pending') AS pending_count
FROM gigs g
LEFT JOIN gig_applications ga ON ga.gig_id = g.id
WHERE g.poster_id = :poster_id
GROUP BY g.id ORDER BY g.event_date ASC
```

### `GET /gigs/{id}/applicants` — sort/filter params

```python
sort: Literal["momentum_desc","momentum_asc","newest","oldest"] = Query(default="momentum_desc")
filter_status: Literal["pending","accepted","all"] = Query(default="all", alias="status")
# WHERE ... AND (:filter_status = 'all' OR ga.status::text = :filter_status)
```

**Momentum sort no longer happens in SQL** (fixed 2026-07-31 — see [[momentum]] "Known Bug — Grid showed stale/wrong scores vs Pocket"). `mp.worker_score` is a stale persisted column; the query now fetches in a stable `applied_at` order and the endpoint sorts the assembled list in Python by a live-computed score (`_live_momentum_score()`, same formula `/momentum/me` uses). Same fix applied to `GET /applicants` (the cross-gig applicant list).

## Venue Maps Links (Mobile)

When `venue_lat`/`venue_lng` are set on a gig, the venue row becomes tappable in two places:
- **Gig Detail screen** (`app/(main)/gig/[id].tsx`) — lime pin icon + underlined text + external-link icon; tapping opens `https://www.google.com/maps/search/?api=1&query={lat},{lng}`
- **Space tab** (`app/(main)/(tabs)/space.tsx`) accepted gig cards — same lime treatment on compact meta row

If coordinates not set (older gigs), the row is non-interactive and stays default color. No API cost — Google Maps shareable URL is free.

## Poster Momentum Pipeline (Explore Cards)

Shows the Host's trust score on each gig card in Explore:

```
backend: ScoredGig.poster_score
  → matching.py: _poster_momentum_scores() queries momentum_profiles
  → frontend: MatchedGig.poster_score in lib/api/gigs.ts
  → gigStore.posterScores: Record<string, number> (gigId → score)
  → explore.tsx passes posterScores[gig.id] as posterMomentum prop
  → SwipeableJobCard → JobCard renders MomentumBadge chip
```

**Known dead field, not fixed:** `momentum_profiles.poster_score` (read by `matching.py` above) is never computed/written by anything in the codebase — always 0, so this badge always shows "Newcomer" regardless of the host's actual reliability. Found during the 2026-07-31 momentum investigation (see [[momentum]]); flagged there as arguably the wrong fix target anyway, since "Momentum" is meant to be Runner-only per product rules — `poster_reputation` (the real, already-correct /5 rating) is probably what this badge should show instead. Left alone since it wasn't what was reported.

## Expired Gigs — not filtered out everywhere (fixed 2026-07-31, needs deploy)

**Report:** testers saw expired (past-date) gigs in Pocket; asked for Grid to visually flag them too.

Investigation found the Explore swipe deck (`POST /gigs/match` → `matching.py`) already correctly filters `event_date >= CURRENT_DATE` — not the bug. The actual leak: Pocket's **"Jobs" tab** (`app/(main)/(tabs)/search.tsx` → `SearchTab.tsx` → `GET /api/v1/search`) is a separate, currently-*visible* tab in `RunnerTabsNavigator` (memory previously said this tab was hidden — stale; verified live in `_layout.tsx`: `search` uses `JOBS_OPT`, not `HIDDEN`, in the Runner navigator). `backend/api/app/routers/search.py`'s `_search_gigs`/`_search_events` only filtered by date when the user explicitly picked a date range — by default (no filter selected), expired gigs and events were included.

**Fix:** `search.py` now adds `g.event_date >= CURRENT_DATE` unconditionally to `_search_gigs`'s base filters (matching `matching.py`'s existing convention), and `(COALESCE(e.event_end_date, e.event_date) >= CURRENT_DATE)` unconditionally to `_search_events` (multi-day events stay listed until their *end* date passes, not their start date). No frontend change needed — `SearchTab.tsx` just calls this endpoint.

**Grid:** `gigs/page.tsx` list had no expired-gig treatment at all. Added `isExpired(gig)` helper — true when `status` is still `open`/`in_progress` (not `completed`/`cancelled`, which aren't "stale," they're resolved) and `(event_end_date ?? event_date) < today`. Expired rows get `opacity-60` (same treatment as `is_paused`) plus a new `ExpiredBadge` (`components/ui/Badge.tsx`, styled like the existing `PausedBadge`) next to the status badge. Only the list page — gig detail page has no equivalent treatment yet (not requested, possible follow-up).
