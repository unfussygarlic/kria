"""
Momentum Calculator
====================
Pure calculation logic — no DB access, no side effects.

Score formula (0–1000):
    weights         = normalized_weights() from registry (sum to 1.0)
    weighted_sum    = sum(weight × normalized_value) for signals WITH data
    credibility     = min(gig_count / CREDIBILITY_THRESHOLD, 1.0)
    gig_score       = clamp(1000 × weighted_sum × credibility − penalties, 0, 1000)
    profile_points  = sum of points for filled profile fields (max 80)
    score           = clamp(gig_score + profile_points, 0, 1000)

Profile bonus is additive outside the credibility formula — new runners can
reach up to 80 pts from profile completion while gig signals are still empty.

To add a signal: drop a .py file in momentum/signals/ and restart.
To tune weights: change the weight= field in the signal's SIGNAL dataclass.
"""

from dataclasses import dataclass, field
from typing import Any

from app.momentum import config as cfg
from app.momentum import registry


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class MomentumScore:
    score: int
    band_key: str
    band_label: str
    band_color: str
    gig_count: int
    profile_points: int = 0


@dataclass
class BreakdownItem:
    key: str
    label: str
    description: str
    bar_value: float   # 0.0–1.0 (normalised); 0.0 if no data
    contribution: int  # score points this signal contributes at current credibility
    has_data: bool     # False = no data yet; axis shown as empty on skill graph


@dataclass
class ProfileBreakdownItem:
    key: str
    label: str
    description: str
    points: int        # max points for this field
    earned: bool       # whether the field is filled


# ── Internal helpers ──────────────────────────────────────────────────────────

def _clamp(v: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, v))


def _credibility(gig_count: int) -> float:
    return _clamp(gig_count / max(cfg.CREDIBILITY_THRESHOLD, 1), 0.0, 1.0)


def _is_filled(value: Any) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (list, tuple)):
        return len(value) > 0
    if isinstance(value, str):
        return len(value.strip()) > 0
    return bool(value)


def compute_profile_points(
    profile_fields: dict[str, Any],
) -> tuple[int, list[ProfileBreakdownItem]]:
    """Compute profile-completion bonus from real profiles DB columns."""
    items: list[ProfileBreakdownItem] = []
    total = 0
    for key, signal_cfg in cfg.PROFILE_SIGNALS.items():
        earned = _is_filled(profile_fields.get(key))
        pts = signal_cfg["points"] if earned else 0
        total += pts
        items.append(ProfileBreakdownItem(
            key=key,
            label=signal_cfg["label"],
            description=signal_cfg["description"],
            points=signal_cfg["points"],
            earned=earned,
        ))
    return min(total, cfg.MAX_PROFILE_POINTS), items


def _make_score(score: int, gig_count: int, profile_points: int = 0) -> MomentumScore:
    band = cfg.get_band(score)
    return MomentumScore(
        score=score,
        band_key=band["key"],
        band_label=band["label"],
        band_color=band["color"],
        gig_count=gig_count,
        profile_points=profile_points,
    )


# ── Core scoring ──────────────────────────────────────────────────────────────

def _compute_score(
    signal_scores: dict[str, float | None],
    penalty_points: int,
    gig_count: int,
    profile_points: int = 0,
) -> tuple[int, list[BreakdownItem]]:
    """
    Core scoring from signal_scores dict (values from JSONB column).

    Uses FIXED weights (signal.weight / 100) so the max achievable score
    grows as more signals become available:
      show_rate only          → max  350
      + on_time_rate          → max  600
      + performance_score     → max  800
      + communication_score   → max  900
      + professionalism_score → max 1000

    Signals with no data contribute 0 — they do NOT inflate the weight of
    other signals (auto-normalizing would let a perfect show_rate alone
    score 1000, which is wrong).
    """
    signals = registry.get_signals()
    credibility = _credibility(gig_count)

    weighted_sum = 0.0
    breakdown: list[BreakdownItem] = []

    for signal in signals:
        raw = signal_scores.get(signal.key)
        has_data = raw is not None

        if has_data:
            normalized = _clamp(raw / signal.max_points, 0.0, 1.0)
            weighted_sum += (signal.weight / 100.0) * normalized
        else:
            normalized = 0.0

        # contribution = this signal's share of 1000 at current credibility
        contribution = round((signal.weight / 100.0) * 1000 * normalized * credibility)

        breakdown.append(BreakdownItem(
            key=signal.key,
            label=signal.label,
            description=signal.description,
            bar_value=round(normalized, 3),
            contribution=contribution,
            has_data=has_data,
        ))

    gig_score = weighted_sum * 1000 * credibility - penalty_points
    raw_score = gig_score + profile_points
    score = int(_clamp(raw_score, cfg.SCALE["min"], cfg.SCALE["max"]))
    return score, breakdown


# ── Public API ────────────────────────────────────────────────────────────────

def compute_worker_score(
    signal_scores: dict[str, float | None],
    penalty_points: int,
    gig_count: int,
    profile_fields: dict[str, Any] | None = None,
) -> MomentumScore:
    pp, _ = compute_profile_points(profile_fields or {})
    score, _ = _compute_score(signal_scores, penalty_points, gig_count, pp)
    return _make_score(score, gig_count, pp)


def compute_worker_breakdown(
    signal_scores: dict[str, float | None],
    penalty_points: int,
    gig_count: int,
    profile_fields: dict[str, Any] | None = None,
) -> tuple[MomentumScore, list[BreakdownItem], list[ProfileBreakdownItem]]:
    """Full score + per-signal breakdown + profile-completion breakdown."""
    pp, profile_breakdown = compute_profile_points(profile_fields or {})
    score, breakdown = _compute_score(signal_scores, penalty_points, gig_count, pp)
    return _make_score(score, gig_count, pp), breakdown, profile_breakdown
