#!/usr/bin/env python3
"""
build_altomando_sprites.py  —  sprites overworld del ALTO MANDO real (ADITIVO).

Genera el sprite propio de los TRES nuevos miembros del Alto Mando de la Liga
(reemplazan a los genéricos "Rosa la Auditora" y "D. Ramón el Portero"):

  - ramiro          : jugador de póker turbio, alto, pelo castaño peinado hacia
                      atrás, OJOS AZULES, gafas de sol oscuras, chaqueta de gala
                      oscura. Base: base_rich_boy (ya viste elegante).
  - tatian          : camionero rumano, MOLE 110kg+, barba frondosa oscura,
                      estética motera (chaleco de cuero negro). Base:
                      base_fat_man__alex (el cuerpo más ancho del set) + barba.
  - rafael_robledo  : estafador financiero, bajito, MENTÓN muy prominente, traje
                      barato beige/marrón con corbata dorada (avaricia/oro).
                      Base: base_clerk_office (oficinista de traje) + mentón.

Alex ya tiene sprite propio (`alex_digital`) → se REUTILIZA, no se genera aquí.

Además genera el sprite de un EXTRA (NO Alto Mando):
  - pablo_gallo     : cameo SIMPÁTICO y NEUTRO de un entrenador majo de Madrid
                      (argentino, gym, anime, tatuajes). Material sensible del
                      roadmap EXCLUIDO por completo (repo público). Base:
                      base_boy_young + camiseta negra anime + tatuajes de brazo.

Reutiliza el pipeline de corte de frames de build_char_sprites.py (mismo grid,
mismo OUT_H=24, mismo orden pret -> [quieto, walkA, walkB] por dirección) y el
mismo patrón de INTEGRACIÓN ADITIVA en el atlas que build_annjou_sprite.py:
añade bandas nuevas al final del canvas (npcs.webp/json) y registra solo las
claves `ramiro_*`, `tatian_*`, `rafael_robledo_*`. NO toca ninguna de las claves
existentes. Idempotente: si las claves ya existen, regenera sobre su misma banda.

Uso:
  python3 scripts/build_altomando_sprites.py               # build + integra atlas
  python3 scripts/build_altomando_sprites.py --frames-only # solo PNGs en char_frames/
"""
import json
import os
import sys
from PIL import Image

# Reutilizamos helpers y constantes del builder principal.
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

def char_ramiro():
    """Ramiro — póker turbio: pelo castaño peinado atrás, gafas de sol, chaqueta
    oscura de gala. Base: rich_boy (top granate `74,49,49`+`172,65,57`, pantalón
    azul-morado, gorra amarilla). Reskin:
      - gorra amarilla -> pelo castaño peinado (no es gorra: la usamos de pelo).
      - top granate -> chaqueta antracita/azul-pizarra (look de jugador).
      - pantalón morado -> pantalón de vestir oscuro.
      - gafas de SOL negras opacas sobre los ojos (las frontales).
    """
    b = base.load_base("base_rich_boy.png")
    s = base.recolor(b, {
        # "gorra" amarilla del rich_boy -> pelo castaño peinado hacia atrás
        (255, 222, 74, 255): (138, 96, 56, 255),    # pelo claro (brillo peinado)
        (213, 172, 32, 255): (104, 70, 40, 255),    # pelo medio
        (131, 98, 0, 255): (66, 42, 24, 255),       # pelo oscuro / raíz
        # top granate -> chaqueta antracita (azul-pizarra muy oscuro)
        (74, 49, 49, 255): (46, 50, 60, 255),       # cuerpo chaqueta
        (172, 65, 57, 255): (64, 70, 84, 255),      # luz chaqueta
        (238, 115, 65, 255): (78, 86, 102, 255),    # detalle claro -> gris azulado
        # pantalón azul-morado -> pantalón de vestir gris oscuro
        (106, 82, 189, 255): (58, 60, 72, 255),
        (65, 57, 98, 255): (40, 42, 52, 255),
        (164, 139, 238, 255): (84, 88, 104, 255),
    })
    # gafas de SOL oscuras opacas (no transparentes): lentes anchas sobre los ojos.
    s = _sunglasses(s)
    return s


