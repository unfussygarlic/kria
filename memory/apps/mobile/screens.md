---
name: Mobile App Screens
description: Screen-by-screen UX decisions, layouts, and component choices
type: project
---

# Mobile App — Screen UX Decisions

## Auth Flow

### Intro Carousel (`app/(auth)/intro.tsx`, new 2026-08-05)
Pre-login. 3 swipeable slides: "Welcome to Kria" (lime), "Build your Momentum" (amber), "Verify once" (cobalt). Each slide has eyebrow label, huge two-line title, body copy, big icon-in-ring with colored radial glow behind. Bottom: progress dots (active widens + turns lime) + gradient "Next"/"Get Started" CTA. Skip top-right.

**Persistence:** `intro_seen_v1` flag in SecureStore. Returning users bypass immediately (component `useEffect` redirects to `/login` before render). Auth gate (`app/index.tsx`) sends new visitors to `/(auth)/intro`, not `/login`.

### Login (`login.tsx`, updated 2026-08-05)
Existing lime gradient hero + phone-input card. **Trust row** (Secure OTP · Verified hosts · Paid weekly) in a lime-tinted card above the terms footer. Placeholder cleaned up to `98XXXX1234`.

## Home Screen (`home.tsx`)

**Completely revamped.** Sections in order (Runner view):

### 1. BandHeroCard
- Full-width card (T.surface1 bg + subtle border)
- Glow blob (band color + "12" alpha) at top-right corner
- Score: 52pt bold in band color
- Band pill: colored dot + band label, tinted background + matching border
- Progress track: 3px height, fills in band color, shows pts to next band
- Stats row: gigs done · **StreakStat** · "Full breakdown →" → Arena
- `getBandProgress(score)` → `{ band, nextBand, fraction, ptsToNext }`

**StreakStat (new 2026-08-05):** dedicated inline component. When `streak > 0` → amber pill with pulsing 🔥 emoji (opacity loop 0.7↔1.0, 900ms each via `Animated.loop`) + amber "N day streak" text (in `#FFC83D`). When `streak === 0` → muted "Start a streak" prompt.

### 2. "Hot Near You" GigMarquee
- Uses same recommendation engine as Explore (location-based, `matchGigs({ limit: 5, ...coords })`)
- `expo-location` foreground permission; silent fallback (no coords) if denied
- Auto-scrolls **rightward** (`translateX` from `-singlePassWidth` to `0`, `Easing.linear`)
- Uses `Animated.View` NOT `ScrollView` — allows `Pressable` children to be tappable
- `useNativeDriver: true` for native-thread animation
- Each `GigStripCard`: `LinearGradient` glow overlay + left category color stripe; shows title, pay, distance
- Tapping a card navigates to `gig/[id]`

### 3. Recent Badges Marquee (BadgeMarquee)
- Only renders and scrolls when `earned.length > 3`
- Scrolls **leftward** (standard ticker direction)
- `setInterval` every 16ms, 0.25px per tick
- Badge list duplicated for seamless loop; uses `ScrollView scrollEnabled={false}` + `scrollRef.scrollTo`
- All hooks (`useRef`, `useEffect`) declared before any early return

### 4. Recent Gigs
- Horizontal scroll of `RecentGigCard` (178px wide rectangles)
- Shows both pending applications and accepted gigs
- Category pill (tinted bg, colored dot + label) + status pill (tinted bg, colored text)
- Shows title, pay, event date
- **Filters expired applications** (2026-08-05) — `activeApplications` memo computes `(event_date + shift_end_time) >= now` client-side so expired items don't linger

**Host layout:** hidden, code preserved (quick actions 2×2).

## Badges Screen (`badges.tsx`)

Accessible from profile screen (badge count link) or direct navigation.

**Header + Summary bar:**
- Earned/total count with progress bar (earned/total fraction, lime fill)

**Three sections (2-column BadgeTile grid each):**
1. **Milestones** — lime accent; newcomer + gig count badges (1/3/5/10/20/50/100)
2. **Streaks** — amber `#FFC83D` accent; 10/50/100/200/500 daily streak badges
3. **Verification** — blue `#60a5fa` accent; 5 ID type badges (Aadhaar, PAN, DL, Passport, Voter ID)

**BadgeTile:**
- Earned: full opacity, colored icon background, earned dot + "Earned on [date]" footer
- Locked: 55% opacity, lock icon + "Locked" label

## Explore Screen (`explore.tsx`)

**Header:** Dark gradient + pill switcher (🔥 Flames | 🔍 Search). Search tab hidden for Hosts.

