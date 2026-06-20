---
name: Todo & Open Issues
description: Current backlog, open bugs, and testing checklists
type: project
---

# Todo & Open Issues

Last updated: 2026-06-20

## Backend Optimisation Backlog

Audited 2026-05-30. Fix in priority order.

### Critical (blocks scale)

| # | Issue | File | Fix |
|---|-------|------|-----|
| B1 | `sync_all_badges()` fires on every `GET /badges/me` — 700k+ wasted writes/day at 10k DAU | `services/badge_service.py`, `routers/badges.py` | Remove from GET handler; trigger only from `check_gig_badges()` on gig complete + `check_id_badges()` on ID verified |
| B2 | Momentum recalculated 3× per gig completion (OTP verify + no-show + rating), each running all 5 signals sequentially | `routers/applicants.py`, `momentum/recalculate.py` | Debounce / batch; call once after all events settle |
| B3 | `_fetch_open_gigs()` loads **all** open gigs into Python memory, filters in code | `recommendations/engine.py` | Push filters (category, city, excluded_ids, date) into SQL with WHERE + LIMIT |
| B4 | 7–8 sequential DB queries per `/gigs/match` request (worker context, avg pay, poster ratings, poster scores) | `recommendations/engine.py` | Parallelise with `asyncio.gather()` |

### Medium (noticeable at moderate load)

| # | Issue | File | Fix |
|---|-------|------|-----|
| B5 | Missing index on `gig_assignments(worker_id, status)` — full scan on every signal compute | migration needed | Add composite index in next migration |
| B6 | Missing index on `ratings(ratee_id, rating_type)` — full scan for 3 rating-based signals | migration needed | Add composite index in next migration |
| B7 | `pool_size` left at SQLAlchemy default (5) — will exhaust connections at ~50 concurrent requests | `db/session.py` | Set `pool_size=20, max_overflow=40` |
| B8 | `SELECT *` in momentum router + recalculate + profiles — fetches 20–30 columns when 4–6 needed | `momentum/router.py`, `momentum/recalculate.py`, `routers/profiles.py` | Select only required columns |
| B9 | Correlated subquery per event row in search (`SELECT COUNT(*) FROM gigs WHERE event_id = e.id`) | `routers/search.py` | Replace with LEFT JOIN + GROUP BY |

### Low (nice to have)

| # | Issue | File | Fix |
|---|-------|------|-----|
| B10 | Duplicate rating pre-check SELECT before INSERT — UNIQUE constraint already handles it | `routers/ratings.py` | Remove pre-check query |
| B11 | `_poster_momentum_scores()` fetched but `poster_score` never used in `score_gig()` | `recommendations/engine.py` | Remove dead query |
| B12 | `momentum_profiles` INSERT race on new users — INSERT logic duplicated in router + recalculate | `momentum/router.py`, `momentum/recalculate.py` | Centralise with `INSERT ... ON CONFLICT DO NOTHING` at first login |
| B13 | Verification status polled every 5s with no cache/ETag — hits DB on every poll | `routers/profiles.py`, mobile `verify-identity.tsx` | Add short-lived cache or `Last-Modified` header |

---

## High Priority

| Issue | Location | Notes |
|-------|----------|-------|
| **Set up Supabase webhook for email triggers** | Supabase dashboard → Database → Webhooks | Table: `gig_applications`, event: `INSERT`, URL: `https://<api-domain>/api/v1/email/internal/application-created`, Header: `X-Webhook-Secret: <EMAIL_WEBHOOK_SECRET>`. Without this, no application emails fire. |
| Grid Applications: left column not independently scrollable | `grid/app/(dashboard)/applications/page.tsx` | User wants applicant list to scroll while profile card stays in place. Fix: `overflow: hidden` on `main` in layout so inner columns own scroll, or `position: sticky` on profile column. `useLayoutEffect` approach tried and reverted. |
| Pocket EAS build + app store submission | `frontend/pocket/` | See `infra/DEPLOY.md` Section 5. Fast2SMS SMS hook must be configured in production first — see `features/sms_notifications.md`. |
| Fill in OTP template values | `backend/api/app/sms_notifications/templates.py:27-28` | Set `sender_id` and `message_id` on the `"otp"` template entry with real DLT-approved values from Fast2SMS dashboard. |

## Medium Priority

| Issue | Location | Notes |
|-------|----------|-------|
| Show badges on applicant cards (Grid) | `grid/components/applicants/ApplicantProfileModal.tsx` + applicant list rows | Add `BadgeList`/`SingleBadge` equivalents using `verified_id_types` from profile; need Grid badge components |
| Enable anti-spoof in prod | `perceptrons/inspector/docker-compose.yml` env + Kria `docker-compose.dev.yml` | Set `ANTISPOOF_MODEL_ENABLED=True`; test with real selfies first to check for false positives |
| Grid: Host rating form (sub-scores) | Grid gig detail | After gig complete: collect punctuality/communication/professionalism sub-scores when rating runner |
| Chat: receiver real-time broken | `frontend/pocket/app/(main)/chat/[id].tsx` | See `features/chat.md` for investigation steps |
| ~~Grid: Host onboarding flow~~ | ~~`grid/app/(dashboard)/layout.tsx`~~ | ✅ Done 2026-05-28 — `/onboarding` page created, dashboard layout guard added |

## Low Priority

| Issue | Location | Notes |
|-------|----------|-------|
| ~~SVG logo integration (mobile)~~ | ~~`frontend/pocket/assets/`~~ | ✅ Done 2026-06-20 — `logo.svg` converted to PNG assets (icon, adaptive-icon, splash) via ImageMagick; `KriaLogo.tsx` inline SVG component added to Grid |
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
