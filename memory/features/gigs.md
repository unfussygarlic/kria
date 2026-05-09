# Gigs Feature

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

1. **Category** — emoji grid (14 categories)
2. **Basic Info** — title, company, description, slots, pay amount + type
3. **Schedule** — venue, city, date, shift start/end, report time
   - "Fetch Location" button appears when venue + city are filled
   - Calls `POST /api/v1/recommendations/geocode` (server-side Google Maps, auth required)
   - Shows resolved address + lat/lng inline; clears automatically when venue/city changes
4. **Requirements** — gender preference, dress code, languages, experience, note

On submit:
1. `supabase.from("gigs").insert({...}).select().single()` — creates gig row
2. If geocoded: `PATCH /api/v1/gigs/{id}/location` — sets `location_point` (PostGIS), `venue_lat`, `venue_lng`, `venue_formatted_address`
3. Redirect to `/gigs/${gig.id}`

**Key files:** `grid/app/(dashboard)/gigs/new/page.tsx`, `grid/lib/api/recommendations.ts`

## Categories

14 categories: Events/Hospitality, Retail, Promotions, Delivery, Security, Housekeeping, F&B, Healthcare Support, Logistics, Admin/Office, IT Support, Tutoring, Fitness/Sports, Other.

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

sort_clause = {
    "momentum_desc": "COALESCE(mp.worker_score, 0) DESC, ga.applied_at ASC",
    "momentum_asc":  "COALESCE(mp.worker_score, 0) ASC,  ga.applied_at ASC",
    "newest":        "ga.applied_at DESC",
    "oldest":        "ga.applied_at ASC",
}[sort]
# WHERE ... AND (:filter_status = 'all' OR ga.status::text = :filter_status)
```

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
