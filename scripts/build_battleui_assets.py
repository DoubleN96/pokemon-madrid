#!/usr/bin/env python3
"""
build_battleui_assets.py — FASE 0 de la integración de la UI de combate FRLG.

Recolorea (aplicando las paletas .pal de pret) y recorta los tilesheets GBA de
`docs/refs/battleui-frlg/` para producir PNGs RGBA listos para usar en el juego
Phaser, bajo `public/assets/ui/battle/`.

NO toca código del juego (.js). Es un preproceso one-shot, idempotente: vuelve a
generar exactamente los mismos PNG en cada ejecución.

Hallazgos que motivan el enfoque (ver reporte del agente):
  * Los PNG de pret YA vienen indexados (modo 'P'); su paleta placeholder coincide
    casi con los .pal, pero `healthbox_elements.png` usa una paleta de 96 colores
    (6 bancos de 16) y al aplanarse a RGB algunas regiones quedan con colores de
    OTRO banco (de ahí que el plan dijera "se ven casi negros / mal").
  * Las barras de PS/EXP tienen un patrón de ÍNDICES limpio y uniforme; en vez de
    recortar regiones contaminadas, las RECONSTRUIMOS con ese patrón + healthbar.pal.
    Resultado pixel-perfect.
  * `healthbox_singles_player/opponent.png` son TILEMAPS GBA dispersos, no marcos
    contiguos. Sin el tilemap de ensamblado del motor no se recompone pixel-perfect.
    Reconstruimos un marco 3-slice (tapa izq real + cuerpo crema estirable + cierre)
    al ancho objetivo del plan. La "cola" decorativa del enemigo es aproximada.

Uso:
    python3 scripts/build_battleui_assets.py
Requiere: Pillow (verificado: 12.2.0 en el entorno).
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:  # pragma: no cover
    sys.exit("ERROR: Pillow no está instalado. Instala con: uv pip install pillow")

# --- Rutas -------------------------------------------------------------------
ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "docs" / "refs" / "battleui-frlg"
OUT = ROOT / "public" / "assets" / "ui" / "battle"

# --- Paletas -----------------------------------------------------------------

def parse_jasc_pal(path: Path) -> list[tuple[int, int, int]]:
    """Parsea un fichero JASC-PAL (texto) a lista de tuplas RGB.

    Cabecera:  'JASC-PAL', '0100', '<N>', luego N líneas 'R G B'.
    Si no es JASC-PAL (binario GBA BGR555 de 32 bytes), se decodifica como tal.
    """
    raw = path.read_bytes()
    if raw[:8] == b"JASC-PAL":
        lines = raw.decode("ascii", errors="replace").splitlines()
        count = int(lines[2].strip())
        colors: list[tuple[int, int, int]] = []
        for line in lines[3 : 3 + count]:
            r, g, b = (int(v) for v in line.split()[:3])
            colors.append((r, g, b))
        return colors
    # Fallback: binario GBA BGR555, 16 colores * 2 bytes (little-endian)
    colors = []
    for i in range(0, min(len(raw), 32), 2):
        val = raw[i] | (raw[i + 1] << 8)
        r = (val & 0x1F) << 3
        g = ((val >> 5) & 0x1F) << 3
        b = ((val >> 10) & 0x1F) << 3
        colors.append((r, g, b))
    return colors


# Paleta de la barra de PS/EXP (la fuente de verdad para barras y relleno).
HEALTHBAR_PAL = parse_jasc_pal(REFS / "healthbar.pal")
# Paleta del marco (cuerpo crema, bordes verde-oliva).
HEALTHBOX_PAL = parse_jasc_pal(REFS / "healthbox.pal")

# --- Utilidades de verificación ---------------------------------------------

def has_light_pixels(img: Image.Image, threshold: int = 180) -> bool:
    """True si la imagen tiene al menos un píxel claro (no casi-negro).

    Sirve para verificar que la paleta se aplicó (los sprites sin paleta salen
    casi negros, como advierte el plan).
    """
    rgba = img.convert("RGBA")
    px = rgba.load()
    for y in range(rgba.height):
        for x in range(rgba.width):
            r, g, b, a = px[x, y]
            if a > 0 and (r >= threshold or g >= threshold or b >= threshold):
                return True
    return False


def save(img: Image.Image, name: str) -> None:
    """Guarda un PNG RGBA y reporta sus dimensiones. Verifica que no es negro."""
    img = img.convert("RGBA")
    out = OUT / name
    img.save(out)
    light = "OK" if has_light_pixels(img) else "WARN(casi-negro)"
    print(f"  + {name:24s} {img.width:3d}x{img.height:2d}  [{light}]")


# --- Construcción de la barra de PS (pixel-perfect) --------------------------
#
# Estructura vertical de la barra FRLG (8 px de alto), índices de healthbar.pal:
#   y=0: transparente
#   y=1: idx 6  -> borde verde-gris superior
#   y=2: idx 2  -> highlight blanco superior
#   y=3: relleno-claro  (verde=11, amarillo=13, rojo=15)
#   y=4: relleno-oscuro (verde=10, amarillo=12, rojo=14)
#   y=5: relleno-oscuro
#   y=6: idx 2  -> línea blanca inferior
#   y=7: idx 6  -> borde verde-gris inferior
#
# El relleno son 3 filas de píxel (y=3..5). El juego hace setCrop horizontal para
# mostrar `ancho * ratio`. Generamos una tira sólida del ancho de la barra (48 px,
# coincide con barW del DataBox actual).

BAR_W = 48           # ancho del relleno de la barra de PS (= barW en databoxes.js)
BAR_H = 8            # alto total de la tira de barra
EXP_BAR_W = 64       # ancho de la barra de EXP (más larga; el juego la recorta)

# idx del relleno por color: (fila y=3 claro/superior, filas y=4-5 oscuro)
HP_FILL = {
    "green":  (11, 10),
    "yellow": (13, 12),
    "red":    (15, 14),
}


def build_hpbar(color: str) -> Image.Image:
    """Construye la tira de relleno de la barra de PS para un color dado.

    Devuelve un PNG RGBA de BAR_W x BAR_H. El índice 0 (fondo) es transparente.
    """
    pal = HEALTHBAR_PAL
    top_light, fill_dark = HP_FILL[color]
    # mapa fila -> idx de healthbar.pal
    rows = {
        0: None,        # transparente
        1: 6,           # borde superior
        2: 2,           # highlight blanco
        3: top_light,   # relleno claro
        4: fill_dark,   # relleno oscuro
        5: fill_dark,   # relleno oscuro
        6: 2,           # línea blanca inferior
        7: 6,           # borde inferior
    }
    img = Image.new("RGBA", (BAR_W, BAR_H), (0, 0, 0, 0))
    px = img.load()
    for y, idx in rows.items():
        if idx is None:
            continue
        r, g, b = pal[idx]
        for x in range(BAR_W):
            px[x, y] = (r, g, b, 255)
    return img


def build_expbar() -> Image.Image:
    """Construye la barra de EXP (relleno azul cyan FRLG).

    Color real verificado en healthbox_elements.png: idx 27 -> (65,205,255).
    Estructura: borde verde-gris arriba/abajo (idx 6), highlight blanco (idx 2),
    2 px de relleno cyan.
    """
    cyan = (65, 205, 255)          # idx 27 en la sheet (banco EXP)
    border = HEALTHBAR_PAL[6]       # (82,106,90)
    white = HEALTHBAR_PAL[2]        # (255,255,255)
    rows = {
        0: None,
        1: border,
        2: white,
        3: cyan,
        4: cyan,
        5: border,
        6: None,
        7: None,
    }
    img = Image.new("RGBA", (EXP_BAR_W, BAR_H), (0, 0, 0, 0))
    px = img.load()
    for y, col in rows.items():
        if col is None:
            continue
        r, g, b = col
        for x in range(EXP_BAR_W):
            px[x, y] = (r, g, b, 255)
    return img


# --- Recorte de badges de estado ---------------------------------------------
#
# En healthbox_elements.png (320x24), la fila y=16..24 contiene los badges de
# estado, cada uno de 20 px de ancho con 4 px de separación (slot de 24 px):
#   FRZ x=0..20, BRN x=24..44, PSN x=48..68, PAR x=72..92, SLP x=96..116.
# Sus colores ya están bien en el RGB de la sheet (cada badge usa su paleta de
# estado). Recortamos directamente y hacemos transparente el fondo crema/negro.

BADGES = {
    "frz": 0,
    "brn": 24,
    "psn": 48,
    "par": 72,
    "slp": 96,
}
BADGE_W, BADGE_H = 20, 8
BADGE_Y = 16


def crop_badge(elements_rgb: Image.Image, x0: int) -> Image.Image:
    """Recorta un badge de estado y vuelve transparente el fondo (crema/negro)."""
    crop = elements_rgb.crop((x0, BADGE_Y, x0 + BADGE_W, BADGE_Y + BADGE_H))
    crop = crop.convert("RGBA")
    px = crop.load()
    for y in range(crop.height):
        for x in range(crop.width):
            r, g, b, _ = px[x, y]
            # fondo: crema claro o negro -> transparente
            is_cream = r > 235 and g > 235 and b > 200
            is_black = r < 35 and g < 35 and b < 35
            if is_cream or is_black:
                px[x, y] = (0, 0, 0, 0)
    return crop


def build_status_badges_atlas(elements_rgb: Image.Image) -> Image.Image:
    """Atlas horizontal con los 5 badges en orden frz,brn,psn,par,slp.

    Cada frame ocupa BADGE_W px (20). El juego puede usar `setFrame` con
    frameWidth=20, frameHeight=8 (5 frames contiguos).
    """
    atlas = Image.new("RGBA", (BADGE_W * len(BADGES), BADGE_H), (0, 0, 0, 0))
    for i, (name, x0) in enumerate(BADGES.items()):
        atlas.paste(crop_badge(elements_rgb, x0), (i * BADGE_W, 0))
    return atlas


# --- Reconstrucción de los marcos (3-slice) ----------------------------------
#
# Las sheets player/opponent son tilemaps. Extraemos la "tapa izquierda" real
# (esquina redondeada + borde + inicio del cuerpo crema) y una columna de cuerpo
# crema repetible, y montamos un marco al ancho objetivo. La tapa derecha se hace
# espejando la izquierda (cierre simétrico). Es fiel al estilo FRLG; la cola
# decorativa exacta del enemigo NO se reproduce (requiere el tilemap del motor).

# --- Marco del ENEMIGO ---
# De healthbox_singles_opponent.png, pieza izquierda:
#   x=0..3   curva/esquina superior-izquierda (tapa)
#   x>=4     columna de cuerpo repetible  (..BBoCCCCCCCCCCC en y=0..15)
# Altura útil del marco enemigo: y=0..16 (16 px). Sin EXP.
OPP_FRAME_H = 16
OPP_CAP_W = 8       # ancho de la tapa izquierda a copiar tal cual
OPP_BODY_COL_X = 20  # columna de cuerpo "limpia" a repetir
OPPONENT_TARGET_W = 104  # ancho objetivo del databox enemigo (plan: ~104x28; aquí marco 104x16)

# --- Marco del JUGADOR ---
# De healthbox_singles_player.png, pieza izquierda:
#   estructura análoga, pero más alto porque incluye la fila EXP debajo.
#   Tomamos el marco superior (databox) y la barra EXP como dos bandas.
PLR_FRAME_H = 16
PLR_CAP_W = 8
PLR_BODY_COL_X = 20
PLAYER_TARGET_W = 104


def transparent_bg(img: Image.Image) -> Image.Image:
    """Convierte el fondo negro (idx 0) a transparente."""
    img = img.convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, _ = px[x, y]
            if r < 35 and g < 35 and b < 35:
                px[x, y] = (0, 0, 0, 0)
    return img


def build_frame(src_name: str, cap_w: int, body_col_x: int,
                frame_h: int, target_w: int) -> Image.Image:
    """Reconstruye un marco 3-slice: tapa-izq + cuerpo estirado + tapa-der espejada.

    src_name: PNG de la sheet (player/opponent).
    cap_w: ancho de la tapa izquierda a copiar literal de la esquina (0..cap_w).
    body_col_x: x de una columna de cuerpo crema "limpia" a repetir.
    frame_h: alto del marco a extraer (desde y=0).
    target_w: ancho final del marco recompuesto.
    """
    src = Image.open(REFS / src_name).convert("RGBA")

    left_cap = src.crop((0, 0, cap_w, frame_h))
    body_col = src.crop((body_col_x, 0, body_col_x + 1, frame_h))  # 1 px ancho
    # tapa derecha = espejo horizontal de la tapa izquierda (cierre simétrico)
    right_cap = left_cap.transpose(Image.FLIP_LEFT_RIGHT)

    body_w = target_w - cap_w - right_cap.width
    if body_w < 1:
        body_w = 1

    frame = Image.new("RGBA", (target_w, frame_h), (0, 0, 0, 0))
    frame.paste(left_cap, (0, 0))
    for i in range(body_w):
        frame.paste(body_col, (cap_w + i, 0))
    frame.paste(right_cap, (cap_w + body_w, 0))

    return transparent_bg(frame)


def build_player_frame() -> Image.Image:
    """Marco del jugador: databox (16px) + banda EXP (8px) debajo = ~104x24.

    El plan pide incluir la zona EXP. Montamos el databox arriba y debajo una
    banda con la barra de puntos EXP recortada de la propia sheet del jugador.
    """
    # Databox superior reconstruido (3-slice).
    top = build_frame("healthbox_singles_player.png", PLR_CAP_W,
                      PLR_BODY_COL_X, PLR_FRAME_H, PLAYER_TARGET_W)

    # Banda EXP: en la sheet del jugador, la fila EXP (con "EXP" + barra de puntos)
    # está debajo del databox. Visualmente en y~16..24, x~8..96. La recortamos y la
    # estiramos al ancho objetivo conservando la etiqueta "EXP" a la izquierda.
    src = Image.open(REFS / "healthbox_singles_player.png").convert("RGBA")
    exp_band_src = src.crop((8, 16, 96, 24))  # 88x8 con "EXP" + puntos
    exp_band = transparent_bg(exp_band_src)
    # Estirar (NEAREST, sin antialias) a target_w manteniendo etiqueta legible:
    # En vez de estirar (deformaría el texto), pegamos a la izquierda y rellenamos
    # con la columna de puntos repetida hacia la derecha.
    band = Image.new("RGBA", (PLAYER_TARGET_W, 8), (0, 0, 0, 0))
    band.paste(exp_band, (0, 0))
    # columna de "puntos EXP" repetible: tomar una columna del tramo de puntos
    dot_col = exp_band.crop((exp_band.width - 1, 0, exp_band.width, 8))
    for x in range(exp_band.width, PLAYER_TARGET_W):
        band.paste(dot_col, (x, 0))

    # Componer databox + banda EXP
    out = Image.new("RGBA", (PLAYER_TARGET_W, PLR_FRAME_H + 8), (0, 0, 0, 0))
    out.paste(top, (0, 0))
    out.paste(band, (0, PLR_FRAME_H))
    return out


# --- Main --------------------------------------------------------------------

def main() -> int:
    if not REFS.is_dir():
        sys.exit(f"ERROR: no existe {REFS}")
    OUT.mkdir(parents=True, exist_ok=True)

    print(f"Paletas: healthbar.pal={len(HEALTHBAR_PAL)} colores, "
          f"healthbox.pal={len(HEALTHBOX_PAL)} colores")
    print(f"Salida: {OUT}\n")

    # 1) Barras de PS (verde/amarillo/rojo) — reconstruidas pixel-perfect
    print("Barras de PS (reconstruidas con healthbar.pal):")
    for color in ("green", "yellow", "red"):
        save(build_hpbar(color), f"hpbar_{color}.png")

    # 2) Barra EXP
    print("Barra EXP:")
    save(build_expbar(), "expbar.png")

    # 3) Badges de estado (atlas + sueltos)
    print("Badges de estado (recortados de healthbox_elements.png):")
    elements_rgb = Image.open(REFS / "healthbox_elements.png").convert("RGB")
    save(build_status_badges_atlas(elements_rgb), "status_badges.png")
    for name, x0 in BADGES.items():
        save(crop_badge(elements_rgb, x0), f"status_{name}.png")

    # 4) Marcos (3-slice reconstruido)
    print("Marcos (reconstruidos 3-slice; ver notas en el reporte):")
    save(build_frame("healthbox_singles_opponent.png", OPP_CAP_W,
                     OPP_BODY_COL_X, OPP_FRAME_H, OPPONENT_TARGET_W),
         "healthbox_opponent.png")
    save(build_player_frame(), "healthbox_player.png")

    print("\nHecho.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
