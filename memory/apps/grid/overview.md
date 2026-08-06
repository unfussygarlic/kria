# Grid — Host Dashboard

Grid is the web dashboard for Kria Hosts. Runners use the mobile app; Hosts use Grid.

## Stack

- **Framework:** Next.js 16.2.1 (App Router)
- **All components:** `"use client"` (no SSR needed for this auth-gated dashboard)
- **Styling:** Tailwind v4 — `@import "tailwindcss"` + `@theme {}` block in `globals.css`. No `tailwind.config.ts` needed.
- **Icons:** lucide-react
- **Fonts:** Inter (body, via `next/font/google`) + Comfortaa 700 (wordmark only, exposed as `--font-comfortaa` CSS var). Matches landing-page font setup exactly.
- **Auth:** Supabase client-side session (same instance as mobile app)
- **Backend:** Same FastAPI server as mobile app

## Directory Structure

```
grid/
├── app/
│   ├── globals.css              # Tailwind v4 + Solar Flare @theme + skill graph CSS vars
│   ├── layout.tsx               # Space Grotesk font, bg-bg text-text
│   ├── page.tsx                 # redirect("/dashboard")
│   ├── login/page.tsx           # Scroll-story landing page + sticky email-OTP sign-in card (redesigned 2026-07-20)
│   ├── onboarding/page.tsx      # New host onboarding (2-step: name → city/state with skip)
│   └── (dashboard)/
│       ├── layout.tsx           # Auth guard + Sidebar
│       ├── dashboard/page.tsx   # Stats overview + recent gigs
│       ├── gigs/
│       │   ├── page.tsx         # Gig list with filter + search
│       │   ├── new/page.tsx     # Post a Gig (4-step wizard)
│       │   └── [id]/page.tsx    # Gig detail + applicants + OTP
│       ├── events/
│       │   ├── page.tsx         # Events list
│       │   ├── new/page.tsx     # Create Event (2-step)
│       │   └── [id]/page.tsx    # Event detail (job cards)
│       ├── applications/
│       │   └── page.tsx         # Global inbox — all applicants across host's gigs
│       ├── analytics/page.tsx   # Analytics Center (KPI, funnel, charts)
│       └── profile/page.tsx     # Edit display_name + bio
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # Nav sidebar — CSS vars, .nav-item/.nav-item-active, ThemeToggle
│   │   │                        # Nav items: Dashboard, Gigs, Events, Applications, Analytics, Subscription
│   │   └── TopBar.tsx           # Top bar — search input, Bell icon, profile dropdown (Profile/Settings/Sign Out)
│   ├── applicants/
│   │   └── ApplicantProfileModal.tsx  # Full applicant modal with SkillGraph + profile details
│   └── ui/
│       ├── Button.tsx           # primary / ghost / danger / outline variants
│       ├── Badge.tsx            # GigStatusBadge, AppStatusBadge, AsgnStatusBadge
│       ├── Input.tsx            # Input, Select, Textarea with label + error
│       ├── Spinner.tsx          # Spinner, PageLoader
│       ├── MomentumChip.tsx     # Band chip; exports getBand(score | null)
│       ├── SkillGraph.tsx       # SVG radar chart (no react-native-svg); theme-adaptive via CSS vars
│       └── ThemeToggle.tsx      # Dark/Light toggle; reads/writes localStorage "kria-grid-theme"
├── lib/
│   ├── supabase.ts              # Supabase client
│   ├── config.ts                # API_URL from NEXT_PUBLIC_API_URL
│   └── api/
│       ├── client.ts            # apiGet, apiPost, apiPatch
│       ├── events.ts            # createEvent, getMyEvents, getEvent, addJobToEvent
│       ├── applicants.ts        # listApplicants (per-gig), listAllApplicants (global), acceptApplicant, rejectApplicant, markNoShow
│       ├── momentum.ts          # fetchUserBreakdown(userId) → GET /momentum/user/{id}/breakdown
│       └── support.ts           # submitSupportQuery(), getMyTickets(), MyTicket type
└── types/index.ts               # All TypeScript types incl. BreakdownItem, ProfileSignalItem, MomentumBreakdownResponse, GlobalApplicantItem
```

