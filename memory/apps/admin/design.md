---
name: admin-design
description: Visual design system and per-section UI spec for the Admin Dashboard — Dark Ops aesthetic, icon rail nav, bento overview, band-colored user table, kanban verification queue
metadata:
  type: project
---

# Admin Dashboard — Design Schema

## Overall Aesthetic: "Dark Ops"

Feels like a real ops command center. Denser and darker than Grid.

- **Background:** `#080808` (deeper than Grid's `#0e0e0e`)
- **Surface / cards:** `#111111`
- **Sidebar rail bg:** `#161616`
- **Border:** `rgba(255,255,255,0.06)`
- **Primary accent:** `#D4FF00` (lime) — used aggressively: glowing borders, pulsing dots, number highlights
- **Warning:** `#FFC83D` (amber) — tickets, pending verifications, queue age
- **Critical / error:** `#ff7351` (red) — failed verification, suspended users, system down
- **Healthy / success:** `#D4FF00` (lime) or `#4ade80` (green) for system pings

## Typography

| Use | Font | Style |
|-----|------|-------|
| Data values, counts, IDs, times | JetBrains Mono (Google Fonts) | monospace |
| UI labels, nav, headings, body | Space Grotesk | existing |
| Section kickers | Space Grotesk 700 + wide tracking | UPPERCASE |

Add to `layout.tsx`:
```tsx
import { JetBrains_Mono } from "next/font/google";
const jetbrainsMono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });
```
Use via `font-[family-name:var(--font-mono)]` or `className="font-mono"` with Tailwind `fontFamily` config.

## Lime Glow Values

```css
/* Subtle hover */
box-shadow: 0 0 16px rgba(212,255,0,0.12);
/* Critical tile pulse */
box-shadow: 0 0 32px rgba(212,255,0,0.22);
/* Amber warning glow */
box-shadow: 0 0 24px rgba(255,200,61,0.18);
/* Red critical glow */
box-shadow: 0 0 24px rgba(255,115,81,0.20);
```

---

## Navigation: Icon Rail (48px)

No wide sidebar. A 48px icon-only fixed rail on the left.

- **Hover icon** → tooltip label appears (right side of icon)
- **Active icon** → lime left border + icon turns lime
- **Bottom** → avatar initial (lime circle, 28px) + tiny `ADMIN` label below
- No labels rendered in the rail itself — all space goes to content

```
┌────┐
│ ⊞  │  ← Overview (LayoutDashboard)
│ 👥 │  ← Users
│ 🎫 │  ← Support Tickets
│ 🛡  │  ← Verification Queue
│ 📋 │  ← Gigs
│ ⚡ │  ← Momentum
│ 💳 │  ← Subscriptions
│ ❤️  │  ← System Health
│    │
│ VS │  ← Admin avatar + "ADMIN" label
└────┘
```

---

## Overview — "Command Center"

### System Status Strip (top of page)
```
● API LIVE   ● DB LIVE   ● INSPECTOR LIVE   17 Jun 2026 · 14:32:07
```
- Dots pulse slowly (CSS `@keyframes pulse`) when healthy
- Turn red + stop pulsing on failure
- Live clock ticks with `setInterval` every second
- Located in top-right of the page header area

### Bento Metric Grid

Tiles arranged in an asymmetric bento layout (mix of 1×1 and 2×1 tiles). Each tile:
- Large JetBrains Mono number (counts up on mount via animation)
- Small Space Grotesk label in `text-text-muted`
- 7-day sparkline (pure SVG `<polyline>`, no chart library)
- Sub-label: `+12 today` or `↑8 this week`

**Tile glow rules:**
- Default: neutral dark (`#111111` bg, no glow)
- Open tickets > 0: amber breathing glow
- Pending verifications > 0: amber breathing glow
- Trials expiring ≤7d > 0: amber breathing glow
- System down: red glow on affected status dot

```
┌─────────────────┬─────────────────┬─────────────────────────────┐
│  2,841          │  134            │  ████░░░░  2,201 / 640      │
│  TOTAL USERS    │  ACTIVE GIGS    │  RUNNERS   HOSTS            │
│  +12 today      │  ↑8 this week   │  [sparkline]                │
├─────────────────┴─────────────────┤                             │
│  [7-day user growth sparkline]    ├─────────────────────────────┤
│  ───────────╱───                  │  7    OPEN TICKETS  ← glow  │
└───────────────────────────────────┴─────────────────────────────┘
┌─────────────────┬─────────────────┬─────────────────────────────┐
│  3              │  12             │  89%                        │
│  PENDING VERIFY │  EXPIRING SOON  │  GIG FILL RATE              │
│  ← amber glow  │  trials ≤7d     │  this month                 │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

---

## Users — Band-DNA Table

Full-width table. **3px left border on each row = user's momentum band color.**

| Col | Content |
|-----|---------|
| Band strip (3px) | Color of momentum band (grey/orange/cobalt/amber/lime/white) |
| Name | `first_name last_name` |
| Role | `Runner` / `Host` chip |
| City | text |
| Joined | `12 Mar 2026` (Space Grotesk) |
| Momentum | 80px mini progress bar in band color + score in JetBrains Mono |
| Verified | shield icon (lime = verified, grey = not) |
| Status | green dot = active, red dot = suspended |
| Actions | `···` opens inline dropdown: View / Suspend / Delete |

**Hover row:** row bg lifts to `#161616`, band border glows slightly.

**Click row → right-side drawer slides in** (no page nav, `transform: translateX` animation):
- Tabs: Profile / Momentum / Gigs / Verification / Subscription
- Each tab loads content inline
- Drawer width: 480px
- Actions at drawer bottom: Suspend/Reactivate · Set Verified · Adjust Momentum · Delete

**Momentum adjustment modal:**
- Opens from drawer
- Input: delta value (+ or -) + reason text
- Logs to `momentum_events` with `event_type = "admin_adjustment"`

---

## Verification Queue — Kanban

Three columns: **Pending** · **Processing** · **Approved / Failed**

Each card shows:
- User avatar initial (circle in band color)
- Name + ID type chip (`AADHAAR`, `PAN`, etc. in monospace)
- Time in queue (ticking live via `setInterval`, amber if > 1h)

**Card border colors:**
- Pending: `#FFC83D` amber left border
- Processing: `#8097ff` cobalt pulsing left border (CSS animation)
- Failed: `#ff7351` red left border + error code chip in monospace (`FACE_SPOOF_DETECTED`)
- Approved: `#D4FF00` lime left border (faded, 60% opacity)

**Hover card → inline action buttons appear:**
- Pending: Re-queue
- Processing: (no action — in flight)
- Failed: Re-queue / Manual Approve
- Approved: (no action)

---

## Support Tickets — Split Panel

**Left 40%:** Scrollable ticket list.
- Each row: colored category dot · subject · submitter name · `2h ago` · status chip
- Status chips: `OPEN` (lime), `IN PROGRESS` (amber), `RESOLVED` (grey)
- Category dot colors (7 categories, each distinct):
  - Gig Posting: `#8097ff` cobalt
  - Runner & Applications: `#D4FF00` lime
  - Payments & Billing: `#FFC83D` amber
  - Account & Profile: `#60a5fa` blue
  - Bug Report: `#ff7351` red-orange
  - Feature Request: `#a78bfa` purple
  - Other: `#777575` grey

**Right 60%:** Selected ticket detail.
- Full message in a dark card (`#111111`)
- Submitter email (JetBrains Mono)
- `<textarea>` for admin reply note
- `Mark Resolved` button → turns lime on success, sends Resend email

**Empty state (no ticket selected):** large faded `SELECT A TICKET` text centered, dot-grid pattern background (CSS `radial-gradient` dots).

---

## System Health — Radar Rings

Three large circular status indicators:

```
     ◎ API              ◎ DATABASE         ◎ INSPECTOR
   24ms avg           8ms avg            3 queued
  OPERATIONAL        OPERATIONAL        OPERATIONAL
```

Each ring:
- Outer ring slowly rotates a lime arc highlight (`@keyframes rotate`) when healthy
- Stops + turns red when ping fails
- Center: `✓` (lime) or `✗` (red)
- Below ring: last response time in JetBrains Mono

Below all three rings: **60-second rolling terminal log** — tiny monospace lines ticking in from bottom:
```
14:32:07  API       200  24ms  ✓
14:32:07  DB        OK   8ms   ✓
14:32:07  Inspector OK   3q    ✓
14:32:17  API       200  31ms  ✓
```
Max 20 lines shown; oldest scroll off top.

---

## Momentum Leaderboard

Large faded rank numbers on left (JetBrains Mono, `01`, `02`...). Columns:
- Rank (faded, monospace)
- Avatar initial (circle in band color)
- Name + city
- Score (JetBrains Mono, large, colored in band color)
- Band chip
- Trend arrow (↑ lime / ↓ red vs last week)

**Top 3 rows:** very subtle gold/silver/bronze bg tint (3–4% opacity).

**Band filter bar:** All · Newcomer · Building · Reliable · Trusted · Elite · Legend. Selecting a band fades non-matching rows to 30% opacity.

---

## CSS / Implementation Notes

- Use `CSS @keyframes` for: status dot pulse, ring rotation, amber warning glow breathe
- Sparklines: pure `<svg><polyline>` — no chart library, just normalize values to 0–40px height
- Number count-up: `useEffect` with `requestAnimationFrame` for ~600ms duration
- Drawer slide-in: `transition: transform 300ms cubic-bezier(0.16, 1, 0.3, 1)`
- All layout uses CSS Grid / Flexbox — no UI component library
- No light mode for admin (dark only, internal tool)
- JetBrains Mono loaded via `next/font/google`, CSS var `--font-mono`
