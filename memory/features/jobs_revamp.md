---
name: Jobs (Search) Revamp (2026-08-07)
description: Sort dropdown + applied-status pill + save/bookmark on the Jobs tab (search.tsx / SearchTab.tsx)
type: project
---

# Jobs Revamp (Pocket, 2026-08-07)

## Why

The Jobs tab (`search.tsx` → `<SearchTab />`) had a solid filter modal but was missing three things every job app in the world has ([LinkedIn Jobs](https://www.linkedin.com/blog/member/product/new-job-search-mobile-app), [Indeed](https://apps.apple.com/ca/app/indeed-job-search/id309735670)):

1. **Sort control** — results were always date ASC. No way to see the newest posts or the highest-paying gigs first.
2. **Applied-status indicator on cards** — runners couldn't tell if they had already applied without tapping through to gig detail.
3. **Save/bookmark** — no way to hold on to interesting gigs to review later.

## Shipped

### Sort dropdown (segmented row above results)

Three options: **Soonest** (default, date ASC), **Newest** (date DESC), **Highest pay** (pay_rate DESC). Client-side sort applied to the already-fetched batch — no round trip. Renders as a compact chip row only when there's >1 result.

```tsx
<View style={styles.sortRow}>
  <Text style={styles.sortLabel}>Sort:</Text>
  {SORT_OPTIONS.map((opt) => (
    <Pressable ... style={active ? sortChipActive : sortChip}>...</Pressable>
  ))}
</View>
```

### Applied-status pill on cards

Reuses the existing `gigStore.myApplications` cache — no new fetch. When the current result's ID is in the applied set, renders a lime "Applied" pill next to the type badge.

### Save/bookmark heart

New `frontend/pocket/stores/savedGigsStore.ts` — set of gig IDs persisted to SecureStore. `useSavedGigsStore().toggle(gigId)` from the bookmark icon on each card. Filled lime icon when saved, muted outline when not.

**Not backend-backed yet** — bookmarks live only on the device that saved them. When we build a dedicated "Saved" tab (see Deferred), this graduates to server storage.

## Deferred (intentionally, called out in the audit)

- **Quick-apply from list card** — would need an inline confirmation modal + optimistic UI. Left for a follow-up because the flow spans stores (gigStore.applyToGig, myApplications refetch) and confirmation UX benefits from user testing before shipping.
- **Pay-range filter** — needs a range slider component. `@react-native-community/slider` would work but is a new native dep. Deferred to a slider-heavy round.
- **Distance filter** — needs GPS-gated UX. Currently the tab is intentionally location-agnostic (users get results even without permission). Adding distance means "give us location OR don't filter by it" — extra state to handle.
- **Dedicated Saved tab** — the bookmark set exists; a Saved surface elsewhere (Space? new subtab?) would surface it. Not built yet.
- **"N applicants" social proof / urgency badges** — needs backend to return `applications_count` on `SearchResultItem`.

## Files

- `frontend/pocket/stores/savedGigsStore.ts` — new client-side bookmark store (SecureStore-persisted)
- `frontend/pocket/components/explore/SearchTab.tsx` — sort chips + applied pill + save heart wired into `ResultCard`
