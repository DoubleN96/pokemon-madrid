#!/usr/bin/env python3
"""
build_annjou_sprite.py  —  sprite overworld de Ann Jou (ADITIVO, no destructivo).

Ann Jou: chico asiatico, GAFAS de pasta negra, pelo negro despeinado/de punta,
sudadera NEGRA con capucha. Se construye reskineando la base FRLG pret
`base_pokemaniac_glasses` (ya trae pelo oscuro + gafas + complexion robusta, la
mas parecida del set) con:
  - pelo -> negro azabache + puntas (dilatacion hacia arriba en la corona).
  - camiseta blanca -> sudadera negra con capucha (cordones de capucha gris claro).
  - pantalon azul -> vaquero oscuro; bolso rosa -> bolsillo canguro negro.
  - gafas de pasta negra reforzadas sobre los ojos.

Reutiliza el pipeline de corte de frames de build_char_sprites.py (mismo grid,
mismo OUT_H=24, mismo orden pret -> [quieto, walkA, walkB] por direccion).

La INTEGRACION en el atlas es 100% aditiva: añade una banda nueva al final del
canvas actual (npcs.webp/json) y registra solo las claves `ann_jou_*`. NO toca
ninguna de las 792 claves existentes ni la banda de marcelino_bike. Idempotente:
si las claves ya existen, regenera sobre su misma banda.

Uso:
  python3 scripts/build_annjou_sprite.py              # build + integra atlas
  python3 scripts/build_annjou_sprite.py --frames-only # solo PNGs en char_frames/
"""
import json
import os
import sys
from PIL import Image

# Reutilizamos helpers y constantes del builder principal.
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_char_sprites as base  # noqa: E402

ROOT = base.ROOT
BASES = base.BASES
ATLAS_PNG = base.ATLAS_PNG
ATLAS_JSON = base.ATLAS_JSON
OUT_FRAMES = base.OUT_FRAMES
FRAME_W = base.FRAME_W
OUT_H = base.OUT_H
TRANSPARENT = base.TRANSPARENT

CHAR_ID = "ann_jou"
DIRECTIONS = ["down", "up", "left", "right"]

# --- Paleta destino Ann Jou --------------------------------------------------
HAIR_DARK = (24, 22, 28, 255)     # negro azabache (zona media del pelo)
HAIR_DARKER = (14, 13, 18, 255)   # nucleo/sombra del pelo
HAIR_HI = (52, 50, 60, 255)       # brillo apenas perceptible (corona)

HOODIE = (40, 40, 46, 255)        # negro de la sudadera (cuerpo)
HOODIE_SH = (26, 26, 32, 255)     # sombra sudadera
HOODIE_HI = (60, 60, 70, 255)     # luz sudadera
DRAWSTRING = (200, 200, 206, 255)  # cordones de capucha gris claro

JEANS = (52, 60, 88, 255)         # vaquero oscuro
JEANS_HI = (78, 88, 120, 255)     # luz vaquero


def char_annjou():
    """Devuelve la tira pret recoloreada+editada de Ann Jou (lista para cortar)."""
    b = base.load_base("base_pokemaniac_glasses.png")
    s = base.recolor(b, {
        # --- PELO: tonos oscuros del pokemaniac -> negro azabache ---
        (74, 74, 90, 255): HAIR_DARK,
        (57, 57, 74, 255): HAIR_DARKER,
        # nota: (139,139,148) lo usa el pelo (brillo) Y la camiseta (sombra);
        # se resuelve mas abajo separando por zona (cabeza vs torso).
        # --- CAMISETA blanca -> SUDADERA NEGRA ---
        (255, 255, 255, 255): HOODIE,
        (197, 197, 213, 255): HOODIE_SH,
        # --- PANTALON azul -> vaquero oscuro ---
        (98, 131, 205, 255): JEANS_HI,
        # --- BOLSO rosa del pokemaniac -> bolsillo canguro negro ---
        (139, 65, 82, 255): HOODIE_SH,
        (213, 106, 123, 255): HOODIE,
    })
    # (139,139,148) ambiguo: en la CABEZA (y<16) es brillo de pelo -> HAIR_HI;
    # en el TORSO (y>=16) es sombra de camiseta -> HOODIE_HI. Lo separamos por fila.
    _split_gray(s)
    # Capucha + cordones, puntas de pelo y gafas de pasta.
    s = _hood_and_strings(s)
    s = _spiky_hair(s)
    s = _glasses_thick(s)
    return s


