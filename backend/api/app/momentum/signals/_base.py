"""Base Signal dataclass — all signal files must export SIGNAL: Signal + async compute()."""

from dataclasses import dataclass


@dataclass(frozen=True)
class Signal:
    key: str          # unique key, stored in signal_scores JSONB
    label: str        # display name (e.g. "Reliability")
    short_label: str  # abbreviated label for radar chart axes
    description: str  # one-line human explanation
    icon: str         # Feather icon name
    color: str        # hex color for UI accents
    weight: float     # relative weight (auto-normalized at runtime)
    max_points: float # normalize_max: divides raw value to get 0.0–1.0
