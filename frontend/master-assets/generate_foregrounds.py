"""
Generates the 6 foreground frame layers (photo-slot border + category pill +
triangle mark), matching generate_backgrounds.py's category/color mapping.
Same parametric SVG structure Stitch originally produced — only accent color
changes. Rasterizes to covers/{slug}/foreground.png.

Run inside the ~/envs/covers virtualenv (cairosvg + pillow).
"""
import os
import cairosvg

from generate_backgrounds import CATEGORIES

W, H = 1080, 1350


def build_svg(color: str) -> str:
    return f'''<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect x="118.8" y="100" width="842.4" height="850" rx="20" fill="none" stroke="{color}" stroke-width="2"/>
  <path d="M118.8 150V100H168.8" stroke="{color}" stroke-width="3"/>
  <path d="M911.2 150V100H861.2" stroke="{color}" stroke-width="3"/>
  <path d="M118.8 900V950H168.8" stroke="{color}" stroke-width="3"/>
  <path d="M911.2 900V950H861.2" stroke="{color}" stroke-width="3"/>
  <rect x="118.8" y="50" width="180" height="40" rx="20" fill="{color}"/>
  <path d="M961.2 950L981.2 930V970L961.2 950Z" fill="{color}"/>
</svg>'''


if __name__ == "__main__":
    out_root = os.path.join(os.path.dirname(__file__), "covers")
    for slug, color, _icon_key, _seed in CATEGORIES:
        folder = os.path.join(out_root, slug)
        os.makedirs(folder, exist_ok=True)
        svg = build_svg(color)
        svg_path = os.path.join(folder, "foreground.svg")
        png_path = os.path.join(folder, "foreground.png")
        with open(svg_path, "w") as f:
            f.write(svg)
        cairosvg.svg2png(url=svg_path, write_to=png_path, output_width=W, output_height=H)
        print("wrote", png_path)
