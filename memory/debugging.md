# Kria - Debugging & Known Issues

**For AI Agents: Read this before touching auth, Docker, or migrations.**

---

## 🔴 JWT Secret Must Match the Pre-Generated Demo Keys

### Symptom
- Sign-in/signup succeeds (GoTrue returns 200)
- Every `GET /rest/v1/*` or `PATCH /rest/v1/*` returns 401
- Frontend error: `{"message": "Invalid authentication credentials"}`
- Backend log: `GET /rest/v1/profiles → 401 52 bytes`

### Root Cause (definitive, verified by signature check)
The demo `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` in `.env.development` are pre-signed with exactly:
```
super-secret-jwt-token-with-at-least-32-characters-long
```
Note the **`-long` suffix** — this was verified by computing `HMAC-SHA256(header.payload, secret)` and comparing against the actual key signatures.

PostgREST verifies every Bearer JWT with `PGRST_JWT_SECRET`. GoTrue signs user JWTs with `GOTRUE_JWT_SECRET`. Both must equal this exact string. Also, Kong's key-auth plugin registers the demo keys as allowed API keys — if `kong.yml` uses `${SUPABASE_ANON_KEY}` without envsubst, Kong registers the literal placeholder string and rejects all clients.

### Fix (already applied)
- `JWT_SECRET` in `.env.development` = `super-secret-jwt-token-with-at-least-32-characters-long`
- All `docker-compose.yml` JWT_SECRET defaults = same value
- `backend/kong.yml` consumers have the keys hardcoded (Kong 2.8.1 does NOT substitute `${}` env vars — `_transform: true` is for entity format, not envsubst)

**Do not change the JWT_SECRET** without regenerating the anon key and service role key with the new secret.

### Restart required after this fix
```bash
docker-compose --env-file .env.development \
  -f docker-compose.yml \
  -f docker-compose.dev.yml down -v

docker-compose --env-file .env.development \
  -f docker-compose.yml \
  -f docker-compose.dev.yml up
```
The `-v` wipes all previous sessions (signed with the old wrong secret). Users must log in again.

### How to Diagnose 401 (Two Layers)
There are **two places** that return 401 on `/rest/v1/*`:

**Layer 1 — Kong key-auth (no `apikey` header match):**
- Response body: `{"message":"Invalid authentication credentials"}` (52 bytes)
- Means the `apikey` header didn't match any registered consumer in `kong.yml`

**Layer 2 — PostgREST JWT verification failure:**
- Response body: `{"code":"PGRST301","details":null,"hint":null,"message":"JWSError JWSInvalidSignature"}`
- Means Kong passed the request but PostgREST rejected the JWT signature
- Kong headers `X-Kong-Upstream-Latency` will be present (confirms request reached PostgREST)

**Diagnostic command (run from host):**
```bash
curl -s \
  -H "apikey: <anon_key>" \
  -H "Authorization: Bearer <anon_key>" \
  "http://localhost:54321/rest/v1/profiles?select=id&limit=1"
```
Check the response body to determine which layer is failing.

---

## 🔴 PERSISTENT ISSUE: Migrations Re-Run on Restart

### Symptom
```
ERROR: type "gig_category" already exists
supabase-db-migrations_1 exited with code 1
```

### Root Cause
Migration runner naively re-executes all `.sql` files on every container start. No idempotency.

### Fix (already applied)
Migration runner now uses a `_migrations` tracking table:
- Creates `_migrations` table on first run (`IF NOT EXISTS`)
- Skips files already recorded in the table
- New migration files are automatically picked up

**When adding a new migration:** Create a new numbered file in `backend/supabase/migrations/`. It will be applied on next `docker-compose up`. No manual intervention needed.

---

## 🟡 DEV AUTH: How Mock OTP Works

### Overview
Production uses real Supabase Phone OTP (Twilio). Dev uses **email+password** under the hood to avoid SMS dependency.

### Flow
1. User enters phone → `sendOtp()` → just logs, no real request
2. User enters `123456` → `verifyOtp()` runs:
   - Derives fake email: `{digits_only}@kria.dev` (strips non-digits to normalize `+91...` vs `91...`)
   - Constant password: `kria-dev-2026`
   - Tries `signInWithPassword(email, password)` first (returning users)
   - If fails → `signUp(email, password, { data: { phone } })` (new users)
   - If `signUp` returns no session → `signInWithPassword` again (GoTrue sometimes needs explicit sign-in even with autoconfirm)

