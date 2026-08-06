"""
Pillow compositor for gig cover images — v2 (2026-08-07 redesign).

Fully programmatic — no more pre-baked PNG assets. Every cover is rendered
from scratch:

  1. Obsidian base (#0e0e0e).
  2. Two accent-colour radial "glow" blobs in the hero zone (upper 55–60%),
     rendered as filled ellipses with heavy Gaussian blur.
  3. Optional host photo — if provided, it fills the hero zone (rounded).
     Otherwise the compositor draws a programmatic category icon centred in
     the hero zone (stroked, in the accent colour).
  4. Soft vertical fade from hero to text zone (no hard line).
  5. Text zone at the bottom: chip → title → pay → venue → host name, in
     the same order as the old design but with more breathing room.

Why the rewrite: the previous version loaded a pre-made `foreground.png`
per category — a rectangular frame + triangle corner mark rendered around
the icon zone. Its bottom edge sat 20 px above the title anchor and
overlapped the text on some device sizes. This version has no chrome
around the hero at all: the hero and text zone are separated purely by
the vertical fade + typography.
"""
import io
import math
import os

from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

from app.covers.manifest import PORTRAIT, SQUARE, Layout, group_for_category

_ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
_FONTS_DIR = os.path.join(_ASSETS_DIR, "fonts")
_FONT_BOLD = os.path.join(_FONTS_DIR, "SpaceGrotesk_700Bold.ttf")
_FONT_SEMIBOLD = os.path.join(_FONTS_DIR, "SpaceGrotesk_600SemiBold.ttf")

_font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}

BASE = (14, 14, 14, 255)          # #0e0e0e — obsidian base
TEXT_ZONE_BG = (12, 12, 12, 255)  # #0c0c0c — subtly darker for depth
WHITE = (255, 255, 255, 255)


# ── Fonts ─────────────────────────────────────────────────────────────────────

def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    key = (path, size)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, size)
    return _font_cache[key]


# ── Colour helpers ────────────────────────────────────────────────────────────

def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    hex_color = hex_color.lstrip("#")
    return tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))  # type: ignore[return-value]


def _readable_on(rgb: tuple[int, int, int]) -> tuple[int, int, int, int]:
    r, g, b = rgb
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    return (0, 0, 0, 255) if lum > 160 else (255, 255, 255, 255)


# ── Primitives ────────────────────────────────────────────────────────────────

def _rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [(0, 0), (size[0] - 1, size[1] - 1)], radius=radius, fill=255,
    )
    return mask


def _glow_blob(
    canvas_size: tuple[int, int],
    center: tuple[int, int],
    radius: int,
    color: tuple[int, int, int],
    alpha: int,
    blur: float | None = None,
) -> Image.Image:
    """Soft radial glow — filled ellipse + Gaussian blur. Cheaper than a
    per-pixel gradient and produces a naturally-soft edge."""
    img = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    cx, cy = center
    draw.ellipse(
        [cx - radius, cy - radius, cx + radius, cy + radius],
        fill=(*color, alpha),
    )
    return img.filter(ImageFilter.GaussianBlur(radius=blur if blur is not None else radius / 2.5))


def _vertical_fade(
    canvas_size: tuple[int, int],
    start_y: int,
    end_y: int,
    color: tuple[int, int, int],
    start_alpha: int = 0,
    end_alpha: int = 255,
) -> Image.Image:
    """Solid-colour overlay whose alpha ramps from start_alpha to end_alpha
    between start_y and end_y (below end_y stays at end_alpha)."""
    w, h = canvas_size
    img = Image.new("RGBA", canvas_size, (*color, 0))
    draw = ImageDraw.Draw(img)
    span = max(1, end_y - start_y)
    for y in range(start_y, min(h, end_y + 1)):
        a = int(start_alpha + (end_alpha - start_alpha) * (y - start_y) / span)
        draw.line([(0, y), (w, y)], fill=(*color, a))
    if end_y < h:
        draw.rectangle([(0, end_y), (w, h)], fill=(*color, end_alpha))
    return img


# ── Icons (programmatic, stroke-based, category-specific) ─────────────────────

