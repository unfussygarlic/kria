# Kria - Development Changelog

## 2026-02-15 (Session 3)

### Profile System Overhaul

**What Changed:**

**DB — Migration 0005** (`backend/api/alembic/versions/0005_add_profile_fields.py`):
- New columns on `profiles`: `first_name`, `last_name`, `state`, `id_type`, `id_value`, `id_verified_at`, `experience_summary`
- Added `non_binary` to `gender_type` enum

**Backend — new files:**
- `backend/api/app/models/profile.py` — `IdentityVerificationRequest` Pydantic model with per-type validators (Aadhaar, PAN, DL, Voter ID, Passport). Strips spaces, uppercases, validates format.
- `backend/api/app/services/profile_completion.py` — data-driven `PROFILE_FIELDS` list + `calculate_completion()`. Add new fields with one line, no function changes needed.
- `backend/api/app/routers/profiles.py` — `POST /api/v1/profiles/verify-identity` (mock), `GET /api/v1/profiles/me/completion`
- `backend/api/app/main.py` — includes `profiles` router

**Frontend — new / changed files:**
- `frontend/types/database.ts` — new profile columns + `"non_binary"` in GenderType
- `frontend/lib/profileCompletion.ts` — TS mirror of Python completion function (same data structure, same logic)
- `frontend/lib/api/profile.ts` — `verifyIdentity()` + `ID_TYPE_OPTIONS` with hints
- `frontend/lib/api/client.ts` — `extractError()` helper: handles Pydantic 422 `detail` arrays (strips "Value error, " prefix)
- `frontend/app/onboarding/profile.tsx` — 4-step onboarding: Name → DOB (native DateTimePicker) → Gender cards → City+State
- `frontend/stores/authStore.ts` — `isOnboarded` now checks `first_name + date_of_birth + gender + city + state`
- `frontend/app/(main)/edit-profile.tsx` — (new) optional fields: bio, languages, skills, education, experience
- `frontend/app/(main)/verify-identity.tsx` — (new) ID type selector + value input + success/already-verified states
- `frontend/app/(main)/(tabs)/profile.tsx` — completion progress bar card, Edit Profile + Verify Identity wired

**Dependency added:** `@react-native-community/datetimepicker`

**Why:**
- Onboarding was collecting wrong fields (college/languages) — moved those to optional edit profile
- Identity verification needed backend validation (Pydantic) before mock → real swap
- Profile completion needed to be future-proof (data-driven, never rewrite the function)

---

## 2026-02-15 (Session 2)

### Bug Fixes & Alembic Migration System

**What Changed:**
- Fixed RLS infinite recursion on `gigs` table (SECURITY DEFINER helper functions in migration 0005 of the old SQL runner, baked into Alembic migration 0002)
- Fixed FastAPI `matching.py` wrong column names (`is_remote`→computed, `boost_level`→`momentum_boost`, `starts_at`→`event_date`, table names, `rated_id`→`ratee_id`)
- Replaced bash `supabase-db-migrations` Docker service with Alembic (`backend/api/alembic/`, runs in `kria-api` container on start)
- OTP input rewritten with single hidden TextInput pattern (reliable cross-platform)

---

## 2026-02-14

### Initial Architecture Setup

**What Changed:**
- Created memory system with 8 foundational documents
- Defined product vision and non-negotiables
- Designed domain model with all core entities
- Specified momentum earning/spending rules
- Designed dual reputation system
- Documented trust-first matching algorithm
- Made key UX decisions (colors, navigation, flows)
- Selected tech stack (Expo, TypeScript, Supabase)
- Logged open questions and assumptions

**Why:**
- Establishing clear foundation before code
- Ensuring AI agents have context for future development
- Documenting decisions to prevent drift

**Key Decisions:**
1. Momentum cannot be purchased (anti-pay-to-win)
2. Dual reputation (worker + poster) for accountability
3. Trust-first matching (not distance-only)
4. Phone OTP auth (India market fit)
5. Off-platform payment for MVP (escrow in v2)

