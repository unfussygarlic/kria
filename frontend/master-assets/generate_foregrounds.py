"""
Generates the 6 foreground frame layers (photo-slot border + category pill +
triangle mark) for both canvas profiles (portrait + square — see
generate_backgrounds.py PROFILES), matching the background/color mapping.
Same parametric SVG structure Stitch originally produced — only accent color
and the slot/chip geometry per profile change. Rasterizes to
covers/{slug}/foreground.png and covers/{slug}/foreground_square.png.

Run inside the ~/envs/covers virtualenv (cairosvg + pillow).
"""
import os
import cairosvg

from generate_backgrounds import CATEGORIES

# Each profile's own frame geometry — independent of generate_backgrounds.py's
# PROFILES dict (that one governs icon/blob placement; this one governs the
# border/photo-slot/chip, which app.covers.manifest reads pixel-for-pixel).
FOREGROUND_PROFILES = {
    "portrait": {
        "filename": "foreground.png",
        "W": 1080, "H": 1350,
        "slot": (118.8, 100, 842.4, 850),      # x, y, w, h
        "chip": (118.8, 50, 180, 40),           # x, y, w, h
    },
    "square": {
        "filename": "foreground_square.png",
        "W": 1080, "H": 1080,
        "slot": (118, 86, 844, 540),
        "chip": (118, 40, 180, 36),
    },
}


def build_svg(color: str, profile: dict) -> str:
    w, h = profile["W"], profile["H"]
    sx, sy, sw, sh = profile["slot"]
    cx, cy, cw, ch = profile["chip"]
    corner = 50  # length of each corner tick mark
    return f'''<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="{sx}" y="{sy}" width="{sw}" height="{sh}" rx="20" fill="none" stroke="{color}" stroke-width="2"/>
  <path d="M{sx} {sy+corner}V{sy}H{sx+corner}" stroke="{color}" stroke-width="3"/>
  <path d="M{sx+sw} {sy+corner}V{sy}H{sx+sw-corner}" stroke="{color}" stroke-width="3"/>
  <path d="M{sx} {sy+sh-corner}V{sy+sh}H{sx+corner}" stroke="{color}" stroke-width="3"/>
  <path d="M{sx+sw} {sy+sh-corner}V{sy+sh}H{sx+sw-corner}" stroke="{color}" stroke-width="3"/>
  <rect x="{cx}" y="{cy}" width="{cw}" height="{ch}" rx="{ch/2}" fill="{color}"/>
  <path d="M{sx+sw+20} {sy+sh}L{sx+sw+40} {sy+sh-20}V{sy+sh+20}L{sx+sw+20} {sy+sh}Z" fill="{color}"/>
</svg>'''


if __name__ == "__main__":
    out_root = os.path.join(os.path.dirname(__file__), "covers")
    for slug, color, _icon_key, _seed in CATEGORIES:
        folder = os.path.join(out_root, slug)
        os.makedirs(folder, exist_ok=True)
        for profile_name, profile in FOREGROUND_PROFILES.items():
            svg = build_svg(color, profile)
            base = os.path.splitext(profile["filename"])[0]
            svg_path = os.path.join(folder, f"{base}.svg")
            png_path = os.path.join(folder, profile["filename"])
            with open(svg_path, "w") as f:
                f.write(svg)
            cairosvg.svg2png(url=svg_path, write_to=png_path, output_width=profile["W"], output_height=profile["H"])
            print("wrote", png_path)
