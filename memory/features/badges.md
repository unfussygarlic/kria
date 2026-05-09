---
name: Badges System
description: Full-stack badge system for Runners — milestone, streak, and ID verification badges
type: project
---

# Badges System

## Overview

Badges are earned achievements displayed on the Runner's profile and home screen. The system is idempotent — `award()` uses `INSERT ... ON CONFLICT DO NOTHING`, so it's safe to call multiple times.

## Badge Categories & Codes

### Milestone badges
| Code | Trigger |
|------|---------|
| `newcomer` | First authenticated API call (app open) |
| `first_gig` | 1 completed gig assignment |
| `gigs_3` | 3 completed gigs |
| `gigs_5` | 5 completed gigs |
| `gigs_10` | 10 completed gigs |
| `gigs_20` | 20 completed gigs |
| `gigs_50` | 50 completed gigs |
| `gigs_100` | 100 completed gigs |

### Streak badges (daily streak = each day the app is opened)
| Code | Trigger |
|------|---------|
| `streak_10` | 10 consecutive days |
| `streak_50` | 50 consecutive days |
| `streak_100` | 100 consecutive days |
| `streak_200` | 200 consecutive days |
| `streak_500` | 500 consecutive days |

### Identity badges
| Code | ID Type |
|------|---------|
| `id_aadhaar` | Aadhaar verified |
| `id_pan` | PAN verified |
| `id_driving_licence` | Driving licence verified |
| `id_passport` | Passport verified |
| `id_voter_id` | Voter ID verified |

## Backend Architecture

### `backend/api/app/services/badge_service.py`

All functions idempotent. Key pattern:
```python
async def award(db, user_id, badge_code) -> bool:
    result = await db.execute(
        text("INSERT INTO user_badges (profile_id, badge_id) "
             "SELECT :uid, id FROM badges WHERE code = :code "
             "ON CONFLICT (profile_id, badge_id) DO NOTHING RETURNING id"),
        {"uid": user_id, "code": badge_code},
    )
    awarded = result.rowcount > 0
    await db.commit()  # REQUIRED — get_db sessions don't auto-commit
    return awarded
```

- `award_newcomer(db, user_id)` — awards `newcomer`
- `check_gig_badges(db, user_id)` — counts `gig_assignments WHERE status='completed'`, awards all crossed thresholds
- `check_id_badges(db, user_id, id_type)` — awards `id_{id_type}`
- `update_streak(db, user_id)` — reads `last_active_date` from profiles; increments streak if yesterday, resets to 1 if gap, no-ops if already today; commits; checks streak milestones
- `sync_all_badges(db, user_id)` — full retroactive sync (called on every `GET /badges/me`)

### `backend/api/app/routers/badges.py`

`GET /api/v1/badges/me`:
1. Calls `sync_all_badges` (retroactive awarding for old users)
2. LEFT JOIN `badges` with `user_badges` for current user
3. Sorts: category order (milestone → streak → identity) + earned-first within category

### Hook Points (where badges are triggered)

| Event | File | Badge |
|-------|------|-------|
| App open / momentum fetch | `momentum/router.py` GET /me | newcomer + streak update |
| OTP check-in verified | `routers/applicants.py` POST /otp-verify | gig milestones |
| ID verification approved | `services/verification_queue.py` `_mark_verified()` | id_{type} |
| Viewing badges screen | `routers/badges.py` GET /badges/me | all (retroactive sync) |

## Database

### `badges` table
Seeded by migration `0019_revamp_badges.py`. Read-only from application code.
- `id`, `code` (unique), `name`, `description`, `category`
- `category` is text with CHECK constraint (not enum, to avoid ALTER TYPE transaction issues)

### `user_badges` table
- `id`, `profile_id`, `badge_id`, `earned_at`
- UNIQUE `(profile_id, badge_id)` — the `ON CONFLICT DO NOTHING` pattern relies on this

### Streak columns on `profiles` (migration 0019)
- `streak_count INT NOT NULL DEFAULT 0`
- `longest_streak INT NOT NULL DEFAULT 0`
- `last_active_date DATE`

## Frontend

### Store: `frontend/pocket/stores/badgeStore.ts`
Zustand: `badges`, `earnedCount`, `totalCount`, `isLoading`, `fetchBadges()`

### API: `frontend/pocket/lib/api/badges.ts`
`getMyBadges()` → `GET /api/v1/badges/me`

### Badges Screen: `frontend/pocket/app/(main)/badges.tsx`
- Summary: earned/total count + progress bar
- Three sections with 2-column `BadgeTile` grids
- Earned: full opacity, colored icon bg, earned date
- Locked: 55% opacity, lock icon + "Locked"

### Home Screen Integration (`BadgeMarquee`)
- Horizontal auto-scrolling ticker showing earned badges
- Only scrolls when `earned.length > 3`
- Speed: 0.25px per 16ms tick (setInterval)
- Duplicates list for seamless loop
- Uses `ScrollView scrollEnabled={false}` + `scrollRef.scrollTo({ x, animated: false })`

## Key Bugs Fixed During Implementation

1. **Badges showing 0 earned**: `award()` and `update_streak()` never called `db.commit()`. `get_db` yields sessions without auto-commit — all INSERTs silently rolled back.
2. **`/badges/me` 404**: `getMyBadges()` used path `/badges/me` without the `/api/v1` prefix.
3. **Existing verified IDs not showing**: Hook-based awarding only fires on new verifications. Fixed by `sync_all_badges()` on every GET /badges/me.
4. **BadgeMarquee hooks violation**: `useRef`/`useEffect` called after an early return — moved all hooks before the early return.
