---
name: Changelog
description: Session-by-session feature and architecture log
type: project
---

# Changelog

## 2026-08-07 — Home Revamp (Pocket, earnings-first)

Full Home redesign following a code audit + web research on DoorDash / Uber Driver / Instacart. Three problems the old Home had: no money signal, no primary CTA, home collapses for new runners. Full doc: `features/home_revamp.md`.

**New layout (top → bottom):**
1. Top bar (unchanged)
2. **EarningsCard** — hero position. `₹2,400 this week · 3 gigs · Payout Friday`. Trend chip (`+18% vs last week`). Brand-new runner state: "Ready to earn?" invite.
3. **PrimaryCTA** — big lime "Find gigs nearby" with social proof: `12 new near Bengaluru today`.
4. Hot near you (unchanged)
5. **MomentumChipRow** — Momentum shrunk from full hero to compact row: score badge + band pill + progress bar + streak emoji. Full experience one tap away on Arena.
6. **GrowthNudge** — dynamic single-item nudge with priority: Verify ID → Complete profile → Next band (within 150 pts) → Streak (≥3 days). Returns null if none apply.
7. Badges + Recent gigs (unchanged, still conditional)

Pull-to-refresh added.

**Backend:**
- New `/api/v1/earnings/summary` endpoint at `routers/earnings.py`. Aggregates completed `gig_assignments` × `gigs.pay_amount`. Week starts Monday IST. Next-payout date hardcoded to next Friday (no payouts table yet).

**New Pocket files:**
- `lib/api/earnings.ts`, `stores/earningsStore.ts` (5-min TTL)
- `components/home/EarningsCard.tsx`
- `components/home/PrimaryCTA.tsx`
- `components/home/MomentumChipRow.tsx`
- `components/home/GrowthNudge.tsx`

