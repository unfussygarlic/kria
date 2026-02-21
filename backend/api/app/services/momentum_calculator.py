"""
Momentum Calculator
====================
Pure calculation logic. No DB access, no side effects.
All functions take raw signal values + config, return computed results.

To change how scores are computed: change momentum_config.py (weights/penalties).
To add a new signal: add it to config AND add it to the signal extraction below.
Do NOT modify this file for tuning — only for structural changes.
"""

from dataclasses import dataclass
from datetime import datetime
from typing import Any

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import momentum_config as cfg


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class MomentumScore:
    score: int
    band_key: str
    band_label: str
    band_color: str
    gig_count: int


@dataclass
class BreakdownItem:
    key: str
    label: str
    description: str
    bar_value: float    # 0.0–1.0, used for bar width in UI
    contribution: int   # approximate score points this signal contributes


@dataclass
class MomentumBreakdown:
    worker: MomentumScore
    poster: MomentumScore
    worker_items: list[BreakdownItem]
    poster_items: list[BreakdownItem]


# ── Internal helpers ──────────────────────────────────────────────────────────

def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def _normalize(raw: float, normalize_max: float | None) -> float:
    """Normalize raw signal to 0.0–1.0."""
    if normalize_max:
        return _clamp(raw / normalize_max, 0.0, 1.0)
    return _clamp(raw, 0.0, 1.0)


def _credibility(gig_count: int, threshold: int) -> float:
    """
    Credibility multiplier: ramps from 0→1 as gig_count approaches threshold.
    Prevents new users from jumping immediately to high scores.
    At 0 gigs → multiplier = 0 → score stays at base (500).
    At threshold+ gigs → multiplier = 1 → full signal weight applied.
    """
    return _clamp(gig_count / max(threshold, 1), 0.0, 1.0)


def _score_from_signals(
    signals_config: dict[str, dict],
    raw_signals: dict[str, float],
    penalty_points: int,
    gig_count: int,
    credibility_threshold: int,
) -> tuple[int, list[BreakdownItem]]:
    """
    Computes a FICO-style score (300–850) and per-signal breakdown.

    Formula:
        score = base_score + (max_range × weighted_normalized × credibility) − penalties
        Clamped to [300, 850].

    Returns (score, [BreakdownItem])
    """
    base = cfg.SCALE["default"]          # 500
    max_range = cfg.SCALE["max"] - base  # 350 (500 → 850)

    total_weight = sum(s["weight"] for s in signals_config.values())
    credibility = _credibility(gig_count, credibility_threshold)

    breakdown_items: list[BreakdownItem] = []
    weighted_sum = 0.0

    for key, signal_cfg in signals_config.items():
        raw = raw_signals.get(key, 1.0)
        normalized = _normalize(raw, signal_cfg.get("normalize_max"))
        weight = signal_cfg["weight"]
        contribution = round((weight / total_weight) * max_range * normalized * credibility)
        weighted_sum += weight * normalized

        breakdown_items.append(BreakdownItem(
            key=key,
            label=signal_cfg["label"],
            description=signal_cfg["description"],
            bar_value=round(normalized, 3),
            contribution=contribution,
        ))

    # Final score
    normalized_total = weighted_sum / total_weight if total_weight > 0 else 0.0
    raw_score = base + (max_range * normalized_total * credibility) - penalty_points
    score = int(_clamp(raw_score, cfg.SCALE["min"], cfg.SCALE["max"]))

    return score, breakdown_items


def _make_momentum_score(score: int, gig_count: int) -> MomentumScore:
    band = cfg.get_band(score)
    return MomentumScore(
        score=score,
        band_key=band["key"],
        band_label=band["label"],
        band_color=band["color"],
        gig_count=gig_count,
    )


# ── Public API ────────────────────────────────────────────────────────────────

def compute_worker_score(profile_row: Any) -> MomentumScore:
    """
    Compute the Worker Momentum score from a momentum_profiles DB row.
    Returns a MomentumScore. Does NOT write to DB.
    """
    raw = {
        "show_rate":         float(profile_row.worker_show_rate),
        "on_time_rate":      float(profile_row.worker_on_time_rate),
        "performance_score": float(profile_row.worker_performance_score),
        "response_rate":     float(profile_row.worker_response_rate),
        "consistency_score": float(profile_row.worker_consistency_score),
    }
    score, _ = _score_from_signals(
        cfg.WORKER_SIGNALS,
        raw,
        int(profile_row.worker_penalty_points),
        int(profile_row.worker_gig_count),
        cfg.WORKER_CREDIBILITY_GIGS,
    )
    return _make_momentum_score(score, int(profile_row.worker_gig_count))


