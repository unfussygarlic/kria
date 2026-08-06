"""
Layout + category mapping for gig cover images.

**v2 (2026-08-07):** compositor is now fully programmatic — no more baked
PNG assets. The old `foreground.png` rectangular frame overlapped the title
text on some device sizes; that whole layer is gone. `background_file` /
`foreground_file` fields are retained on the Layout dataclass only so the
existing `_load_layer` codepath doesn't blow up if anyone re-imports the
old compositor — the new compositor ignores them.

Layout coordinates below reflect the new hero/text split: hero zone at the
top (accent gradient + icon or photo), text zone at the bottom (title, pay,
venue, host). Numbers are the canonical layout — do not tweak without
regenerating existing gig covers on Supabase Storage.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Layout:
    canvas_w: int
    canvas_h: int
    hero_h: int                        # bottom Y of hero zone; text zone begins here
    photo_slot: tuple[int, int, int, int]  # x, y, w, h — inside the hero zone
    photo_slot_radius: int
    icon_center: tuple[int, int]       # rendered when no host photo is supplied
    icon_size: int                     # bounding-box side length in px
    text_zone_x: int                   # left margin of text zone
    text_zone_right: int               # right margin (for wrapping)
    chip_y: int                        # top Y of the category chip (inside text zone)
    chip_h: int
    title_y: int                       # top-left anchor of the first title line
    title_line_height: int
    title_max_lines: int
    pay_y: int
    venue_y: int
    host_y: int
    title_font_size: int
    pay_font_size: int
    meta_font_size: int
    # Legacy fields — kept so old code that imports these doesn't break; the
    # new compositor doesn't use them.
    background_file: str = ""
    foreground_file: str = ""
    chip: tuple[int, int, int, int] = (0, 0, 0, 0)


# Portrait — the primary 2:3 card runners see on the Explore deck.
# Canvas grew 1080×1350 → 1080×1620 (2026-08-07) so the hero art gets more
# breathing room and the text zone can host larger, more attention-grabbing
# typography. Client-side aspectRatio in JobCard.tsx must match (2/3).
PORTRAIT = Layout(
    canvas_w=1080, canvas_h=1620,
    hero_h=960,
    photo_slot=(60, 60, 960, 900), photo_slot_radius=32,
    icon_center=(540, 460), icon_size=440,
    text_zone_x=60, text_zone_right=1020,
    chip_y=1000, chip_h=48,
    title_y=1090, title_line_height=92, title_max_lines=2,
    pay_y=1330, venue_y=1450, host_y=1530,
    title_font_size=84, pay_font_size=76, meta_font_size=36,
)

# Square — 1:1 for OG/WhatsApp link previews + list thumbnails.
SQUARE = Layout(
    canvas_w=1080, canvas_h=1080,
    hero_h=600,
    photo_slot=(60, 60, 960, 520), photo_slot_radius=32,
    icon_center=(540, 270), icon_size=260,
    text_zone_x=60, text_zone_right=1020,
    chip_y=630, chip_h=36,
    title_y=700, title_line_height=60, title_max_lines=2,
    pay_y=850, venue_y=940, host_y=1000,
    title_font_size=52, pay_font_size=44, meta_font_size=26,
)


@dataclass(frozen=True)
class CategoryGroup:
    slug: str
    label: str
    color: str      # hex accent, matches Pocket's category colour
    icon_key: str   # key into _draw_icon() in compositor.py


# Mirrors frontend/grid ROLE_GROUPS in app/(dashboard)/gigs/new/page.tsx —
# update both if the wizard's groups ever change.
GROUPS: dict[str, CategoryGroup] = {
    "event-promotion":   CategoryGroup("event-promotion",   "Event & Promotion", "#D4FF00", "sparkle"),
    "hospitality":       CategoryGroup("hospitality",       "Hospitality",       "#ff7351", "plate"),
    "technical-support": CategoryGroup("technical-support", "Technical Support", "#8097ff", "waveform"),
    "media-content":     CategoryGroup("media-content",     "Media & Content",   "#FFC83D", "camera"),
    "stage-hosting":     CategoryGroup("stage-hosting",     "Stage & Hosting",   "#D4FF00", "microphone"),
    "other":             CategoryGroup("other",             "Other",             "#8097ff", "bolt"),
}

# gigs.category (GigCategory, the specific role — e.g. "usher") -> group slug.
# Keep in sync with the `value` fields in frontend/grid ROLE_GROUPS.
CATEGORY_TO_GROUP: dict[str, str] = {
    "event_registration":    "event-promotion",
    "usher":                 "event-promotion",
    "booth_staff":           "event-promotion",
    "promoter":              "event-promotion",
    "sampling_promoter":     "event-promotion",
    "lead_collection":       "event-promotion",
    "event_helper":          "event-promotion",
    "hospitality_staff":     "hospitality",
    "guest_management":      "hospitality",
    "front_desk":            "hospitality",
    "event_tech_support":    "technical-support",
    "sound_light_assistant": "technical-support",
    "photographer":          "media-content",
    "videographer":          "media-content",
    "social_media_creator":  "media-content",
    "emcee":                 "stage-hosting",
    "other":                 "other",
}

DEFAULT_GROUP_SLUG = "other"


def group_for_category(category: str) -> CategoryGroup:
    slug = CATEGORY_TO_GROUP.get(category, DEFAULT_GROUP_SLUG)
    return GROUPS[slug]
