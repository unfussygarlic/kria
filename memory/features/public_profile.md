---
name: Public Runner Profile
description: Runner "career passport" — shareable public URL at trykria.com/p/{slug}, backend endpoint, Pocket share sheet integration
type: project
---

# Public Runner Profile (Career Passport)

Shipped 2026-08-05. Runners can share a public view of their profile with hosts via `https://trykria.com/p/{slug}`. Read-only, no auth required to view.

## Schema

Migration `0032_public_profile_slug.py` adds:
- `profiles.public_slug TEXT UNIQUE` — URL-friendly identifier
- `idx_profiles_public_slug` index
- Backfill formula: `{lowercase_alphanumeric(first_name)}-{last 6 chars of user id}` (falls back to `runner-{id6}` when first_name is empty)

Slug is set at migration time for existing users. New profiles need slug generation logic if we ever add "vanity slug" edits later.

## Backend Endpoint

`GET /api/v1/public/runners/{slug}` — **no auth**. Router at `backend/api/app/routers/public.py` (registered in `main.py` alongside the other v1 routers).

Returns `PublicRunnerProfile`:
```
slug, display_name, first_name, city, avatar_url, bio,
is_verified, id_verified,
total_gigs_completed, streak_count, momentum_score,
skills[], languages[], verified_id_types[],
joined_at
```

**Explicitly NOT returned:** phone, email, DOB, id_value, address, last_active. Privacy-first — only fields a runner would want on a resume-style page.

Uses a LEFT JOIN on `momentum_profiles` to pick up `worker_score`. Returns 404 if slug not found (never leaks whether the slug format was invalid vs. unassigned).

## Landing Page (`trykria.com/p/{slug}`)

`landing-page/app/p/[slug]/page.tsx` — Next.js server component. ISR with 5-min revalidation (profile edits show up within 5 min, no hammering the API on every share click).

Layout:
- Band-colored gradient hero strip (top)
- Avatar (or lime-circle initial) with verified blue-check overlay
- Name + city + band pill (color-coded, includes momentum score) + "ID verified" pill
- Bio
- Stats row: Gigs done · Day streak (with 🔥) · Momentum (in band color)
- Skills chips (lime-tinted)
- Languages chips
- "On Kria since {joined}" footer
- "Discover Kria →" CTA

OpenGraph metadata generated per-slug for WhatsApp/social link previews. Includes bio in description; falls back to `{name} from {city} — {band} runner on Kria, {N} gigs completed.`

Custom `not-found.tsx` in the same directory for 404s (bad slug or deactivated account).

**Environment:** `NEXT_PUBLIC_API_URL` on Vercel. Default fallback in code is `https://api.trykria.com/api/v1` — update if EC2 hostname differs.

## Pocket Share Flow

Profile tab has "Share Profile" quick box. Handler in `frontend/pocket/app/(main)/(tabs)/profile.tsx`:

```typescript
const slug = profile.public_slug ?? profile.id;  // slug should always exist post-0032
const url = `https://trykria.com/p/${slug}`;
await Share.share({
  message: `${name} on Kria — verified gig worker. See their profile: ${url}`,
  url,
});
```

Uses React Native's built-in `Share` API — no new dependencies. `profile.public_slug` added to `types/database.ts` at `Row.public_slug: string | null`.

## Do-not-touch

- **Never add fields to `PublicRunnerProfile`** without a privacy pass. Currently no PII beyond first name + city. Fields like age/exact address/phone stay server-side.
- **The `/public` router is registered without auth middleware** — any endpoint added under it inherits that. Only put truly-public reads here.
- **Slug format matters for URL cleanliness** — don't include user-controllable free text without slugification.

## Followups (not shipped)

- Vanity slug edits (let runners pick their slug) — needs uniqueness check UI
- Runner opt-out toggle (some runners may not want a public profile)
- Public completed-gigs feed on the profile (needs backend endpoint for a curated recent-gigs list)
- Grid host-side "view public profile" link from applicants list — hosts see the runner's shareable card before hiring
