---
name: Home Tab — Reference Implementation
description: Every pattern used in the redesigned Home tab, with the reasoning. Reuse these on Explore / Jobs / Space / Arena / etc.
type: project
---

# Home Tab — Reference Implementation

File: [`frontend/pocket/app/(main)/(tabs)/home.tsx`](../../frontend/pocket/app/(main)/(tabs)/home.tsx)

This is the reference — the pattern bar every other screen should match.

## Layout order (top → bottom)

1. **Greeting bar** — "Good morning, [name] 👋" + tap-to-refresh location pill
2. **Earnings hero** — gradient card, big money number, week gig count, payout date
3. **Momentum + Streak bento** — two side-by-side stat cards
4. **Search bar** — routes to Jobs tab
5. **Category tiles** — 2×3 grid of "Browse by role"
6. **Hot gigs** — horizontal-scroll cards
7. **Events near you** — horizontal-scroll event cards

## Why this order

- **First glance:** user sees earnings (satisfaction) + progress (momentum, streak) — motivational anchors
- **Then:** search + browse — the "what do I do next" primary actions
- **Then:** curated + discovery content — filler that's still useful

## Specific patterns worth stealing

### 1. The greeting bar (top strip)

```
"Good morning,"          [📍 Bengaluru]
Aditya 👋
```

- Two-line greeting (small "hi" + big name) reads warmer than one-line
- Emoji after name (`👋`) — casual, human
- Location as a **tap-to-refresh pill** on the right (users learn this tapping)
- `textTransform: "capitalize"` on the name — handles all-lowercase profile names gracefully

### 2. The gradient hero

**Structure:**
- Outer `<View>` carries `SHADOW.lg` + `borderRadius: R.hero` (rounded 28)
- Inner `<LinearGradient>` uses `T.gradAccent` (pink → violet), fills the rounded area
- Inside: label ("THIS WEEK", uppercase, tracked +1.5) → giant amount → sub-copy

**Why**: The gradient IS the visual anchor of Home. It replaces a "flat card with border" (weak) with "one big moment" (strong). The pattern is used ONCE per screen. Don't add a second gradient card — it dilutes.

Reuse target on other screens:
- **Arena**: momentum score as the gradient hero (score number instead of ₹)
- **My Space**: countdown to next shift as the gradient hero (time instead of ₹)
- **Explore / Jobs**: no gradient hero — those screens don't have a single number worth glorifying

### 3. Bento stat cards (two-up)

Two `flex: 1` cards side by side, `gap: S.sm`, both with `SHADOW.card`. Each has:
- Small tracked uppercase label at top
- Icon or emoji top-right
- Big number (`rf(26)`)
- Small foot text (`rf(11)`)

This is the go-to layout for **"two related stats"** — always cheaper than a wide card + inline stats, and it thumb-scans better.

Reuse target:
- **Arena**: 2-up bento of "Weekly delta" + "Percentile"
- **My Space**: 2-up bento of "Next shift" + "Payout"

### 4. The clean search bar

- White fill + `SHADOW.sm` (barely-there lift)
- Small icon inside a rounded chip on the left
- Placeholder text in `T.textSub`
- **No border** — this is the biggest visible difference vs the old design

Reuse target: any screen with search (Jobs, Applicants, contacts) — same recipe.

### 5. Category tiles

- 2×3 grid, each tile `flex: 1` roughly ((100 - 6) / 3)%
- Each tile is a square white card with `SHADOW.card`
- Icon inside a **solid colored square** (from `CategoryColors[category]`) with white icon glyph
- Label below the icon square, left-aligned, `rf(11)` bold

**Key trick**: the tiles are white; the color comes from the small icon square inside. This keeps the grid rhythmic (all white cards) while giving each tile a distinct color mark. Was previously colored-fill tiles which fought each other visually.

Reuse target:
- **Jobs filter modal**: same tile shape for category filters
- **Post gig category picker**: same