## Routes

| Path | Page |
|------|------|
| `/` | → redirect to `/dashboard` |
| `/login` | Scroll-story landing page (what Grid is, for employers) + sticky email-OTP sign-in card |
| `/onboarding` | New host onboarding (name + optional city/state) |
| `/dashboard` | Stats: Active Gigs, Total Events, Slots Filled, Total Posted |
| `/gigs` | Gig list (status filter tabs + search) |
| `/gigs/new` | Post a Gig wizard (4 steps) |
| `/gigs/[id]` | Gig detail + OTP + applicants management |
| `/events` | Events list |
| `/events/new` | Create Event (2 steps) |
| `/events/[id]` | Event detail with job cards |
| `/applications` | Global applications inbox — all applicants across host's gigs |
| `/analytics` | Analytics Center — KPI cards, funnel, category perf, monthly activity, city distribution, heatmap |
| `/profile` | Edit display_name + bio, reputation bar, stats |
| `/support` | Help & Support — FAQ accordion + query form + My Tickets tab |

## Login / Landing Page (`/login`) — Scroll-Story Redesign (2026-07-20)

Grid previously had no real landing page — `/login` was a generic split-screen sign-in form. It was rebuilt as a combined marketing landing page + sign-in, imported from a Claude Design `.dc.html` prototype (via the `DesignSync` MCP tool: `list_files`/`get_file` against a `claude.ai/design` project, then hand-translated into real React/Next.js — the `.dc.html` template syntax, `support.js` runtime, `sc-for`/`sc-if` placeholders etc. are a design-tool-only format, not shippable code) and iterated heavily afterward. All in `frontend/grid/app/login/page.tsx` (single file, ~800 lines, all inline styles + one `<style>` block for responsive/keyframe CSS — no Tailwind used here, unlike the rest of Grid).

### Layout

Two-column CSS Grid (`.grid-shell`): left = scrollable story column, right = sticky sign-in panel (`minmax(340px,480px)` wide, `position: sticky; top: 0; height: 100vh`).

