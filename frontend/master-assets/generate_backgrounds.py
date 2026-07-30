"""
Generates the 6 gig-category-group cover backgrounds (matches Grid's actual
gig wizard ROLE_GROUPS, not the earlier 14-category draft): organic gradient
blobs + a simple friendly icon, on the dark ink brand base. Rasterizes to PNG
at 1080x1350 alongside the foreground frame SVGs.

Run inside the ~/envs/covers virtualenv (cairosvg + pillow).
"""
import os
import cairosvg

W, H = 1080, 1350
INK = "#0e0e0e"

# slug matches app.covers.manifest — mirrors frontend/grid ROLE_GROUPS
CATEGORIES = [
    # slug,                 color,      icon key,     blob seed
    ("event-promotion",     "#D4FF00", "confetti",    1),
    ("hospitality",         "#ff7351", "plate",       2),
    ("technical-support",   "#8097ff", "monitor",     3),
    ("media-content",       "#FFC83D", "camera",      4),
    ("stage-hosting",       "#D4FF00", "microphone",  5),
    ("other",               "#8097ff", "dots",        6),
]

CX, CY = 540, 460  # icon center — upper-middle, leaves lower third clear


def icon_paths(key: str, color: str) -> str:
    """Returns SVG markup for a simple flat/rounded icon, local coords
    roughly -70..70, to be wrapped in a translate(CX,CY) group."""
    sw = 7
    common = f'fill="none" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"'

    if key == "confetti":
        dots = "".join(
            f'<circle cx="{x}" cy="{y}" r="{r}" fill="{color}"/>'
            for x, y, r in [(-55, -45, 6), (50, -55, 5), (60, 30, 6), (-50, 45, 5), (10, -70, 4)]
        )
        return f'''
        <path d="M -35 30 L 0 -35 L 35 30 Q 0 50 -35 30 Z" {common}/>
        {dots}
        '''

    if key == "bag":
        return f'''
        <path d="M -20 -25 Q -20 -50 0 -50 Q 20 -50 20 -25" {common}/>
        <rect x="-40" y="-25" width="80" height="70" rx="14" {common}/>
        '''

    if key == "megaphone":
        rays = "".join(
            f'<line x1="{55+i*10}" y1="{-20+i*13}" x2="{75+i*10}" y2="{-20+i*13}" {common}/>'
            for i in range(3)
        )
        return f'''
        <path d="M -50 -10 L 10 -35 L 10 35 L -50 10 Z" {common}/>
        <path d="M -50 -10 L -50 10 L -40 10 L -40 -10 Z" fill="{color}" stroke="none"/>
        <path d="M 10 -35 L 45 -48 L 45 48 L 10 35" {common}/>
        {rays}
        '''

    if key == "box_arrow":
        return f'''
        <rect x="-45" y="-30" width="60" height="60" rx="10" {common}/>
        <line x1="-45" y1="0" x2="15" y2="0" {common}/>
        <line x1="-15" y1="-30" x2="-15" y2="30" {common}/>
        <path d="M 35 -10 L 60 10 L 35 30" {common}/>
        <line x1="15" y1="10" x2="58" y2="10" {common}/>
        '''

    if key == "shield":
        return f'''
        <path d="M 0 -55 L 45 -35 L 45 10 Q 45 45 0 60 Q -45 45 -45 10 L -45 -35 Z" {common}/>
        <path d="M -18 0 L -5 15 L 20 -18" {common}/>
        '''

    if key == "sparkle":
        return f'''
        <path d="M 0 -55 Q 8 -8 55 0 Q 8 8 0 55 Q -8 8 -55 0 Q -8 -8 0 -55 Z" fill="{color}" stroke="none"/>
        <circle cx="45" cy="-40" r="6" fill="{color}"/>
        '''

    if key == "plate":
        return f'''
        <circle cx="0" cy="0" r="45" {common}/>
        <circle cx="0" cy="0" r="22" {common}/>
        <line x1="-70" y1="-45" x2="-70" y2="45" {common}/>
        <line x1="-78" y1="-45" x2="-78" y2="-10" {common}/>
        <line x1="-62" y1="-45" x2="-62" y2="-10" {common}/>
        <path d="M 70 -45 L 70 0 Q 70 12 60 12 L 60 45" {common}/>
        '''

    if key == "cross":
        return f'''
        <circle cx="0" cy="0" r="58" fill="none" stroke="{color}" stroke-width="4" opacity="0.5"/>
        <path d="M -12 -40 L 12 -40 L 12 -12 L 40 -12 L 40 12 L 12 12 L 12 40 L -12 40 L -12 12 L -40 12 L -40 -12 L -12 -12 Z" fill="{color}" stroke="none"/>
        '''

    if key == "stack":
        return f'''
        <rect x="-45" y="-10" width="55" height="55" rx="10" {common}/>
        <rect x="-10" y="-45" width="55" height="55" rx="10" fill="{INK}" stroke="{color}" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round"/>
        '''

    if key == "briefcase":
        return f'''
        <rect x="-50" y="-15" width="100" height="65" rx="12" {common}/>
        <path d="M -20 -15 Q -20 -35 0 -35 Q 20 -35 20 -15" {common}/>
        <line x1="-50" y1="12" x2="50" y2="12" {common}/>
        '''

    if key == "monitor":
        return f'''
        <rect x="-55" y="-40" width="110" height="72" rx="10" {common}/>
        <line x1="-20" y1="50" x2="20" y2="50" {common}/>
        <line x1="0" y1="32" x2="0" y2="50" {common}/>
        <path d="M -20 -5 L -5 12 L 25 -20" {common}/>
        '''

    if key == "book":
        return f'''
        <path d="M 0 -35 Q -40 -50 -60 -35 L -60 40 Q -40 25 0 40 Z" {common}/>
        <path d="M 0 -35 Q 40 -50 60 -35 L 60 40 Q 40 25 0 40 Z" {common}/>
        '''

    if key == "dumbbell":
        return f'''
        <line x1="-55" y1="0" x2="55" y2="0" {common}/>
        <rect x="-70" y="-25" width="24" height="50" rx="8" {common}/>
        <rect x="46" y="-25" width="24" height="50" rx="8" {common}/>
        '''

    if key == "camera":
        return f'''
        <path d="M -25 -35 L -15 -50 L 15 -50 L 25 -35 L 55 -35 Q 62 -35 62 -28 L 62 35 Q 62 42 55 42 L -55 42 Q -62 42 -62 35 L -62 -28 Q -62 -35 -55 -35 Z" {common}/>
        <circle cx="0" cy="2" r="24" {common}/>
        <circle cx="40" cy="-18" r="4" fill="{color}"/>
        '''

    if key == "microphone":
        return f'''
        <rect x="-16" y="-55" width="32" height="60" rx="16" {common}/>
        <path d="M -35 -5 Q -35 30 0 30 Q 35 30 35 -5" {common}/>
        <line x1="0" y1="30" x2="0" y2="55" {common}/>
        <line x1="-22" y1="55" x2="22" y2="55" {common}/>
        '''

    if key == "dots":
        return "".join(
            f'<circle cx="{x}" cy="{y}" r="10" fill="{color}"/>'
            for x, y in [(-40, -20), (0, 30), (40, -20), (0, -55)]
        )

    return ""