def _split_gray(strip):
    """Reasigna el gris (139,139,148) segun zona: cabeza->pelo, torso->sudadera."""
    px = strip.load()
    w, h = strip.size
    nf = w // FRAME_W
    GRAY = (139, 139, 148, 255)
    for fi in range(nf):
        ox = fi * FRAME_W
        for y in range(h):
            for x in range(ox, ox + FRAME_W):
                if px[x, y] == GRAY:
                    px[x, y] = HAIR_HI if y < 16 else HOODIE_HI


def _hood_and_strings(strip):
    """Añade 2 cordones de capucha (drawstrings) cayendo del cuello en pose 'down'.

    Pone 2px gris claro a ambos lados del centro del pecho en los frames frontales
    (pret 0,3,6) para leer claramente como sudadera con capucha.
    """
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    for fi in (0, 3, 6):
        if fi >= nf:
            continue
        ox = fi * FRAME_W
        # buscar la primera fila de sudadera (HOODIE) bajo la cabeza
        top = None
        for y in range(18, 26):
            row = [px[x, y][:3] for x in range(ox + 4, ox + 12)]
            if any(c == HOODIE[:3] or c == HOODIE_HI[:3] for c in row):
                top = y
                break
        if top is None:
            continue
        for dy in range(0, 3):
            y = top + dy
            if y >= h:
                break
            for dx in (6, 9):
                xx = ox + dx
                if px[xx, y][3] > 0 and px[xx, y][:3] in (HOODIE[:3], HOODIE_HI[:3], HOODIE_SH[:3]):
                    px[xx, y] = DRAWSTRING
    return out


def _spiky_hair(strip):
    """Da puntas al pelo: dilata la masa de pelo 1px hacia ARRIBA en la corona,
    creando un perfil despeinado/de punta sobre transparente. Conserva outline.
    """
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    hair_set = {HAIR_DARK, HAIR_DARKER, HAIR_HI}
    for fi in range(nf):
        ox = fi * FRAME_W
        mask = []
        for y in range(2, 15):
            for x in range(ox, ox + FRAME_W):
                if px[x, y] in hair_set:
                    mask.append((x, y))
        if not mask:
            continue
        ty = min(p[1] for p in mask)
        # crear puntas despeinadas: en columnas alternas, subir el pelo 1-3px
        cols = sorted({x for (x, y) in mask if y <= ty + 1})
        for i, x in enumerate(cols):
            up = 3 if (i % 3 == 0) else (2 if (i % 3 == 1) else 1)
            for dy in range(1, up + 1):
                yy = ty - dy
                if yy < 1:
                    break
                if px[x, yy][3] == 0:
                    px[x, yy] = HAIR_DARKER
        # highlight tenue en la corona
        for x in range(ox, ox + FRAME_W):
            if px[x, ty] in (HAIR_DARK, HAIR_DARKER):
                px[x, ty] = HAIR_HI
    return out


def _glasses_thick(strip):
    """Dibuja gafas de pasta negra (2 lentes + puente) sobre los ojos en las poses
    frontales (down: pret 0,3,6). Localiza la fila de ojos por la banda de piel mas
    ancha y reescribe SOLO sobre piel para no comerse el contorno ni el pelo.

    Patron de lente (a escala nativa, leible como gafas de pasta y no como visera):
      lente izq:  dx 4-5    bridge: dx 7-8 (1px)   lente der: dx 10-11
    """
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    GLASS = (10, 10, 14, 255)
    skin = {base.SKIN_LIGHT[:3], base.SKIN_MID[:3], base.SKIN_BASE[:3]}
    for fi in (0, 3, 6):
        if fi >= nf:
            continue
        ox = fi * FRAME_W
        # fila de OJOS = la fila con mas piel en la mitad alta de la cara (y=9..13)
        best_y, best_n = 11, -1
        for y in range(9, 14):
            n = sum(1 for x in range(ox + 4, ox + 12)
                    if px[x, y][3] > 0 and px[x, y][:3] in skin)
            if n > best_n:
                best_n, best_y = n, y
        gy = best_y
        # lentes solo donde hay piel debajo (evita pintar sobre pelo/outline)
        for dx in (4, 5, 7, 10, 11):
            xx = ox + dx
            if 0 <= xx < w and px[xx, gy][3] > 0 and px[xx, gy][:3] in skin:
                px[xx, gy] = GLASS
    return out


