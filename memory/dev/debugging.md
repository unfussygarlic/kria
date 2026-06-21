---
name: Debugging Guide
description: Known bugs, root causes, and fixes for dev and production issues
metadata:
  type: reference
---

# Debugging Guide

## NativeWind Breaks Animated API (CRITICAL)

**Symptom:** PanResponder fires, values update internally, but card doesn't visually move.

**Root cause:** `jsxImportSource: "nativewind"` in `babel.config.js` overrides JSX element creation, breaking `Animated.View` rendering on iOS/Expo Go.

**Fix:** NativeWind presets are already commented out in `babel.config.js` — never re-enable them.

**If animations stop working unexpectedly:**
1. Check `babel.config.js` — ensure NativeWind presets are still commented out
2. Clear caches (see below)
3. Reload app in Expo Go (shake → Reload)

## Cache Clearing

Run after changing `babel.config.js`, installing Babel plugins, or when seeing stale code:

```bash
cd frontend
rm -rf node_modules/.cache .expo
npx expo start --clear
```

Full cache clear (if above doesn't help):
```bash
pkill -f metro
rm -rf node_modules/.cache .expo /tmp/metro-* /tmp/haste-map-*
npx expo start --clear
```

## PanResponder Not Responding to Touch

**Cause 1: Parent View Has Zero Height**
```typescript
// ❌ height: "100%" with no parent height = 0px touch area
// ✅ Use minHeight or explicit height
<Animated.View style={{ minHeight: H * 0.55 }} {...pan.panHandlers}>
```

**Cause 2: Child Component Capturing Touches**
```typescript
// ✅ Child must not intercept — add pointerEvents="none"
<JobCard gig={gig} pointerEvents="none" />
```

**Cause 3: React Native Optimizing Away the View**
```typescript
// ✅ Always use collapsable={false}
<Animated.View collapsable={false} {...pan.panHandlers}>
```

## useNativeDriver Mismatch Error

```
"Animated node ... is not attached to a node that has nativeDriver: true"
```

**Fix:** All animations in a sequence/parallel must use the same `useNativeDriver` value. Gesture tracking (`Animated.event`) must be `false`; transform/opacity animations must be `true`.

## RLS Circular Dependency

**Symptom:** Query hangs or times out. Two tables with RLS policies that reference each other.

**Fix:** Use `SECURITY DEFINER` function:
```sql
CREATE FUNCTION check_access(user_id uuid) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM profiles WHERE id = user_id);
END;
$$;
```

## Supabase Realtime Not Firing

For the chat receiver-side bug:
1. Check `supabase/config.toml` → ensure `[realtime]` section has `enabled = true`
2. Verify `REPLICA IDENTITY FULL` on `messages` table in migration
3. Check if `supabase.realtime.setAuth(token)` needs explicit call
4. Try `{ config: { broadcast: { self: true } } }` in channel options

## Date/Time Type Errors (FastAPI → PostgreSQL)

**Symptom:** `asyncpg.exceptions.DataError: invalid input for type date`

**Fix:** Convert Pydantic string to Python object before insert:
```python
from datetime import date
event_date = date.fromisoformat(str(payload.event_date))
```

## Expo Go vs Custom Dev Build

Expo Go limitations with SDK 54:
- Specific Reanimated version (use `~4.1.1`)
- Can't install native modules not bundled in Expo Go
- Fatal crash with `react-native-gifted-chat` and `react-native-keyboard-controller`

If Expo Go behaves unexpectedly with a new library → check if it needs a custom dev build.

## Next.js 16 Params (Grid)

```typescript
// ❌ Old pattern — breaks in Next.js 16
export default function Page({ params }: { params: { id: string } }) {

// ✅ New pattern — use React.use() to unwrap
import { use } from "react";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
```

## Theme Flash on Page Load (Grid)

**Symptom:** Page flashes dark even when user has light mode saved, because `useEffect` runs after hydration.

**Fix:** Add an inline `<script>` in `app/layout.tsx` `<head>` that runs before paint, plus `suppressHydrationWarning` on `<html>`:

```tsx
// app/layout.tsx
<html lang="en" className={...} suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{
      __html: `(function(){var t=localStorage.getItem('kria-grid-theme');document.documentElement.dataset.theme=t||'dark';})();`
    }} />
  </head>
```

This pattern is already implemented. If you see theme flash again, verify the inline script is still present.

## Tailwind v4 CSS Vars Not Applying in Light Mode (Grid)

**Symptom:** Switching to light theme has no effect on hardcoded Tailwind utilities like `border-white/10`, `bg-white/5`, `bg-[#201f1f]`.

**Root cause:** Tailwind utilities are generated at build time; `[data-theme="light"]` can't change what class name was written. Need explicit CSS overrides.

**Fix:** Add to `globals.css`:
```css
[data-theme="light"] .border-white\/10 { border-color: rgba(0,0,0,0.08) !important; }
[data-theme="light"] .bg-\[\#201f1f\]  { background-color: #f8f9fa !important; }
/* etc — see globals.css for full list */
```

**Pattern:** Any time a new component uses a hardcoded dark hex (like `bg-[#1a1919]`), add a matching `[data-theme="light"]` override in globals.css.

## SVG CSS Vars Not Resolving (Grid SkillGraph)

**Symptom:** SkillGraph canvas stays dark even in light mode. `fill="var(--sg-canvas-from)"` doesn't change.

**Root cause:** SVG presentation attributes (`fill`, `stop-color`, `stroke`) are parsed as SVG values, not CSS — CSS custom properties don't resolve in them.

**Fix:** Use React `style` prop with `stopColor` (camelCase):
```tsx
// ❌ This doesn't work — SVG attribute, CSS vars don't resolve
<stop offset="0%" stopColor="var(--sg-canvas-from)" />

// ✅ This works — style prop resolves CSS vars at runtime
<stop offset="0%" style={{ stopColor: "var(--sg-canvas-from)" }} />
```
Same principle applies to stroke:
```tsx
// ✅ Use style prop
<polygon style={{ stroke: "var(--sg-grid)" }} />
```

## EC2 Production Deployment Gotchas

**Ubuntu 22.04+: SSH service name changed**
- `systemctl restart sshd` → fails with "Unit sshd.service not found"
- Correct: `systemctl restart ssh`

**Nginx: must be HTTP-only before certbot**
- Config with `listen 443 ssl` but no cert → nginx refuses to start → certbot can't do HTTP challenge
- Ship nginx config as HTTP-only (`listen 80` only); certbot `--nginx` adds SSL block automatically
- Order: copy config → `nginx -t && systemctl reload nginx` → `certbot --nginx -d api.trykria.com` → `nginx -t && reload`

**EC2 has no IPv6 by default**
- Supabase "Direct connection" tab gives an IPv6 address → `Network is unreachable` on EC2
- Use **Session mode pooler** tab: `aws-0-[region].pooler.supabase.com:5432`
- The region is encoded in the hostname — copy the exact URL from Supabase dashboard, don't construct manually
- **Alembic migrations work fine on EC2** — `alembic upgrade head` inside the container uses the Session Pooler URL (`MIGRATION_DATABASE_URL`), not the direct IPv6 URL

**`docker compose environment:` vs `env_file:`**
- `env_file: .env.prod` → injects vars INTO the container ✓
- `environment: KEY: ${VAR}` → reads `${VAR}` from HOST shell environment, NOT from env_file ✗
- Solution: remove redundant `environment:` block; pass `--env-file .env.prod` to the `docker compose` command so Compose can interpolate its own `${VAR}` references

**`.env.prod` correct var names for backend**
- `SUPABASE_JWT_SECRET` (not `JWT_SECRET`) — matches `config/__init__.py`
- `SUPABASE_SERVICE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`) — docker-compose.prod.yml uses env_file directly

