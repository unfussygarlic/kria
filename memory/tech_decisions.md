# Kria - Tech Decisions

**Last Updated:** 2026-02-14

## Stack Overview

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Mobile Framework | Expo (React Native) | Cross-platform, fast iteration, OTA updates |
| Language (Frontend) | TypeScript (strict) | Type safety, better DX, AI-agent friendly |
| Navigation | Expo Router | File-based routing, deep linking support |
| **Backend API** | **FastAPI (Python 3.11+)** | **Complex business logic, async support, fast development** |
| **Data Layer** | **Supabase** | **Auth, DB, Realtime, Storage** |
| Database | PostgreSQL (via Supabase) | Robust, RLS support, JSON support |
| Auth | Supabase Auth (Phone OTP) | India-friendly, no email required |
| State Management | Zustand | Simple, TypeScript-friendly, minimal boilerplate |
| Styling | NativeWind (Tailwind) | Consistent with web patterns, rapid styling |
| Forms | React Hook Form + Zod | Validation, performance, type inference |

---

## Architecture: Hybrid Supabase + FastAPI

### Decision Rationale

**Why add FastAPI backend:**
1. **Complex matching algorithms** - Multi-factor scoring is awkward in SQL
2. **Momentum anti-gaming** - Daily/weekly caps easier in backend
3. **Future scalability** - Payment, notifications, background jobs need backend
4. **External integrations** - Twilio, payment gateways, etc.
5. **Independent scaling** - Can scale business logic separately from database

**Responsibility division:**
- **Mobile App:** UI/UX, local state, API calls
- **FastAPI:** Business logic, matching, scoring, integrations, background jobs
- **Supabase:** Auth, database, realtime, storage

See `memory/architecture.md` for full details.

---

## FastAPI Backend

### Technology Stack
- Python 3.11+
- FastAPI (async API framework)
- Pydantic (data validation)
- SQLAlchemy (database ORM)
- Supabase Python client
- Celery + Redis (background tasks, future)

### Key Endpoints (Planned)
- `POST /api/v1/gigs/match` - Score gigs for worker
- `POST /api/v1/applicants/rank` - Rank applicants for gig
- `POST /api/v1/momentum/earn` - Record momentum earning
- `POST /api/v1/momentum/spend` - Spend momentum with validation
- `POST /api/v1/ratings/submit` - Submit rating

### Authentication
- Validates Supabase JWT tokens
- Extracts user_id from token
- Uses Supabase service key for database access

---

## Project Structure

```
/kria
├── memory/                     # AI agent memory system
│   ├── core.md                 # Entry point - read first
│   ├── product_vision.md
│   ├── domain_model.md
│   └── ...
│
├── frontend/                   # Expo React Native app
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   ├── app/                    # Expo Router screens
│   │   ├── (auth)/            # Auth group (unauthenticated)
│   │   │   ├── _layout.tsx
│   │   │   ├── login.tsx
│   │   │   └── verify.tsx
│   │   ├── (main)/            # Main app group (authenticated)
│   │   │   ├── _layout.tsx
│   │   │   ├── (tabs)/        # Bottom tab navigator
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── index.tsx  # Home
│   │   │   │   ├── search.tsx
│   │   │   │   └── profile.tsx
│   │   │   ├── post/          # Gig posting flow
│   │   │   │   ├── _layout.tsx
│   │   │   │   ├── category.tsx
│   │   │   │   ├── details.tsx
│   │   │   │   └── review.tsx
│   │   │   ├── gig/
│   │   │   │   └── [id].tsx   # Gig details
│   │   │   └── wallet.tsx
│   │   ├── onboarding/
│   │   │   ├── _layout.tsx
│   │   │   └── profile.tsx
│   │   └── _layout.tsx        # Root layout
│   ├── components/
│   │   ├── ui/                # Generic UI components
│   │   ├── gig/               # Gig-related components
│   │   ├── profile/           # Profile components
│   │   └── wallet/            # Wallet components
│   ├── lib/
│   │   ├── supabase.ts        # Supabase client
│   │   ├── auth.ts            # Auth helpers
│   │   └── api/               # API functions
│   ├── stores/
│   │   ├── auth.ts            # Auth state
│   │   ├── gigs.ts            # Gigs state
│   │   └── wallet.ts          # Wallet state
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useGigs.ts
│   │   └── useProfile.ts
│   ├── types/
│   │   ├── database.ts        # Supabase generated types
│   │   ├── gig.ts
│   │   └── user.ts
│   ├── constants/
│   │   ├── colors.ts
│   │   └── config.ts
│   └── utils/
│       ├── formatting.ts
│       └── validation.ts
│
├── backend/                    # Backend services
│   ├── api/                   # FastAPI application
│   │   ├── app/
│   │   │   ├── main.py        # FastAPI app entry
│   │   │   ├── auth/          # Auth middleware
│   │   │   ├── routers/       # API endpoints
│   │   │   ├── services/      # Business logic
│   │   │   ├── models/        # Pydantic models
│   │   │   └── db/            # Database utilities
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── supabase/              # Supabase configuration
│   │   ├── migrations/        # SQL migrations
│   │   ├── functions/         # Edge Functions (if needed)
│   │   └── init/              # Database init scripts
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   └── kong.yml               # API Gateway config
│
├── docker-compose.yml          # Base compose config
├── docker-compose.dev.yml      # Dev overrides
├── docker-compose.prod.yml     # Prod overrides
├── .env.example
├── .env.development
└── .gitignore
```

