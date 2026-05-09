# Events Feature

## Overview

Events are containers for multiple gigs. A Host can create an event (e.g., a festival, corporate event) and add multiple roles/jobs to it. Runners apply to individual gigs within the event.

**Migration:** 0006 — adds `events` table + `gigs.event_id` nullable FK.

## Data Model

- `events`: `id`, `poster_id`, `title`, `description`, `venue`, `city`, `event_date`, `is_multi_day`, `end_date`
- `gigs.event_id` — nullable FK to events. NULL = standalone gig.

## isHost Detection

`GET /api/v1/events/{id}` is a **public endpoint** (no ownership check) and includes `poster_id` in the response. Frontend uses:
```typescript
const isHost = event.poster_id === profile?.id;
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/events` | Host | Create event |
| POST | `/api/v1/events/{id}/jobs` | Host (ownership check) | Add a job/role to event |
| GET | `/api/v1/events/my` | Auth | My posted events list |
| GET | `/api/v1/events/{id}` | Public | Event detail with jobs |

## Event Creation (Grid — 2-step wizard)

**Step 1: Event Details**
- Title, venue, city, date, multi-day toggle (+ end date if yes), description

**Step 2: Roles**
- Dynamic list of `JobInEventCreate` items
- Each role: title, slots, pay_amount, pay_type, shift_start, shift_end, category, description
- Add / remove roles
- Minimum 1 role required

Submits via `createEvent()` FastAPI endpoint → redirect to `/events/${data.id}`.

## Event Creation (Mobile — currently hidden)

`frontend/pocket/app/(main)/event/create.tsx` — same 2-step flow. Accessible from Host FAB → "Create an Event".

## Event Detail

**Host view:**
- Job rows navigate to `/gigs/${job.id}` (applicants management)
- Shows applicant count per job
- "Add Another Job" footer
- Summary shows "Applicants"

**Runner view:**
- Job rows navigate to gig detail (apply flow)
- Shows open slots per job
- No footer
- Summary shows "Open Slots"

## Mobile Event Detail (`event/[id].tsx`)

`isFinder = event.poster_id === profile?.id` (legacy var name, same logic as isHost).

Host sees: jobs → applicants; applicant counts; "Add Another Job" footer.
Runner sees: jobs → gig detail (apply); open slots; no footer.
