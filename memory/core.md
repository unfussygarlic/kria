# Kria - Core Development Guide

**For AI Agents: READ THIS FILE FIRST**

This document is the entry point for all development on Kria. Follow these instructions precisely.

---

## CURRENT STATE (as of 2026-02-15)

**Project:** Event staffing & brand activation platform for college students
**Status:** Core auth + onboarding + profile + gig matching working end-to-end
**Stack:** Expo (React Native) + **FastAPI** + Supabase + TypeScript + Zustand

**Architecture:** Hybrid (Mobile → FastAPI → Supabase)
- **Frontend:** Expo (React Native) - UI/UX layer
- **Backend API:** FastAPI (Python) - Business logic, identity verification, matching
- **Data Layer:** Supabase (PostgreSQL) - Auth + DB + Realtime + Storage
- **Migrations:** Alembic (Python) — auto-applies on `kria-api` container start

**What's Done:**
- ✅ Expo SDK 54 (Node 20, React Native 0.81.5)
- ✅ Docker: Supabase stack + FastAPI (`kria-api` port 8001)
- ✅ Alembic migrations (5 applied — replaces old bash migration runner)
- ✅ Mock OTP auth (OTP: 123456 for dev, email+password under the hood)
- ✅ 4-step onboarding: First+Last Name → DOB (date picker) → Gender → City+State
- ✅ Edit Profile screen: bio, languages, skills, education, experience
- ✅ Identity verification: Aadhaar / PAN / DL / Voter ID / Passport (mock for dev, Pydantic validates format)
- ✅ Profile completion percentage (data-driven — add field in one line)
- ✅ Gig matching FastAPI endpoint (`POST /api/v1/gigs/match`)
- ✅ Profile completion card on profile tab (hidden at 100%)
- ✅ RLS policies with SECURITY DEFINER helpers (no infinite recursion)
- ✅ FastAPI JWT middleware (`CurrentUser` dependency)
- ✅ Frontend API client with Pydantic 422 error handling
- ✅ Applicant management: list applicants, accept (atomic), reject — FastAPI + applicant list screen

**What's Next:**
1. Worker check-in flow (gig day experience)
2. Post-gig rating submission UI
3. Momentum transactions (connect DB functions to FastAPI)
4. Real Twilio SMS in production

---

## 1. STARTUP PROTOCOL

When starting a new session, execute these steps in order:

### Step 1: Read Memory Files
Read these files to understand the project context:

```
REQUIRED (always read):
/memory/product_vision.md     → What we're building and why
/memory/domain_model.md       → Entities, relationships, data structures
/memory/architecture.md       → System architecture (FastAPI + Supabase)
/memory/tech_decisions.md     → Stack, patterns, tools
/memory/open_questions.md     → Unresolved decisions and assumptions
/memory/debugging.md          → ⚠️ Known issues, Docker gotchas, auth bugs — READ IF TOUCHING AUTH/DOCKER

CONTEXT-DEPENDENT (read based on task):
/memory/momentum_system.md    → If working on momentum features
/memory/reputation_system.md  → If working on ratings/reputation
/memory/matching_logic.md     → If working on gig matching/search
/memory/ux_decisions.md       → If working on UI/UX
/memory/changelog.md          → To understand recent changes
```

### Step 2: Check Current State
```bash
# Check project structure
ls -la /home/halvis/Documents/projects/kria/

# Check if frontend is set up
ls -la frontend/ 2>/dev/null || echo "Frontend not set up"

# Check if Expo app exists
ls -la frontend/app/ 2>/dev/null || echo "Expo app not set up"

# Check if FastAPI backend exists
ls -la backend/api/ 2>/dev/null || echo "FastAPI backend not set up yet"

# Check Supabase migrations
ls -la backend/supabase/migrations/ 2>/dev/null || echo "No migrations yet"
```

### Step 3: Identify Task
Ask the user what they want to work on, or continue from `changelog.md`.

---

## 2. DEVELOPMENT PHASES

### Phase 0: Infrastructure Setup (COMPLETED ✅)
- [x] Create Docker environments (dev + prod)
- [x] Initialize Expo project (SDK 54)
- [x] Create Supabase schema (4 migrations)
- [x] Set up TypeScript configuration
- [x] Mock SMS authentication for development
- [x] Architecture design (FastAPI + Supabase hybrid)

