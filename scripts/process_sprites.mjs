#!/usr/bin/env node
/**
 * process_sprites.mjs
 * --------------------------------------------------------------------------
 * Post-processing pipeline for the Pokémon-Madrid character portraits.
 *
 * The raw renders in `public/assets/portraits/<id>.png` ship with an OPAQUE
 * light-gray / checkerboard background and are 1408x736 with a small,
 * centered character. This script fixes that for every character listed in
 * `portraits.json` and produces three transparent, trimmed variants each:
 *
 *   <id>.png       full body, background removed + trimmed (in place)
 *   <id>_bust.png  bust crop  (head + chest, "plano americano"), trimmed
 *   <id>_ow.png    overworld sprite, resized to ~32px tall (map scale)
 *
 * Background removal uses a BORDER FLOOD-FILL chroma-key (not a global
 * brightness threshold). The background is the connected light region that
 * touches the image edges; flooding inward from the border removes it while
 * PRESERVING interior light clothing (e.g. a white tank top) because the
 * dark character outline stops the flood. This is the robust approach for
 * "personaje sobre fondo uniforme".
 *
 * Implementation note: image math is done in Python (Pillow + numpy, both
 * already installed) because `sharp` is not present in node_modules and the
 * flood-fill is trivial to vectorise with numpy. This .mjs file is the
 * Node entrypoint required by the task; it shells out to an embedded Python
 * worker so there are no extra files to track.
 *
 * Usage:
 *   node scripts/process_sprites.mjs
 *
 * Options (env):
 *   TOLERANCE   chroma-key tolerance vs sampled bg color (default 26)
 *   OW_HEIGHT   target overworld sprite height in px      (default 32)
 *   BUST_RATIO  fraction of trimmed height kept for bust  (default 0.46)
 *
 * Does NOT run git/build/deploy and does NOT touch src/.
 */

import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, "..");
const PORTRAITS_DIR = path.join(PROJECT_ROOT, "public", "assets", "portraits");
const PORTRAITS_JSON = path.join(PORTRAITS_DIR, "portraits.json");

const config = {
  tolerance: Number(process.env.TOLERANCE ?? 26),
  owHeight: Number(process.env.OW_HEIGHT ?? 32),
  bustRatio: Number(process.env.BUST_RATIO ?? 0.46),
};

