---
name: Changelog
description: Session-by-session feature and architecture log
type: project
---

# Changelog

## 2026-05-12 — Grid Production Auth Fixes + JWT JWKS Migration + Vercel Analytics

### Grid: Auth fully working on production (`grid.trykria.com`)

Root-cause chain resolved across multiple issues:

**Issue 1 — Old code deployed (email/password pattern):**
- `origin/main` still had old `signUp({email: "91{phone}@kriya.dev"})` code; phone OTP fix was only on `redesign_stich_electriclime`.
- Symptoms: "Email address invalid" + "Email not confirmed" on production.
- Fix: merged branch, redeployed Grid.

**Issue 2 — EC2 backend 401 on all authenticated requests:**
- Supabase migrated project JWT signing from legacy HS256 → ECC P-256 (ES256) asymmetric keys.
- Backend `middleware.py` was verifying with HS256 shared secret → all new tokens rejected.
- Fix: rewrote `backend/api/app/auth/middleware.py` to fetch JWKS from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, verify with ES256 primary + HS256 legacy fallback. JWKS cached in memory, refreshed every hour via thread-safe double-checked lock.

**Issue 3 — "Unsupported phone provider":**
- Supabase Cloud requires Twilio for phone SMS OTP; Twilio not configured.
- Fix: switched Grid auth to **email OTP** (`signInWithOtp({ email })` + `verifyOtp({ email, token, type: "email" })`). No external provider needed.

**Issue 4 — Email sending magic link instead of OTP code:**
- `signInWithOtp({ email })` uses Magic link template by default.
- Fix: updated template in Supabase Dashboard → Authentication → Email → Templates → Magic link → body uses `{{ .Token }}` to show 6-digit code.
- Also set Site URL = `https://grid.trykria.com` and added redirect URL in Supabase URL Configuration.

### Grid: Final email OTP login flow

`app/login/page.tsx` — 3-step flow:
1. Email input → `signInWithOtp({ email })` — handles sign-in and sign-up in one call
2. 6-digit OTP input → `verifyOtp({ email, token, type: "email" })` — verify code from email
3. Profile check → existing host: redirect to dashboard; new host: name form → `profiles.upsert()`

`app/auth/confirm/page.tsx` — created during magic link attempt, now unused but harmless.

### Grid: Vercel Analytics added

`app/layout.tsx` — `import { Analytics } from "@vercel/analytics/next"` + `<Analytics />` in body.
`package.json` — `@vercel/analytics` installed.

### Grid + Backend: API URL port fix

`frontend/grid/lib/config.ts` + `.env.local.example` — fallback was `http://localhost:8001/api/v1`, corrected to `http://localhost:8000/api/v1` (matches docker-compose.dev.yml port mapping `8000:8000`).

---

## 2026-05-09 — Production Deployment (EC2 + Vercel) + Grid Auth Rewrite

### Infrastructure: Production Stack Live

Backend deployed to EC2 t3a.medium at `api.trykria.com`. Grid deployed to Vercel at `grid.trykria.com`.

**Files created:**
- `infra/DEPLOY.md` — full deployment guide (EC2 → Supabase → Grid → Pocket)
- `infra/deploy.sh` — repeatable deploy: `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build` + alembic migrations
- `infra/setup-server.sh` — EC2 first-boot: Docker, Nginx, Certbot, Fail2ban, UFW, SSH hardening
- `infra/nginx/api.trykria.com.conf` — HTTP-only initially; certbot adds SSL block
- `docker-compose.prod.yml` — standalone (no base compose), `env_file: .env.prod` only (no `environment:` block interpolation)

**Key deployment gotchas discovered:**
- Ubuntu 22.04+: SSH service is `ssh` not `sshd` (`systemctl restart ssh`)
- Nginx config must be HTTP-only before certbot runs; `listen 443 ssl` without certs prevents nginx starting which breaks certbot's HTTP challenge
- EC2 has no IPv6 by default → Supabase Direct connection fails; use **Session mode pooler** (`aws-0-[region].pooler.supabase.com:5432`)
- Pooler URL encodes the region — must copy exact URL from Supabase → Connect → Session mode tab
- `docker compose environment:` block reads from host shell, NOT from `env_file`; removed redundant environment block from `docker-compose.prod.yml`
- Correct backend env var names: `SUPABASE_JWT_SECRET` (not `JWT_SECRET`), `SUPABASE_SERVICE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`)
- `docker compose --env-file .env.prod` needed in deploy.sh so Compose can interpolate `${ANTISPOOF_MODEL_ENABLED:-False}` in inspector block

### Inspector: mediapipe version pinned

`perceptrons/inspector/requirements.txt`: `mediapipe>=0.10.14` → `mediapipe==0.10.14`

MediaPipe 0.10.20+ removed `mp.solutions` API entirely. Inspector's `liveness_checker.py` uses `mp.solutions.face_mesh` — pinned to last known-good version.

### Grid: Auth rewritten to phone OTP

