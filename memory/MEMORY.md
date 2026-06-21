# Kria — Agent Memory

## Product
- [Overview](product/overview.md) — what Kria is, India-first, Runner/Host terminology, role architecture
- [Status](product/status.md) — what's live, what's hidden, pending work

## Architecture
- [Stack](architecture/stack.md) — Expo, FastAPI, Supabase, Next.js, Inspector, ports, Docker networking
- [Domain Model](architecture/domain_model.md) — all DB tables, relationships, migrations (0001–0030 applied; next: 0031)
- [Data Access](architecture/data_access.md) — Supabase direct vs FastAPI, auth patterns, key utils

## Apps
- [Mobile: Theming](apps/mobile/theming.md) — Solar Flare palette, semantic tokens, fonts, responsive, band colors (6-band, 0–1000)
- [Mobile: Navigation](apps/mobile/navigation.md) — tabs, routing, SHOW_HOST_ROLE flags, header patterns
- [Mobile: Screens](apps/mobile/screens.md) — screen-by-screen UX decisions (incl. verify-identity multi-ID flow)
- [Mobile: Animations](apps/mobile/animations.md) — PanResponder, Animated API, NativeWind conflict
- [Mobile: Patterns](apps/mobile/patterns.md) — reusable components, stores, code gotchas
- [Grid (Host Dashboard)](apps/grid/overview.md) — routes, sidebar order, TopBar dropdown, onboarding bypass fix, auth flow, CSS vars
- [Admin Dashboard: Plan](apps/admin/plan.md) — architecture, auth (is_admin flag), all 8 sections, backend work, 3 phases
- [Admin Dashboard: Design](apps/admin/design.md) — Dark Ops aesthetic, icon rail nav, bento overview, band-DNA user table, kanban queue, split ticket panel, radar health rings
- [Admin Dashboard: Progress](apps/admin/progress.md) — Phase 1 complete ✅; Phase 2 (verification FastAPI endpoints, gigs page) next
- [Landing Page](apps/landing-page/overview.md) — trykria.com, i18n, inline styles, gotchas

## Features
- [Momentum](features/momentum.md) — 0–1000 scale, 6 bands, profile completion bonus, skill graph, signals, backend module, formula
- [Badges](features/badges.md) — 18 badges (milestone/streak/identity), backend service, award hooks, home marquee
- [Identity Verification](features/identity_verification.md) — multi-ID, Inspector pipeline, badge system, VerificationCamera, error codes, gotchas
- [Gigs & Check-in](features/gigs.md) — lifecycle, OTP flow, applicants, geocoding wizard, venue Maps links
- [Recommendations](features/recommendations.md) — matching engine, geocoding, GPS, scoring weights, Maps deep link
- [Events](features/events.md) — events table, creation wizard, host/runner split
- [Chat](features/chat.md) — hidden feature, tables, real-time bug, do-not-install list
- [Email Notifications](features/email.md) — Resend, 3 email types, webhook architecture, unsubscribe, env vars, pending Supabase webhook setup
- [SMS Notifications](features/sms_notifications.md) — Fast2SMS via GoTrue hook, sms_notifications/ module, template registry, how to add new templates
- [Help & Support](features/help_support.md) — Grid /support page, FAQ accordion, 7-category query form, support_queries table, Resend admin notification, Admin Dashboard integration

## Project
- [Demo Seed](project/demo_seed.md) — Priya Mehta demo account, 15 gigs, 15 runners, all UUIDs

## Dev
- [Setup](dev/setup.md) — run commands, ports, Docker, dev auth, env files
- [Debugging](dev/debugging.md) — NativeWind/Animated, cache clearing, RLS, SVG CSS vars, asyncpg gotchas, Next.js 16 params, EC2/production gotchas
- [Todo](dev/todo.md) — open bugs, pending work, testing checklists
- [Changelog](dev/changelog.md) — session-by-session feature log