**Next Steps:**
- Create Supabase SQL schema
- Set up Expo project structure
- Implement auth flow
- Build skeleton screens

---

### Infrastructure & Docker Setup

**What Changed:**
- Created `core.md` as master instruction file for AI agents
- Set up Docker infrastructure with dev/prod separation
- Created frontend/ folder with Expo Dockerfiles
- Created backend/ folder with Supabase Dockerfiles + Kong config
- Docker compose files at root level for easy access
- Environment variable templates (.env.example, .env.development)

**Structure:**
```
/kria
├── memory/           # AI agent hippocampus
├── frontend/         # Expo app + Dockerfiles
├── backend/          # Supabase + Dockerfiles
├── docker-compose.yml
├── docker-compose.dev.yml
├── docker-compose.prod.yml
└── .env.*
```

**Key Decisions:**
1. Frontend and backend as sibling folders (not nested)
2. Docker compose at root for single-command startup
3. Memory folder is the AI agent's persistent context
4. `core.md` must be read first in any new session

**Commands:**
```bash
# Start development
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Production build
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

**Next Steps:**
- Create Supabase SQL schema with migrations
- Initialize Expo project in frontend/
- Implement phone OTP auth flow
- Build skeleton screens

---

### Product Vision Clarification

**What Changed:**
- Clarified product focus: Event staffing & brand activation (NOT home services)
- Updated gig categories to event-focused types
- Added student-specific profile fields (college, course, year)
- Added event-specific gig fields (venue, shift times, dress code, requirements)
- Added new open questions for event-specific features

**Why:**
User clarified that Kria is for:
- Tech summits needing registration staff
- Companies hiring booth staff for exhibitions
- Brand activations needing promoters
- NOT cleaning, delivery, moving, handyman work

**Target Demographic:**
- Workers: College students (18-25), young professionals (25-30)
- Posters: Event companies, corporate organizers, brand agencies

**New Gig Categories:**
- registration_desk, ushering, booth_staff, brand_ambassador
- sampling, lead_generation, hospitality, tech_support
- photography, social_media, anchoring, promotional, general_support

**New Profile Fields:**
- is_student, college_name, college_year, course
- languages, skills
- date_of_birth, gender

**New Gig Fields:**
- venue_name, event_name, company_name
- shift_start_time, shift_end_time, report_time
- dress_code, gender_preference, languages_required
- is_multi_day, event_end_date

**Next Steps:**
- Create Supabase SQL schema (event-focused)
- Initialize Expo project
- Build auth + skeleton screens

---

### Full Implementation: Schema, Expo, Skeleton Screens

**What Changed:**

**Backend (Supabase):**
- Created 4 SQL migrations:
  - `000_initial_schema.sql` - Tables, types, indexes for event-focused data model
  - `001_rls_policies.sql` - Row Level Security for all tables
  - `002_functions.sql` - Auth triggers, momentum functions, gig lifecycle
  - `003_seed_badges.sql` - Initial badge definitions

**Frontend (Expo):**
- Initialized Expo project with TypeScript, NativeWind, Zustand
- Created core files:
  - `lib/supabase.ts` - Supabase client with secure storage
  - `types/database.ts` - TypeScript types for all entities
  - `constants/colors.ts` - Color palette (light mode)
  - `constants/config.ts` - App config, categories, languages
  - `stores/authStore.ts` - Auth state and actions
  - `stores/gigStore.ts` - Gig state and actions
  - `stores/walletStore.ts` - Momentum wallet state

**Screens Implemented:**
- Auth: Login (phone input), Verify (OTP)
- Onboarding: Profile setup (name, city, student info, languages)
- Home: Dual tab feed (Available Gigs / My Posted Gigs)
- Search: Category filters, text search
- Profile: Stats, momentum badge, menu items
- Gig Details: Full gig info, apply button
- Post Gig: 4-step wizard (category → details → schedule → requirements)
- Wallet: Momentum balance, transaction history

**Components:**
- `GigCard` - Card display for gig listings

**Files Created:**
```
backend/supabase/migrations/
  20260214000000_initial_schema.sql
  20260214000001_rls_policies.sql
  20260214000002_functions.sql
  20260214000003_seed_badges.sql

