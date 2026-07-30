# Gig Cover Images (Built + verified in production, no-photo path — deployed on EC2)

## Concept

Every gig posted gets an auto-generated cover image, composited server-side from a pre-made template + live gig data. Explicitly **not** generative AI — template-based, like Canva's approach, for cost/latency/brand-consistency reasons.

## Decisions Locked

- **Assets:** pre-made per-category-group templates, authored directly by Claude (Python/cairosvg), not Stitch — see [[gig_cover_asset_pipeline]] for why (Stitch's Round 1 backgrounds had baked-in text and an edgy blueprint aesthetic) and for the regeneration scripts.
- **Categories:** **6 groups, not 14.** Mid-build, discovered the earlier 14-category list (Retail/Delivery/Security/etc.) didn't match the actual product — Kria's gig wizard uses 6 role-groups (Event & Promotion, Hospitality, Technical Support, Media & Content, Stage & Hosting, Other), since Kria is specifically an **event-staffing** marketplace. Re-scoped: reused 4 of the 14 originals, built 2 new (Media & Content — camera icon; Stage & Hosting — microphone icon), dropped the other 8. See [[gigs]] "Categories" section for the corrected `GigCategory` → group mapping (this was also stale there and got fixed in the same pass).
- **Customization:** light — host can optionally upload their own photo, which drops into a **framed photo slot** within the template. No full custom editor. Backend supports this (`POST /gigs/{id}/cover` accepts an optional `photo` multipart field); **not yet wired into Grid's wizard UI** (see Next Steps).
- **Rendering:** server-side, Python/Pillow (`backend/api/app/covers/compositor.py`). Generated via `POST /api/v1/gigs/{id}/cover`, called fire-and-forget by Grid right after gig creation (mirrors the existing `updateGigLocation` post-insert pattern — gig creation itself is still a direct Supabase insert from Grid, not a FastAPI call).
- **Storage:** Supabase Storage, bucket `gig-covers` (public). Uploaded via `app/covers/storage.py` using `httpx` directly against the Storage REST API (not the `supabase` Python package — avoids blocking the event loop with its synchronous client). **The bucket must be created manually in Supabase Studio (Storage → New bucket → public) — not created by any migration**, since storage buckets aren't a Postgres object.
- **Aspect ratio / square variant:** portrait 4:5 (1080×1350px) is the primary canvas. The 1080×1080 square variant is a **fully independent composition, not a crop of the portrait one** — see "Square is its own render" below for why that matters and what changed.

## Square is its own render (not a crop) — changed 2026-07-30

First pass derived the square image by cropping the portrait 4:5 render (keeping the bottom to preserve the text — see the git history of `compositor.py` for the old `to_square_crop()`). That produced two real bugs in a row (top-crop losing the text entirely, then a display-layer bug in Grid squeezing the portrait image into a landscape box and cropping both top *and* bottom). Root cause of the whole class of bug: forcing one aspect ratio's composition into another aspect ratio's frame. Fixed by giving the square variant its **own layout and its own template assets** — same icon/color per category, but its own canvas, its own photo-slot size, its own text position — so it's never a crop of anything.

- `manifest.py` now defines a `Layout` dataclass with two instances, `PORTRAIT` and `SQUARE`, each with independent `canvas_w/h`, `photo_slot`, `chip`, and text-zone Y positions. No more flat `CANVAS_W`/`PHOTO_SLOT`/etc. module constants.
- `compositor.py` has one generic `_render(layout, ...)` used by both public functions: `generate_cover()` (portrait) and `generate_square_cover()` (square). `to_square_crop()` is gone.
- Assets: every category folder now has 4 files, not 2 — `background.png`/`foreground.png` (portrait) and `background_square.png`/`foreground_square.png` (square). Square photo slot: `(118, 86, 844, 540)` vs portrait's `(118, 100, 843, 850)` — shorter to leave proportionally the same amount of room for text on a shorter canvas.
- `frontend/master-assets/generate_backgrounds.py` and `generate_foregrounds.py` both now generate through a `PROFILES`/`FOREGROUND_PROFILES` dict (portrait + square) instead of one hardcoded canvas size — regenerating either script produces both variants for all 6 categories in one run.
- `routers/gigs.py` calls both `generate_cover()` and `generate_square_cover()` and uploads both — no more crop step.

## Asset Structure (per category group, 6 total)

Two layers per group **per layout** (4 files per category, 24 total), at `backend/api/app/covers/assets/{slug}/`:
1. **`background.png` / `background_square.png`** — organic gradient blobs + one simple icon in the group's accent color, dark ink base, full bleed. Sits behind the host photo (and shows through the photo slot when no photo is supplied).
2. **`foreground.png` / `foreground_square.png`** — thin rounded-rect frame/border, category pill (top-left, empty — label drawn at render time), triangle mark. Transparent PNG; the photo-slot area is true alpha so a pasted photo shows through.

Render order (same for both layouts): `background → host photo (rounded-mask, cover-fit crop into the slot; or nothing if none uploaded) → foreground (alpha-composited on top) → text (category chip, title, pay, host+city — drawn by Pillow, never baked into the art)`.

Geometry is identical **within** a layout across all 6 groups (only accent color and icon differ) but different **between** the two layouts (portrait vs square) — see `manifest.PORTRAIT` / `manifest.SQUARE`.

## Backend (built)

- `backend/api/app/covers/manifest.py` — `Layout` dataclass, `PORTRAIT`/`SQUARE` instances, `GROUPS` (slug → label/color), `CATEGORY_TO_GROUP` (the 17 `GigCategory` role values → group slug).
- `backend/api/app/covers/compositor.py` — `generate_cover(category, title, pay_label, host_name, city, photo_bytes=None) -> bytes` and `generate_square_cover(...)` (same signature). Both delegate to a shared `_render(layout, ...)`. Chip label font auto-shrinks (22px down to 12px) to fit the fixed-width pill since group labels vary in length ("Other" vs "Event & Promotion"). Fonts: `SpaceGrotesk_700Bold`/`600SemiBold` copied from `frontend/pocket/node_modules/@expo-google-fonts/space-grotesk/` into `covers/assets/fonts/` (Pillow needs a real .ttf on disk, can't use the Google Fonts loader mobile/web use).
- `backend/api/app/covers/storage.py` — `upload_cover(gig_id, filename, png_bytes) -> url`.
- `backend/api/app/routers/gigs.py` — `POST /gigs/{gig_id}/cover` (ownership-checked like `/pause`, `/location`). Accepts optional `photo` multipart field. Renders both layouts, uploads both, updates `gigs.cover_image_url` / `cover_image_square_url`, returns both URLs.
- Migration `0031_gig_cover_images.py` — adds `cover_image_url TEXT`, `cover_image_square_url TEXT` to `gigs`.
- `requirements.txt` — added `pillow==11.1.0`. **Docker image needs a rebuild** (`docker-compose up --build kria-api`) since this is a new dependency, not just a code change — bind-mounted source alone won't install it. The new `*_square.png` asset files also need to ship in the image — a rebuild is required again for this round of changes, a plain restart isn't enough.

## Frontend (built — no-photo path only)

- `frontend/grid/lib/api/client.ts` — added `apiPostForm()` (multipart helper; the other three helpers are JSON-only).
- `frontend/grid/lib/api/gigs.ts` — `generateGigCover(id, photo?)`.
- `frontend/grid/app/(dashboard)/gigs/new/page.tsx` — calls `generateGigCover(data.id)` fire-and-forget right after insert + the location update. No photo passed yet (no UI for it), so every gig gets a template-only cover immediately with zero host effort.
- `frontend/grid/types/index.ts` — `Gig.cover_image_url` / `cover_image_square_url` added.
- **Rendered:** Grid gigs list (`gigs/page.tsx`) — small square thumbnail per row (`cover_image_square_url`, falls back to an empty surface block if null; container is a genuine `w-11 h-11` square so no crop mismatch possible). Grid gig detail (`gigs/[id]/page.tsx`) — full portrait cover card at the top of the left column (`cover_image_url`, only rendered if present). **Bug fixed here:** originally used `h-72` (fixed height) with `object-cover`, which forced the 4:5 image into a landscape-ish box and cropped both the top (icon) and bottom (text) to fit. Changed to `aspect-[4/5]` so the container's proportions match the source image exactly — general rule reinforced twice in this feature now: never put a cover image in a container whose aspect ratio doesn't match the layout it was rendered for; either match the container to the image (CSS) or render a dedicated layout for that container (see "Square is its own render" above).
- **Pocket:** `types/database.ts` `gigs.Row` — `cover_image_url` / `cover_image_square_url` added (flows through automatically since Explore fetches full rows via `supabase.from("gigs").select("*")`, not the trimmed `ScoredGig`/`MatchedGig` matching-endpoint model — no backend model change needed there). Rendered on the gig detail screen (`app/(main)/gig/[id].tsx`) as a 4:5 hero image above the category badge.
- **Deliberately not touched:** the Explore swipe-deck card (`JobCard.tsx` "explore" variant) and the compact "space"/"event" list variant. The explore card's category header is a fixed 72px strip — too short for the portrait 4:5 art to read well without a redesign, and the compact variant is a text-only row shared across several screens with a documented history of fragile flex/layout bugs (see [[apps/mobile/patterns]] `PressableScale` gotcha) that isn't safe to restructure blind (no way to visually verify RN changes in this environment). Left as a deliberate follow-up, not an oversight.

## Verified

- **First round** (portrait-only): compositor unit-tested directly (Pillow/cairosvg, no Docker) with and without a photo. Full production round-trip verified on EC2 (`kria-backend` host): Pillow installed in the running `kria-api` container, Alembic at `0031 (head)`, `gigs.cover_image_url`/`cover_image_square_url` columns present, `gig-covers` bucket exists and is public, and a live `generate_cover → upload_cover` call inside the container produced a real image reachable at its public Supabase Storage URL. Confirmed via a real posted gig ("Videographer Needed") that `cover.png` and the (then crop-based) `cover-square.png` were both correct — but only checked the images themselves, not yet how Grid *displayed* them, which is where the `h-72`/`object-cover` bug was hiding.
- **Second round** (own-composition square + detail-page aspect fix): new square templates rendered and visually checked for all changed categories (media-content, hospitality) before wiring into the compositor. Full `generate_cover`/`generate_square_cover` output re-checked together (same gig data) — both layouts read cleanly, text fully visible, no cropping. Grid (`tsc --noEmit`) re-checked clean.
- **Not yet verified:** this second round hasn't been deployed/tested on EC2 yet (needs another Docker image rebuild — new `*_square.png` asset files plus the `manifest.py`/`compositor.py` restructure) — still local-only as of the last commit check.

## Next Steps

1. **Deploy this round** — rebuild `kria-api` on EC2 (new asset files + compositor/manifest changes won't apply from a restart alone), then regenerate the cover for the one real gig already posted (`POST /gigs/{id}/cover` again) so its square image switches from the old crop to the new composition.
2. **Photo upload UI** — a step/panel in Grid's wizard (and eventually the hidden Pocket host flow) to let hosts pick a photo before/after posting, calling `generateGigCover(id, photoFile)`. Backend already supports it; no UI yet.
3. Render the cover on Pocket's Explore swipe card and the compact list card — needs a small design pass first (see "Deliberately not touched" above), not just a drop-in.
4. OG meta tags for gig links (WhatsApp sharing) using `cover_image_square_url` — not wired.
5. Regenerate covers for gigs created before this feature shipped (`cover_image_url` will be `null` for them) — either a backfill script or just leave them without a cover.

See also: [[gigs]] (category taxonomy + wizard steps), [[gig_cover_asset_pipeline]] (how the art assets were made/can be regenerated).
