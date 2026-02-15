# Kriya - Momentum System

**Last Updated:** 2026-02-14

## Philosophy

Momentum is Kriya's non-purchasable reputation currency. It represents genuine platform participation and cannot be gamed through money.

## Core Rules

### Rule 1: Momentum Cannot Be Purchased
- No INR → Momentum conversion exists
- No premium features that grant Momentum
- Only earned through platform actions

### Rule 2: Momentum Has Utility
- Spend to boost gig visibility
- Spend to reduce platform fees
- Higher momentum = better matching priority

### Rule 3: Momentum Is Transparent
- All earning rules visible to users
- All spending rates visible
- Transaction history always accessible

---

## Earning Momentum

| Action | Momentum Earned | Conditions |
|--------|-----------------|------------|
| Complete gig (as worker) | +50 | Base amount |
| 5-star rating received (as worker) | +20 | Per rating |
| 4-star rating received (as worker) | +10 | Per rating |
| Complete gig (as poster) | +30 | When gig completes successfully |
| 5-star rating received (as poster) | +15 | Per rating |
| First gig completion | +100 | One-time bonus |
| 7-day streak (any activity) | +25 | Weekly bonus |
| Reliability bonus | +10 | Show up on time, complete as promised |
| Referral gig completion | +50 | When referred user completes first gig |

### Earning Caps (Anti-Gaming)
- Max 500 momentum per day
- Max 3,000 momentum per week
- Prevents automated/fake activity abuse

---

## Spending Momentum

| Action | Momentum Cost | Effect |
|--------|---------------|--------|
| Boost gig (Level 1) | 50 | 2x visibility for 24 hours |
| Boost gig (Level 2) | 150 | 5x visibility for 48 hours |
| Boost gig (Level 3) | 400 | 10x visibility for 72 hours + featured |
| Reduce platform fee | 100 | 1% fee reduction on next gig |
| Priority matching | 75 | Appear first in worker recommendations |

---

## Momentum Tiers (Future)

| Tier | Momentum Range | Perks |
|------|----------------|-------|
| Newcomer | 0 - 99 | Standard features |
| Active | 100 - 499 | Badge displayed |
| Trusted | 500 - 1,499 | Trusted badge, priority support |
| Champion | 1,500 - 4,999 | Champion badge, early access features |
| Legend | 5,000+ | Legend badge, community council eligibility |

---

## Decay Rules (Future Consideration)

- Momentum does NOT decay passively
- Only lost through negative actions:
  - No-show as worker: -100
  - Cancelled gig (as poster, worker already assigned): -50
  - 1-star rating received: -25

---

## Implementation Notes

- All momentum operations are transactional
- Balance cannot go negative
- Spending requires balance >= cost
- All transactions logged with timestamps

---

## Open Questions

1. Should momentum decay over long inactivity periods?
2. Seasonal momentum events?
3. Momentum gifting between users?

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-14 | Initial momentum system designed |
