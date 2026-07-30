"""
Uploads generated cover images to Supabase Storage via the REST API directly
(httpx, async) rather than the synchronous `supabase` client — avoids
blocking the event loop.

Requires a public bucket named `gig-covers` to exist in Supabase (Studio ->
Storage -> New bucket -> public). Not created by migration since Storage
buckets aren't a Postgres object.
"""
import httpx

from app.config import settings

BUCKET = "gig-covers"


async def upload_cover(gig_id: str, filename: str, png_bytes: bytes) -> str:
    """Uploads a PNG and returns its public URL. Overwrites if it already exists."""
    path = f"{gig_id}/{filename}"
    url = f"{settings.supabase_url}/storage/v1/object/{BUCKET}/{path}"

    async with httpx.AsyncClient(timeout=30) as client:
        response = await client.post(
            url,
            content=png_bytes,
            headers={
                "Authorization": f"Bearer {settings.supabase_service_key}",
                "apikey": settings.supabase_service_key,
                "Content-Type": "image/png",
                "x-upsert": "true",
            },
        )
        response.raise_for_status()

    return f"{settings.supabase_url}/storage/v1/object/public/{BUCKET}/{path}"
