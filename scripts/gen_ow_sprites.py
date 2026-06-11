#!/usr/bin/env python3
"""
Generate FRLG-style overworld walking sprites for the Team Piso Lore characters
using Gemini gemini-2.5-flash-image, conditioned on each character's bust portrait
for likeness.

Image models are unreliable at tiny consistent spritesheets, so we:
  1. Ask for a LARGE clean single-pose sprite (front, big and centered) per direction.
  2. Background-removed (model is told plain magenta bg), then chroma-key to alpha.
  3. Auto-crop to content + downscale to FRLG overworld size (~16x24).

We do NOT attempt a single 12-cell sheet from the model (it always desyncs).
Instead each frame is a separate generation request, then we assemble locally.

Usage:
  python3 scripts/gen_ow_sprites.py <char_id> "<likeness description>"
"""
import base64
import io
import json
import os
import sys
import time
import urllib.request

import numpy as np
from PIL import Image

CONFIG = json.load(open("/home/n8nstratoma/whatsapp-intel/config.json"))
API_KEY = CONFIG["gemini_api_key"]
MODEL = "gemini-2.5-flash-image"
URL = f"https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={API_KEY}"

PORTRAIT_DIR = "/home/n8nstratoma/pokemon-madrid/public/assets/portraits"
OUT_DIR = "/home/n8nstratoma/pokemon-madrid/public/assets/portraits/ow"
RAW_DIR = "/home/n8nstratoma/pokemon-madrid/scripts/ow_raw"  # un-processed model output, for QA
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(RAW_DIR, exist_ok=True)

# Magenta key color we ask the model to use as background
KEY = (255, 0, 255)

# Target FRLG overworld dimensions
TARGET_W, TARGET_H = 16, 24

BASE_PROMPT = (
    "Pixel art sprite in the exact style of Pokemon FireRed / LeafGreen / Emerald "
    "Game Boy Advance OVERWORLD character sprites (NOT the battle artwork, NOT a "
    "portrait, NOT anime). Top-down 3/4 view, chibi proportions: very large head, "
    "small body, about 2.5 heads tall, tiny limbs, thick black or dark outline, "
    "limited flat palette with simple cel shading, low resolution look. "
    "A single character standing, full body visible from head to feet, centered, "
    "facing {facing}. {pose} "
    "The character should clearly resemble: {desc}. "
    "Keep the resemblance via hair color/style, skin tone, glasses, build and "
    "clothing color, but render it in tiny GBA overworld pixel-art style. "
    "Plain solid pure magenta background (#FF00FF), no gradient, no shadow on the "
    "ground, no border, no text, no extra characters. The sprite must be small and "
    "blocky like a 16x24 GBA tile scaled up."
)

# Per-direction facing + pose hints. 3 frames each: 0 idle, 1 step-left-foot, 2 step-right-foot
DIRS = {
    "down": "toward the viewer (we see the front of the face)",
    "up": "away from the viewer (we see the back of the head, no face)",
    "left": "to the left side (profile facing left)",
    "right": "to the right side (profile facing right)",
}
POSES = {
    0: "Standing still, both feet together, idle stance.",
    1: "Mid-walk stride, LEFT leg stepping forward, slight bounce, walking animation frame.",
    2: "Mid-walk stride, RIGHT leg stepping forward, slight bounce, walking animation frame.",
}


def load_b64(path):
    with open(path, "rb") as f:
        return base64.b64encode(f.read()).decode()


def gen_frame(desc, facing_key, frame_idx, ref_image_path, retries=3):
    facing = DIRS[facing_key]
    pose = POSES[frame_idx]
    prompt = BASE_PROMPT.format(facing=facing, pose=pose, desc=desc)

    parts = [{"text": prompt}]
    if ref_image_path and os.path.exists(ref_image_path):
        parts.append({
            "inline_data": {
                "mime_type": "image/png",
                "data": load_b64(ref_image_path),
            }
        })
        parts.append({"text": "Use the attached portrait ONLY as a likeness reference "
                              "for face/hair/clothing colors. Do NOT copy its art style "
                              "or framing — output must be tiny GBA overworld pixel art."})

    body = {
        "contents": [{"parts": parts}],
        "generationConfig": {"responseModalities": ["IMAGE"], "temperature": 0.6},
    }
    data = json.dumps(body).encode()

    for attempt in range(retries):
        try:
            req = urllib.request.Request(URL, data=data, headers={"Content-Type": "application/json"})
            with urllib.request.urlopen(req, timeout=120) as resp:
                out = json.load(resp)
            for cand in out.get("candidates", []):
                for p in cand.get("content", {}).get("parts", []):
                    inline = p.get("inline_data") or p.get("inlineData")
                    if inline and inline.get("data"):
                        raw = base64.b64decode(inline["data"])
                        return Image.open(io.BytesIO(raw)).convert("RGBA")
            print(f"    [warn] no image part (attempt {attempt+1}); resp keys: {list(out.keys())}")
            # surface any safety/error text
            for cand in out.get("candidates", []):
                fr = cand.get("finishReason")
                if fr:
                    print(f"    finishReason={fr}")
            time.sleep(2)
        except Exception as e:
            print(f"    [err] {e} (attempt {attempt+1})")
            time.sleep(3)
    return None


