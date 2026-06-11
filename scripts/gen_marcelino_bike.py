#!/usr/bin/env python3
"""
Genera el sprite overworld de Marcelino MONTADO EN BICI/MOTO (4 direcciones,
3 frames cada una) reutilizando el TORSO REAL de Marcelino del atlas `chars`
(npcs.webp/json) y añadiendo una BICICLETA ORIGINAL dibujada en pixel-art con
SU MISMA PALETA. No copia ningún asset de terceros: la bici es arte propio
generado pixel a pixel y el rider es el sprite real de Marcelino.

Formato de salida idéntico al resto del atlas: celdas 16x24, untrimmed, fondo
transparente. Escribe los frames a un PNG suelto en /tmp para inspección y
deja que pack_marcelino_bike.py los integre en npcs.webp/json.
"""
import json
from PIL import Image

ROOT = '/home/n8nstratoma/pokemon-madrid'
ATLAS_PNG = f'{ROOT}/public/assets/sprites/chars/npcs.webp'
ATLAS_JSON = f'{ROOT}/public/assets/sprites/chars/npcs.json'

CELL_W, CELL_H = 16, 24

# Paleta de Marcelino (extraída del atlas real)
SKIN_D = (86, 50, 32, 255)
SKIN_M = (126, 78, 52, 255)
SKIN_L = (158, 102, 70, 255)
SKIN_XL = (188, 128, 92, 255)
BLUE_D = (56, 70, 110, 255)
BLUE_L = (82, 98, 142, 255)
GREY = (110, 110, 118, 255)
BLACK = (0, 0, 0, 255)
DARK1 = (18, 16, 20, 255)
DARK2 = (28, 26, 30, 255)
DARK3 = (54, 50, 56, 255)
CLEAR = (0, 0, 0, 0)

# Colores de la bici (originales, encajan con la paleta)
TIRE = DARK1            # neumático oscuro
RIM = GREY             # llanta gris metálica
FRAME_D = BLACK        # cuadro oscuro
FRAME_L = DARK3        # detalle del cuadro
PEDAL = (200, 50, 50, 255)  # detalle rojo (accent Marcelino) en pedales/manillar


def load_atlas():
    d = json.load(open(ATLAS_JSON))
    atlas = Image.open(ATLAS_PNG).convert('RGBA')
    return d, atlas


def crop_frame(d, atlas, name):
    f = d['frames'][name]['frame']
    return atlas.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))


def put(img, x, y, color):
    if 0 <= x < CELL_W and 0 <= y < CELL_H:
        img.putpixel((x, y), color)


def clear_below(img, y0):
    """Borra (transparenta) todo a partir de la fila y0 incluida."""
    for y in range(y0, CELL_H):
        for x in range(CELL_W):
            img.putpixel((x, y), CLEAR)


def hline(img, x0, x1, y, color):
    for x in range(x0, x1 + 1):
        put(img, x, y, color)


def vline(img, x, y0, y1, color):
    for y in range(y0, y1 + 1):
        put(img, x, y, color)


