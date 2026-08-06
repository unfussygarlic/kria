# Gig Cover Images

## v2 — 2026-08-07 rewrite (fully programmatic)

The compositor is now **100% programmatic** — no more pre-baked PNG assets. `backend/api/app/covers/assets/{slug}/{background,foreground}[_square].png` still exist on disk but nothing reads them. Can be deleted in a hygiene commit.

**Why the rewrite:** the old `foreground.png` per category was a coral/accent rectangular frame + triangle corner mark. Its bottom edge sat ~20 px above the title anchor and overlapped the title text on many device sizes (user screenshot 2026-08-06 confirmed the collision on hospitality). The whole frame layer is gone.

**New render pipeline:**
1. Obsidian base (`#0e0e0e`)
2. Two accent-colour radial "glow" blobs in the hero zone (primary upper-centre-left, secondary offset upper-right) — rendered via filled ellipses with `ImageFilter.GaussianBlur`, cheap and naturally soft
3. Either the host photo (rounded, cover-fit into `photo_slot`) OR a programmatic category icon centred at `layout.icon_center` in the accent colour
4. Vertical fade from hero into text zone (transparent → dark, 100 px band)
5. Text zone at the bottom: chip (auto-sized pill with accent outline + tinted fill) → title (60 px bold white, 2 lines) → pay (52 px bold, accent) → venue+city (28 px semibold, 80 % white) → host name (24 px semibold, 55 % white)

**No chrome around the hero.** No rectangular frame, no corner marks, no floating pills. Hero and text zone separated purely by the vertical fade.

## Programmatic icons

Six icon draws in `compositor.py`, keyed by `CategoryGroup.icon_key`:

| Group | Icon key | Shape |
|-------|----------|-------|
| Event & Promotion | `sparkle` | Central filled 4-point diamond + 4 cardinal rays + 4 orbiting mini-diamonds at 45° |
| Hospitality | `plate` | Plate outline (ring + inner rim, faint fill) + fork (handle + 3 prongs) left + knife right |
| Technical Support | `waveform` | 5 rounded-cap pill bars, heights [35, 75, 55, 85, 42]% of icon size (symmetric-ish EQ) |
| Media & Content | `camera` | Rounded body + top viewfinder hump + centred lens (outer circle + inner "iris" cutout in base colour) + flash square top-right |
| Stage & Hosting | `microphone` | Fully-rounded pill head + 3 grille lines cut in base colour + U-arc stand + vertical stem + horizontal base |
| Other | `bolt` | Kria zap motif — two joined triangle polygons forming a lightning shape |

All use a consistent `stroke = max(10, size // 22)` weight so the set feels cohesive. Icons are drawn in the accent colour at 100% alpha; where they use fills for readability (plate rim, camera body) it's `(*accent, 46)` — a faint tint of the same colour.

## Decisions Locked

## Concept

Every gig posted gets an auto-generated cover image, composited server-side from a pre-made template + live gig data. Explicitly **not** generative AI — template-based, like Canva's approach, for cost/latency/brand-consistency reasons.

## Decisions Locked

- **Assets: superseded (2026-08-07).** Old approach was pre-made per-category-group PNGs, authored by Claude (Python/cairosvg). Replaced by the fully programmatic v2 renderer above. `[[gig_cover_asset_pipeline]]` and the `frontend/master-assets/generate_*.py` scripts are historical — do not run them. The `backend/api/app/covers/assets/{slug}/*.png` files can be deleted.
- **Categories:** **6 groups, not 14.** Mid-build, discovered the earlier 14-category list (Retail/Delivery/Security/etc.) didn't match the actual product — Kria's gig wizard uses 6 role-groups (Event & Promotion, Hospitality, Technical Support, Media & Content, Stage & Hosting, Other), since Kria is specifically an **event-staffing** marketplace. Re-scoped: reused 4 of the 14 originals, built 2 new (Media & Content — camera icon; Stage & Hosting — microphone icon), dropped the other 8. See [[gigs]] "Categories" section for the corrected `GigCategory` → group mapping (this was also stale there and got fixed in the same pass).
- **Customization:** light — host can optionally upload their own photo, which drops into a **framed photo slot** within the template. No full custom editor. Backend supports this (`POST /gigs/{id}/cover` accepts an optional `photo` multipart field). **Grid wizard UI wired 2026-08-05** — Basic Info step now has an optional cover photo picker (JPEG/PNG/WebP, 10 MB cap, preview + Change/Remove). Uploaded photo passes to `generateGigCover(id, photo)`. See `apps/grid/overview.md` "Cover Photo Upload" section.
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

Render order (same for both layouts): `background → host photo (rounded-mask, cover-fit crop into the slot; or nothing if none uploaded) → foreground (alpha-composited on top) → text (category chip, title, pay, venue+city, host — drawn by Pillow, never baked into the art)`.