### Phase 0.5: FastAPI Backend Setup (COMPLETE ✅)
- [x] Create FastAPI project structure in `/backend/api/`
- [x] FastAPI runs in Docker (`kria-api` service, port 8000)
- [x] Create basic FastAPI app with health check (`GET /health`, `GET /health/db`)
- [x] Implement JWT auth middleware (validate Supabase tokens)
- [x] Configure SQLAlchemy async for Supabase PostgreSQL
- [x] Add to Docker Compose (dev environment with hot-reload)

### Phase 1: Authentication (SKELETON COMPLETE ✅)
- [x] Phone OTP login flow (mock for dev)
- [x] Session management (Supabase JWT)
- [x] Protected routes (Expo Router)
- [ ] FastAPI JWT validation middleware

### Phase 2: Core Data Layer (SKELETON COMPLETE ✅)
- [x] Profile CRUD (skeleton - onboarding, profile screen)
- [x] Gig CRUD (skeleton - post gig, gig details)
- [x] Applications flow (skeleton - apply button)
- [ ] Assignments flow (poster accepting, worker check-in)
- [ ] Migrate complex queries to FastAPI

### Phase 3: Matching & Ranking (NEXT PRIORITY 🎯)
- [ ] Gig matching algorithm (FastAPI endpoint)
- [ ] Applicant ranking algorithm (FastAPI endpoint)
- [ ] Update frontend to call FastAPI for matching
- [ ] Trust score calculations
- [ ] Distance-based filtering

### Phase 4: Momentum System (DB COMPLETE, API PENDING)
- [x] Wallet initialization (DB trigger)
- [x] Earning transactions (DB functions - temporary)
- [x] Spending transactions (DB functions - temporary)
- [x] Balance queries (wallet screen)
- [ ] Move to FastAPI with anti-gaming logic (daily/weekly caps)

### Phase 5: Reputation System (DB COMPLETE, UI PENDING)
- [x] Rating submission (DB function - temporary)
- [x] Score calculation (DB trigger)
- [ ] Display components (rating UI after gig)
- [ ] Move reputation calculation to FastAPI

### Phase 6: External Integrations (FUTURE)
- [ ] Real Twilio SMS integration (production)
- [ ] Payment gateway (Razorpay/Stripe)
- [ ] Push notifications (Expo Push)
- [ ] GPS check-in verification
- [ ] Image compression pipeline

### Phase 7: Polish (FUTURE)
- [ ] Comprehensive error handling
- [ ] Loading states everywhere
- [ ] Offline support with sync queue
- [ ] Performance optimization
- [ ] Analytics integration

### NEXT PRIORITY TASKS:
1. ✅ Test mock auth flow (phone + OTP 123456)
2. **Set up FastAPI backend** (`/backend/api/`)
3. **Implement gig matching endpoint** in FastAPI
4. **Update frontend** to call FastAPI for gig feed
5. Add applicant management screen for posters
6. Implement rating UI after gig completion

---

## 3. PROJECT STRUCTURE

### Directory Layout
```
/kria
├── memory/                         # AI agent memory (READ FIRST)
│   ├── core.md                     # This file - entry point
│   ├── architecture.md             # System architecture (FastAPI + Supabase)
│   ├── product_vision.md
│   ├── domain_model.md
│   ├── momentum_system.md
│   ├── reputation_system.md
│   ├── matching_logic.md
│   ├── ux_decisions.md
│   ├── tech_decisions.md
│   ├── open_questions.md
│   └── changelog.md
├── frontend/                       # Expo React Native app
│   ├── app/                        # Expo Router screens
│   ├── components/                 # React components
│   ├── hooks/                      # Custom hooks
│   ├── stores/                     # Zustand state management
│   ├── lib/                        # Utilities (Supabase client)
│   ├── types/                      # TypeScript types
│   ├── .env                        # Environment variables
│   └── package.json
├── backend/                        # Backend services
│   ├── api/                        # FastAPI application (TO BE CREATED)
│   │   ├── app/
│   │   │   ├── main.py            # FastAPI entry point
│   │   │   ├── auth/              # JWT middleware
│   │   │   ├── routers/           # API endpoints
│   │   │   ├── services/          # Business logic
│   │   │   ├── models/            # Pydantic models
│   │   │   └── db/                # Database utilities
│   │   ├── requirements.txt
│   │   ├── Dockerfile
│   │   └── .env.example
│   ├── supabase/                  # Supabase configuration
│   │   ├── migrations/            # SQL migrations
│   │   ├── functions/             # Edge Functions (if needed)
│   │   └── init/                  # Database init scripts
│   ├── Dockerfile.dev
│   ├── Dockerfile.prod
│   └── kong.yml                   # API Gateway config
├── docker-compose.yml              # Base compose config
├── docker-compose.dev.yml          # Dev overrides (Supabase only)
├── docker-compose.prod.yml         # Prod overrides
├── .env.example                    # Env template
├── .env.development                # Dev env (safe to commit)
└── .gitignore
```

