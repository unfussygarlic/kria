# Gig Cover Images (Built — end-to-end for the no-photo path)

## Concept

Every gig posted gets an auto-generated cover image, composited server-side from a pre-made template + live gig data. Explicitly **not** generative AI — template-based, like Canva's approach, for cost/latency/brand-consistency reasons.

## Decisions Locked

- **Assets:** pre-made per-category-group templates, authored directly by Claude (Python/cairosvg), not Stitch — see [[gig_cover_asset_pipeline]] for why (Stitch's Round 1 backgrounds had baked-in text and an edgy blueprint aesthetic) and for the regeneration scripts.
- **Categories:** **6 groups, not 14.** Mid-build, discovered the earlier 14-category list (Retail/Delivery/Security/etc.) didn't match the actual product — Kria's gig wizard uses 6 role-groups (Event & Promotion, Hospitality, Technical Support, Media & Content, Stage & Hosting, Other), since Kria is specifically an **event-staffing** marketplace. Re-scoped: reused 4 of the 14 originals, built 2 new (Media & Content — camera icon; Stage & Hosting — microphone icon), dropped the other 8. See [[gigs]] "Categories" section for the corrected `GigCategory` → group mapping (this was also stale there and got fixed in the same pass).
- **Customization:** light — host can optionally upload their own photo, which drops into a **framed photo slot** within the template. No full custom editor. Backend supports this (`POST /gigs/{id}/cover` accepts an optional `photo` multipart field); **not yet wired into Grid's wizard UI** (see Next Steps).
- **Rendering:** server-side, Python/Pillow (`backend/api/app/covers/compositor.py`). Generated via `POST /api/v1/gigs/{id}/cover`, called fire-and-forget by Grid right after gig creation (mirrors the existing `updateGigLocation` post-insert pattern — gig creation itself is still a direct Supabase insert from Grid, not a FastAPI call).
- **Storage:** Supabase Storage, bucket `gig-covers` (public). Uploaded via `app/covers/storage.py` using `httpx` directly against the Storage REST API (not the `supabase` Python package — avoids blocking the event loop with its synchronous client). **The bucket must be created manually in Supabase Studio (Storage → New bucket → public) — not created by any migration**, since storage buckets aren't a Postgres object.
- **Aspect ratio:** portrait 4:5 (1080×1350px) as the primary canvas. `to_square_crop()` derives a 1080×1080 variant for OG/WhatsApp previews — crops the **bottom** of the canvas (where title/pay/host text lives), not the top, since a link-preview thumbnail needs the text more than the icon/photo area.

## Asset Structure (per category group, 6 total)

Two layers per group, same canvas size, at `backend/api/app/covers/assets/{slug}/`:
1. **`background.png`** — organic gradient blobs + one simple icon in the group's accent color, dark ink base, full bleed. Sits behind the host photo (and shows through the photo slot when no photo is supplied).
2. **`foreground.png`** — thin rounded-rect frame/border, category pill (top-left, empty — label drawn at render time), triangle mark. Transparent PNG; the photo-slot area (~78% width, upper two-thirds — see `manifest.PHOTO_SLOT`) is true alpha so a pasted photo shows through.

Render order: `background → host photo (rounded-mask, cover-fit crop into the slot; or nothing if none uploaded) → foreground (alpha-composited on top) → text (category chip, title, pay, host+city — drawn by Pillow, never baked into the art)`.

Geometry (photo slot, chip, text zone Y positions) is **identical across all 6 groups** — only accent color and icon differ — so there's one shared layout in `manifest.py`, not a manifest-per-category file as originally planned.

## Backend (built)

- `backend/api/app/covers/manifest.py` — canvas/layout constants + `GROUPS` (slug → label/color) + `CATEGORY_TO_GROUP` (the 17 `GigCategory` role values → group slug).
- `backend/api/app/covers/compositor.py` — `generate_cover(category, title, pay_label, host_name, city, photo_bytes=None) -> bytes` and `to_square_crop(png_bytes) -> bytes`. Chip label font auto-shrinks (22px down to 12px) to fit the fixed-width pill since group labels vary in length ("Other" vs "Event & Promotion"). Fonts: `SpaceGrotesk_700Bold`/`600SemiBold` copied from `frontend/pocket/node_modules/@expo-google-fonts/space-grotesk/` into `covers/assets/fonts/` (Pillow needs a real .ttf on disk, can't use the Google Fonts loader mobile/web use).
- `backend/api/app/covers/storage.py` — `upload_cover(gig_id, filename, png_bytes) -> url`.
- `backend/api/app/routers/gigs.py` — `POST /gigs/{gig_id}/cover` (ownership-checked like `/pause`, `/location`). Accepts optional `photo` multipart field. Renders both the 4:5 and square variants, uploads both, updates `gigs.cover_image_url` / `cover_image_square_url`, returns both URLs.
- Migration `0031_gig_cover_images.py` — adds `cover_image_url TEXT`, `cover_image_square_url TEXT` to `gigs`.
- `requirements.txt` — added `pillow==11.1.0`. **Docker image needs a rebuild** (`docker-compose up --build kria-api`) since this is a new dependency, not just a code change — bind-mounted source alone won't install it.

## Frontend (built — no-photo path only)

- `frontend/grid/lib/api/client.ts` — added `apiPostForm()` (multipart helper; the other three helpers are JSON-only).
- `frontend/grid/lib/api/gigs.ts` — `generateGigCover(id, photo?)`.
- `frontend/grid/app/(dashboard)/gigs/new/page.tsx` — calls `generateGigCover(data.id)` fire-and-forget right after insert + the location update. No photo passed yet (no UI for it), so every gig gets a template-only cover immediately with zero host effort.

## Verified

Compositor tested directly (no Docker — pure Pillow/cairosvg logic) with and without a photo, and the square crop. Confirmed: photo pastes into the rounded slot correctly, frame overlays on top, text wraps/ellipsizes, chip auto-shrinks to fit, square crop keeps the readable text zone. Not yet tested through the actual FastAPI endpoint / Supabase Storage round-trip (needs the Docker rebuild + the `gig-covers` bucket to exist first).

## Next Steps

1. **Create the `gig-covers` bucket** in Supabase Studio (public) — nothing works end-to-end without this.
2. **Rebuild kria-api** (`docker-compose -f docker-compose.yml -f docker-compose.dev.yml up --build kria-api`) to pick up Pillow, then smoke-test `POST /gigs/{id}/cover` for real (currently only unit-tested the compositor in isolation).
3. Run migration `0031` (auto-runs on backend startup, or `alembic upgrade head` manually).
4. **Photo upload UI** — a step/panel in Grid's wizard (and eventually the hidden Pocket host flow) to let hosts pick a photo before/after posting, calling `generateGigCover(id, photoFile)`. Not built yet — current wiring only produces the template-only cover.
5. Surface `cover_image_url` somewhere it's actually seen — Grid's gig list/detail cards and Pocket's Explore feed don't render it yet (this whole feature is invisible in the UI until that's wired).
6. OG meta tags for gig links (WhatsApp sharing) using `cover_image_square_url` — not wired.

See also: [[gigs]] (category taxonomy + wizard steps), [[gig_cover_asset_pipeline]] (how the art assets were made/can be regenerated).
