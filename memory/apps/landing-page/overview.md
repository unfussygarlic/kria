# Landing Page — trykria.com

Separate Next.js project. NOT part of the Expo app. Deploys to Vercel independently.

## Stack

- Next.js 16.2.1 (App Router, Turbopack, static export)
- No Tailwind — all layout with inline styles
- Fonts: Inter (body) + Comfortaa Bold (kria wordmark only) via `next/font/google`
- Vercel Analytics: `@vercel/analytics/next` — `<Analytics />` in `app/layout.tsx`
- Path: `/home/halvis/Documents/projects/kriya/landing-page/`

## Conventions

- `"kria"` — always lowercase, always Comfortaa Bold (`var(--font-comfortaa)`)
- Brand: lime `#D4FF00`, bg `#0B0F0A`, surfaces `#111510` / `#161b14`
- All responsive breakpoints are JS-driven via `useWindowWidth()` hook (no CSS media queries)
  - `isMobile = width < 860` for most layouts
  - `width < 640` for Nav
  - `width >= 500` for stats grids
- Favicon comes from `public/logo.svg` via metadata `icons` — `app/favicon.ico` was deleted (it overrides metadata)

## File Structure

```
app/
  layout.tsx        — metadata, fonts, Analytics
  page.tsx          — renders <LandingPage />
  globals.css       — box-sizing reset, body bg

components/
  Hero.tsx          — root composer; holds `role` state; wraps in <LanguageProvider>

  landing/
    constants.ts          — LIME, BG, SURFACE, GIG_CARDS, BANDS
    utils.ts              — useFadeIn(), useWindowWidth()
    LanguageContext.tsx    — LanguageProvider, useT(), useLang(), LangCode
    KriaWordmark.tsx       — lowercase "kria" in Comfortaa; props: size, glow
    Nav.tsx               — lang switcher (EN|हि|த) + Join Waitlist CTA
    Footer.tsx            — wordmark + links + copyright
    PhoneFrame.tsx        — interactive swipe card stack (mouse + touch)
    WaitlistForm.tsx      — email + comment + submit
    MomentumGauge.tsx     — 180° SVG semicircle gauge; score animates on mount

    locales/
      types.ts      — Translations type (source of truth for all keys)
      en.ts         — English (implements Translations)
      hi.ts         — Hindi (implements Translations)
      ta.ts         — Tamil (implements Translations)
      index.ts      — re-exports all

    sections/
      SectionHero.tsx       — two-column; left=copy, right=PhoneFrame
      SectionWhyKria.tsx    — animated chat thread (old way) vs kria steps
      SectionMomentum.tsx   — gauge + band pills + bullet points
      SectionWaitlist.tsx   — centred headline + WaitlistForm
```

## Sections Order

Nav (absolute) → SectionHero → lime divider → SectionWhyKria → SectionMomentum → SectionWaitlist → Footer

## Public Runner Profile (`/p/[slug]`, added 2026-08-05)

Shareable "career passport" URL — runners share `https://trykria.com/p/{slug}` from the Pocket app. See `features/public_profile.md` for the full feature.

- **Route:** `app/p/[slug]/page.tsx` — Next.js server component, ISR with 5-min revalidation
- **404 handler:** `app/p/[slug]/not-found.tsx` — custom "Runner not found" screen with lime "Discover Kria" CTA
- **API:** fetches from `${NEXT_PUBLIC_API_URL}/public/runners/${slug}`. Fallback default: `https://api.trykria.com/api/v1` — set env var on Vercel if EC2 hostname differs
- **OG metadata:** per-slug `generateMetadata` for WhatsApp/social link previews. Uses bio if present, else `{name} from {city} — {band} runner on Kria, {N} gigs completed.`
- **Design:** dark card (max-width 520), band-color gradient hero strip, avatar with verified check, band pill (color-coded, includes momentum score), ID-verified pill, bio, 3-stat row (Gigs / Streak with 🔥 / Momentum in band color), skills chips (lime-tinted), languages chips, "Discover Kria →" CTA
- **Inline styles only** — matches existing landing-page convention (no Tailwind)
- **Proxy note:** `proxy.ts` matcher is `["/"]` only, so `/p/[slug]` is untouched. Do not broaden the matcher.

## Current Hero Copy

- Line 1 (white): "Swipe up." / "स्वाइप करो" / "ஸ்வைப் செய்."
- Line 2 (lime): "Get paid." / "कमाओ" / "சம்பாதி."
- Sub: "Explore live gigs near you. Apply with a single swipe."

## i18n System

- **Approach:** React Context + static TS locale files — zero dependencies, all 3 locales bundled (~5 KB total)
- **Languages:** English (`en`), Hindi (`hi`), Tamil (`ta`)
- **`useT()`** — returns current `Translations` object
- **`useLang()`** — returns `{ lang, setLang }` for the switcher in Nav
- **Persistence:** `localStorage` key `kria_lang` (client-only)
- **Type safety:** `Translations` type in `locales/types.ts` — `hi` and `ta` must satisfy it at compile time
- **What's NOT translated:** ₹ amounts, score ranges, category colors, spots count

## Gotchas

- `app/favicon.ico` overrides metadata `icons` entirely — keep it deleted, favicon comes from `public/logo.svg`
- Non-passive `touchmove` listener on card stack: attached via `useEffect` with `{ passive: false }` (can't use React synthetic events for `preventDefault` on scroll)
- Back cards in PhoneFrame use solid colors (not transparent) to prevent card content bleed-through
- MomentumGauge SVG uses `width="100%"` inside a `maxWidth: 300` div — never hardcode `width="300"` (overflows on small phones)
- SectionWhyKria re-triggers chat animation on language change (resets `played` state in `useEffect` on `t`)
