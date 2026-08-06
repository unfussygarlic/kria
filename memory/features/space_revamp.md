---
name: My Space Revamp (2026-08-07)
description: Backend expansion of AcceptedGigItem + cancel endpoint + Pocket countdown/directions/cancel/share
type: project
---

# My Space Revamp (Pocket, 2026-08-07)

## Why

Space had a solid card layout but no "active shift" moment — no countdown, no directions, no way for a runner to cancel cleanly without a no-show hit. Compared to [DoorDash's active-dash view](https://shifttrackerapp.com/blog/doordash-vs-uber-eats-vs-grubhub-app-interface-compared-2026): runners were flying blind on their upcoming shifts.

## Backend

**Expanded `AcceptedGigItem` response** — added `description`, `cover_image_url`, `event_end_date`, `is_multi_day`, `report_time`, `slots_total`, `slots_filled`, `dress_code`, `languages_required`, `gender_preference`, `experience_required`, `requirements_note`. Sheet no longer has to link runners to gig detail for basic info.

**New `POST /api/v1/assignments/{id}/cancel` endpoint** — runner cancels an accepted shift BEFORE it starts:
- Rules: runner-only, only cancellable while `status = 'assigned'`, only cancellable BEFORE shift end. After that → no-show flow.
- Effects: `gig_assignments.status = 'cancelled'`, `gig_applications.status = 'withdrawn'`, `gigs.slots_filled -= 1` (slot freed for another runner).
- **No momentum penalty for MVP** — cancelling cleanly beats a no-show, and the slot immediately reopens.

**Migration `0033_assignment_cancelled_status.py`** — adds `'cancelled'` to the `assignment_status` PostgreSQL enum. Rollback is a no-op (postgres can't drop enum values).

## Pocket UI

**Compact countdown pill** on every upcoming card (`CountdownPill compact`) — auto-refreshes every 30s, colour-escalates: lime > 6h out → amber < 6h → coral < 1h → animated "Live now" pulse during the shift window. Also on the sheet header (full-size).

**New action row in GigDetailSheet** for upcoming shifts:
- **Directions** → `openDirections()` opens Google Maps in navigation mode (`dir/?destination=lat,lng&travelmode=driving`). Falls back to a pin-drop if the nav intent fails.
- **Share** → native `Share.share` with the gig title + pay + venue + `trykria.com/gig/{id}` URL (URL will resolve properly once public gig pages ship).
- **Cancel** → confirmation Alert → `cancelAssignment(id)` → success haptic → optimistically drops the item from the list via `onCancelSuccess`.

## New files

- `frontend/pocket/lib/shiftTime.ts` — `countdownLabel`, `isLive`, `isImminent`, `shiftStartTs/shiftEndTs`
- `frontend/pocket/lib/openMaps.ts` — `openLocation` (pin-drop) + `openDirections` (nav intent)
- `frontend/pocket/components/space/CountdownPill.tsx` — live-refreshing pill with colour escalation

## Deferred

**Add-to-calendar** — needs `expo-calendar` (new native module → EAS rebuild). Left for a follow-up so this diff stays JS-only where possible. Everything else works via existing native deps (`expo-haptics`, `expo-linear-gradient`, `Share`, `Linking`).

## Deploy

Backend first (Pocket depends on the expanded response + cancel endpoint):
```bash
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build kria-api -d
docker exec kriya_kria-api_1 alembic upgrade head  # runs 0033 automatically on startup anyway
```
Then Pocket EAS update.
