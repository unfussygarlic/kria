"""
Momentum System Configuration
==============================
Single source of truth for all Momentum weights, penalties, and band thresholds.
Momentum is a Runner-only metric (0–1000). Hosts receive a /10 rating instead.

DESIGN RULES:
- All signal weights must sum to 100 (makes reasoning about max score straightforward).
- Only include signals that can be computed from real DB data — no defaults or placeholders.
- Band thresholds and colors MUST mirror frontend/constants/momentum.ts exactly.
- To change how much a signal matters: change its weight here only.
- To add a signal: add to WORKER_SIGNALS, add to calculator.py, add DB column, update frontend.
"""

from typing import Any

# ── Score scale ───────────────────────────────────────────────────────────────

SCALE: dict[str, int] = {
    "min": 0,
    "max": 1000,
}

CREDIBILITY_THRESHOLD: int = 10  # gigs needed before full weight applies

# ── Band definitions ──────────────────────────────────────────────────────────
# Ordered lowest → highest. Must mirror frontend/constants/momentum.ts.

BANDS: list[dict[str, Any]] = [
    {"key": "newcomer",  "label": "Newcomer",      "min": 0,   "max": 99,   "color": "#777575"},
    {"key": "building",  "label": "Building",       "min": 100, "max": 299,  "color": "#ff7351"},
    {"key": "reliable",  "label": "Reliable",       "min": 300, "max": 499,  "color": "#8097ff"},
    {"key": "trusted",   "label": "Trusted",        "min": 500, "max": 699,  "color": "#FFC83D"},
    {"key": "elite",     "label": "Elite",          "min": 700, "max": 899,  "color": "#D4FF00"},
    {"key": "legend",    "label": "Legend",         "min": 900, "max": 1000, "color": "#ffffff"},
]

# ── Worker signals ────────────────────────────────────────────────────────────
# Weights must sum to 100.
# normalize_max: raw DB value is divided by this to get 0.0–1.0 for computation.
# Signals with no data are excluded from the weighted average (not treated as 0).
# The max achievable score grows as more signals become available:
#   show_rate only            → max 350
#   + on_time_rate            → max 600
#   + performance_score       → max 800
#   + communication_score     → max 900
#   + professionalism_score   → max 1000

WORKER_SIGNALS: dict[str, dict[str, Any]] = {
    "show_rate": {
        "weight": 35,
        "label": "Reliability",
        "description": "How consistently you show up for gigs you've accepted",
        "normalize_max": 1.0,
    },
    "on_time_rate": {
        "weight": 25,
        "label": "Punctuality",
        "description": "How often you arrive at the venue by the report time",
        "normalize_max": 1.0,
    },
    "performance_score": {
        "weight": 20,
        "label": "Work Quality",
        "description": "Average rating given by hosts after working with you",
        "normalize_max": 5.0,
    },
    "communication_score": {
        "weight": 10,
        "label": "Communication",
        "description": "How clearly and promptly you communicate on the job",
        "normalize_max": 5.0,
    },
    "professionalism_score": {
        "weight": 10,
        "label": "Professionalism",
        "description": "Conduct, appearance, and attitude during gigs",
        "normalize_max": 5.0,
    },
}

assert sum(s["weight"] for s in WORKER_SIGNALS.values()) == 100, \
    "Worker signal weights must sum to 100"

# ── Profile completion signals ────────────────────────────────────────────────
# Additive bonus outside the gig credibility formula — allows new runners to
# show non-zero Momentum before completing their first gig.
# Max total is capped at MAX_PROFILE_POINTS (80) to keep new users in the
# Newcomer band (0–99). Every field maps directly to a real profiles DB column.

PROFILE_SIGNALS: dict[str, dict[str, Any]] = {
    "id_verified": {
        "label": "Identity Verified",
        "description": "Government ID verified through the platform",
        "points": 30,
    },
    "skills": {
        "label": "Skills Listed",
        "description": "At least one skill added to your profile",
        "points": 15,
    },
    "bio": {
        "label": "Bio Written",
        "description": "Short introduction written in your profile",
        "points": 10,
    },
    "languages": {
        "label": "Languages",
        "description": "At least one language listed",
        "points": 10,
    },
    "work_experience": {
        "label": "Work Experience",
        "description": "At least one past role added",
        "points": 10,
    },
    "education_entries": {
        "label": "Education",
        "description": "Educational background added",
        "points": 5,
    },
}

MAX_PROFILE_POINTS: int = sum(s["points"] for s in PROFILE_SIGNALS.values())  # 80

# ── Host-collected rating dimensions ─────────────────────────────────────────
# Each dimension maps to a DB column in the `ratings` table.
# `score` (the primary ratings column) is auto-computed as the average of all
# active dimensions. To add a new dimension: add the DB column via migration,
# add an entry here, and optionally add a corresponding signal in signals/.
# The frontend fetches this list dynamically — no frontend changes needed.

RATING_DIMENSIONS: list[dict[str, str]] = [
    {
        "key":      "communication_score",
        "label":    "Communication",
        "question": "How clearly did they communicate during the gig?",
    },
    {
        "key":      "professionalism_score",
        "label":    "Professionalism",
        "question": "How professional was their conduct and appearance?",
    },
    {
        "key":      "punctuality_score",
        "label":    "Punctuality",
        "question": "How well did they manage their time and readiness?",
    },
]

# ── Worker penalties ──────────────────────────────────────────────────────────
# Applied as permanent additions to worker_penalty_points in momentum_profiles.
# These are stored as positive integers; subtracted from score at calc time.

WORKER_PENALTIES: dict[str, int] = {
    "no_show":           100,
    "left_early":         50,
    "late_cancellation":  25,
    "repeated_dispute":   75,
}


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_band(score: int) -> dict[str, Any]:
    """Returns the band dict for the given score (0–1000)."""
    for band in BANDS:
        if band["min"] <= score <= band["max"]:
            return band
    return BANDS[0]  # fallback: newcomer