# ---------------------------------------------------------------------------
# BICI VISTA FRONTAL/TRASERA (down / up): el rider va SENTADO; debajo se ve una
# rueda grande de frente, manillar que sostienen las manos, y los muslos/rodillas
# abiertos a los lados con pedaleo. Diseño legible y conectado al torso.
#   body_offset = filas que se ha subido el torso (para que "monte" la bici)
# ---------------------------------------------------------------------------
def draw_bike_front(img, pedal_phase, body_bottom, facing_up=False):
    cx = 7  # eje central (sprite ligeramente desplazado a izq por simetría 16px)
    # --- Muslos/rodillas del rider abiertos sobre el sillín (justo bajo torso) ---
    thigh_y = body_bottom  # primera fila libre tras el torso
    # piernas azules a ambos lados del cuadro
    put(img, cx - 3, thigh_y, BLUE_D); put(img, cx - 2, thigh_y, BLUE_L)
    put(img, cx + 2, thigh_y, BLUE_L); put(img, cx + 3, thigh_y, BLUE_D)
    put(img, cx - 3, thigh_y + 1, BLUE_D)
    put(img, cx + 3, thigh_y + 1, BLUE_D)
    # --- Cuadro / tija central uniendo rider y rueda ---
    vline(img, cx, thigh_y, thigh_y + 2, FRAME_D)
    vline(img, cx + 1, thigh_y, thigh_y + 2, FRAME_L)
    # --- Manillar: barra horizontal que cruzan las manos ---
    bar_y = thigh_y - 1
    hline(img, cx - 4, cx + 5, bar_y, FRAME_D)
    put(img, cx - 4, bar_y, PEDAL); put(img, cx + 5, bar_y, PEDAL)  # puños rojos
    # --- Rueda grande de frente: óvalo de 4px ancho, 4px alto ---
    wy = thigh_y + 2
    # llanta superior
    hline(img, cx - 1, cx + 2, wy, RIM)
    # neumático lados
    put(img, cx - 2, wy + 1, TIRE); put(img, cx + 3, wy + 1, TIRE)
    put(img, cx - 2, wy + 2, TIRE); put(img, cx + 3, wy + 2, TIRE)
    # buje / radios
    put(img, cx, wy + 1, GREY); put(img, cx + 1, wy + 1, GREY)
    put(img, cx - 1, wy + 1, DARK1); put(img, cx + 2, wy + 1, DARK1)
    # contacto suelo
    hline(img, cx - 1, cx + 2, wy + 3, TIRE)
    # --- Pies en pedales, con animación de pedaleo ---
    if pedal_phase == 1:
        lf, rf = 0, 1   # izq arriba, der abajo
    elif pedal_phase == 2:
        lf, rf = 1, 0
    else:
        lf, rf = 0, 0
    put(img, cx - 3, wy + 1 + lf, BLACK)
    put(img, cx + 4, wy + 1 + rf, BLACK)


# ---------------------------------------------------------------------------
# BICI VISTA DE PERFIL (left / right): dos ruedas redondas en línea + cuadro
# triangular + manillar delantero. Pierna pedaleando en el centro.
# Diseñada mirando a la IZQUIERDA; 'right' se espeja.
# ---------------------------------------------------------------------------
def draw_wheel_side(img, cxw, wy):
    # rueda redonda de 5px (anillo de neumático + buje gris central), legible
    #   wy es la fila de contacto con el suelo (parte de abajo)
    #      .##.       wy-3   (top)
    #     #....#  ->  fila media con buje
    #      .##.       wy     (bottom / suelo)
    hline(img, cxw - 1, cxw, wy - 3, TIRE)               # arco superior
    put(img, cxw - 2, wy - 2, TIRE); put(img, cxw + 1, wy - 2, TIRE)
    put(img, cxw - 2, wy - 1, TIRE); put(img, cxw + 1, wy - 1, TIRE)
    hline(img, cxw - 1, cxw, wy, TIRE)                   # arco inferior (suelo)
    put(img, cxw - 1, wy - 2, GREY); put(img, cxw, wy - 1, GREY)  # buje
    put(img, cxw, wy - 2, DARK1); put(img, cxw - 1, wy - 1, DARK1)


