# Kriya - Auto Memory

## Critical: Always Read debugging.md
`memory/debugging.md` contains known issues that WILL waste hours if ignored.
Read it whenever touching auth, Docker, or migrations.

## Docker: Must Use --env-file
```bash
docker-compose --env-file .env.development -f docker-compose.yml -f docker-compose.dev.yml up
```

## JWT Secret — CRITICAL
The demo ANON_KEY and SERVICE_ROLE_KEY are signed with:
```
super-secret-jwt-token-with-at-least-32-characters-long
```
(with `-long` suffix — verified by HMAC-SHA256 check)
This MUST be `JWT_SECRET` in `.env.development`. Any difference → `JWSError JWSInvalidSignature` on every PostgREST request.

## Kong key-auth — CRITICAL
Kong 2.8.1 does NOT substitute `${VAR}` in kong.yml (`_transform: true` is NOT envsubst).
`backend/kong.yml` must have the anon/service keys hardcoded directly (already done).

## Dev Auth (Mock OTP)
- OTP is always `123456` in development
- Uses email `{digits_only}@kriya.dev` + password `kriya-dev-2026` under the hood
- Phone formatting (`+91...` vs `91...`) is normalized by stripping non-digits
- Config: `EXPO_PUBLIC_APP_ENV=development` in `frontend/.env`

## fetchProfile Returns boolean
`authStore.fetchProfile()` returns `true` on success, `false` on error.
Only `initialize()` signs out on false — `fetchProfile` itself never calls signOut.

## Migrations Are Idempotent
Adding a `.sql` file to `backend/supabase/migrations/` is enough.
The runner uses `_migrations` table to skip already-applied files.

## Screen Layout — Sticky Footer Pattern
All screens with a primary action button use: `KeyboardAvoidingView` (if inputs) > `ScrollView style={{flex:1}}` > `StickyFooter` component.
Never use `position: absolute` footers or magic spacer Views. See `memory/ux_decisions.md` → "Screen Layout Schema" for full rules and canonical examples.

## Dynamic Backend URLs — No Hardcoded IPs
`frontend/lib/config.ts` reads `Constants.expoGoConfig.debuggerHost` (Metro IP) in dev.
Both `lib/api/client.ts` and `lib/supabase.ts` import `API_URL` / `SUPABASE_URL` from there.
Never hardcode IPs in `.env` — they change per WiFi. The dynamic config handles it automatically.