`frontend/grid/app/login/page.tsx` — replaced email/password dev hack with real phone OTP:
- Old: `signUp({email: "91{phone}@kriya.dev", password: "kriya-dev-2026"})` → hit Supabase email rate limits, RLS failures (no session after signUp with email confirm on)
- New: `signInWithOtp({ phone: "+91{phone}" })` → `verifyOtp({ phone, token, type: "sms" })` → check profile existence → new user goes to name step, returning user to dashboard
- Removed signin/register toggle — phone OTP auto-detects new vs returning users
- `DEV_OTP = "123456"` constant kept for dev hint display

### Grid: layout split for force-dynamic

`frontend/grid/app/(dashboard)/layout.tsx` — converted to server component that exports `dynamic = "force-dynamic"` and re-exports the client layout from `_DashboardLayoutClient.tsx`. Prevents Next.js from statically prerendering auth-protected dashboard pages.

### Grid: supabase.ts — reverted from Proxy to simple client

Tried lazy Proxy init to prevent build-time crash (when env vars not set). Reverted because `supabase.from()` lost `this` binding through the Proxy → silent runtime crash. Proper fix: set env vars in Vercel before building, keep simple `createClient()`.

### Grid: ApplicantProfileModal band.color fix

`frontend/grid/components/applicants/ApplicantProfileModal.tsx`:
- `band.color` → `bandColor = \`var(--${band.varName})\`` (5 occurrences)
- `MOMENTUM_BANDS` type has `varName` not `color` — TypeScript build error

### Supabase New API Key Format