---

## Supabase Configuration

### Auth Settings
- Phone OTP enabled
- SMS provider: Twilio (production) / Supabase built-in (dev)
- OTP expiry: 5 minutes
- Rate limit: 5 requests per minute per phone

### Database Settings
- RLS enabled on all tables
- Realtime enabled for: gigs, gig_applications, messages
- Point-in-time recovery enabled

### Storage Buckets
- `avatars` - Profile pictures (public)
- `gig-images` - Gig attachments (authenticated)

---

## TypeScript Configuration

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true
  }
}
```

---

## State Management Pattern

### Zustand Store Pattern
```typescript
interface GigStore {
  // State
  gigs: Gig[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchGigs: () => Promise<void>;
  createGig: (gig: CreateGigInput) => Promise<Gig>;

  // Computed (via selectors)
}
```

### Data Flow
1. Component calls store action
2. Store calls Supabase API
3. Store updates state
4. Components re-render via subscription

---

## API Pattern

### Supabase Query Wrapper
```typescript
async function fetchGigs(filters: GigFilters): Promise<Result<Gig[]>> {
  try {
    const { data, error } = await supabase
      .from('gigs')
      .select('*')
      .match(filters);

    if (error) return { ok: false, error };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e };
  }
}
```

---

## Error Handling Strategy

1. **API Level**: Return Result<T> type, never throw
2. **Store Level**: Set error state, clear on retry
3. **Component Level**: Display toast/modal based on severity

---

## Security Considerations

- All sensitive operations behind RLS
- Phone number never exposed to other users
- Location precision reduced for privacy (±500m)
- Rate limiting on all write operations

---

## Performance Targets

- Cold start: < 3 seconds
- Screen transitions: < 300ms
- API response: < 500ms (p95)
- Offline-first for read operations (future)

---

## Docker Configuration

### Supabase Self-Hosted Setup

**Important:** The `supabase/postgres` image creates service roles but does NOT set passwords by default. You must mount a custom init script.

**Init Script Order:**
Files in `/docker-entrypoint-initdb.d/` run in ASCII sort order:
- Numbers (0-9) come before letters (a-z)
- The image's `migrate.sh` creates roles
- Our password script must run AFTER `migrate.sh`

**Solution:** Mount to `init-scripts/99999-set-passwords.sql` (inside the subdirectory, high number)

```yaml
volumes:
  - ./backend/supabase/init/zzz-roles.sql:/docker-entrypoint-initdb.d/init-scripts/99999-set-passwords.sql:ro
```

**Docker Compose v1 vs v2:**
- v1 (`docker-compose`): Limited support for `condition: service_completed_successfully`
- v2 (`docker compose`): Full support
- Our setup uses `restart: on-failure` for compatibility with both

**Service Dependencies:**
Services use `restart: on-failure` to retry until database is ready with passwords set.

### ⚠️ CRITICAL: Always Use --env-file

**Always start Docker with:**
```bash
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up
```

**Why:** GoTrue and PostgREST must use the SAME `JWT_SECRET`. The value is:
```
super-secret-jwt-token-with-at-least-32-characters-long
```
(verified by HMAC-SHA256 against the demo ANON_KEY and SERVICE_ROLE_KEY)

**If you see 401 errors on PostgREST after successful auth:** See `memory/debugging.md` — there are two distinct 401 layers (Kong and PostgREST).

### ⚠️ CRITICAL: Kong key-auth — Hardcode Keys in kong.yml
Kong 2.8.1 does NOT substitute `${VAR}` env vars in `kong.yml`. `_transform: true` is for entity format conversion, not envsubst. The anon/service keys **must be hardcoded** in `backend/kong.yml`. Already done.

### Migration Runner
Migrations are tracked in a `_migrations` table. Adding a new `.sql` file to `backend/supabase/migrations/` is enough — no manual steps needed. The runner skips already-applied files.

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-14 | Initial tech stack decided |
| 2026-02-14 | Full project structure implemented - Docker, Expo, Supabase schema, skeleton screens |
| 2026-02-14 | Fixed Docker setup - Supabase service role passwords |