frontend/
  package.json, app.json, tsconfig.json
  tailwind.config.js, babel.config.js
  lib/supabase.ts
  types/database.ts
  constants/{colors,config}.ts
  stores/{authStore,gigStore,walletStore}.ts
  components/gig/GigCard.tsx
  app/_layout.tsx, app/index.tsx
  app/(auth)/{_layout,login,verify}.tsx
  app/onboarding/{_layout,profile}.tsx
  app/(main)/{_layout,wallet}.tsx
  app/(main)/(tabs)/{_layout,index,search,profile}.tsx
  app/(main)/gig/[id].tsx
  app/(main)/post/{_layout,index}.tsx
```

**Next Steps:**
- Install dependencies (`npm install` in frontend/)
- Run Docker for local Supabase
- Test auth flow
- Add real date/time pickers
- Add location picker
- Implement applicant management for posters

---

### Docker Debugging: Supabase Service Role Passwords

**What Changed:**
- Fixed critical issue where Supabase services (auth, rest, storage) couldn't connect to database
- Root cause: `supabase/postgres` image creates service roles WITHOUT passwords
- Solution: Mount custom init script to set passwords AFTER roles are created

**The Problem:**
1. Services connect over Docker network using scram-sha-256 auth
2. Roles exist but have NULL passwords
3. `pg_hba.conf` uses `trust` for localhost (why manual tests worked) but requires password for network connections

**Key Learnings:**
1. Docker Compose v1 (`docker-compose`) doesn't properly support `condition: service_completed_successfully`
2. Files in `/docker-entrypoint-initdb.d/` run in ASCII sort order (numbers before letters)
3. The supabase/postgres image has its own init scripts in `init-scripts/` subdirectory run by `migrate.sh`

**The Fix:**
```yaml
# Mount password init script INSIDE init-scripts/ to run after role creation
volumes:
  - ./backend/supabase/init/zzz-roles.sql:/docker-entrypoint-initdb.d/init-scripts/99999-set-passwords.sql:ro
```

**Files Created:**
- `backend/supabase/init/zzz-roles.sql` - Sets passwords for authenticator, supabase_auth_admin, supabase_storage_admin, supabase_admin

**Commands:**
```bash
# Start development (with env file for docker-compose v1)
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up