## Infra
- [Stack](architecture/stack.md) — includes production hosting table (EC2, Vercel, Supabase Cloud URLs)

---

## Quick Reference

### Run Commands
```bash
cd frontend/pocket && npx expo start                   # Mobile (Expo Go)
docker-compose --env-file .env.dev \
  -f docker-compose.yml -f docker-compose.dev.yml up  # Backend + Supabase + Inspector
cd frontend/grid && npm run dev                        # Grid (port 3000)
cd frontend/admin && npm run dev                       # Admin (port 3002)
cd landing-page && npm run dev                         # Landing page
```

### Dev Auth
- Mobile (Pocket): phone OTP, any number → `123456`
- Grid (web): email OTP — enter any email, get 6-digit code via Supabase built-in email
- **Demo host account:** `9988776655` (Priya Mehta, Bangalore) — 15 seeded gigs, 16 runners
- **Admin:** `coreofkria@gmail.com` → email OTP → `admin.trykria.com` (or `localhost:3002`)

### Theme (key tokens)
- `T.primary` = `#D4FF00` (lime) | `T.secondary` = `#8097ff` (cobalt)
- `T.bg` = `#0e0e0e` | surfaces: `#131313` / `#1a1919` / `#201f1f` / `#262626`
- `T.selBg/selText` — selected state (lime/black) | `T.ctaBg/ctaText` — CTA buttons (lime/black)
- `T.gradDark` = `["#1a1919","#0e0e0e"]` | `T.gradBrand` = `["#D4FF00","#c4ec00"]`

### FastAPI Auth
```python
CurrentUser = Annotated[AuthenticatedUser, Depends(get_current_user)]
db: AsyncSession = Depends(get_db)
```

### Terminology
- **Runner** = gig worker | **Host** = gig poster
- Backend fields (`poster_id`, `poster_rating`) unchanged — UI strings use Runner/Host
- All UI strings → `frontend/pocket/constants/labels.ts` → `L.*`

### Scoring System
- **Runner** → Momentum (0–1000, 6 bands, skill graph on Arena screen)
- **Host** → /10 rating from Runners (simple average from `ratings` table)
- Formula: `clamp(gig_score + profile_points, 0, 1000)`
  - `gig_score = (weighted_sum / 100) × 1000 × credibility − penalties`
  - `profile_points` = up to 80 pts from profile fields (outside credibility)

### Momentum Bands (0–1000)
| Range | Label | Color |
|-------|-------|-------|
| 0–99 | Newcomer | `#777575` |
| 100–299 | Building | `#ff7351` |
| 300–499 | Reliable | `#8097ff` |
| 500–699 | Trusted | `#FFC83D` |
| 700–899 | Elite | `#D4FF00` |
| 900–1000 | Legend | `#ffffff` |

### Momentum Backend Location
`backend/api/app/momentum/` — signals/ (one file per signal), registry.py, config.py, calculator.py, router.py, models.py, recalculate.py

### To Add a New Momentum Signal
1. Drop a `.py` file in `momentum/signals/` — export `SIGNAL: Signal` + `async def compute(user_id, db) -> float | None`
2. Restart: `docker compose restart kria-api`
3. Verify: `docker exec kriya_kria-api_1 python -c "from app.momentum import registry; print([s.key for s in registry.get_signals()])"`
- No DB migration, no frontend changes, no weight assertions. See `features/momentum.md` for full Signal dataclass fields.

### compute_worker_breakdown — new signature (3-tuple)
```python
# Takes signal_scores dict (from JSONB column), NOT profile_row
score, items, profile_items = compute_worker_breakdown(
    signal_scores,       # dict[str, float | None]  ← from row["signal_scores"]
    penalty_points,      # int
    gig_count,           # int
    profile_fields,      # dict | None
)
```

