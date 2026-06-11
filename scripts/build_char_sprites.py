#!/usr/bin/env python3
"""
build_char_sprites.py  —  FASE A1 del PLAN-visual-upgrade.

Da a los 12 personajes de Pokémon Madrid su PROPIO sprite overworld nítido,
reskineando plantillas FRLG pret (pixel-art canónico, sin antialias) en vez de
generarlos con IA (salían blandos / mal cortados / pequeños).

Pipeline por personaje:
  1. Cargar su base FRLG (tira horizontal 16x32/frame, modo paleta P).
  2. Aplicar el recolor de la receta (swaps de color EXACTO sobre la paleta).
  3. (casos difíciles) injertar/editar cabeza (afro, coleta, rapado).
  4. Cortar los 9 frames del orden pret al grid del juego:
        _0 = quieto   (pret 0/1/2 segun dir)
        _1 = walk A    (pret 3/4/5)
        _2 = walk B    (pret 6/7/8)
        right = espejo horizontal de left
     Mapeo CATALOG: down=[3,0,6], up=[4,1,7], left=[5,2,8] -> reindexado a
     [quieto, walkA, walkB] = [0,3,6]/[1,4,7]/[2,5,8].
  5. Recortar todos los frames a una BBOX VERTICAL COMUN (anclada a los pies)
     para que la animacion no "salte", y emitir frames PNG 16xH (H<=24).

Integracion de atlas (ADITIVA, no destructiva):
  - Extiende el canvas de public/assets/sprites/chars/npcs.webp hacia abajo con
    una franja nueva donde se empaquetan los frames nuevos en grid.
  - Anade las claves nuevas (`marcelino_down_0`, ...) a npcs.json SIN tocar las
    624 claves existentes (frames `rotated:false`, `trimmed:false`).

Reproducible: re-ejecutar regenera la franja nueva desde cero (idempotente: borra
sus propias claves antes de re-anadir). Trabaja a escala NATIVA, NEAREST, sin AA.

Uso:
  python3 scripts/build_char_sprites.py            # build completo + integra atlas
  python3 scripts/build_char_sprites.py --frames-only   # solo PNG en out/, no toca atlas
"""
import json
import os
import sys
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASES = os.path.join(ROOT, "docs/refs/upgrade/ow-sprite-bases/bases")
RAW = os.path.join(ROOT, "docs/refs/upgrade/ow-sprite-bases/frlg-pret-raw")
ATLAS_PNG = os.path.join(ROOT, "public/assets/sprites/chars/npcs.webp")
ATLAS_JSON = os.path.join(ROOT, "public/assets/sprites/chars/npcs.json")
OUT_FRAMES = os.path.join(ROOT, "scripts/char_frames")  # PNGs sueltos para QA

FRAME_W = 16          # ancho de fuente de cada frame pret
FRAME_H = 32          # alto de fuente
OUT_H = 24            # alto final del frame en el atlas (recorte a pies)
TRANSPARENT = (0, 0, 0, 0)

# --- Paleta FRLG comun (referencia para recetas) ---------------------------
# piel (claro->sombra): 255,213,180 / 246,189,148 / 222,148,115 / 123,65,65
# outline negro: 0,0,0
SKIN_LIGHT = (255, 213, 180, 255)
SKIN_MID = (246, 189, 148, 255)
SKIN_BASE = (222, 148, 115, 255)
SKIN_SHADOW = (123, 65, 65, 255)
BLACK = (0, 0, 0, 255)


def load_base(name):
    """Carga una tira pret como RGBA."""
    return Image.open(os.path.join(BASES, name)).convert("RGBA")


def recolor(img, swaps):
    """Devuelve una copia con swaps de color EXACTO {origen_rgba: destino_rgba}."""
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        for x in range(w):
            c = px[x, y]
            if c in swaps:
                px[x, y] = swaps[c]
    return out