**Deploy order:** backend first (Pocket's earnings store fetches on mount), then Pocket EAS update. `BandHeroCard` + `HeroSkeleton` still defined in home.tsx but no longer rendered — safe to delete in a hygiene commit.

---

## 2026-08-07 — Gig Cover v2.1 (taller canvas + bigger fonts)

Same day as v2 rewrite. Portrait canvas grew from **1080×1350 (4:5)** to **1080×1620 (2:3)** — card is ~20 % taller in the Explore deck.

Font bumps for attention:
- Title 60 → **84 pt**
- Pay 52 → **76 pt**
- Venue / host 28 → 36 pt / 24 → 32 pt
- Chip auto-scales from `chip_h` (~26 pt now)

Client-side `aspectRatio` bumped to `2/3` on both `coverImage` and `fallbackHero` in `JobCard.tsx`. FallbackHero fonts scaled up proportionally (title 26 → 34, pay 28 → 34, watermark 62 → 78) so the no-cover branch matches.

Square canvas untouched — mostly used for 40 px thumbnails and OG previews, big fonts don't help.

**Deploy note:** the bulk regen script (`app.scripts.regenerate_covers`) MUST run after the backend rebuild — old 4:5 covers will letterbox on the new 2:3 client until regenerated.

---

## 2026-08-07 — Gig Cover Compositor v2 (fully programmatic)

**Root cause of the frame overlap:** the compositor loaded `foreground.png` per category — a rectangular border + triangle corner mark baked around the icon area. Its bottom edge sat ~20 px above the title anchor and overlapped the title text on many device sizes (user screenshot 2026-08-06 confirmed).

**Fix:** rewrote `backend/api/app/covers/compositor.py` + `manifest.py` to be **100 % programmatic** — no PNG assets loaded at all. New render pipeline:
1. Obsidian base
2. Two accent-colour Gaussian-blurred glow blobs in the hero zone (upper 55–60 %)
3. Host photo (if uploaded) or programmatic category icon centred in hero
4. Vertical fade transition into text zone
5. Text zone: category chip → title → pay → venue+city → host name, with generous spacing

**Six new programmatic icons** drawn in the compositor: sparkle (event), plate (hospitality), waveform (tech), camera (media), microphone (stage), bolt (other). All stroke-based, consistent weight.

**Bulk regen script** at `backend/api/app/scripts/regenerate_covers.py`. Run once on EC2 after deploy to refresh existing gigs' covers:
```bash
docker exec kriya_kria-api_1 python -m app.scripts.regenerate_covers
```

Old asset PNGs at `backend/api/app/covers/assets/{slug}/*.png` are orphaned — safe to delete in a hygiene commit. Old generation scripts at `frontend/master-assets/generate_*.py` are historical, do not run.

Full doc: `features/gig_cover_images.md` under "v2 — 2026-08-07 rewrite".

---

## 2026-08-05 — Reviewer Bug Fixes + Gig Card Upgrade + App-Wide Design Polish

Three back-to-back sessions in one day. Massive diff across Pocket / Grid / backend / landing-page. Full context in `product/status.md`.

### Session 1 — Reviewer bugs

- **Momentum inconsistency** (Pocket applicants sheet): `frontend/pocket/app/(main)/gig/applicants/[gigId].tsx:377` read `(p as any).worker_momentum ?? 500` — nonexistent field, always fell back to hardcoded 500. Fixed to `item.momentum_score ?? 0`. Grid was already correct. Added `momentum_score: number | null` to Pocket's `ApplicantListItem` interface.
- **Expired gigs shown in Pocket Explore + Home**: backend `_fetch_open_gigs()` filtered `event_date >= CURRENT_DATE` only, missing gigs ending earlier today. Fixed to `(event_date::timestamp + shift_end_time::time) > (NOW() AT TIME ZONE 'Asia/Kolkata')`. **CRITICAL trap caught:** the fix was initially applied to `backend/api/app/services/matching.py` — **dead code!** The live path is `backend/api/app/recommendations/engine.py` (imported by `routers/gigs.py`). Would have deployed with the bug still present. Both files got the fix in the end (belt-and-suspenders); services file should be deleted in a hygiene commit. See `features/recommendations.md` warning.
- **Pocket client-side expiry filters** to match backend: Space `isUpcoming` now compares against `now` (not midnight-today) and uses `shift_end_time`. Home `activeApplications` memo filters expired applications.
- **Grid pause/resume worked on expired gigs**: UI hides pause button when `expired`; backend `pause_gig`/`unpause_gig` in `routers/gigs.py` return 400. `_assert_gig_owner` selects `is_expired` computed via `COALESCE(event_end_date, event_date) < (NOW() AT TIME ZONE 'Asia/Kolkata')::date`.
- **Grid showed "Open" for expired gigs/events**: status badge now shows single `<ExpiredBadge>` instead of appending "Open + Expired" side-by-side. Applied to `gigs/page.tsx`, `gigs/[id]/page.tsx`, `events/page.tsx`, `events/[id]/page.tsx` (event JobCard receives `eventExpired` prop from parent).

### Session 2 — Gig Card Upgrade (Phase 1 + Phase 2)

Full anatomy in `features/gig_card.md`.

**Phase 1 — Rich card overlays:**
- Backend: `HostSummary` Pydantic model (id, display_name, avatar_url, is_verified, poster_reputation). `_fetch_host_summaries()` in `recommendations/engine.py` batch-fetches host profiles alongside momentum scores. Populates new `ScoredGig.host` field.
- Frontend: `HostSummary` type in `lib/api/gigs.ts`. `gigStore` gets `hosts: Record<posterId, HostSummary>` map (parallel to `posterScores`), populated by `fetchGigs`/`fetchMoreGigs`. New `fetchHost(posterId)` action for cold-load hydration (Supabase profiles select).
- New component: `HostAvatarChip.tsx` — 32px avatar (or initial), verified-blue check overlay, star rating chip when `poster_reputation != null`.
- Inline in `JobCard.tsx`: `SpotsChipOverlay` (pulses ≤3 spots, amber→coral escalation), `TimeToStartPill` (renders only when shift within 24h).
- Overlay stack: host chip bottom-left, momentum+boost+spots top-right, time pill top-left.
- Explore + `SwipeableJobCard` plumb the `host` prop through to `JobCard`.

**Phase 2 — Deck feel:**
- Deck depth: 2 peek cards render behind the front `SwipeableJobCard` (scale 0.96/opacity 0.65 and scale 0.92/opacity 0.35, translateY offsets). `deckCenter` becomes `position: relative`.
- Threshold-crossing haptics: `Haptics.selectionAsync()` fires the moment drag crosses apply/nav commit line, via a listener on `Animated.ValueXY` position. Refs (`applyArmed`, `rightArmed`, `leftArmed`) prevent spam.
- Celebratory apply overlay: icon springs from 0.6 → 1.15 as user commits, backed by scaling white radial glow. Icon bumped 52 → 64px.

### Session 3 — App-Wide Design Overhaul

Following a 4-agent design audit across auth/onboarding, main tabs, identity surfaces, and detail flows.

**Phase 3a — Fallback card redesign** (`JobCard.tsx`):
- New `<FallbackHero>` inline component. Full 4:5 aspect, category-color gradient bg, huge tinted watermark of category label, bottom text zone mirroring compositor's baked layout (chip → title → pay → venue). Same overlay positions as cover branch — both look intentional.

**Phase 3b — Grid host-photo upload:**
- Basic Info step of `gigs/new/page.tsx` now has optional cover photo picker. JPEG/PNG/WebP, 10 MB cap, preview + Change/Remove. Uploaded photo passed to `generateGigCover(id, photo)` — compositor renders it into the photo slot.

**PKG-D — Fit & Finish:**
- `styles.actionText` bugfix in applicants screen — the 5-week-old open issue. Added missing style (fontSize 14, fontWeight 700, fontFamily SpaceGrotesk_700Bold).
- Skeleton loaders replace bare `<ActivityIndicator>` on gig detail, applicants list, event detail.
- Empty state copy rewritten: applicants "Waiting for applicants…" + subtext, Space "Nothing on the calendar" / "No track record yet".

**PKG-A — Trust surfaces:**
- Host chip on gig detail — reads from `hosts[gig.poster_id]`. Store's `fetchHost` populates via Supabase profiles select on cold-load.

**PKG-B — Celebrations:**
- Streak flame on Home hero (`StreakStat` component) — 🔥 emoji pulses (opacity 0.7↔1.0, 900ms each) + amber pill when streak > 0. "Start a streak" prompt at 0.
- Band level-up celebration on Arena — detects mid-session promotion via `prevBandRef` + `BAND_ORDER` comparison. `<LevelUpModal>` with band-color halo pulse, spring-in icon, "PROMOTED · You're now Trusted", success haptic. First load never fires (baseline seeding only).
- Post-OTP check-in celebration in Space GigDetailSheet — 1.5s full-sheet overlay: lime check ring + halo + "You're checked in!" + success haptic. Then `onOtpSuccess` proceeds to rating flow.

**PKG-C — First impression:**
- New `app/(auth)/intro.tsx` — 3-slide swipeable pre-login carousel (What is Kria / Momentum / Verify). Skip + Get Started, progress dots. Persists `intro_seen_v1` flag in SecureStore. Auth gate updated to send new visitors to `/(auth)/intro` first. Auto-skip via `useEffect` for returning users.
- Login trust row — Secure OTP · Verified hosts · Paid weekly in lime-tinted card above terms footer. Placeholder `9876543210` → `98XXXX1234`.

**Profile — Career Passport:**
- History cards: removed 0.85 opacity fade; added lime checkmark dot for `completed` and coral X dot for `no_show`. Past work reads as accomplishment.
- Profile tab surfaced: bio (3-line), skills chips (top 5 + overflow), streak stat with 🔥 (was 2 stats, now 3). Share Profile quick box → native `Share.share` with `https://trykria.com/p/${slug}`.
- **Migration `0032_public_profile_slug.py`** — `profiles.public_slug TEXT UNIQUE`, backfilled as `{firstname_alphanumeric}-{last 6 chars of id}`, indexed.
- `/api/v1/public/runners/{slug}` no-auth endpoint at `backend/api/app/routers/public.py`. Returns curated public fields only (never phone/email/DOB). Registered in `main.py`.
- `landing-page/app/p/[slug]/page.tsx` — server-rendered profile page at trykria.com/p/{slug}. Band-color hero, avatar, verified check, stats (Gigs / Streak with 🔥 / Momentum), skills chips, languages chips, "Discover Kria" CTA. OG meta for WhatsApp previews. 5-min ISR revalidation. Custom `not-found.tsx`.

Full feature docs: `features/gig_card.md`, `features/public_profile.md`, `apps/mobile/screens.md` (updated per screen).

---

## 2026-07-20 — Grid Login Page Redesign (Scroll-Story Landing)

### Grid: `/login` rebuilt as landing page + sign-in

Grid had no marketing landing page — `/login` was a generic split-screen sign-in form with zero explanation of what Grid does. Rebuilt from scratch as a scroll-story landing page with a sticky sign-in panel. Full design writeup in `memory/apps/grid/overview.md` under "Login / Landing Page".

**Origin:** Design was prototyped in Claude Design (`claude.ai/design`) and imported via the `DesignSync` MCP tool (`get_project`/`list_files`/`get_file` — read-only here, no `finalize_plan`/`write_files` needed since this was a one-way pull into the codebase, not a synced component library). The `.dc.html` source uses a design-tool-only template syntax (`x-dc`, `sc-for`, `sc-if`, a `support.js` runtime) — hand-translated into plain React/Next.js, not shippable as-is.

**Structure:** Two-column CSS Grid — scrollable story column (header, progress rail, 7 scenes, footer) + sticky right-side sign-in card. All inline styles + one `<style>` block (no Tailwind, unlike rest of Grid).

**Bugs found and fixed during iteration (all now documented as gotchas in `apps/grid/overview.md`):**
1. **Scroll-reveal content stuck invisible** — `IntersectionObserver` was created inside the parent's `useEffect`, but child `Reveal` components register in their own mount effect, which fires *before* the parent's (React fires child effects before parent effects). Every registration silently no-op'd. Fixed by constructing the observer synchronously during render instead.
2. **Sticky rail nav not sticking** — an `overflow: hidden` safety-guard added to the rail column (meant to prevent label text overflow) inadvertently became the sticky containing block for its child, breaking `position: sticky` entirely. Removed; used `white-space: nowrap` instead.
3. **Progress rail floated over blank content on laptop widths** — rail visibility toggled at Tailwind's `md` (768px) while the two-column layout only collapsed at 1023px, so any window in that range showed a single-column mobile layout with the rail still rendered beside it. Unified both to the same 1024px breakpoint.
4. **Big empty gap on wide screens** — scene content had a fixed `max-width` anchored to the left, so excess width on large monitors piled up entirely on the right. Fixed by wrapping the article (not the header/footer) in a centered `max-width: 900px` container.

**Content additions (design review pass):**
- "Why Grid" before/after scene (WhatsApp groups/no-shows vs. verified history/OTP check-in)
- Stylized browser-chrome mockup of the real dashboard in the closing scene (no live screenshot — chose illustration over running the dev server with seeded data)
- 6-band Momentum trust-score legend inline in the Applicants scene
- Two real secondary CTAs ("See how it works" scroll-jump, "Talk to us" → `mailto:support@trykria.com`) replacing a passive scroll hint
- Real footer links (`trykria.com`, `/terms`, `/privacy`, `mailto:support@trykria.com`) replacing `#` placeholders and a wrong `kria.in` domain
- Removed a rotating fake "activity feed" ticker from the sign-in panel — read as distracting/gimmicky next to the actual sign-in action
- Terms/Privacy acceptance notice added under the sign-in form, linking to the real pages in `landing-page/app/terms` and `landing-page/app/privacy`
- Email placeholder changed from `you@yourbusiness.in` → `you@example.com` (any email works, not just business domains)

**Copy direction:** researched how India-focused gig/blue-collar hiring platforms (WorkIndia, Apna, Gig4U, Equal) pitch employers — plain verbs ("hire", "verified", "fast", "no middlemen") outperform abstract taglines for this non-technical employer audience. Headline changed from "Post a gig. Good people show up." to "Hire verified shift & gig staff across India."

**Deliberately skipped:** a real social-proof/stats section — no real usage numbers exist pre-launch, and fabricating them was ruled out.

---

## 2026-06-21 — Admin Dashboard Phase 1 Complete + Help & Support + Supabase Key Updates

### Admin Dashboard — Phase 1 shipped

Full admin app built at `frontend/admin/`, deployed to `admin.trykria.com` (Vercel).

**App scaffold (Dark Ops design):**
- `#080808` background, `#111111`/`#161616` surfaces
- Space Grotesk (UI) + JetBrains Mono (data/mono)
- CSS keyframes: `pulse-dot`, `glow-amber`, `glow-lime`, `radar-spin`, `slide-in-right`, `blink-border`
- Band CSS vars: `--band-newcomer` through `--band-legend`

**Auth:**
- Email OTP login → checks `is_admin` on profiles → denies non-admins with message before session creation
- `_AdminLayoutClient.tsx` double-check on every page load using `getUser()` (not `getSession()`)
- Admin email: `coreofkria@gmail.com` (inserted via SQL editor with `display_name` — NOT NULL constraint)
- `require_admin` FastAPI dep in `auth/middleware.py`; `AdminUser` type alias

**Pages:**
- **Overview:** live clock, system health strip (pings API + DB every 30s), bento metric tiles with `requestAnimationFrame` count-up animation, runner/host split bar, quick links
- **Users:** search + role filter, band-colored 3px left border, `ShieldCheck` for verified, slide-in drawer with momentum bar + suspend/reactivate
- **Support Tickets:** split panel (380px list / flex detail), category-colored chips, status filter tabs, resolve via FastAPI (sends Resend email to user), in-progress action
- **Verification Queue:** 4-column kanban, live `useTickingAge` counters, `blink-border` animation on processing cards
- **Stubs (Phase 2/3):** Gigs, Momentum, Subscriptions, System Health

**Components:** `IconRail`, `Sparkline` (pure SVG polyline), `MetricTile` (count-up + glow states)

**Backend:**
- `routers/admin.py`: `GET /admin/support/tickets`, `PATCH /admin/support/tickets/{id}` (sends Resend resolve email), `GET /admin/stats/overview`
- `routers/support.py`: `POST /support/submit` — inserts to `support_queries`, emails `coreofkria@gmail.com`, sends ack to submitter
- Both routers registered in `main.py`
- CORS: `admin.trykria.com` added to `_PROD_ORIGINS`; `localhost:3002` to `_DEV_ORIGINS`

**Migration 0030** (`backend/api/alembic/versions/0030_admin_support.py`):
- `ALTER TABLE profiles ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE`
- `CREATE TABLE support_queries` with indexes + auto-update trigger
- Applied via `docker exec -it kria-api bash → alembic upgrade head` on EC2

**Supabase SQL to grant admin (documented for future admins):**
```sql
INSERT INTO profiles (id, display_name, is_admin)
SELECT id, 'Admin', TRUE FROM auth.users WHERE email = 'coreofkria@gmail.com'
ON CONFLICT (id) DO UPDATE SET is_admin = TRUE;
```
Note: `display_name` is NOT NULL on profiles — must be included in INSERT.

### Grid: Help & Support page

`app/(dashboard)/support/page.tsx` — two tabs: FAQ + My Tickets.
- **FAQ tab:** 4 accordion sections (Getting Started, Gigs & Applications, Momentum & Ratings, Account & Billing), `FaqItem` component, chevron rotation
- **My Tickets tab:** `TicketRow` expandable cards — shows status chip, full message, "Response from Kria" (admin_note) when resolved. Tab badge shows ticket count. Auto-fetches on mount; refreshes after submit.
- Query form (bottom of FAQ tab): 7 categories (`account | gigs | checkin | payments | runners | technical | other`), subject (120 char), message (2000 char), character counter
- Success state: confirmation + "View my tickets" link + "Submit another"
- Submits via `POST /api/v1/support/submit` (requires auth — stores `user_id`)
- `lib/api/support.ts` — `submitSupportQuery()`, `getMyTickets()`, `MyTicket` interface

TopBar dropdown updated: "Help & Support" (HelpCircle icon) added between Settings and Sign Out divider.

**Backend changes:**
- `POST /support/submit` now stores `user_id` in INSERT
- `GET /support/my-tickets` returns tickets matching `user_id = :uid OR (user_id IS NULL AND email = profile.email)` — email fallback handles old tickets created before `user_id` was stored. Uses `uid` + `uid2` as distinct asyncpg param names (same value).

**Build fixes (Grid):**
- `app/login/layout.tsx` — `export const dynamic = "force-dynamic"` to prevent static prerender crash
- `app/auth/confirm/layout.tsx` — same fix; these pages call `createClient()` at module load which throws when env vars are absent at build time

### Supabase key naming update

Supabase introduced new non-JWT key format:
- `sb_publishable_...` → replaces `anon` key → frontend use
- `sb_secret_...` → replaces `service_role` key → backend only, never in frontend

**Admin app:** uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new name).
**Grid app:** migrated to `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — `lib/supabase.ts` updated, Vercel env var added.

`getUser()` used instead of `getSession()` in auth guard files (`_AdminLayoutClient.tsx`, `_DashboardLayoutClient.tsx`) — `getUser()` validates JWT server-side; `getSession()` only reads local storage. `getSession()` kept in API token-forwarding helpers (no network overhead needed there).

### Vercel deployment (Admin)

- Root directory: `frontend/admin`
- Domain: `admin.trykria.com` (CNAME → `cname.vercel-dns.com`)
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_API_URL=https://api.trykria.com/api/v1`
- Backend rebuilt on EC2 to pick up CORS change: `docker compose ... up -d --build kria-api`

