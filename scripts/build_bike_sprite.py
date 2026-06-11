#!/usr/bin/env python3
"""
build_bike_sprite.py  —  añade el sprite de BICI/MOTO del jugador al atlas `chars`.

Cuando el jugador monta en moto (save.flags.riding), el overworld debe mostrarlo
montado en bici en vez de andando. Reutilizamos el sprite FRLG pret canónico
`red_bike.png` (graphics/object_events/pics/people/red_bike.png de pret/pokefirered),
ya descargado en docs/refs/upgrade/ow-sprite-bases/bases/base_bike__player.png.

Sigue EXACTAMENTE el mismo método ADITIVO de scripts/build_char_sprites.py:
  - corta del orden pret al grid del motor (down=[0,3,6], up=[1,4,7], left=[2,5,8],
    right = espejo de left), frames 16xOUT_H anclados a los pies,
  - añade claves `bike_down_0`, `bike_up_0`, `bike_left_0`, `bike_right_0`, etc.
    (3 frames por dirección) al atlas public/assets/sprites/chars/npcs.{webp,json}
    SIN tocar ninguna clave existente.

El sprite red_bike de pret tiene 18 frames (16x32). Los 9 primeros (0..8) son el
layout pret estándar idéntico al de los personajes a pie:
    down  = pret [0,3,6]   (idle, pedaleo A, pedaleo B)
    up    = pret [1,4,7]
    left  = pret [2,5,8]
    right = espejo de left
(Los frames 9..17 son poses extra de pedaleo intenso; no las necesitamos para una
animación de 3 frames consistente con el resto de personajes.)

Idempotente: borra primero cualquier clave `bike_*` y recorta el canvas a su altura
previa antes de re-empaquetar, así re-ejecutarlo no deforma el atlas. Trabaja a
escala NATIVA, sin antialias.

Uso:
  python3 scripts/build_bike_sprite.py              # integra en el atlas
  python3 scripts/build_bike_sprite.py --frames-only # solo PNGs de QA en scripts/bike_frames
"""
import json
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASES = os.path.join(ROOT, "docs/refs/upgrade/ow-sprite-bases/bases")
ATLAS_PNG = os.path.join(ROOT, "public/assets/sprites/chars/npcs.webp")
ATLAS_JSON = os.path.join(ROOT, "public/assets/sprites/chars/npcs.json")
OUT_FRAMES = os.path.join(ROOT, "scripts/bike_frames")  # PNGs sueltos para QA

BIKE_BASE = "base_bike__player.png"   # red_bike pret (16x32/frame, 18 frames)
BIKE_ID = "bike"

FRAME_W = 16
FRAME_H = 32
OUT_H = 24            # mismo alto de frame que el resto de personajes del atlas
TRANSPARENT = (0, 0, 0, 0)


def load_base(name):
    return Image.open(os.path.join(BASES, name)).convert("RGBA")


def frame(img, i):
    return img.crop((i * FRAME_W, 0, i * FRAME_W + FRAME_W, FRAME_H))


def common_bbox(frames):
    """BBOX (l,t,r,b) union de todos los frames, en coords 16x32."""
    l = t = 999
    r = b = 0
    for f in frames:
        bb = f.getbbox()
        if not bb:
            continue
        l = min(l, bb[0]); t = min(t, bb[1])
        r = max(r, bb[2]); b = max(b, bb[3])
    if r == 0:
        return (0, 0, FRAME_W, FRAME_H)
    return (l, t, r, b)


def crop_to_canvas(f, bbox):
    """Recorta f a la bbox comun y lo ancla a los pies en un lienzo 16xOUT_H.

    Mantiene X original (centrado real del sprite) y alinea el fondo de la bbox
    con el fondo del lienzo (los pies/ruedas quedan abajo).
    """
    l, t, r, b = bbox
    region = f.crop((0, t, FRAME_W, b))
    canvas = Image.new("RGBA", (FRAME_W, OUT_H), TRANSPARENT)
    h = region.size[1]
    paste_y = OUT_H - h
    if paste_y < 0:
        region = region.crop((0, -paste_y, FRAME_W, h))
        paste_y = 0
    canvas.alpha_composite(region, (0, paste_y))
    return canvas


def build_directions(strip):
    """Dada la tira pret de bici, devuelve dict dir -> [f0,f1,f2] en 16xOUT_H.

    Mapeo pret estándar (idéntico a los personajes a pie):
      down=[0,3,6], up=[1,4,7], left=[2,5,8], right=espejo de left.
    BBOX comun = union de los 9 frames usados (consistencia de animacion).
    """
    idx = {
        "down": [0, 3, 6],
        "up": [1, 4, 7],
        "left": [2, 5, 8],
    }
    nframes = strip.size[0] // FRAME_W
    raw = {}
    used = []
    for d, ids in idx.items():
        raw[d] = []
        for i in ids:
            j = i if i < nframes else (i % nframes)
            f = frame(strip, j)
            raw[d].append(f)
            used.append(f)
    bbox = common_bbox(used)
    out = {}
    for d in ("down", "up", "left"):
        out[d] = [crop_to_canvas(f, bbox) for f in raw[d]]
    out["right"] = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in out["left"]]
    return out