def compute_poster_score(profile_row: Any) -> MomentumScore:
    """
    Compute the Poster Momentum score from a momentum_profiles DB row.
    Returns a MomentumScore. Does NOT write to DB.
    """
    raw = {
        "payment_rate":    float(profile_row.poster_payment_rate),
        "poster_rating":   float(profile_row.poster_rating),
        "accuracy_rate":   float(profile_row.poster_accuracy_rate),
        "resolution_speed": float(profile_row.poster_resolution_speed),
    }
    score, _ = _score_from_signals(
        cfg.POSTER_SIGNALS,
        raw,
        int(profile_row.poster_penalty_points),
        int(profile_row.poster_gig_count),
        cfg.POSTER_CREDIBILITY_GIGS,
    )
    return _make_momentum_score(score, int(profile_row.poster_gig_count))


def compute_full_breakdown(profile_row: Any) -> MomentumBreakdown:
    """
    Full breakdown for authenticated user (includes per-signal bars).
    Not exposed publicly — only the owner sees their own breakdown.
    """
    worker_raw = {
        "show_rate":         float(profile_row.worker_show_rate),
        "on_time_rate":      float(profile_row.worker_on_time_rate),
        "performance_score": float(profile_row.worker_performance_score),
        "response_rate":     float(profile_row.worker_response_rate),
        "consistency_score": float(profile_row.worker_consistency_score),
    }
    worker_score, worker_items = _score_from_signals(
        cfg.WORKER_SIGNALS,
        worker_raw,
        int(profile_row.worker_penalty_points),
        int(profile_row.worker_gig_count),
        cfg.WORKER_CREDIBILITY_GIGS,
    )

    poster_raw = {
        "payment_rate":     float(profile_row.poster_payment_rate),
        "poster_rating":    float(profile_row.poster_rating),
        "accuracy_rate":    float(profile_row.poster_accuracy_rate),
        "resolution_speed": float(profile_row.poster_resolution_speed),
    }
    poster_score, poster_items = _score_from_signals(
        cfg.POSTER_SIGNALS,
        poster_raw,
        int(profile_row.poster_penalty_points),
        int(profile_row.poster_gig_count),
        cfg.POSTER_CREDIBILITY_GIGS,
    )

    return MomentumBreakdown(
        worker=_make_momentum_score(worker_score, int(profile_row.worker_gig_count)),
        poster=_make_momentum_score(poster_score, int(profile_row.poster_gig_count)),
        worker_items=worker_items,
        poster_items=poster_items,
    )


def compute_gig_delta_worker(
    showed_up: bool,
    arrived_on_time: bool,
    performance_rating: float,  # 1.0–5.0
) -> int:
    """
    Calculates the score delta after a single gig completion (worker side).
    Returns a positive integer (improvement) or calls get_penalty() for violations.
    """
    if not showed_up:
        return cfg.WORKER_PENALTIES["no_show"]

    base = float(cfg.WORKER_MAX_PER_GIG)
    if not arrived_on_time:
        base *= 0.6

    perf_multiplier = _clamp(performance_rating / 5.0, 0.2, 1.0)
    return max(1, round(base * perf_multiplier))


def compute_gig_delta_poster(
    paid_on_time: bool,
    worker_rating: float,  # 1.0–5.0
) -> int:
    """
    Calculates the score delta after a single gig completion (poster side).
    """
    if not paid_on_time:
        return cfg.POSTER_PENALTIES["non_payment"]

    base = float(cfg.POSTER_MAX_PER_GIG)
    perf_multiplier = _clamp(worker_rating / 5.0, 0.2, 1.0)
    return max(1, round(base * perf_multiplier))


def get_worker_penalty(event_type: str) -> int:
    """Returns the penalty delta (negative) for a worker violation event."""
    return cfg.WORKER_PENALTIES.get(event_type, 0)


def get_poster_penalty(event_type: str) -> int:
    """Returns the penalty delta (negative) for a poster violation event."""
    return cfg.POSTER_PENALTIES.get(event_type, 0)


# ── DB-backed recalculation ───────────────────────────────────────────────────

