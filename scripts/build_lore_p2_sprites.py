#!/usr/bin/env python3
"""
build_lore_p2_sprites.py  —  sprites overworld de los ENTRENADORES NPC "P2" (ADITIVO).

Genera los sprites propios de tres personajes nuevos que se añaden como ENTRENADORES
NPC en huecos de Madrid (Tetuán / Chamberí / Ruta 2). TODO por RESKIN de las
plantillas FRLG pret (igual que Ann Jou, el Alto Mando, Bercero y Torrevieja):
NUNCA pixel-trace de las fotos. Las fotos de referencia (cerebro) solo guían la
PALETA y los rasgos generales (color/largo de pelo, color de ropa, gafas), nada más.
No se publica PII (teléfonos/JIDs/direcciones/empleadores reales).

Personajes (slug sin PII):

  - gustavo       : el cerebrito-con-cuerpo-de-gym (Lucha/Dragón). Atlético/fibrado,
                    pelo MUY CORTO/rapado oscuro, GAFAS de montura fina (las del lore),
                    jersey/camiseta CREMA claro. Piel mediterránea media.
                    Base: base_man_avg__eduardo_ivan.png
                      - pelo olivo -> negro azabache (rapado, sin afro: NO se ensancha).
                      - camiseta rojiza -> jersey CREMA claro.
                      - + gafas de montura fina (add_glasses round_).

  - david_guillen : el "bienqueda" patológico (Clima/Variable). Cara de chico
                    agradable y común, fuerte/en forma, pelo corto castaño estándar,
                    parka/abrigo AZUL MARINO sobre camisa clara. Piel clara.
                    Base: base_man_avg__eduardo_ivan.png
                      - pelo olivo -> castaño medio (corto estándar).
                      - camiseta rojiza -> parka AZUL MARINO (cuello camisa claro).

  - alvaro_benito : el historiador cenizo/agotado (Acero/"Cenizo"). RUBIO y
                    DESPEINADO, aire de "acabado", chaqueta gris ACERO (tema del gym).
                    Piel clara. Base: base_rival_gary__alvaro.png (YA rubio Gary)
                      - pelo rubio Gary -> rubio pajizo desordenado (se conserva, se
                        despeina 1px con afro_head MUY suave en tono rubio).
                      - chaqueta morada del rival -> gris ACERO frío.

Reutiliza el pipeline de corte de frames de build_char_sprites.py (mismo grid,
mismo OUT_H=24, orden pret) y el patrón de INTEGRACIÓN ADITIVA del atlas de
build_torrevieja_sprites.py / build_bercero_sprites.py: añade bandas nuevas al
final del canvas (npcs.webp/json) y registra SOLO las claves nuevas. NO toca
ninguna clave existente. Idempotente (re-empaqueta sobre su banda si ya existe).

Uso:
  python3 scripts/build_lore_p2_sprites.py               # build + integra atlas
  python3 scripts/build_lore_p2_sprites.py --frames-only  # solo PNGs en char_frames/
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

# Paleta de pelo OLIVO del man_avg (origen a recolorear en gustavo / david_guillen)
HAIR_OLIVE_HI = (205, 172, 98, 255)
HAIR_OLIVE_MID = (123, 115, 65, 255)
HAIR_OLIVE_DK = (57, 57, 24, 255)
# Paleta de la camiseta ROJIZA del man_avg (origen a recolorear)
SHIRT_RED = (230, 106, 74, 255)
SHIRT_RED_SH = (148, 57, 41, 255)


# ===========================================================================
#  RECETAS
# ===========================================================================

def char_gustavo():
    """El cerebrito-gym-bro (gym 8, Lucha/Dragón). Atlético, pelo rapado oscuro,
    GAFAS finas, jersey CREMA claro, piel mediterránea media. Base man_avg.
      pelo olivo  -> negro azabache (rapado, SIN ensanchar).
      camiseta rojiza/blanca -> jersey crema claro.
      piel        -> mediterránea media (un punto más morena que el default).
      + gafas redondas (montura fina).
    """
    b = base.load_base("base_man_avg__eduardo_ivan.png")
    BLACK_HI = (58, 56, 62, 255)     # pelo iluminado
    BLACK = (34, 32, 38, 255)        # pelo medio (rapado)
    BLACK_DK = (18, 16, 22, 255)     # raíz/sombra
    CREMA = (240, 232, 212, 255)     # jersey crema claro
    CREMA_SH = (210, 200, 176, 255)  # sombra jersey
    CREMA_DK = (178, 168, 142, 255)  # sombra profunda
    s = base.recolor(b, {
        # piel -> mediterránea media (tostada de gym)
        SKIN_LIGHT: (236, 192, 156, 255),
        SKIN_MID: (214, 166, 128, 255),
        SKIN_BASE: (186, 134, 100, 255),
        SKIN_SHADOW: (132, 84, 60, 255),
        # pelo olivo -> negro azabache rapado
        HAIR_OLIVE_HI: BLACK_HI,
        HAIR_OLIVE_MID: BLACK,
        HAIR_OLIVE_DK: BLACK_DK,
        # camiseta rojiza -> jersey crema
        SHIRT_RED: CREMA,
        SHIRT_RED_SH: CREMA_SH,
        (255, 255, 255, 255): CREMA,
        (197, 197, 213, 255): CREMA_SH,
        (139, 139, 148, 255): CREMA_DK,
    })
    # Gafas finas (montura redonda) sobre la zona de ojos.
    s = base.add_glasses(s, round_=True)
    return s


def char_david_guillen():
    """El "bienqueda" patológico (gym 7, Clima/Variable). Pelo corto castaño
    estándar, cara agradable, fuerte/en forma, parka AZUL MARINO con cuello de
    camisa claro, piel clara. Base man_avg (se diferencia de Eduardo/Iván por el
    azul marino + castaño medio).
      pelo olivo  -> castaño medio (corto estándar).
      camiseta rojiza -> parka azul marino.
      blanco/gris (cuello camisa) -> blanco roto (camisa que asoma).
    """
    b = base.load_base("base_man_avg__eduardo_ivan.png")
    BROWN_HI = (150, 110, 70, 255)   # castaño claro
    BROWN_MID = (112, 80, 50, 255)   # castaño medio (mayoritario)
    BROWN_DK = (76, 52, 32, 255)     # castaño sombra/raíz
    NAVY = (52, 66, 104, 255)        # parka azul marino
    NAVY_SH = (36, 46, 78, 255)      # sombra parka
    NAVY_DK = (26, 34, 58, 255)      # sombra profunda
    s = base.recolor(b, {
        # pelo olivo -> castaño medio (corto)
        HAIR_OLIVE_HI: BROWN_HI,
        HAIR_OLIVE_MID: BROWN_MID,
        HAIR_OLIVE_DK: BROWN_DK,
        # camiseta rojiza -> parka azul marino
        SHIRT_RED: NAVY,
        SHIRT_RED_SH: NAVY_SH,
        # blanco/gris de la base -> camisa clara que asoma del cuello
        (255, 255, 255, 255): (238, 236, 228, 255),
        (197, 197, 213, 255): (206, 204, 196, 255),
        (139, 139, 148, 255): NAVY_DK,
    })
    return s


def char_alvaro_benito():
    """El historiador cenizo/agotado (gym 6, Acero/"Cenizo"). RUBIO y despeinado,
    aire de "acabado", chaqueta gris ACERO (tema del gym), piel clara. Base
    rival_gary (que YA es rubio Gary): se conserva el rubio (despeinándolo un punto)
    y la chaqueta morada del rival pasa a gris acero frío.
      pelo rubio Gary -> rubio pajizo (se conserva tono, se despeina suave).
      chaqueta morada -> gris acero.
    """
    b = base.load_base("base_rival_gary__alvaro.png")
    BLOND_HI = (228, 196, 110, 255)  # rubio claro pajizo
    BLOND_MID = (190, 154, 78, 255)  # rubio medio
    BLOND_DK = (130, 102, 50, 255)   # rubio sombra
    STEEL = (138, 144, 156, 255)     # gris acero (chaqueta)
    STEEL_HI = (170, 176, 188, 255)  # acero iluminado
    s = base.recolor(b, {
        # rubio Gary -> rubio pajizo despeinado (tono levemente más apagado)
        (222, 189, 65, 255): BLOND_HI,
        (164, 131, 32, 255): BLOND_MID,
        (82, 82, 32, 255): BLOND_DK,
        # chaqueta morada del rival -> gris ACERO frío (tema del gym)
        (82, 32, 65, 255): STEEL,
        (164, 74, 131, 255): STEEL_HI,
    })
    # Despeinado MUY suave: ensancha 1px la masa rubia (look "acabado/despeinado").
    s = base.afro_head(s, color=BLOND_MID, hi=BLOND_HI)
    return s


# ===========================================================================
#  INTEGRACIÓN ADITIVA EN EL ATLAS (NO toca claves existentes)
# ===========================================================================
CELL_W, CELL_H = FRAME_W, OUT_H
PAD = 1

CHARS = [
    ("gustavo", char_gustavo),
    ("david_guillen", char_david_guillen),
    ("alvaro_benito", char_alvaro_benito),
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
    print("Construyendo sprites P2 (gustavo, david_guillen, alvaro_benito)...")
    frames = build_frames()
    n = sum(len(frames[c][d]) for c in frames for d in frames[c])
    print(f"  {len(frames)} personaje(s), {n} frames PNG en {OUT_FRAMES}")
    if frames_only:
        print("--frames-only: atlas NO modificado.")
        return
    integrate_atlas(frames)


if __name__ == "__main__":
    main()
