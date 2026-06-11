#!/usr/bin/env python3
"""
Re-process raw Gemini overworld renders (scripts/ow_raw/<id>_<dir>_<n>_raw.png) into
clean, SIZE-CONSISTENT 16x24 GBA sprites.

Key fix vs the inline pipeline: all 12 frames of a character share ONE scale factor,
anchored on the standing idle frames (the *_0 frames), so the character does not
"pulse"/resize during the walk animation. Walk frames (legs bent) end up slightly
shorter inside the canvas, which is correct.

Also: stronger magenta despeckle + isolated-pixel cleanup.
"""
import os
import sys
from collections import deque

import numpy as np
from PIL import Image

RAW_DIR = "/home/n8nstratoma/pokemon-madrid/scripts/ow_raw"
OUT_DIR = "/home/n8nstratoma/pokemon-madrid/public/assets/portraits/ow"
os.makedirs(OUT_DIR, exist_ok=True)

TARGET_W, TARGET_H = 16, 24
INTER_H = 128  # intermediate working height
DIRS = ["down", "up", "left", "right"]


def detect_bg(arr):
    h, w = arr.shape[:2]
    ring = np.concatenate([
        arr[0:3, :, :3].reshape(-1, 3), arr[h - 3:h, :, :3].reshape(-1, 3),
        arr[:, 0:3, :3].reshape(-1, 3), arr[:, w - 3:w, :3].reshape(-1, 3),
    ], axis=0)
    q = (ring // 4 * 4).astype(np.int32)
    keys, counts = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    return keys[counts.argmax()].astype(np.int32)


def chroma_key(img, tol=90):
    arr = np.array(img.convert("RGBA")).astype(np.int32)
    h, w = arr.shape[:2]
    bg = detect_bg(arr)
    dist = np.sqrt(((arr[..., :3] - bg) ** 2).sum(axis=2))
    bgmask = dist < tol
    visited = np.zeros((h, w), bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgmask[y, x] and not visited[y, x]:
                visited[y, x] = True; dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgmask[y, x] and not visited[y, x]:
                visited[y, x] = True; dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bgmask[ny, nx]:
                visited[ny, nx] = True; dq.append((ny, nx))
    arr[..., 3][visited] = 0
    out = arr.astype(np.uint8)
    return Image.fromarray(out, "RGBA")


def despeckle_magenta(img):
    """Remove residual pink/magenta fringe pixels left from antialiasing and any
    tiny isolated opaque islands."""
    a = np.array(img).astype(np.int32)
    r, g, b, al = a[..., 0], a[..., 1], a[..., 2], a[..., 3]
    # pink/magenta fringe: R notably above G, and B above G (the magenta signature),
    # catches the dull antialiased pink halo as well as bright magenta.
    fringe = (r - g > 55) & (b - g > 30) & (r > 110) & (al > 0)
    a[..., 3][fringe] = 0
    # remove isolated opaque pixels (no opaque 4-neighbour)
    al2 = a[..., 3] > 30
    nb = np.zeros_like(al2)
    nb[1:, :] |= al2[:-1, :]; nb[:-1, :] |= al2[1:, :]
    nb[:, 1:] |= al2[:, :-1]; nb[:, :-1] |= al2[:, 1:]
    iso = al2 & ~nb
    a[..., 3][iso] = 0
    return Image.fromarray(a.astype(np.uint8), "RGBA")


def erode_edge(img, px=2):
    """Erode the alpha edge by `px` pixels. The boundary ring is where the magenta
    background bleeds into the sprite during antialiasing; trimming it removes the
    muddy near-black / pink fringe artifacts before downscaling."""
    a = np.array(img)
    al = a[..., 3] > 40
    for _ in range(px):
        nb = np.ones_like(al)
        nb[1:, :] &= al[:-1, :]; nb[:-1, :] &= al[1:, :]
        nb[:, 1:] &= al[:, :-1]; nb[:, :-1] &= al[:, 1:]
        al = al & nb
    out = a.copy()
    out[..., 3][~al] = 0
    return Image.fromarray(out, "RGBA")


def content_bounds(img):
    al = np.array(img)[..., 3]
    ys, xs = np.where(al > 40)
    if len(ys) == 0:
        return None
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def quantize(img, colors=16):
    a = np.array(img)
    alpha = a[..., 3].copy()
    rgb = Image.fromarray(a[..., :3], "RGB")
    pal = rgb.convert("P", palette=Image.ADAPTIVE, colors=colors).convert("RGB")
    out = np.dstack([np.array(pal), alpha])
    return Image.fromarray(out, "RGBA")


def process_char(char_id):
    # 1) load + key all frames at intermediate res
    keyed = {}
    for d in DIRS:
        for n in range(3):
            p = os.path.join(RAW_DIR, f"{char_id}_{d}_{n}_raw.png")
            if not os.path.exists(p):
                continue
            raw = Image.open(p).convert("RGBA")
            inter = raw.resize((int(raw.width * INTER_H / raw.height), INTER_H), Image.LANCZOS)
            k = erode_edge(despeckle_magenta(chroma_key(inter)), px=2)
            keyed[(d, n)] = k

    if not keyed:
        print(f"  no raw frames for {char_id}")
        return 0

    # 2) shared scale anchored on the tallest STANDING (*_0) frame
    stand_heights = []
    for d in DIRS:
        if (d, 0) in keyed:
            b = content_bounds(keyed[(d, 0)])
            if b:
                stand_heights.append(b[3] - b[1])
    anchor_h = max(stand_heights) if stand_heights else INTER_H
    # we want the standing character to fill ~22 of 24 px tall
    scale = (TARGET_H - 1) / anchor_h

    # 3) render each frame with the SAME scale, bottom + horizontally centered on body
    count = 0
    for (d, n), img in keyed.items():
        b = content_bounds(img)
        if not b:
            continue
        x0, y0, x1, y1 = b
        crop = img.crop((x0, y0, x1, y1))
        nw = max(1, int(round(crop.width * scale)))
        nh = max(1, int(round(crop.height * scale)))
        # cap so it can't exceed canvas
        if nh > TARGET_H:
            f = TARGET_H / nh; nh = TARGET_H; nw = max(1, int(nw * f))
        if nw > TARGET_W:
            f = TARGET_W / nw; nw = TARGET_W; nh = max(1, int(nh * f))
        small = crop.resize((nw, nh), Image.LANCZOS)
        a = np.array(small)
        a[..., 3] = np.where(a[..., 3] < 60, 0, 255)
        small = Image.fromarray(a, "RGBA")
        small = quantize(small, 16)
        a2 = np.array(small)
        a2[..., 3] = np.where(a2[..., 3] < 60, 0, 255)
        small = Image.fromarray(a2, "RGBA")

        canvas = Image.new("RGBA", (TARGET_W, TARGET_H), (0, 0, 0, 0))
        ox = (TARGET_W - nw) // 2
        oy = TARGET_H - nh
        canvas.paste(small, (ox, oy), small)
        canvas.save(os.path.join(OUT_DIR, f"{char_id}_{d}_{n}.png"))
        count += 1
    print(f"  processed {count} frames for {char_id} (anchor_h={anchor_h}, scale={scale:.3f})")
    return count


if __name__ == "__main__":
    for cid in sys.argv[1:]:
        process_char(cid)