### Services

#### Development Environment
| Service | Port | Status | Description |
|---------|------|--------|-------------|
| **FastAPI** | **8000** | **To be added** | **Business logic API** |
| Expo Dev | 8081 | ✅ Running | Expo development server (runs separately) |
| Supabase DB | 54322 | ✅ Running | PostgreSQL database |
| Supabase Studio | 54323 | ✅ Running | Database UI |
| Supabase API | 54321 | ✅ Running | REST/Realtime API |
| Supabase Auth | 9999 | ✅ Running | Phone OTP auth service |

**Current Setup:**
- **Backend (Docker):** Supabase + FastAPI (`kria-api` service, port 8000)
- **Frontend (Local):** Expo (runs separately, not in Docker)

#### Production Environment
| Service | Description |
|---------|-------------|
| Frontend | Built Expo app → App Stores (EAS) |
| FastAPI | Cloud Run / Railway / Fly.io |
| Supabase | Supabase Cloud (managed) |

### Commands

#### Start Development

**Terminal 1: Backend (Docker - Supabase + FastAPI)**
```bash
cd /home/halvis/Documents/projects/kria
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up
```

**Terminal 2: Expo Frontend**
```bash
cd /home/halvis/Documents/projects/kria/frontend
npx expo start
```

#### Other Commands
```bash
# Stop Supabase
docker compose -f docker-compose.yml -f docker-compose.dev.yml down

# Reset database (WARNING: deletes all data)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v

# Production build (future)
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
```

---

## 4. FILE NAMING CONVENTIONS

### Frontend (Expo/React Native) - inside /frontend
```
app/                    # Expo Router pages (kebab-case)
  (auth)/login.tsx
  (main)/(tabs)/index.tsx

components/             # React components (PascalCase)
  ui/Button.tsx
  gig/GigCard.tsx

hooks/                  # Custom hooks (camelCase with use prefix)
  useAuth.ts
  useGigs.ts

stores/                 # Zustand stores (camelCase)
  authStore.ts
  gigStore.ts

lib/                    # Utilities and clients (camelCase)
  supabase.ts
  api/gigs.ts

types/                  # TypeScript types (PascalCase)
  Gig.ts
  User.ts
```

### Backend (Supabase) - inside /backend
```
supabase/
  migrations/           # Timestamped SQL files
    20260214000000_initial_schema.sql
    20260214000001_add_rls_policies.sql

  functions/            # Edge Functions (kebab-case)
    calculate-momentum/index.ts
```

---

## 5. CODE PATTERNS

### API Calls (Result Pattern)
```typescript
type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

async function fetchGigs(): Promise<Result<Gig[]>> {
  const { data, error } = await supabase.from('gigs').select('*');
  if (error) return { ok: false, error: error.message };
  return { ok: true, data };
}
```

### Zustand Store Pattern
```typescript
interface GigStore {
  gigs: Gig[];
  loading: boolean;
  error: string | null;
  fetchGigs: () => Promise<void>;
}

export const useGigStore = create<GigStore>((set) => ({
  gigs: [],
  loading: false,
  error: null,
  fetchGigs: async () => {
    set({ loading: true, error: null });
    const result = await fetchGigs();
    if (result.ok) {
      set({ gigs: result.data, loading: false });
    } else {
      set({ error: result.error, loading: false });
    }
  },
}));
```

### Component Pattern
```typescript
interface GigCardProps {
  gig: Gig;
  onPress: (id: string) => void;
}

export function GigCard({ gig, onPress }: GigCardProps) {
  return (
    <Pressable onPress={() => onPress(gig.id)}>
      {/* Component content */}
    </Pressable>
  );
}
```

---

## 6. MEMORY UPDATE RULES

### When to Update Memory Files

| Event | Update |
|-------|--------|
| Schema change | `domain_model.md` |
| New business rule | Relevant system file |
| Architecture decision | `tech_decisions.md` |
| UX flow change | `ux_decisions.md` |
| New assumption | `open_questions.md` |
| Any significant work | `changelog.md` |

