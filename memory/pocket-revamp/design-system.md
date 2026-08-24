---
name: Pocket Design System (2026-08-22)
description: The visual language every Pocket screen redesign must follow.
type: project
---

# Pocket Design System

The system that replaces the old obsidian-outline pattern. Every redesigned screen imports from three files:

```ts
import { T, CategoryColors } from "@/constants/colors";  // palette tokens
import { S, R, SHADOW } from "@/constants/design";       // spacing / radius / shadow
import { rf, rw } from "@/constants/responsive";         // dp-aware sizing
```

## The core principles

1. **Cards lift with shadows, not lines.** Every card gets `...SHADOW.card` spread into its style. Zero visible borders on cards. Ever.
2. **Solid fills, no translucency.** No `rgba(white, 0.7)` overlays for glass. Everything is a solid palette color.
3. **Consistent spacing.** Every margin, padding, and gap uses `S.*`. If you're typing a number, stop and pick a token.
4. **Semantic radius.** Every corner uses `R.*` — `R.card` for cards, `R.chip` for pills, `R.button` for CTAs.
5. **Bold display type for hero data.** Money, streaks, momentum score — huge (`rf(44)+`), tight tracking (`-0.5` to `-1.2`), Comfortaa / SpaceGrotesk 700-800.
6. **One gradient moment per screen.** The earnings card on Home uses the pink → violet accent gradient. Don't add a second — a screen with two gradient heroes looks templated.
7. **Bottom-third anchoring** for primary actions (thumb-friendly).

## Tokens reference

### Spacing scale (`S.*`)

```
xxs     = 4      xs      = 8       sm      = 12
md      = 16     lg      = 20      xl      = 24
xxl     = 32     hero    = 40      section = 48
bigHero = 64
```

**Rules of thumb**
- Padding inside a card: `S.md` (16) or `S.lg` (20)
- Vertical gap between cards in a section: `S.sm` (12)
- Between sections: `S.lg` (20) or `S.xl` (24)
- Screen edge padding: `S.lg` (20)
- Gap between an icon and its label: `S.xxs` or `S.xs`

### Radius scale (`R.*`)

```
chip    = 999    (pill-shaped chips + tags)
button  = 14     (rectangular CTAs)
input   = 14     (form fields, search bars)
card    = 20     (most cards)
hero    = 28     (large hero cards like earnings hero)
avatar  = 999    (circular avatars)
thumb   = 12     (small thumbnails inside cards)
```

### Shadow scale (`SHADOW.*`)

Warm-plum tint (`#3E1230` — matches the blush canvas family). Pure-black shadows read grey on cream and look cheap.

```
sm  → hairline lift (search bar, pills)
md  → default card (aliased to SHADOW.card)
lg  → hero cards, raised elements
xl  → modals, floating action buttons
```

**Dark mode:** all shadows resolve to `NONE` — dark mode uses background lightness stepping instead.

### Palette (`T.*`)

Same shape as before, but light-mode values are now **derived from the active preset** in `constants/palettes.ts`. Key tokens:

- `T.primary` — main brand color (buttons, chips, money)
- `T.tertiary` — secondary accent (event badges, streak)
- `T.text` / `T.textSub` / `T.textMuted` — three-tier text hierarchy
- `T.bg` — page canvas
- `T.surface1` — card fills (almost always white)
- `T.surface2` / `T.surface3` — slightly tinted variants for input backgrounds
- `T.success` — green for money / pay indicators
- `T.border` / `T.borderStrong` — hairlines only (**never use as a visible outline**)

### Category colors (`CategoryColors[category]`)

Vibrant per-category tints. Used for:
- The colored icon square inside a category tile
- The tiny colored dot next to a category label on a gig card
- Any place we need "this is a Hospitality gig" without reading the label

`event_registration` and `booth_staff` slots follow the active preset (they use `preset.primary` / `preset.accent`), so category chips align with the current palette. The rest are stable across presets.

## Component recipes

### Card

```tsx
<View style={{
  backgroundColor: T.surface1,
  borderRadius: R.card,
  padding: S.md,
  ...SHADOW.card,
}}>
  {content}
</View>
```

Never add a `borderWidth` to a card. If it needs more presence, use `SHADOW.lg` instead.

### Primary CTA button

```tsx
<Pressable style={{
  backgroundColor: T.primary,
  paddingHorizontal: S.xl,
  paddingVertical: S.md,
  borderRadius: R.button,
  alignItems: "center",
  ...SHADOW.md,
}}>
  <Text style={{
    fontSize: rf(14),
    fontWeight: "800",
    color: T.textOnPrimary,   // near-black — passes AA on primary
  }}>
    Continue
  </Text>
</Pressable>
```

