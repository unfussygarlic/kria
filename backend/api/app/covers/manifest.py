"""
Static layout + category mapping for gig cover images.

Geometry is identical across every group template (only accent color and
motif differ), so this is one shared layout, not a per-category manifest.
Coordinates below are the exact values baked into the foreground SVGs
(see frontend/master-assets/generate_foregrounds.py) — keep in sync if the
templates are regenerated with a different frame.
"""
from dataclasses import dataclass

CANVAS_W = 1080
CANVAS_H = 1350

# Photo slot — where an uploaded host photo is pasted, and where the
# background's own art shows through when no photo is supplied.
PHOTO_SLOT = (118, 100, 843, 850)  # x, y, w, h
PHOTO_SLOT_RADIUS = 20

# Category label pill (top-left, foreground layer already draws the filled
# pill shape — we only draw the label text on top of it).
CHIP = (118, 50, 180, 40)  # x, y, w, h

# Text zone — lower third, below the frame. Kept clear/dark in every
# background (bottom fade gradient starts at 62% of canvas height).
TEXT_ZONE_X = 118
TEXT_ZONE_RIGHT = 962
TITLE_Y = 990
PAY_Y = 1090
HOST_CITY_Y = 1160

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
