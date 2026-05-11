# Kria — Stack & Infrastructure

## Working Directory

`/home/halvis/Documents/projects/kriya/`

```
kriya/
├── frontend/
│   ├── pocket/        # Expo React Native app (Runners)
│   └── grid/          # Next.js Host dashboard
├── landing-page/      # Next.js marketing site (trykria.com)
├── backend/           # FastAPI Python server
│   └── api/
│       └── alembic/versions/   # DB migrations
└── docker-compose.yml
```

## Frontend — Mobile App

- **Framework:** Expo SDK 54, React Native
- **Routing:** expo-router (file-based, App Router style)
- **State:** Zustand stores (`stores/` directory)
- **Styling:** StyleSheet (NativeWind disabled — breaks Animated API)
- **Icons:** `@expo/vector-icons` (Feather set)
- **Fonts:** SpaceGrotesk (700Bold, 600SemiBold) — loaded in `app/_layout.tsx`
- **Animations:** React Native Animated API + PanResponder
- **Run:** `cd frontend/pocket && npx expo start`

Key package versions (pinned for SDK 54 compatibility):
- `expo: ~54.0.34`
- `react-native-reanimated: ~4.1.1`
- `react-native-gesture-handler: ~2.28.0`
- `babel-preset-expo: ~54.0.10`

## Grid — Host Dashboard

- **Framework:** Next.js 16.2.1 (App Router, all client components `"use client"`)
- **Styling:** Tailwind v4 (`@import "tailwindcss"` + `@theme {}` in `globals.css`, no `tailwind.config.ts`)
- **Icons:** lucide-react
- **Fonts:** Inter (body) + Comfortaa 700 (wordmark, `--font-comfortaa` var) via `next/font/google`
- **Auth:** Supabase client-side session
- **Run:** `cd frontend/grid && npm run dev` (port 3000)
- **Env:** `frontend/grid/.env.local` (copy from `.env.local.example`)

## Landing Page

- **Framework:** Next.js 16.2.1 (App Router, static export)
- **Styling:** Inline styles only (no Tailwind, no CSS modules)
- **Analytics:** `@vercel/analytics/next`
- **i18n:** React Context + static TS locale files (EN / हि / த)
- **Run:** `cd landing-page && npm run dev`
- **Deploy:** Vercel (auto-deploy from main branch)

## Backend — FastAPI

- **Language:** Python 3.x
- **Framework:** FastAPI + Pydantic v2
- **ORM:** SQLAlchemy async + Alembic migrations
- **Auth:** JWT (Supabase-issued tokens, verified by backend)
- **Port:** 8001 (host) → 8000 (inside container)
- **Run:** Docker (see below)
- **Momentum signals:** Plugin system — `app/momentum/signals/*.py` auto-discovered at startup via `pkgutil.iter_modules`. Restart container to pick up new signal files.
- **Run Python commands:** Always via Docker — `docker exec kriya_kria-api_1 python -c "..."` (never local Python; deps only in container)

## Database — Supabase (PostgreSQL)

- **Local Supabase API:** http://localhost:54321
- **Auth:** Phone OTP (mocked in dev: any phone + `123456`)
- **RLS:** Row-Level Security on all tables
- **Realtime:** Used for chat (subscription to `messages` table)
- **Migrations:** Alembic (backend-managed, auto-runs on startup)

## Inspector — ID Verification Pipeline

Standalone service at `perceptrons/inspector/`. **Integrated into the Kria dev stack** via `docker-compose.dev.yml`.

- **Stack:** FastAPI + InsightFace (RetinaFace + ArcFace) + MediaPipe + MiniFASNetV1SE (ONNX anti-spoof)
- **Endpoint:** `POST /verify` — multipart: `id_image` + `selfie` (JPEG/PNG/WebP, ≤10 MB each)
- **Response key fields:** `is_match` (bool), `confidence` ("high"/"medium"/"low"), `spoof_detected` (bool), `id_face_detected`, `selfie_face_detected`
- **Network:** Joins `kria-network` in dev compose → reachable by `kria-api` at `http://inspector:8000`
- **Config:** `INSPECTOR_URL=http://inspector:8000` env var on `kria-api`
- **RAM:** ~300–600 MB; single worker only (`--workers 1`)
- **First boot:** ~30–60s model load time; `kria-api` returns 503 until Inspector is healthy (graceful, not blocking)
- **Anti-spoof:** `ANTISPOOF_MODEL_ENABLED=False` in dev (false-positive risk on consumer webcams); set `True` in prod with controlled lighting
- **Named volume:** `insightface_models` — persists ~30 MB model weights across container restarts

## Docker

```bash
# Start backend + Supabase + Inspector
docker-compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up

# First time (Inspector image build takes ~5-10 min — downloads InsightFace + MiniFASNetV1SE)
docker-compose --env-file .env.dev -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Critical Docker gotcha:** `docker-compose 1.29.2` crashes on `--force-recreate`. Use `docker stop/rm/run` or plain `down && up`.

```bash
docker-compose down         # Stops containers, keeps DB data
docker-compose down -v      # DESTROYS all DB data — never use casually
```

## Ports Summary

| Service | Port |
|---------|------|
| Expo Metro | 8081 |
| FastAPI (host) | 8001 |
| FastAPI (container) | 8000 |
| Inspector (internal only) | 8000 (container, not exposed to host) |
| Supabase API | 54321 |
| Grid (dev) | 3000 |
| Landing page (dev) | varies |

## Production Hosting

| Component | Host | URL |
|-----------|------|-----|
| Landing page | Vercel | `trykria.com` |
| Grid (host dashboard) | Vercel | `grid.trykria.com` |
| Backend API | EC2 t3a.medium (ap-south-1) | `api.trykria.com` |
| Database | Supabase Cloud | Session pooler (IPv4) |
| Pocket (mobile) | EAS Build → App Store / Play Store | — |

**EC2 deploy:** `ssh ubuntu@EC2_IP` → `cd ~/kria && bash infra/deploy.sh`

**Grid deploy:** `cd ~/kria && git pull && cd frontend/grid && vercel --prod`

**Supabase keys (new format):**
- `sb_publishable_xxx` → `NEXT_PUBLIC_SUPABASE_ANON_KEY` (frontend)
- `sb_secret_xxx` → `SUPABASE_SERVICE_KEY` (backend)
- Legacy JWT keys still work until end of 2026

**Supabase JWT Signing Keys (CRITICAL):**
- Project has been migrated to **ECC P-256 (ES256)** asymmetric signing. New tokens are signed with the current ECC key, NOT the legacy HS256 shared secret.
- Backend `middleware.py` verifies via JWKS endpoint: `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`
- Legacy HS256 fallback kept for tokens issued before the rotation (still valid until expiry)
- `SUPABASE_JWT_SECRET` in `.env.prod` still needed for the HS256 fallback path

**DB connection:** Session mode pooler only — EC2 has no IPv6, Direct connection tab uses IPv6.

## Dynamic Backend URLs

`frontend/pocket/lib/config.ts` reads Metro bundler IP in dev; falls back to `EXPO_PUBLIC_*` env vars. Both `lib/api/client.ts` and `lib/supabase.ts` import from `lib/config.ts`. Never hardcode IPs.
