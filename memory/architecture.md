# Kriya - Architecture & Backend Strategy

**Last Updated:** 2026-02-14

## Architecture Decision: Hybrid Supabase + FastAPI

### Overview

Kriya uses a **hybrid architecture** combining Supabase's managed services with a custom FastAPI backend for complex business logic.

```
┌─────────────────┐
│   Mobile App    │
│     (Expo)      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    FastAPI      │  ← Custom Business Logic
│   (Python 3.11+)│
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│    Supabase     │  ← Data Layer + Auth + Realtime
│  (PostgreSQL)   │
└─────────────────┘
```

---

## Responsibility Division

### Mobile App (Expo/React Native)
**Responsibilities:**
- UI/UX rendering
- User input handling
- Local state management (Zustand)
- API calls to FastAPI
- Realtime subscriptions to Supabase
- Image compression before upload
- Offline caching (future)

**Does NOT:**
- Complex business logic
- Data validation (trusts backend)
- Direct database access (except auth)

---

### FastAPI Backend
**Port:** 8000 (development), production TBD

**Responsibilities:**

#### Core Business Logic
- **Matching algorithms:**
  - `POST /api/v1/gigs/match` - Score gigs for a worker
  - `POST /api/v1/applicants/rank` - Rank applicants for a gig
  - Multi-factor scoring (trust, distance, category, pay, recency)
  - Previous interaction bonuses

- **Momentum management:**
  - `POST /api/v1/momentum/earn` - Record momentum earning
  - `POST /api/v1/momentum/spend` - Spend momentum with validation
  - Daily/weekly cap enforcement
  - Anti-gaming logic

- **Reputation calculations:**
  - `POST /api/v1/ratings/submit` - Submit rating with validation
  - `GET /api/v1/users/{id}/reputation` - Calculate reputation score
  - Outlier detection for revenge ratings
  - Trust score computation

#### External Integrations
- **SMS/OTP (production):**
  - Twilio integration
  - OTP generation and verification
  - Rate limiting

- **Push notifications:**
  - Expo Push Notifications
  - Notification templating
  - Delivery tracking

- **Payments (future v2):**
  - Razorpay/Stripe integration
  - Escrow management
  - Payout processing

#### Background Tasks
- **Scheduled jobs:**
  - Gig expiry checks (hourly)
  - Boost expiry handling
  - Reminder notifications
  - Analytics aggregation

- **Event processing:**
  - Webhook handling
  - Async task queue (Celery or similar)

#### Supporting Services
- **Rate limiting:** Per-user API limits
- **Logging:** Structured logging for debugging
- **Analytics:** Event tracking
- **Admin APIs:** Internal tools

**Technology Stack:**
- Python 3.11+
- FastAPI (async support)
- Pydantic (data validation)
- SQLAlchemy (database ORM)
- Celery + Redis (background tasks, future)
- Supabase Python client (database access)

**Authentication:**
- Validates Supabase JWT tokens
- Extracts user ID from token
- No separate auth system

---

### Supabase Layer
**Port:** 54321 (local), production URL TBD

**Responsibilities:**

#### Authentication (GoTrue)
- Phone OTP (production)
- Mock auth (development)
- Session management
- JWT token generation

#### Database (PostgreSQL 15)
- **Core data storage:**
  - Users, profiles
  - Gigs, applications, assignments
  - Ratings, momentum transactions
  - Wallets (momentum + earnings)

- **Row Level Security (RLS):**
  - User can only see their own private data
  - Public data visible to authenticated users
  - Poster-specific policies for gig management

- **Database functions (simple logic only):**
  - Wallet initialization trigger
  - Auto-timestamp updates
  - Simple aggregations

**Does NOT contain:**
- Complex scoring algorithms → FastAPI
- Multi-step business logic → FastAPI
- External API calls → FastAPI

#### Realtime (WebSocket)
- **Live updates for:**
  - New gig applications (poster sees immediately)
  - Chat messages (future)
  - Gig status changes

- **Polling acceptable for:**
  - Gig feed (refresh on pull)
  - Profile updates

#### Storage (S3-compatible)
- User avatars (public bucket)
- Gig images (authenticated bucket)
- Verification documents (private bucket)

**Storage rules:**
- Max 1MB per image
- Client-side compression
- Automatic thumbnail generation

---

## API Communication Flow

### Example: Worker Viewing Gig Feed

```
1. Mobile app calls FastAPI:
   GET /api/v1/gigs/feed?user_id={id}&lat={lat}&lng={lng}
   Headers: Authorization: Bearer {supabase_jwt}

2. FastAPI:
   - Validates JWT token
   - Extracts user_id from token
   - Queries Supabase for user profile (trust score, preferences)
   - Queries Supabase for available gigs
   - Runs matching algorithm (in Python)
   - Returns scored & sorted gigs

3. Mobile app:
   - Renders gig cards
   - Displays scores/badges
```

### Example: Posting a Gig

```
1. Mobile app calls FastAPI:
   POST /api/v1/gigs
   Body: { title, description, pay, location, ... }
   Headers: Authorization: Bearer {supabase_jwt}

2. FastAPI:
   - Validates JWT token
   - Validates gig data (Pydantic model)
   - Checks user momentum balance (if boosting)
   - Inserts gig into Supabase database
   - Deducts boost momentum if applicable
   - Returns gig ID + confirmation

3. Mobile app:
   - Navigates to gig details
   - Shows success message
```

---

## Why This Architecture?

### Benefits

