#!/usr/bin/env python3
"""
build_bercero_sprites.py  —  sprites overworld de la ZONA BERCERO (ADITIVO).

Genera los sprites propios de los personajes de la zona nueva de Bercero
(pueblo castellano de Valladolid). TODO por RESKIN de las plantillas FRLG pret
(igual que Ann Jou y el Alto Mando): NUNCA pixel-trace de las fotos. Las fotos de
referencia (cerebro-graph) solo guían la PALETA y los rasgos generales (color de
pelo, barba, color de ropa), nada más.

Personajes (slugs sin PII; los teléfonos NUNCA entran en código/JSON):

  - padre_marcelino : NPC central. Hombre MAYOR de pueblo: pelo CANO (gris claro),
                      GAFAS DE SOL oscuras, POLO de trabajo FLUORESCENTE (amarillo
                      lima). Base: base_balding_man__jesus (calva lateral + canas).
  - ivan_novio      : el NOVIO. pelo oscuro, SUDADERA NEGRA, pantalón claro.
                      Base: base_pokemaniac_glasses (sin gafas) -> hoodie negro.
  - laura_gallega   : la jefa de logística. melena oscura, vestido AMARILLO suave.
                      Base: base_beauty_blonde__blanca (pelo -> castaño, top amarillo).
  - alvaro_nozal    : el trotamundos/BBQ. pelo oscuro, BARBA corta, camiseta azul.
                      Base: base_man_avg__eduardo_ivan + barba.
  - arantza         : la tech/emprendedora. pelo oscuro recogido, vestido VERDE lima.
                      Base: base_daisy_blonde__mariel (pelo -> oscuro, vestido verde).
  - nano            : el fijo de confianza. pelo oscuro, barba, camiseta verde-oliva.
                      Base: base_fat_man__alex + barba.
  - alberto         : el meme-lord. pelo oscuro RIZADO, camiseta MENTA clara.
                      Base: base_boy_young (pelo oscuro + camiseta menta).
  - ana             : alegre/juguetona. pelo castaño ondulado, CHUPA de cuero negra.
                      Base: base_crush_girl_brunette (top -> cuero negro).

Reutiliza el pipeline de corte de frames de build_char_sprites.py (mismo grid,
mismo OUT_H=24, mismo orden pret) y el patrón de INTEGRACIÓN ADITIVA del atlas de
build_altomando_sprites.py: añade bandas nuevas al final del canvas (npcs.webp/json)
y registra SOLO las claves `<slug>_*`. NO toca ninguna clave existente. Idempotente.

Uso:
  python3 scripts/build_bercero_sprites.py               # build + integra atlas
  python3 scripts/build_bercero_sprites.py --frames-only # solo PNGs en char_frames/
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

DIRECTIONS = ["down", "up", "left", "right"]


# ===========================================================================
#  RECETAS
# ===========================================================================

def char_padre():
    """PADRE de Marcelino — hombre mayor de pueblo: pelo CANO, gafas de SOL,
    polo de trabajo FLUORESCENTE (amarillo lima). Base: balding_man (jesus), que ya
    trae calva lateral + complexión adulta. Reskin:
      - pelo lateral oscuro -> gris/cano claro.
      - camiseta -> polo amarillo fluorescente (alta visibilidad de trabajo).
      - gafas de SOL negras opacas sobre los ojos.
    """
    b = base.load_base("base_balding_man__jesus.png")
    s = base.recolor(b, {
        # pelo lateral oscuro del balding -> CANO (gris claro)
        (57, 57, 24, 255): (196, 196, 200, 255),     # pelo medio -> gris cano
        # camiseta -> polo amarillo fluorescente (alta visibilidad)
        (255, 255, 255, 255): (212, 240, 64, 255),   # cuerpo polo amarillo-lima
        (197, 197, 213, 255): (176, 208, 48, 255),   # sombra polo
        (139, 139, 148, 255): (140, 168, 36, 255),   # sombra más oscura
    })
    s = _grey_hair(s)
    s = _sunglasses(s)
    return s


def char_ivan_novio():
    """Iván de Fuentes (el NOVIO) — pelo oscuro, SUDADERA NEGRA, pantalón claro.
    Base: pokemaniac_glasses (pelo oscuro + complexión) SIN gafas. Reskin:
      - camiseta blanca -> sudadera negra.
      - pantalón azul -> pantalón claro (beige).
    """
    b = base.load_base("base_pokemaniac_glasses.png")
    s = base.recolor(b, {
        # pelo: deja el oscuro del pokemaniac (queda bien como pelo castaño oscuro)
        (74, 74, 90, 255): (40, 36, 40, 255),
        (57, 57, 74, 255): (28, 26, 30, 255),
        (139, 139, 148, 255): (52, 48, 52, 255),   # brillo pelo / sombra camiseta
        # camiseta blanca -> sudadera negra
        (255, 255, 255, 255): (44, 44, 50, 255),
        (197, 197, 213, 255): (30, 30, 36, 255),
        # pantalón azul -> pantalón claro (chinos beige)
        (98, 131, 205, 255): (206, 192, 158, 255),
        # bolso rosa del pokemaniac -> tono sudadera
        (139, 65, 82, 255): (30, 30, 36, 255),
        (213, 106, 123, 255): (44, 44, 50, 255),
    })
    return s


def char_laura():
    """Laura Gallega — la jefa de logística: melena oscura, vestido AMARILLO suave.
    Base: beauty_blonde (blanca), pelo rubio -> castaño oscuro, vestido -> amarillo.
    """
    b = base.load_base("base_beauty_blonde__blanca.png")
    return base.recolor(b, {
        # pelo rubio de la beauty -> castaño oscuro (melena) — palette real
        (255, 222, 74, 255): (108, 80, 52, 255),   # pelo brillo
        (213, 172, 32, 255): (84, 60, 40, 255),    # pelo medio (mayoritario)
        (131, 98, 0, 255): (54, 38, 26, 255),      # pelo raíz/sombra
        # vestido de la beauty -> amarillo suave (tonos reales del top)
        (238, 115, 65, 255): (236, 214, 96, 255),  # vestido claro
        (172, 65, 57, 255): (196, 174, 72, 255),   # vestido sombra
        (74, 49, 49, 255): (212, 190, 84, 255),    # cuerpo vestido
        (65, 57, 98, 255): (150, 132, 56, 255),    # detalle morado -> amarillo osc
        (164, 139, 238, 255): (200, 178, 78, 255), # detalle claro
    })


def char_alvaro_nozal():
    """Alvaro Nozal — el trotamundos/BBQ: pelo oscuro, BARBA corta, camiseta azul.
    Base: man_avg (eduardo/ivan) + barba. Reskin:
      - pelo oliva -> castaño oscuro.
      - camiseta -> azul.
    """
    b = base.load_base("base_man_avg__eduardo_ivan.png")
    s = base.recolor(b, {
        # pelo oliva -> castaño oscuro
        (205, 172, 98, 255): (96, 70, 46, 255),
        (123, 115, 65, 255): (68, 50, 34, 255),
        (57, 57, 24, 255): (44, 32, 22, 255),
        # camiseta -> azul (camiseta de verano)
        (230, 106, 74, 255): (74, 122, 196, 255),
        (148, 57, 41, 255): (46, 84, 148, 255),
    })
    s = _beard(s, color=(60, 44, 30, 255), shade=(42, 30, 20, 255))
    return s


def char_arantza():
    """Arantza — la tech/emprendedora: pelo oscuro recogido, vestido VERDE lima.
    Base: daisy_blonde (mariel), pelo rubio -> oscuro, vestido -> verde lima.
    """
    b = base.load_base("base_daisy_blonde__mariel.png")
    return base.recolor(b, {
        # pelo rubio daisy -> negro/oscuro (melena recogida)
        (222, 189, 65, 255): (54, 42, 38, 255),
        (164, 131, 32, 255): (38, 30, 28, 255),
        (82, 82, 32, 255): (24, 20, 20, 255),
        # vestido verde de la daisy -> verde lima brillante (look de evento)
        (57, 139, 0, 255): (150, 196, 40, 255),
        (131, 205, 49, 255): (190, 224, 92, 255),
        (32, 65, 16, 255): (104, 140, 28, 255),
        # banda del pelo -> morado (guiño al chal morado de la foto)
        (82, 32, 65, 255): (120, 70, 150, 255),
    })


def char_nano():
    """Nano Caballero Calleja — el fijo de confianza: pelo oscuro, barba, camiseta
    verde-oliva. Base: fat_man (alex, cuerpo más ancho) + barba. Reskin:
      - pelo oliva -> oscuro.
      - camiseta -> verde-oliva.
    """
    b = base.load_base("base_fat_man__alex.png")
    s = base.recolor(b, {
        # pelo oliva -> castaño oscuro
        (205, 172, 98, 255): (72, 56, 42, 255),
        (123, 115, 65, 255): (50, 40, 30, 255),
        (57, 57, 24, 255): (32, 26, 20, 255),
        # camiseta blanca -> verde-oliva (camiseta de pueblo)
        (255, 255, 255, 255): (124, 134, 104, 255),
        (197, 197, 213, 255): (96, 106, 80, 255),
        (139, 139, 148, 255): (74, 84, 62, 255),
        # pantalón -> vaquero
        (148, 57, 41, 255): (56, 64, 88, 255),
        (230, 106, 74, 255): (72, 82, 110, 255),
        (82, 16, 0, 255): (36, 42, 60, 255),
    })
    s = _beard(s, color=(52, 40, 30, 255), shade=(36, 28, 22, 255))
    return s


def char_alberto():
    """Alberto — el meme-lord: pelo oscuro RIZADO, camiseta MENTA clara.
    Base: boy_young (complexión joven) — camiseta verde -> menta clara, pelo oscuro,
    y un rizado suave en la corona (dilatación tipo afro suave).
    """
    b = base.load_base("base_boy_young.png")
    s = base.recolor(b, {
        # camiseta verde -> menta clara (la de la foto)
        (57, 139, 0, 255): (168, 214, 196, 255),
        (131, 205, 49, 255): (204, 236, 222, 255),
        (32, 65, 16, 255): (128, 178, 160, 255),
        # pelo rubio -> castaño muy oscuro (rizado)
        (222, 189, 65, 255): (58, 46, 40, 255),
        (164, 131, 32, 255): (40, 32, 28, 255),
        (82, 82, 32, 255): (26, 22, 20, 255),
    })
    # rizos: dilatamos suavemente la masa de pelo oscuro en la corona
    s = base.afro_head(s, color=(40, 32, 28, 255), hi=(58, 46, 40, 255))
    return s


def char_ana():
    """Ana — alegre/juguetona: pelo castaño ondulado, CHUPA de cuero negra.
    Base: crush_girl_brunette (ya morena) — top -> chupa de cuero negra.
    """
    b = base.load_base("base_crush_girl_brunette.png")
    # Palette real del crush_girl: pelo olivo (123,115,65)/(57,57,24)/(205,172,98);
    # top rojizo (230,106,74)/(148,57,41)/(82,16,0) + blanco. Reskin:
    #   - pelo olivo -> castaño ondulado.
    #   - top -> CHUPA de cuero negra.
    s = base.recolor(b, {
        # pelo olivo -> castaño ondulado (la melena de la foto)
        (205, 172, 98, 255): (118, 86, 58, 255),
        (123, 115, 65, 255): (84, 60, 42, 255),
        (57, 57, 24, 255): (52, 38, 28, 255),
        # top rojizo + blanco -> chupa de cuero negra
        (230, 106, 74, 255): (44, 44, 50, 255),
        (148, 57, 41, 255): (28, 28, 34, 255),
        (82, 16, 0, 255): (18, 18, 22, 255),
        (255, 255, 255, 255): (52, 52, 58, 255),
        (197, 197, 213, 255): (40, 40, 46, 255),
        (139, 139, 148, 255): (30, 30, 36, 255),
    })
    return s


# ===========================================================================
#  HELPERS DE EDICIÓN
# ===========================================================================

def _eye_row(px, ox, w, lo=9, hi=14):
    skin = {base.SKIN_LIGHT[:3], base.SKIN_MID[:3], base.SKIN_BASE[:3]}
    best_y, best_n = (lo + hi) // 2, -1
    for y in range(lo, hi):
        n = sum(1 for x in range(ox + 4, ox + 12)
                if px[x, y][3] > 0 and px[x, y][:3] in skin)
        if n > best_n:
            best_n, best_y = n, y
    return best_y


def _sunglasses(strip):
    """Gafas de SOL negras OPACAS (banda ancha) sobre los ojos en poses frontales
    (pret 0,3,6 = down). Solo sobre piel para no comerse contorno ni pelo."""
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    SHADE = (16, 16, 22, 255)
    skin = {base.SKIN_LIGHT[:3], base.SKIN_MID[:3], base.SKIN_BASE[:3]}
    for fi in (0, 3, 6):
        if fi >= nf:
            continue
        ox = fi * FRAME_W
        gy = _eye_row(px, ox, w)
        for dx in range(4, 12):
            xx = ox + dx
            if 0 <= xx < w and px[xx, gy][3] > 0 and px[xx, gy][:3] in skin:
                px[xx, gy] = SHADE
    return out


def _grey_hair(strip):
    """Refuerza el look CANO: cualquier resto de pelo oscuro de la base
    (74,74,90)/(57,57,74) en la cabeza (y<16) -> gris claro. Idempotente."""
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    GREY = (200, 200, 204, 255)
    GREY_SH = (158, 158, 164, 255)
    darks = {(74, 74, 90, 255), (57, 57, 74, 255), (57, 57, 24, 255)}
    for fi in range(nf):
        ox = fi * FRAME_W
        for y in range(2, 16):
            for x in range(ox, ox + FRAME_W):
                if px[x, y] in darks:
                    px[x, y] = GREY if y < 10 else GREY_SH
    return out


def _beard(strip, color, shade):
    """Barba: rellena 2-3 filas bajo la fila de ojos con `color` sobre la piel."""
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    skin = {base.SKIN_LIGHT, base.SKIN_MID, base.SKIN_BASE}
    for fi in range(nf):
        ox = fi * FRAME_W
        gy = _eye_row(px, ox, w)
        for y in range(gy + 1, min(gy + 4, h)):
            for x in range(ox, ox + FRAME_W):
                if px[x, y] in skin:
                    px[x, y] = shade if y >= gy + 3 else color
    return out


# ===========================================================================
#  INTEGRACIÓN ADITIVA EN EL ATLAS (NO toca claves existentes)
# ===========================================================================
CELL_W, CELL_H = FRAME_W, OUT_H
PAD = 1

CHARS = [
    ("padre_marcelino", char_padre),
    ("ivan_novio", char_ivan_novio),
    ("laura_gallega", char_laura),
    ("alvaro_nozal", char_alvaro_nozal),
    ("arantza", char_arantza),
    ("nano", char_nano),
    ("alberto", char_alberto),
    ("ana", char_ana),
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
    print("Construyendo sprites de la ZONA BERCERO (padre + amigos del pueblo)...")
    frames = build_frames()
    n = sum(len(frames[c][d]) for c in frames for d in frames[c])
    print(f"  {len(frames)} personajes, {n} frames PNG en {OUT_FRAMES}")
    if frames_only:
        print("--frames-only: atlas NO modificado.")
        return
    integrate_atlas(frames)


if __name__ == "__main__":
    main()
