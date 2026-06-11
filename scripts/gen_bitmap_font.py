#!/usr/bin/env python3
"""
Genera una FUENTE BITMAP nítida (atlas PNG + descriptor .fnt AngelCode/XML que
Phaser carga con this.load.bitmapFont) a partir de la fuente FRLG existente
(public/assets/fonts/PokemonFRLG.woff2).

CLAVE DE LA NITIDEZ: cada glifo se rasteriza en modo '1' (1 bit, SIN antialiasing)
a su tamaño NATIVO entero. Así cada píxel es 100% negro o 100% transparente, sin
grises intermedios. Phaser coloca cada glifo como un trozo de textura pixel-perfect
y, con pixelArt:true (NEAREST), al escalar canvas→pantalla los bordes quedan DUROS
sin halo borroso. Es la misma técnica que usan los juegos retro para texto crujiente.

Salida (en public/assets/fonts/):
  - frlg16.png  : atlas con todos los glifos
  - frlg16.fnt  : descriptor XML AngelCode con char/x/y/width/height/xoffset/...

Uso:
  python3 scripts/gen_bitmap_font.py [PX]   (PX = tamaño nativo, por defecto 16)
"""
import sys
import os
from PIL import Image, ImageFont, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONT_SRC = os.path.join(ROOT, 'public', 'assets', 'fonts', 'PokemonFRLG.woff2')
OUT_DIR = os.path.join(ROOT, 'public', 'assets', 'fonts')

PX = int(sys.argv[1]) if len(sys.argv) > 1 else 16
PAD = 1          # padding alrededor de cada glifo en el atlas (evita sangrado)
COLS = 16        # columnas del atlas (rejilla)

# Conjunto de caracteres: ASCII imprimible + acentos castellanos + símbolos
# Latin-1 útiles. Los símbolos que la fuente NO trae (▶ ▼ ↑ ↓ ★ ₧) se generan
# aparte como glifos dibujados a mano (ver SYNTHETIC) para que el juego no
# dependa de un fallback monospace borroso.
ASCII = ''.join(chr(c) for c in range(0x20, 0x7F))
# Latin-1 que SÍ trae la fuente FRLG (acentos castellanos + símbolos usados in-game:
# · × ° ± ª º « » £ ¥ © ®). El € lo trae vacío → se genera sintético más abajo.
LATIN = 'ÁÉÍÓÚÜÑáéíóúüñ¡¿ªº°·×±£¥©®«»'
CHARSET = ASCII + LATIN

# Glifos sintéticos (5x7 / 7x7 aprox) dibujados a mano en una rejilla, porque la
# fuente FRLG no los trae. Cada uno es una lista de filas (strings); '#'=píxel.
def synth_glyphs(px):
    # Escala base 7px; si PX != 16 se reescala con NEAREST manteniendo nitidez.
    G = {}
    # Triángulo derecha ▶ (cursor de menú)
    G['▶'] = [
        '#    ',
        '##   ',
        '###  ',
        '#### ',
        '###  ',
        '##   ',
        '#    ',
    ]
    # Triángulo abajo ▼ (cursor de avance de diálogo)
    G['▼'] = [
        '#######',
        ' ##### ',
        '  ###  ',
        '   #   ',
        '       ',
        '       ',
        '       ',
    ]
    # Triángulo arriba ▲ (scroll)
    G['▲'] = [
        '   #   ',
        '  ###  ',
        ' ##### ',
        '#######',
        '       ',
        '       ',
        '       ',
    ]
    # Flecha arriba ↑
    G['↑'] = [
        '  #  ',
        ' ### ',
        '#####',
        '  #  ',
        '  #  ',
        '  #  ',
        '  #  ',
    ]
    # Flecha abajo ↓
    G['↓'] = [
        '  #  ',
        '  #  ',
        '  #  ',
        '  #  ',
        '#####',
        ' ### ',
        '  #  ',
    ]
    # Estrella ★
    G['★'] = [
        '   #   ',
        '   #   ',
        ' ##### ',
        '  ###  ',
        ' ## ## ',
        '#     #',
        '       ',
    ]
    # Pesetas ₧ (Pt ligadura) — aprox 8 ancho
    G['₧'] = [
        '##  #   ',
        '# # #   ',
        '##  ### ',
        '#   # # ',
        '#   ### ',
        '#   #   ',
        '#   #   ',
    ]
    # Euro € (la fuente lo trae vacío). 6 ancho, estilo C con dos barras.
    G['€'] = [
        '  ###',
        ' #   ',
        '#### ',
        ' #   ',
        '#### ',
        ' #   ',
        '  ###',
    ]
    # Raya larga (em dash) — usada en muchos carteles del juego.
    G['—'] = [
        '       ',
        '       ',
        '       ',
        '#######',
        '       ',
        '       ',
        '       ',
    ]
    # Puntos suspensivos …
    G['…'] = [
        '         ',
        '         ',
        '         ',
        '         ',
        '         ',
        '         ',
        '# # # # #',
    ]
    # Flecha derecha → (hint de la tienda, etc.)
    G['→'] = [
        '       ',
        '   #   ',
        '    #  ',
        '#######',
        '    #  ',
        '   #   ',
        '       ',
    ]
    # Flecha izquierda ←
    G['←'] = [
        '       ',
        '   #   ',
        '  #    ',
        '#######',
        '  #    ',
        '   #   ',
        '       ',
    ]
    # Bolita ● (Pokédex: capturado)
    G['●'] = [
        '       ',
        ' ##### ',
        '#######',
        '#######',
        '#######',
        ' ##### ',
        '       ',
    ]
    return G