### 6. Horizontal-scroll card row

```tsx
<ScrollView horizontal contentContainerStyle={{
  paddingHorizontal: S.lg,
  gap: S.sm,
}}>
  {items.map(...)}
</ScrollView>
```

- `paddingHorizontal: S.lg` on `contentContainerStyle` (not on the ScrollView itself) so the first card starts at the screen edge visually and last card can bounce
- `gap: S.sm` for consistent card-to-card spacing
- No pagination indicator dots — modern apps let the row bleed off-screen as the affordance

Card widths that work well:
- `rw(240)` for hot-gig cards (dense content)
- `rw(260)` for event cards (looser)

### 7. Hot gig card

Structure inside a `SHADOW.card` white surface:
- Header row: colored dot + category name (small uppercase)
- Title (`rf(15)`, bold, 2-line)
- Pay in **primary color** (money = brand)
- Footer meta row: date · city
- Hairline divider (`StyleSheet.hairlineWidth`, `T.border`)
- Host row: initial-circle avatar in `T.primary` + host name + verified check in `T.success`

**Key restraint**: the OLD design had a colored strip across the top of the card (band); we removed it because it looked like an alert banner. Now the "category-ness" comes from a small dot + label. Much cleaner.

### 8. Event card

- Solid colored badge at top (`backgroundColor: T.tertiary`), white text, rounded pill
- Title
- Meta line (date · city)
- Optional bottom pill: "N open jobs"

The event badge is the only place a "filled colored pill with white text" pattern appears on this screen — reserving it for events makes them stand out at a glance.

### 9. Section header

Consistent recipe used everywhere:
```
🔥  Hot gigs                              See all →
```
- Emoji + double-space + title (or no emoji)
- Title `rf(17)` bold, tracking `-0.3`
- "See all →" in `T.primary` (right-aligned)
- Uses `hitSlop={8}` for a bigger tap target than the visible link

### 10. Pull-to-refresh

`<RefreshControl tintColor={T.primary}>` on the ScrollView. Handler calls `loadAll()` which parallel-fetches every store's data. Users learn to yank down when they want fresh matches.

## Data hooks used

- `useAuthStore((s) => s.profile)` — greeting name + streak count (streak_count lives on profile, NOT on badgeStore)
- `useMomentumStore` — `myMomentum` + `fetchMyMomentum`
- `useEarningsStore` — `summary` (has `this_week` + `week_gig_count` + `next_payout_date`) + `fetchSummary`
- `useGigStore` — `gigs` + `isLoading` + `fetchGigs` + `hosts` (keyed by `poster_id`)
- `searchJobs({ type: "events", limit: 6 })` — direct API call for events, kept in local state

## Gotchas encountered while building

- **`useBadgeStore().streak` doesn't exist** — streak lives on `profile.streak_count`. Two of us have hit this now; add a `streak` selector to the store if you touch it.
- **`useMomentumStore().worker` doesn't exist** — it's `useMomentumStore().myMomentum?.worker`.
- **`useEarningsStore().fetch` doesn't exist** — the method is `fetchSummary`.
- **`fetchGigs()` signature** — takes `(filters?, location?, sort?)`, not `{ limit: N }`.
- **`matchedGigs` is `Gig[]`, not `MatchedGig[]`** — the store returns the fuller Gig shape. Host info is on a separate `.hosts` map, keyed by `poster_id`.

Save yourself the type errors — these bit me on every store I touched.

## Files worth reading before touching another screen

- [`constants/colors.ts`](../../frontend/pocket/constants/colors.ts) — palette derivation logic
- [`constants/design.ts`](../../frontend/pocket/constants/design.ts) — spacing / radius / shadow tokens
- [`constants/palettes.ts`](../../frontend/pocket/constants/palettes.ts) — the master color controller
- The Home tab itself: [`app/(main)/(tabs)/home.tsx`](../../frontend/pocket/app/(main)/(tabs)/home.tsx)