---

## 2026-06-21 — Grid Nav Overhaul + Onboarding Bypass Fix + Admin Dashboard Plan

### Grid: Sidebar Reorder + TopBar Profile Dropdown

**Sidebar nav order changed** to: Dashboard → Gigs → Events → Applications → Analytics → Subscription.

**Removed from sidebar:** Profile, Settings, Sign Out.

**TopBar** (`components/layout/TopBar.tsx`): the name/avatar block is now a clickable dropdown button (`ChevronDown` icon). Dropdown contains:
- Profile → `/profile`
- Settings → `/settings`
- ── divider ──
- Sign Out (red label) → `supabase.auth.signOut()` + `/login`

Click-outside detection via `useRef` + `useEffect` + `document.addEventListener("mousedown", ...)`.

Removed the standalone Settings icon button from TopBar (now in dropdown).

### Grid: Onboarding Bypass Fix

**Root cause:** `handle_new_user` DB trigger creates a stub profile with `first_name = NULL` on every signup. Migration 0024 disabled this locally but Supabase Cloud production still fires the old trigger. Login page found the stub row and routed to `/dashboard` bypassing onboarding.

**Fix — three-layer defense using `first_name` as discriminator:**
- `login/page.tsx`: `select("first_name")` → route on `profile?.first_name` not just profile existence
- `onboarding/page.tsx`: `if (profile?.first_name)` redirect → `/dashboard` (not just `if (profile)`)
- `_DashboardLayoutClient.tsx`: `if (!profileData || !profileData.first_name)` → `/onboarding`

`first_name` is reliable: trigger never sets it, onboarding always requires it.

### Admin Dashboard: Architecture Plan Finalized

Full plan documented in `memory/apps/admin/plan.md`. Build tracker in `memory/apps/admin/progress.md`.

**Key decisions:**
- Separate Next.js app at `frontend/admin/` (`admin.trykria.com`)
- Auth: `is_admin BOOLEAN DEFAULT FALSE` on profiles + `require_admin` FastAPI dep
- Sections: Overview, Users, Gigs, Verification Queue, Support Tickets, Momentum, Subscriptions, System Health
- Phase 1 (next): scaffold + auth + overview + users + support tickets
- Phase 2: verification queue + gigs management
- Phase 3: momentum audit + subscriptions + system health

### Help & Support: Plan Finalized

`/support` page in Grid (linked from TopBar dropdown). Full plan in `memory/features/help_support.md`.

**Key decisions:**
- FAQ accordion (hardcoded, 5 groups)
- Categorized query form (7 categories: Gig Posting, Runner & Applications, Payments & Billing, Account & Profile, Bug Report, Feature Request, Other)
- `support_queries` table (migration 0030 alongside `is_admin`)
- FastAPI submit endpoint: insert to DB + Resend notification to admin inbox
- Admin resolves via Admin Dashboard → sends Resend email to host with note

---

## 2026-06-20 — Pocket Performance Fixes + App Icon + Fast2SMS SMS Hook

### Mobile: Performance Fixes (Samsung M30s)

Two root causes identified and fixed:

**`getUser()` → `getSession()` in gigStore:**  
`supabase.auth.getUser()` makes a server-side HTTP roundtrip to validate the JWT; `getSession()` reads from AsyncStorage (no network). Replaced in `fetchMyPostedGigs`, `fetchMyApplications`, and `applyToGig` in `frontend/pocket/stores/gigStore.ts`.

**GPS blocking initial gig fetch:**  
`Location.getCurrentPositionAsync()` can take 2–10s on cold start. Both `home.tsx` and `explore.tsx` now fire gig API calls immediately without GPS, then resolve location in a background `async IIFE` and re-fetch once coordinates are available. `Location.getLastKnownPositionAsync()` tried first (instant) before falling back to `getCurrentPositionAsync({ accuracy: Low })`.

### Mobile: Android Edge-to-Edge Safe Area Fix

**Root cause:** Expo SDK 54 enables edge-to-edge by default on Android. On Samsung devices `useSafeAreaInsets()` can return `{top:0}` on initial render.

**Fixes applied:**
- `app/_layout.tsx` — wrapped everything in `SafeAreaProvider` as outermost element
- `app/(main)/_layout.tsx` — added `headerStatusBarHeight: Platform.OS === "android" ? RNStatusBar.currentHeight ?? 24 : undefined` to gig stack screens
- `components/ui/StickyFooter.tsx` — bumped min bottom padding 16 → 20px

### Mobile + Grid: Kria Logo Integration

**Source:** `frontend/pocket/assets/logo.svg` (SVG with dark rect + lime triangle)

**Assets regenerated with ImageMagick:**
- `assets/icon.png` (1024×1024) — full logo on dark bg; Play Store / App Store icon
- `assets/adaptive-icon.png` (1024×1024, transparent) — triangle only on transparent bg; Android adaptive icon (`backgroundColor: "#0e0e0e"` in app.json)
- `assets/splash.png` (1284×2778) — logo centred on `#0B0F0A` bg

**Grid:**
- `components/ui/KriaLogo.tsx` (new) — inline SVG, triangle uses `currentColor` so it inherits CSS color (lime in dark, olive in light)
- `components/layout/Sidebar.tsx` — logo mark + "kria" + "Grid" sub-label in sidebar header
- `app/login/page.tsx` — `KriaLogo` icon next to login kicker
- `public/logo.svg` — copied for browser favicon

### Fast2SMS SMS Hook (OTP delivery)

Replaced Twilio config with a GoTrue SMS hook pattern.

**Architecture:** GoTrue (in Docker) calls `POST /api/v1/sms/hook` on `kria-api` instead of a real SMS provider. The hook verifies a standard-webhooks HMAC-SHA256 signature then forwards the OTP to Fast2SMS.

**New files:**
- `backend/api/app/routers/sms.py` — signature verification + Fast2SMS call (`POST https://www.fast2sms.com/dev/otp/send`, header `authorization: <api_key>`, body `{ mobile, otp_id, otp }`)

**Modified:**
- `backend/api/app/config/__init__.py` — added `fast2sms_api_key`, `fast2sms_otp_id`, `gotrue_hook_secret`
- `backend/api/app/main.py` — `sms.router` registered
- `docker-compose.yml` — replaced Twilio vars with GoTrue hook env vars: `GOTRUE_HOOK_SEND_SMS_ENABLED`, `GOTRUE_HOOK_SEND_SMS_URI`, `GOTRUE_HOOK_SEND_SMS_SECRETS`
- `.env.example` — Twilio section replaced with Fast2SMS + GoTrue hook documentation

**Phone normalisation:** GoTrue delivers E.164 (`+91XXXXXXXXXX`). Fast2SMS expects bare 10-digit mobile: `phone.lstrip("+").removeprefix("91")`.