// ---------------------------------------------------------------------------
// Embedded Python worker.
// Reads a JSON job spec on stdin, processes every character, writes the three
// variants per character, rewrites portraits.json with `bust` + `ow` paths,
// and prints a JSON report on stdout.
// ---------------------------------------------------------------------------
const PY_WORKER = String.raw`
import sys, os, json
from PIL import Image
import numpy as np

job = json.load(sys.stdin)
PORTRAITS_DIR = job["portraitsDir"]
PORTRAITS_JSON = job["portraitsJson"]
TOL = float(job["tolerance"])
OW_H = int(job["owHeight"])
BUST_RATIO = float(job["bustRatio"])

def sample_bg_color(rgb):
    """Average color of a 4px border frame -> the background color."""
    h, w, _ = rgb.shape
    f = 4
    border = np.concatenate([
        rgb[:f, :, :].reshape(-1, 3),
        rgb[-f:, :, :].reshape(-1, 3),
        rgb[:, :f, :].reshape(-1, 3),
        rgb[:, -f:, :].reshape(-1, 3),
    ], axis=0).astype(np.float64)
    return border.mean(axis=0)

def border_floodfill_mask(rgb, bg_color, tol):
    """
    Return a boolean mask that is True for BACKGROUND pixels: the connected
    light region reachable from the image border within color tolerance.
    Implemented as iterative dilation of the border seeds, constrained to the
    'bg-candidate' set (pixels whose color is within tol of bg_color OR very
    bright/near-white). Interior light clothing is protected by the dark
    character outline which is NOT in the candidate set.
    """
    h, w, _ = rgb.shape
    f = rgb.astype(np.int16)
    diff = np.abs(f - bg_color.astype(np.int16)).max(axis=2)
    # candidate background = close to sampled bg color, OR clearly the light
    # checkerboard (min channel high and channels nearly equal => gray/white)
    mn = f.min(axis=2)
    mx = f.max(axis=2)
    grayish = (mx - mn) <= 18
    bright = mn >= 178
    candidate = (diff <= tol) | (grayish & bright)

    # seeds: border pixels that are candidates
    seed = np.zeros((h, w), dtype=bool)
    seed[0, :] = candidate[0, :]
    seed[-1, :] = candidate[-1, :]
    seed[:, 0] = candidate[:, 0]
    seed[:, -1] = candidate[:, -1]

    mask = seed.copy()
    # Iterative 4-neighbour dilation constrained to candidate set.
    while True:
        up    = np.zeros_like(mask); up[:-1, :]    = mask[1:, :]
        down  = np.zeros_like(mask); down[1:, :]   = mask[:-1, :]
        left  = np.zeros_like(mask); left[:, :-1]  = mask[:, 1:]
        right = np.zeros_like(mask); right[:, 1:]  = mask[:, :-1]
        grow = (up | down | left | right) & candidate & (~mask)
        if not grow.any():
            break
        mask |= grow
    return mask

def trim_alpha(rgba):
    """Crop fully/near transparent margins. Returns (cropped, bbox)."""
    a = np.asarray(rgba)[:, :, 3]
    ys, xs = np.where(a > 8)
    if len(xs) == 0:
        return rgba, (0, 0, rgba.width, rgba.height)
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    return rgba.crop((x0, y0, x1, y1)), (x0, y0, x1, y1)

def corner_alpha(rgba):
    a = np.asarray(rgba)[:, :, 3]
    h, w = a.shape
    return [int(a[0,0]), int(a[0,w-1]), int(a[h-1,0]), int(a[h-1,w-1])]

def process_one(char_id):
    src = os.path.join(PORTRAITS_DIR, char_id + ".png")
    rgba_img = Image.open(src).convert("RGBA")
    rgb = np.asarray(rgba_img)[:, :, :3]

    bg = sample_bg_color(rgb)
    bgmask = border_floodfill_mask(rgb, bg, TOL)

    arr = np.asarray(rgba_img).copy()
    arr[bgmask, 3] = 0          # background -> transparent
    keyed = Image.fromarray(arr, "RGBA")

    # --- full body (trim) ---
    full, _ = trim_alpha(keyed)
    full_corners = corner_alpha(full)
    full_path = os.path.join(PORTRAITS_DIR, char_id + ".png")
    full.save(full_path)

    fw, fh = full.size

    # --- bust = head + chest ("plano americano") ---
    bust_h = max(1, int(round(fh * BUST_RATIO)))
    bust = full.crop((0, 0, fw, bust_h))
    bust, _ = trim_alpha(bust)
    bust_corners = corner_alpha(bust)
    bust_path = os.path.join(PORTRAITS_DIR, char_id + "_bust.png")
    bust.save(bust_path)

    # --- overworld: resize full body to ~OW_H px tall, nearest (pixel style) ---
    scale = OW_H / fh
    ow_w = max(1, int(round(fw * scale)))
    ow = full.resize((ow_w, OW_H), Image.NEAREST)
    ow, _ = trim_alpha(ow)
    ow_corners = corner_alpha(ow)
    ow_path = os.path.join(PORTRAITS_DIR, char_id + "_ow.png")
    ow.save(ow_path)

    return {
        "id": char_id,
        "bgColor": [round(float(c), 1) for c in bg],
        "bgPixelFraction": round(float(bgmask.mean()), 3),
        "full": {"file": char_id + ".png", "size": [full.size[0], full.size[1]],
                 "cornerAlpha": full_corners},
        "bust": {"file": char_id + "_bust.png", "size": [bust.size[0], bust.size[1]],
                 "cornerAlpha": bust_corners},
        "ow":   {"file": char_id + "_ow.png", "size": [ow.size[0], ow.size[1]],
                 "cornerAlpha": ow_corners},
    }

def process_directional(rel_path):
    """
    Clean a directional overworld render (e.g. portraits/<id>_down.png) IN
    PLACE: chroma-key background -> transparent, trim, and resize to the map
    height (OW_H). These files are referenced under each character's
    'overworld' map in portraits.json and were shipping as 1408x736 opaque
    rectangles. Skips files that already look processed (small + transparent).
    """
    fname = rel_path.split("/")[-1]
    path = os.path.join(PORTRAITS_DIR, fname)
    if not os.path.exists(path):
        return {"file": fname, "error": "missing"}

    img = Image.open(path).convert("RGBA")
    arr0 = np.asarray(img)
    h0, w0 = arr0.shape[:2]
    already = (h0 <= OW_H + 4) and int(arr0[0, 0, 3]) == 0
    if already:
        return {"file": fname, "skipped": "already processed",
                "size": [w0, h0]}

    rgb = arr0[:, :, :3]
    bg = sample_bg_color(rgb)
    bgmask = border_floodfill_mask(rgb, bg, TOL)
    arr = arr0.copy()
    arr[bgmask, 3] = 0
    keyed = Image.fromarray(arr, "RGBA")
    trimmed, _ = trim_alpha(keyed)
    tw, th = trimmed.size
    scale = OW_H / th
    nw = max(1, int(round(tw * scale)))
    out = trimmed.resize((nw, OW_H), Image.NEAREST)
    out, _ = trim_alpha(out)
    out.save(path)
    return {"file": fname, "size": [out.size[0], out.size[1]],
            "cornerAlpha": corner_alpha(out)}

# ---- load config, process every character ----
with open(PORTRAITS_JSON, "r", encoding="utf-8") as fh:
    chars = json.load(fh)

report = []
for entry in chars:
    cid = entry["id"]
    src = os.path.join(PORTRAITS_DIR, cid + ".png")
    if not os.path.exists(src):
        report.append({"id": cid, "error": "source png missing: " + src})
        continue
    res = process_one(cid)
    # also clean the directional overworld renders referenced by this entry
    dirs = {}
    for direction, relpath in (entry.get("overworld") or {}).items():
        dirs[direction] = process_directional(relpath)
    if dirs:
        res["overworld"] = dirs
    report.append(res)
    # enrich portraits.json entry with new variant paths
    entry["portrait"] = "portraits/" + cid + ".png"
    entry["bust"] = "portraits/" + cid + "_bust.png"
    entry["ow"] = "portraits/" + cid + "_ow.png"

# rewrite portraits.json (preserve order, 2-space indent like original)
with open(PORTRAITS_JSON, "w", encoding="utf-8") as fh:
    json.dump(chars, fh, ensure_ascii=False, indent=2)
    fh.write("\n")

print(json.dumps({"ok": True, "report": report}, ensure_ascii=False))
`;