Supabase migrated from JWT-format keys to named keys:
- `sb_publishable_xxx` → replaces `anon` key → use in frontend (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `sb_secret_xxx` → replaces `service_role` key → use in backend (`SUPABASE_SERVICE_KEY`)
- Legacy JWT keys still work until end of 2026
- Location: **Settings → API Keys** (new tabs) or **Legacy anon, service_role API keys** tab

---

## 2026-05-09 — Badges System + Home Page Revamp + Profile Fixes

### Profile: Completion Percentage Fix

`frontend/pocket/lib/profileCompletion.ts` — changed field keys checked for completion:
- `college_name` → `education_entries` (JSONB array)
- `experience_summary` → `work_experience` (JSONB array)

Old string fields were never populated by the edit form; the JSONB arrays are.

### Profile: Edit Profile navigates back on save

`frontend/pocket/app/(main)/edit-profile.tsx`:
- Removed `saved` banner state machine
- `handleSave` success branch: replaced `setSaved(true)` with `router.back()`

`frontend/pocket/stores/authStore.ts` — `updateProfile` now uses `.select().single()` so the updated row is returned and committed. Store state updates immediately from the returned row instead of doing a second `fetchProfile()` call.

### Backend: Badges System (full-stack)

**Migration `0019_revamp_badges.py`:**
- Converts `badge_category` column from enum to text + CHECK constraint (avoids `ALTER TYPE ADD VALUE` transaction issue)
- Adds `streak_count INT NOT NULL DEFAULT 0`, `longest_streak INT NOT NULL DEFAULT 0`, `last_active_date DATE` to `profiles`
- Clears old badge seed data; inserts 18 new badges across 3 categories:
  - **milestone**: newcomer, first_gig, gigs_3, gigs_5, gigs_10, gigs_20, gigs_50, gigs_100
  - **streak**: streak_10, streak_50, streak_100, streak_200, streak_500
  - **identity**: id_aadhaar, id_pan, id_driving_licence, id_passport, id_voter_id

**`backend/api/app/services/badge_service.py`** (new file):
- `award(db, user_id, badge_code)` — `INSERT ... ON CONFLICT DO NOTHING RETURNING id`; calls `await db.commit()` (critical — get_db sessions don't auto-commit)
- `award_newcomer`, `check_gig_badges`, `check_id_badges` — specific trigger helpers
- `update_streak(db, user_id)` — reads `last_active_date`; increments streak if yesterday, resets to 1 if gap, no-ops if already today; checks streak milestone badges; commits after UPDATE
- `sync_all_badges(db, user_id)` — retroactive full sync: awards newcomer + checks gig count + awards all `verified_id_types` ID badges. Called on every `GET /badges/me` so old users get retroactively awarded.

**`backend/api/app/routers/badges.py`** (new):
- `GET /api/v1/badges/me` — calls `sync_all_badges` first, then LEFT JOINs badges with user_badges; sorts: category order + earned-first within category

**Badge hooks wired to existing endpoints:**
- `routers/applicants.py` — after OTP verify + momentum recalc: `await check_gig_badges(db, worker_id)`
- `services/verification_queue.py` — in `_mark_verified()`: `await check_id_badges(db, user_id, id_type)`
- `momentum/router.py` — at top of `GET /momentum/me`: `await award_newcomer(db, user_id)` + `await update_streak(db, user_id)`

**`backend/api/app/main.py`** — added `badges` router with `/api/v1` prefix.

### Frontend: Badges Screen

**`frontend/pocket/lib/api/badges.ts`** — `getMyBadges()` calls `GET /api/v1/badges/me`

**`frontend/pocket/stores/badgeStore.ts`** (Zustand) — `badges`, `earnedCount`, `totalCount`, `isLoading`, `fetchBadges`

**`frontend/pocket/app/(main)/badges.tsx`** — full screen:
- Summary bar: earned/total count + progress bar
- Three sections: Milestones (lime accent), Streaks (amber `#FFC83D`), Verification (blue `#60a5fa`)
- 2-column `BadgeTile` grid
- Earned tiles: full opacity, colored icon bg, earned dot + date
- Locked tiles: 55% opacity, "Locked" label with lock icon

**`frontend/pocket/types/database.ts`** — added `streak_count`, `longest_streak`, `last_active_date` to Profile Row.

### Backend: GigCategory Enum Fix

`backend/api/app/models/gig.py` — `GigCategory` updated from 13 old values to 17 new values matching migration 0018. Old values (`registration_desk`, `ushering`, etc.) caused Pydantic validation errors when reading gigs from DB.

### Mobile: Home Page Revamp

Complete rewrite of `frontend/pocket/app/(main)/(tabs)/home.tsx`. Order: Momentum card → Hot near you → Recent badges → Recent gigs.

**`BandHeroCard`:**
- `getBandProgress(score)` returns `{ band, nextBand, fraction, ptsToNext }`
- Glow blob: `backgroundColor: band.color + "12"` positioned absolute top-right
- Score: 52pt bold in band color; band pill (colored dot + label); 3px progress track filling in band color
- Stats row: gigs done · streak days · "Full breakdown →" (navigates to Arena)

**`GigMarquee`** (auto-scroll, Animated.View + `useNativeDriver: true`):
- Animates `translateX` from `-singlePassWidth` to `0` — content drifts rightward (opposite of badge ticker)
- `Animated.loop + Easing.linear`, speed proportional to content width
- Using `Animated.View` instead of `ScrollView` so `Pressable` children remain clickable
- Each card: `LinearGradient` glow overlay + left color stripe per category + title, pay, distance

**`BadgeMarquee`** (setInterval, 0.25px/16ms):
- Only starts when `earned.length > 3`
- Duplicates badge list for seamless loop
- All hooks declared before any early return (Rules of Hooks fix)
- `ScrollView scrollEnabled={false}` + `scrollRef.scrollTo({ x, animated: false })`

**`RecentGigCard`** — 178px wide rectangles: category pill + status pill + title + pay + date

**Location fetch pattern:**
```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status === "granted") {
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}
const res = await matchGigs({ limit: 5, ...coords });
```

**Bugs fixed during home revamp:**
- `Animated` imported from `react` (wrong) → moved to `react-native`
- `GigRow` validation error — `GigCategory` enum mismatch (see above)
- `BadgeMarquee` hooks violation — moved early return after all `useRef`/`useEffect` calls
- Gig cards unclickable — replaced `ScrollView scrollEnabled={false}` with `Animated.View + translateX`

---

## 2026-05-09 — Grid Applications Page Redesign ("Command Center")

### Grid: Applications Page — complete rewrite

Replaced the previous flat list grouped by gig with a "Command Center" two-panel layout:

**Horizontal gig chip strip (top):**
- `GET /gigs/mine` loads lightweight gig summaries on mount (N rows, not all applicants)
- Drag-to-scroll chip row with `dragState` ref + scroll glow indicator (lime vertical line + fade gradient on right edge when overflow exists)
- `GigChip`: pending badge (`position: absolute`, wrapped in `py-2 -my-2` to escape overflow clipping), slot fill bar, urgency label, selected = lime border

**Two-column applicant/profile grid (below chips):**
- `style={{ gridTemplateColumns: "1fr 2fr" }}` — ~33% list / ~67% profile
- Left: `overflow-y-auto` applicant list. Whole card clickable (`onClick`, `cursor-pointer`). Selected card = lime border. Action buttons use `e.stopPropagation()`.
- Right: `overflow-y-auto` profile panel. `panelColRef` + `useEffect` auto-scrolls to top when selected applicant changes.

**Tab counts bug fix:**
- Old approach called API with current tab's `status` filter → other tabs showed 0.
- Fix: always call API with `status=all`, derive `visibleApplicants` via `useMemo` client-side.

### Backend: `GET /gigs/mine`

New endpoint in `routers/gigs.py` (registered BEFORE `/{gig_id}` to avoid route shadowing):
- Returns `PostedGigsResponse` with `pending_count` per gig via `COUNT(...) FILTER (WHERE status = 'pending')`
- Pydantic models `PostedGigSummary` + `PostedGigsResponse` defined inline in `gigs.py`

### Backend: `GET /gigs/{id}/applicants` — sort + filter

Added `sort` and `filter_status` (alias: `status`) query params:
- `sort`: `momentum_desc | momentum_asc | newest | oldest` — safe dynamic ORDER BY from a fixed dict
- `filter_status`: `pending | accepted | all` — WHERE clause filter with `::text` cast on ENUM

### Grid: `ApplicantProfileModal` — `asPanel` prop

Added `asPanel?: boolean` to serve as both popup modal and inline compact card:
- **Panel mode**: natural-height card, SkillGraph (160px) + signal bars side-by-side, no internal scroll, natural-width buttons (`px-5 py-2.5`)
- **Modal mode**: unchanged — full-height fixed overlay, stacked 260px graph, `flex-1` buttons, `overflow-y-auto` body

### Grid: new API file

`grid/lib/api/gigs.ts` — `PostedGigSummary`, `PostedGigsResponse`, `listMyGigs()`

### Outstanding (not resolved)

Left column scroll: user wants applicant list to scroll independently while profile card stays fixed. A `useLayoutEffect` approach (setting `main.style.overflow = "hidden"`) was tried and **reverted** per user request. Root cause: dashboard `main` element has `overflow-y-auto` which competes with inner columns. Needs a different fix — see `dev/todo.md`.

---

## 2026-05-09 — Location-Aware Recommendations + Venue Maps Links

### Backend: `recommendations/` module

New standalone module at `backend/api/app/recommendations/` for all recommendation/matching logic.

- `geo.py` — `haversine_km()`, `GeocodedLocation` dataclass, `async geocode_venue()` calling Google Maps Geocoding API (`region=in`, server-side only)
- `engine.py` — full matching engine moved from `services/matching.py`: 5-signal scoring (trust 35%, distance 25%, category 20%, pay 10%, recency 10%)
- `models.py` — `GeocodeRequest`, `GeocodeResponse`, `LocationUpdateRequest` (with `formatted_address`)
- `router.py` — `POST /api/v1/recommendations/geocode` (auth-guarded to prevent API key abuse)
- `__init__.py` — intentionally empty; `from app.recommendations import router` imports the module, not the APIRouter (matches `momentum/` pattern)

`GOOGLE_MAPS_API_KEY` moved from committed `.env.development` to gitignored `.env.dev`.

### Backend: Gig location PATCH

`PATCH /api/v1/gigs/{id}/location` in `routers/gigs.py` now writes `location_point` (PostGIS), `venue_lat`, `venue_lng`, `venue_formatted_address` together. Poster-only guard.

### Database: Migration 0017

`0017_gig_location_columns.py` — adds `venue_lat FLOAT`, `venue_lng FLOAT`, `venue_formatted_address TEXT` (all nullable) to `gigs`. Plain mirrors of `location_point` — needed because Supabase JS returns PostGIS as unreadable WKB hex.

### Grid: Geocoding in gig wizard

Step 3 (Schedule) now has a "Fetch Location" button below venue/city. Calls `POST /recommendations/geocode`, shows resolved address + coordinates inline. Clears automatically when venue/city fields change. Address stored in `geocoded_address` form state and passed to the PATCH call on submit.

### Mobile: Runner GPS in Explore

`expo-location` integrated into `explore.tsx`. Requests foreground permission on mount, stores result in `locationRef` (useRef — no re-render). GPS passed to `fetchGigs` and prefetch `fetchMoreGigs`. Silent fallback if denied.

### Mobile: Tappable venue links

When `venue_lat`/`venue_lng` are set, venue rows become tappable `Pressable` components using `Linking.openURL` with `https://www.google.com/maps/search/?api=1&query={lat},{lng}`:
- `gig/[id].tsx` — lime pin icon, underlined text, external-link chevron
- `space.tsx` RunnerTab — compact meta row goes lime

### Frontend types updated

- `frontend/pocket/types/database.ts` Gig Row + Insert: `venue_lat`, `venue_lng`, `venue_formatted_address` added
- `frontend/pocket/lib/api/gigs.ts` `AcceptedGigItem`: `venue_lat`, `venue_lng` added
- FastAPI `AcceptedGigItem` model + SQL query updated to return location fields

### .env cleanup

`.env.development` deleted (was committed). `.env.dev` created (gitignored). `.gitignore` now uses blanket `.env.*` rule (except `.env.example`). All secrets — including Google Maps API key — live in `.env.dev`.

---

## 2026-05-07 — Momentum Plugin Architecture + Async Verification

### Momentum: Plugin Signal Architecture

Replaced hardcoded `WORKER_SIGNALS` dict in `config.py` with a file-based plugin system. Adding a new signal = drop a Python file in `momentum/signals/` and restart. No other changes required.

**New files:**
- `momentum/signals/_base.py` — `Signal` dataclass (key, label, short_label, description, icon, color, weight, max_points)
- `momentum/signals/show_rate.py`, `on_time_rate.py`, `performance_score.py`, `communication_score.py`, `professionalism_score.py` — one file per signal, each exports `SIGNAL` + `async compute(user_id, db) -> float | None`
- `momentum/registry.py` — `pkgutil.iter_modules` auto-discovery; `get_signals()`, `normalized_weights()`, `run_all(user_id, db)`

**Rewrites:**
- `calculator.py` — now takes `signal_scores: dict[str, float | None]` instead of duck-typed `profile_row`; weights from registry (auto-normalized fractions, no sum-to-100 constraint)
- `recalculate.py` — calls `registry.run_all()` for all signals; stores results in `signal_scores` JSONB; no longer updates individual signal columns
- `router.py` — reads `signal_scores` JSONB from DB row; added `GET /momentum/signals` endpoint returning `list[SignalMetaResponse]`
- `models.py` — added `SignalMetaResponse`

**Migration `0016_momentum_signal_scores.py`:** Adds `signal_scores jsonb NOT NULL DEFAULT '{}'` to `momentum_profiles`. Migrates existing individual column data into JSONB via `jsonb_strip_nulls(jsonb_build_object(...))`. Old individual columns left in place (not dropped).

**Frontend — dynamic skill graphs:**
- `lib/api/momentum.ts` — added `SignalMeta` type + `getSignalMeta()` calling `GET /momentum/signals`
- `stores/momentumStore.ts` — added `signalMeta: SignalMeta[]` + `fetchSignalMeta()` (cached, fetched once on Arena mount)
- Mobile `SkillGraph.tsx` — axes count and labels driven by `signalMeta` from store; falls back to static `SIGNAL_META` keys until API responds
- Grid `SkillGraph.tsx` — axes derived from `signals: BreakdownItem[]` prop length; hardcoded `SIGNAL_KEYS` array removed

**Verification:** Confirmed registry discovers all 5 signals, weights sum to 1.0, calculator produces correct scores (new user = 0, 5 gigs partial data = 341 Reliable, 15 gigs partial data = 683 Trusted). Migration applied cleanly.

### Async ID Verification Queue

Replaced synchronous Inspector call (which blocked the request) with an `asyncio.Queue` + single background worker pattern.

**Why single worker:** Inspector (RetinaFace + ArcFace) uses 300–600 MB RAM and is single-threaded. Concurrent calls would pile up at the HTTP layer. A queue gives deterministic ordering + clean backpressure.

**New file: `services/verification_queue.py`:**
- `VerificationJob` dataclass — carries all bytes needed for Inspector call
- Module-level `job_queue: asyncio.Queue[VerificationJob]` shared between endpoint and worker
- `worker()` — runs as long-lived asyncio task (started in lifespan); processes one job at a time
- `_process()` — calls `http://inspector:8000/verify`, maps response fields to error codes
- `_mark_verified()` — updates `profiles.verified_id_types` + job status using `AsyncSessionLocal`
- `_set_job()` — updates job status/error_code

**`profiles.py` changes:**
- `POST /verify-identity` → validates images → inserts `verification_jobs` row → enqueues `VerificationJob` → returns 202 immediately
- `GET /me/id-verification` → returns per-type status map using `DISTINCT ON (id_type) ORDER BY id_type, created_at DESC`

**Mobile (`verify-identity.tsx`) — async polling:**
- State machine: `"list" | "camera_id" | "camera_selfie" | "uploading"`
- After selfie: `setScreen("uploading")` → POST → immediately back to `"list"` (job queued, not done)
- `useFocusEffect` + `setInterval(5000)` polls `GET /me/id-verification` while any job is `pending` or `processing`
- Per-ID `StatusControl` component: verified=green pill, pending/processing=spinner, failed=retry button, unverified=verify button

**Migration `0015_verification_jobs.py`:** `verification_jobs` table with `status text DEFAULT 'pending'`, `error_code text`, index on `(user_id, id_type, created_at DESC)`.

---

## 2026-05-07 — Multi-ID Verification + Inspector Integration + In-App Camera

### Identity Verification: Multi-ID System

Replaced single-ID mock verification with a real multi-ID flow backed by the Inspector face-matching pipeline.

**DB:** Migration `0014_verified_id_types.py` — adds `verified_id_types jsonb NOT NULL DEFAULT '[]'` to `profiles`; backfills from `id_type` for existing verified users.

**Backend (`app/routers/profiles.py`):**
- `POST /api/v1/profiles/verify-identity` now proxies to Inspector via `httpx.AsyncClient`
- `_call_inspector()` helper: sends `id_image` + `selfie` as multipart; handles `httpx.RequestError` → 503; non-200 → 502
- Maps Inspector response fields to mobile error codes: `no_face_id`, `no_face_selfie`, `duplicate_submission`, `face_spoof_detected`, `low_confidence`
- `verified_id_types` append uses `jsonb_build_array(:id_type)` with `@>` containment check — avoids `::jsonb` cast which breaks asyncpg named-param binding
- Fixed 500 bug: original SQL used `:type_arr::jsonb` which asyncpg couldn't bind; replaced with `jsonb_build_array(:id_type)`

**Inspector Docker integration (`docker-compose.dev.yml`):**
- Inspector service added to dev compose (build context: `./perceptrons/inspector`)
- Joins `kria-network` → reachable at `http://inspector:8000`
- `INSPECTOR_URL=http://inspector:8000` env var added to `kria-api`
- `insightface_models` named volume added (persists ~30 MB weights)
- `kria-api` depends on Inspector with `service_started` (not `service_healthy`) — stack boots immediately; endpoint returns 503 during Inspector warm-up (~30–60s)

### Badge System (`components/ui/VerifiedBadges.tsx`)

New reusable badge system, extensible beyond ID verification:
- `BadgeKey` type union: 5 ID types + `photo_verified` meta-badge
- `BADGE_DEFS`: icon, color, bg per badge key (also used for ID list row icons)
- `SingleBadge`: pill with icon + label; `size="sm"/"md"`
- `BadgeList`: renders `photo_verified` first + all earned IDs; `showPhotoVerified` prop
- `frontend/pocket/types/database.ts`: added `verified_id_types: string[]` to profiles Row

### In-App Camera (`components/camera/VerificationCamera.tsx`)

Full-screen camera replacing `expo-image-picker`. Uses `expo-camera` (`CameraView`, `useCameraPermissions`).

- **ID mode:** Rear camera; ISO ID-1 rectangle (aspect 1.585); corner bracket accents via `CornerBrackets`
- **Selfie mode:** Front camera; oval face guide; **capture window larger than oval** (`SELFIE_CAP_W = SW * 0.88`, `SELFIE_CAP_H = OVAL_H + 96`) so Inspector receives face + context, not just a tightly-cropped face
- `SpotlightMask` takes separate `guideW/guideH` (oval border position) and `capW/capH` (dark bar position) — decoupled so capture area can be larger than the guide
- Permission gate built in; `takePictureAsync({ quality: 0.88 })`

### Verify Identity Screen Rewrite (`app/(main)/verify-identity.tsx`)

Replaced single-ID 3-step ImagePicker flow with multi-ID list screen:
- State machine: `"list" | "camera_id" | "camera_selfie" | "processing" | "success" | "failed"`
- List view: all 5 ID types, per-type verified/unverified state, `BadgeList` at top
- Camera states render `VerificationCamera` full-screen (no tab bar)
- Selfie captured → immediately submits (no extra confirmation step)
- `activeIdType` passed through entire flow to `verifyIdentityWithImages`
- `fetchProfile()` on success refreshes `verified_id_types` → badges update live

---

## 2026-05-06 — Grid Applications Page + Skill Graph + Profile Completion Bonus

### Grid: Applications Page (`/applications`)

- New global inbox page showing ALL applicants across all host's gigs
- Backend: `GET /api/v1/applicants` — single JOIN query returning `GlobalApplicantListResponse` with `momentum_score`, full applicant profile fields, gig context
- Frontend groups by `gig_id` client-side; tabs: Pending / Accepted / All
- Each row: avatar → name + verified badge → `MomentumChip` → gig title + date → inline Accept/Reject/No-Show
- Clicking row → `ApplicantProfileModal`
- New nav item "Applications" added to Grid Sidebar (Inbox icon, between Gigs and Events)

### Grid: Applicant Profile Modal

- `grid/components/applicants/ApplicantProfileModal.tsx` — rebuilt from scratch
- Fetches `GET /momentum/user/{id}/breakdown` on mount (spinner while loading)
- Sections: header → SkillGraph (260px) → signal legend → profile completion chips → scrollable body (message, bio, work exp, education, languages, skills) → action footer
- Signal legend: 5 rows, progress bar in band color with box-shadow glow, `N%` or `—` for no-data
- Profile completion: chip row, earned = `bg-primary/15 text-primary`, not earned = line-through

### Grid: SkillGraph component (`grid/components/ui/SkillGraph.tsx`)

- Pure SVG radar chart for browser — no react-native-svg
- Theme-adaptive via CSS vars (`--sg-canvas-from/to`, `--sg-grid`) on `<stop>` and `style` props
- `useId()` for unique per-instance filter IDs (prevents filter bleeding)
- Glow: `feGaussianBlur + feMerge` on data polygon and dots
- Outer rim circle removed; axis labels removed (replaced by HTML legend)
- `maxR = size * 0.36`

### Grid: Light mode SkillGraph fix

- Skill graph canvas was hardcoded dark (`#1e1d1d`), invisible in light mode
- Fix: CSS vars `--sg-canvas-from/to/--sg-grid` defined in `:root` (dark) and `[data-theme="light"]` in globals.css
- SVG `<stop>` elements use `style={{ stopColor: "var(--sg-canvas-from)" }}` — CSS vars resolve on SVG `style` attributes (not on SVG `fill`/`stop-color` attributes)

### Backend: `/api/v1/applicants` bug fixes

Three separate bugs fixed to make the applications page work:
1. `ga.status::text = :status` — PostgreSQL ENUM `application_status` can't be compared to text bind params; requires `::text` cast
2. `mp.worker_score AS momentum_score` — column is `worker_score`, not `momentum_score`
3. Separate `:poster_id` and `:rater_id` bind params (same UUID value) — asyncpg deduplicates by name; using same param name twice in one query causes both to bind to `$1`, giving wrong value for one

### Backend: Seed scripts for test data

- `backend/api/seed_runner_signals.py` — seeds ratings (one per runner, respects UNIQUE constraint), sets `otp_verified_at` (80% on-time), recalculates
- `backend/api/seed_remaining_signals.py` — directly updates `momentum_profiles` signal columns for 5 runners who couldn't be rated via ratings table (uniqueness constraint)
- `backend/api/recalculate_all_momentum.py` — recalculates all 16 test runners
- Final demo scores: 74–548 across 16 runners

### Momentum: Profile Completion Bonus

Solves the cold-start problem (score=0 for new runners before first gig).

**Formula change:**
```
gig_score      = (weighted_sum / 100) × 1000 × credibility − penalty_points
profile_points = Σ points for filled profile fields (capped at 80)
score          = clamp(gig_score + profile_points, 0, 1000)
```

Profile bonus is additive **outside** the credibility formula — new runners reach up to 80 pts, staying in Newcomer band (0–99).

**6 profile signals** (all compute from real `profiles` DB columns, no dummies):
- `id_verified` (30 pts), `skills` (15 pts), `bio` (10 pts), `languages` (10 pts), `work_experience` (10 pts), `education_entries` (5 pts)

**Files changed:**
- `config.py`: Added `PROFILE_SIGNALS`, `MAX_PROFILE_POINTS = 80`
- `calculator.py`: Added `ProfileBreakdownItem` dataclass, `_is_filled()`, `compute_profile_points()`. `compute_worker_breakdown` now returns 3-tuple `(MomentumScore, list[BreakdownItem], list[ProfileBreakdownItem])`. `MomentumScore` has `profile_points: int = 0`.
- `recalculate.py`: Queries `profiles` table for profile fields; passes to calculator
- `models.py`: Added `ProfileSignalResponse`; `MomentumScoreResponse` has `profile_points`; `WorkerBreakdownResponse` has `profile_signals`
- `router.py`: Added `_fetch_profile_fields()` helper; all 4 endpoints pass profile fields to calculator
- `frontend/pocket/lib/api/momentum.ts`: Added `ProfileSignalItem`; updated `MomentumScoreData` + `WorkerBreakdownData`
- `grid/types/index.ts`: Added `ProfileSignalItem`; updated `MomentumBreakdownResponse`
- `frontend/pocket/components/momentum/MomentumBreakdown.tsx`: Profile completion chip section added at bottom of signal list
- `grid/components/applicants/ApplicantProfileModal.tsx`: Profile completion chip section added

**Recalculated:** All 16 test runners via `recalculate_all_momentum.py`.

---

## 2026-05-06 — Momentum v1 Complete

### Backend: Momentum module restructure

- Isolated all momentum code into `backend/api/app/momentum/` module:
  - `config.py` — WORKER_SIGNALS (5 signals, weights sum to 100), WORKER_PENALTIES, 6 bands
  - `calculator.py` — pure functions, `BreakdownItem` dataclass with `has_data` field
  - `models.py` — Pydantic response models (worker-only, no poster)
  - `router.py` — 3 endpoints: `/me`, `/me/breakdown`, `/user/{id}`
  - `recalculate.py` — reads DB signals → calculates → writes score + audit log
  - `signals/` — scaffold for future individual signal extractors
- Deleted old files: `app/routers/momentum.py`, `app/services/momentum_calculator.py`, `app/config/momentum_config.py`, `app/models/momentum.py`
- `app/main.py`: updated import to `from app.momentum import router as momentum`

### Backend: Score formula

- Range 0–1000, new users start at 0
- Formula: `(weighted_sum / 100) × 1000 × credibility − penalty_points`
- Total weight always 100 — NULL signals excluded from numerator but not denominator
- Credibility: `min(gig_count / 10, 1.0)`
- Max score scales with available signals (show_rate only → max 350; all 5 → max 1000)

### Backend: Bugs fixed

- **Audit log empty:** `momentum_events` INSERT was missing. Now written after every score change in `recalculate.py`.
- **Penalty not applied:** `worker_penalty_points` was read by calculator but never written. Fixed: `no_show_assignment` endpoint now writes penalty to DB before calling `recalculate_momentum`.
- **Signal defaults wrong:** After migration made columns nullable, trigger still inserted `1.0`/`5.0` defaults. Fixed by `DROP DEFAULT` on all signal columns.

### Backend: Rating sub-scores

- `RatingCreate` model now accepts `punctuality_score`, `communication_score`, `professionalism_score` (all optional, 1–5)
- `ratings.py` router inserts sub-scores into DB
- `recalculate_momentum` now uses these sub-scores to compute `communication_score` and `professionalism_score` signals

### Database: Migration 0013

- `worker_score`/`poster_score`: CHECK constraint changed 300–850 → 0–1000, default 500 → 0
- Signal columns `show_rate`, `on_time_rate`, `performance_score`: DROP NOT NULL, DROP DEFAULT
- DROP `worker_response_rate`, `worker_consistency_score` (no data path)
- ADD `worker_communication_score NUMERIC(4,2)`, `worker_professionalism_score NUMERIC(4,2)` (nullable)
- Reset all existing rows: scores → 0, signals → NULL

### Frontend: Momentum constants & types

- `frontend/pocket/constants/momentum.ts`: 6-band 0–1000 scale, Solar Flare band colors, `SIGNAL_META` for 5 signals
- `frontend/pocket/lib/api/momentum.ts`: `MyMomentumData` = worker-only; `WorkerBreakdownData` with `signals: BreakdownItem[]` and `has_data`; `PublicMomentumData` = worker fields only
- `frontend/pocket/stores/momentumStore.ts`: updated to `WorkerBreakdownData` type

### Frontend: SkillGraph component (mobile)

- New `frontend/pocket/components/momentum/SkillGraph.tsx`
- Radar/spider chart using `react-native-svg`
- 5 axes matching WORKER_SIGNALS; all labels rendered in SVG
- Data polygon fills to band color; dots on each data point
- Dimmed axes (opacity 0.35) for signals with `has_data = false`
- Score + band label centered in chart
- `SpeedometerGauge.tsx` deleted

### Frontend: Arena screen

- Replaced `SpeedometerGauge` with `SkillGraph`
- Both `fetchMyMomentum()` and `fetchMyBreakdown()` called eagerly on mount
- Score default changed from 500 → 0
- Removed poster/role-switching logic (always Runner)

### Frontend: MomentumBreakdown modal

- Updated to `WorkerBreakdownData` shape
- Signals with `has_data = false` show dimmed row + "No data yet" badge
- Removed `activeRole` prop (always worker)

---

## 2026-05-03 — Grid Theming Overhaul + Login Redesign + Bug Fixes

### Light/Dark theme system added to Grid
- Full Solar Flare Light palette added to `globals.css` under `[data-theme="light"]`
- Semantic component tokens (`:root` for dark defaults, overridden in light): `--card-bg`, `--sidebar-bg`, `--topbar-bg`, `--content-bg`, `--input-bg`, `--border-color`, `--nav-active-bg`, `--lime`, `--lime-on`
- CSS overrides for hardcoded Tailwind utilities in light mode: `border-white/10`, `bg-white/5`, `bg-[#201f1f]`, `bg-[#D4FF00]`, etc.
- Light mode: lime (`#D4FF00`) → olive (`#536600`) everywhere; `--color-text-inv: #ffffff` for white text on olive buttons
- `.nav-item` gets `background-color: transparent`; `.nav-item-active` gets warm beige bg (`#eef0da`) + olive text/border
- `ThemeToggle` component created at `components/ui/ThemeToggle.tsx` — reads/writes `localStorage("kria-grid-theme")`, updates `document.documentElement.dataset.theme`
- Added to Sidebar bottom section above Sign Out
- SSR flash fix: inline `<script>` in `layout.tsx` reads localStorage before first paint; `suppressHydrationWarning` on `<html>`

### Grid login page redesigned
- Premium two-column layout matching `stitch_kria_grid_host_dashboard-dark/grid_access_portal_refined`
- Left column: headline with lime accent, feature list (Users/BarChart3/Network icons), stats row
- Right column: glassmorphism auth card
- Background: `#0c0d0a` with radial lime glow gradients

### Bug fixes
- `ReputationBar` in `gigs/[id]/page.tsx`: fixed crash when `score` is null

---

## 2026-05-01 — Grid Stitch Redesign + Analytics + Demo Seed

### Stitch design language applied across all Grid pages
### Analytics Center (`/analytics`)
- KPI row, Application Funnel, Category Performance, Monthly Activity, City Distribution, Calendar Heatmap
- All live data — no dummy values, no chart library
### Demo seed data inserted
- Host: Priya Mehta (`919988776655@kriya.dev` / OTP `123456`)
- 15 gigs across 6 cities, 15 runner profiles, 144 applications, 113 assignments

---

## 2026-04-30 — Grid Dashboard + Host Role Hidden

### Host role hidden in mobile app
- `SHOW_HOST_ROLE = false` flag in 5 files
### Grid webapp built (`grid/`)
- Next.js 16.2.1 + Tailwind v4 + lucide-react + Space Grotesk
- Full auth, dashboard, gig posting wizard, applicant management, events, analytics

---

## 2026-03-27 — Landing Page (trykria.com)
- Built `landing-page/`, live at trykria.com (Vercel)
- i18n (EN / हि / த), interactive swipe card stack, waitlist form

---

## 2026-03-23 — Solar Flare Theme + Role-Split Dashboard
- `colors.ts` rewrite — `T.primary = #D4FF00`, `T.bg = #0e0e0e`
- `authStore.activeRole: "runner" | "host" | null`
- `RunnerTabsNavigator` + `HostTabsNavigator`
- `frontend/pocket/constants/labels.ts` — `L.*` for all UI strings

---

## 2026-02-21 — Momentum System (v1 original)
- Migration `0008_momentum.py`: `momentum_profiles` + `momentum_events`
- `SpeedometerGauge`, `MomentumBreakdown`, `MomentumBadge` components
- Arena screen with gauge + stats

---

## 2026-02-20 — Chat + Tab Bar Restructure
- Chat tab hidden (`href: null`)
- Global Realtime subscription for badge

---

## 2026-02-18 — Chat Feature
- Migration 0007: conversations, messages, conversation_participants
- **Open bug:** Receiver real-time not working reliably
