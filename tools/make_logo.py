#!/usr/bin/env python3
"""
Generates the app icon set: a Scrabble-style tile whose letter is the logical
negation sign.

Every shape is drawn geometrically — no font files, no SVG toolchain — so
`npm run logo` reproduces the artwork anywhere Pillow is installed. Shapes are
rendered at 4x and downsampled, which is what keeps the bevel and the glyph
edges clean at 48px.
"""

from __future__ import annotations

import os
from PIL import Image, ImageDraw, ImageFilter

SS = 4  # supersampling factor

INK = (31, 36, 64, 255)          # deep indigo, the "letter"
FACE = (244, 228, 193, 255)      # warm ivory tile face
EDGE = (214, 190, 143, 255)      # darker tan, the tile's extruded side
BACKDROP = (35, 41, 70, 255)     # icon background behind the tile
WHITE = (255, 255, 255, 255)

ASSETS = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "assets")


def negation_glyph(draw: ImageDraw.ImageDraw, cx: float, cy: float, width: float, colour) -> None:
    """
    Draws ¬ centred on (cx, cy): a horizontal bar with a stroke dropping from
    its right end. Corners are squared off, which reads as a typeset glyph
    rather than a drawn line at icon sizes.
    """
    thickness = width * 0.225
    drop = width * 0.46
    total_height = thickness + drop

    left = cx - width / 2
    top = cy - total_height / 2

    # Horizontal bar.
    draw.rectangle([left, top, left + width, top + thickness], fill=colour)
    # Descending stroke at the right end.
    draw.rectangle(
        [left + width - thickness, top, left + width, top + total_height],
        fill=colour,
    )


def score_one(draw: ImageDraw.ImageDraw, x: float, y: float, height: float, colour) -> None:
    """The little corner "1", as on a Scrabble tile. Drawn, not typeset."""
    stroke = height * 0.20
    stem_x = x + height * 0.30
    # Stem.
    draw.rectangle([stem_x - stroke / 2, y, stem_x + stroke / 2, y + height], fill=colour)
    # Angled flag at the top left of the stem.
    draw.polygon(
        [
            (stem_x - stroke / 2, y),
            (stem_x - stroke / 2, y + stroke * 1.15),
            (x - height * 0.06, y + stroke * 1.75),
            (x - height * 0.06, y + stroke * 0.6),
        ],
        fill=colour,
    )
    # Base serif, so the digit does not read as a bare bar.
    draw.rectangle([x - height * 0.06, y + height - stroke, x + height * 0.66, y + height], fill=colour)


def draw_tile(size: int, *, shadow: bool = True) -> Image.Image:
    """A single tile, rendered into a transparent square of `size` px."""
    s = size * SS
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))

    depth = s * 0.055          # how far the face sits above its side
    radius = s * 0.15
    inset = s * 0.02

    if shadow:
        layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
        ImageDraw.Draw(layer).rounded_rectangle(
            [inset, inset + depth * 1.6, s - inset, s - inset + depth * 0.4],
            radius=radius,
            fill=(15, 18, 34, 110),
        )
        canvas = Image.alpha_composite(canvas, layer.filter(ImageFilter.GaussianBlur(s * 0.02)))

    draw = ImageDraw.Draw(canvas)

    # Extruded side, then the face lifted off it: a cheap but convincing bevel.
    draw.rounded_rectangle([inset, inset, s - inset, s - inset], radius=radius, fill=EDGE)
    draw.rounded_rectangle(
        [inset, inset, s - inset, s - inset - depth], radius=radius, fill=FACE
    )

    face_cx = s / 2
    face_cy = (inset + (s - inset - depth)) / 2

    negation_glyph(draw, face_cx, face_cy - s * 0.03, s * 0.42, INK)
    score_one(draw, s * 0.755, s * 0.695, s * 0.14, INK)

    return canvas.resize((size, size), Image.LANCZOS)


def monochrome_tile(size: int) -> Image.Image:
    """
    Android's monochrome layer: one colour plus alpha. An outlined tile keeps
    the silhouette readable once the system tints and masks it.
    """
    s = size * SS
    canvas = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)

    inset = s * 0.04
    draw.rounded_rectangle(
        [inset, inset, s - inset, s - inset],
        radius=s * 0.15,
        outline=WHITE,
        width=int(s * 0.055),
    )
    negation_glyph(draw, s / 2, s / 2 - s * 0.02, s * 0.42, WHITE)

    return canvas.resize((size, size), Image.LANCZOS)


def on_backdrop(tile: Image.Image, size: int, scale: float, colour=BACKDROP) -> Image.Image:
    """Centres `tile` at `scale` of the canvas over a solid colour."""
    canvas = Image.new("RGBA", (size, size), colour)
    return paste_centred(canvas, tile, size, scale)


def paste_centred(canvas: Image.Image, tile: Image.Image, size: int, scale: float) -> Image.Image:
    inner = max(1, int(size * scale))
    resized = tile.resize((inner, inner), Image.LANCZOS)
    offset = (size - inner) // 2
    canvas.paste(resized, (offset, offset), resized)
    return canvas


def write(image: Image.Image, name: str) -> None:
    path = os.path.join(ASSETS, name)
    image.save(path)
    print(f"  {name}  {image.size[0]}×{image.size[1]}")


def main() -> None:
    os.makedirs(ASSETS, exist_ok=True)
    print("Generating icons in assets/")

    master = draw_tile(1024)

    # iOS / store icon: opaque, full bleed, tile at a comfortable margin.
    write(on_backdrop(master, 1024, 0.74).convert("RGB"), "icon.png")

    # Android adaptive icon: foreground must survive the system mask, so the
    # tile is kept well inside the 66% safe zone.
    foreground = paste_centred(Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)), master, 1024, 0.55)
    write(foreground, "android-icon-foreground.png")
    write(Image.new("RGB", (1024, 1024), BACKDROP[:3]), "android-icon-background.png")
    write(paste_centred(Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)), monochrome_tile(1024), 1024, 0.55),
          "android-icon-monochrome.png")

    # Splash: transparent, the launch screen supplies the background colour.
    write(paste_centred(Image.new("RGBA", (1024, 1024), (0, 0, 0, 0)), master, 1024, 0.62),
          "splash-icon.png")

    write(on_backdrop(master, 48, 0.78).convert("RGB"), "favicon.png")

    # Bare mark for the README and store listings.
    write(master, "logo.png")


if __name__ == "__main__":
    main()
