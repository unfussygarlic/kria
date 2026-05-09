# Kria — Data Access Patterns

## Rule of Thumb

| Use | When |
|-----|------|
| **Supabase client directly** | Simple CRUD by user ID (RLS handles auth), profile reads, gig creation by poster |
| **FastAPI endpoint** | Complex queries, multi-table writes, score updates, matching logic, anything needing server-side auth |

## FastAPI Auth Pattern

```python
# In any router
from app.auth.middleware import get_current_user, AuthenticatedUser
from typing import Annotated

CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]

@router.get("/me")
async def get_me(user: CurrentUser, db: AsyncSession = Depends(get_db)):
    ...
```

DB session: `AsyncSession = Depends(get_db)` from `app/db/session.py`

## Frontend API Utilities

`frontend/pocket/lib/api/client.ts`:
- `apiGet(path, token?)` — GET request to FastAPI
- `apiPost(path, body, token?)` — POST request
- `apiPatch(path, body, token?)` — PATCH request

`frontend/pocket/lib/supabase.ts` — Supabase JS client (uses config.ts for URL)

`frontend/pocket/lib/config.ts` — reads Metro bundler IP in dev, falls back to `EXPO_PUBLIC_*` env vars

Grid equivalents in `grid/lib/`:
- `grid/lib/api/client.ts` — `apiGet`, `apiPost`, `apiPatch` with Supabase session header
- `grid/lib/supabase.ts` — Supabase JS client for Grid

## Profile Updates

Direct Supabase via `useAuthStore.updateProfile()` — no FastAPI needed for simple profile edits.

## Inserting and Getting a Row

When you need the inserted row immediately:
```typescript
const { data } = await supabase.from("gigs").insert({...}).select().single();
```

## Supabase Auth Token for FastAPI

```typescript
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;
// Pass as Bearer token to FastAPI endpoints
```

## Key API Endpoints (FastAPI)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/momentum/me` | My worker + poster scores |
| GET | `/api/v1/momentum/me/breakdown` | Full signal breakdown |
| GET | `/api/v1/momentum/user/{id}` | Another user's public scores |
| GET | `/api/v1/gigs/matches` | Matched gigs for runner (with poster scores) |
| GET | `/api/v1/events/my` | My posted events (Host) |
| GET | `/api/v1/events/{id}` | Event detail (public) |
| POST | `/api/v1/events` | Create event |
| POST | `/api/v1/events/{id}/jobs` | Add job to event |
| GET | `/api/v1/gigs/{id}/applicants` | List applicants for a gig |
| POST | `/api/v1/applicants/{id}/accept` | Accept applicant |
| POST | `/api/v1/applicants/{id}/reject` | Reject applicant |
| POST | `/api/v1/assignments/{id}/no-show` | Mark runner no-show |

## Profile Completion

Tracks which profile fields are filled.

- **Backend:** `backend/api/app/services/profile_completion.py` — `PROFILE_FIELDS` list
- **Frontend:** `frontend/pocket/lib/profileCompletion.ts` — same list
- To add a field: append to `PROFILE_FIELDS` in **both** files.

## Pydantic Date/Time Note

Always convert Pydantic string dates/times to Python `date`/`datetime` objects before PostgreSQL insert. Pydantic v2 returns strings by default for date fields.
