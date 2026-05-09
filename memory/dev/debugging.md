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