def build_frames():
    """Genera dict dir -> [Image,...] y guarda PNGs sueltos para QA."""
    os.makedirs(OUT_FRAMES, exist_ok=True)
    strip = load_base(BIKE_BASE)
    dirs = build_directions(strip)
    for d, frames in dirs.items():
        for n, img in enumerate(frames):
            img.save(os.path.join(OUT_FRAMES, f"{BIKE_ID}_{d}_{n}.png"))
    return dirs


def integrate_atlas(dirs):
    """Añade las claves bike_* al atlas chars de forma ADITIVA.

    Idempotente: borra primero cualquier clave `bike_*` y recorta el canvas a la
    altura previa (sin nuestra franja) antes de re-empaquetar. NO toca el resto
    de claves ni su packing.
    """
    atlas = Image.open(ATLAS_PNG).convert("RGBA")
    meta_json = json.load(open(ATLAS_JSON))
    frames_json = meta_json["frames"]

    def is_ours(key):
        return key.startswith(f"{BIKE_ID}_")

    # 1) recolectar frames nuevos (key -> Image 16xOUT_H)
    new_frames = {}
    for d, imgs in dirs.items():
        for n, img in enumerate(imgs):
            new_frames[f"{BIKE_ID}_{d}_{n}"] = img

    # 2) calcular la altura del canvas SIN nuestras claves previas (para idempotencia).
    #    Tomamos la y máxima (frame.y + frame.h) de las claves que NO son nuestras.
    prev_max_y = 0
    for k, fr in frames_json.items():
        if is_ours(k):
            continue
        fy = fr["frame"]["y"] + fr["frame"]["h"]
        prev_max_y = max(prev_max_y, fy)
    orig_w = meta_json["meta"]["size"]["w"]
    # margen mínimo bajo el contenido existente
    base_h = prev_max_y + 1
    base_canvas = atlas.crop((0, 0, orig_w, min(base_h, atlas.size[1])))
    if base_canvas.size[1] < base_h:
        pad = Image.new("RGBA", (orig_w, base_h), TRANSPARENT)
        pad.alpha_composite(base_canvas, (0, 0))
        base_canvas = pad

    # 3) limpiar claves nuestras previas del JSON
    for k in list(frames_json.keys()):
        if is_ours(k):
            del frames_json[k]

    # 4) empaquetar en grid debajo del contenido existente
    PAD = 1
    cell_w = FRAME_W + PAD
    cell_h = OUT_H + PAD
    cols = max(1, orig_w // cell_w)
    keys = sorted(new_frames.keys())
    rows = (len(keys) + cols - 1) // cols
    strip_h = rows * cell_h + PAD
    total_h = base_h + strip_h

    new_canvas = Image.new("RGBA", (orig_w, total_h), TRANSPARENT)
    new_canvas.alpha_composite(base_canvas, (0, 0))

    for i, key in enumerate(keys):
        c = i % cols
        r = i // cols
        x = PAD + c * cell_w
        y = base_h + PAD + r * cell_h
        img = new_frames[key]
        new_canvas.alpha_composite(img, (x, y))
        frames_json[key] = {
            "frame": {"x": x, "y": y, "w": FRAME_W, "h": OUT_H},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_W, "h": OUT_H},
            "sourceSize": {"w": FRAME_W, "h": OUT_H},
        }

    meta_json["meta"]["size"] = {"w": orig_w, "h": total_h}
    new_canvas.save(ATLAS_PNG, "WEBP", lossless=True)
    json.dump(meta_json, open(ATLAS_JSON, "w"))
    return len(keys), (orig_w, total_h)


def main():
    frames_only = "--frames-only" in sys.argv
    print("Construyendo frames de BICI (red_bike pret)...")
    dirs = build_frames()
    total = sum(len(v) for v in dirs.values())
    print(f"  {total} frames PNG en {OUT_FRAMES}")
    if frames_only:
        print("--frames-only: atlas NO modificado.")
        return
    n, size = integrate_atlas(dirs)
    print(f"Atlas integrado: +{n} claves bike_*. npcs.webp -> {size[0]}x{size[1]}")
    print("Claves: bike_down_0..2, bike_up_0..2, bike_left_0..2, bike_right_0..2")


if __name__ == "__main__":
    main()
