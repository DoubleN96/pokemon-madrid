#!/usr/bin/env python3
"""
Integra los 12 frames `marcelino_bike_*` (generados en /tmp/bike_frames/) en el
atlas chars (npcs.webp + npcs.json) SIN tocar ningún frame existente:
  - Extiende el canvas del atlas hacia abajo una banda nueva de 24px.
  - Pega cada frame 16x24 en una fila nueva limpia.
  - Añade las entradas correspondientes al JSON (formato TexturePacker hash dict).
Idempotente: si las claves ya existen, las regenera en la misma posición.
"""
import json
from PIL import Image

ROOT = '/home/n8nstratoma/pokemon-madrid'
ATLAS_PNG = f'{ROOT}/public/assets/sprites/chars/npcs.webp'
ATLAS_JSON = f'{ROOT}/public/assets/sprites/chars/npcs.json'
FRAMES_DIR = '/tmp/bike_frames'

CELL_W, CELL_H = 16, 24
PAD = 1  # 1px de separación con la banda superior

DIRECTIONS = ['down', 'up', 'left', 'right']
FRAME_NAMES = [f'marcelino_bike_{d}_{i}' for d in DIRECTIONS for i in range(3)]


def make_entry(x, y):
    return {
        'frame': {'x': x, 'y': y, 'w': CELL_W, 'h': CELL_H},
        'rotated': False,
        'trimmed': False,
        'spriteSourceSize': {'x': 0, 'y': 0, 'w': CELL_W, 'h': CELL_H},
        'sourceSize': {'w': CELL_W, 'h': CELL_H},
    }


def main():
    d = json.load(open(ATLAS_JSON))
    atlas = Image.open(ATLAS_PNG).convert('RGBA')
    W, H = atlas.size

    # ¿Ya integrado antes? Si todas las claves existen, reusar su Y (regenerar pixels).
    existing = [n for n in FRAME_NAMES if n in d['frames']]
    if len(existing) == len(FRAME_NAMES):
        new_y = d['frames'][FRAME_NAMES[0]]['frame']['y']
        new_W, new_H = W, H
        canvas = atlas  # ya hay sitio
        print(f'Re-empaquetando sobre banda existente en y={new_y}')
    else:
        new_y = H + PAD
        new_W = W
        new_H = new_y + CELL_H
        canvas = Image.new('RGBA', (new_W, new_H), (0, 0, 0, 0))
        canvas.alpha_composite(atlas, (0, 0))
        print(f'Extendiendo atlas {W}x{H} -> {new_W}x{new_H}; nueva banda y={new_y}')

    # Pegar cada frame y registrar entrada
    x = 1
    for name in FRAME_NAMES:
        fr = Image.open(f'{FRAMES_DIR}/{name}.png').convert('RGBA')
        assert fr.size == (CELL_W, CELL_H), f'{name} tiene tamaño {fr.size}'
        # limpiar la celda destino antes de pegar (por idempotencia)
        clear = Image.new('RGBA', (CELL_W, CELL_H), (0, 0, 0, 0))
        canvas.paste(clear, (x, new_y))
        canvas.alpha_composite(fr, (x, new_y))
        d['frames'][name] = make_entry(x, new_y)
        x += CELL_W + PAD

    # Actualizar meta size
    d['meta']['size'] = {'w': new_W, 'h': new_H}

    # Guardar (WebP lossless para no degradar pixel-art)
    canvas.save(ATLAS_PNG, 'WEBP', lossless=True, quality=100, method=6)
    json.dump(d, open(ATLAS_JSON, 'w'))
    print(f'Atlas guardado: {new_W}x{new_H}, +{len(FRAME_NAMES)} frames marcelino_bike_*')


if __name__ == '__main__':
    main()
