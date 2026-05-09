"""
Signal Registry — auto-discovers all signal files under momentum/signals/.

A signal file is any .py file in that package that is not prefixed with '_' and
exports SIGNAL: Signal and async compute(user_id, db) -> float | None.

Adding a new signal = drop a .py file in signals/ and restart the server.
"""

import importlib
import logging
import pkgutil
from pathlib import Path
from types import ModuleType

from app.momentum.signals._base import Signal

logger = logging.getLogger(__name__)

# ── Discovery ──────────────────────────────────────────────────────────────────

_registry: list[tuple[Signal, ModuleType]] = []


def _load() -> None:
    signals_dir = Path(__file__).parent / "signals"
    for _, name, _ in pkgutil.iter_modules([str(signals_dir)]):
        if name.startswith("_"):
            continue
        module = importlib.import_module(f"app.momentum.signals.{name}")
        if not hasattr(module, "SIGNAL") or not hasattr(module, "compute"):
            logger.warning("signals/%s.py skipped — missing SIGNAL or compute", name)
            continue
        _registry.append((module.SIGNAL, module))
        logger.debug("Loaded momentum signal: %s (weight=%.1f)", module.SIGNAL.key, module.SIGNAL.weight)

    total_weight = sum(s.weight for s, _ in _registry)
    logger.info(
        "Momentum registry loaded %d signal(s); total relative weight = %.1f",
        len(_registry),
        total_weight,
    )


_load()


# ── Public API ─────────────────────────────────────────────────────────────────

def get_signals() -> list[Signal]:
    return [s for s, _ in _registry]


def normalized_weights() -> dict[str, float]:
    """Returns weight fractions that sum to 1.0."""
    signals = get_signals()
    total = sum(s.weight for s in signals)
    if not total:
        return {s.key: 1.0 / len(signals) for s in signals} if signals else {}
    return {s.key: s.weight / total for s in signals}


async def run_all(user_id: str, db) -> dict[str, float | None]:
    """Run compute() for every registered signal. Failures return None."""
    results: dict[str, float | None] = {}
    for signal, module in _registry:
        try:
            results[signal.key] = await module.compute(user_id, db)
        except Exception:
            logger.exception("Signal '%s' compute failed for user %s", signal.key, user_id)
            results[signal.key] = None
    return results