**Dev behaviour:** `SMS_AUTOCONFIRM=true` in dev → hook never fires → Pocket uses mock OTP `123456`. Set `SMS_AUTOCONFIRM=false` + `GOTRUE_HOOK_SEND_SMS_ENABLED=true` in production with real Fast2SMS credentials.

---

## 2026-06-10 — Gig Pause + Email Notification System + Bug Fixes

### Grid: Gig Pause / Resume (full-stack)

**Migration `0027_gig_pause.py`:**
- `ALTER TABLE gigs ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT FALSE`
- Partial index: `CREATE INDEX IF NOT EXISTS idx_gigs_not_paused ON gigs (poster_id) WHERE NOT is_paused`

**Backend (`routers/gigs.py`):**
- `PostedGigSummary` + `Gig` type extended with `is_paused: bool`
- `PauseResponse` model: `{ id, is_paused, status }`
- `_assert_gig_owner()` helper — 404/403 guard reused by both endpoints
- `POST /gigs/{id}/pause` — only allowed when status is `open` or `in_progress`
- `POST /gigs/{id}/unpause` — always allowed for owner
- Recommendations engine: `AND NOT is_paused` added to runner feed query

**Frontend (`frontend/grid/`):**
- `lib/api/gigs.ts`: `pauseGig()`, `unpauseGig()` added
- `components/ui/Badge.tsx`: `PausedBadge` component added
- `app/(dashboard)/gigs/page.tsx`: Pause/Resume button per row (inline style with `#FFC83D` — avoids pale `--color-amber: #ffeb9c` CSS var)
- `app/(dashboard)/gigs/[id]/page.tsx`: Pause/Resume button in header
- `app/(dashboard)/events/[id]/page.tsx`: Pause/Resume per job card with optimistic state update

### Grid: Event Geo-tagging

**`app/(dashboard)/events/new/page.tsx`** rewritten to add geo-tagging:
- "Fetch Location" button always visible (disabled when venue/city empty — was previously hidden entirely behind conditional)
- Geocodes venue once after event creation, then calls `updateGigLocation()` for every job in the event
- `venueLat`, `venueLng`, `geocodedAddress` state; error display; "Locating…" spinner

### Bug Fixes

- **Events page NaN in Slots Filled:** `MyEventSummary` backend model was missing `slots_filled` field. Added `COALESCE(SUM(g.slots_filled), 0) AS slots_filled` to SQL + `slots_filled: int` to Pydantic model.
- **TypeScript error in onboarding:** Missing `type Step = "name" | "location"` declaration — added before component.
- **`--color-amber` too pale:** Grid theme defines `--color-amber: #ffeb9c` (light cream). All pause/amber UI uses inline `style={{ color: "#FFC83D" }}` instead of Tailwind amber classes.

### Email Notification System (full-stack)

**Migration `0028_email_tracking.py`:**
- `gigs.first_application_notified BOOLEAN NOT NULL DEFAULT FALSE`
- `gigs.last_burst_email_at TIMESTAMPTZ`
- `email_unsubscribes` table: per-user, per-category unsubscribe log with `UNIQUE(user_id, category)`
- `profile_reminder_log` table: tracks `last_sent_at` + `send_count` per host

**`backend/api/app/email/` module (new):**
- `client.py` — `send_email(to, subject, html) -> bool` wrapping Resend SDK; skips silently if `RESEND_API_KEY` not set
- `unsubscribe.py` — HMAC-SHA256 tokens; `make_token()`, `verify_token()`, `unsubscribe_url()`
- `templates.py` — on-brand HTML templates: `first_application_email()`, `burst_application_email()`, `profile_reminder_email()`, `unsubscribe_confirmation_html()`
- `notifications.py` — `notify_first_application()`, `check_and_notify_burst()`, `send_profile_reminders()`
  - Burst threshold: 5+ apps in 30 min, 6-hour cooldown per gig
  - Profile reminders: 14-day interval, max 4 sends, respects unsubscribes

**`backend/api/app/routers/email.py` (new):**
- `POST /api/v1/email/internal/application-created` — Supabase DB webhook target; secured by `X-Webhook-Secret` header
- `GET /api/v1/email/unsubscribe` — HMAC-verified one-click unsubscribe; returns styled HTML confirmation page

**`main.py` updates:**
- APScheduler (`AsyncIOScheduler`) starts in lifespan; runs `send_profile_reminders()` daily at 09:00 UTC
- Email router registered at `/api/v1/email/...`

**`requirements.txt`:** Added `resend==2.10.0`, `apscheduler==3.10.4`

**Config:** Added `resend_api_key`, `email_webhook_secret`, `app_base_url` to `Settings`

**Application creation architecture:** Confirmed Pocket mobile creates `gig_applications` directly via Supabase (no FastAPI endpoint). Email triggers hooked via Supabase Database Webhook → internal FastAPI endpoint.

### Infrastructure: Migration Connectivity Fix

EC2 has no IPv6 route to Supabase direct DB (`db.*.supabase.co:5432`). Fixed by:
- Added `MIGRATION_DATABASE_URL` env var using Supabase Session Pooler URL (`aws-0-[region].pooler.supabase.com:5432`) — resolves over IPv4
- `alembic/env.py` updated to prefer `MIGRATION_DATABASE_URL` over `DATABASE_URL` when set
- Migration 0028 applied manually via Supabase SQL editor; stamped with `INSERT INTO alembic_version`

**Prod env vars added:** `RESEND_API_KEY`, `APP_BASE_URL`, `EMAIL_WEBHOOK_SECRET`, `MIGRATION_DATABASE_URL`

---

## 2026-05-28 — Grid Auth/Onboarding Overhaul + Home Marquee Manual Scroll

### Grid: Login page rewritten
`frontend/grid/app/login/page.tsx` — simplified to clean 2-step email OTP flow:
- OTP auto-submits when all 6 digits entered (no button press)
- 60s resend cooldown with live countdown; lime color when available
- After verify: profile exists → `/dashboard`, no profile → `/onboarding`
- Removed name step from login — moved to dedicated onboarding page

### Grid: Onboarding page created (new)
`frontend/grid/app/onboarding/page.tsx` — 2-step flow for new hosts:
- Auth-guarded: no session → `/login`; existing profile → `/dashboard`
- Step 1: first name (required) + last name (optional)
- Step 2: city + state (both skippable via "Skip for now" button)
- Creates profile via `supabase.from("profiles").upsert(...)` → redirects to `/dashboard`
- Same dark glassmorphism style as login; dot step indicator

### Grid: Dashboard layout null-profile guard
`frontend/grid/app/(dashboard)/_DashboardLayoutClient.tsx`:
- After profile fetch: if `data` is null → `router.replace("/onboarding")` instead of rendering with null profile
- Also fixed: checks `mounted` before calling router to avoid memory leak on unmount

### Mobile: Home marquees — manual drag + auto-scroll
`frontend/pocket/app/(main)/(tabs)/home.tsx` — "Hot near you" + "Recent badges" marquees:
- Auto-scroll via `Animated.loop + Easing.linear + useNativeDriver: true` (native thread, no jank)
- Manual drag in both directions via `PanResponder`; modulo wrapping for seamless loop
- Auto-scroll resumes 1.5s after release, picking up from exact current position
- Vertical scroll conflict fixed: `scrollViewRef.current?.setNativeProps({ scrollEnabled: false/true })` on grab/release

---

## 2026-05-12 — Grid Production Auth Fixes + JWT JWKS Migration + Vercel Analytics

### Grid: Auth fully working on production (`grid.trykria.com`)

Root-cause chain resolved across multiple issues:

**Issue 1 — Old code deployed (email/password pattern):**
- `origin/main` still had old `signUp({email: "91{phone}@kriya.dev"})` code; phone OTP fix was only on `redesign_stich_electriclime`.
- Symptoms: "Email address invalid" + "Email not confirmed" on production.
- Fix: merged branch, redeployed Grid.

**Issue 2 — EC2 backend 401 on all authenticated requests:**
- Supabase migrated project JWT signing from legacy HS256 → ECC P-256 (ES256) asymmetric keys.
- Backend `middleware.py` was verifying with HS256 shared secret → all new tokens rejected.
- Fix: rewrote `backend/api/app/auth/middleware.py` to fetch JWKS from `{SUPABASE_URL}/auth/v1/.well-known/jwks.json`, verify with ES256 primary + HS256 legacy fallback. JWKS cached in memory, refreshed every hour via thread-safe double-checked lock.

**Issue 3 — "Unsupported phone provider":**
- Supabase Cloud requires Twilio for phone SMS OTP; Twilio not configured.
- Fix: switched Grid auth to **email OTP** (`signInWithOtp({ email })` + `verifyOtp({ email, token, type: "email" })`). No external provider needed.

**Issue 4 — Email sending magic link instead of OTP code:**
- `signInWithOtp({ email })` uses Magic link template by default.
- Fix: updated template in Supabase Dashboard → Authentication → Email → Templates → Magic link → body uses `{{ .Token }}` to show 6-digit code.
- Also set Site URL = `https://grid.trykria.com` and added redirect URL in Supabase URL Configuration.

### Grid: Final email OTP login flow

`app/login/page.tsx` — 3-step flow:
1. Email input → `signInWithOtp({ email })` — handles sign-in and sign-up in one call
2. 6-digit OTP input → `verifyOtp({ email, token, type: "email" })` — verify code from email
3. Profile check → existing host: redirect to dashboard; new host: name form → `profiles.upsert()`