def char_tatian():
    """Tatián — la MOLE motera: barba frondosa oscura, chaleco de cuero negro.
    Base: fat_man (cuerpo ancho, camiseta blanca `255,255,255`/`197,197,213`,
    pantalón oscuro, pelo olivo). Reskin:
      - pelo olivo -> negro/castaño muy oscuro (greña).
      - camiseta blanca -> camiseta gris oscuro bajo chaleco.
      - se injerta CHALECO de cuero negro (banda oscura en el torso) + BARBA.
    """
    b = base.load_base("base_fat_man__alex.png")
    s = base.recolor(b, {
        # pelo olivo -> greña oscura
        (205, 172, 98, 255): (56, 50, 46, 255),
        (123, 115, 65, 255): (40, 36, 34, 255),
        (57, 57, 24, 255): (24, 22, 20, 255),
        # camiseta blanca -> gris oscuro (se ve bajo el chaleco)
        (255, 255, 255, 255): (70, 70, 76, 255),
        (197, 197, 213, 255): (52, 52, 58, 255),
        (139, 139, 148, 255): (40, 40, 46, 255),
        # pantalón -> vaquero oscuro motero
        (148, 57, 41, 255): (46, 52, 70, 255),
        (230, 106, 74, 255): (60, 68, 92, 255),
        (82, 16, 0, 255): (30, 34, 48, 255),
    })
    s = _leather_vest(s)
    s = _beard(s, color=(30, 27, 24, 255), shade=(20, 18, 16, 255))
    return s


def char_pablo_gallo():
    """Pablo Gallo — cameo SIMPÁTICO y NEUTRO (NPC entrenador majo de Madrid).
    Rasgos LIMPIOS del roadmap: argentino, ingeniero de software, gym, anime,
    tatuajes. NADA del material sensible/difamatorio (excluido por completo).
    Look: tío fitness de buen rollo con camiseta oscura de anime y tatuajes en
    los brazos. Base: base_boy_young (complexión joven, camiseta verde
    `57,139,0`/`131,205,49`/`32,65,16`, pelo rubio). Reskin:
      - camiseta verde -> camiseta negra (rollo anime/gamer).
      - pelo rubio -> castaño oscuro.
      - tatuajes: marcas oscuras en los antebrazos (poses frontales).
    """
    b = base.load_base("base_boy_young.png")
    s = base.recolor(b, {
        # camiseta verde -> negra de anime
        (57, 139, 0, 255): (44, 44, 52, 255),       # cuerpo camiseta
        (131, 205, 49, 255): (70, 70, 80, 255),     # luz camiseta
        (32, 65, 16, 255): (28, 28, 34, 255),       # sombra camiseta
        # pelo rubio -> castaño oscuro
        (222, 189, 65, 255): (118, 84, 52, 255),    # pelo claro
        (164, 131, 32, 255): (84, 58, 36, 255),     # pelo medio
        (82, 82, 32, 255): (52, 36, 24, 255),       # pelo oscuro
    })
    s = _arm_tattoos(s)
    return s


def char_rafael_robledo():
    """Rafael Robledo — estafador de traje barato: MENTÓN prominente, corbata
    dorada (avaricia/oro). Base: clerk_office (oficinista de traje, top olivo
    `123,115,65`/`205,172,98`/`57,57,24`, pelo oscuro `74,74,90`). Reskin:
      - traje olivo -> traje beige/marrón "barato".
      - se injerta una CORBATA dorada en el pecho frontal.
      - se alarga el MENTÓN (1px de piel bajo la barbilla en poses frontales).
    """
    b = base.load_base("base_clerk_office.png")
    s = base.recolor(b, {
        # traje olivo del clerk -> beige/marrón claro (traje barato)
        (205, 172, 98, 255): (188, 166, 130, 255),  # luz traje
        (123, 115, 65, 255): (150, 128, 96, 255),   # cuerpo traje
        (57, 57, 24, 255): (104, 86, 62, 255),      # sombra traje
        # detalles rojizos del clerk -> tonos marrones del traje
        (148, 57, 41, 255): (120, 98, 70, 255),
        (230, 106, 74, 255): (170, 146, 112, 255),
        (82, 16, 0, 255): (88, 72, 52, 255),
    })
    s = _gold_tie(s)
    s = _big_chin(s)
    return s