**Flames tab (Runners) — v3 2026-08-05:**
- **Deck depth:** 2 peek cards render behind the front `SwipeableJobCard` — `peekCardMid` (N+1, scale 0.96 opacity 0.65 translateY 12), `peekCardBack` (N+2, scale 0.92 opacity 0.35 translateY 24). Only front card catches gestures. `deckCenter` is `position: relative`.
- Front card catches gestures — swipe up → apply, left/right → navigate.
- Overlay stack on every card (both cover branch + FallbackHero): TimeToStartPill top-left (within 24h), MomentumBadge + Boost + SpotsChipOverlay top-right, HostAvatarChip bottom-left. See `features/gig_card.md`.
- **Threshold-crossing haptics:** `Haptics.selectionAsync()` fires the moment drag crosses apply/nav commit line (arms/disarms via refs).
- **Celebratory apply overlay:** icon springs 0.6 → 1.15, backed by scaling white radial glow. Icon bumped 52 → 64px.
- City pill below card (map-pin icon + `profile.city`).
- Prefetch when ≤10 cards remaining.
- Empty state: check-circle icon + "You're all caught up!"

**Flames tab (Hosts):**
- Same card but `canApply=false` → grey overlay + lock icon
- Swipe up triggers "Host Mode" Alert (no application submitted)

**Search tab:**
- `<SearchTab />` component with filter chips (centered)
- Category filter + keyword search

**Card navigation:** Circular carousel — wraps from last to first.

## Space Screen (`space.tsx`) — "My Space"

**Header:** Dark gradient + role label (no tab switcher).

**Runner view:**
- Upcoming / History sub-tabs
- Status chips per gig (assigned/checked_in/completed/no_show)
- OTP entry field for check-in (4-box)
- "Rate Host" button after completion

**Upcoming vs History split (updated 2026-08-05):** `isUpcoming(item, now)` compares `(event_date + shift_end_time) >= now`, not `event_date >= today`. Fixes items ending earlier today lingering in Upcoming.

**History cards elevated (2026-08-05):** removed 0.85 opacity fade. Full-color accent bar. Adds lime **checkmark dot** for `completed` or coral **X dot** for `no_show` in the top row. Reads as accomplishment, not "old news".

**Post-OTP check-in celebration (added 2026-08-05):** on successful `verifyOtp`, the GigDetailSheet renders a full-cover overlay (`celebrationOverlay`) for 1500ms:
- Lime radial halo scales 0.4 → 1.3 (spring)
- Center: lime circle with 46px black check icon
- "You're checked in!" + "Nice work. Now go crush the shift."
- Success haptic (`Haptics.notificationAsync(Success)`)
- After timeout: `onOtpSuccess` proceeds to rating flow

**Empty state copy rewritten (2026-08-05):** "Nothing on the calendar" / "No track record yet" with motivational subtext, replacing flat "No upcoming gigs".

**Host view (hidden, code preserved):**
- Posted gigs + events list (newest first)
- Navigate to applicants on press

## Arena Screen (`arena.tsx`)

**Header:** Dark gradient + role label ("Runner · Momentum", muted). No tab switcher.

**Data loading:** Both `fetchMyMomentum()` and `fetchMyBreakdown()` called eagerly on mount (not lazy on modal open).

**Content:**
- `SkillGraph` radar chart (`react-native-svg`):
  - 5 axes = 5 Runner signals (show_rate, on_time_rate, performance_score, communication_score, professionalism_score)
  - Score in center (band color), band label below score
  - Data polygon fills to band color at 18% opacity
  - Axis labels in SVG text; dimmed (opacity 0.35) for signals with no data
  - "Tap for breakdown" hint text
  - Tap → opens `MomentumBreakdown` modal
- Stats grid: Gigs Done + Score Band
- "How Momentum works" info card
- Pull-to-refresh: reloads both momentum and breakdown

