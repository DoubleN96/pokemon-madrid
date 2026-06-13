#!/usr/bin/env python3
"""
build_torrevieja_sprites.py  —  sprites overworld de la ZONA TORREVIEJA (ADITIVO).

Genera los sprites propios de los personajes de la zona nueva de Torrevieja
(pueblo costero del Levante, Alicante). TODO por RESKIN de las plantillas FRLG
pret (igual que Ann Jou, el Alto Mando y Bercero): NUNCA pixel-trace de las fotos.
Las fotos de referencia solo guían la PALETA y los rasgos generales (color de pelo,
peinado, color de ropa), nada más. No se publica PII (teléfonos/JIDs/direcciones).

Personaje principal (slug sin PII):

  - marilyn_parada : la MADRE de Marcelino. NPC central de la zona, cura el equipo
                     (como el padre en Bercero). Mujer adulta de piel MORENA OSCURA,
                     pelo RIZADO recogido en MOÑO tono CAOBA (castaño-rojizo oscuro),
                     blusa color CREMA/MARFIL claro (look elegante, estilo Tous).
                     Base: base_crush_girl_brunette (ya morena, con andar) ->
                       - piel -> morena oscura (mismos swaps que char_marcelino).
                       - pelo olivo -> caoba oscuro + recogido/rizos (afro_head suave).
                       - top -> crema/marfil claro.

El resto de NPCs de ambiente (pescador, heladero, veraneantes, guiño a la facción
de Levante) usan sprites GENÉRICOS que YA existen en el atlas (fisher, gentleman,
aroma, lass, youngster, elder_m...), igual que Bercero hizo con sus rellenos. Así
añadimos UNA sola banda nueva al atlas (la de marilyn_parada) y nada más.

Reutiliza el pipeline de corte de frames de build_char_sprites.py (mismo grid,
mismo OUT_H=24, orden pret) y el patrón de INTEGRACIÓN ADITIVA del atlas de
build_altomando_sprites.py / build_bercero_sprites.py: añade UNA banda nueva al
final del canvas (npcs.webp/json) y registra SOLO las claves `marilyn_parada_*`.
NO toca ninguna clave existente. Idempotente.

Uso:
  python3 scripts/build_torrevieja_sprites.py               # build + integra atlas
  python3 scripts/build_torrevieja_sprites.py --frames-only # solo PNGs en char_frames/
"""
import json
import os
import sys
from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_char_sprites as base  # noqa: E402

ATLAS_PNG = base.ATLAS_PNG
ATLAS_JSON = base.ATLAS_JSON
OUT_FRAMES = base.OUT_FRAMES
FRAME_W = base.FRAME_W
OUT_H = base.OUT_H
TRANSPARENT = base.TRANSPARENT
SKIN_LIGHT = base.SKIN_LIGHT
SKIN_MID = base.SKIN_MID
SKIN_BASE = base.SKIN_BASE
SKIN_SHADOW = base.SKIN_SHADOW

DIRECTIONS = ["down", "up", "left", "right"]


# ===========================================================================
#  RECETA
# ===========================================================================

def char_marilyn():
    """MADRE de Marcelino (Marilyn Parada) — piel morena oscura, pelo CAOBA rizado
    recogido en moño, blusa CREMA/MARFIL clara. Base: crush_girl_brunette (mujer
    morena con andar). Reskin (paleta real del crush_girl):
      pelo olivo:  (205,172,98)/(123,115,65)/(57,57,24)   -> caoba oscuro
      top rojizo:  (230,106,74)/(148,57,41)/(82,16,0)      -> crema/marfil
      blanco/gris: (255,255,255)/(197,197,213)/(139,139,148) -> crema sombras
      piel:        SKIN_* -> morena oscura (igual que char_marcelino)
    """
    b = base.load_base("base_crush_girl_brunette.png")
    CAOBA = (96, 52, 44, 255)        # caoba (corona)
    CAOBA_MID = (74, 40, 36, 255)    # caoba medio (mayoritario)
    CAOBA_DK = (52, 28, 26, 255)     # caoba sombra/raíz
    CREMA = (244, 234, 200, 255)     # blusa crema clara
    CREMA_SH = (214, 200, 158, 255)  # sombra blusa
    CREMA_DK = (180, 164, 124, 255)  # sombra profunda
    s = base.recolor(b, {
        # piel -> morena oscura (mismos destinos que el protagonista Marcelino)
        SKIN_LIGHT: (188, 128, 92, 255),
        SKIN_MID: (158, 102, 70, 255),
        SKIN_BASE: (126, 78, 52, 255),
        SKIN_SHADOW: (86, 50, 32, 255),
        # pelo olivo del crush -> caoba oscuro (castaño-rojizo)
        (205, 172, 98, 255): CAOBA,
        (123, 115, 65, 255): CAOBA_MID,
        (57, 57, 24, 255): CAOBA_DK,
        # top rojizo del crush -> blusa crema/marfil
        (230, 106, 74, 255): CREMA,
        (148, 57, 41, 255): CREMA_SH,
        (82, 16, 0, 255): CREMA_DK,
        (255, 255, 255, 255): CREMA,
        (197, 197, 213, 255): CREMA_SH,
        (139, 139, 148, 255): CREMA_DK,
    })
    # rizos del moño: dilatamos suavemente la masa caoba en la corona (como Alberto).
    s = base.afro_head(s, color=CAOBA_MID, hi=CAOBA)
    return s


