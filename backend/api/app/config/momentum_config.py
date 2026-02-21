"""
Momentum System Configuration
==============================
Single source of truth for all Momentum weights, penalties, and band thresholds.

DESIGN INTENT:
- All weights are relative — the calculator normalizes them automatically.
- To change how much a signal matters: change its weight here.
- To add a new signal: add it here AND in momentum_calculator.py, nowhere else.
- Band thresholds / colors must match frontend/constants/momentum.ts.

DO NOT hardcode any of these values in the calculator or routers.
"""

from typing import Any

# ── Score scale ───────────────────────────────────────────────────────────────

SCALE: dict[str, int] = {
    "min": 300,
    "max": 850,
    "default": 500,
}

# ── Band definitions ──────────────────────────────────────────────────────────
# Ordered from lowest to highest. Must mirror frontend/constants/momentum.ts.

BANDS: list[dict[str, Any]] = [
    {"key": "critical",    "label": "Critical",    "min": 300, "max": 449, "color": "#DC2626"},
    {"key": "developing",  "label": "Developing",  "min": 450, "max": 599, "color": "#F05A28"},
    {"key": "established", "label": "Established", "min": 600, "max": 699, "color": "#FFC83D"},
    {"key": "trusted",     "label": "Trusted",     "min": 700, "max": 799, "color": "#16A34A"},
    {"key": "elite",       "label": "Elite",       "min": 800, "max": 850, "color": "#3B82F6"},
]

# ── Worker signals ────────────────────────────────────────────────────────────
# Weights are relative importance. Higher = more impact on score.
# Signal values at calculation time are all normalized to 0.0–1.0.

WORKER_SIGNALS: dict[str, dict[str, Any]] = {
    "show_rate": {
        "weight": 80,
        "label": "Show-up reliability",
        "description": "How consistently you show up for gigs you accepted",
    },
    "on_time_rate": {
        "weight": 60,
        "label": "On-time rate",
        "description": "How often you arrive at the venue on time",
    },
    "performance_score": {
        "weight": 50,
        "label": "Work quality",
        "description": "Average rating from gig posters who worked with you",
        "normalize_max": 5.0,   # raw value range; divide by this to get 0–1
    },
    "response_rate": {
        "weight": 30,
        "label": "Response reliability",
        "description": "How quickly you respond to gig offers and messages",
    },
    "consistency_score": {
        "weight": 30,
        "label": "Recent consistency",
        "description": "Stability of performance across recent gigs",
    },
}

# ── Worker penalties ──────────────────────────────────────────────────────────
# Applied as direct score deductions (negative integers).

WORKER_PENALTIES: dict[str, int] = {
    "no_show":           -60,
    "left_early":        -25,
    "late_cancellation": -20,
    "repeated_dispute":  -40,
}

# Max score gain from a single clean gig (prevents farming)
WORKER_MAX_PER_GIG: int = 8

# How many gigs before full credibility weight kicks in
# Below this threshold, the credibility multiplier < 1.0 keeps new users at ~500.
WORKER_CREDIBILITY_GIGS: int = 10

# ── Poster signals ────────────────────────────────────────────────────────────

POSTER_SIGNALS: dict[str, dict[str, Any]] = {
    "payment_rate": {
        "weight": 100,
        "label": "Payment consistency",
        "description": "Track record of paying workers fully and on time",
    },
    "poster_rating": {
        "weight": 50,
        "label": "Poster rating",
        "description": "Average rating received from workers after gigs",
        "normalize_max": 5.0,
    },
    "accuracy_rate": {
        "weight": 40,
        "label": "Posting accuracy",
        "description": "How accurately your gig descriptions match the actual work",
    },
    "resolution_speed": {
        "weight": 30,
        "label": "Issue resolution",
        "description": "How quickly you resolve worker concerns and disputes",
    },
}

# ── Poster penalties ──────────────────────────────────────────────────────────

POSTER_PENALTIES: dict[str, int] = {
    "non_payment":        -80,
    "repeated_dispute":   -40,
    "posting_inaccuracy": -20,
    "late_cancellation":  -15,
}

POSTER_MAX_PER_GIG: int = 6
POSTER_CREDIBILITY_GIGS: int = 5


# ── Helpers ───────────────────────────────────────────────────────────────────

def get_band(score: int) -> dict[str, Any]:
    """Returns the band dict for the given score."""
    for band in BANDS:
        if band["min"] <= score <= band["max"]:
            return band
    return BANDS[1]  # fallback: developing
