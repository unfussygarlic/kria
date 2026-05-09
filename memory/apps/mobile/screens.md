---
name: Mobile App Screens
description: Screen-by-screen UX decisions, layouts, and component choices
type: project
---

# Mobile App — Screen UX Decisions

## Home Screen (`home.tsx`)

**Completely revamped.** Sections in order (Runner view):

### 1. BandHeroCard
- Full-width card (T.surface1 bg + subtle border)
- Glow blob (band color + "12" alpha) at top-right corner
- Score: 52pt bold in band color
- Band pill: colored dot + band label, tinted background + matching border
- Progress track: 3px height, fills in band color, shows pts to next band
- Stats row: gigs done · streak days · "Full breakdown →" → Arena
- `getBandProgress(score)` → `{ band, nextBand, fraction, ptsToNext }`

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

**Flames tab (Runners):**
- SwipeableJobCard for current gig
- City pill below card (map-pin icon + `profile.city`)
- Prefetch when ≤10 cards remaining (`PREFETCH_THRESHOLD = 10`)
- Swipe up → apply; swipe left/right → navigate prev/next
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
- Accepted gigs list
- Status chips per gig (assigned/checked_in/completed/no_show)
- OTP entry field for check-in
- "Rate Host" button after completion

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

## Profile Screen (`(tabs)/profile.tsx`)

Accessible via avatar button on Home. Has X close button (navigates back). Optional profile fields editing.

## Gig Detail Screen (`gig/[id].tsx`)

Shown to Runners. Full gig info + apply button. OTP entry for check-in.

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
