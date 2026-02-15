# Kriya - Open Questions

**Last Updated:** 2026-02-14

## Product Questions

### P1: Momentum Decay
**Question:** Should momentum decay over long inactivity periods?
**Options:**
- A) No decay ever (current design)
- B) Decay after 90 days inactivity
- C) Seasonal reset with legacy tier preservation
**Status:** Deferred to post-launch analysis

### P2: Gig Payment Handling
**Question:** How do we handle payment between users?
**Options:**
- A) Fully off-platform (users arrange payment)
- B) Escrow system (Kriya holds payment)
- C) Hybrid (escrow optional, incentivized)
**Status:** Starting with Option A, escrow planned for v2
**Assumption:** Initial launch uses off-platform payment

### P3: Dispute Resolution
**Question:** How are disputes handled?
**Options:**
- A) Manual review by support team
- B) Community arbitration (high-momentum users)
- C) Automated rules + escalation
**Status:** Starting with Option A
**Assumption:** Manual support for MVP

### P4: Geographic Scope
**Question:** Single city launch or multi-city?
**Options:**
- A) Single city (Bangalore)
- B) Multi-city from start
**Status:** TBD based on go-to-market strategy
**Assumption:** Building for multi-city, launching Bangalore first

### P5: Check-in Verification
**Question:** How do we verify workers actually showed up?
**Options:**
- A) GPS check-in at venue (automatic)
- B) QR code scan by poster/manager
- C) Manual confirmation by poster
- D) Combination of above
**Status:** TBD
**Assumption:** Starting with poster confirmation, GPS later

### P6: College Verification
**Question:** How to verify college students?
**Options:**
- A) College ID photo upload + manual review
- B) College email verification
- C) Partnership with colleges
- D) Trust-based (verify after first gig)
**Status:** TBD
**Assumption:** ID upload for MVP, faster options later

### P7: Team Gigs
**Question:** How to handle "bring your friends" scenarios?
**Options:**
- A) Individual applications only
- B) Allow group applications (apply as team)
- C) Referral bonus for bringing friends
**Status:** TBD
**Assumption:** Individual for MVP, team feature later

### P8: Multi-Day Event Handling
**Question:** For 3-day events, is it one gig or three?
**Options:**
- A) Single gig with date range
- B) Separate gig per day
- C) Parent gig with child shifts
**Status:** Leaning towards Option A
**Assumption:** Single gig with date range for simplicity

---

## Technical Questions

### T1: Realtime Updates Scope
**Question:** What needs realtime updates?
**Current Decision:**
- Gig applications (poster sees new applications live)
- Chat messages (future)
**Deferred:**
- Gig feed updates (polling acceptable)

### T2: Offline Support
**Question:** How much offline support for MVP?
**Current Decision:** Read-only offline not in MVP
**Future:** Cache recent gigs, queue actions for sync

### T3: Push Notification Provider
**Question:** Which push notification service?
**Options:**
- A) Expo Push Notifications
- B) Firebase Cloud Messaging
- C) OneSignal
**Status:** Starting with Expo Push (simpler), migrate if needed
**Assumption:** Expo Push for MVP

### T4: Location Services
**Question:** How to handle location?
**Current Decision:**
- Expo Location for device location
- Store as lat/lng in database
- Reverse geocoding via free tier (Nominatim)
**Assumption:** No paid geocoding service for MVP

### T5: Image Storage
**Question:** Avatar and gig image handling?
**Current Decision:**
- Supabase Storage
- Client-side compression before upload
- Max 1MB per image
**Assumption:** Supabase Storage adequate for MVP scale

---

## Design Questions

### D1: Onboarding Length
**Question:** How much info to collect during onboarding?
**Current Decision:** Minimal (name, location)
**Rationale:** Reduce friction, collect more later

### D2: Gig Categories
**Question:** How many categories for launch?
**Current Decision:** 10 categories (see domain_model.md)
**Open:** Should users suggest new categories?

### D3: Search Filters
**Question:** What filters for gig search?
**Current Decision:**
- Category
- Pay range
- Distance
- Time (today, this week, anytime)
**Deferred:** Advanced filters, saved searches

---

## Assumptions Log

| ID | Assumption | Impact if Wrong |
|----|------------|-----------------|
| A1 | Users have reliable phone numbers | Core auth breaks |
| A2 | Off-platform payment acceptable for MVP | User trust issues |
| A3 | Single city launch | May need multi-city infra earlier |
| A4 | Light mode sufficient for launch | Accessibility complaints |
| A5 | 10 categories cover main use cases | User frustration, wrong category use |

---

## Resolution Log

| Date | Question | Resolution |
|------|----------|------------|
| 2026-02-14 | App focus | Event staffing & brand activation (NOT home services) |
| 2026-02-14 | Target users | College students (18-25), young professionals (25-30) |
| 2026-02-14 | Initial city | Bangalore |
| 2026-02-14 | Payment MVP | Off-platform (users arrange payment directly) |

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-14 | Initial open questions documented |
| 2026-02-14 | Added event-specific questions (check-in, college verification, team gigs, multi-day) |