def draw_bike_side(img, pedal_phase, body_bottom):
    # Ruedas bien separadas; perfil claro mirando a la IZQUIERDA.
    rear_x, front_x = 3, 13
    wy = 22  # suelo
    draw_wheel_side(img, rear_x, wy)
    draw_wheel_side(img, front_x, wy)
    # Cuadro: tubo que une los dos bujes (a la altura del centro de rueda)
    hub_y = wy - 2
    hline(img, rear_x + 1, front_x - 1, hub_y, FRAME_D)
    # Tija del sillín subiendo hacia el rider (centro)
    vline(img, 8, body_bottom, hub_y, FRAME_D)
    put(img, 7, body_bottom, FRAME_L)                    # sillín
    put(img, 8, body_bottom, FRAME_L)
    # Horquilla delantera (del buje delantero hacia el manillar)
    vline(img, front_x - 1, body_bottom, hub_y, FRAME_D)
    # Manillar delantero (mira izq -> puño rojo al frente-izquierda)
    put(img, front_x - 2, body_bottom, PEDAL)
    # Pierna/pie pedaleando sobre el plato (entre los ejes)
    if pedal_phase == 1:
        py = body_bottom + 1
    elif pedal_phase == 2:
        py = hub_y
    else:
        py = body_bottom + 2
    put(img, 8, py, BLUE_D)
    put(img, 7, py + 1, BLACK)


def body_bottom_row(img):
    """Última fila no transparente del torso recortado."""
    for y in range(CELL_H - 1, -1, -1):
        for x in range(CELL_W):
            if img.getpixel((x, y))[3] > 0:
                return y + 1
    return 18


def build_direction(d, atlas, direction):
    """Devuelve lista de 3 frames (Image 16x24) para una dirección."""
    base = crop_frame(d, atlas, f'marcelino_{direction}_0')
    out = []
    for phase in range(3):
        img = base.copy()
        # Recorta las piernas reales de Marcelino: su torso termina ~row 18.
        # Mantenemos cabeza+torso, sustituimos piernas por bici. Subimos el torso
        # 1px para "sentarlo" sobre la bici sin que se salga de la celda.
        clear_below(img, 18)
        # Subir torso 1 fila (montado): desplazamos rows 4..17 a 3..16
        lifted = Image.new('RGBA', (CELL_W, CELL_H), CLEAR)
        lifted.alpha_composite(img, (0, -1))
        img = lifted
        bb = body_bottom_row(img)  # primera fila libre bajo el torso
        if direction in ('down', 'up'):
            draw_bike_front(img, phase, bb, facing_up=(direction == 'up'))
        elif direction == 'left':
            draw_bike_side(img, phase, bb)
        elif direction == 'right':
            tmp = Image.new('RGBA', (CELL_W, CELL_H), CLEAR)
            draw_bike_side(tmp, phase, bb)
            tmp = tmp.transpose(Image.FLIP_LEFT_RIGHT)
            img.alpha_composite(tmp)
        out.append(img)
    return out


def main():
    d, atlas = load_atlas()
    all_frames = {}  # name -> Image
    for direction in ['down', 'up', 'left', 'right']:
        frames = build_direction(d, atlas, direction)
        for i, fr in enumerate(frames):
            all_frames[f'marcelino_bike_{direction}_{i}'] = fr

    # Guarda un contact sheet 8x para inspección
    SC = 12
    cols = 3
    rows = 4
    cw, ch = CELL_W * SC, CELL_H * SC
    sheet = Image.new('RGBA', (cols * cw + 20, rows * ch + 20), (50, 50, 70, 255))
    order = []
    for ri, direction in enumerate(['down', 'up', 'left', 'right']):
        for ci in range(3):
            name = f'marcelino_bike_{direction}_{ci}'
            order.append(name)
            c = all_frames[name].resize((cw, ch), Image.NEAREST)
            sheet.paste(c, (ci * cw + 10, ri * ch + 10), c)
    sheet.save('/tmp/marcelino_bike_preview.png')
    print('saved /tmp/marcelino_bike_preview.png', sheet.size)

    # Persistimos cada frame como PNG 16x24 individual para el packer
    import os
    os.makedirs('/tmp/bike_frames', exist_ok=True)
    for name, fr in all_frames.items():
        fr.save(f'/tmp/bike_frames/{name}.png')
    print('wrote', len(all_frames), 'frames to /tmp/bike_frames/')


if __name__ == '__main__':
    main()