# ===========================================================================
#  HELPERS DE EDICIÓN DE CABEZA / TORSO
# ===========================================================================

def _eye_row(px, ox, w, lo=9, hi=14):
    """Localiza la fila de OJOS: la fila con más piel base en la mitad alta de la
    cara. Devuelve la coordenada y absoluta."""
    skin = {base.SKIN_LIGHT[:3], base.SKIN_MID[:3], base.SKIN_BASE[:3]}
    best_y, best_n = (lo + hi) // 2, -1
    for y in range(lo, hi):
        n = sum(1 for x in range(ox + 4, ox + 12)
                if px[x, y][3] > 0 and px[x, y][:3] in skin)
        if n > best_n:
            best_n, best_y = n, y
    return best_y


def _sunglasses(strip):
    """Gafas de SOL negras OPACAS (anchas) sobre los ojos en poses frontales
    (pret 0,3,6 = down). Dibuja una banda oscura continua lente-puente-lente,
    SOLO sobre piel para no comerse el contorno ni el pelo."""
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
        # banda continua de gafas de sol: x 4..11 sobre la fila de ojos
        for dx in range(4, 12):
            xx = ox + dx
            if 0 <= xx < w and px[xx, gy][3] > 0 and px[xx, gy][:3] in skin:
                px[xx, gy] = SHADE
    return out


def _leather_vest(strip):
    """Pinta un CHALECO de cuero negro: oscurece los flancos del torso (hombros y
    pecho) dejando una franja central más clara (camiseta gris asomando). Trabaja
    sobre los tonos de camiseta ya recoloreados a gris oscuro, en todos los frames.
    """
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    SHIRT = {(70, 70, 76, 255), (52, 52, 58, 255), (40, 40, 46, 255)}
    LEATHER = (22, 22, 26, 255)
    LEATHER_HI = (44, 44, 50, 255)
    for fi in range(nf):
        ox = fi * FRAME_W
        # zona de torso: y 16..23. Flancos (chaleco) = columnas externas del torso.
        for y in range(16, 24):
            cols = [x for x in range(ox, ox + FRAME_W) if px[x, y] in SHIRT]
            if not cols:
                continue
            lo, hi = min(cols), max(cols)
            mid = (lo + hi) // 2
            for x in cols:
                # franja central (camiseta) intacta; flancos -> cuero negro
                if x <= lo + 1 or x >= hi - 1:
                    px[x, y] = LEATHER
                elif x in (mid, mid - 1):
                    pass  # centro: camiseta visible
        # un highlight de cuero en la línea de hombros (primera fila de torso)
        for y in range(16, 19):
            for x in range(ox, ox + FRAME_W):
                if px[x, y] == LEATHER and px[x, max(0, y - 1)][3] == 0:
                    px[x, y] = LEATHER_HI
                    break
    return out


def _beard(strip, color, shade):
    """Barba frondosa: rellena la mitad INFERIOR de la cara (bajo la fila de ojos)
    con `color`, respetando el outline y sin tapar los ojos. Poses frontales y
    laterales. Sustituye piel de mejilla/mentón por barba."""
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    skin = {base.SKIN_LIGHT, base.SKIN_MID, base.SKIN_BASE}
    for fi in range(nf):
        ox = fi * FRAME_W
        gy = _eye_row(px, ox, w)
        # barba: 2-3 filas bajo los ojos, solo sobre piel (mejillas+mentón)
        for y in range(gy + 1, min(gy + 4, h)):
            for x in range(ox, ox + FRAME_W):
                if px[x, y] in skin:
                    # sombra en la fila más baja para dar volumen
                    px[x, y] = shade if y >= gy + 3 else color
    return out


def _arm_tattoos(strip):
    """Tatuajes de antebrazo: 1-2 px de tinta oscura sobre la piel de los brazos
    (flancos del torso, bajo la fila de ojos) en todas las poses. Lee como tinta
    sin tocar el contorno. Material 100% inofensivo (estético)."""
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    INK = (60, 70, 96, 255)   # tinta azul-verdosa apagada (tatuaje)
    skin = {base.SKIN_LIGHT, base.SKIN_MID, base.SKIN_BASE}
    for fi in range(nf):
        ox = fi * FRAME_W
        gy = _eye_row(px, ox, w)
        # brazos: piel en los flancos del torso (y gy+2 .. gy+5)
        for y in range(gy + 2, min(gy + 6, h)):
            arm_cols = [x for x in range(ox, ox + FRAME_W) if px[x, y] in skin]
            if not arm_cols:
                continue
            lo, hi = min(arm_cols), max(arm_cols)
            # marca un pixel de tinta en el borde externo de cada brazo
            for xx in (lo, hi):
                if px[xx, y] in skin:
                    px[xx, y] = INK
    return out