**Score default:** `0` (not 500 — new users haven't earned anything yet).

**MomentumBreakdown modal:**
- Custom `View + Modal + Animated.spring` (no library)
- Score pill at top (band color)
- Per-signal animated progress bars
- Signals with `has_data = false` show "No data yet" badge + dimmed row
- Explanation text at bottom
- No raw numbers or formulas shown

**Band level-up celebration (added 2026-08-05):** on data update, compares current band label to `prevBandRef.current`. If it advanced by band index (using `BAND_ORDER` array), fires `Haptics.notificationAsync(Success)` + shows `<LevelUpModal>`.

`LevelUpModal` — full-screen dark backdrop with animated band-color halo (`Animated.loop` scale 0.6 ↔ 1.2 over 900ms each). Center: eyebrow "PROMOTED" (band color), "You're now", huge band name (48px, band color), sub-copy, band-color pill CTA "Nice" to dismiss.

**First-load guard:** `prevBandRef.current === null` on mount → just seeds the baseline, never celebrates. Prevents "celebrating" data we didn't watch happen. Purely in-memory — no persistence.

## Event Detail Screen (`event/[id].tsx`)

**isHost detection:** `event.poster_id === profile?.id`

**Host view:** Jobs navigate to applicants, shows applicant counts, "Add Another Job" footer, "Applicants" in summary.

**Runner view:** Jobs navigate to gig detail (apply), shows open slots, no footer, "Open Slots" in summary.

## Applicants Screen (`gig/applicants/[gigId].tsx`)

**Header:** Dark gradient + back arrow + centered "Applicants" title. `Stack.Screen headerShown: false`.

Per-applicant card:
- Avatar (initials, `T.avatarBg`)
- Name, city, gigs completed
- Worker Momentum badge (`MomentumBadge variant="stat"`)
- Accept / Reject buttons (pending), Mark No-Show (assigned)

**2026-08-05 fixes:**
- **Momentum score bug fixed** — was `const workerMomentum = (p as any).worker_momentum ?? 500;` (nonexistent field, always fell back to hardcoded 500). Now `item.momentum_score ?? 0` — reads the backend-returned live score at the `ApplicantListItem` level.
- **`styles.actionText` bug fixed** — the 5-week-old open issue. Style was referenced 4× (lines 596/610/629/639) but never defined, causing broken Text rendering. Added: `{ fontSize: 14, fontWeight: "700", fontFamily: "SpaceGrotesk_700Bold" }`.
- **Skeleton loader** replaces `ActivityIndicator`. Renders 4 avatar-and-text row skeletons.
- **Empty state copy** rewritten: "Waiting for applicants" + "Runners nearby will see your gig in Explore. First applications usually land within a few hours."

## Profile Screen (`(tabs)/profile.tsx`) — v2 2026-08-05

Accessible via avatar button on Home. Has X close button (navigates back).

**Header (extended 2026-08-05):**
- Avatar circle (initials, lime bg) + name + phone
- Verified badge (green pill) if `is_verified`
- **NEW: Bio** — 3-line max, centered, textSub color
- **NEW: Skills chips** — top 5 skills as pill chips (surface2 bg). Overflow shown as "+N" chip.

**Stats row (was 2, now 3):**
- Gigs Done · Momentum (band color) · **Day Streak** (with 🔥 emoji when streak > 0, amber color)

**Quick grid (2×2):**
- Edit Profile · **Share Profile (new)** · My Badges · Settings
- Share Profile handler: `Share.share({ url: "https://trykria.com/p/${profile.public_slug ?? profile.id}", ... })` — native share sheet, no new deps. See `features/public_profile.md`.

**Verify Identity menu item + Sign Out unchanged.**

## Gig Detail Screen (`gig/[id].tsx`)

Shown to Runners. Full gig info + apply button. OTP entry for check-in.

**2026-08-05 additions:**
- **Skeleton loader** (`components/ui/Skeleton`) replaces the old `ActivityIndicator` spinner. Renders faux hero + text lines while gig loads.
- **HostAvatarChip** rendered below title/company. Reads from `useGigStore((s) => s.hosts)`. On cold-load (deep link), `getGig()` calls `fetchHost(poster_id)` in the background to populate. See `features/gig_card.md`.

## Onboarding (`onboarding/profile.tsx`)

4-step flow after first login:
1. Name (first + last)
2. Date of birth
3. Gender
4. City + State

`isOnboarded` = all five fields present (`first_name + date_of_birth + gender + city + state`).

## Edit Profile (`edit-profile.tsx`)

Optional fields beyond onboarding. Direct Supabase via `useAuthStore.updateProfile()`.

## Verify Identity (`verify-identity.tsx`)

Multi-ID verification screen. Runners verify government IDs one at a time; each earns a badge.

**List screen (default):**
- Earned badges at top via `BadgeList` (hidden if none verified yet)
- Intro card for new users
- 5 ID types in a card list (Aadhaar, PAN, DL, Passport, Voter ID); each row shows icon from `BADGE_DEFS`, label, and either a green "Verified" pill or a lime "Verify →" button
- Privacy info card at bottom

**Camera flow (full-screen, no header):**
1. `VerificationCamera mode="id"` — rear camera, ID rectangle guide
2. After capture → `VerificationCamera mode="selfie"` — front camera, oval guide with larger capture window
3. After selfie capture → immediately submits; shows processing spinner (pulsing icon)

**Success / Failed states:** Full-screen centered, name the specific ID type verified.

State machine: `"list" | "camera_id" | "camera_selfie" | "processing" | "success" | "failed"`

Active ID type tracked in `activeIdType: IDType | null` — passed to `verifyIdentityWithImages`.
