"""
One-off script: regenerate every gig's cover image with the current compositor.

Run this after shipping a compositor redesign (e.g. the 2026-08-07 rewrite
that removed the rectangular frame). Existing covers in Supabase Storage
were rendered with the old design and stay stale until each gig's
`POST /gigs/{id}/cover` is called again.

Usage on EC2:

    docker exec kriya_kria-api_1 python -m app.scripts.regenerate_covers

Options:
    --only-null   Skip gigs that already have a cover_image_url (default: process all)
    --limit N     Only regenerate the first N gigs (useful for a smoke test)

Safe to re-run — each cover overwrites the previous `{gig_id}/cover.png`
+ `{gig_id}/cover-square.png` in Supabase Storage (upsert).
"""
import argparse
import asyncio
import logging

from sqlalchemy import text

from app.covers.compositor import generate_cover, generate_square_cover
from app.covers.storage import upload_cover
from app.db.session import AsyncSessionLocal

logger = logging.getLogger("regenerate_covers")
logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")


def _format_pay(amount: float, pay_type: str) -> str:
    label = f"₹{amount:,.0f}"
    if pay_type == "hourly":
        return f"{label}/hr"
    if pay_type == "per_day":
        return f"{label}/day"
    return label


async def _process_gig(db, row) -> tuple[str, str]:
    """Render both covers, upload, update gigs row. Returns (cover_url, square_url)."""
    gig_id = str(row["id"])
    kwargs = dict(
        category=row["category"],
        title=row["title"],
        pay_label=_format_pay(float(row["pay_amount"]), row["pay_type"]),
        venue=row["venue_name"] or "",
        city=row["city"] or "",
        host_name=row["host_name"] or "",
        photo_bytes=None,  # Existing photos are lost on regen — hosts can re-upload via the wizard.
    )
    cover_png = generate_cover(**kwargs)
    square_png = generate_square_cover(**kwargs)
    cover_url = await upload_cover(gig_id, "cover.png", cover_png)
    square_url = await upload_cover(gig_id, "cover-square.png", square_png)
    await db.execute(
        text(
            "UPDATE gigs SET cover_image_url = :c, cover_image_square_url = :s WHERE id = :id"
        ),
        {"c": cover_url, "s": square_url, "id": gig_id},
    )
    await db.commit()
    return cover_url, square_url


async def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--only-null", action="store_true", help="Skip gigs that already have a cover")
    parser.add_argument("--limit", type=int, default=None, help="Only process the first N gigs")
    args = parser.parse_args()

    where = "WHERE cover_image_url IS NULL" if args.only_null else ""
    limit = f"LIMIT {int(args.limit)}" if args.limit else ""

    async with AsyncSessionLocal() as db:
        rows = await db.execute(
            text(
                f"""
                SELECT g.id, g.category, g.title, g.pay_amount, g.pay_type::text,
                       g.venue_name, g.city,
                       COALESCE(g.company_name, p.display_name) AS host_name
                FROM gigs g
                JOIN profiles p ON p.id = g.poster_id
                {where}
                ORDER BY g.created_at DESC
                {limit}
                """
            )
        )
        gigs = rows.mappings().all()

    logger.info("Regenerating covers for %d gigs", len(gigs))
    ok = 0
    fail = 0
    for i, row in enumerate(gigs, start=1):
        async with AsyncSessionLocal() as db:
            try:
                await _process_gig(db, row)
                ok += 1
                logger.info("[%d/%d] %s ✓", i, len(gigs), row["id"])
            except Exception as e:  # noqa: BLE001
                fail += 1
                logger.exception("[%d/%d] %s ✗ %s", i, len(gigs), row["id"], e)

    logger.info("Done — %d succeeded, %d failed", ok, fail)


if __name__ == "__main__":
    asyncio.run(main())