def _draw_icon(draw: ImageDraw.ImageDraw, icon_key: str, cx: int, cy: int, size: int, rgb: tuple[int, int, int]) -> None:
    """Draw one of the category icons centred at (cx, cy) fitting in a
    `size × size` bounding box. Uses a consistent stroke weight so every
    icon feels part of the same set."""
    color = (*rgb, 255)
    faint = (*rgb, 46)
    stroke = max(10, size // 22)

    if icon_key == "plate":
        _icon_plate(draw, cx, cy, size, stroke, color, faint)
    elif icon_key == "sparkle":
        _icon_sparkle(draw, cx, cy, size, stroke, color, faint)
    elif icon_key == "waveform":
        _icon_waveform(draw, cx, cy, size, stroke, color, faint)
    elif icon_key == "camera":
        _icon_camera(draw, cx, cy, size, stroke, color, faint)
    elif icon_key == "microphone":
        _icon_microphone(draw, cx, cy, size, stroke, color, faint)
    else:
        _icon_bolt(draw, cx, cy, size, stroke, color, faint)


def _icon_plate(draw, cx, cy, size, stroke, color, faint):
    """Hospitality — plate + fork + knife, spread horizontally."""
    plate_r = int(size * 0.34)
    # Plate — big ring with a faint fill so it reads as a plate, not a hoop
    draw.ellipse([cx - plate_r, cy - plate_r, cx + plate_r, cy + plate_r], fill=faint)
    draw.ellipse(
        [cx - plate_r, cy - plate_r, cx + plate_r, cy + plate_r],
        outline=color, width=stroke,
    )
    inner_r = int(plate_r * 0.62)
    draw.ellipse(
        [cx - inner_r, cy - inner_r, cx + inner_r, cy + inner_r],
        outline=color, width=max(3, stroke // 2),
    )
    # Fork to the left of the plate
    fx = cx - plate_r - int(size * 0.14)
    handle_top = cy - int(size * 0.16)
    handle_bot = cy + int(size * 0.22)
    prong_bot = cy - int(size * 0.05)
    # Handle
    draw.line([(fx, cy - int(size * 0.02)), (fx, handle_bot)], fill=color, width=stroke)
    # 3 prongs
    prong_spacing = stroke
    for i, dx in enumerate((-prong_spacing, 0, prong_spacing)):
        draw.line([(fx + dx, handle_top), (fx + dx, prong_bot)], fill=color, width=max(3, stroke // 2))
    # Knife to the right — a single tapered stroke
    kx = cx + plate_r + int(size * 0.14)
    draw.line([(kx, cy - int(size * 0.22)), (kx, cy + int(size * 0.22))], fill=color, width=stroke)
    # Little handle notch at the bottom of the knife
    draw.line([(kx - stroke // 2, cy + int(size * 0.10)), (kx + stroke // 2, cy + int(size * 0.10))], fill=color, width=stroke // 2)


def _icon_sparkle(draw, cx, cy, size, stroke, color, faint):
    """Event & Promotion — 4-point burst with rays and orbiting sparkles."""
    def diamond(x, y, r, fill=None, outline=None, width=stroke):
        points = [(x, y - r), (x + r, y), (x, y + r), (x - r, y)]
        if fill:
            draw.polygon(points, fill=fill)
        if outline:
            draw.polygon(points, outline=outline)

    # Central big diamond, filled
    big_r = int(size * 0.24)
    diamond(cx, cy, big_r, fill=color)
    # 4 rays extending out at cardinal directions (drawn as diamonds slightly further out)
    ray_len = int(size * 0.44)
    ray_thick = max(4, stroke // 2)
    # up
    draw.line([(cx, cy - big_r - stroke), (cx, cy - ray_len)], fill=color, width=ray_thick)
    # down
    draw.line([(cx, cy + big_r + stroke), (cx, cy + ray_len)], fill=color, width=ray_thick)
    # left
    draw.line([(cx - big_r - stroke, cy), (cx - ray_len, cy)], fill=color, width=ray_thick)
    # right
    draw.line([(cx + big_r + stroke, cy), (cx + ray_len, cy)], fill=color, width=ray_thick)
    # 4 small orbiting sparkles at 45°
    orbit = int(size * 0.36)
    small_r = int(size * 0.06)
    for angle_deg in (45, 135, 225, 315):
        rad = math.radians(angle_deg)
        ox = cx + int(orbit * math.cos(rad))
        oy = cy + int(orbit * math.sin(rad))
        diamond(ox, oy, small_r, fill=color)


def _icon_waveform(draw, cx, cy, size, stroke, color, faint):
    """Technical Support — 5-bar equalizer with rounded caps."""
    bar_w = max(stroke * 2, int(size * 0.08))
    gap = int(size * 0.06)
    # Heights from left: short, tall, mid, tall, short (symmetric)
    heights_frac = [0.35, 0.75, 0.55, 0.85, 0.42]
    total_w = 5 * bar_w + 4 * gap
    start_x = cx - total_w // 2
    for i, h_frac in enumerate(heights_frac):
        x = start_x + i * (bar_w + gap)
        h = int(size * h_frac)
        # Draw pill-shaped bar centred vertically on cy
        top = cy - h // 2
        bot = cy + h // 2
        draw.rounded_rectangle([x, top, x + bar_w, bot], radius=bar_w // 2, fill=color)


def _icon_camera(draw, cx, cy, size, stroke, color, faint):
    """Media & Content — camera body + lens."""
    body_w = int(size * 0.86)
    body_h = int(size * 0.68)
    body_r = int(size * 0.10)
    left = cx - body_w // 2
    right = cx + body_w // 2
    top = cy - body_h // 2 + int(size * 0.06)
    bot = cy + body_h // 2 + int(size * 0.06)
    # Small viewfinder hump on top-left of the body
    hump_w = int(size * 0.22)
    hump_h = int(size * 0.10)
    hump_left = left + int(size * 0.12)
    draw.rounded_rectangle(
        [hump_left, top - hump_h, hump_left + hump_w, top + stroke], radius=stroke, fill=color,
    )
    # Body (outline only, faint fill)
    draw.rounded_rectangle([left, top, right, bot], radius=body_r, fill=faint)
    draw.rounded_rectangle([left, top, right, bot], radius=body_r, outline=color, width=stroke)
    # Lens — concentric circles centred in the body
    lens_r = int(size * 0.20)
    lens_cy = (top + bot) // 2
    draw.ellipse([cx - lens_r, lens_cy - lens_r, cx + lens_r, lens_cy + lens_r], fill=color)
    inner_r = int(lens_r * 0.55)
    draw.ellipse(
        [cx - inner_r, lens_cy - inner_r, cx + inner_r, lens_cy + inner_r], fill=BASE,
    )
    # Flash — small square at top-right
    flash_size = max(stroke, int(size * 0.05))
    draw.rectangle(
        [right - int(size * 0.14), top + stroke, right - int(size * 0.14) + flash_size, top + stroke + flash_size],
        fill=color,
    )


def _icon_microphone(draw, cx, cy, size, stroke, color, faint):
    """Stage & Hosting — mic head + curved stand."""
    head_w = int(size * 0.34)
    head_h = int(size * 0.50)
    head_top = cy - int(size * 0.32)
    head_bot = head_top + head_h
    head_left = cx - head_w // 2
    head_right = cx + head_w // 2
    # Mic head — fully-rounded pill (head_w/2 radius)
    draw.rounded_rectangle(
        [head_left, head_top, head_right, head_bot],
        radius=head_w // 2,
        fill=color,
    )
    # Grille lines inside the head — 3 horizontal, drawn in base colour to look "cut out"
    grille_left = head_left + stroke
    grille_right = head_right - stroke
    for i in range(3):
        y = head_top + int(head_h * (0.30 + i * 0.20))
        draw.line([(grille_left, y), (grille_right, y)], fill=BASE, width=max(2, stroke // 3))
    # Curved stand arc — U-shape below the head
    arc_top = cy + int(size * 0.14)
    arc_bot = cy + int(size * 0.28)
    arc_left = cx - int(size * 0.28)
    arc_right = cx + int(size * 0.28)
    draw.arc([arc_left, arc_top - int(size * 0.10), arc_right, arc_bot + int(size * 0.10)], start=0, end=180, fill=color, width=stroke)
    # Vertical stem from arc bottom to base
    stem_top = arc_bot + int(size * 0.02)
    stem_bot = cy + int(size * 0.40)
    draw.line([(cx, stem_top), (cx, stem_bot)], fill=color, width=stroke)
    # Base — horizontal line
    base_half = int(size * 0.14)
    draw.line([(cx - base_half, stem_bot), (cx + base_half, stem_bot)], fill=color, width=stroke)


def _icon_bolt(draw, cx, cy, size, stroke, color, faint):
    """Other — clean lightning bolt (Kria's zap motif)."""
    # Bolt is a zig-zag polygon
    #  top:      cx-w, cy-h
    #  waist L:  cx-w/3, cy
    #  waist R:  cx+w/3, cy (mid strip)
    #  bot:      cx+w, cy+h
    w = int(size * 0.28)
    h = int(size * 0.44)
    tip_top = (cx + int(w * 0.15), cy - h)
    tip_bot = (cx - int(w * 0.15), cy + h)
    points = [
        (cx + w // 3, cy - h),                # top-right start
        (cx - w // 3, cy - int(h * 0.10)),    # left-mid step down
        (cx + int(w * 0.06), cy - int(h * 0.10)),  # slight right
        (cx - w // 3, cy + h),                # bottom-left
        (cx + w // 3, cy + int(h * 0.10)),    # right-mid
        (cx - int(w * 0.06), cy + int(h * 0.10)),  # slight left
    ]
    # Simpler bolt path — two joined triangles
    bolt = [
        (cx + int(w * 0.10), cy - h),
        (cx - int(w * 0.65), cy + int(h * 0.10)),
        (cx - int(w * 0.05), cy + int(h * 0.10)),
        (cx - int(w * 0.10), cy + h),
        (cx + int(w * 0.65), cy - int(h * 0.10)),
        (cx + int(w * 0.05), cy - int(h * 0.10)),
    ]
    draw.polygon(bolt, fill=color)


# ── Photo pasting ─────────────────────────────────────────────────────────────

def _paste_photo(base: Image.Image, photo_bytes: bytes, layout: Layout) -> None:
    """Cover-fit crop the photo into the hero photo slot with rounded corners."""
    photo = Image.open(io.BytesIO(photo_bytes))
    photo = ImageOps.exif_transpose(photo).convert("RGB")

    slot_x, slot_y, slot_w, slot_h = layout.photo_slot
    src_w, src_h = photo.size
    target_ratio = slot_w / slot_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        photo = photo.crop((left, 0, left + new_w, src_h))
    else:
        new_h = int(src_w / target_ratio)
        top = (src_h - new_h) // 2
        photo = photo.crop((0, top, src_w, top + new_h))

    photo = photo.resize((slot_w, slot_h), Image.LANCZOS).convert("RGBA")
    mask = _rounded_mask((slot_w, slot_h), layout.photo_slot_radius)
    base.paste(photo, (slot_x, slot_y), mask)


# ── Text helpers ──────────────────────────────────────────────────────────────

def _wrap_text(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int, max_lines: int) -> list[str]:
    words = text.split()
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
            if len(lines) == max_lines - 1:
                break
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
    remaining_words = words[sum(len(line.split()) for line in lines):]
    if remaining_words and lines:
        last = lines[-1]
        while draw.textlength(last + "…", font=font) > max_width and " " in last:
            last = last.rsplit(" ", 1)[0]
        lines[-1] = last + "…"
    return lines


def _draw_chip(draw: ImageDraw.ImageDraw, label: str, layout: Layout, rgb: tuple[int, int, int]) -> None:
    """Small pill at the top-left of the text zone. Auto-sized to text."""
    font = _font(_FONT_SEMIBOLD, 20)
    label = label.upper()
    text_w = draw.textlength(label, font=font)
    pad_x = 14
    pad_y = 8
    x = layout.text_zone_x
    y = layout.chip_y
    w = int(text_w + pad_x * 2)
    h = layout.chip_h
    # Tinted background with a coloured outline
    bg = (*rgb, 40)
    outline = (*rgb, 200)
    draw.rounded_rectangle([x, y, x + w, y + h], radius=h // 2, fill=bg, outline=outline, width=2)
    # Text vertically centred
    draw.text((x + pad_x, y + h / 2), label, font=font, fill=(*rgb, 255), anchor="lm")


# ── Main render ───────────────────────────────────────────────────────────────

def _render(
    layout: Layout,
    category: str,
    title: str,
    pay_label: str,
    venue: str,
    city: str,
    host_name: str,
    photo_bytes: bytes | None,
) -> bytes:
    group = group_for_category(category)
    accent = _hex_to_rgb(group.color)
    canvas_size = (layout.canvas_w, layout.canvas_h)

    # ── 1. Base ──
    img = Image.new("RGBA", canvas_size, BASE)

    # ── 2. Hero glows ──
    # Primary blob: large, positioned upper-centre-left, high alpha
    primary = _glow_blob(
        canvas_size,
        center=(int(layout.canvas_w * 0.35), int(layout.hero_h * 0.45)),
        radius=int(layout.canvas_w * 0.55),
        color=accent,
        alpha=110,
    )
    img.alpha_composite(primary)
    # Secondary offset blob for depth
    secondary = _glow_blob(
        canvas_size,
        center=(int(layout.canvas_w * 0.78), int(layout.hero_h * 0.18)),
        radius=int(layout.canvas_w * 0.30),
        color=accent,
        alpha=80,
    )
    img.alpha_composite(secondary)

    # ── 3. Photo (if provided) or programmatic icon ──
    if photo_bytes:
        _paste_photo(img, photo_bytes, layout)
    else:
        # Draw the icon on a scratch layer so its stroke antialiasing looks clean
        icon_layer = Image.new("RGBA", canvas_size, (0, 0, 0, 0))
        idraw = ImageDraw.Draw(icon_layer)
        _draw_icon(idraw, group.icon_key, layout.icon_center[0], layout.icon_center[1], layout.icon_size, accent)
        img.alpha_composite(icon_layer)

    # ── 4. Vertical fade from hero into text zone ──
    fade = _vertical_fade(
        canvas_size,
        start_y=layout.hero_h - 80,
        end_y=layout.hero_h + 20,
        color=(12, 12, 12),
        start_alpha=0,
        end_alpha=255,
    )
    img.alpha_composite(fade)

    # ── 5. Text zone ──
    draw = ImageDraw.Draw(img)
    max_text_width = layout.text_zone_right - layout.text_zone_x

    # Category chip
    _draw_chip(draw, group.label, layout, accent)

    # Title (bold, white, up to 2 lines)
    title_font = _font(_FONT_BOLD, layout.title_font_size)
    title_lines = _wrap_text(draw, title, title_font, max_text_width, max_lines=layout.title_max_lines)
    y = layout.title_y
    for line in title_lines:
        draw.text((layout.text_zone_x, y), line, font=title_font, fill=WHITE, anchor="lt")
        y += layout.title_line_height

    # Pay (accent color, bold)
    pay_font = _font(_FONT_BOLD, layout.pay_font_size)
    draw.text((layout.text_zone_x, layout.pay_y), pay_label, font=pay_font, fill=(*accent, 255), anchor="lt")

    # Venue + city
    meta_font = _font(_FONT_SEMIBOLD, layout.meta_font_size)
    venue_text = f"{venue} · {city}" if venue and city else (venue or city or "")
    if venue_text:
        venue_lines = _wrap_text(draw, venue_text, meta_font, max_text_width, max_lines=1)
        if venue_lines:
            draw.text((layout.text_zone_x, layout.venue_y), venue_lines[0], font=meta_font, fill=(255, 255, 255, 210), anchor="lt")

    # Host name (dimmest — meta signal, not primary)
    if host_name:
        host_font = _font(_FONT_SEMIBOLD, layout.meta_font_size - 4)
        host_lines = _wrap_text(draw, host_name, host_font, max_text_width, max_lines=1)
        if host_lines:
            draw.text((layout.text_zone_x, layout.host_y), host_lines[0], font=host_font, fill=(255, 255, 255, 140), anchor="lt")

    out = io.BytesIO()
    img.convert("RGB").save(out, format="PNG", optimize=True)
    return out.getvalue()


# ── Public entrypoints ────────────────────────────────────────────────────────

def generate_cover(
    category: str,
    title: str,
    pay_label: str,
    venue: str,
    city: str,
    host_name: str,
    photo_bytes: bytes | None = None,
) -> bytes:
    """Renders the primary 4:5 gig cover (1080×1350) and returns PNG bytes."""
    return _render(PORTRAIT, category, title, pay_label, venue, city, host_name, photo_bytes)


def generate_square_cover(
    category: str,
    title: str,
    pay_label: str,
    venue: str,
    city: str,
    host_name: str,
    photo_bytes: bytes | None = None,
) -> bytes:
    """Renders the 1:1 gig cover (1080×1080) for OG/WhatsApp previews + list thumbnails."""
    return _render(SQUARE, category, title, pay_label, venue, city, host_name, photo_bytes)