def _gold_tie(strip):
    """Corbata dorada: 1px de oro cayendo por el centro del pecho en poses
    frontales (pret 0,3,6). Lee como corbata fina sobre el traje beige."""
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    GOLD = (224, 184, 64, 255)
    GOLD_SH = (168, 132, 40, 255)
    SUIT = {(188, 166, 130, 255), (150, 128, 96, 255), (104, 86, 62, 255)}
    for fi in (0, 3, 6):
        if fi >= nf:
            continue
        ox = fi * FRAME_W
        cx = ox + FRAME_W // 2
        # buscar la primera fila de traje bajo la cabeza y caer 3-4px por el centro
        top = None
        for y in range(16, 22):
            if px[cx, y] in SUIT or px[cx - 1, y] in SUIT:
                top = y
                break
        if top is None:
            continue
        for dy in range(0, 4):
            y = top + dy
            if y >= h:
                break
            for xx in (cx - 1, cx):
                if px[xx, y] in SUIT:
                    px[xx, y] = GOLD if dy < 3 else GOLD_SH
    return out


def _big_chin(strip):
    """Mentón prominente: añade 1px de piel justo BAJO la barbilla en las poses
    frontales (down: pret 0,3,6), alargando la cara. Solo sobre transparente
    inmediatamente debajo de la última fila de piel de la cara."""
    out = strip.copy()
    px = out.load()
    w, h = out.size
    nf = w // FRAME_W
    skin = {base.SKIN_LIGHT, base.SKIN_MID, base.SKIN_BASE}
    CHIN = base.SKIN_BASE
    for fi in (0, 3, 6):
        if fi >= nf:
            continue
        ox = fi * FRAME_W
        # fila más baja de cara con piel (entre y=12..18)
        chin_y = None
        for y in range(18, 11, -1):
            row = [x for x in range(ox + 5, ox + 11) if px[x, y] in skin]
            if row:
                chin_y = y
                cols = row
                break
        if chin_y is None or chin_y + 1 >= h:
            continue
        # alargar 1px hacia abajo en el centro del mentón (2px de ancho)
        mid = (min(cols) + max(cols)) // 2
        for xx in (mid, mid + 1):
            if ox <= xx < ox + FRAME_W and px[xx, chin_y + 1][3] == 0:
                px[xx, chin_y + 1] = CHIN
    return out


# ===========================================================================
#  INTEGRACIÓN ADITIVA EN EL ATLAS (NO toca claves existentes)
# ===========================================================================
CELL_W, CELL_H = FRAME_W, OUT_H
PAD = 1

CHARS = [
    ("ramiro", char_ramiro),
    ("tatian", char_tatian),
    ("rafael_robledo", char_rafael_robledo),
    # Pablo Gallo: NPC entrenador majo (cameo neutro), no Alto Mando. Mismo atlas.
    ("pablo_gallo", char_pablo_gallo),
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
    """Genera {char_id: {dir: [Image,...]}} y guarda PNGs sueltos para QA."""
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
    """Añade los frames de los 3 personajes al atlas SIN tocar nada más.

    Cada personaje ocupa una BANDA propia al final del canvas (igual que
    build_annjou_sprite). Idempotente: si las claves de un personaje ya existen,
    se re-empaquetan sobre su misma banda.
    """
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
    print("Construyendo sprites del Alto Mando real (Ramiro / Tatián / Rafael Robledo)...")
    frames = build_frames()
    n = sum(len(frames[c][d]) for c in frames for d in frames[c])
    print(f"  {len(frames)} personajes, {n} frames PNG en {OUT_FRAMES}")
    if frames_only:
        print("--frames-only: atlas NO modificado.")
        return
    integrate_atlas(frames)


if __name__ == "__main__":
    main()
