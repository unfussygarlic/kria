"""
Pillow compositor for gig cover images.

Render order: background (category art, full-bleed) -> host photo (if any,
cropped/masked into the photo slot; background art shows through the slot
untouched if no photo) -> foreground (frame/border/chip, transparent PNG)
-> text (title/pay/host name/city, drawn here — never baked into the art).
"""
import io
import os

from PIL import Image, ImageDraw, ImageFont, ImageOps

from app.covers.manifest import (
    CANVAS_H,
    CANVAS_W,
    CHIP,
    GROUPS,
    HOST_CITY_Y,
    PAY_Y,
    PHOTO_SLOT,
    PHOTO_SLOT_RADIUS,
    TEXT_ZONE_RIGHT,
    TEXT_ZONE_X,
    TITLE_Y,
    group_for_category,
)

_ASSETS_DIR = os.path.join(os.path.dirname(__file__), "assets")
_FONTS_DIR = os.path.join(_ASSETS_DIR, "fonts")

_FONT_BOLD_PATH = os.path.join(_FONTS_DIR, "SpaceGrotesk_700Bold.ttf")
_FONT_SEMIBOLD_PATH = os.path.join(_FONTS_DIR, "SpaceGrotesk_600SemiBold.ttf")

_font_cache: dict[tuple[str, int], ImageFont.FreeTypeFont] = {}


def _font(path: str, size: int) -> ImageFont.FreeTypeFont:
    key = (path, size)
    if key not in _font_cache:
        _font_cache[key] = ImageFont.truetype(path, size)
    return _font_cache[key]


def _readable_text_color(hex_color: str) -> tuple[int, int, int, int]:
    """Black on bright accents (lime/amber), white on darker mid-tone accents."""
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i : i + 2], 16) for i in (0, 2, 4))
    luminance = 0.299 * r + 0.587 * g + 0.114 * b
    return (0, 0, 0, 255) if luminance > 160 else (255, 255, 255, 255)


def _load_layer(slug: str, name: str) -> Image.Image:
    return Image.open(os.path.join(_ASSETS_DIR, slug, name)).convert("RGBA")


def _rounded_mask(size: tuple[int, int], radius: int) -> Image.Image:
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle([(0, 0), (size[0] - 1, size[1] - 1)], radius=radius, fill=255)
    return mask


def _paste_photo(base: Image.Image, photo_bytes: bytes) -> None:
    """Cover-fit crops the photo to the slot and pastes it (rounded mask) in place."""
    photo = Image.open(io.BytesIO(photo_bytes))
    photo = ImageOps.exif_transpose(photo).convert("RGB")

    slot_x, slot_y, slot_w, slot_h = PHOTO_SLOT
    src_w, src_h = photo.size
    target_ratio = slot_w / slot_h
    src_ratio = src_w / src_h

    if src_ratio > target_ratio:
        # source wider than target — crop left/right
        new_w = int(src_h * target_ratio)
        left = (src_w - new_w) // 2
        photo = photo.crop((left, 0, left + new_w, src_h))
    else:
        # source taller than target — crop top/bottom
        new_h = int(src_w / target_ratio)
        top = (src_h - new_h) // 2
        photo = photo.crop((0, top, src_w, top + new_h))

    photo = photo.resize((slot_w, slot_h), Image.LANCZOS).convert("RGBA")
    mask = _rounded_mask((slot_w, slot_h), PHOTO_SLOT_RADIUS)
    base.paste(photo, (slot_x, slot_y), mask)


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
    # Ellipsize the last line if we truncated mid-sentence
    remaining_words = words[sum(len(line.split()) for line in lines):]
    if remaining_words and lines:
        last = lines[-1]
        while draw.textlength(last + "…", font=font) > max_width and " " in last:
            last = last.rsplit(" ", 1)[0]
        lines[-1] = last + "…"
    return lines


def generate_cover(
    category: str,
    title: str,
    pay_label: str,
    host_name: str,
    city: str,
    photo_bytes: bytes | None = None,
) -> bytes:
    """Renders a gig cover PNG (1080x1350) and returns the encoded bytes."""
    group = group_for_category(category)

    base = _load_layer(group.slug, "background.png")
    if photo_bytes:
        _paste_photo(base, photo_bytes)

    foreground = _load_layer(group.slug, "foreground.png")
    composite = Image.alpha_composite(base, foreground)

    draw = ImageDraw.Draw(composite)
    max_text_width = TEXT_ZONE_RIGHT - TEXT_ZONE_X

    # Category chip label — shrink to fit the fixed-width pill (labels vary in length)
    chip_x, chip_y, chip_w, chip_h = CHIP
    chip_padding = 16
    chip_color = _readable_text_color(group.color)
    chip_label = group.label.upper()
    chip_font = _font(_FONT_SEMIBOLD_PATH, 22)
    chip_text_w = draw.textlength(chip_label, font=chip_font)
    for size in (22, 20, 18, 16, 14, 12):
        chip_font = _font(_FONT_SEMIBOLD_PATH, size)
        chip_text_w = draw.textlength(chip_label, font=chip_font)
        if chip_text_w <= chip_w - chip_padding * 2:
            break
    draw.text(
        (chip_x + (chip_w - chip_text_w) / 2, chip_y + chip_h / 2),
        chip_label,
        font=chip_font,
        fill=chip_color,
        anchor="lm",
    )

    # Title (up to 2 lines)
    title_font = _font(_FONT_BOLD_PATH, 52)
    title_lines = _wrap_text(draw, title, title_font, max_text_width, max_lines=2)
    line_height = 60
    y = TITLE_Y
    for line in title_lines:
        draw.text((TEXT_ZONE_X, y), line, font=title_font, fill=(255, 255, 255, 255), anchor="lm")
        y += line_height

    # Pay
    pay_font = _font(_FONT_BOLD_PATH, 42)
    draw.text((TEXT_ZONE_X, PAY_Y), pay_label, font=pay_font, fill=group.color, anchor="lm")

    # Host + city
    meta_font = _font(_FONT_SEMIBOLD_PATH, 28)
    meta_text = f"{host_name} · {city}" if host_name and city else (host_name or city or "")
    meta_lines = _wrap_text(draw, meta_text, meta_font, max_text_width, max_lines=1)
    if meta_lines:
        draw.text((TEXT_ZONE_X, HOST_CITY_Y), meta_lines[0], font=meta_font, fill=(255, 255, 255, 200), anchor="lm")

    out = io.BytesIO()
    composite.convert("RGB").save(out, format="PNG", optimize=True)
    return out.getvalue()


def to_square_crop(png_bytes: bytes) -> bytes:
    """
    Crops the 1080x1350 cover to 1080x1080 for OG/WhatsApp link previews.
    Keeps the BOTTOM of the canvas, not the top — the title/pay/host text
    zone lives at the bottom (see manifest.TITLE_Y etc.) and matters far
    more in a link-preview thumbnail than the top photo/icon area.
    """
    image = Image.open(io.BytesIO(png_bytes)).convert("RGB")
    w, h = image.size
    side = min(w, h)
    left = (w - side) // 2
    top = h - side
    cropped = image.crop((left, top, left + side, top + side))
    out = io.BytesIO()
    cropped.save(out, format="PNG", optimize=True)
    return out.getvalue()