### Pill chip (filter / status)

```tsx
<View style={{
  paddingHorizontal: S.sm,
  paddingVertical: S.xs,
  borderRadius: R.chip,
  backgroundColor: T.surface2,   // tinted surface — not a colored fill
}}>
  <Text style={{ fontSize: rf(11), fontWeight: "700", color: T.text }}>Today</Text>
</View>
```

**Selected chip:** swap `backgroundColor` to `T.primary`, text to `T.textOnPrimary`. Still no border.

### Bento stat card (two side-by-side)

```tsx
<View style={{ flexDirection: "row", gap: S.sm, paddingHorizontal: S.lg }}>
  {["Momentum", "Streak"].map((label) => (
    <View key={label} style={{
      flex: 1,
      backgroundColor: T.surface1,
      borderRadius: R.card,
      padding: S.md,
      ...SHADOW.card,
    }}>
      <Text style={{ fontSize: rf(10), fontWeight: "800", color: T.textMuted, letterSpacing: 1.2 }}>
        {label.toUpperCase()}
      </Text>
      <Text style={{ fontSize: rf(26), fontWeight: "800", color: T.text, marginTop: S.xs }}>
        —
      </Text>
    </View>
  ))}
</View>
```

### Gradient hero

```tsx
<View style={{ marginHorizontal: S.lg, borderRadius: R.hero, ...SHADOW.lg }}>
  <LinearGradient
    colors={T.gradAccent}
    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
    style={{ borderRadius: R.hero, padding: S.xl, overflow: "hidden" }}
  >
    <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: rf(10), fontWeight: "800", letterSpacing: 1.5 }}>
      THIS WEEK
    </Text>
    <Text style={{ color: "#FFF", fontSize: rf(44), fontWeight: "800", letterSpacing: -1.2 }}>
      ₹4,200
    </Text>
  </LinearGradient>
</View>
```

The `View` wrapper carries the shadow. LinearGradient carries the fill + radius. Don't stack both — some Android versions clip shadows on gradient nodes.

### Search bar

```tsx
<Pressable style={{
  flexDirection: "row",
  alignItems: "center",
  gap: S.sm,
  marginHorizontal: S.lg,
  paddingHorizontal: S.md,
  paddingVertical: S.md,
  backgroundColor: T.surface1,
  borderRadius: R.input,
  ...SHADOW.sm,
}}>
  <View style={{
    width: rw(28), height: rw(28), borderRadius: R.chip,
    backgroundColor: T.surface2, alignItems: "center", justifyContent: "center",
  }}>
    <Feather name="search" size={rw(16)} color={T.text} />
  </View>
  <Text style={{ flex: 1, fontSize: rf(14), color: T.textSub, fontWeight: "500" }}>
    Search gigs, events, roles…
  </Text>
</Pressable>
```

### Section header

```tsx
<View style={{
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  paddingHorizontal: S.lg,
  marginTop: S.lg,
  marginBottom: S.sm,
}}>
  <Text style={{
    fontSize: rf(17),
    fontWeight: "800",
    color: T.text,
    letterSpacing: -0.3,
  }}>
    🔥  Hot gigs
  </Text>
  <Pressable hitSlop={8}>
    <Text style={{
      fontSize: rf(12),
      fontWeight: "700",
      color: T.primary,
    }}>
      See all →
    </Text>
  </Pressable>
</View>
```

## Anti-patterns (things to reject on sight)

- `borderWidth: 1.5, borderColor: T.borderStrong` on any card — use `SHADOW.card` instead
- `backgroundColor: "rgba(255,255,255,0.7)"` — pick a solid palette color
- Hardcoded pixel values (`padding: 14`, `borderRadius: 10`) — use `S.*` / `R.*`
- Multiple gradients on one screen — pick one hero moment
- `#FFFFFF` text on `T.primary` — light-mode primary is not dark enough; use `T.textOnPrimary` (near-black)
- Chunky borders around chips — chips fill or stay flat
- Icons in muted grey — modern apps use `T.text` (near-black) for icons unless the color carries meaning

## Typography — the static schema (`TYPE.*`)

**File:** [`frontend/pocket/constants/design.ts`](../../frontend/pocket/constants/design.ts)

Every text style in the app picks one of the 9 tokens below. **No inline
`fontSize: rf(13)` calls anywhere** — that was the source of the earlier
"tight / cramped / hard to read" complaints. Bumped sizes deliberately
generous for phone-at-arm's-length readability.

```ts
import { TYPE } from "@/constants/design";

<Text style={TYPE.title2}>Hot gigs</Text>
<Text style={[TYPE.body, { color: T.textSub }]}>subtitle</Text>
```