def blob_defs_and_shapes(color: str, seed: int) -> tuple[str, str]:
    """Two/three soft blurred radial-gradient blobs, mostly upper 2/3."""
    import random
    rnd = random.Random(seed)
    defs = []
    shapes = []
    positions = [
        (rnd.randint(150, 350), rnd.randint(200, 400), rnd.randint(260, 340)),
        (rnd.randint(700, 950), rnd.randint(150, 350), rnd.randint(220, 300)),
        (rnd.randint(350, 750), rnd.randint(550, 750), rnd.randint(240, 320)),
    ]
    for i, (bx, by, br) in enumerate(positions):
        gid = f"blob{seed}_{i}"
        defs.append(f'''
        <radialGradient id="{gid}" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="{color}" stop-opacity="0.32"/>
          <stop offset="100%" stop-color="{color}" stop-opacity="0"/>
        </radialGradient>''')
        shapes.append(f'<circle cx="{bx}" cy="{by}" r="{br}" fill="url(#{gid})"/>')
    return "".join(defs), "".join(shapes)


def build_svg(slug: str, color: str, icon_key: str, seed: int) -> str:
    blob_defs, blob_shapes = blob_defs_and_shapes(color, seed)
    icon = icon_paths(icon_key, color)
    return f'''<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    {blob_defs}
    <linearGradient id="bottomFade_{seed}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="{INK}" stop-opacity="0"/>
      <stop offset="100%" stop-color="{INK}" stop-opacity="0.9"/>
    </linearGradient>
  </defs>
  <rect width="{W}" height="{H}" fill="{INK}"/>
  {blob_shapes}
  <circle cx="{CX}" cy="{CY}" r="150" fill="{color}" opacity="0.10"/>
  <g transform="translate({CX},{CY}) scale(1.35)">
    {icon}
  </g>
  <rect x="0" y="{int(H*0.62)}" width="{W}" height="{int(H*0.38)}" fill="url(#bottomFade_{seed})"/>
</svg>'''


if __name__ == "__main__":
    out_root = os.path.join(os.path.dirname(__file__), "covers")
    for slug, color, icon_key, seed in CATEGORIES:
        folder = os.path.join(out_root, slug)
        os.makedirs(folder, exist_ok=True)
        svg = build_svg(slug, color, icon_key, seed)
        svg_path = os.path.join(folder, "background.svg")
        png_path = os.path.join(folder, "background.png")
        with open(svg_path, "w") as f:
            f.write(svg)
        cairosvg.svg2png(url=svg_path, write_to=png_path, output_width=W, output_height=H)
        print("wrote", png_path)
