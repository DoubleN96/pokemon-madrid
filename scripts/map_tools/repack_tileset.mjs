#!/usr/bin/env node
// Reempaqueta el tileset RSE de gracidea (margin=2, spacing=2, 113 columnas, 6328 tiles)
// a una rejilla contigua 16×16 de 127 columnas, de modo que el frame index de Phaser
// (spritesheet frameWidth/Height 16, sin spacing) == GID del TMX − 1.
// Motivo: BootScene carga el tileset SIN margin/spacing; el PNG original los tiene.
// Uso: node repack_tileset.mjs [--dry]
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { decodePng, encodePng, makeBitmap, blit } from './png.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(ROOT, 'resources-inbox/gracidea/copyrighted/textures/rse/tileset.png');
const DST = join(ROOT, 'public/assets/tilesets/rse-tileset.png');

const SRC_COLS = 113, SRC_MARGIN = 2, SRC_SPACING = 2, TILE = 16, TILE_COUNT = 6328;
const DST_COLS = 127;
const DST_ROWS = Math.ceil(TILE_COUNT / DST_COLS);

function alphaStats(bmp) {
  // El .tsx declara trans="000000", pero el PNG ya trae canal alpha real
  // (cientos de miles de px transparentes), así que NO aplicamos keying:
  // los ~60 px de negro puro opaco son arte genuino.
  let transparent = 0;
  for (let i = 0; i < bmp.width * bmp.height; i++) {
    if (bmp.data[i * 4 + 3] < 255) transparent++;
  }
  return transparent;
}

const src = decodePng(readFileSync(SRC));
console.log(`origen: ${src.width}x${src.height}, px con alpha<255: ${alphaStats(src)}`);

const dst = makeBitmap(DST_COLS * TILE, DST_ROWS * TILE, [0, 0, 0, 0]);
for (let t = 0; t < TILE_COUNT; t++) {
  const sx = SRC_MARGIN + (t % SRC_COLS) * (TILE + SRC_SPACING);
  const sy = SRC_MARGIN + Math.floor(t / SRC_COLS) * (TILE + SRC_SPACING);
  blit(src, sx, sy, TILE, TILE, dst, (t % DST_COLS) * TILE, Math.floor(t / DST_COLS) * TILE);
}

if (process.argv.includes('--dry')) {
  console.log(`dry-run: destino sería ${dst.width}x${dst.height} (${DST_COLS} cols × ${DST_ROWS} filas)`);
} else {
  writeFileSync(DST, encodePng(dst.width, dst.height, dst.data));
  console.log(`escrito ${DST} (${dst.width}x${dst.height}, ${DST_COLS} cols × ${DST_ROWS} filas)`);
}