# Reset and restart (clears volumes)
docker-compose -f docker-compose.yml -f docker-compose.dev.yml down -v
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up
```

**Services Running:**
| Service | URL | Purpose |
|---------|-----|---------|
| Expo Dev | http://localhost:8081 | Mobile app dev server |
| Supabase API | http://localhost:54321 | REST/Realtime API |
| Supabase Studio | http://localhost:54323 | Database UI |
| PostgreSQL | localhost:54322 | Direct DB access |

**Next Steps:**
- Install frontend dependencies
- Test auth flow
- Build out remaining features

---

### Expo SDK Version & Node.js Compatibility

**What Changed:**
- Discovered Node.js version incompatibility
- User has Node v18.19.1, but Expo SDK 54 (matching Expo Go app) requires Node 20+
- Temporarily downgraded to SDK 51 for Node 18 compatibility
- Project currently set to SDK 51, but user's Expo Go is SDK 54

**Current State:**
- `package.json`: Expo SDK 51
- `app.json`: sdkVersion 51.0.0
- Node requirement: 18+ (current user version: 18.19.1)

**Next Steps (for next session):**
1. Install Node 20 via nvm:
   ```bash
   curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
   source ~/.bashrc
   nvm install 20
   nvm use 20
   ```

2. Upgrade project to SDK 54:
   - Update `package.json` with SDK 54 dependencies
   - Update `app.json` sdkVersion to 54.0.0
   - Add NativeWind v4 config (metro.config.js, global.css)
   - Reinstall dependencies

3. Run Expo and scan QR with Expo Go

**Key SDK 54 Dependencies:**
```json
{
  "expo": "~54.0.0",
  "react": "18.3.1",
  "react-native": "0.76.6",
  "expo-router": "~4.0.0",
  "nativewind": "^4.1.0"
}
```

**Files to update after Node 20:**
- `frontend/package.json` - SDK 54 versions
- `frontend/app.json` - sdkVersion: "54.0.0"
- `frontend/metro.config.js` - NativeWind v4 config
- `frontend/global.css` - Tailwind imports
- `frontend/babel.config.js` - NativeWind v4 preset
- `frontend/app/_layout.tsx` - import global.css

---

## 2026-02-14 (Session 2)

### SDK 54 Upgrade & Development Environment Setup

**What Changed:**
- Upgraded from SDK 51 to SDK 54 (matching Expo Go version)
- Fixed Android SDK environment variables (`ANDROID_HOME`, `PATH`)
- Configured frontend to run separately from Docker (backend only in Docker)
- Implemented mock SMS authentication for development
- Set up proper network configuration for phone testing (using local IP instead of localhost)

**SDK 54 Configuration:**
- Node.js v20.20.0 (required for SDK 54)
- React 19.1.0, React Native 0.81.5
- Expo Router 6.0.x
- Resolved `react-native-screens` compatibility issue (downgraded to 4.16.0)

**Development Workflow:**
```bash
# Backend (Docker - Supabase only)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Frontend (Terminal - separate)
cd frontend && npx expo start
```

**Mock SMS Authentication:**
- Problem: Supabase GoTrue always tries to send real SMS, even with autoconfirm
- Solution: Implemented development bypass in frontend auth flow
- In dev mode: Use phone number + OTP "123456" (no external SMS service needed)
- Uses Supabase password auth under the hood for development
- Production will use real phone OTP once Twilio is configured

**Files Changed:**
- `frontend/package.json` - SDK 54 dependencies
- `frontend/app.json` - sdkVersion: "54.0.0"
- `frontend/.env` - Local network IP for phone testing
- `frontend/stores/authStore.ts` - Mock OTP implementation
- `docker-compose.dev.yml` - Removed frontend service, enabled password auth
- `~/.bashrc` - Android SDK environment variables

**Key Decisions:**
1. Frontend runs separately from Docker for faster development/hot-reload
2. Mock SMS in development to avoid external service dependencies during initial development
3. Use local network IP (192.168.0.7) for phone testing via Expo Go
4. Backend (Supabase) only runs in Docker

**Network Configuration:**
- Backend: `http://192.168.0.7:54321` (accessible from phone)
- Frontend: Runs on development machine, scanned via QR code
- Supabase services exposed on local network for phone access

**Next Steps:**
- Test the mock OTP flow (phone: any number, OTP: 123456)
- Complete onboarding screens
- Build out gig posting and application flows
- Add Twilio credentials when ready for production testing

---

## 2026-02-14 (Session 3)

### Architecture Decision: Adding FastAPI Backend

**What Changed:**
- Decided to use **hybrid Supabase + FastAPI architecture**
- Created comprehensive architecture documentation (`memory/architecture.md`)
- Updated tech stack decisions to reflect backend layer

**Decision Rationale:**

After reviewing all memory files (product vision, domain model, matching logic, momentum system, reputation system), concluded that Kria needs custom backend logic that's too complex for pure Supabase:

1. **Complex matching algorithms:**
   - Multi-factor scoring (trust, distance, category, pay, recency)
   - Previous interaction bonuses
   - Geographic considerations
   - Too complex for SQL/PostgREST

2. **Momentum anti-gaming logic:**
   - Daily caps (500/day)
   - Weekly caps (3000/week)
   - Transaction atomicity
   - Easier to enforce in backend

3. **Reputation calculations:**
   - Weighted scoring
   - Outlier detection for revenge ratings
   - Trust score computation
   - Complex formulas better in Python

