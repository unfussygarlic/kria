# Gig Cover Asset Pipeline (Claude-authored, not Stitch)

Companion to [[gig_cover_images]]. Supersedes the earlier Stitch handoff — the Round 1 Stitch backgrounds came back with baked-in text and an edgy "technical blueprint/field-manual" aesthetic that didn't fit. Pivoted to having Claude author the templates directly: faster iteration, no baked text risk, and full control over tone (asked for "user friendly, not edgy" — landed on **organic gradient blobs + a simple flat icon** per category, not the harsh line-art diagram look).

**Re-scoped from 14 categories to 6** partway through (see [[gig_cover_images]] and [[gigs]] "Categories") — the original 14-category list (Retail/Delivery/Security/etc.) didn't match Kria's actual event-staffing taxonomy. Current state below reflects the final 6-group set; the 14-category round (and the raw Stitch exports, `*_foreground_frame/`, `editorial_field_manual_style_background_for_*/`, `field_manual_system/`) still sit in `frontend/master-assets/` as historical artifacts but are unused.

## What Exists (`frontend/master-assets/`)

Two independent canvas profiles per category — **portrait** (1080×1350, primary card) and **square** (1080×1080) — see [[gig_cover_images]] "Square is its own render" for why the square one is a real second composition, not a crop of the portrait. Both scripts generate both profiles in one run.

- `covers/{slug}/background.png` (portrait) / `background_square.png` (square) — dark ink base with 3 soft blurred radial-gradient color blobs (group accent color) + one simple flat icon centered inside a soft tinted circle. Bottom of the canvas fades to ink to keep the text zone clean. No baked text. `generate_backgrounds.py` `PROFILES` dict controls canvas size, icon center, icon scale, and fade-start fraction per profile.
- `covers/{slug}/foreground.png` (portrait) / `foreground_square.png` (square) — transparent PNG. Thin rounded-rect border/photo-slot frame + corner tick accents + an empty category-label pill (top-left) + small triangle mark (bottom-right), all in the group's accent color. `generate_foregrounds.py` `FOREGROUND_PROFILES` dict controls the slot/chip rects per profile — portrait slot `(118.8, 100, 842.4, 850)`, square slot `(118, 86, 844, 540)` (shorter, since the square canvas has less total height and needs proportionally more of it left for text).
- `covers/{slug}/*.svg` — SVG sources for all 4 files per category (editable, regenerate via scripts below).
- `generate_backgrounds.py` — regenerates all 6 categories × 2 profiles = 12 backgrounds. Edit `CATEGORIES` (slug/color/icon key), `PROFILES` (canvas/layout per profile), or `icon_paths()` (motif) to change something, then rerun.
- `generate_foregrounds.py` — regenerates all 6 × 2 = 12 foreground frames (imports `CATEGORIES` from `generate_backgrounds.py` so slug/color stay in sync). Same parametric SVG per profile — only accent color changes between categories within a profile.
- `field_manual_system/DESIGN.md` — Stitch's own generated style guide from Round 1. **Not used** — kept only as a reference artifact of what was rejected (brutalist/technical aesthetic, Archivo Narrow/JetBrains Mono fonts, 0px corners). Do not follow this doc's direction.

The final assets also live at `backend/api/app/covers/assets/{slug}/` — 4 PNGs per category now (portrait + square × background + foreground), plus `fonts/` with `SpaceGrotesk_700Bold.ttf`/`600SemiBold.ttf` pulled from `frontend/pocket/node_modules/@expo-google-fonts/space-grotesk/` — that's the copy the backend actually reads. If you regenerate assets here, re-copy them into the backend location too (see command below).

## Category Group → Color → Icon Mapping

Mirrors `frontend/grid` `ROLE_GROUPS` and `backend/api/app/covers/manifest.py` `GROUPS` — keep all three in sync if this ever changes:

| Slug | Label | Color | Icon |
|---|---|---|---|
| event-promotion | Event & Promotion | Lime `#D4FF00` | confetti cone + dots |
| hospitality | Hospitality | Coral `#ff7351` | plate + cutlery |
| technical-support | Technical Support | Cobalt `#8097ff` | monitor + check |
| media-content | Media & Content | Amber `#FFC83D` | camera |
| stage-hosting | Stage & Hosting | Lime `#D4FF00` | microphone |
| other | Other | Cobalt `#8097ff` | abstract dots |

## Environment

No Python env existed for this repo's tooling scripts before this — created a dedicated venv rather than installing globally:

```bash
python3 -m venv ~/envs/covers
source ~/envs/covers/bin/activate
pip install cairosvg pillow
```

Use this env (not the host Python, not the `kriya_kria-api_1` Docker container — this is asset-generation tooling, unrelated to the backend) whenever touching `generate_backgrounds.py` / `generate_foregrounds.py`.

## Regenerating / Tweaking

```bash
cd frontend/master-assets
source ~/envs/covers/bin/activate
python3 generate_backgrounds.py      # backgrounds, both profiles
python3 generate_foregrounds.py      # foregrounds, both profiles (imports CATEGORIES from generate_backgrounds.py)

# then re-copy into the backend:
for slug in event-promotion hospitality technical-support media-content stage-hosting other; do
  cp covers/$slug/background.png covers/$slug/background_square.png \
     covers/$slug/foreground.png covers/$slug/foreground_square.png \
     ../../backend/api/app/covers/assets/$slug/
done
```

To preview a composite (background + foreground stacked) without touching the real deliverable files:
```python
from PIL import Image
bg = Image.open("covers/<slug>/background.png").convert("RGBA")
fg = Image.open("covers/<slug>/foreground.png").convert("RGBA")
Image.alpha_composite(bg, fg).save("/tmp/preview.png")
```

## Still Open

- Icons are simple hand-coded primitive shapes (circles/rects/paths), not a polished icon set — good enough for v1, worth a design pass later if it needs to look more premium.
- Blob positions are seeded-random per category and can occasionally overlap the icon circle awkwardly — acceptable for v1, tune `blob_defs_and_shapes()` seeds if a specific category looks off.
- Backend/compositor/migration are now built — see [[gig_cover_images]] for what's left (Supabase bucket creation, Docker rebuild, photo-upload UI).
