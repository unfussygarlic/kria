"""
Static layout + category mapping for gig cover images.

Two independent layouts — "portrait" (the primary 4:5 card) and "square"
(1080x1080, its own composition for OG/WhatsApp previews and thumbnails —
NOT a crop of the portrait one; see memory/features/gig_cover_images.md for
why). Geometry is identical across every category within a given layout
(only accent color and icon motif differ), so this is two shared layouts,
not a manifest per category. Coordinates below are the exact values baked
into the foreground SVGs — see frontend/master-assets/generate_foregrounds.py
— keep in sync if the templates are regenerated with a different frame.
"""
from dataclasses import dataclass


@dataclass(frozen=True)
class Layout:
    canvas_w: int
    canvas_h: int
    background_file: str
    foreground_file: str
    photo_slot: tuple[int, int, int, int]  # x, y, w, h
    photo_slot_radius: int
    chip: tuple[int, int, int, int]  # x, y, w, h
    text_zone_x: int
    text_zone_right: int
    title_y: int
    title_line_height: int
    title_max_lines: int
    pay_y: int
    venue_y: int
    host_y: int
    title_font_size: int
    pay_font_size: int
    meta_font_size: int


PORTRAIT = Layout(
    canvas_w=1080, canvas_h=1350,
    background_file="background.png", foreground_file="foreground.png",
    photo_slot=(118, 100, 843, 850), photo_slot_radius=20,
    chip=(118, 50, 180, 40),
    text_zone_x=118, text_zone_right=962,
    title_y=970, title_line_height=58, title_max_lines=2,
    pay_y=1090, venue_y=1160, host_y=1210,
    title_font_size=52, pay_font_size=42, meta_font_size=28,
)

# Own composition, not a crop of PORTRAIT — see module docstring.
SQUARE = Layout(
    canvas_w=1080, canvas_h=1080,
    background_file="background_square.png", foreground_file="foreground_square.png",
    photo_slot=(118, 86, 844, 540), photo_slot_radius=20,
    chip=(118, 40, 180, 36),
    text_zone_x=118, text_zone_right=962,
    title_y=670, title_line_height=56, title_max_lines=2,
    pay_y=780, venue_y=830, host_y=875,
    title_font_size=52, pay_font_size=42, meta_font_size=28,
)

WHITE = (255, 255, 255, 255)
BLACK = (0, 0, 0, 255)


@dataclass(frozen=True)
class CategoryGroup:
    slug: str
    label: str
    color: str  # hex, matches the template's accent color


# Mirrors frontend/grid ROLE_GROUPS in app/(dashboard)/gigs/new/page.tsx —
# update both if the wizard's groups ever change.
GROUPS: dict[str, CategoryGroup] = {
    "event-promotion": CategoryGroup("event-promotion", "Event & Promotion", "#D4FF00"),
    "hospitality": CategoryGroup("hospitality", "Hospitality", "#ff7351"),
    "technical-support": CategoryGroup("technical-support", "Technical Support", "#8097ff"),
    "media-content": CategoryGroup("media-content", "Media & Content", "#FFC83D"),
    "stage-hosting": CategoryGroup("stage-hosting", "Stage & Hosting", "#D4FF00"),
    "other": CategoryGroup("other", "Other", "#8097ff"),
}

# gigs.category (GigCategory, the specific role — e.g. "usher") -> group slug.
# Keep in sync with the `value` fields in frontend/grid ROLE_GROUPS.
CATEGORY_TO_GROUP: dict[str, str] = {
    "event_registration": "event-promotion",
    "usher": "event-promotion",
    "booth_staff": "event-promotion",
    "promoter": "event-promotion",
    "sampling_promoter": "event-promotion",
    "lead_collection": "event-promotion",
    "event_helper": "event-promotion",
    "hospitality_staff": "hospitality",
    "guest_management": "hospitality",
    "front_desk": "hospitality",
    "event_tech_support": "technical-support",
    "sound_light_assistant": "technical-support",
    "photographer": "media-content",
    "videographer": "media-content",
    "social_media_creator": "media-content",
    "emcee": "stage-hosting",
    "other": "other",
}

DEFAULT_GROUP_SLUG = "other"


def group_for_category(category: str) -> CategoryGroup:
    slug = CATEGORY_TO_GROUP.get(category, DEFAULT_GROUP_SLUG)
    return GROUPS[slug]