### Why Email Instead of Phone
- Phone+password auth had a fragile password (`dev-password-${phone}`) that broke if the phone was entered with different formatting (`+91...` vs `91...`)
- Email auth with a constant password is deterministic and format-independent

### Key Config Required
In `docker-compose.dev.yml`, `supabase-auth` must have:
```yaml
GOTRUE_MAILER_AUTOCONFIRM: "true"
GOTRUE_EXTERNAL_EMAIL_ENABLED: "true"
```
These are already set in `docker-compose.yml` base config.

### handle_new_user Trigger
The trigger creates a profile row when a user is created. Phone auth sets `NEW.phone`. Email auth (dev) sets `NEW.phone = NULL`.

Migration `20260214000004_fix_handle_new_user.sql` fixed this:
```sql
COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', '')
```
The phone is passed via `options: { data: { phone } }` in the signUp call.

---

## 🟡 STALE SESSION HANDLING

### Symptom
User opens app → immediate "Fetch profile error" → gets logged out before even trying to log in.

### Root Cause
A session from a previous run is stored in SecureStore. After a DB volume wipe (`down -v`), the old JWT is still valid cryptographically but the user no longer exists in the database, OR the JWT secret changed between runs.

### Fix (in authStore.ts)
`initialize()` checks if the restored session can successfully fetch a profile:
```typescript
const ok = await get().fetchProfile();
if (!ok) {
  // Stale session — sign out and start fresh
  await supabase.auth.signOut();
  set({ session: null, profile: null, isOnboarded: false });
}
```

`fetchProfile()` returns `boolean` (true = success, false = any error). **It does NOT sign out on its own** — only `initialize` does.

### Why NOT sign out in fetchProfile
`fetchProfile` is also called from `onAuthStateChange` (during active sign-in). If we auto-signed-out there, a freshly-authenticated user would be immediately kicked out if there was a transient PostgREST error (like the JWT mismatch issue above).

---

## 🟡 SECURSTORE ADAPTER BUG (FIXED)

### Problem
The original `ExpoSecureStoreAdapter` in `lib/supabase.ts` had:
```typescript
setItem: (key, value) => { SecureStore.setItemAsync(key, value); }  // no return!
removeItem: (key) => { SecureStore.deleteItemAsync(key); }           // no return!
```
Supabase client awaits these. Without the `return`, writes were fire-and-forget. Sessions could be lost between operations.

### Fix
```typescript
setItem: (key, value) => SecureStore.setItemAsync(key, value),
removeItem: (key) => SecureStore.deleteItemAsync(key),
```

---

## 🟡 GOTRUE "USER ALREADY REGISTERED" + SIGN-IN FAILS

### Symptom
```
400: User already registered
invalid_grant: Invalid login credentials
```

### What Happened
1. `signUp` with phone+password succeeded first time
2. DB was reset (volume wipe) or user re-tried
3. `signUp` returns "already registered"
4. `signInWithPassword` fails because the password was derived from the raw phone string with different formatting

### Fix
Switched to email-based dev auth (see Dev Auth section above). The email is normalized from the phone (digits only), so format differences don't matter.

---

---

## 🔴 KONG KEY-AUTH: `${VAR}` NOT SUBSTITUTED IN kong.yml

### Symptom
All `/rest/v1/*` requests return 401 even with the correct anon key.
`curl` returns `{"message":"Invalid authentication credentials"}` (Kong layer).

### Root Cause
Kong 2.8.1 with `_transform: true` does **NOT** substitute `${SUPABASE_ANON_KEY}` in `kong.yml`.
`_transform: true` is for entity format transformation (admin API → declarative), not envsubst.

Kong registers the literal string `${SUPABASE_ANON_KEY}` as the key, so no client ever matches.

### Fix (already applied)
`backend/kong.yml` consumers have the anon/service keys hardcoded:
```yaml
consumers:
  - username: ANON
    keyauth_credentials:
      - key: eyJhbGci...CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
  - username: SERVICE_ROLE
    keyauth_credentials:
      - key: eyJhbGci...EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

After changing kong.yml: `docker restart kria_supabase-kong_1` (no DB wipe needed).

---

## 🟡 DOCKER-COMPOSE 1.29.2 BUG: --force-recreate Crashes

### Symptom
```
KeyError: 'ContainerConfig'
Traceback: compose/service.py ... get_container_data_volumes
```

### Root Cause
docker-compose 1.29.2 has a known bug with `--force-recreate` when containers were built with newer Docker versions.

### Workaround
Use `docker restart <container_name>` directly instead of `--force-recreate`.
For full env var changes: `down` then `up` (without `--force-recreate`).

---

## Docker Quick Reference

### ⚠️ `down` vs `down -v` — DATA LOSS WARNING

| Command | Volumes | DB data |
|---|---|---|
| `down` | **Kept** | **Survives** — use for routine restarts |
| `down -v` | **Destroyed** | **Gone forever** — only use for intentional full reset |

Never use `down -v` unless you explicitly want to wipe all data.

### Routine restart (data preserved)
```bash
docker-compose --env-file .env.development \
  -f docker-compose.yml \
  -f docker-compose.dev.yml down

