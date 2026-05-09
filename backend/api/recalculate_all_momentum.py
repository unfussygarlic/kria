"""
One-shot management script: recalculate Momentum for all runners who have
any gig_assignment record. Reads real signals from DB — no fake data.

Run inside the api container:
  docker exec -it kriya_api_1 python recalculate_all_momentum.py
  (or: docker exec -it kria-api_1 python recalculate_all_momentum.py)
"""

import asyncio

from sqlalchemy import text

from app.db.session import AsyncSessionLocal, engine
from app.momentum.recalculate import recalculate_momentum


async def main() -> None:
    async with AsyncSessionLocal() as db:
        # All distinct runners with at least one assignment
        result = await db.execute(
            text("""
                SELECT DISTINCT worker_id
                FROM gig_assignments
                ORDER BY worker_id
            """)
        )
        user_ids = [str(row[0]) for row in result.fetchall()]

    print(f"Found {len(user_ids)} runner(s) to recalculate.\n")

    for uid in user_ids:
        async with AsyncSessionLocal() as db:
            try:
                await recalculate_momentum(uid, db, event_type="admin_recalculate")

                # Read back the new score to show progress
                row = await db.execute(
                    text("""
                        SELECT p.display_name, mp.worker_score, mp.worker_gig_count
                        FROM momentum_profiles mp
                        JOIN profiles p ON p.id = mp.user_id
                        WHERE mp.user_id = :uid
                    """),
                    {"uid": uid},
                )
                r = row.mappings().first()
                if r:
                    print(f"  ✓ {r['display_name']:<20} gigs={r['worker_gig_count']:>3}  score={r['worker_score']:>4}")
                else:
                    print(f"  ✓ {uid}  (no profile row found)")
            except Exception as e:
                print(f"  ✗ {uid}  ERROR: {e}")

    await engine.dispose()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