4. **Future requirements:**
   - Payment escrow integration
   - Background jobs (gig expiry, notifications)
   - SMS integration (Twilio)
   - GPS check-in verification
   - All require custom backend

**Architecture:**
```
Mobile App (Expo)
    ↓
FastAPI (Business Logic)
    ↓
Supabase (Auth + DB + Realtime + Storage)
```

**Responsibility Division:**
- **FastAPI:** Matching, scoring, momentum limits, external integrations, background jobs
- **Supabase:** Auth, database, realtime subscriptions, file storage, RLS security
- **Mobile App:** UI/UX, local state, API calls

**Technology Stack - Backend:**
- Python 3.11+
- FastAPI (async API framework)
- Pydantic (data validation)
- SQLAlchemy (database ORM)
- Supabase Python client
- Celery + Redis (background tasks, future)

**Key Benefits:**
1. Separation of concerns (data vs logic)
2. Independent scalability
3. Better for complex algorithms
4. Easier external integrations
5. Future-proof for growth

**Trade-offs Accepted:**
1. More complexity (one more service)
2. Network latency (mobile → API → DB)
3. Development overhead (Python codebase)

**Files Created/Updated:**
- `memory/architecture.md` - Comprehensive architecture documentation
- `memory/tech_decisions.md` - Updated to include FastAPI backend
- `memory/changelog.md` - This entry

**Next Steps:**
1. Set up FastAPI project structure in `/backend/api/`
2. Create basic FastAPI app with health check
3. Implement JWT auth middleware (validate Supabase tokens)
4. Create first endpoint (gig matching algorithm)
5. Update mobile app to call FastAPI instead of direct Supabase queries
6. Document all API endpoints (OpenAPI)

---

## 2026-02-14 (Session 4)

### FastAPI Backend Setup

**What Changed:**
- Created `/backend/api/` FastAPI project with full structure
- Added `kria-api` service to Docker Compose (runs in Docker, NOT locally)
- Implemented JWT auth middleware validating Supabase tokens
- Implemented gig matching algorithm (`POST /api/v1/gigs/match`)
- Health check endpoints: `GET /health` and `GET /health/db`

**Structure Created:**
```
backend/api/
  app/
    main.py           # FastAPI app entry point
    config.py         # Settings (pydantic-settings, reads from env)
    auth/middleware.py # JWT validation, CurrentUser dependency
    db/session.py     # SQLAlchemy async engine
    models/gig.py     # Pydantic models (GigRow, GigMatchRequest, etc.)
    routers/health.py # GET /health, GET /health/db
    routers/gigs.py   # POST /api/v1/gigs/match
    services/matching.py # Full scoring algorithm
  requirements.txt
  Dockerfile
  .env.example
```

**Docker Integration:**
- `kria-api` service added to `docker-compose.yml`
- Dev override in `docker-compose.dev.yml` adds port 8000 + `--reload` + volume mount
- Connects to `supabase-db:5432` and `supabase-kong:8000` by Docker service name
- Env vars sourced from `.env.development` (JWT_SECRET, SUPABASE_SERVICE_ROLE_KEY, etc.)

**Gig Matching Algorithm (POST /api/v1/gigs/match):**
- Weights: trust 35%, distance 25%, category 20%, pay 10%, recency 10%
- Boost multipliers: level 1=2x, 2=5x, 3=10x on recency score
- Previous poster interaction bonuses (+0.3 success, -0.2 negative)
- Haversine distance filtering by `max_distance_km`
- Returns scored & sorted gig list

**Key Decisions:**
1. FastAPI runs in Docker (not locally) - consistent with rest of backend
2. Uses SQLAlchemy async directly against PostgreSQL (not Supabase REST client for data queries)
3. SUPABASE_URL points to `supabase-kong:8000` inside Docker

**Commands:**
```bash
# Start everything (Supabase + FastAPI)
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up

# View API docs (in dev)
# http://localhost:8000/docs
```