function run() {
  const job = JSON.stringify({
    portraitsDir: PORTRAITS_DIR,
    portraitsJson: PORTRAITS_JSON,
    tolerance: config.tolerance,
    owHeight: config.owHeight,
    bustRatio: config.bustRatio,
  });

  const res = spawnSync("python3", ["-c", PY_WORKER], {
    input: job,
    encoding: "utf-8",
    maxBuffer: 64 * 1024 * 1024,
  });

  if (res.error) {
    console.error("Failed to launch python3:", res.error.message);
    process.exit(1);
  }
  if (res.status !== 0) {
    console.error("Python worker failed:\n", res.stderr);
    process.exit(res.status ?? 1);
  }

  let parsed;
  try {
    parsed = JSON.parse(res.stdout.trim().split("\n").pop());
  } catch (e) {
    console.error("Could not parse worker output:\n", res.stdout, res.stderr);
    process.exit(1);
  }

  console.log("Processed portraits (tolerance=%d, owHeight=%d, bustRatio=%s):",
    config.tolerance, config.owHeight, config.bustRatio);
  for (const r of parsed.report) {
    if (r.error) {
      console.log(`  ✗ ${r.id}: ${r.error}`);
      continue;
    }
    const tA = (a) => a.every((v) => v === 0) ? "transparent" : `alpha=${a}`;
    console.log(
      `  ✓ ${r.id.padEnd(22)} ` +
      `full ${r.full.size.join("x").padEnd(9)} [${tA(r.full.cornerAlpha)}]  ` +
      `bust ${r.bust.size.join("x").padEnd(9)} [${tA(r.bust.cornerAlpha)}]  ` +
      `ow ${r.ow.size.join("x").padEnd(7)} [${tA(r.ow.cornerAlpha)}]  ` +
      `(bg ${(r.bgPixelFraction * 100).toFixed(0)}%)`
    );
    if (r.overworld) {
      for (const [dir, o] of Object.entries(r.overworld)) {
        if (o.error) console.log(`        overworld ${dir}: ✗ ${o.error}`);
        else if (o.skipped) console.log(`        overworld ${dir}: (${o.skipped}) ${o.size.join("x")}`);
        else console.log(`        overworld ${dir}: ${o.size.join("x").padEnd(7)} [${tA(o.cornerAlpha)}]`);
      }
    }
  }
  console.log("\nUpdated portraits.json with `bust` and `ow` paths.");
}

run();