def frame(img, i):
    """Recorta el frame i (16x32) de la tira."""
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
    """Recorta f a la bbox comun y lo pega en un lienzo 16xOUT_H anclado a los pies.

    Mantiene X original (centrado real del sprite) y alinea el fondo de la bbox
    con el fondo del lienzo (origin bottom -> los pies quedan abajo).
    """
    l, t, r, b = bbox
    region = f.crop((0, t, FRAME_W, b))   # mantiene ancho 16, recorta vertical
    canvas = Image.new("RGBA", (FRAME_W, OUT_H), TRANSPARENT)
    h = region.size[1]
    # anclar abajo
    paste_y = OUT_H - h
    if paste_y < 0:
        # si la region es mas alta que OUT_H, recorta por arriba (cabeza)
        region = region.crop((0, -paste_y, FRAME_W, h))
        paste_y = 0
    canvas.alpha_composite(region, (0, paste_y))
    return canvas


def build_directions(strip):
    """Dada una tira pret (ya recoloreada), devuelve dict dir-> [f0,f1,f2] en 16xOUT_H.

    Mapeo a indices del juego: _0=quieto, _1=walkA, _2=walkB.
      down:  pret [0,3,6]
      up:    pret [1,4,7]
      left:  pret [2,5,8]
      right: espejo de left
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


# ---------------------------------------------------------------------------
#  RECETAS POR PERSONAJE
#  Cada funcion devuelve una TIRA pret recoloreada/editada lista para cortar.
# ---------------------------------------------------------------------------

def char_alex():
    # base_fat_man__alex: camiseta blanca -> roja, pelo oscuro corto (ya esta).
    b = load_base("base_fat_man__alex.png")
    # camiseta: blancos (255,255,255) y gris claro (197,197,213) -> rojos
    return recolor(b, {
        (255, 255, 255, 255): (216, 64, 56, 255),   # camiseta roja
        (197, 197, 213, 255): (168, 40, 40, 255),    # sombra camiseta
        (139, 139, 148, 255): (120, 28, 28, 255),    # sombra mas oscura
    })


def char_jesus():
    # base_balding_man__jesus: casi directo. camiseta -> blanco roto / gris sucio.
    b = load_base("base_balding_man__jesus.png")
    return recolor(b, {
        (197, 197, 213, 255): (206, 200, 188, 255),  # camiseta blanco roto
        (255, 255, 255, 255): (232, 228, 216, 255),
        (139, 139, 148, 255): (150, 144, 132, 255),
    })


def char_blanca():
    # base_beauty_blonde__blanca: melena rubia ya esta; top -> blanco.
    # El vestido naranja (238,115,65 / 172,65,57) -> blanco/gris.
    b = load_base("base_beauty_blonde__blanca.png")
    return recolor(b, {
        (238, 115, 65, 255): (236, 236, 240, 255),   # vestido -> blanco
        (172, 65, 57, 255): (188, 188, 200, 255),     # sombra vestido
        (65, 57, 98, 255): (120, 120, 140, 255),       # detalle oscuro -> gris
    })


def char_adrian():
    # base_hiker_bearded__adrian: pelo+barba oliva grandes -> gris canoso (look intenso
    # del esquizo). Camisa hiker (139,139,148)/(197,197,213) -> gris-pizarra.
    # ZONAS: pelo/barba = (205,172,98)/(123,115,65)/(57,57,24); ropa = grises + (148,57,41).
    b = load_base("base_hiker_bearded__adrian.png")
    return recolor(b, {
        # pelo/barba oliva -> gris-canoso
        (205, 172, 98, 255): (188, 184, 180, 255),
        (123, 115, 65, 255): (138, 134, 130, 255),
        (57, 57, 24, 255): (86, 84, 82, 255),
        # camisa/chaleco hiker -> verde-musgo oscuro (diferenciar del pelo gris)
        (197, 197, 213, 255): (96, 110, 86, 255),
        (139, 139, 148, 255): (66, 78, 60, 255),
        (148, 57, 41, 255): (50, 60, 46, 255),
        (230, 106, 74, 255): (110, 124, 98, 255),
        (82, 16, 0, 255): (44, 52, 40, 255),
    })


def char_angel():
    # base_scientist__angel: gafas + bata. PELO oliva -> oscuro peinado;
    # BATA blanca (255,255,255)/(197,197,213) -> azul claro (camisa/bata de Angel).
    b = load_base("base_scientist__angel.png")
    return recolor(b, {
        # pelo oliva -> negro/grafito peinado
        (205, 172, 98, 255): (96, 92, 86, 255),
        (123, 115, 65, 255): (64, 62, 58, 255),
        (57, 57, 24, 255): (40, 40, 44, 255),
        # bata blanca -> azul claro
        (255, 255, 255, 255): (176, 206, 236, 255),
        (197, 197, 213, 255): (130, 168, 212, 255),
        (139, 139, 148, 255): (96, 130, 178, 255),
    })


def char_alvaro():
    # base_rival_gary__alvaro: ya es el rival Gary. pelo castano, chaqueta gris.
    # pelo rubio Gary (164,131,32 / 222,189,65 / 82,82,32) -> castano.
    # chaqueta morada (82,32,65 / 164,74,131) -> gris/oscuro.
    b = load_base("base_rival_gary__alvaro.png")
    return recolor(b, {
        (222, 189, 65, 255): (150, 102, 56, 255),    # pelo claro -> castano claro
        (164, 131, 32, 255): (110, 72, 36, 255),      # pelo medio -> castano
        (82, 82, 32, 255): (70, 44, 24, 255),          # pelo oscuro -> castano osc
        (82, 32, 65, 255): (70, 72, 82, 255),           # chaqueta -> gris azulado
        (164, 74, 131, 255): (110, 114, 126, 255),       # chaqueta clara -> gris
        (123, 65, 65, 255): SKIN_SHADOW,                  # (mantener sombra piel)
    })


def char_ivan():
    # base_man_avg__eduardo_ivan: polo verde + gafas.
    # ZONAS: pelo = (205,172,98)/(123,115,65)/(57,57,24) [oliva]; camiseta = (230,106,74)/(148,57,41).
    b = load_base("base_man_avg__eduardo_ivan.png")
    s = recolor(b, {
        # pelo oliva -> castano corto
        (205, 172, 98, 255): (150, 108, 62, 255),
        (123, 115, 65, 255): (108, 76, 42, 255),
        (57, 57, 24, 255): (68, 46, 26, 255),
        # camiseta -> verde polo
        (230, 106, 74, 255): (78, 162, 96, 255),
        (148, 57, 41, 255): (48, 116, 64, 255),
    })
    return add_glasses(s)


def char_eduardo():
    # base_man_avg__eduardo_ivan: camiseta -> marron, SIN gafas. (comparte base con ivan)
    # ZONAS iguales que ivan; diferenciar por ropa marron + pelo mas claro castano.
    b = load_base("base_man_avg__eduardo_ivan.png")
    return recolor(b, {
        # pelo oliva -> castano claro (distinto de ivan)
        (205, 172, 98, 255): (178, 132, 80, 255),
        (123, 115, 65, 255): (138, 98, 56, 255),
        (57, 57, 24, 255): (96, 64, 36, 255),
        # camiseta -> marron tierra
        (230, 106, 74, 255): (158, 104, 62, 255),
        (148, 57, 41, 255): (112, 70, 40, 255),
    })


def char_sergio():
    # base_balding_man__jesus (calvo lateral) -> camiseta AMARILLA (camionero amable).
    # Se diferencia de jesus por el color de la ropa; el pelo lateral oscuro
    # (57,57,24) -> mas claro/rapado al rape.
    b = load_base("base_balding_man__jesus.png")
    return recolor(b, {
        (197, 197, 213, 255): (240, 206, 72, 255),   # camiseta -> amarilla
        (255, 255, 255, 255): (252, 226, 112, 255),
        (139, 139, 148, 255): (198, 166, 52, 255),     # sombra -> amarillo osc
        (57, 57, 24, 255): (150, 110, 86, 255),         # pelo lateral -> castano rapado
    })


def char_jose():
    # base_pokemaniac_glasses -> CALVO total + camiseta gris/negra + quitar gafas.
    # pokemaniac tiene pelo oscuro (74,74,90)/(139,139,148) que cubre la cabeza.
    b = load_base("base_pokemaniac_glasses.png")
    s = shave_bald(b)
    # camisa azul (98,131,205) -> gris oscuro
    s = recolor(s, {
        (98, 131, 205, 255): (84, 84, 92, 255),
        (213, 106, 123, 255): (110, 110, 118, 255),
    })
    return s


def char_marcelino():
    # base_youngster (cuerpo). La GORRA amarilla (255,222,74)/(213,172,32)/(131,98,0)
    # se convierte en AFRO negro (recolor a negro + afro_head lo ensancha).
    # Piel -> marron oscuro; camiseta/torso (74,49,49) -> sudadera gris; pantalon morado -> vaquero.
    b = load_base("base_youngster.png")
    AFRO = (28, 26, 30, 255)
    AFRO_HI = (54, 50, 56, 255)
    s = recolor(b, {
        # piel -> marron oscuro
        SKIN_LIGHT: (188, 128, 92, 255),
        SKIN_MID: (158, 102, 70, 255),
        SKIN_BASE: (126, 78, 52, 255),
        SKIN_SHADOW: (86, 50, 32, 255),
        # gorra amarilla -> afro negro
        (255, 222, 74, 255): AFRO_HI,
        (213, 172, 32, 255): AFRO,
        (131, 98, 0, 255): (18, 16, 20, 255),
        # camiseta/torso del youngster -> sudadera gris
        (74, 49, 49, 255): (110, 110, 118, 255),
        # pantalon morado -> vaquero azul oscuro
        (106, 82, 189, 255): (56, 70, 110, 255),
        (65, 57, 98, 255): (40, 50, 80, 255),
        (164, 139, 238, 255): (82, 98, 142, 255),
    })
    s = afro_head(s, color=AFRO, hi=AFRO_HI)
    s = add_glasses(s, round_=True)
    return s


def char_mariel():
    # base_daisy_blonde (cuerpo+andar): ya es rubia y camina. Vestido verde -> coral.
    # El (82,32,65) morado es la banda/lazo del pelo -> lo dejamos como detalle rosa.
    # NO injertamos coleta artificial (quedaba como pincho); la melena daisy ya da
    # el look de pelo recogido femenino. (Coleta marcada = mejora futura, ver reporte.)
    b = load_base("base_daisy_blonde__mariel.png")
    return recolor(b, {
        (57, 139, 0, 255): (208, 84, 96, 255),       # vestido verde -> coral
        (131, 205, 49, 255): (236, 124, 134, 255),    # claro -> coral claro
        (32, 65, 16, 255): (150, 52, 62, 255),         # sombra -> coral osc
        (82, 32, 65, 255): (180, 70, 110, 255),         # banda pelo -> rosa intenso
    })


# --- helpers de edicion de cabeza ------------------------------------------

def add_glasses(strip, round_=False):
    """Dibuja 2px de gafas oscuras sobre la zona de ojos de las poses 'down'
    (frames pret 0,3,6) y opcionalmente 'left/up'. Sutil, a escala nativa.

    Detecta la fila de ojos por la banda de piel mas ancha en la parte alta.
    """
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    glass = (40, 40, 46, 255) if not round_ else (30, 30, 36, 255)
    # poses frontales: pret 0,3,6 (down). En esas, ojos ~y=14-16, x centrados.
    for fi in (0, 3, 6):
        if fi >= nf:
            continue
        ox = fi * FRAME_W
        # localizar fila con mas piel base entre y=12..18
        best_y, best_n = 15, -1
        for y in range(12, 19):
            n = 0
            for x in range(ox + 4, ox + 12):
                c = px[x, y]
                if c[3] > 0 and c[:3] in (SKIN_MID[:3], SKIN_BASE[:3], SKIN_LIGHT[:3],
                                          (180, 120, 86), (150, 96, 66), (120, 74, 50)):
                    n += 1
            if n > best_n:
                best_n, best_y = n, y
        gy = best_y
        # dibujar dos lentes 2x1 sobre los ojos
        for dx in (5, 6, 9, 10):
            xx = ox + dx
            if 0 <= xx < w and px[xx, gy][3] > 0:
                px[xx, gy] = glass
        # puente
        for dx in (7, 8):
            xx = ox + dx
            if 0 <= xx < w and px[xx, gy][3] > 0:
                px[xx, gy] = glass
    return out


def shave_bald(strip):
    """Convierte el pelo (tonos oscuros de cabeza) en piel para look calvo total.

    Heuristica: en cada frame, los pixeles de pelo del pokemaniac
    (74,74,90)/(139,139,148)/(57,57,74) en la parte alta (y<16) -> piel.
    """
    out = strip.copy()
    px = out.load()
    w, h = out.size
    hair = {(74, 74, 90, 255), (139, 139, 148, 255), (57, 57, 74, 255)}
    nf = w // FRAME_W
    for fi in range(nf):
        ox = fi * FRAME_W
        for y in range(8, 16):
            for x in range(ox, ox + FRAME_W):
                if px[x, y] in hair:
                    # piel iluminada arriba, mas oscura en los bordes
                    px[x, y] = SKIN_MID
    # un borde de piel sombreada en el contorno superior
    return out


def afro_head(strip, color=(28, 26, 30, 255), hi=(54, 50, 56, 255)):
    """Ensancha la masa de pelo `color` (ya recoloreada en la cabeza) para simular afro.

    Dilata la masa de afro 1px a izquierda/derecha/arriba sobre pixeles transparentes
    adyacentes, en la zona de cabeza (y<16). Anade un highlight `hi` en la corona.
    Idempotente por frame; conserva el outline negro del sprite.
    """
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    afro_set = {color, hi}
    for fi in range(nf):
        ox = fi * FRAME_W
        # snapshot de la mascara de afro actual en la cabeza
        mask = []
        for y in range(2, 16):
            for x in range(ox, ox + FRAME_W):
                if px[x, y] in afro_set:
                    mask.append((x, y))
        if not mask:
            continue
        # dilatar 1px (arriba y lados) sobre transparente
        for (x, y) in mask:
            for dx, dy in ((-1, 0), (1, 0), (0, -1), (-1, -1), (1, -1)):
                nx, ny = x + dx, y + dy
                if ox <= nx < ox + FRAME_W and 1 <= ny < 16 and px[nx, ny][3] == 0:
                    px[nx, ny] = color
        # highlight de corona: fila superior de la masa -> hi
        ys = [p[1] for p in mask]
        ty = min(ys)
        for x in range(ox, ox + FRAME_W):
            for y in (ty, ty + 1):
                if px[x, y] == color:
                    px[x, y] = hi
                    break
    return out


def ponytail_head(strip):
    """Anade una coleta rubia (2-3px) detras de la cabeza en las poses laterales/down.

    Refuerza el recogido alto: pinta una cola de pelo rubio sobresaliendo arriba.
    """
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    blonde = (222, 189, 65, 255)
    blonde_d = (164, 131, 32, 255)
    for fi in range(nf):
        ox = fi * FRAME_W
        # detectar top de la cabeza (primer pixel no transparente)
        ty = None
        cx = ox + FRAME_W // 2
        for y in range(2, 16):
            row = [px[x, y] for x in range(ox, ox + FRAME_W) if px[x, y][3] > 0]
            if row:
                ty = y
                break
        if ty is None:
            continue
        # coleta: 2 px de alto encima del centro-trasero de la cabeza
        for y in range(max(1, ty - 2), ty):
            for dx in (-1, 0, 1):
                xx = cx + dx
                if ox <= xx < ox + FRAME_W and px[xx, y][3] == 0:
                    px[xx, y] = blonde if dx == 0 else blonde_d
    return out


# ---------------------------------------------------------------------------

# id -> (funcion receta, calidad esperada)
CHARS = [
    # --- 6 "1:1 solo recolor" (validar pipeline primero) ---
    ("alex_digital", char_alex),
    ("jesus_la_rata", char_jesus),
    ("blanca_notarias", char_blanca),
    ("adrian_schizo", char_adrian),
    ("angel_perfeccionista", char_angel),
    ("alvaro_rival", char_alvaro),
    # --- casos con recolor + detalle ---
    ("ivan_fintips", char_ivan),
    ("eduardo", char_eduardo),
    ("sergio_guillen", char_sergio),
    # --- casos con edicion de cabeza ---
    ("jose_antonio_casero", char_jose),
    ("mariel", char_mariel),
    ("marcelino", char_marcelino),
]


def build_all_frames():
    """Genera dict id -> {dir -> [Image,...]} y guarda PNGs sueltos para QA."""
    os.makedirs(OUT_FRAMES, exist_ok=True)
    result = {}
    for cid, fn in CHARS:
        strip = fn()
        dirs = build_directions(strip)
        result[cid] = dirs
        for d, frames in dirs.items():
            for n, img in enumerate(frames):
                img.save(os.path.join(OUT_FRAMES, f"{cid}_{d}_{n}.png"))
    return result


def integrate_atlas(frames_by_char):
    """Anade los frames nuevos al atlas chars (npcs.webp + npcs.json) de forma
    ADITIVA: extiende el canvas hacia abajo y anade claves sin tocar las existentes.

    Idempotente: borra primero cualquier clave de nuestros ids y recorta el canvas
    a la altura original (128) antes de re-empaquetar.
    """
    atlas = Image.open(ATLAS_PNG).convert("RGBA")
    meta_json = json.load(open(ATLAS_JSON))
    frames_json = meta_json["frames"]

    our_ids = {cid for cid, _ in CHARS}

    def is_ours(key):
        root = key
        for d in ("_down_", "_up_", "_left_", "_right_"):
            if d in key:
                root = key.split(d)[0]
                break
        return root in our_ids

    # 1) limpiar claves nuestras previas
    for k in list(frames_json.keys()):
        if is_ours(k):
            del frames_json[k]

    # 2) recortar canvas a la altura ORIGINAL del meta (la de TexturePacker)
    orig_w = meta_json["meta"]["size"]["w"]
    orig_h = 128  # altura original del pack TexturePacker
    base_canvas = atlas.crop((0, 0, orig_w, orig_h))

    # 3) recolectar todos los frames nuevos (key -> Image 16xOUT_H)
    new_frames = {}
    for cid, dirs in frames_by_char.items():
        for d, imgs in dirs.items():
            for n, img in enumerate(imgs):
                new_frames[f"{cid}_{d}_{n}"] = img

    # 4) empaquetar en grid debajo del canvas original
    PAD = 1
    cell_w = FRAME_W + PAD
    cell_h = OUT_H + PAD
    cols = max(1, orig_w // cell_w)
    keys = sorted(new_frames.keys())
    rows = (len(keys) + cols - 1) // cols
    strip_h = rows * cell_h + PAD
    total_h = orig_h + strip_h

    new_canvas = Image.new("RGBA", (orig_w, total_h), TRANSPARENT)
    new_canvas.alpha_composite(base_canvas, (0, 0))

    for i, key in enumerate(keys):
        c = i % cols
        r = i // cols
        x = PAD + c * cell_w
        y = orig_h + PAD + r * cell_h
        img = new_frames[key]
        new_canvas.alpha_composite(img, (x, y))
        frames_json[key] = {
            "frame": {"x": x, "y": y, "w": FRAME_W, "h": OUT_H},
            "rotated": False,
            "trimmed": False,
            "spriteSourceSize": {"x": 0, "y": 0, "w": FRAME_W, "h": OUT_H},
            "sourceSize": {"w": FRAME_W, "h": OUT_H},
        }

    # 5) actualizar meta y guardar
    meta_json["meta"]["size"] = {"w": orig_w, "h": total_h}
    new_canvas.save(ATLAS_PNG, "WEBP", lossless=True)
    json.dump(meta_json, open(ATLAS_JSON, "w"))
    return len(keys), (orig_w, total_h)


def main():
    frames_only = "--frames-only" in sys.argv
    print("Construyendo frames de los 12 personajes...")
    frames = build_all_frames()
    total = sum(len(dirs[d]) for dirs in frames.values() for d in dirs)
    print(f"  {len(frames)} personajes, {total} frames PNG en {OUT_FRAMES}")
    if frames_only:
        print("--frames-only: atlas NO modificado.")
        return
    n, size = integrate_atlas(frames)
    print(f"Atlas integrado: +{n} claves nuevas. npcs.webp -> {size[0]}x{size[1]}")
    print("Claves de ejemplo: marcelino_down_0, alvaro_rival_down_0, ...")


if __name__ == "__main__":
    main()