def _detect_bg_color(arr):
    """Detect the dominant background color by sampling a border ring of pixels."""
    h, w = arr.shape[:2]
    ring = np.concatenate([
        arr[0:2, :, :3].reshape(-1, 3),
        arr[h - 2:h, :, :3].reshape(-1, 3),
        arr[:, 0:2, :3].reshape(-1, 3),
        arr[:, w - 2:w, :3].reshape(-1, 3),
    ], axis=0)
    # mode-ish: quantize to nearest 4 and take most common
    q = (ring // 4 * 4).astype(np.int32)
    keys, counts = np.unique(q.reshape(-1, 3), axis=0, return_counts=True)
    bg = keys[counts.argmax()]
    return bg.astype(np.int16)


def chroma_key_to_alpha(img, tol=78):
    """Remove the detected (magenta-ish) background -> transparent, flood-filled from
    the borders so similar colors inside the sprite are preserved."""
    from collections import deque
    arr = np.array(img.convert("RGBA")).astype(np.int16)
    h, w = arr.shape[:2]
    bg = _detect_bg_color(arr)
    rgb = arr[..., :3].astype(np.int32)
    dist = np.sqrt(((rgb - bg) ** 2).sum(axis=2))
    bgmask = dist < tol  # candidate background pixels

    # flood fill from border so we only clear bg connected to the edge
    visited = np.zeros((h, w), dtype=bool)
    dq = deque()
    for x in range(w):
        for y in (0, h - 1):
            if bgmask[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if bgmask[y, x] and not visited[y, x]:
                visited[y, x] = True
                dq.append((y, x))
    while dq:
        y, x = dq.popleft()
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            ny, nx = y + dy, x + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx] and bgmask[ny, nx]:
                visited[ny, nx] = True
                dq.append((ny, nx))

    arr[..., 3][visited] = 0
    out = Image.fromarray(arr.astype(np.uint8), "RGBA")
    return out


def autocrop(img):
    arr = np.array(img)
    alpha = arr[..., 3]
    ys, xs = np.where(alpha > 16)
    if len(xs) == 0:
        return img
    x0, x1 = xs.min(), xs.max() + 1
    y0, y1 = ys.min(), ys.max() + 1
    return img.crop((x0, y0, x1, y1))


def quantize_rgba(img, colors=14):
    """Posterize the opaque pixels to a small flat palette for a cel-shaded GBA look,
    while keeping the alpha channel intact."""
    a = np.array(img)
    alpha = a[..., 3].copy()
    rgb = Image.fromarray(a[..., :3], "RGB")
    pal = rgb.convert("P", palette=Image.ADAPTIVE, colors=colors).convert("RGB")
    out = np.dstack([np.array(pal), alpha])
    return Image.fromarray(out, "RGBA")


def fit_to_canvas(img, w=TARGET_W, h=TARGET_H, quantize=True):
    """Downscale preserving aspect, pad onto transparent w*h canvas, bottom-aligned &
    centered. Optionally posterize for a flatter GBA palette."""
    img = autocrop(img)
    if img.width == 0 or img.height == 0:
        return Image.new("RGBA", (w, h), (0, 0, 0, 0))
    scale = min(w / img.width, h / img.height)
    nw = max(1, int(round(img.width * scale)))
    nh = max(1, int(round(img.height * scale)))
    small = img.resize((nw, nh), Image.LANCZOS)
    # snap mostly-transparent edge pixels to fully transparent / opaque
    a = np.array(small)
    a[..., 3] = np.where(a[..., 3] < 50, 0, np.where(a[..., 3] > 160, 255, a[..., 3]))
    small = Image.fromarray(a, "RGBA")
    if quantize:
        small = quantize_rgba(small, colors=14)
        # re-apply hard alpha after quantize
        a2 = np.array(small)
        a2[..., 3] = np.where(a2[..., 3] < 60, 0, 255)
        small = Image.fromarray(a2, "RGBA")
    canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ox = (w - nw) // 2
    oy = h - nh  # bottom align (feet at bottom)
    canvas.paste(small, (ox, oy), small)
    return canvas


def main():
    if len(sys.argv) < 3:
        print("usage: gen_ow_sprites.py <char_id> '<likeness desc>'")
        sys.exit(1)
    char_id = sys.argv[1]
    desc = sys.argv[2]

    # likeness reference = the bust portrait if available, else the big portrait
    ref = os.path.join(PORTRAIT_DIR, f"{char_id}_bust.png")
    if not os.path.exists(ref):
        ref = os.path.join(PORTRAIT_DIR, f"{char_id}.png")
    print(f"== {char_id} == ref={os.path.basename(ref) if os.path.exists(ref) else 'NONE'}")
    print(f"   desc: {desc}")

    results = {}
    for d in ["down", "up", "left", "right"]:
        for i in range(3):
            name = f"{char_id}_{d}_{i}"
            print(f"  generating {name} ...")
            img = gen_frame(desc, d, i, ref)
            if img is None:
                print(f"    FAILED {name}")
                results[name] = None
                continue
            # save raw for QA
            img.save(os.path.join(RAW_DIR, f"{name}_raw.png"))
            # downscale to intermediate res first (fast flood-fill + cleaner alpha)
            inter = img.resize((int(img.width * 128 / img.height), 128), Image.LANCZOS)
            keyed = chroma_key_to_alpha(inter, tol=85)
            fitted = fit_to_canvas(keyed)
            outp = os.path.join(OUT_DIR, f"{name}.png")
            fitted.save(outp)
            results[name] = outp
            print(f"    saved {outp}  raw={img.size}")
            time.sleep(1)

    # write a per-char status
    with open(os.path.join(RAW_DIR, f"{char_id}_status.json"), "w") as f:
        json.dump({"char_id": char_id, "desc": desc,
                   "frames": {k: bool(v) for k, v in results.items()}}, f, indent=2)
    print(f"DONE {char_id}")


if __name__ == "__main__":
    main()