def main():
    if not os.path.exists(FONT_SRC):
        print('ERROR: no existe', FONT_SRC)
        sys.exit(1)
    font = ImageFont.truetype(FONT_SRC, PX, layout_engine=ImageFont.Layout.BASIC)
    # PIL.getmetrics() devuelve métricas raras para esta recreación FRLG (descent
    # negativo), así que NO las usamos para el layout. Calculamos base/lineHeight a
    # partir de los extents REALES de los glifos renderizados (más abajo) para que
    # el interlineado y la baseline sean correctos.
    pil_ascent, _pil_descent = font.getmetrics()

    # Cada glifo se mide RELATIVO A LA BASELINE: dy_top = filas por encima de la
    # baseline (negativo = arriba), para luego derivar yoffset una vez conocida la
    # baseline global (base = máximo ascendente sobre la baseline).
    raw = []  # (char, code, crop_L, w, h, xoffset, top_above_baseline, xadvance)
    big = PX * 3
    off = PX  # origen del text(): baseline queda en y = off + pil_ascent
    baseline_y = off + pil_ascent
    for ch in CHARSET:
        try:
            adv = int(round(font.getlength(ch)))
        except Exception:
            adv = PX // 2
        canvas = Image.new('1', (big, big), 0)
        ImageDraw.Draw(canvas).text((off, off), ch, font=font, fill=1)
        gb = canvas.getbbox()
        if gb is None:  # glifo vacío (espacio): solo avanza el cursor
            raw.append((ch, ord(ch), None, 0, 0, 0, 0, adv))
            continue
        gx0, gy0, gx1, gy1 = gb
        gw, gh = gx1 - gx0, gy1 - gy0
        crop = canvas.crop((gx0, gy0, gx1, gy1)).convert('L').point(lambda v: 255 if v else 0)
        xoffset = gx0 - off
        top_above = gy0 - baseline_y  # distancia (con signo) del top del glifo a la baseline
        raw.append((ch, ord(ch), crop, gw, gh, xoffset, top_above, adv))

    # Glifos sintéticos (cursores/flechas/estrella/pesetas) — la fuente no los trae.
    synth = synth_glyphs(PX)
    scale = max(1, round(PX / 16))
    x_height = pil_ascent  # aprox; sirve de referencia para centrar los cursores
    for ch, rows in synth.items():
        h0 = len(rows)
        w0 = max(len(r) for r in rows)
        gimg = Image.new('L', (w0, h0), 0)
        for yy, row in enumerate(rows):
            for xx, c in enumerate(row):
                if c == '#':
                    gimg.putpixel((xx, yy), 255)
        if scale > 1:
            gimg = gimg.resize((w0 * scale, h0 * scale), Image.NEAREST)
        gw, gh = gimg.size
        # centra el glifo sobre la mitad de la x-height: top_above negativo.
        top_above = -(gh - (gh - x_height) // 2) if gh > x_height else -gh
        top_above = -(gh // 2) - (x_height // 2)  # centra respecto a la x-height
        adv = gw + 2 * scale
        raw.append((ch, ord(ch), gimg, gw, gh, 0, top_above, adv))

    # Baseline global: el mayor ascendente (acentos en mayúsculas) define `base`.
    max_top_above = min((g[6] for g in raw if g[2] is not None), default=-PX)  # más negativo = más alto
    base = -max_top_above  # filas desde el top de línea hasta la baseline
    # Mayor descendente bajo la baseline.
    max_bottom = max(((g[6] + g[4]) for g in raw if g[2] is not None), default=PX)
    line_height = base + max_bottom + 1  # +1 px de aire entre renglones

    glyphs = []  # (char, code, img, w, h, xoffset, yoffset, xadvance)
    for (ch, code, gimg, gw, gh, xoff, top_above, adv) in raw:
        if gimg is None:
            glyphs.append((ch, code, None, 0, 0, 0, 0, adv))
            continue
        yoffset = base + top_above  # distancia desde el top de línea al top del glifo
        glyphs.append((ch, code, gimg, gw, gh, xoff, yoffset, adv))

    # ---- Empaquetar en un atlas en rejilla COLS columnas ----
    cell_w = max((g[3] for g in glyphs if g[2] is not None), default=PX) + PAD * 2
    cell_h = max((g[4] for g in glyphs if g[2] is not None), default=PX) + PAD * 2
    n = len(glyphs)
    rows_n = (n + COLS - 1) // COLS
    atlas_w = COLS * cell_w
    atlas_h = rows_n * cell_h
    atlas = Image.new('LA', (atlas_w, atlas_h), (0, 0))  # luminancia+alpha

    placements = []  # (char, code, x, y, w, h, xoffset, yoffset, xadvance)
    for i, (ch, code, gimg, gw, gh, xoff, yoff, adv) in enumerate(glyphs):
        col = i % COLS
        row = i // COLS
        cx = col * cell_w + PAD
        cy = row * cell_h + PAD
        if gimg is not None and gw > 0 and gh > 0:
            # blanco con alpha = el glifo (para poder tintarlo con setTint en Phaser)
            la = Image.new('LA', (gw, gh), (255, 0))
            alpha = gimg.convert('L')
            la.putalpha(alpha)
            white = Image.new('L', (gw, gh), 255)
            la = Image.merge('LA', (white, alpha))
            atlas.paste(la, (cx, cy))
            placements.append((ch, code, cx, cy, gw, gh, xoff, yoff, adv))
        else:
            placements.append((ch, code, cx, cy, 0, 0, 0, 0, adv))

    # Guardar PNG (RGBA para máxima compatibilidad con Phaser bitmapFont)
    rgba = Image.new('RGBA', atlas.size, (0, 0, 0, 0))
    lum, alpha = atlas.split()
    rgba = Image.merge('RGBA', (lum, lum, lum, alpha))
    png_path = os.path.join(OUT_DIR, f'frlg{PX}.png')
    rgba.save(png_path)

    # ---- Descriptor .fnt XML AngelCode (Phaser BitmapText) ----
    lines = []
    lines.append('<?xml version="1.0"?>')
    lines.append('<font>')
    lines.append(f'  <info face="PokemonFRLG" size="{PX}" bold="0" italic="0" '
                 f'charset="" unicode="1" stretchH="100" smooth="0" aa="1" '
                 f'padding="0,0,0,0" spacing="1,1" />')
    lines.append(f'  <common lineHeight="{line_height}" base="{base}" '
                 f'scaleW="{atlas_w}" scaleH="{atlas_h}" pages="1" packed="0" />')
    lines.append('  <pages>')
    lines.append(f'    <page id="0" file="frlg{PX}.png" />')
    lines.append('  </pages>')
    lines.append(f'  <chars count="{len(placements)}">')
    for (ch, code, x, y, w, h, xoff, yoff, adv) in placements:
        lines.append(f'    <char id="{code}" x="{x}" y="{y}" width="{w}" '
                     f'height="{h}" xoffset="{xoff}" yoffset="{yoff}" '
                     f'xadvance="{adv}" page="0" chnl="15" />')
    lines.append('  </chars>')
    lines.append('</font>')
    fnt_path = os.path.join(OUT_DIR, f'frlg{PX}.fnt')
    with open(fnt_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(lines))

    print(f'OK: {png_path} ({atlas_w}x{atlas_h}), {len(placements)} glifos')
    print(f'OK: {fnt_path} (lineHeight={line_height}, base={base})')


if __name__ == '__main__':
    main()
