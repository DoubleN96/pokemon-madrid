#!/usr/bin/env python3
"""
render_metatiles.py — Compose pokefirered tilesets into true-color 16x16 metatile sheets.

Background:
  pret/pokefirered stores each tileset as:
    - tiles.png         : 4bpp indexed atlas of 8x8 tiles, 16 tiles wide,
                          with a GRAYSCALE PLACEHOLDER palette baked in.
    - palettes/NN.pal   : 16 JASC-PAL files (the REAL GBA colors). Slot order:
                          primary tileset owns palettes 0..6,
                          secondary tileset owns palettes 7..12.
                          Color (255,0,255) magenta = transparent.
    - metatiles.bin     : array of 16-byte metatiles. Each metatile = 8 entries
                          (4 bottom-layer + 4 top-layer 8x8 tiles). Each entry is
                          a little-endian uint16:
                             bits 0-9  = tile index (0..639 primary, 640+ secondary)
                             bit  10   = x-flip
                             bit  11   = y-flip
                             bits 12-15= palette slot (0..15)

This script applies the real palettes per-tile and assembles correct 16x16 metatiles,
output as RGBA PNG with magenta keyed to transparent. The output is directly usable
as a Phaser 16x16 spritesheet (no spacing/margin), index = row*cols + col.

Usage examples are at the bottom (the if __main__ block reproduces game-ready/).
"""
from PIL import Image
import struct, os

SEC_TILE_OFFSET = 640  # secondary tiles start at index 640 (primary has 640 8x8 tiles)
MAGENTA = (255, 0, 255)


def load_pal(path):
    with open(path) as f:
        lines = [l.strip() for l in f if l.strip()]
    assert lines[0] == "JASC-PAL", path
    n = int(lines[2])
    return [tuple(map(int, l.split())) for l in lines[3:3 + n]]


def load_tiles_indexed(tiles_png):
    """Return list of 8x8 index grids from a 16-wide indexed tiles.png."""
    im = Image.open(tiles_png).convert("P")
    w, h = im.size
    cols, rows = w // 8, h // 8
    px = im.load()
    tiles = []
    for ty in range(rows):
        for tx in range(cols):
            tiles.append([[px[tx * 8 + x, ty * 8 + y] for x in range(8)] for y in range(8)])
    return tiles


def _blit(op, tile, pal, ox, oy, xf, yf):
    for y in range(8):
        for x in range(8):
            sx = 7 - x if xf else x
            sy = 7 - y if yf else y
            r, g, b = pal[tile[sy][sx]]
            if (r, g, b) == MAGENTA:
                continue
            op[ox + x, oy + y] = (r, g, b, 255)


def render(metatiles_bin, prim_tiles, prim_paldir, out_path, cols=8,
           sec_tiles=None, sec_paldir=None):
    """Render a colored 16x16 metatile sheet. For primaries, leave sec_* None."""
    pals = {}
    for i in range(16):
        src = prim_paldir if (i < 7 or sec_paldir is None) else sec_paldir
        p = os.path.join(src, f"{i:02d}.pal")
        pals[i] = load_pal(p) if os.path.exists(p) else [MAGENTA] * 16
    ptiles = load_tiles_indexed(prim_tiles)
    stiles = load_tiles_indexed(sec_tiles) if sec_tiles else []

    def get(n):
        if n < SEC_TILE_OFFSET:
            return ptiles[n] if n < len(ptiles) else [[0] * 8 for _ in range(8)]
        si = n - SEC_TILE_OFFSET
        return stiles[si] if 0 <= si < len(stiles) else [[0] * 8 for _ in range(8)]

    data = open(metatiles_bin, "rb").read()
    nmeta = len(data) // 16
    rows = (nmeta + cols - 1) // cols
    out = Image.new("RGBA", (cols * 16, rows * 16), (0, 0, 0, 0))
    op = out.load()
    pos = [(0, 0), (8, 0), (0, 8), (8, 8)]  # TL, TR, BL, BR
    for m in range(nmeta):
        mx, my = (m % cols) * 16, (m // cols) * 16
        for layer in range(2):  # 0=bottom, 1=top (drawn over)
            for q in range(4):
                v = struct.unpack_from("<H", data, m * 16 + (layer * 4 + q) * 2)[0]
                tile = v & 0x3FF
                xf = (v >> 10) & 1
                yf = (v >> 11) & 1
                pal = (v >> 12) & 0xF
                px_off, py_off = pos[q]
                _blit(op, get(tile), pals.get(pal, pals[0]), mx + px_off, my + py_off, xf, yf)
    out.save(out_path)
    return out.size, nmeta


if __name__ == "__main__":
    HERE = os.path.dirname(os.path.abspath(__file__))
    os.chdir(HERE)
    os.makedirs("game-ready", exist_ok=True)
    R = "raw-tiles"
    M = "meta"
    PAL = "palettes"

    # primaries
    jobs_prim = [
        ("general", f"{R}/general_tiles.png", f"{PAL}/general"),
        ("building", f"{R}/building_tiles.png", f"{PAL}/building"),
    ]
    for name, t, pd in jobs_prim:
        sz, n = render(f"{M}/{name}_metatiles.bin", t, pd,
                       f"game-ready/{name}_metatiles_colored.png")
        print(f"{name:20} {sz} {n} metatiles")

    # secondaries: (name, parent_primary, parent_tiles, parent_paldir)
    OUTDOOR = (f"{R}/general_tiles.png", f"{PAL}/general")
    INDOOR = (f"{R}/building_tiles.png", f"{PAL}/building")
    jobs_sec = [
        ("pallet_town", *OUTDOOR), ("viridian_city", *OUTDOOR),
        ("pewter_city", *OUTDOOR), ("cerulean_city", *OUTDOOR),
        ("vermilion_city", *OUTDOOR), ("celadon_city", *OUTDOOR),
        ("lavender_town", *OUTDOOR), ("saffron_city", *OUTDOOR),
        ("pokemon_center", *INDOOR), ("mart", *INDOOR), ("lab", *INDOOR),
    ]
    for name, ptiles, ppal in jobs_sec:
        mb = f"{M}/{name}_metatiles.bin"
        st = f"{R}/{name}_tiles.png"
        sp = f"{PAL}/{name}"
        if not (os.path.exists(mb) and os.path.exists(st) and os.path.isdir(sp)):
            print(f"{name:20} SKIP (missing inputs)")
            continue
        sz, n = render(mb, ptiles, ppal, f"game-ready/{name}_metatiles_colored.png",
                       sec_tiles=st, sec_paldir=sp)
        print(f"{name:20} {sz} {n} metatiles")