### Update Format
Always append with date:
```markdown
---

## 2026-02-14 - [Brief Description]

[Details of what changed and why]
```

### Never Delete
- Only append or version memory files
- If something is deprecated, mark it as such
- Preserve decision history

---

## 7. ENVIRONMENT VARIABLES

### Frontend (.env)
```env
# FastAPI Backend
EXPO_PUBLIC_API_URL=http://192.168.0.7:8000   # Local dev (use machine IP for phone)

# Supabase
EXPO_PUBLIC_SUPABASE_URL=http://192.168.0.7:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App
EXPO_PUBLIC_APP_ENV=development   # development | staging | production
```

### Backend API (.env) - To be created
```env
# Supabase (for FastAPI to connect)
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=super-secret-jwt-token-with-at-least-32-characters-long

# Database (direct connection for SQLAlchemy)
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres

# Redis (future, for background tasks)
REDIS_URL=redis://localhost:6379

# Environment
ENVIRONMENT=development
```

### Secrets (Never Commit)
- `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_SERVICE_KEY`
- `SUPABASE_JWT_SECRET`
- `TWILIO_AUTH_TOKEN` (production)
- Production database credentials
- API keys for external services

---

## 8. TESTING STRATEGY

### Unit Tests
- Business logic functions
- Utility functions
- Store actions (mocked API)

### Integration Tests
- API calls with test database
- Auth flows

### E2E Tests (Future)
- Critical user journeys
- Maestro or Detox

---

## 9. DEPLOYMENT CHECKLIST

### Before Deploying
1. [ ] All tests pass
2. [ ] No TypeScript errors
3. [ ] Memory files updated
4. [ ] Changelog entry added
5. [ ] Environment variables set
6. [ ] Database migrations applied

### Deployment Commands
```bash
# Run migrations (staging)
supabase db push --linked

# Build app
eas build --platform all --profile production

# Submit to stores
eas submit --platform all
```

---

## 10. TROUBLESHOOTING

### Common Issues

**Supabase connection fails in Docker:**
- Check if supabase services are running: `docker ps`
- Verify SUPABASE_URL points to correct container
- Check logs: `docker compose logs supabase-auth`

**Expo dev server not accessible from phone:**
- Use machine's local IP, not localhost (e.g., 192.168.0.7)
- Check frontend/.env has correct IP
- Ensure phone and computer on same network

**FastAPI can't connect to Supabase:**
- Check DATABASE_URL in backend/api/.env
- Verify SUPABASE_SERVICE_KEY is set
- Ensure Supabase is running: `docker ps`

**RLS blocking queries:**
- Check authenticated user context
- Review policies in Supabase Studio (http://localhost:54323)
- Verify JWT token is valid

**Mock OTP not working:**
- Check EXPO_PUBLIC_APP_ENV=development in frontend/.env
- Use OTP: 123456 (hardcoded for dev)
- Any phone number should work

---

## 11. QUICK REFERENCE

### Start Full Development Stack
```bash
# Terminal 1: Supabase (Docker)
cd /home/halvis/Documents/projects/kria
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# FastAPI runs in Docker alongside Supabase — no separate terminal needed

# Terminal 3: Expo Frontend
cd /home/halvis/Documents/projects/kria/frontend
npx expo start
```

### Useful Commands

**Database:**
```bash
# Apply migrations
cd /home/halvis/Documents/projects/kria/backend
supabase db push

# Generate TypeScript types
supabase gen types typescript --local > ../frontend/types/database.ts

# Reset database (WARNING: deletes data)
docker compose -f docker-compose.yml -f docker-compose.dev.yml down -v
```

**FastAPI (when set up):**
```bash
# Create virtual environment
cd backend/api
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run with auto-reload
uvicorn app.main:app --reload --port 8000

# View API docs
# Open: http://localhost:8000/docs
```

**Frontend:**
```bash
# Clear cache and restart
npx expo start --clear

# Run on Android
npx expo start --android

# Build for production
eas build --platform all --profile production
```

---

## 12. AGENT HANDOFF PROTOCOL

When ending a session:
1. Update `changelog.md` with work completed
2. Update relevant memory files
3. Note any blockers in `open_questions.md`
4. Summarize next steps for the user

When receiving a handoff:
1. Read this `core.md` file
2. Read `changelog.md` for recent context
3. Read `open_questions.md` for blockers
4. Ask user for clarification if needed

---

**Remember:** This codebase will be extended by multiple AI agents. Write code and documentation that future agents can understand without additional context.
