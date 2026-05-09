# Dev Setup

## Running the Stack

### Mobile App
```bash
cd frontend/pocket
npx expo start
# Open in Expo Go on device, or press 'i' for iOS simulator
```

### Backend + Supabase (Docker)
```bash
docker-compose --env-file .env.dev \
  -f docker-compose.yml \
  -f docker-compose.dev.yml up
```

### Grid (Host Dashboard)
```bash
cd frontend/grid
npm install          # first time only
npm run dev          # starts on port 3000
```

### Landing Page
```bash
cd landing-page
npm run dev
```

## Ports

| Service | Port |
|---------|------|
| Expo Metro | 8081 |
| FastAPI (host) | 8000 |
| FastAPI (container) | 8000 |
| Supabase API | 54321 |
| Grid | 3000 |

## Dev Auth Credentials

- **Phone OTP (any number):** Enter any phone → OTP is always `123456`
- **Under the hood:** `{digits}@kriya.dev` email + password `kriya-dev-2026`
- **JWT secret:** `super-secret-jwt-token-with-at-least-32-characters-long`

## Environment Files

### `.env.dev` (root — gitignored, NOT committed)
- All Docker secrets live here: Supabase keys, JWT secret, Twilio, `GOOGLE_MAPS_API_KEY`
- `.env.development` was deleted; `.env.*` is now fully gitignored except `.env.example`
- Pass to docker-compose via `--env-file .env.dev`

### `frontend/pocket/.env`
- `EXPO_PUBLIC_SUPABASE_URL` — Supabase local API URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` — local anon key
- `EXPO_PUBLIC_API_URL` — FastAPI URL (dynamic in dev via `lib/config.ts`)

### `frontend/grid/.env.local` (copy from `.env.local.example`)
```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Same values as `frontend/pocket/.env`.

## Docker Gotchas

**`docker-compose 1.29.2` crashes on `--force-recreate`.**  
Use `docker stop/rm/run` or plain `down && up` instead.

```bash
docker-compose down        # stops containers, keeps DB data
docker-compose down -v     # DESTROYS all DB data — never use casually
```

## Database Migrations

Migrations are Alembic files in `backend/api/alembic/versions/`. They **auto-run on backend startup**.

To create a new migration:
```bash
cd backend/api
alembic revision --autogenerate -m "0009_description"
# Review the generated file before running
```

Next migration number: `0018`

## Dynamic Backend URLs

`frontend/pocket/lib/config.ts` reads Metro bundler IP in dev; falls back to `EXPO_PUBLIC_*` env vars. Never hardcode IP addresses in API calls — always import from `lib/config.ts`.

## First-Time Grid Setup

```bash
cd /home/halvis/Documents/projects/kriya/frontend/grid
npm install
cp .env.local.example .env.local
# Fill in .env.local with Supabase values from frontend/pocket/.env
npm run dev
```