# ---------------------------------------------------------------------------
#  Integracion ADITIVA en el atlas (NO toca claves existentes)
# ---------------------------------------------------------------------------
CELL_W, CELL_H = FRAME_W, OUT_H
PAD = 1
FRAME_NAMES = [f"{CHAR_ID}_{d}_{i}" for d in DIRECTIONS for i in range(3)]


def _make_entry(x, y):
    return {
        "frame": {"x": x, "y": y, "w": CELL_W, "h": CELL_H},
        "rotated": False,
        "trimmed": False,
        "spriteSourceSize": {"x": 0, "y": 0, "w": CELL_W, "h": CELL_H},
        "sourceSize": {"w": CELL_W, "h": CELL_H},
    }


def build_frames():
    """Genera dict dir->[Image,...] y guarda PNGs sueltos para QA."""
    os.makedirs(OUT_FRAMES, exist_ok=True)
    strip = char_annjou()
    dirs = base.build_directions(strip)
    for d, frames in dirs.items():
        for n, img in enumerate(frames):
            img.save(os.path.join(OUT_FRAMES, f"{CHAR_ID}_{d}_{n}.png"))
    return dirs


def integrate_atlas(dirs):
    """Añade los frames ann_jou_* al atlas SIN tocar nada mas. Idempotente."""
    d = json.load(open(ATLAS_JSON))
    atlas = Image.open(ATLAS_PNG).convert("RGBA")
    W, H = atlas.size

    # frames en el orden de FRAME_NAMES
    imgs = {f"{CHAR_ID}_{dd}_{i}": dirs[dd][i] for dd in DIRECTIONS for i in range(3)}

    existing = [n for n in FRAME_NAMES if n in d["frames"]]
    if len(existing) == len(FRAME_NAMES):
        new_y = d["frames"][FRAME_NAMES[0]]["frame"]["y"]
        new_W, new_H = W, H
        canvas = atlas
        print(f"Re-empaquetando ann_jou sobre banda existente en y={new_y}")
    else:
        new_y = H + PAD
        new_W = W
        new_H = new_y + CELL_H
        canvas = Image.new("RGBA", (new_W, new_H), TRANSPARENT)
        canvas.alpha_composite(atlas, (0, 0))
        print(f"Extendiendo atlas {W}x{H} -> {new_W}x{new_H}; nueva banda y={new_y}")

    x = 1
    for name in FRAME_NAMES:
        fr = imgs[name]
        assert fr.size == (CELL_W, CELL_H), f"{name} tiene tamaño {fr.size}"
        clear = Image.new("RGBA", (CELL_W, CELL_H), TRANSPARENT)
        canvas.paste(clear, (x, new_y))
        canvas.alpha_composite(fr, (x, new_y))
        d["frames"][name] = _make_entry(x, new_y)
        x += CELL_W + PAD

    d["meta"]["size"] = {"w": new_W, "h": new_H}
    canvas.save(ATLAS_PNG, "WEBP", lossless=True, quality=100, method=6)
    json.dump(d, open(ATLAS_JSON, "w"))
    print(f"Atlas guardado: {new_W}x{new_H}, +{len(FRAME_NAMES)} frames {CHAR_ID}_*")


def main():
    frames_only = "--frames-only" in sys.argv
    print("Construyendo sprite de Ann Jou (reskin pokemaniac_glasses)...")
    dirs = build_frames()
    n = sum(len(dirs[d]) for d in dirs)
    print(f"  {n} frames PNG en {OUT_FRAMES} (ann_jou_*)")
    if frames_only:
        print("--frames-only: atlas NO modificado.")
        return
    integrate_atlas(dirs)


if __name__ == "__main__":
    main()
