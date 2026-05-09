"""
Seed realistic signal data for test runner accounts so the skill graph
has all 5 axes filled. Operates only on accounts whose UUIDs start with
'aaaaaaaa', so it's safe to run against the dev DB.

Steps:
  1. For each test runner find their completed gig assignments.
  2. Insert one worker_rating per runner (picking their first completed gig
     that hasn't been rated yet by Priya — respects the UNIQUE constraint).
  3. Set otp_verified_at on completed assignments to enable on_time_rate
     (80% on-time, 20% slightly late — adds realistic variance).
  4. Recalculate momentum for all affected runners.

Run:
  docker exec -it kriya_kria-api_1 python seed_runner_signals.py
"""

import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy import text

from app.db.session import AsyncSessionLocal, engine
from app.momentum.recalculate import recalculate_momentum

# Priya Mehta's profile ID (same as her auth UID in this deployment)
PRIYA_ID = "ef4d67d4-a784-40fc-b94a-7c846ec1ddb2"

random.seed(42)  # reproducible scores


def _score() -> dict:
    """Varied but realistic 1–5 scores per runner."""
    base = random.uniform(3.2, 5.0)
    return {
        "score":                round(random.uniform(base - 0.3, min(base + 0.3, 5.0))),
        "communication_score":  round(random.uniform(base - 0.5, min(base + 0.2, 5.0))),
        "professionalism_score": round(random.uniform(base - 0.2, min(base + 0.4, 5.0))),
    }


async def main() -> None:
    # ── Fetch all completed assignments for test runners ──────────────────────
    async with AsyncSessionLocal() as db:
        r = await db.execute(text("""
            SELECT
                asgn.id            AS asgn_id,
                asgn.worker_id,
                asgn.gig_id,
                asgn.otp_verified_at,
                g.report_time,
                g.event_date,
                p.display_name
            FROM gig_assignments asgn
            JOIN gigs g ON g.id = asgn.gig_id
            JOIN profiles p ON p.id = asgn.worker_id
            WHERE asgn.worker_id::text LIKE 'aaaaaaaa%'
              AND asgn.status = 'completed'
            ORDER BY asgn.worker_id, g.event_date
        """))
        assignments = r.mappings().all()

    # Group by runner
    by_runner: dict[str, list] = {}
    for row in assignments:
        uid = str(row["worker_id"])
        by_runner.setdefault(uid, []).append(dict(row))

    print(f"Found {len(by_runner)} test runner(s) with completed assignments.\n")

    # ── Step 1: Insert ratings ────────────────────────────────────────────────
    # One rating per runner — pick first completed gig not yet rated by Priya.
    rated_gigs: set[str] = set()

    async with AsyncSessionLocal() as db:
        # Find gigs Priya already rated
        existing = await db.execute(text("""
            SELECT gig_id FROM ratings
            WHERE rater_id = :rater AND rating_type = 'worker_rating'
        """), {"rater": PRIYA_ID})
        for row in existing:
            rated_gigs.add(str(row[0]))

        inserted = 0
        for uid, asgns in by_runner.items():
            s = _score()
            rated = False
            for asgn in asgns:
                gig_id = str(asgn["gig_id"])
                if gig_id in rated_gigs:
                    continue
                await db.execute(text("""
                    INSERT INTO ratings
                        (gig_id, rater_id, ratee_id, rating_type,
                         score, communication_score, professionalism_score)
                    VALUES
                        (:gig_id, :rater_id, :ratee_id, 'worker_rating',
                         :score, :comm, :prof)
                    ON CONFLICT DO NOTHING
                """), {
                    "gig_id":   gig_id,
                    "rater_id": PRIYA_ID,
                    "ratee_id": uid,
                    "score":    max(1, min(5, s["score"])),
                    "comm":     max(1, min(5, s["communication_score"])),
                    "prof":     max(1, min(5, s["professionalism_score"])),
                })
                rated_gigs.add(gig_id)
                rated = True
                inserted += 1
                break
            if not rated:
                print(f"  ! No available gig to rate runner {uid} (all gigs already rated)")

        await db.commit()
    print(f"Inserted {inserted} worker rating(s).\n")

    # ── Step 2: Set otp_verified_at for on_time_rate ─────────────────────────
    # 80% chance on-time (report_time - 5 min), 20% slightly late (+ 20 min).
    async with AsyncSessionLocal() as db:
        updated = 0
        for uid, asgns in by_runner.items():
            for asgn in asgns:
                if asgn["otp_verified_at"] is not None:
                    continue  # already set
                report_time = asgn["report_time"]
                event_date  = asgn["event_date"]
                if report_time is None or event_date is None:
                    continue

                # Build a datetime from date + time
                if hasattr(event_date, "year"):
                    base = datetime(event_date.year, event_date.month, event_date.day)
                else:
                    base = datetime.strptime(str(event_date), "%Y-%m-%d")

                rt_str  = str(report_time)[:5]  # "HH:MM"
                h, m    = int(rt_str[:2]), int(rt_str[3:5])
                report_dt = base.replace(hour=h, minute=m)

                on_time = random.random() < 0.80
                offset  = timedelta(minutes=-random.randint(2, 8) if on_time else random.randint(16, 25))
                verified_at = report_dt + offset

                await db.execute(text("""
                    UPDATE gig_assignments
                    SET otp_verified_at = :ts
                    WHERE id = :asgn_id
                """), {"ts": verified_at, "asgn_id": str(asgn["asgn_id"])})
                updated += 1

        await db.commit()
    print(f"Set otp_verified_at on {updated} assignment(s).\n")

    # ── Step 3: Recalculate momentum for all test runners ────────────────────
    print("Recalculating momentum...\n")
    for uid, asgns in by_runner.items():
        name = asgns[0]["display_name"] if asgns else uid
        async with AsyncSessionLocal() as db:
            try:
                await recalculate_momentum(uid, db, event_type="seed_signals")
                r = await db.execute(text("""
                    SELECT mp.worker_score, mp.worker_gig_count,
                           mp.worker_show_rate, mp.worker_on_time_rate,
                           mp.worker_performance_score,
                           mp.worker_communication_score,
                           mp.worker_professionalism_score
                    FROM momentum_profiles mp WHERE mp.user_id = :uid
                """), {"uid": uid})
                row = r.mappings().first()
                if row:
                    show  = f"{row['worker_show_rate']:.2f}"     if row['worker_show_rate']            is not None else "—"
                    otr   = f"{row['worker_on_time_rate']:.2f}"  if row['worker_on_time_rate']         is not None else "—"
                    perf  = f"{row['worker_performance_score']:.1f}" if row['worker_performance_score']    is not None else "—"
                    comm  = f"{row['worker_communication_score']:.1f}" if row['worker_communication_score'] is not None else "—"
                    prof  = f"{row['worker_professionalism_score']:.1f}" if row['worker_professionalism_score'] is not None else "—"
                    print(
                        f"  ✓ {name:<20} score={row['worker_score']:>4}  "
                        f"show={show}  otr={otr}  perf={perf}  comm={comm}  prof={prof}"
                    )
            except Exception as e:
                print(f"  ✗ {name}  ERROR: {e}")

    await engine.dispose()
    print("\nDone.")


if __name__ == "__main__":
    asyncio.run(main())
