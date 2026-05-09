"""
Directly seed performance/communication/professionalism signals for the 5
test runners that couldn't receive ratings due to the per-gig uniqueness
constraint on the ratings table. Writes directly to momentum_profiles and
recomputes the score using the calculator — no fake ratings rows.

Run:
  docker exec -it kriya_kria-api_1 python seed_remaining_signals.py
"""

import asyncio
import random
from datetime import datetime

from sqlalchemy import text

from app.db.session import AsyncSessionLocal, engine
from app.momentum.calculator import compute_worker_breakdown

random.seed(99)

# These runners had no available gig for a Priya rating
UNRATED = [
    "aaaaaaaa-0000-0000-0000-000000000011",  # Aditya Kumar
    "aaaaaaaa-0000-0000-0000-000000000012",  # Pooja Reddy
    "aaaaaaaa-0000-0000-0000-000000000013",  # Nikhil Shah
    "aaaaaaaa-0000-0000-0000-000000000014",  # Kavya Menon
    "aaaaaaaa-0000-0000-0000-000000000015",  # Rohit Bose
]


class _MockRow:
    """Wraps a dict so calculator attribute access works."""
    def __init__(self, d):
        self._d = d
    def __getattr__(self, name):
        return self._d[name]


async def main() -> None:
    async with AsyncSessionLocal() as db:
        for uid in UNRATED:
            r = await db.execute(
                text("SELECT * FROM momentum_profiles WHERE user_id = :uid"),
                {"uid": uid},
            )
            mp = r.mappings().first()
            if not mp:
                print(f"  ! No momentum_profile for {uid}")
                continue

            p = float(random.uniform(3.5, 5.0))
            perf  = round(random.uniform(p - 0.3, min(p + 0.3, 5.0)), 4)
            comm  = round(random.uniform(p - 0.5, min(p + 0.2, 5.0)), 4)
            prof  = round(random.uniform(p - 0.2, min(p + 0.4, 5.0)), 4)

            mock = _MockRow({
                **dict(mp),
                "worker_performance_score":    perf,
                "worker_communication_score":  comm,
                "worker_professionalism_score": prof,
            })

            score_obj, _, _ = compute_worker_breakdown(mock)
            new_score = score_obj.score

            name_r = await db.execute(
                text("SELECT display_name FROM profiles WHERE id = :uid"),
                {"uid": uid},
            )
            name = (name_r.scalar() or uid)

            await db.execute(text("""
                UPDATE momentum_profiles SET
                    worker_performance_score    = :perf,
                    worker_communication_score  = :comm,
                    worker_professionalism_score = :prof,
                    worker_score                = :score,
                    last_calculated_at          = :now
                WHERE user_id = :uid
            """), {
                "perf":  perf,
                "comm":  comm,
                "prof":  prof,
                "score": new_score,
                "now":   datetime.utcnow(),
                "uid":   uid,
            })

            print(
                f"  ✓ {name:<20} score={new_score:>4}  "
                f"perf={perf:.1f}  comm={comm:.1f}  prof={prof:.1f}"
            )

        await db.commit()

    await engine.dispose()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