# ===========================================================================
#  INTEGRACIÓN ADITIVA EN EL ATLAS (NO toca claves existentes)
# ===========================================================================
CELL_W, CELL_H = FRAME_W, OUT_H
PAD = 1

CHARS = [
    ("marilyn_parada", char_marilyn),
]


def _make_entry(x, y):
    return {
        "frame": {"x": x, "y": y, "w": CELL_W, "h": CELL_H},
        "rotated": False,
        "trimmed": False,
        "spriteSourceSize": {"x": 0, "y": 0, "w": CELL_W, "h": CELL_H},
        "sourceSize": {"w": CELL_W, "h": CELL_H},
    }


def build_frames():
    os.makedirs(OUT_FRAMES, exist_ok=True)
    result = {}
    for cid, fn in CHARS:
        strip = fn()
        dirs = base.build_directions(strip)
        result[cid] = dirs
        for d, frames in dirs.items():
            for n, img in enumerate(frames):
                img.save(os.path.join(OUT_FRAMES, f"{cid}_{d}_{n}.png"))
    return result


def integrate_atlas(frames_by_char):
    d = json.load(open(ATLAS_JSON))
    atlas = Image.open(ATLAS_PNG).convert("RGBA")
    W, H = atlas.size
    canvas = atlas
    new_W = W
    new_H = H
    total_new = 0

    for cid, dirs in frames_by_char.items():
        frame_names = [f"{cid}_{dd}_{i}" for dd in DIRECTIONS for i in range(3)]
        imgs = {f"{cid}_{dd}_{i}": dirs[dd][i] for dd in DIRECTIONS for i in range(3)}
        existing = [n for n in frame_names if n in d["frames"]]
        if len(existing) == len(frame_names):
            band_y = d["frames"][frame_names[0]]["frame"]["y"]
            print(f"Re-empaquetando {cid} sobre banda existente en y={band_y}")
        else:
            band_y = new_H + PAD
            new_H = band_y + CELL_H
            bigger = Image.new("RGBA", (new_W, new_H), TRANSPARENT)
            bigger.alpha_composite(canvas, (0, 0))
            canvas = bigger
            print(f"Banda nueva para {cid} en y={band_y} (atlas -> {new_W}x{new_H})")
        x = 1
        for name in frame_names:
            fr = imgs[name]
            assert fr.size == (CELL_W, CELL_H), f"{name} tiene tamaño {fr.size}"
            clear = Image.new("RGBA", (CELL_W, CELL_H), TRANSPARENT)
            canvas.paste(clear, (x, band_y))
            canvas.alpha_composite(fr, (x, band_y))
            d["frames"][name] = _make_entry(x, band_y)
            x += CELL_W + PAD
            total_new += 1

    d["meta"]["size"] = {"w": new_W, "h": new_H}
    canvas.save(ATLAS_PNG, "WEBP", lossless=True, quality=100, method=6)
    json.dump(d, open(ATLAS_JSON, "w"))
    print(f"Atlas guardado: {new_W}x{new_H}, +{total_new} frames "
          f"({', '.join(cid for cid, _ in CHARS)})")


def main():
    frames_only = "--frames-only" in sys.argv
    print("Construyendo sprites de la ZONA TORREVIEJA (la madre Marilyn Parada)...")
    frames = build_frames()
    n = sum(len(frames[c][d]) for c in frames for d in frames[c])
    print(f"  {len(frames)} personaje(s), {n} frames PNG en {OUT_FRAMES}")
    if frames_only:
        print("--frames-only: atlas NO modificado.")
        return
    integrate_atlas(frames)


if __name__ == "__main__":
    main()