`app/auth/confirm/page.tsx` — created during magic link attempt, now unused but harmless.

### Grid: Vercel Analytics added

`app/layout.tsx` — `import { Analytics } from "@vercel/analytics/next"` + `<Analytics />` in body.
`package.json` — `@vercel/analytics` installed.

### Grid + Backend: API URL port fix

`frontend/grid/lib/config.ts` + `.env.local.example` — fallback was `http://localhost:8001/api/v1`, corrected to `http://localhost:8000/api/v1` (matches docker-compose.dev.yml port mapping `8000:8000`).

---

## 2026-05-09 — Production Deployment (EC2 + Vercel) + Grid Auth Rewrite

### Infrastructure: Production Stack Live

Backend deployed to EC2 t3a.medium at `api.trykria.com`. Grid deployed to Vercel at `grid.trykria.com`.

**Files created:**
- `infra/DEPLOY.md` — full deployment guide (EC2 → Supabase → Grid → Pocket)
- `infra/deploy.sh` — repeatable deploy: `docker compose --env-file .env.prod -f docker-compose.prod.yml up -d --build` + alembic migrations
- `infra/setup-server.sh` — EC2 first-boot: Docker, Nginx, Certbot, Fail2ban, UFW, SSH hardening
- `infra/nginx/api.trykria.com.conf` — HTTP-only initially; certbot adds SSL block
- `docker-compose.prod.yml` — standalone (no base compose), `env_file: .env.prod` only (no `environment:` block interpolation)

**Key deployment gotchas discovered:**
- Ubuntu 22.04+: SSH service is `ssh` not `sshd` (`systemctl restart ssh`)
- Nginx config must be HTTP-only before certbot runs; `listen 443 ssl` without certs prevents nginx starting which breaks certbot's HTTP challenge
- EC2 has no IPv6 by default → Supabase Direct connection fails; use **Session mode pooler** (`aws-0-[region].pooler.supabase.com:5432`)
- Pooler URL encodes the region — must copy exact URL from Supabase → Connect → Session mode tab
- `docker compose environment:` block reads from host shell, NOT from `env_file`; removed redundant environment block from `docker-compose.prod.yml`
- Correct backend env var names: `SUPABASE_JWT_SECRET` (not `JWT_SECRET`), `SUPABASE_SERVICE_KEY` (not `SUPABASE_SERVICE_ROLE_KEY`)
- `docker compose --env-file .env.prod` needed in deploy.sh so Compose can interpolate `${ANTISPOOF_MODEL_ENABLED:-False}` in inspector block

### Inspector: mediapipe version pinned

`perceptrons/inspector/requirements.txt`: `mediapipe>=0.10.14` → `mediapipe==0.10.14`

MediaPipe 0.10.20+ removed `mp.solutions` API entirely. Inspector's `liveness_checker.py` uses `mp.solutions.face_mesh` — pinned to last known-good version.

### Grid: Auth rewritten to phone OTP

`frontend/grid/app/login/page.tsx` — replaced email/password dev hack with real phone OTP:
- Old: `signUp({email: "91{phone}@kriya.dev", password: "kriya-dev-2026"})` → hit Supabase email rate limits, RLS failures (no session after signUp with email confirm on)
- New: `signInWithOtp({ phone: "+91{phone}" })` → `verifyOtp({ phone, token, type: "sms" })` → check profile existence → new user goes to name step, returning user to dashboard
- Removed signin/register toggle — phone OTP auto-detects new vs returning users
- `DEV_OTP = "123456"` constant kept for dev hint display

### Grid: layout split for force-dynamic

`frontend/grid/app/(dashboard)/layout.tsx` — converted to server component that exports `dynamic = "force-dynamic"` and re-exports the client layout from `_DashboardLayoutClient.tsx`. Prevents Next.js from statically prerendering auth-protected dashboard pages.

### Grid: supabase.ts — reverted from Proxy to simple client

Tried lazy Proxy init to prevent build-time crash (when env vars not set). Reverted because `supabase.from()` lost `this` binding through the Proxy → silent runtime crash. Proper fix: set env vars in Vercel before building, keep simple `createClient()`.

### Grid: ApplicantProfileModal band.color fix

`frontend/grid/components/applicants/ApplicantProfileModal.tsx`:
- `band.color` → `bandColor = \`var(--${band.varName})\`` (5 occurrences)
- `MOMENTUM_BANDS` type has `varName` not `color` — TypeScript build error

### Supabase New API Key Format

Supabase migrated from JWT-format keys to named keys:
- `sb_publishable_xxx` → replaces `anon` key → use in frontend (`NEXT_PUBLIC_SUPABASE_ANON_KEY`)
- `sb_secret_xxx` → replaces `service_role` key → use in backend (`SUPABASE_SERVICE_KEY`)
- Legacy JWT keys still work until end of 2026
- Location: **Settings → API Keys** (new tabs) or **Legacy anon, service_role API keys** tab

---

## 2026-05-09 — Badges System + Home Page Revamp + Profile Fixes

### Profile: Completion Percentage Fix

`frontend/pocket/lib/profileCompletion.ts` — changed field keys checked for completion:
- `college_name` → `education_entries` (JSONB array)
- `experience_summary` → `work_experience` (JSONB array)

Old string fields were never populated by the edit form; the JSONB arrays are.

### Profile: Edit Profile navigates back on save

`frontend/pocket/app/(main)/edit-profile.tsx`:
- Removed `saved` banner state machine
- `handleSave` success branch: replaced `setSaved(true)` with `router.back()`

`frontend/pocket/stores/authStore.ts` — `updateProfile` now uses `.select().single()` so the updated row is returned and committed. Store state updates immediately from the returned row instead of doing a second `fetchProfile()` call.

### Backend: Badges System (full-stack)

**Migration `0019_revamp_badges.py`:**
- Converts `badge_category` column from enum to text + CHECK constraint (avoids `ALTER TYPE ADD VALUE` transaction issue)
- Adds `streak_count INT NOT NULL DEFAULT 0`, `longest_streak INT NOT NULL DEFAULT 0`, `last_active_date DATE` to `profiles`
- Clears old badge seed data; inserts 18 new badges across 3 categories:
  - **milestone**: newcomer, first_gig, gigs_3, gigs_5, gigs_10, gigs_20, gigs_50, gigs_100
  - **streak**: streak_10, streak_50, streak_100, streak_200, streak_500
  - **identity**: id_aadhaar, id_pan, id_driving_licence, id_passport, id_voter_id