The style objects include `fontFamily` + `lineHeight` + tracking already
tuned. Colors are **not** baked in — every screen picks the right color
from `T.*`.

### The 9-token scale

| Token | Size (dp) | Line height | Weight / Family | Tracking | Use |
|---|---|---|---|---|---|
| `display` | 48 | 54 | 800 / Bold | -1.4 | Hero numbers only — money, momentum score. One per screen max. |
| `title1` | 26 | 32 | 800 / Bold | -0.5 | Screen title (top of page) or bento stat number. |
| `title2` | 20 | 26 | 800 / Bold | -0.3 | Section header ("Hot gigs", "Browse by role"). |
| `title3` | 17 | 23 | 700 / Bold | -0.2 | Card title (gig title, event title). |
| `bodyLg` | 16 | 23 | 500 / Medium | — | Primary body — lead paragraphs, greeting subline, search placeholder. |
| `body` | 14 | 20 | 500 / Medium | — | Default body / meta text — dates, cities, host names, footers. |
| `caption` | 12 | 16 | 500 / Medium | — | Tiny secondary info. Rare — most "small" text should still be `body`. |
| `label` | 11 | 14 | 800 / Bold | +1.3 uppercase | Section eyebrow labels ("THIS WEEK", "EVENT", "MOMENTUM"). |
| `money` | 18 | 22 | 800 / Bold | -0.2 tabular-nums | Inline ₹ amounts on gig cards. Uses `T.primary` color. |

### When to override

You almost never should. If you find yourself needing a size that isn't in
TYPE, the design is off — not the scale. The one legitimate override is
**color**: TYPE tokens don't set color so you always pair with `T.*`.

```tsx
// ✅ Fine — TYPE + palette color
<Text style={[TYPE.body, { color: T.textSub }]}>Bandra, Mumbai</Text>

// ✅ Fine — spreading TYPE, extending with layout
<Text style={{ ...TYPE.title1, marginTop: 2, textTransform: "capitalize" }}>
  {firstName}
</Text>

// ❌ Not fine — bespoke sizing
<Text style={{ fontSize: 15, fontFamily: "Inter_500Medium" }}>...</Text>
```

### Font weight cheat sheet

- Titles & labels always **800** (Inter_700Bold — the file name is 700 but the face is heavy enough for 800 weight semantics)
- Card titles **700** (slightly less loud)
- Body / meta / captions **500** (Medium — comfortable body weight, not thin)

### Content density guidelines (learned from Home)

- **Max one `display` per screen.** Multiple hero numbers dilute each other.
- **Cards get 4-5 lines of content max.** Header row + title + primary fact + meta = the ceiling. If you need more, use a bottom sheet, not a bigger card.
- **Section headers breathe.** `marginTop: S.lg` (20) above, `marginBottom: S.sm` (12) below. Never squish them.
- **Meta rows use `body` (14pt).** Not `caption` (12pt). The "look how much info I fit" temptation is the enemy — readable > compact.
- **Uppercase labels are always `label` (11pt tracked).** Consistency here does more work than you'd expect.

## Fonts loaded in the app

**Inter** (swapped in 2026-08-23 from SpaceGrotesk for CX / readability wins — highest x-height sans-serif, best character disambiguation, best tabular-nums for ₹/OTP/scores).

- `Inter_400Regular` — currently unused; reserved
- `Inter_500Medium` — body / bodyLg / caption
- `Inter_600SemiBold` — reserved for interactive states if needed
- `Inter_700Bold` — title3, title2, label, money, seeAll/foot overrides
- `Inter_800ExtraBold` — display, title1 (hero display type)

Loaded once in `app/_layout.tsx` via `@expo-google-fonts/inter`. Comfortaa is Grid-only and not used in Pocket.

## Checklist for redesigning a screen

Before you commit any redesigned screen, walk through this:

- [ ] No `borderWidth` on any card, chip, or button (except hairline dividers inside cards)
- [ ] Every gap / padding is `S.*` — grep the file for raw numbers in `margin` / `padding` / `gap` styles
- [ ] Every `borderRadius` is `R.*`
- [ ] Every card has `...SHADOW.card` (or `SHADOW.lg` for hero)
- [ ] No `rgba(white, ...)` translucent fills
- [ ] Primary CTAs use `T.primary` fill + `T.textOnPrimary` text (near-black on primary)
- [ ] The screen has ONE hero moment (usually the topmost card), everything below is quieter
- [ ] Icons default to `T.text` unless they carry semantic color
- [ ] Section headers follow the recipe above (17pt, "See all →" in primary color)
- [ ] Sanity-checked in `npx expo start --clear` — StyleSheet caches must clear on redesign