**Supabase ENOTFOUND tenant not found**
- Caused by wrong region in pooler URL — `aws-0-ap-south-1` only works if project is actually in ap-south-1
- Always copy pooler URL from Supabase dashboard → Connect → Session mode tab

## Grid: Next.js Static Prerender Crash (supabaseUrl is required)

**Symptom:** Vercel build fails with `supabaseUrl is required` during static page generation.

**Root cause:** `NEXT_PUBLIC_*` env vars must be set in Vercel dashboard BEFORE building. Next.js embeds them at build time. If missing, `createClient()` throws at module evaluation when Next.js tries to statically prerender a page that imports `lib/supabase.ts`.

**Fix 1 (required):** Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel → Settings → Environment Variables before deploying.

**Fix 2 (belt-and-suspenders):** Add a layout wrapper with `export const dynamic = "force-dynamic"` for any page that imports the Supabase client at the module level:

```typescript
// app/login/layout.tsx  (and app/auth/confirm/layout.tsx)
export const dynamic = "force-dynamic";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
```

These two files are already present in Grid for `/login` and `/auth/confirm`. If a new page crashes with `supabaseKey is required` at build, add the same layout pattern.

**DO NOT use a Proxy to lazy-init the Supabase client** — `supabase.from()` loses `this` binding through a Proxy, causing silent runtime crashes on every query.

## mediapipe Version Pin (Inspector)

**Symptom:** Docker build fails: `AttributeError: module 'mediapipe' has no attribute 'solutions'`

**Root cause:** MediaPipe 0.10.20+ removed the `mp.solutions` legacy API. Inspector's `liveness_checker.py` uses `mp.solutions.face_mesh`.

