---
name: Pocket Revamp — Overview
description: Kick-off doc for the ongoing Pocket redesign. Read this first before touching any screen.
type: project
---

# Pocket Revamp — In Progress (started 2026-08-22)

Progressive redesign of the Pocket app to match a new "premium mobile" visual language. Kicked off after several rounds of feedback where the older design read as templated / heavy-contour / low-craft.

## Status

| Surface | Status | Notes |
|---|---|---|
| Design system foundation (`constants/design.ts` + `constants/palettes.ts` + `constants/colors.ts`) | ✅ done | Shadows / spacing / radius tokens + master color controller |
| Home tab | ✅ done | Reference implementation — mimic this quality bar on other screens |
| Explore tab | 🕐 pending | Swipe deck already OK; just needs palette+shadow refresh |
| Jobs tab | 🕐 pending | Search-first surface |
| My Space | 🕐 pending | Accepted shifts + countdown |
| Arena | 🕐 pending | Momentum score hero |
| Profile / Settings | 🕐 pending | |
| Gig / Event detail | 🕐 pending | |
| Verify identity, Applicants, Badges, Wallet | 🕐 pending | |
| Auth + Onboarding flow | 🕐 pending | |

## Docs in this folder

- [`design-system.md`](design-system.md) — the actual visual language. Read before designing anything.
- [`home-tab-patterns.md`](home-tab-patterns.md) — reference implementation. Every pattern used in Home, why it's there, and how to reuse it.
- [`master-color-controller.md`](master-color-controller.md) — how the `palettes.ts` preset system works. Also lists the presets and how to add a new one.

## The one rule

**No obsidian contours anywhere.** The old design used heavy `borderStrong: rgba(23,18,23,0.85)` outlines on cards, chips, buttons — everything. This is the single biggest source of "unprofessional" complaints. Every card lifts via `SHADOW.card`, not via border. Every chip fills without an outline. Every button is a solid fill.

If you find yourself reaching for `T.borderStrong`, stop — you probably want `...SHADOW.card` on the parent or a solid tint on the child.
