# Kria — Product Overview

## What is Kria?

Kria is a **gig marketplace** connecting short-term gig workers with businesses and event organisers in India. Workers browse and apply to gigs via swipe; hosts post gigs and manage their workforce via a dashboard.

## India-First

- **Currency:** INR (₹) — never USD
- **Locations:** Indian cities only (Mumbai, Bengaluru, Delhi NCR, Hyderabad, Chennai, Pune, etc.)
- **Phone numbers:** +91 format
- **Mock data:** Always use Indian names, cities, pay rates in ₹

## Products

| Product | URL | Audience | Status |
|---------|-----|----------|--------|
| Mobile app | Expo Go / App Store | Runners | Live (Runner-only, Host hidden) |
| Grid dashboard | grid.trykria.com | Hosts | Built, not yet deployed |
| Landing page | trykria.com | Waitlist | Live on Vercel |

## Terminology (CRITICAL)

| UI label | Means | Notes |
|----------|-------|-------|
| **Runner** | Gig worker — finds and applies to gigs | Used everywhere in UI |
| **Host** | Gig poster — posts gigs, hires Runners | Used everywhere in UI |

**Rules:**
- Never use "Poster", "Seeker", or "Finder" in any new UI string
- Backend field names (`poster_id`, `poster_rating`, `ratingType: "poster_rating"`) are intentionally unchanged — do not rename them
- All UI strings live in `frontend/pocket/constants/labels.ts` → `L.*` constants

## Role Architecture

Users are **Runner** or **Host**. Currently:
- Runners use the mobile app exclusively
- Hosts use Grid (webapp) exclusively
- The Host experience in mobile is code-complete but hidden behind `SHOW_HOST_ROLE = false` flags

## Session-Scoped Role

`authStore.activeRole: "runner" | "host" | null` — stored in memory only, cleared on sign-out. To switch roles: sign out and sign back in. Role is not stored in the database.