docker-compose --env-file .env.development \
  -f docker-compose.yml \
  -f docker-compose.dev.yml up
```

### Full reset (⚠️ destroys ALL DB data — intentional only)
```bash
docker-compose --env-file .env.development \
  -f docker-compose.yml \
  -f docker-compose.dev.yml down -v

docker-compose --env-file .env.development \
  -f docker-compose.yml \
  -f docker-compose.dev.yml up --build
```
The `--build` flag is needed after `down -v` to pick up any image changes.
Alembic will re-apply all migrations automatically on the fresh DB.

### Restart single service (config change, keep DB)
```bash
docker restart kria_supabase-kong_1
# or
docker restart kria_supabase-rest_1  # etc.
```
Note: `--force-recreate` crashes on docker-compose 1.29.2 — use `docker restart` instead.

### Check actual env vars in a running container
```bash
docker inspect <container_name> --format '{{range .Config.Env}}{{println .}}{{end}}' | grep JWT
```

### Apply new migrations only
Just add a new `.sql` file to `backend/supabase/migrations/` and restart. The migration runner skips already-applied files.

---

## 🔴 RLS INFINITE RECURSION ON GIGS

### Symptom
```
ERROR: infinite recursion detected in policy for relation "gigs"
```
Triggered on both SELECT and INSERT+RETURNING on the `gigs` table.

### Root Cause
Circular RLS policy dependency:
- `gigs` SELECT policy → `EXISTS (SELECT 1 FROM gig_applications ...)` triggers `gig_applications` RLS
- `gig_applications` SELECT policy ("Posters can view...") → `EXISTS (SELECT 1 FROM gigs ...)` triggers `gigs` RLS again → infinite loop

### Fix (migration 20260215000005_fix_rls_recursion.sql)
Created two `SECURITY DEFINER` helper functions that bypass RLS on the queried tables:
- `is_gig_participant(gig_uuid)` — checks `gig_assignments` + `gig_applications` without their RLS
- `is_gig_poster(gig_uuid)` — checks `gigs.poster_id` without `gigs` RLS

Rewrote the two conflicting policies to use these functions.

**Rule:** Never use `EXISTS (SELECT ... FROM table_B)` in table_A's RLS policy if table_B's RLS also queries table_A. Use a SECURITY DEFINER function instead.

---

## 🔴 FASTAPI MATCHING.PY: WRONG COLUMN NAMES

### Symptom
```
asyncpg.exceptions.UndefinedColumnError: column "is_remote" does not exist
```

### Root Cause
FastAPI `matching.py` was written against a different schema than what was actually created. Mismatches:

| Code (wrong) | Schema (correct) |
|---|---|
| `is_remote` | `(location_point IS NULL) AS is_remote` |
| `boost_level` | `momentum_boost AS boost_level` |
| `starts_at` | `event_date` |
| `location::geometry` | `location_point::geometry` |
| `FROM assignments` | `FROM gig_assignments` |
| `FROM applications ap` / `ap.worker_id` | `FROM gig_applications ap` / `ap.applicant_id` |
| `rated_id` in ratings | `ratee_id` |

### Fix
All corrected in `backend/api/app/services/matching.py` and `backend/api/app/models/gig.py`.
Hot-reload applied changes automatically — no restart needed.

---

## Version History

| Date | Entry |
|------|-------|
| 2026-02-14 | Created: JWT mismatch, dev auth, stale sessions, SecureStore bug |
| 2026-02-14 | Updated: Correct JWT secret (-long suffix), Kong key-auth hardcoded, docker-compose 1.29.2 bug |
| 2026-02-15 | Added: RLS infinite recursion fix, FastAPI column name mismatches |
| 2026-02-15 | Added: Profile schema expansion (migration 0005), onboarding rewrite, identity verification |
