# Kria - Reputation System

**Last Updated:** 2026-02-14

## Philosophy

Dual reputation prevents exploitation. A user's behavior as a worker is tracked separately from their behavior as a poster. This creates accountability on both sides.

---

## Dual Reputation Model

### Worker Reputation
Measures how reliable/effective someone is when DOING gigs.

**Factors:**
- Ratings received from posters (primary)
- Gig completion rate
- On-time arrival rate
- No-show history
- Dispute outcomes

### Poster Reputation
Measures how fair/reliable someone is when POSTING gigs.

**Factors:**
- Ratings received from workers (primary)
- Payment reliability
- Accurate gig descriptions
- Communication responsiveness
- Cancellation rate

---

## Rating Calculation

### Formula (Weighted Average)
```
reputation = (
  (sum_of_ratings * 0.7) +
  (completion_rate * 0.2) +
  (reliability_score * 0.1)
) / normalization_factor
```

### Initial State
- New users start with `null` reputation (not 0, not 5)
- Display as "New" until 3 completed interactions
- First 3 ratings weighted more heavily

### Rating Windows
- Ratings can only be submitted within 7 days of gig completion
- Both parties must rate for full momentum bonus
- Ratings are revealed simultaneously (blind)

---

## Reputation Tiers

| Score | Label | Visual |
|-------|-------|--------|
| null | New | Gray badge |
| 0.0 - 2.4 | Needs Work | Red indicator |
| 2.5 - 3.4 | Average | Yellow indicator |
| 3.5 - 4.4 | Good | Green indicator |
| 4.5 - 5.0 | Excellent | Gold indicator |

---

## Trust Score (Combined)

For matching algorithms, we compute a trust score:

```
trust_score = (
  worker_reputation * 0.5 +
  poster_reputation * 0.3 +
  account_age_factor * 0.1 +
  verification_bonus * 0.1
)
```

Where:
- `account_age_factor` = min(1.0, days_since_signup / 180)
- `verification_bonus` = 1.0 if verified, 0.0 otherwise

---

## Reputation Protection

### Against Revenge Ratings
- Blind reveal prevents tit-for-tat
- Outlier detection flags suspicious patterns
- Users can dispute with evidence

### Against Rating Manipulation
- One rating per gig per party
- Cannot rate yourself
- Minimum gig value threshold for rating weight

---

## Reputation Recovery

Users with low reputation can recover:
1. Complete gigs successfully (new ratings dilute old)
2. Maintain streak of positive interactions
3. No fast-track purchase option (aligns with momentum philosophy)

---

## Display Rules

- Always show both reputations on profile
- Context-aware highlighting:
  - On gig posting: emphasize poster reputation
  - On gig application: emphasize worker reputation
- Show rating count alongside score

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-14 | Initial reputation system designed |