**Next Steps:**
1. Update frontend to call FastAPI (`EXPO_PUBLIC_API_URL=http://192.168.0.7:8000`)
2. Add `POST /api/v1/applicants/rank` (poster views applicants)
3. Add `POST /api/v1/momentum/earn` and `spend` with cap enforcement
4. Add `GET /api/v1/gigs/feed` (gig feed = match results for current user)

---

## 2026-02-14 (Session 5)

### Frontend Integration & Auth Debugging

**What Changed:**

**Frontend API layer:**
- Created `frontend/lib/api/client.ts` — HTTP client that attaches Supabase JWT to FastAPI requests
- Created `frontend/lib/api/gigs.ts` — `matchGigs()` wraps `POST /api/v1/gigs/match`
- Updated `gigStore.fetchGigs()` — calls FastAPI for ranked IDs, Supabase for full gig data, falls back to Supabase sort if FastAPI unreachable
- Added `EXPO_PUBLIC_API_URL=http://192.168.0.7:8000` to `frontend/.env`

**Dev auth overhaul (multiple iterations):**
- Replaced phone+password mock auth with **email-based mock auth**
- Email derived from phone digits only: `{digits}@kria.dev` (handles `+91...` vs `91...` formatting)
- Constant password `kria-dev-2026` (not derived from phone input)
- `signInWithPassword` attempted first; `signUp` only for new users; explicit `signInWithPassword` after `signUp` if no session returned

**Auth store improvements:**
- `fetchProfile` returns `boolean` (true = success)
- `initialize` signs out if stored session fails profile fetch (stale session handling)
- `fetchProfile` does NOT sign out on error — only `initialize` does
- Fixed `ExpoSecureStoreAdapter` in `lib/supabase.ts`: `setItem`/`removeItem` now return their promises

**Database:**
- Migration `20260214000004_fix_handle_new_user.sql`: trigger now uses `COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')` to support email-based dev auth
- Migration runner made idempotent via `_migrations` tracking table (migration `20260214000003` or separate fix)

**Docker:**
- All `JWT_SECRET` defaults in `docker-compose.yml` aligned to `super-secret-jwt-token-with-at-least-32-characters-dev` (matches `.env.development`)
- Prevents GoTrue/PostgREST JWT secret mismatch when `--env-file` is omitted

**Debugging documented:**
- Created `memory/debugging.md` with all known issues and fixes

**Persistent issues (still investigating):**
- 401 errors on PostgREST persist until Docker restarted with `--force-recreate` and `--env-file`
- JWT secret mismatch is the root cause — see `memory/debugging.md`

**Files Changed:**
```
frontend/lib/api/client.ts              (new)
frontend/lib/api/gigs.ts                (new)
frontend/stores/gigStore.ts             (fetchGigs → FastAPI + Supabase)
frontend/stores/authStore.ts            (dev auth overhaul, stale session handling)
frontend/lib/supabase.ts                (SecureStore adapter fix)
frontend/.env                           (EXPO_PUBLIC_API_URL added)
backend/supabase/migrations/20260214000004_fix_handle_new_user.sql  (new)
docker-compose.yml                      (JWT_SECRET defaults aligned, kria-api service added)
docker-compose.dev.yml                  (kria-api port + hot-reload)
memory/debugging.md                     (new)
memory/tech_decisions.md                (Docker section updated)
memory/core.md                          (debugging.md added to reading list)
```

**Next Steps:**
1. Fix persistent JWT mismatch: restart Docker with `--force-recreate` + `--env-file`
2. Verify full registration → onboarding → home screen flow works end to end
3. Test gig feed (FastAPI matching + Supabase data fetch)
4. Build applicant management screen for posters

---

## 2026-02-14 (Session 6)

### Root Cause Found: 401 Errors on All PostgREST Requests

**What Changed:**
- Fixed two compounding infrastructure bugs that caused every `/rest/v1/*` request to return 401
- Auth and DB are now fully functional end-to-end