- **Header** (`.grid-header`) and **footer** (`.grid-footer`) are full-width children of the story column — logo flush left, theme toggle flush right, spanning the true column edges.
- **Only the scroll-story article** (progress rail + scene text) is wrapped in `.grid-story-inner` (`max-width: 900px; margin: 0 auto`) so it reads at a comfortable width without hugging the left edge on wide screens, while header/footer stay edge-to-edge.
- **Progress rail** (left nav: Grid / Why Grid / Post / Applicants / Check-in / Events / Start) uses `position: sticky` on an inner div (`.grid-rail-sticky`, `top: 34vh`) — **never add `overflow: hidden` to `.grid-rail`**, it silently breaks the sticky child (overflow ≠ visible on an ancestor becomes the sticky containing block; since that ancestor doesn't itself scroll, stickiness becomes a no-op). Use `white-space: nowrap` on rail labels instead if text-overflow protection is needed.
- Below 1024px the grid collapses to one column (auth card first via `order`, story below) and the rail hides entirely — this breakpoint must stay in sync between the grid collapse and the rail visibility, or the rail floats oddly next to a now-single-column layout.

### Scroll-reveal system

`useReveal()` hook + `<Reveal>` wrapper — `IntersectionObserver`-driven fade/slide-in for scene content, keyed by `data-reveal-id` set via a `register(el, id)` callback.

**Known trap:** the `IntersectionObserver` must be constructed *synchronously during render* (`if (!observerRef.current) observerRef.current = new IntersectionObserver(...)`), NOT inside the parent's `useEffect`. Child `Reveal` components register themselves in their own mount `useEffect`, and React fires child effects *before* parent effects — so a parent-side `useEffect` to create the observer always loses that race, leaving every `register()` call silently no-op and all scene content stuck at `opacity: 0` forever. This bit us once already; don't reintroduce it.

### Scenes (in order, 0–6, matching `RAIL_STEPS`)

| # | Scene | Content |
|---|-------|---------|
| 0 | Intro | Eyebrow + headline ("Hire verified shift & gig staff across India.") + plain-language explainer + two CTAs: "See how it works" (scroll-jump) and "Talk to us" (`mailto:support@trykria.com`) |
| 1 | Why Grid | "Without Grid" vs "With Grid" two-column comparison (WhatsApp groups/no-shows vs verified history/OTP check-in) |
| 2 | Post a gig | Interactive demo: role field types itself, Publish button toggles state (decorative, not wired to real data) |
| 3 | Applicants | 3 sample applicant cards with Momentum band colors + Accept toggle; 6-band legend (`--band-newcomer` → `--band-legend`) shown above the list so the score colors are explained |
| 4 | Check-in | 4-digit OTP boxes animate in + "Priya checked in" note |
| 5 | Events | Sample event card with role chips + "+ Add a role" (decorative) |
| 6 | Close | Stylized browser-chrome mockup of the real Grid dashboard (sidebar nav, stat cards, live gig rows) + final sign-up nudge |

Scenes 2–6 are pure illustration/demo state (local `useState`, not backed by the real API) — intentional, since this page renders before any auth session exists.

### Sign-in card (right panel)

Same underlying auth logic as before (`supabase.auth.signInWithOtp`/`verifyOtp`, `first_name` discriminator → `/dashboard` vs `/onboarding`, 60s resend cooldown) — only the presentation changed:
- OTP entry is now 6 individual auto-advancing digit boxes (matches the Pocket app's OTP box pattern) instead of one text input.
- Email placeholder is `you@example.com` (was `you@yourbusiness.in` — wrongly implied a business-domain-only email).
- Copy under the form: *"By continuing, you agree to Kria's Terms of Service and Privacy Policy"*, linking to the real `https://trykria.com/terms` and `https://trykria.com/privacy` pages (these already exist in `landing-page/app/terms` and `landing-page/app/privacy`).
- Also above: "Live across 8 cities" pulse header with a rotating city name + live IST clock (decorative).
- An earlier version had a rotating "activity feed" ticker (fake events like "A cafe in Pune hired 3 baristas") in this panel — **removed**, it was distracting next to the actual sign-in action. Don't re-add without a real events feed.

### Footer

Real links only — no placeholders: `https://trykria.com`, `https://trykria.com/terms`, `https://trykria.com/privacy`, `mailto:support@trykria.com`. (`kria.in` was a wrong domain used in an early draft — the real domain is `trykria.com`.)

### Copy positioning

Grid's landing copy leads with plain verbs for a non-technical Indian-employer audience ("Hire verified shift & gig staff across India") rather than cleverness, based on how WorkIndia/Apna/Gig4U/Equal pitch employers — verified/fast/no-middlemen framing tests better than abstract taglines for this audience.

## Applications Page (`/applications`) — "Command Center" Design

Global inbox with a horizontal gig chip strip on top, then a two-column applicant/profile panel below.

### Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [GigChip A ▸ 3 pending]  [GigChip B]  [GigChip C]  ───────── │  ← drag-to-scroll chips strip
├──────────────────────────┬──────────────────────────────────────┤
│  ← Applicant list (33%)  │  ← Profile panel (67%)              │
│  overflow-y-auto         │  overflow-y-auto                     │
│                          │  auto-scrolls to top on selection    │
└──────────────────────────┴──────────────────────────────────────┘
```

- **Grid column:** `style={{ gridTemplateColumns: "1fr 2fr" }}`
- **Gig chips strip:** drag-to-scroll with `dragState` ref + scroll glow indicator (lime vertical line + gradient fade when overflow exists)
- **GigChip:** pending badge (absolute positioned, `py-2 -my-2` wrapper for overflow), slot fill bar, urgency label
- **Tabs:** Pending / Accepted / All — API always called with `status=all`; tab counts derived from `useMemo` client-side filter to avoid 0-count bug
- **Applicant card:** entire card is clickable (`onClick={onView}` + cursor-pointer); selected state shows lime border; action buttons use `e.stopPropagation()`
- **Profile panel:** `ApplicantProfileModal` with `asPanel={true}` rendered inline in right column; column ref (`panelColRef`) auto-scrolls to top when selected applicant changes

### Data loading pattern

- On mount: `GET /gigs/mine` → lightweight gig summaries (N rows)
- On gig chip click: `GET /gigs/{id}/applicants?sort=&status=all` → applicants for that gig
- Sort: `momentum_desc | momentum_asc | newest | oldest` (sort control in page header)
- This scales to 1000+ applications — only the selected gig's applicants load at once

### API files

- `grid/lib/api/gigs.ts` — `listMyGigs()` → `GET /gigs/mine` → `PostedGigsResponse`
- `grid/lib/api/applicants.ts` — `listApplicants(gigId, sort, filterStatus)` with sort + status query params

### ApplicantProfileModal — `asPanel` prop

`asPanel?: boolean` enables a compact inline card mode for the right panel.

**Panel mode** (compact, natural-height card inside scrollable column):
```jsx
<div className="bg-surface-1 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
  {header}
  {/* Two-column momentum section */}
  <div className="border-b border-white/10 px-5 py-4">
    <div className="flex gap-5 items-center">
      <SkillGraph score={...} signals={signals} size={160} />  {/* left */}
      <div className="flex-1 space-y-2.5">{signal bars}</div>  {/* right */}
    </div>
  </div>
  <div className="p-5 space-y-5">{body — no internal scroll}</div>
  <div className="px-5 pb-5 flex gap-2">{natural-width buttons (px-5 py-2.5)}</div>
</div>
```

**Modal mode** (original popup, unchanged): full-height fixed overlay, `flex-1` buttons, `overflow-y-auto` body.

Sections (both modes):
1. Header: Name, verified badge, city, gigs done, applied date, status badge, X close
2. SkillGraph + signal bars (panel: side-by-side 160px; modal: stacked 260px)
3. Profile completion chips
4. Body: message → bio → work exp → education → languages → skills
5. Footer: Accept / Reject / No-Show (shown when applicable)

### Backend: `/api/v1/applicants` (global endpoint)

Key SQL gotchas:
- `ga.status::text = :status` — `application_status` is a PostgreSQL ENUM; bind params can't compare directly, must cast with `::text`
- `mp.worker_score AS momentum_score` — column is `worker_score`, not `momentum_score`
- Use distinct bind param names: `:poster_id` and `:rater_id` (same UUID value) to avoid asyncpg deduplication bug

### Backend: `/api/v1/applicants` (global endpoint)

Key SQL gotchas:
- `ga.status::text = :status` — `application_status` is a PostgreSQL ENUM; bind params can't compare directly, must cast with `::text`
- `mp.worker_score AS momentum_score` — column is `worker_score`, not `momentum_score`
- Use distinct bind param names: `:poster_id` and `:rater_id` (same UUID value) to avoid asyncpg deduplication bug

## Theming System (globals.css)

Grid supports **dark** (default) and **light** modes via a CSS custom property cascade. The active theme is set as `data-theme="dark"|"light"` on `<html>`. An inline `<script>` in `layout.tsx` reads `localStorage` before first paint to prevent flash.

```css
@theme {                      /* Tailwind v4 utility generation */
  --color-bg: #0e0e0e;
  --color-surface-1: #131313;
  --color-primary: #D4FF00;   /* lime in dark */
  --color-text: #e2e4cf;
  /* ... full palette ... */
}

:root {                       /* dark defaults — component-level tokens */
  --card-bg: #131313;  --sidebar-bg: #131313;
  --topbar-bg: rgba(14,14,14,0.82);
  --content-bg: #0e0e0e;  --input-bg: #201f1f;
  --border-color: rgba(255,255,255,0.10);
  --nav-active-bg: rgba(255,255,255,0.07);
  --nav-active-text: #D4FF00;  --nav-active-border: #D4FF00;
  --nav-inactive-text: #777575;
  --lime: #D4FF00;  --lime-on: #0e0e0e;

  /* SkillGraph canvas tokens */
  --sg-canvas-from: #1e1d1d;
  --sg-canvas-to:   #0c0c0c;
  --sg-grid:        rgba(255,255,255,0.07);
}

[data-theme="light"] {        /* Solar Flare Light overrides */
  --color-bg: #f4f5df;
  --color-surface-1: #ffffff;  /* cards = white */
  --color-primary: #536600;    /* lime → olive */
  --color-text: #1a1d10;
  --color-text-inv: #ffffff;   /* text ON olive buttons */
  --card-bg: #ffffff;  --sidebar-bg: #ffffff;
  --content-bg: #f4f5df;  --input-bg: #f8f9fa;
  --border-color: rgba(0,0,0,0.08);
  --nav-active-bg: #eef0da;    /* warm beige */
  --nav-active-text: #536600;  --nav-active-border: #536600;
  --nav-inactive-text: #757a60;
  --lime: #536600;  --lime-on: #ffffff;

  /* SkillGraph: lighter canvas for light mode */
  --sg-canvas-from: #e4e7d6;
  --sg-canvas-to:   #d8dcc6;
  --sg-grid:        rgba(0,0,0,0.09);
}
```

**Key theming rules:**
- All layout components use `style={{ backgroundColor: "var(--card-bg)" }}` etc. — never hardcoded hex
- Hardcoded Tailwind utilities (border-white/10, bg-white/5, bg-[#201f1f], bg-[#D4FF00]) have `[data-theme="light"]` CSS overrides in globals.css
- `.nav-item` CSS class: `background-color: transparent`, color from `--nav-inactive-text`
- `.nav-item-active` CSS class: beige bg + olive text + olive right border
- `--lime` / `--lime-on` tokens: always use these for lime CTA buttons so light mode gets olive automatically
- **SVG theming:** SVG `fill`/`stroke` attributes don't respond to CSS class changes, but `style={{ stopColor: "var(--sg-canvas-from)" }}` on `<stop>` elements DOES resolve. Use `style` props, not attributes, for CSS var references in SVG.

## SkillGraph (grid/components/ui/SkillGraph.tsx)

Pure SVG — no react-native-svg dependency. Works in browser.

- `useId()` → unique filter IDs per instance (prevents SVG filter bleeding across multiple graphs on page)
- `radialGradient` with `style={{ stopColor: "var(--sg-canvas-from/to)" }}` on `<stop>` elements — CSS vars resolve on SVG `style` attribute
- Grid rings and spokes use `style={{ stroke: "var(--sg-grid)" }}`
- Glow via `feGaussianBlur + feMerge` filter applied to data polygon + dots
- `maxR = size * 0.36` (expanded since labels were removed)
- No outer rim circle (removed — didn't fit the design)
- No axis labels in SVG (replaced by HTML signal legend below chart)
- Props: `score`, `signals: BreakdownItem[]`, `size?: number` (default 220)

## Sidebar

- Logo: "kria" in Comfortaa 700 (`var(--font-comfortaa)`), `text-primary` color; "Grid" label in text-text-muted
- **Nav items in order:** Dashboard, Gigs, Events, Applications, Analytics, Subscription
- Bottom: ThemeToggle only (Sign Out moved to TopBar dropdown)
- Profile, Settings, Sign Out **removed from sidebar** — all live in TopBar dropdown

## TopBar Profile Dropdown

The name + avatar block in the top-right is now a clickable button with a `ChevronDown` icon. Click opens a dropdown:

```
┌────────────────────┐
│ 👤 Profile         │
│ ⚙️ Settings        │
│ ❓ Help & Support  │
│────────────────────│
│ 🚪 Sign Out        │  ← red label
└────────────────────┘
```

- **Profile** → `router.push("/profile")`
- **Settings** → `router.push("/settings")`
- **Help & Support** → `router.push("/support")` (HelpCircle icon, between Settings and divider)
- **Sign Out** → `supabase.auth.signOut()` + `router.replace("/login")`
- Click outside closes dropdown (`mousedown` listener on `document`)
- `useRef` on the wrapper + `useEffect` for outside-click detection

**File:** `components/layout/TopBar.tsx`

## Auth Flow

Email OTP (no SMS/Twilio required):

1. `/login` → host enters email
2. `supabase.auth.signInWithOtp({ email })` sends 6-digit OTP via email
3. OTP auto-submits at 6 digits; 60s resend cooldown
4. After verify: check `profiles.first_name` — set → `/dashboard`; null/missing → `/onboarding`
5. `/onboarding` → Step 1 (first/last name required) → Step 2 (city/state, skippable) → `profiles.upsert` → `/dashboard`
6. Dashboard layout guard: no profile OR `first_name` null → `/onboarding`

### Onboarding Bypass Fix (2026-06-21)

**Root cause:** `handle_new_user` DB trigger auto-creates a stub profile (`first_name = NULL`, `display_name = 'New User'`) on every `auth.users` INSERT. Migration 0024 disabled this for local dev but production Supabase Cloud still runs the old trigger.

**Fix:** All three profile checks now use `first_name` as the discriminator (trigger never sets it; onboarding always requires it):

| File | Old | New |
|------|-----|-----|
| `login/page.tsx` | `select("id")` → `profile ? /dashboard : /onboarding` | `select("first_name")` → `profile?.first_name ? /dashboard : /onboarding` |
| `onboarding/page.tsx` | `if (profile) → /dashboard` | `if (profile?.first_name) → /dashboard` |
| `_DashboardLayoutClient.tsx` | `if (!profileData) → /onboarding` | `if (!profileData \|\| !profileData.first_name) → /onboarding` |

OLD STEP (removed):
2. `supabase.auth.signInWithOtp({ email })` — Supabase sends a 6-digit OTP via built-in email service. Handles sign-in and sign-up in one call (`shouldCreateUser: true` by default).
3. OTP step → `supabase.auth.verifyOtp({ email, token, type: "email" })`
4. After verify: check if profile row exists for user
   - Profile exists → `router.replace("/dashboard")` (returning host)
   - No profile → name step (new host)
5. Name step → `supabase.from("profiles").upsert({ id, first_name, last_name, display_name })` — user is authenticated so RLS passes. No `phone` field set for email-auth hosts.
6. `(dashboard)/layout.tsx` — auth guard on every dashboard page (server component with `force-dynamic`, client logic in `_DashboardLayoutClient.tsx`)

**Email OTP template:** Supabase Dashboard → Authentication → Email → Templates → Magic link → body must use `{{ .Token }}` to show the 6-digit code (not `{{ .ConfirmationURL }}`).

**Supabase URL config required:** Authentication → URL Configuration → Site URL = `https://grid.trykria.com`; Redirect URLs includes `https://grid.trykria.com/**`.

**Why phone OTP was abandoned:** Supabase Cloud requires Twilio for phone OTP. Twilio not yet configured. Email OTP works with Supabase's built-in email service, no external provider needed.

**Why email/password was removed (original):** Old approach used `signUp({email: "91{phone}@kriya.dev"})` which hit Supabase email rate limits and caused RLS failures (no session after signUp with email confirmation enabled). Also rejected `918148095499@kriya.dev` format as invalid email in production.

## Gig Post Wizard (4 Steps)

1. Category (emoji-grouped role picker — see `features/gigs.md` Categories)
2. **Basic Info** (title, company, description, slots, pay, **cover photo picker (2026-08-05)**)
3. Schedule (venue, city, date, shift times, report time, geocoding fetch button)
4. Requirements (gender preference, dress code, languages, experience, note) + review summary

Submits via `supabase.from("gigs").insert(...)` → redirect to `/gigs/${data.id}`. Then fires `generateGigCover(data.id, cover_photo)` fire-and-forget so cover renders in the background.

### Cover Photo Upload (2026-08-05)

Basic Info step now has an optional cover photo picker.
- Accepts JPEG / PNG / WebP, max 10 MB (matches backend `_COVER_MAX_BYTES` in `routers/gigs.py`)
- Preview thumbnail (aspect 4:5, ~96×120px) + Change / Remove buttons after selection
- File input hidden, triggered by dashed-border "Upload a cover photo" button when empty
- Passes to `generateGigCover(data.id, form.cover_photo ?? undefined)` — compositor renders it into its photo slot instead of just template art
- No new dependencies — uses native `<input type="file">` and `URL.createObjectURL` for preview
- Form state has `cover_photo: File | null` + `cover_photo_preview: string | null`. `handleRemovePhoto` revokes the preview URL to free memory.

## Expired Gigs & Events (2026-08-05)

Both list + detail pages show a single "Expired" badge (via `ExpiredBadge`) instead of "Open + Expired" side-by-side when a gig/event is past its date.

**Expiry helper (client-side, day-granularity):**
```typescript
function isExpired(gig: Gig): boolean {
  if (gig.status !== "open" && gig.status !== "in_progress") return false;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(gig.event_end_date || gig.event_date) < today;
}
```
Defined inline in `gigs/page.tsx`, `gigs/[id]/page.tsx`, `events/page.tsx`, `events/[id]/page.tsx`. Event JobCard receives `eventExpired` prop from parent (event summary doesn't include `event_end_date`, so events list uses day-granularity `event_date` only).

**Pause/resume disabled on expired gigs:**
- Client: `{(gig.status === "open" || gig.status === "in_progress") && !expired && <button>Pause</button>}`
- Backend: `pause_gig` and `unpause_gig` in `routers/gigs.py` check `is_expired` (computed in `_assert_gig_owner` via `COALESCE(event_end_date, event_date) < (NOW() AT TIME ZONE 'Asia/Kolkata')::date`) and return 400. Belt-and-suspenders against stale UI or direct curl bypass.

## OTP Check-in (Gig Detail)

The `assignment_otp` field on a gig is a 4-digit code shared across all accepted Runners. Displayed in a lime-bordered card on the gig detail page. Runners enter this code in the mobile app to check in.

Source: `accepted.find(a => a.assignment_otp)?.assignment_otp`

## Next.js 16 Params Pattern

```typescript
// Use `use(params)` to unwrap params in Next.js 16 client components
import { use } from "react";
export default function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  ...
}
```

## Environment Variables

```
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxx  # new Supabase key format (replaces anon key)
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

**Note:** FastAPI maps to host port 8000 (not 8001). `.env.local.example` has correct value.

## Production Deployment

- **URL:** `grid.trykria.com` (Vercel)
- **Deploy:** `cd frontend/grid && vercel --prod` (from EC2 after `git pull`)
- **Vercel env vars:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_xxx`), `NEXT_PUBLIC_API_URL=https://api.trykria.com/api/v1`
- **DNS:** CNAME `grid` → `cname.vercel-dns.com` added in Vercel DNS panel (since trykria.com DNS is Vercel-managed)
- **Supabase Auth:** disable "Confirm email" in Authentication → Sign In / Providers → Email; set Site URL to `https://grid.trykria.com` in URL Configuration
- **Static prerender guard:** `app/login/layout.tsx` and `app/auth/confirm/layout.tsx` both export `export const dynamic = "force-dynamic"` — prevents build-time crash when env vars are missing

## Supabase Client (`lib/supabase.ts`)

Simple `createClient()` at module level — no lazy init, no Proxy. Env vars must be set in Vercel before building (NEXT_PUBLIC_* vars are embedded at build time). The Proxy approach was tried and reverted — `supabase.from()` loses `this` binding through a Proxy, causing silent runtime crashes.