async def recalculate_momentum(user_id: str, db: AsyncSession) -> None:
    """
    Reads live data from the DB and updates momentum_profiles for user_id.
    Called after ratings or assignment status changes.

    Only updates the signals we can actually derive from current data:
      worker_performance_score  ← AVG(score) WHERE rating_type='worker_rating'
      worker_show_rate          ← completed / (completed + no_show)
      poster_rating             ← AVG(score) WHERE rating_type='poster_rating'
      worker_gig_count          ← completed assignments
      poster_gig_count          ← completed gigs posted by user

    Other signals stay at their default (1.0 / 5.0).
    """
    # Fetch profile row to get existing penalty points
    mp_row = await db.execute(
        text("SELECT * FROM momentum_profiles WHERE user_id = :uid"),
        {"uid": user_id},
    )
    mp = mp_row.mappings().first()
    if not mp:
        return  # no profile yet — auto-trigger will create it on next gig

    # Worker signals from ratings
    worker_rating_row = await db.execute(
        text("""
            SELECT COALESCE(AVG(score), 5.0) AS avg_score, COUNT(*) AS cnt
            FROM ratings
            WHERE ratee_id = :uid AND rating_type = 'worker_rating'
        """),
        {"uid": user_id},
    )
    wr = worker_rating_row.mappings().first()
    worker_perf = float(wr["avg_score"]) if wr else 5.0

    # Worker show rate
    asgn_row = await db.execute(
        text("""
            SELECT
              COUNT(*) FILTER (WHERE status = 'completed') AS completed,
              COUNT(*) FILTER (WHERE status = 'no_show')   AS no_show
            FROM gig_assignments
            WHERE worker_id = :uid
        """),
        {"uid": user_id},
    )
    ar = asgn_row.mappings().first()
    completed = int(ar["completed"]) if ar else 0
    no_show = int(ar["no_show"]) if ar else 0
    total_done = completed + no_show
    show_rate = (completed / total_done) if total_done > 0 else 1.0
    worker_gig_count = completed

    # Poster signals from ratings
    poster_rating_row = await db.execute(
        text("""
            SELECT COALESCE(AVG(score), 5.0) AS avg_score, COUNT(*) AS cnt
            FROM ratings
            WHERE ratee_id = :uid AND rating_type = 'poster_rating'
        """),
        {"uid": user_id},
    )
    pr = poster_rating_row.mappings().first()
    poster_rating = float(pr["avg_score"]) if pr else 5.0

    # Poster gig count (gigs they posted that had at least one completed assignment)
    poster_count_row = await db.execute(
        text("""
            SELECT COUNT(DISTINCT asgn.gig_id) AS cnt
            FROM gig_assignments asgn
            JOIN gigs g ON g.id = asgn.gig_id
            WHERE g.poster_id = :uid AND asgn.status = 'completed'
        """),
        {"uid": user_id},
    )
    pc = poster_count_row.mappings().first()
    poster_gig_count = int(pc["cnt"]) if pc else 0

    # Build a mock profile row for the calculator functions
    class _ProfileRow:
        def __init__(self, mp_row: Any, **overrides: Any) -> None:
            self._row = mp_row
            self._overrides = overrides

        def __getattr__(self, name: str) -> Any:
            if name in self._overrides:
                return self._overrides[name]
            return self._row[name]

    mock_row = _ProfileRow(
        mp,
        worker_performance_score=worker_perf,
        worker_show_rate=show_rate,
        worker_gig_count=worker_gig_count,
        poster_rating=poster_rating,
        poster_gig_count=poster_gig_count,
    )

    worker_score_obj = compute_worker_score(mock_row)
    poster_score_obj = compute_poster_score(mock_row)

    await db.execute(
        text("""
            UPDATE momentum_profiles
            SET
                worker_performance_score = :worker_perf,
                worker_show_rate         = :show_rate,
                worker_gig_count         = :worker_gig_count,
                poster_rating            = :poster_rating,
                poster_gig_count         = :poster_gig_count,
                worker_score             = :worker_score,
                poster_score             = :poster_score,
                last_calculated_at       = :now
            WHERE user_id = :uid
        """),
        {
            "worker_perf": worker_perf,
            "show_rate": show_rate,
            "worker_gig_count": worker_gig_count,
            "poster_rating": poster_rating,
            "poster_gig_count": poster_gig_count,
            "worker_score": worker_score_obj.score,
            "poster_score": poster_score_obj.score,
            "now": datetime.utcnow(),
            "uid": user_id,
        },
    )
    await db.commit()