### Identity Verification Quick Ref
- **Flow:** `verify-identity.tsx` → `VerificationCamera mode="id"` → `mode="selfie"` → `POST /api/v1/profiles/verify-identity` (returns 202) → polls `GET /me/id-verification` every 5s
- **Async queue:** `services/verification_queue.py` — single asyncio worker serialises Inspector calls; job status tracked in `verification_jobs` table
- **Inspector:** `http://inspector:8000/verify` — joins `kria-network` via `docker-compose.dev.yml`
- **DB column:** `verified_id_types jsonb[]` — use `jsonb_build_array(:id_type)` NOT `':id_type'::jsonb` (asyncpg binding bug)
- **Badges:** `BadgeList earnedKeys={profile.verified_id_types}` — auto-shows `photo_verified` meta-badge

### Admin Quick Ref
- **URL:** `admin.trykria.com` (Vercel) | local: `http://localhost:3002`
- **Login:** `coreofkria@gmail.com` → email OTP
- **Grant new admin:** `INSERT INTO profiles (id, display_name, is_admin) SELECT id, 'Name', TRUE FROM auth.users WHERE email = '...' ON CONFLICT (id) DO UPDATE SET is_admin = TRUE;`
- **`display_name` is NOT NULL** — must include in INSERT or it will fail
- **FastAPI dep:** `AdminUser = Annotated[AuthenticatedUser, Depends(require_admin)]` in `auth/middleware.py`
- **Env var:** `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new Supabase format `sb_publishable_...`)

### Next Migration: `0031`

### SMS Notifications Quick Ref
- **Module:** `backend/api/app/sms_notifications/` — `templates.py` (registry), `sender.py` (Fast2SMS), `hook.py` (GoTrue endpoint)
- **Add template:** entry in `templates.py` → `await send_sms("key", mobile_10, ["var1", ...])` from anywhere
- **Phone format:** strip `+91` → 10-digit number; `variables_values` = pipe-separated vars with trailing `|`
- **Hook:** Supabase Dashboard → Auth → Hooks → Send SMS → `https://api.trykria.com/api/v1/sms/hook`
- **Dev:** `SMS_AUTOCONFIRM=true` → hook never fires; Pocket uses mock OTP `123456`
- **Env vars:** only `FAST2SMS_API_KEY` + `GOTRUE_HOOK_SECRET`; sender/message IDs live in `templates.py`

### Email Notifications Quick Ref
- **Trigger:** Supabase DB webhook → `POST /api/v1/email/internal/application-created` (header: `X-Webhook-Secret`)
- **⚠️ Webhook not yet set up in Supabase dashboard** — emails won't fire until it is
- **Profile reminders:** APScheduler cron daily 09:00 UTC → `send_profile_reminders()`
- **Unsubscribe:** HMAC token in email link → `GET /api/v1/email/unsubscribe`
- **`--color-amber` is `#ffeb9c`** (pale cream) — always use inline `style={{ color: "#FFC83D" }}` for amber UI, never Tailwind `text-amber`
- **Migrations 0027+0028:** Applied manually via Supabase SQL editor; EC2 can't reach direct DB (IPv6). Use `MIGRATION_DATABASE_URL` (Session Pooler) for future Alembic runs

### Badges Quick Ref
- **Backend:** `backend/api/app/services/badge_service.py` — all badge logic; `award()` uses `ON CONFLICT DO NOTHING` + explicit `db.commit()`
- **Endpoint:** `GET /api/v1/badges/me` — calls `sync_all_badges` first (retroactive), then returns all badges with earned status
- **Hook points:** momentum/me (newcomer + streak), applicants OTP verify (gig milestones), verification_queue `_mark_verified` (id badges)
- **Frontend store:** `frontend/pocket/stores/badgeStore.ts` — `fetchBadges()` on badges screen mount
- **Home marquee:** `BadgeMarquee` in `home.tsx` — scrolls when `earned.length > 3`; 0.25px/16ms; duplicated list for seamless loop