1. **Separation of Concerns:**
   - Supabase = data + auth (what it's good at)
   - FastAPI = business logic (what it's good at)
   - Mobile app = UI/UX (what it's good at)

2. **Scalability:**
   - Can scale FastAPI independently from database
   - Can add caching layer (Redis) between FastAPI and Supabase
   - Can run multiple FastAPI instances behind load balancer

3. **Flexibility:**
   - Easy to add new endpoints
   - Easy to integrate external services
   - Easy to run background jobs
   - Can switch databases later if needed (unlikely)

4. **Development Speed:**
   - Python is fast for algorithm development
   - FastAPI has automatic API docs (OpenAPI)
   - Type safety (Pydantic) catches errors early
   - Easy to test business logic in isolation

5. **Cost Efficiency:**
   - Supabase free tier is generous
   - FastAPI can run on cheap VPS or serverless
   - Only scale what needs scaling

### Trade-offs

1. **More Complexity:**
   - One more service to deploy/maintain
   - Need to handle auth token validation
   - Mitigation: Keep FastAPI simple initially

2. **Network Latency:**
   - Mobile → FastAPI → Supabase (2 hops)
   - Mitigation: FastAPI and Supabase in same region

3. **Development Overhead:**
   - Need to maintain Python codebase
   - Mitigation: Use FastAPI's auto-generated docs

---

## Development Workflow

### Local Development

```bash
# Terminal 1: Supabase (Docker)
cd /home/halvis/Documents/projects/kriya
docker compose -f docker-compose.yml -f docker-compose.dev.yml up

# Terminal 2: FastAPI Backend
cd /home/halvis/Documents/projects/kriya/backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# Terminal 3: Mobile Frontend
cd /home/halvis/Documents/projects/kriya/frontend
npx expo start
```

### Environment Variables

**Backend (.env):**
```
SUPABASE_URL=http://localhost:54321
SUPABASE_SERVICE_KEY=<service_role_key>
SUPABASE_JWT_SECRET=<jwt_secret>
DATABASE_URL=postgresql://postgres:postgres@localhost:54322/postgres
REDIS_URL=redis://localhost:6379 (future)
```

**Frontend (.env):**
```
EXPO_PUBLIC_API_URL=http://192.168.0.7:8000 (dev)
EXPO_PUBLIC_SUPABASE_URL=http://192.168.0.7:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
```

---

## Deployment Strategy

### Phase 1: MVP (Current)
- Supabase: Self-hosted in Docker (single VPS)
- FastAPI: Same VPS, systemd service
- Frontend: EAS Build → App stores

### Phase 2: Small Scale (100-1000 users)
- Supabase: Migrate to Supabase Cloud (managed)
- FastAPI: Cloud Run / Railway / Fly.io (serverless)
- Frontend: EAS Build + OTA updates

### Phase 3: Growth (1000+ users)
- Supabase: Supabase Cloud (Pro tier)
- FastAPI: Multiple instances + load balancer
- Redis: Caching layer
- Frontend: EAS Build + OTA

---

## Security Considerations

### API Security
- All FastAPI endpoints require valid Supabase JWT
- Rate limiting per user (future)
- Input validation via Pydantic models
- SQL injection protected by SQLAlchemy ORM

### Data Security
- Supabase RLS policies enforced
- Sensitive data never sent to mobile app
- Phone numbers hashed in logs
- Service role key never exposed to mobile

### Auth Flow
1. User logs in via mobile → Supabase Auth
2. Supabase returns JWT token
3. Mobile app sends JWT with every API call
4. FastAPI validates JWT signature
5. FastAPI extracts user_id from JWT
6. FastAPI uses service key for Supabase queries

---

## What NOT to Do

❌ **Don't bypass FastAPI for complex queries**
   - Always route through FastAPI for business logic
   - Don't let mobile app access Supabase directly except for auth

❌ **Don't put business logic in database**
   - Keep database functions simple (triggers, timestamps)
   - Complex scoring → FastAPI

❌ **Don't leak service role key**
   - Only FastAPI should have service role key
   - Mobile app only has anon key

❌ **Don't make FastAPI a dumb proxy**
   - FastAPI should contain actual logic
   - Not just a passthrough to Supabase

---

## Migration Path (If Starting from Pure Supabase)

If you had started with pure Supabase:

1. **Identify complex logic** (matching, scoring)
2. **Extract to FastAPI endpoints**
3. **Update mobile app** to call FastAPI instead
4. **Keep Supabase** for auth, database, realtime
5. **Gradual migration** (one feature at a time)

For Kriya, we're starting with hybrid from day 1.

---

## Alternative Considered: Pure Supabase

**Why we're NOT doing pure Supabase:**

- Matching algorithms too complex for SQL/PostgREST
- Future payment integration easier in FastAPI
- Background jobs awkward with Supabase alone
- Scaling concerns (can't scale logic independently)

**When pure Supabase makes sense:**
- Simple CRUD apps
- No complex algorithms
- No external integrations
- No background jobs

Kriya needs more than CRUD, so hybrid is the right choice.

---

## Next Steps

1. **Create FastAPI project structure** in `/backend/api/`
2. **Set up basic FastAPI app** with health check
3. **Implement auth middleware** (JWT validation)
4. **Create first endpoint** (gig matching)
5. **Update mobile app** to call FastAPI
6. **Document all endpoints** (OpenAPI auto-generated)

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-14 | Architecture decision: Hybrid Supabase + FastAPI |
| 2026-02-14 | Documented responsibility division and rationale |