**Fix:** Pin to `mediapipe==0.10.14` in `perceptrons/inspector/requirements.txt`. Do not use `>=`.

## Grid Auth: 401 on All Authenticated Requests (Production)

**Symptom:** `POST /api/v1/recommendations/geocode HTTP/1.1" 401 Unauthorized` — all authenticated API calls fail on EC2 despite correct JWT secret.

**Root cause:** Supabase migrated the project from legacy HS256 JWT signing to **ECC P-256 (ES256)** asymmetric signing. The backend was verifying with HS256 using the shared secret, but new tokens (issued after the rotation) are signed with the new key. The JWKS endpoint at `{SUPABASE_URL}/auth/v1/.well-known/jwks.json` holds the current public keys.

**Fix:** Updated `backend/api/app/auth/middleware.py` to:
1. Fetch and cache JWKS from Supabase on first request (refreshed every hour, thread-safe double-checked locking)
2. Verify with `ES256`/`RS256` as primary path
3. Fall back to legacy `HS256` shared secret for tokens issued before the rotation (still valid until expiry)

**`python-jose[cryptography]`** already in requirements — supports ES256 natively. Pass the JWKS dict directly to `jwt.decode()` and it matches keys by `kid` header automatically.

**Supabase key location:** Dashboard → Settings → API Keys → JWT Signing Keys. Legacy HS256 = "Previously used keys"; Current = ECC P-256.

## Grid Auth: "Unsupported phone provider" / "Email address invalid" in Production

**Symptom:** Grid login returns "Unsupported phone provider" or "Email address '918148095499@kriya.dev' is invalid".

**Root causes:**
- "Unsupported phone provider" → phone SMS provider (Twilio) not configured in Supabase Cloud → `signInWithOtp({ phone })` fails.
- "Email address invalid" → old deployed code was using `signUp({email: "91{phone}@kriya.dev"})` pattern; production Supabase rejects this email format.

**Fix:** Switched Grid auth to **email OTP** (`signInWithOtp({ email })`). No Twilio needed — uses Supabase's built-in email service. No separate sign-in/sign-up flow needed: `signInWithOtp` auto-creates user if not exists.

**Email template:** Supabase → Authentication → Email → Templates → Magic link → use `{{ .Token }}` in body to show 6-digit code instead of a link.

## Grid Auth: Email Rate Limit / RLS on profiles INSERT

**Symptom:** "email rate limit exceeded" or "new row violates row-level security policy for table profiles"

**Root cause:** Old Grid login used `supabase.auth.signUp({email: "91{phone}@kriya.dev"})`. In Supabase Cloud with email confirmation enabled, `signUp` returns a user but no session — so `auth.uid()` is null when trying to upsert profiles, violating the `WITH CHECK (auth.uid() = id)` RLS policy. Also triggered email rate limits.

**Fix:** Replaced with email OTP auth (`signInWithOtp({ email })` + `verifyOtp({ email, token, type: "email" })`). User is always authenticated before touching profiles.

## PostgreSQL ENUM + asyncpg Bind Params (FastAPI)

**Two separate gotchas in a single query:**

**1. ENUM comparison requires `::text` cast:**
```sql
-- ❌ Fails: can't bind text to ENUM
WHERE ga.status = :status

-- ✅ Cast to text first
WHERE ga.status::text = :status
```
Also affects CASE expressions: `CASE ga.status::text WHEN 'pending' ...`

**2. asyncpg deduplicates named params by name:**
asyncpg maps named params to positional `$1`, `$2`... by order of FIRST appearance. If you use the same param name twice (even for the same value), both references bind to the same positional param — which works for the first, but the second occurrence refers to a `$N` that doesn't exist or collides.

```python
# ❌ Both :poster_id usages both map to $1
WHERE gigs.poster_id = :poster_id
JOIN ratings ON ratings.rater_id = :poster_id  # collision!

# ✅ Use distinct names, pass same value for both
WHERE gigs.poster_id = :poster_id
JOIN ratings ON ratings.rater_id = :rater_id
# params: {"poster_id": user_id, "rater_id": user_id}
```

## Admin: profiles.display_name is NOT NULL

**Symptom:** `ERROR: 23502: null value in column "display_name" of relation "profiles" violates not-null constraint` when inserting a profile for an admin user who never went through onboarding.

**Root cause:** `display_name` is NOT NULL on profiles. Admin users registered via email OTP (not via onboarding form) have no profile row, so a bare `INSERT INTO profiles (id, is_admin)` fails.

**Fix:** Always include `display_name` when inserting a profile manually:
```sql
INSERT INTO profiles (id, display_name, is_admin)
SELECT id, 'Admin', TRUE FROM auth.users WHERE email = 'coreofkria@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_admin = TRUE;
```