Geometry is identical **within** a layout across all 6 groups (only accent color and icon differ) but different **between** the two layouts (portrait vs square) — see `manifest.PORTRAIT` / `manifest.SQUARE`.

## Backend (built)

- `backend/api/app/covers/manifest.py` — `Layout` dataclass, `PORTRAIT`/`SQUARE` instances, `GROUPS` (slug → label/color), `CATEGORY_TO_GROUP` (the 17 `GigCategory` role values → group slug). `Layout` has `venue_y` + `host_y` (separate lines, added for the "cover as full Explore card" redesign — see below), not a single `host_city_y` anymore.
- `backend/api/app/covers/compositor.py` — `generate_cover(category, title, pay_label, venue, city, host_name, photo_bytes=None) -> bytes` and `generate_square_cover(...)` (same signature/order). Both delegate to a shared `_render(layout, ...)`. Text zone now draws 4 lines: title (up to 2), pay, **venue + city** (e.g. "UB City Mall · Bengaluru"), and host name (dimmer, smaller, secondary to venue). Chip label font auto-shrinks (22px down to 12px) to fit the fixed-width pill since group labels vary in length ("Other" vs "Event & Promotion"). Fonts: `SpaceGrotesk_700Bold`/`600SemiBold` copied from `frontend/pocket/node_modules/@expo-google-fonts/space-grotesk/` into `covers/assets/fonts/` (Pillow needs a real .ttf on disk, can't use the Google Fonts loader mobile/web use).
- `backend/api/app/covers/storage.py` — `upload_cover(gig_id, filename, png_bytes) -> url`.
- `backend/api/app/routers/gigs.py` — `POST /gigs/{gig_id}/cover` (ownership-checked like `/pause`, `/location`). Accepts optional `photo` multipart field. Query now also selects `g.venue_name`. Renders both layouts, uploads both, updates `gigs.cover_image_url` / `cover_image_square_url`, returns both URLs.
- Migration `0031_gig_cover_images.py` — adds `cover_image_url TEXT`, `cover_image_square_url TEXT` to `gigs`.
- `requirements.txt` — added `pillow==11.1.0`. **Docker image needs a rebuild** (`docker-compose up --build kria-api`) since this is a new dependency, not just a code change — bind-mounted source alone won't install it. Every round of asset/compositor changes (including this one — new venue text zone) needs another rebuild; a plain restart never picks up new code or new asset files.

## Frontend

### Grid

- `frontend/grid/lib/api/client.ts` — added `apiPostForm()` (multipart helper; the other three helpers are JSON-only).
- `frontend/grid/lib/api/gigs.ts` — `generateGigCover(id, photo?)`.
- `frontend/grid/app/(dashboard)/gigs/new/page.tsx` — calls `generateGigCover(data.id)` fire-and-forget right after insert + the location update. No photo UI yet, so every gig gets a template-only cover immediately with zero host effort.
- `frontend/grid/types/index.ts` — `Gig.cover_image_url` / `cover_image_square_url` added.
- **Rendered:** gigs list (`gigs/page.tsx`) — small square thumbnail per row (`cover_image_square_url`, genuine `w-11 h-11` square container, no crop mismatch possible). Gig detail (`gigs/[id]/page.tsx`) — full portrait cover card at the top of the left column (`cover_image_url`). **Bug fixed here:** originally used `h-72` (fixed height) with `object-cover`, forcing the 4:5 image into a landscape-ish box and cropping both top and bottom. Changed to `aspect-[4/5]`.

### Pocket

- `frontend/pocket/lib/api/gigs.ts` — `generateGigCover(id, photo?)`, using the RN `{uri,name,type}` FormData file shape already established by `lib/api/profile.ts` (identity verification uploads) — same `apiPostFormData` helper, same convention.
- `frontend/pocket/stores/gigStore.ts` `createGig()` — calls `generateGigCover(data.id)` fire-and-forget right after insert, mirroring Grid exactly. This is the hidden Host "post a gig" flow (`SHOW_HOST_ROLE=false`) — wired for when/if that ships, costs nothing while hidden.
- `frontend/pocket/types/database.ts` `gigs.Row` — `cover_image_url` / `cover_image_square_url` added (flows through automatically on Explore since it fetches full rows via `supabase.from("gigs").select("*")`, not the trimmed `ScoredGig`/`MatchedGig` matching-endpoint model — no backend model change needed).
- **Rendered — gig detail screen** (`app/(main)/gig/[id].tsx`): 4:5 hero image (`cover_image_url`) above the category badge, `aspectRatio: 4/5` (not a fixed height — learned that lesson on Grid already, applied correctly here from the start).

#### Explore swipe-deck card — redesigned to use the cover as the whole card (changed 2026-07-30, extended 2026-08-05)

First pass (superseded) squeezed a sliver of `cover_image_square_url` behind the existing 116px `categoryHeader` gradient strip — technically an improvement over nothing, but still an awkward crop of a design meant to be seen in full. User's call: the cover art *is* the card, not a decoration on it.

`JobCard.tsx` "explore" variant is a **cover-shaped canvas** regardless of whether a photo exists:
- **Has a cover** (`cover_image_url` present): full portrait image (`aspectRatio: 4/5`) as the canvas.
- **No cover** (2026-08-05 fallback redesign): `<FallbackHero>` inline component — category-color gradient background with a huge tinted watermark of the category label + a bottom text zone mirroring the compositor's baked layout (chip → title → pay → venue). Same 4:5 aspect. Feels intentional, not "second-class". Old hand-built centered card (title/description/pay/details/tags) is retired for the explore variant.
- **Both branches share the same overlay stack** (see `features/gig_card.md`):
  - Top-left: `TimeToStartPill` (only within 24h)
  - Top-right stack: `MomentumBadge` + Boost + `SpotsChipOverlay` (pulses when ≤3, amber → coral escalation)
  - Bottom-left: `HostAvatarChip` (avatar + verified check + rating)
- **Static facts (title/pay/venue/host name) are baked at generation time; anything that can change after posting (spots filled, boost, live momentum, host verified status, time-to-start) is a React Native overlay** so it's never stale.
- `SwipeableJobCard.tsx`'s Apply/Nav swipe overlays are separate siblings of `<JobCard>`, not nested inside it.

Compact list card (Space/Event lists) unchanged: 40×40 `cover_image_square_url` thumbnail in `headerRow`.

## Verified

- **Round 1** (portrait-only): compositor unit-tested directly (Pillow/cairosvg). Full production round-trip verified on EC2: Pillow installed, Alembic at `0031 (head)`, columns present, `gig-covers` bucket public, live `generate_cover → upload_cover` produced a real reachable image. Confirmed via a real posted gig that images themselves were correct — but hadn't yet checked how Grid *displayed* them (where the `h-72` bug was hiding).
- **Round 2** (own-composition square + Grid aspect fix): new square templates rendered and visually checked; `generate_cover`/`generate_square_cover` re-checked together; Grid `tsc --noEmit` clean. **Deployed to EC2** (user-confirmed).
- **Round 3** (Pocket wiring): `generateGigCover` calls added to Pocket's `createGig`; Pocket `tsc --noEmit` re-checked, all errors traced to pre-existing issues.
- **Round 4** (venue text zone + Explore card redesign — this round): backend re-tested directly (Pillow) with real venue/city/host data on both layouts — venue and host lines render cleanly with correct hierarchy (see the rendered samples generated during this session). Pocket `tsc --noEmit` re-checked clean (same one pre-existing `formatTime` error, nothing new). Confirmed by reading the code that `SwipeableJobCard`'s swipe overlays are separate from `<JobCard>` before making changes, and that `explore.tsx`'s deck container centers children regardless of height (so a variable-height cover card needed no container changes).
- **Not yet done for any Pocket round:** visual testing in the actual Expo app (no way to run/screenshot Expo Go from this environment), and deployment (Pocket changes ship via app build/OTA update, not the EC2 backend — nothing to "deploy" here yet, this is still local/uncommitted as of this round).

## Regenerating existing covers after a compositor change

Covers stored in Supabase Storage don't auto-regenerate. After deploying a compositor change, run the one-off:

```bash
docker exec kriya_kria-api_1 python -m app.scripts.regenerate_covers
```

Flags: `--only-null` (skip gigs that already have a URL), `--limit N` (smoke test). Safe to re-run — each cover overwrites the previous `{gig_id}/cover.png` + `{gig_id}/cover-square.png` via `x-upsert`.

**Photo caveat:** the regen script doesn't re-upload host photos (we never stored the raw photo bytes — only the composed PNG). Regenerated covers become template-only until the host re-uploads via Grid's wizard photo picker.

## Next Steps

1. **Run the Pocket app and actually look at the Explore card** — this is now the highest-value thing to verify, since it's a real layout redesign (not just an additive overlay like the compact list thumbnail was). Check: does the badge stack sit legibly over the icon zone across all 6 categories, does the card's height look right in the deck, does the fallback (no-cover) path still look exactly as before.
2. Regenerate the cover for the one real gig already posted on EC2 (`POST /gigs/{id}/cover` again) so it picks up the venue line and the Round 2 own-composition square.
3. **Photo upload UI** — a step/panel in Grid's wizard (and eventually the Pocket host flow) to let hosts pick a photo before/after posting, calling `generateGigCover(id, photoFile)`. Backend supports it on both platforms; no UI yet on either.
4. OG meta tags for gig links (WhatsApp sharing) using `cover_image_square_url` — not wired.
5. Regenerate covers for gigs created before this feature shipped (`cover_image_url` will be `null` for them) — either a backfill script or just leave them without a cover.

See also: [[gigs]] (category taxonomy + wizard steps), [[gig_cover_asset_pipeline]] (how the art assets were made/can be regenerated).
