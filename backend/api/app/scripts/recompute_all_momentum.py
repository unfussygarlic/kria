"""
One-off script: recompute worker_score for every runner using the new
time-decayed / Bayesian-smoothed math shipped in migration 0034.

After migration 0034 runs, every runner has:
- Fresh momentum_penalties rows backfilled from historical assignments.
- A stored worker_penalty_points integer that still reflects the OLD
  undecayed total (untouched by the migration).
- A stored worker_score computed with the OLD formulas.

This script iterates every runner, calls recalculate_momentum(), and lets
the new code write correct values into worker_score, worker_penalty_points
(cached decayed total), and signal_scores.

Usage (on EC2):

    docker exec kriya_kria-api_1 python -m app.scripts.recompute_all_momentum

Options:
    --limit N     Only process the first N runners (smoke test)
    --dry-run     Log old vs new score for each user; skip DB writes

Idempotent — safe to re-run. Each recalc appends a momentum_events row
with event_type='migration_0034_backfill' so support can trace it.
"""
import argparse
import asyncio
import logging

from sqlalchemy import text

from app.db.session import AsyncSessionLocal
from app.momentum.recalculate import recalculate_momentum

logger = logging.getLogger("recompute_all_momentum")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


async def main(limit: int | None, dry_run: bool) -> None:
    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            text("""
                SELECT mp.user_id, mp.worker_score AS old_score
                FROM momentum_profiles mp
                JOIN profiles p ON p.id = mp.user_id
                WHERE p.default_role = 'runner'
                ORDER BY p.created_at ASC
                {limit_clause}
            """.format(limit_clause=f"LIMIT {int(limit)}" if limit else ""))
        )
        users = rows.mappings().all()

    logger.info("Found %d runners to process", len(users))
    successes = 0
    failures = 0

    for i, u in enumerate(users, 1):
        uid = str(u["user_id"])
        old_score = int(u["old_score"] or 0)

        if dry_run:
            logger.info("[%d/%d] %s (would recalc; old=%d)", i, len(users), uid, old_score)
            continue

        try:
            async with AsyncSessionLocal() as db:
                await recalculate_momentum(
                    uid, db, event_type="migration_0034_backfill",
                )
                new_row = (await db.execute(
                    text("SELECT worker_score FROM momentum_profiles WHERE user_id = :uid"),
                    {"uid": uid},
                )).mappings().first()
                new_score = int(new_row["worker_score"]) if new_row else -1
            successes += 1
            logger.info(
                "[%d/%d] %s: %d → %d (Δ%+d)",
                i, len(users), uid, old_score, new_score, new_score - old_score,
            )
        except Exception as exc:  # noqa: BLE001
            failures += 1
            logger.exception("[%d/%d] %s failed: %s", i, len(users), uid, exc)

    logger.info("Done — %d succeeded, %d failed", successes, failures)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()
    asyncio.run(main(limit=args.limit, dry_run=args.dry_run))