**`backend/api/app/services/badge_service.py`** (new file):
- `award(db, user_id, badge_code)` — `INSERT ... ON CONFLICT DO NOTHING RETURNING id`; calls `await db.commit()` (critical — get_db sessions don't auto-commit)
- `award_newcomer`, `check_gig_badges`, `check_id_badges` — specific trigger helpers
- `update_streak(db, user_id)` — reads `last_active_date`; increments streak if yesterday, resets to 1 if gap, no-ops if already today; checks streak milestone badges; commits after UPDATE
- `sync_all_badges(db, user_id)` — retroactive full sync: awards newcomer + checks gig count + awards all `verified_id_types` ID badges. Called on every `GET /badges/me` so old users get retroactively awarded.

**`backend/api/app/routers/badges.py`** (new):
- `GET /api/v1/badges/me` — calls `sync_all_badges` first, then LEFT JOINs badges with user_badges; sorts: category order + earned-first within category

**Badge hooks wired to existing endpoints:**
- `routers/applicants.py` — after OTP verify + momentum recalc: `await check_gig_badges(db, worker_id)`
- `services/verification_queue.py` — in `_mark_verified()`: `await check_id_badges(db, user_id, id_type)`
- `momentum/router.py` — at top of `GET /momentum/me`: `await award_newcomer(db, user_id)` + `await update_streak(db, user_id)`

**`backend/api/app/main.py`** — added `badges` router with `/api/v1` prefix.

### Frontend: Badges Screen

**`frontend/pocket/lib/api/badges.ts`** — `getMyBadges()` calls `GET /api/v1/badges/me`

**`frontend/pocket/stores/badgeStore.ts`** (Zustand) — `badges`, `earnedCount`, `totalCount`, `isLoading`, `fetchBadges`

**`frontend/pocket/app/(main)/badges.tsx`** — full screen:
- Summary bar: earned/total count + progress bar
- Three sections: Milestones (lime accent), Streaks (amber `#FFC83D`), Verification (blue `#60a5fa`)
- 2-column `BadgeTile` grid
- Earned tiles: full opacity, colored icon bg, earned dot + date
- Locked tiles: 55% opacity, "Locked" label with lock icon

**`frontend/pocket/types/database.ts`** — added `streak_count`, `longest_streak`, `last_active_date` to Profile Row.

### Backend: GigCategory Enum Fix

`backend/api/app/models/gig.py` — `GigCategory` updated from 13 old values to 17 new values matching migration 0018. Old values (`registration_desk`, `ushering`, etc.) caused Pydantic validation errors when reading gigs from DB.

### Mobile: Home Page Revamp

Complete rewrite of `frontend/pocket/app/(main)/(tabs)/home.tsx`. Order: Momentum card → Hot near you → Recent badges → Recent gigs.

**`BandHeroCard`:**
- `getBandProgress(score)` returns `{ band, nextBand, fraction, ptsToNext }`
- Glow blob: `backgroundColor: band.color + "12"` positioned absolute top-right
- Score: 52pt bold in band color; band pill (colored dot + label); 3px progress track filling in band color
- Stats row: gigs done · streak days · "Full breakdown →" (navigates to Arena)

**`GigMarquee`** (auto-scroll, Animated.View + `useNativeDriver: true`):
- Animates `translateX` from `-singlePassWidth` to `0` — content drifts rightward (opposite of badge ticker)
- `Animated.loop + Easing.linear`, speed proportional to content width
- Using `Animated.View` instead of `ScrollView` so `Pressable` children remain clickable
- Each card: `LinearGradient` glow overlay + left color stripe per category + title, pay, distance

**`BadgeMarquee`** (setInterval, 0.25px/16ms):
- Only starts when `earned.length > 3`
- Duplicates badge list for seamless loop
- All hooks declared before any early return (Rules of Hooks fix)
- `ScrollView scrollEnabled={false}` + `scrollRef.scrollTo({ x, animated: false })`

**`RecentGigCard`** — 178px wide rectangles: category pill + status pill + title + pay + date

**Location fetch pattern:**
```typescript
const { status } = await Location.requestForegroundPermissionsAsync();
if (status === "granted") {
  const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
}
const res = await matchGigs({ limit: 5, ...coords });
```

**Bugs fixed during home revamp:**
- `Animated` imported from `react` (wrong) → moved to `react-native`
- `GigRow` validation error — `GigCategory` enum mismatch (see above)
- `BadgeMarquee` hooks violation — moved early return after all `useRef`/`useEffect` calls
- Gig cards unclickable — replaced `ScrollView scrollEnabled={false}` with `Animated.View + translateX`

---

## 2026-05-09 — Grid Applications Page Redesign ("Command Center")

### Grid: Applications Page — complete rewrite

Replaced the previous flat list grouped by gig with a "Command Center" two-panel layout:

**Horizontal gig chip strip (top):**
- `GET /gigs/mine` loads lightweight gig summaries on mount (N rows, not all applicants)
- Drag-to-scroll chip row with `dragState` ref + scroll glow indicator (lime vertical line + fade gradient on right edge when overflow exists)
- `GigChip`: pending badge (`position: absolute`, wrapped in `py-2 -my-2` to escape overflow clipping), slot fill bar, urgency label, selected = lime border

**Two-column applicant/profile grid (below chips):**
- `style={{ gridTemplateColumns: "1fr 2fr" }}` — ~33% list / ~67% profile
- Left: `overflow-y-auto` applicant list. Whole card clickable (`onClick`, `cursor-pointer`). Selected card = lime border. Action buttons use `e.stopPropagation()`.
- Right: `overflow-y-auto` profile panel. `panelColRef` + `useEffect` auto-scrolls to top when selected applicant changes.

**Tab counts bug fix:**
- Old approach called API with current tab's `status` filter → other tabs showed 0.
- Fix: always call API with `status=all`, derive `visibleApplicants` via `useMemo` client-side.

### Backend: `GET /gigs/mine`

New endpoint in `routers/gigs.py` (registered BEFORE `/{gig_id}` to avoid route shadowing):
- Returns `PostedGigsResponse` with `pending_count` per gig via `COUNT(...) FILTER (WHERE status = 'pending')`
- Pydantic models `PostedGigSummary` + `PostedGigsResponse` defined inline in `gigs.py`

### Backend: `GET /gigs/{id}/applicants` — sort + filter

Added `sort` and `filter_status` (alias: `status`) query params:
- `sort`: `momentum_desc | momentum_asc | newest | oldest` — safe dynamic ORDER BY from a fixed dict
- `filter_status`: `pending | accepted | all` — WHERE clause filter with `::text` cast on ENUM

### Grid: `ApplicantProfileModal` — `asPanel` prop

Added `asPanel?: boolean` to serve as both popup modal and inline compact card:
- **Panel mode**: natural-height card, SkillGraph (160px) + signal bars side-by-side, no internal scroll, natural-width buttons (`px-5 py-2.5`)
- **Modal mode**: unchanged — full-height fixed overlay, stacked 260px graph, `flex-1` buttons, `overflow-y-auto` body

### Grid: new API file

`grid/lib/api/gigs.ts` — `PostedGigSummary`, `PostedGigsResponse`, `listMyGigs()`

### Outstanding (not resolved)

Left column scroll: user wants applicant list to scroll independently while profile card stays fixed. A `useLayoutEffect` approach (setting `main.style.overflow = "hidden"`) was tried and **reverted** per user request. Root cause: dashboard `main` element has `overflow-y-auto` which competes with inner columns. Needs a different fix — see `dev/todo.md`.

---

## 2026-05-09 — Location-Aware Recommendations + Venue Maps Links

### Backend: `recommendations/` module

New standalone module at `backend/api/app/recommendations/` for all recommendation/matching logic.

- `geo.py` — `haversine_km()`, `GeocodedLocation` dataclass, `async geocode_venue()` calling Google Maps Geocoding API (`region=in`, server-side only)
- `engine.py` — full matching engine moved from `services/matching.py`: 5-signal scoring (trust 35%, distance 25%, category 20%, pay 10%, recency 10%)
- `models.py` — `GeocodeRequest`, `GeocodeResponse`, `LocationUpdateRequest` (with `formatted_address`)
- `router.py` — `POST /api/v1/recommendations/geocode` (auth-guarded to prevent API key abuse)
- `__init__.py` — intentionally empty; `from app.recommendations import router` imports the module, not the APIRouter (matches `momentum/` pattern)

`GOOGLE_MAPS_API_KEY` moved from committed `.env.development` to gitignored `.env.dev`.

### Backend: Gig location PATCH

`PATCH /api/v1/gigs/{id}/location` in `routers/gigs.py` now writes `location_point` (PostGIS), `venue_lat`, `venue_lng`, `venue_formatted_address` together. Poster-only guard.

### Database: Migration 0017

`0017_gig_location_columns.py` — adds `venue_lat FLOAT`, `venue_lng FLOAT`, `venue_formatted_address TEXT` (all nullable) to `gigs`. Plain mirrors of `location_point` — needed because Supabase JS returns PostGIS as unreadable WKB hex.

### Grid: Geocoding in gig wizard

Step 3 (Schedule) now has a "Fetch Location" button below venue/city. Calls `POST /recommendations/geocode`, shows resolved address + coordinates inline. Clears automatically when venue/city fields change. Address stored in `geocoded_address` form state and passed to the PATCH call on submit.

### Mobile: Runner GPS in Explore

`expo-location` integrated into `explore.tsx`. Requests foreground permission on mount, stores result in `locationRef` (useRef — no re-render). GPS passed to `fetchGigs` and prefetch `fetchMoreGigs`. Silent fallback if denied.

### Mobile: Tappable venue links

When `venue_lat`/`venue_lng` are set, venue rows become tappable `Pressable` components using `Linking.openURL` with `https://www.google.com/maps/search/?api=1&query={lat},{lng}`:
- `gig/[id].tsx` — lime pin icon, underlined text, external-link chevron
- `space.tsx` RunnerTab — compact meta row goes lime

### Frontend types updated

- `frontend/pocket/types/database.ts` Gig Row + Insert: `venue_lat`, `venue_lng`, `venue_formatted_address` added
- `frontend/pocket/lib/api/gigs.ts` `AcceptedGigItem`: `venue_lat`, `venue_lng` added
- FastAPI `AcceptedGigItem` model + SQL query updated to return location fields

### .env cleanup

`.env.development` deleted (was committed). `.env.dev` created (gitignored). `.gitignore` now uses blanket `.env.*` rule (except `.env.example`). All secrets — including Google Maps API key — live in `.env.dev`.

---

## 2026-05-07 — Momentum Plugin Architecture + Async Verification

### Momentum: Plugin Signal Architecture

Replaced hardcoded `WORKER_SIGNALS` dict in `config.py` with a file-based plugin system. Adding a new signal = drop a Python file in `momentum/signals/` and restart. No other changes required.

**New files:**
- `momentum/signals/_base.py` — `Signal` dataclass (key, label, short_label, description, icon, color, weight, max_points)
- `momentum/signals/show_rate.py`, `on_time_rate.py`, `performance_score.py`, `communication_score.py`, `professionalism_score.py` — one file per signal, each exports `SIGNAL` + `async compute(user_id, db) -> float | None`
- `momentum/registry.py` — `pkgutil.iter_modules` auto-discovery; `get_signals()`, `normalized_weights()`, `run_all(user_id, db)`

**Rewrites:**
- `calculator.py` — now takes `signal_scores: dict[str, float | None]` instead of duck-typed `profile_row`; weights from registry (auto-normalized fractions, no sum-to-100 constraint)
- `recalculate.py` — calls `registry.run_all()` for all signals; stores results in `signal_scores` JSONB; no longer updates individual signal columns
- `router.py` — reads `signal_scores` JSONB from DB row; added `GET /momentum/signals` endpoint returning `list[SignalMetaResponse]`
- `models.py` — added `SignalMetaResponse`

**Migration `0016_momentum_signal_scores.py`:** Adds `signal_scores jsonb NOT NULL DEFAULT '{}'` to `momentum_profiles`. Migrates existing individual column data into JSONB via `jsonb_strip_nulls(jsonb_build_object(...))`. Old individual columns left in place (not dropped).

**Frontend — dynamic skill graphs:**
- `lib/api/momentum.ts` — added `SignalMeta` type + `getSignalMeta()` calling `GET /momentum/signals`
- `stores/momentumStore.ts` — added `signalMeta: SignalMeta[]` + `fetchSignalMeta()` (cached, fetched once on Arena mount)
- Mobile `SkillGraph.tsx` — axes count and labels driven by `signalMeta` from store; falls back to static `SIGNAL_META` keys until API responds
- Grid `SkillGraph.tsx` — axes derived from `signals: BreakdownItem[]` prop length; hardcoded `SIGNAL_KEYS` array removed

**Verification:** Confirmed registry discovers all 5 signals, weights sum to 1.0, calculator produces correct scores (new user = 0, 5 gigs partial data = 341 Reliable, 15 gigs partial data = 683 Trusted). Migration applied cleanly.

### Async ID Verification Queue

Replaced synchronous Inspector call (which blocked the request) with an `asyncio.Queue` + single background worker pattern.

**Why single worker:** Inspector (RetinaFace + ArcFace) uses 300–600 MB RAM and is single-threaded. Concurrent calls would pile up at the HTTP layer. A queue gives deterministic ordering + clean backpressure.

**New file: `services/verification_queue.py`:**
- `VerificationJob` dataclass — carries all bytes needed for Inspector call
- Module-level `job_queue: asyncio.Queue[VerificationJob]` shared between endpoint and worker
- `worker()` — runs as long-lived asyncio task (started in lifespan); processes one job at a time
- `_process()` — calls `http://inspector:8000/verify`, maps response fields to error codes
- `_mark_verified()` — updates `profiles.verified_id_types` + job status using `AsyncSessionLocal`
- `_set_job()` — updates job status/error_code

**`profiles.py` changes:**
- `POST /verify-identity` → validates images → inserts `verification_jobs` row → enqueues `VerificationJob` → returns 202 immediately
- `GET /me/id-verification` → returns per-type status map using `DISTINCT ON (id_type) ORDER BY id_type, created_at DESC`

**Mobile (`verify-identity.tsx`) — async polling:**
- State machine: `"list" | "camera_id" | "camera_selfie" | "uploading"`
- After selfie: `setScreen("uploading")` → POST → immediately back to `"list"` (job queued, not done)
- `useFocusEffect` + `setInterval(5000)` polls `GET /me/id-verification` while any job is `pending` or `processing`
- Per-ID `StatusControl` component: verified=green pill, pending/processing=spinner, failed=retry button, unverified=verify button

**Migration `0015_verification_jobs.py`:** `verification_jobs` table with `status text DEFAULT 'pending'`, `error_code text`, index on `(user_id, id_type, created_at DESC)`.

---

## 2026-05-07 — Multi-ID Verification + Inspector Integration + In-App Camera

### Identity Verification: Multi-ID System

Replaced single-ID mock verification with a real multi-ID flow backed by the Inspector face-matching pipeline.

**DB:** Migration `0014_verified_id_types.py` — adds `verified_id_types jsonb NOT NULL DEFAULT '[]'` to `profiles`; backfills from `id_type` for existing verified users.

**Backend (`app/routers/profiles.py`):**
- `POST /api/v1/profiles/verify-identity` now proxies to Inspector via `httpx.AsyncClient`
- `_call_inspector()` helper: sends `id_image` + `selfie` as multipart; handles `httpx.RequestError` → 503; non-200 → 502
- Maps Inspector response fields to mobile error codes: `no_face_id`, `no_face_selfie`, `duplicate_submission`, `face_spoof_detected`, `low_confidence`
- `verified_id_types` append uses `jsonb_build_array(:id_type)` with `@>` containment check — avoids `::jsonb` cast which breaks asyncpg named-param binding
- Fixed 500 bug: original SQL used `:type_arr::jsonb` which asyncpg couldn't bind; replaced with `jsonb_build_array(:id_type)`

**Inspector Docker integration (`docker-compose.dev.yml`):**
- Inspector service added to dev compose (build context: `./perceptrons/inspector`)
- Joins `kria-network` → reachable at `http://inspector:8000`
- `INSPECTOR_URL=http://inspector:8000` env var added to `kria-api`
- `insightface_models` named volume added (persists ~30 MB weights)
- `kria-api` depends on Inspector with `service_started` (not `service_healthy`) — stack boots immediately; endpoint returns 503 during Inspector warm-up (~30–60s)

### Badge System (`components/ui/VerifiedBadges.tsx`)

New reusable badge system, extensible beyond ID verification:
- `BadgeKey` type union: 5 ID types + `photo_verified` meta-badge
- `BADGE_DEFS`: icon, color, bg per badge key (also used for ID list row icons)
- `SingleBadge`: pill with icon + label; `size="sm"/"md"`
- `BadgeList`: renders `photo_verified` first + all earned IDs; `showPhotoVerified` prop
- `frontend/pocket/types/database.ts`: added `verified_id_types: string[]` to profiles Row

### In-App Camera (`components/camera/VerificationCamera.tsx`)

Full-screen camera replacing `expo-image-picker`. Uses `expo-camera` (`CameraView`, `useCameraPermissions`).

- **ID mode:** Rear camera; ISO ID-1 rectangle (aspect 1.585); corner bracket accents via `CornerBrackets`
- **Selfie mode:** Front camera; oval face guide; **capture window larger than oval** (`SELFIE_CAP_W = SW * 0.88`, `SELFIE_CAP_H = OVAL_H + 96`) so Inspector receives face + context, not just a tightly-cropped face
- `SpotlightMask` takes separate `guideW/guideH` (oval border position) and `capW/capH` (dark bar position) — decoupled so capture area can be larger than the guide
- Permission gate built in; `takePictureAsync({ quality: 0.88 })`

### Verify Identity Screen Rewrite (`app/(main)/verify-identity.tsx`)

Replaced single-ID 3-step ImagePicker flow with multi-ID list screen:
- State machine: `"list" | "camera_id" | "camera_selfie" | "processing" | "success" | "failed"`
- List view: all 5 ID types, per-type verified/unverified state, `BadgeList` at top
- Camera states render `VerificationCamera` full-screen (no tab bar)
- Selfie captured → immediately submits (no extra confirmation step)
- `activeIdType` passed through entire flow to `verifyIdentityWithImages`
- `fetchProfile()` on success refreshes `verified_id_types` → badges update live

---

## 2026-05-06 — Grid Applications Page + Skill Graph + Profile Completion Bonus

### Grid: Applications Page (`/applications`)

- New global inbox page showing ALL applicants across all host's gigs
- Backend: `GET /api/v1/applicants` — single JOIN query returning `GlobalApplicantListResponse` with `momentum_score`, full applicant profile fields, gig context
- Frontend groups by `gig_id` client-side; tabs: Pending / Accepted / All
- Each row: avatar → name + verified badge → `MomentumChip` → gig title + date → inline Accept/Reject/No-Show
- Clicking row → `ApplicantProfileModal`
- New nav item "Applications" added to Grid Sidebar (Inbox icon, between Gigs and Events)

### Grid: Applicant Profile Modal

- `grid/components/applicants/ApplicantProfileModal.tsx` — rebuilt from scratch
- Fetches `GET /momentum/user/{id}/breakdown` on mount (spinner while loading)
- Sections: header → SkillGraph (260px) → signal legend → profile completion chips → scrollable body (message, bio, work exp, education, languages, skills) → action footer
- Signal legend: 5 rows, progress bar in band color with box-shadow glow, `N%` or `—` for no-data
- Profile completion: chip row, earned = `bg-primary/15 text-primary`, not earned = line-through

### Grid: SkillGraph component (`grid/components/ui/SkillGraph.tsx`)

- Pure SVG radar chart for browser — no react-native-svg
- Theme-adaptive via CSS vars (`--sg-canvas-from/to`, `--sg-grid`) on `<stop>` and `style` props
- `useId()` for unique per-instance filter IDs (prevents filter bleeding)
- Glow: `feGaussianBlur + feMerge` on data polygon and dots
- Outer rim circle removed; axis labels removed (replaced by HTML legend)
- `maxR = size * 0.36`

### Grid: Light mode SkillGraph fix

- Skill graph canvas was hardcoded dark (`#1e1d1d`), invisible in light mode
- Fix: CSS vars `--sg-canvas-from/to/--sg-grid` defined in `:root` (dark) and `[data-theme="light"]` in globals.css
- SVG `<stop>` elements use `style={{ stopColor: "var(--sg-canvas-from)" }}` — CSS vars resolve on SVG `style` attributes (not on SVG `fill`/`stop-color` attributes)

### Backend: `/api/v1/applicants` bug fixes

Three separate bugs fixed to make the applications page work:
1. `ga.status::text = :status` — PostgreSQL ENUM `application_status` can't be compared to text bind params; requires `::text` cast
2. `mp.worker_score AS momentum_score` — column is `worker_score`, not `momentum_score`
3. Separate `:poster_id` and `:rater_id` bind params (same UUID value) — asyncpg deduplicates by name; using same param name twice in one query causes both to bind to `$1`, giving wrong value for one

### Backend: Seed scripts for test data

- `backend/api/seed_runner_signals.py` — seeds ratings (one per runner, respects UNIQUE constraint), sets `otp_verified_at` (80% on-time), recalculates
- `backend/api/seed_remaining_signals.py` — directly updates `momentum_profiles` signal columns for 5 runners who couldn't be rated via ratings table (uniqueness constraint)
- `backend/api/recalculate_all_momentum.py` — recalculates all 16 test runners
- Final demo scores: 74–548 across 16 runners

### Momentum: Profile Completion Bonus

Solves the cold-start problem (score=0 for new runners before first gig).

**Formula change:**
```
gig_score      = (weighted_sum / 100) × 1000 × credibility − penalty_points
profile_points = Σ points for filled profile fields (capped at 80)
score          = clamp(gig_score + profile_points, 0, 1000)
```

Profile bonus is additive **outside** the credibility formula — new runners reach up to 80 pts, staying in Newcomer band (0–99).

**6 profile signals** (all compute from real `profiles` DB columns, no dummies):
- `id_verified` (30 pts), `skills` (15 pts), `bio` (10 pts), `languages` (10 pts), `work_experience` (10 pts), `education_entries` (5 pts)

**Files changed:**
- `config.py`: Added `PROFILE_SIGNALS`, `MAX_PROFILE_POINTS = 80`
- `calculator.py`: Added `ProfileBreakdownItem` dataclass, `_is_filled()`, `compute_profile_points()`. `compute_worker_breakdown` now returns 3-tuple `(MomentumScore, list[BreakdownItem], list[ProfileBreakdownItem])`. `MomentumScore` has `profile_points: int = 0`.
- `recalculate.py`: Queries `profiles` table for profile fields; passes to calculator
- `models.py`: Added `ProfileSignalResponse`; `MomentumScoreResponse` has `profile_points`; `WorkerBreakdownResponse` has `profile_signals`
- `router.py`: Added `_fetch_profile_fields()` helper; all 4 endpoints pass profile fields to calculator
- `frontend/pocket/lib/api/momentum.ts`: Added `ProfileSignalItem`; updated `MomentumScoreData` + `WorkerBreakdownData`
- `grid/types/index.ts`: Added `ProfileSignalItem`; updated `MomentumBreakdownResponse`
- `frontend/pocket/components/momentum/MomentumBreakdown.tsx`: Profile completion chip section added at bottom of signal list
- `grid/components/applicants/ApplicantProfileModal.tsx`: Profile completion chip section added

**Recalculated:** All 16 test runners via `recalculate_all_momentum.py`.

---

## 2026-05-06 — Momentum v1 Complete

### Backend: Momentum module restructure

- Isolated all momentum code into `backend/api/app/momentum/` module:
  - `config.py` — WORKER_SIGNALS (5 signals, weights sum to 100), WORKER_PENALTIES, 6 bands
  - `calculator.py` — pure functions, `BreakdownItem` dataclass with `has_data` field
  - `models.py` — Pydantic response models (worker-only, no poster)
  - `router.py` — 3 endpoints: `/me`, `/me/breakdown`, `/user/{id}`
  - `recalculate.py` — reads DB signals → calculates → writes score + audit log
  - `signals/` — scaffold for future individual signal extractors
- Deleted old files: `app/routers/momentum.py`, `app/services/momentum_calculator.py`, `app/config/momentum_config.py`, `app/models/momentum.py`
- `app/main.py`: updated import to `from app.momentum import router as momentum`

### Backend: Score formula

- Range 0–1000, new users start at 0
- Formula: `(weighted_sum / 100) × 1000 × credibility − penalty_points`
- Total weight always 100 — NULL signals excluded from numerator but not denominator
- Credibility: `min(gig_count / 10, 1.0)`
- Max score scales with available signals (show_rate only → max 350; all 5 → max 1000)

### Backend: Bugs fixed

- **Audit log empty:** `momentum_events` INSERT was missing. Now written after every score change in `recalculate.py`.
- **Penalty not applied:** `worker_penalty_points` was read by calculator but never written. Fixed: `no_show_assignment` endpoint now writes penalty to DB before calling `recalculate_momentum`.
- **Signal defaults wrong:** After migration made columns nullable, trigger still inserted `1.0`/`5.0` defaults. Fixed by `DROP DEFAULT` on all signal columns.

### Backend: Rating sub-scores

- `RatingCreate` model now accepts `punctuality_score`, `communication_score`, `professionalism_score` (all optional, 1–5)
- `ratings.py` router inserts sub-scores into DB
- `recalculate_momentum` now uses these sub-scores to compute `communication_score` and `professionalism_score` signals

### Database: Migration 0013

- `worker_score`/`poster_score`: CHECK constraint changed 300–850 → 0–1000, default 500 → 0
- Signal columns `show_rate`, `on_time_rate`, `performance_score`: DROP NOT NULL, DROP DEFAULT
- DROP `worker_response_rate`, `worker_consistency_score` (no data path)
- ADD `worker_communication_score NUMERIC(4,2)`, `worker_professionalism_score NUMERIC(4,2)` (nullable)
- Reset all existing rows: scores → 0, signals → NULL

### Frontend: Momentum constants & types

- `frontend/pocket/constants/momentum.ts`: 6-band 0–1000 scale, Solar Flare band colors, `SIGNAL_META` for 5 signals
- `frontend/pocket/lib/api/momentum.ts`: `MyMomentumData` = worker-only; `WorkerBreakdownData` with `signals: BreakdownItem[]` and `has_data`; `PublicMomentumData` = worker fields only
- `frontend/pocket/stores/momentumStore.ts`: updated to `WorkerBreakdownData` type

### Frontend: SkillGraph component (mobile)

- New `frontend/pocket/components/momentum/SkillGraph.tsx`
- Radar/spider chart using `react-native-svg`
- 5 axes matching WORKER_SIGNALS; all labels rendered in SVG
- Data polygon fills to band color; dots on each data point
- Dimmed axes (opacity 0.35) for signals with `has_data = false`
- Score + band label centered in chart
- `SpeedometerGauge.tsx` deleted

### Frontend: Arena screen

- Replaced `SpeedometerGauge` with `SkillGraph`
- Both `fetchMyMomentum()` and `fetchMyBreakdown()` called eagerly on mount
- Score default changed from 500 → 0
- Removed poster/role-switching logic (always Runner)

### Frontend: MomentumBreakdown modal

- Updated to `WorkerBreakdownData` shape
- Signals with `has_data = false` show dimmed row + "No data yet" badge
- Removed `activeRole` prop (always worker)

---

## 2026-05-03 — Grid Theming Overhaul + Login Redesign + Bug Fixes

### Light/Dark theme system added to Grid
- Full Solar Flare Light palette added to `globals.css` under `[data-theme="light"]`
- Semantic component tokens (`:root` for dark defaults, overridden in light): `--card-bg`, `--sidebar-bg`, `--topbar-bg`, `--content-bg`, `--input-bg`, `--border-color`, `--nav-active-bg`, `--lime`, `--lime-on`
- CSS overrides for hardcoded Tailwind utilities in light mode: `border-white/10`, `bg-white/5`, `bg-[#201f1f]`, `bg-[#D4FF00]`, etc.
- Light mode: lime (`#D4FF00`) → olive (`#536600`) everywhere; `--color-text-inv: #ffffff` for white text on olive buttons
- `.nav-item` gets `background-color: transparent`; `.nav-item-active` gets warm beige bg (`#eef0da`) + olive text/border
- `ThemeToggle` component created at `components/ui/ThemeToggle.tsx` — reads/writes `localStorage("kria-grid-theme")`, updates `document.documentElement.dataset.theme`
- Added to Sidebar bottom section above Sign Out
- SSR flash fix: inline `<script>` in `layout.tsx` reads localStorage before first paint; `suppressHydrationWarning` on `<html>`

### Grid login page redesigned
- Premium two-column layout matching `stitch_kria_grid_host_dashboard-dark/grid_access_portal_refined`
- Left column: headline with lime accent, feature list (Users/BarChart3/Network icons), stats row
- Right column: glassmorphism auth card
- Background: `#0c0d0a` with radial lime glow gradients

### Bug fixes
- `ReputationBar` in `gigs/[id]/page.tsx`: fixed crash when `score` is null

---

## 2026-05-01 — Grid Stitch Redesign + Analytics + Demo Seed

### Stitch design language applied across all Grid pages
### Analytics Center (`/analytics`)
- KPI row, Application Funnel, Category Performance, Monthly Activity, City Distribution, Calendar Heatmap
- All live data — no dummy values, no chart library
### Demo seed data inserted
- Host: Priya Mehta (`919988776655@kriya.dev` / OTP `123456`)
- 15 gigs across 6 cities, 15 runner profiles, 144 applications, 113 assignments

---

## 2026-04-30 — Grid Dashboard + Host Role Hidden

### Host role hidden in mobile app
- `SHOW_HOST_ROLE = false` flag in 5 files
### Grid webapp built (`grid/`)
- Next.js 16.2.1 + Tailwind v4 + lucide-react + Space Grotesk
- Full auth, dashboard, gig posting wizard, applicant management, events, analytics

---

## 2026-03-27 — Landing Page (trykria.com)
- Built `landing-page/`, live at trykria.com (Vercel)
- i18n (EN / हि / த), interactive swipe card stack, waitlist form

---

## 2026-03-23 — Solar Flare Theme + Role-Split Dashboard
- `colors.ts` rewrite — `T.primary = #D4FF00`, `T.bg = #0e0e0e`
- `authStore.activeRole: "runner" | "host" | null`
- `RunnerTabsNavigator` + `HostTabsNavigator`
- `frontend/pocket/constants/labels.ts` — `L.*` for all UI strings

---

## 2026-02-21 — Momentum System (v1 original)
- Migration `0008_momentum.py`: `momentum_profiles` + `momentum_events`
- `SpeedometerGauge`, `MomentumBreakdown`, `MomentumBadge` components
- Arena screen with gauge + stats

---

## 2026-02-20 — Chat + Tab Bar Restructure
- Chat tab hidden (`href: null`)
- Global Realtime subscription for badge

---

## 2026-02-18 — Chat Feature
- Migration 0007: conversations, messages, conversation_participants
- **Open bug:** Receiver real-time not working reliably