**Bug 1 — Kong key-auth never matched (primary blocker):**
- `backend/kong.yml` used `${SUPABASE_ANON_KEY}` and `${SUPABASE_SERVICE_KEY}` as key values
- Kong 2.8.1 does NOT substitute `${VAR}` env vars in declarative config — `_transform: true` is for entity format transformation, not envsubst
- Kong registered the literal string `${SUPABASE_ANON_KEY}` as the API key, so every client got 401 at the Kong layer before reaching PostgREST
- **Fix:** Hardcoded both keys directly in `backend/kong.yml` consumers

**Bug 2 — Wrong JWT_SECRET (secondary blocker):**
- `JWT_SECRET` was set to `super-secret-jwt-token-with-at-least-32-characters` (no `-long`)
- The demo ANON_KEY and SERVICE_ROLE_KEY are signed with `super-secret-jwt-token-with-at-least-32-characters-long`
- Verified by computing `HMAC-SHA256(header.payload, secret)` and comparing against the actual key signatures
- **Fix:** Updated `JWT_SECRET` in `.env.development` and all `docker-compose.yml` defaults to the `-long` variant

**How to diagnose future 401s:**
```bash
curl -s -H "apikey: <anon_key>" -H "Authorization: Bearer <anon_key>" \
  "http://localhost:54321/rest/v1/profiles?select=id&limit=1"
```
- Response body `{"message":"Invalid authentication credentials"}` → Kong layer (key-auth failure)
- Response body `{"code":"PGRST301","message":"JWSError JWSInvalidSignature"}` → PostgREST layer (JWT signature mismatch)

**Also discovered:** docker-compose 1.29.2 crashes with `--force-recreate` (`KeyError: 'ContainerConfig'`). Use `docker restart <name>` instead.

**Files Changed:**
```
backend/kong.yml               (anon/service keys hardcoded)
.env.development               (JWT_SECRET → -long suffix)
docker-compose.yml             (all JWT_SECRET defaults → -long suffix)
backend/api/.env.example       (SUPABASE_JWT_SECRET → -long suffix)
memory/debugging.md            (corrected JWT secret, added Kong section, 401 diagnosis guide)
memory/MEMORY.md               (JWT secret and Kong key-auth critical notes)
memory/tech_decisions.md       (Docker section: correct secret, Kong warning)
memory/core.md                 (correct JWT secret in env vars section, fixed FastAPI startup)
memory/changelog.md            (this entry)
```

**Next Steps:**
1. Restart Docker with `down -v && up --env-file` to apply JWT_SECRET change
2. Test full flow: phone → OTP 123456 → onboarding → home screen
3. Verify gig feed (FastAPI matching + Supabase data)
4. Build applicant management screen for posters

---

## 2026-02-15

### Alembic Migration System

**What Changed:**
- Replaced fragile bash `supabase-db-migrations` service with Alembic running inside the `kria-api` container
- Migrations now run automatically on every container start via `start.sh` entrypoint; already-applied ones are skipped
- Added `alembic` and `psycopg2-binary` to `requirements.txt`
- Old SQL files in `backend/supabase/migrations/` kept as reference but no longer executed

**Structure:**
```
backend/api/
├── alembic.ini               # Alembic config (URL set via DATABASE_URL env var)
├── alembic/
│   ├── env.py                # Reads DATABASE_URL, converts asyncpg→psycopg2
│   ├── script.py.mako        # Template for `alembic revision` command
│   └── versions/
│       ├── 0001_initial_schema.py   # Tables, enums, indexes, triggers
│       ├── 0002_rls_policies.py     # RLS + SECURITY DEFINER helpers (no recursion)
│       ├── 0003_functions.py        # DB functions (handle_new_user fixed here)
│       └── 0004_seed_badges.py      # Badge seed data
└── start.sh                  # ENTRYPOINT: wait for DB → alembic upgrade head → exec uvicorn
```

