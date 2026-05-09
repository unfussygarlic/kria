---
name: Todo & Open Issues
description: Current backlog, open bugs, and testing checklists
type: project
---

# Todo & Open Issues

Last updated: 2026-05-09 (session 6)

## High Priority

| Issue | Location | Notes |
|-------|----------|-------|
| Deploy Grid to grid.trykria.com | `grid/` | Run `npm install`, set `NEXT_PUBLIC_API_URL=https://api.trykria.com/api/v1`, deploy to Vercel |
| Grid Applications: left column not independently scrollable | `grid/app/(dashboard)/applications/page.tsx` | User wants applicant list to scroll while profile card stays in place. Current CSS: two-column grid inside a `flex-1` column inside the dashboard layout whose `main` element has `overflow-y-auto`. Inner columns cannot independently scroll because the outer `main` scrolls the page. Fix: either `overflow: hidden` on `main` so inner columns own their own scroll (requires a layout change in `(dashboard)/layout.tsx`), or switch to `position: sticky` on the profile column. A `useLayoutEffect` approach was tried and reverted per user request — pick a different route. |

## Medium Priority

| Issue | Location | Notes |
|-------|----------|-------|
| Show badges on applicant cards (Grid) | `grid/components/applicants/ApplicantProfileModal.tsx` + applicant list rows | Add `BadgeList`/`SingleBadge` equivalents using `verified_id_types` from profile; need Grid badge components |
| Enable anti-spoof in prod | `perceptrons/inspector/docker-compose.yml` env + Kria `docker-compose.dev.yml` | Set `ANTISPOOF_MODEL_ENABLED=True`; test with real selfies first to check for false positives |
| Grid: Host rating form (sub-scores) | Grid gig detail | After gig complete: collect punctuality/communication/professionalism sub-scores when rating runner |
| Chat: receiver real-time broken | `frontend/pocket/app/(main)/chat/[id].tsx` | See `features/chat.md` for investigation steps |
| Grid: Host onboarding flow | `grid/app/(dashboard)/layout.tsx` | Currently assumes profile exists — new Hosts with no mobile profile will have `profile = null` |

## Low Priority

| Issue | Location | Notes |
|-------|----------|-------|
| SVG logo integration (mobile) | `frontend/pocket/assets/` | `Kriya.svg` + `K.svg` exist with viewBox added; try `react-native-svg-transformer` again |
| Date picker text invisible (iOS) | `frontend/pocket/app/(main)/event/create.tsx` | Bug from earlier session, not fixed |
| Host role in mobile | all `SHOW_HOST_ROLE` flags | Future: set to `true` and re-enable mobile Host experience |

## SVG Logo Details

Files: `frontend/pocket/assets/Kriya.svg` (wordmark), `frontend/pocket/assets/K.svg` (icon mark)

viewBox already added:
- `K.svg`: `viewBox="-131 -7 213 153"`
- `Kriya.svg`: `viewBox="-125 -13 206 156"`

Steps to retry:
1. `npm install --save-dev react-native-svg-transformer --legacy-peer-deps`
2. Update `metro.config.js` to transform SVGs
3. Add `declarations.d.ts` for `*.svg` type
4. Create `components/ui/KriaLogo.tsx` + `components/ui/KriaIcon.tsx`
5. Replace text wordmarks in `login.tsx`, `role-select.tsx`, `home.tsx`
6. `npx expo start --clear`

Glow when used: `shadowColor: T.primary`, `shadowOpacity: 0.65`, `shadowRadius: 18`

## Testing Checklist (Mobile)

- [ ] Explore loads gigs, prefetches when ≤10 cards remain
- [ ] Swipe up → applies, card bounces back
- [ ] Swipe left/right → navigates prev/next
- [ ] Home greeting changes by time of day
- [ ] Profile avatar → profile screen with X close button
- [ ] Arena SkillGraph renders with score > 0 for runner with profile data (profile completion bonus)
- [ ] Arena SkillGraph renders for new user — shows profile points only
- [ ] Arena SkillGraph animates data polygon after completing a gig
- [ ] Arena SkillGraph axis count matches signal files (currently 5); changes if file added/removed
- [ ] GET /api/v1/momentum/signals returns all 5 signals with correct key/label/short_label/icon/color
- [ ] Momentum breakdown modal opens on skill graph tap
- [ ] Breakdown shows all gig signal bars (dynamic count from API) + profile completion chips
- [ ] Profile completion chips: earned = lime color, not earned = strikethrough grey
- [ ] Breakdown shows "No data yet" badges for missing gig signals
- [ ] Space tab shows accepted gigs
- [ ] OTP entry in Space tab
- [ ] Sign out → back to login (no stuck navigator)
- [ ] Role-select auto-skips to Runner home
- [ ] Verify Identity: list shows all 5 ID types with correct icons
- [ ] Verify Identity: already-verified IDs show green "Verified" pill (not "Verify" button)
- [ ] Verify Identity: tapping "Verify" opens in-app camera (NOT system camera picker)
- [ ] ID camera: rear camera, rectangle guide + corner brackets
- [ ] Selfie camera: front camera, oval guide, visible area larger than oval
- [ ] Selfie camera: permission gate shows if camera denied
- [ ] Successful verification: correct ID type named in success screen + badge appears in list
- [ ] Failed verification (wrong photos): shows specific failure reason
- [ ] Inspector down: shows "Connection error" (503 handled gracefully)
- [ ] BadgeList shows photo_verified + specific ID badge after verification

## Testing Checklist (Recommendations / Location)

- [ ] Explore: GPS permission prompt appears on first open
- [ ] Explore: if denied, gigs still load (no crash)
- [ ] Grid wizard step 3: "Fetch Location" button appears after venue + city filled
- [ ] Grid wizard: resolved address + coordinates shown after Fetch
- [ ] Grid wizard: resolved address clears when venue or city changed
- [ ] Grid wizard: posting with location → PATCH sets venue_lat/venue_lng/venue_formatted_address in DB
- [ ] Grid wizard: posting without geocode → gig created fine, location columns null
- [ ] Gig detail (mobile): venue row is lime + tappable when coordinates set
- [ ] Gig detail (mobile): venue row is grey + non-tappable for gigs without coordinates
- [ ] Gig detail (mobile): tapping venue opens Google Maps at correct pin
- [ ] Space tab (mobile): accepted gig venue row lime + tappable when coordinates set
- [ ] Space tab (mobile): tapping venue opens Google Maps at correct pin

## Testing Checklist (Grid)

- [x] Login with phone OTP (dev: any number + 123456)
- [x] Dashboard shows stats
- [x] Post a Gig wizard completes → redirects to gig detail
- [x] Gig detail shows applicant list (pending/accepted/all tabs)
- [x] Accept / Reject applicants
- [x] Create Event → redirects to event detail
- [x] Event detail shows job cards
- [x] Analytics page loads with live data
- [x] Dark/Light theme toggle persists across page reloads
- [x] Sidebar nav items: correct colors in both themes
- [x] Applications page shows all applicants grouped by gig
- [x] Applications page: Pending/Accepted/All tabs with correct counts
- [x] Applicant modal: SkillGraph renders in band color
- [x] Applicant modal: signal legend shows bars for data signals, "—" for missing
- [x] Applicant modal: profile completion chips (earned/not earned)
- [x] Applicant modal: Accept/Reject/No-Show actions work
- [x] SkillGraph theme-adaptive (light mode has lighter canvas)
- [ ] Gig detail OTP display (needs accepted applicant via the UI flow)
- [ ] Profile page saves changes
- [ ] Sign out returns to login
