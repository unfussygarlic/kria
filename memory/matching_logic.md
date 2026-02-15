# Kriya - Matching Logic

**Last Updated:** 2026-02-14

## Philosophy

Trust-first matching. Distance is a factor, not THE factor. We prioritize users who have proven reliable over users who are simply close.

---

## Matching Contexts

### 1. Workers Viewing Available Gigs
Show gigs ranked by relevance to the worker.

### 2. Posters Viewing Applicants
Show applicants ranked by fit for the gig.

### 3. System Recommendations
Proactive suggestions for both sides.

---

## Worker → Gig Matching Algorithm

```
gig_score = (
  trust_match * 0.35 +
  distance_score * 0.25 +
  category_match * 0.20 +
  pay_score * 0.10 +
  recency_score * 0.10
)
```

### Trust Match
- Poster's reputation relative to worker's history
- Bonus if previous successful interaction
- Penalty if previous negative interaction

### Distance Score
```
distance_score = max(0, 1 - (distance_km / max_distance_km))
```
- `max_distance_km` = 50 (default, user adjustable)
- Remote gigs get distance_score = 1.0

### Category Match
- 1.0 if worker has completed gigs in this category
- 0.5 if worker has applied to gigs in this category
- 0.2 baseline

### Pay Score
```
pay_score = min(1.0, gig_pay / average_category_pay)
```

### Recency Score
```
recency_score = max(0, 1 - (hours_since_posted / 168))
```
- 168 hours = 7 days

---

## Poster → Applicant Matching Algorithm

```
applicant_score = (
  worker_reputation * 0.40 +
  category_experience * 0.25 +
  reliability_score * 0.20 +
  response_time * 0.10 +
  momentum_tier * 0.05
)
```

### Category Experience
- Number of completed gigs in same category
- Normalized to 0-1 scale

### Response Time
- How quickly applicant typically responds to assignments
- Faster = higher score

### Momentum Tier
- Small bonus for high-momentum users
- Prevents momentum from dominating

---

## Boost Effects

When poster spends momentum to boost:
- Gig appears higher in worker feeds
- Multiplier applied to recency_score:
  - Level 1: 2x
  - Level 2: 5x
  - Level 3: 10x

---

## Previous Interaction Bonus

```
if (worker previously completed gig for poster successfully):
  trust_match += 0.3
if (poster previously hired worker successfully):
  applicant_score += 0.2
```

---

## Blacklist/Preference System (Future)

- Users can "prefer" others (weighted bonus)
- Users can "avoid" others (excluded from results)
- Mutual avoidance = permanent exclusion

---

## Geographic Considerations (India-Specific)

- Dense urban: max_distance default = 15km
- Suburban: max_distance default = 30km
- Rural: max_distance default = 50km
- Auto-detect based on location density

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-14 | Initial matching logic designed |