**Key Design Decisions:**
1. Alembic uses psycopg2 (sync) — simpler than async, migrations only run once at startup
2. `start.sh` is the Docker ENTRYPOINT; uvicorn command is CMD (overrideable in dev for `--reload`)
3. RLS recursion fix baked into migration 0002 directly — no separate fix migration needed
4. `handle_new_user` fix (COALESCE for dev auth) baked into migration 0003 directly
5. All migrations are transactional — interrupted migrations roll back entirely
6. `ON CONFLICT DO NOTHING` in seed migration — safe to re-run conceptually

**⚠️ One-time DB wipe required when switching from old system:**
```bash
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml down -v
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up --build
```

**Adding future migrations:**
```bash
# Generate a new empty migration file
docker-compose exec kria-api alembic revision -m "describe_your_change"
# Edit the generated file in backend/api/alembic/versions/
# Restart (or it will auto-apply on next container start)
```

**Files Changed:**
```
backend/api/requirements.txt        (added alembic, psycopg2-binary)
backend/api/Dockerfile              (ENTRYPOINT → start.sh, CMD → uvicorn args)
backend/api/start.sh                (new: wait-for-db + alembic upgrade head + exec)
backend/api/alembic.ini             (new)
backend/api/alembic/env.py          (new)
backend/api/alembic/script.py.mako  (new)
backend/api/alembic/versions/0001_initial_schema.py   (new)
backend/api/alembic/versions/0002_rls_policies.py     (new)
backend/api/alembic/versions/0003_functions.py        (new)
backend/api/alembic/versions/0004_seed_badges.py      (new)
docker-compose.yml                  (removed supabase-db-migrations service)
```

---

## 2026-02-15 (Session 4)

### Applicant Management for Gig Posters

**What Changed:**

**Backend — new files:**
- `backend/api/app/models/applicant.py` — `ApplicantProfile`, `ApplicantListItem`, `ApplicantListResponse`, `ApplicationActionResponse` Pydantic models
- `backend/api/app/routers/applicants.py` — three endpoints:
  - `GET /api/v1/gigs/{gig_id}/applicants` — list applicants with profile info for the poster
  - `POST /api/v1/applicants/{application_id}/accept` — atomically accepts (updates app status, creates assignment, increments slots_filled, sets gig to `in_progress` when full)
  - `POST /api/v1/applicants/{application_id}/reject` — rejects a pending application
- `backend/api/app/main.py` — includes `applicants` router

**Frontend — new / changed files:**
- `frontend/lib/api/applicants.ts` — `getApplicants()`, `acceptApplicant()`, `rejectApplicant()` API helpers with full TypeScript types
- `frontend/app/(main)/gig/applicants/[gigId].tsx` — (new) applicant list screen: shows applicant cards with name, verified badges, stats (gigs done, rating, reliability), languages/skills tags, message, accept/reject buttons
- `frontend/app/(main)/gig/[id].tsx` — when `isOwnGig`, footer shows "Manage Applicants" button (links to applicants screen) instead of "Apply Now"
- `frontend/app/(main)/_layout.tsx` — added `gig/applicants/[gigId]` Stack.Screen

**No DB changes** — `gig_applications` and `gig_assignments` tables already existed.

**Accept logic (atomic, in FastAPI):**
1. Verify caller = gig poster
2. Check application is pending
3. Check `slots_filled < slots_total`
4. Update application → accepted, set responded_at
5. Insert gig_assignment (ON CONFLICT DO NOTHING)
6. Increment slots_filled; if now full → set gig status to `in_progress`

**Why FastAPI (not direct Supabase):**
- Accept needs to be atomic across 3 tables (application + assignment + gig)
- Business rule enforcement (no overfilling) is centralized
- Easier to add future logic (notifications, momentum awards)

---

## Template for Future Entries

```
## YYYY-MM-DD

### [Feature/Area Name]

**What Changed:**
- Bullet points of changes

**Why:**
- Rationale

**Key Decisions:**
1. Decision made

**Files Affected:**
- List of key files

**Next Steps:**
- What comes next
```
