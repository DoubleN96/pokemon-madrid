#!/usr/bin/env node
// Verificación visual: compone PNGs desde el tileset reempaquetado con Node puro.
//  node render_check.mjs palette          → muestrario etiquetado de la paleta
//  node render_check.mjs map <id>         → render completo de un mapa de MAPS
// Salida en scripts/map_tools/out/*.png
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { decodePng, encodePng, makeBitmap, alphaBlit } from './png.mjs';
import * as P from './palette.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const OUT = join(HERE, 'out');
const TILE = 16, COLS = 127;

const sheet = decodePng(readFileSync(join(ROOT, 'public/assets/tilesets/rse-tileset.png')));

function drawTile(dst, frame, dx, dy) {
  if (frame < 0) return;
  alphaBlit(sheet, (frame % COLS) * TILE, Math.floor(frame / COLS) * TILE, TILE, TILE, dst, dx, dy);
}

function scale2x(bmp) {
  const out = makeBitmap(bmp.width * 2, bmp.height * 2, [0, 0, 0, 0]);
  for (let y = 0; y < bmp.height; y++) for (let x = 0; x < bmp.width; x++) {
    const o = (y * bmp.width + x) * 4;
    for (const [ax, ay] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
      bmp.data.copy(out.data, ((y * 2 + ay) * out.width + x * 2 + ax) * 4, o, o + 4);
    }
  }
  return out;
}

function renderPalette() {
  // Cada entrada en una celda de 8×6 tiles sobre fondo hierba, en orden documentado.
  const entries = [
    ['GRASS', [[P.GRASS]]],
    ['TALL_GRASS', [[P.TALL_GRASS]]],
    ['SIGN', [[P.SIGN]]],
    ['FLOWER', [[P.FLOWER]]],
    ['FLOWER_Y', [[P.FLOWER_Y]]],
    ['BUSH', [[P.BUSH]]],
    ['PATH 3x3', [
      [P.PATH.TL, P.PATH.T, P.PATH.TR],
      [P.PATH.L, P.PATH.C, P.PATH.R],
      [P.PATH.BL, P.PATH.B, P.PATH.BR]]],
    ['DIRT 3x3', [
      [P.DIRT.TL, P.DIRT.T, P.DIRT.TR],
      [P.DIRT.L, P.DIRT.C, P.DIRT.R],
      [P.DIRT.BL, P.DIRT.B, P.DIRT.BR]]],
    ['WATER 3x3', [
      [P.WATER_EDGE.TL, P.WATER_EDGE.T, P.WATER_EDGE.TR],
      [P.WATER_EDGE.L, P.WATER, P.WATER_EDGE.R],
      [P.WATER_EDGE.BL, P.WATER_EDGE.B, P.WATER_EDGE.BR]]],
    ['FENCE', [
      [P.FENCE.H_L, P.FENCE.H, P.FENCE.H_R, -1, P.FENCE.V],
      [-1, -1, -1, -1, P.FENCE.V_B]]],
    ['TREE', [P.TREE.TOP, P.TREE.MID, P.TREE.BOT]],
    ['TREE OVERLAP', [P.TREE.TOP, P.TREE.MID, P.TREE.OVERLAP, P.TREE.MID, P.TREE.BOT]],
    ...Object.entries(P.BUILDINGS).map(([name, b]) => [name, b.tiles]),
  ];
  const cellW = 8, cellH = 6, perRow = 4;
  const rows = Math.ceil(entries.length / perRow);
  const bmp = makeBitmap(perRow * cellW * TILE, rows * cellH * TILE, [24, 24, 32, 255]);
  entries.forEach(([name, tiles], i) => {
    const cx = (i % perRow) * cellW, cy = Math.floor(i / perRow) * cellH;
    for (let y = 0; y < cellH; y++) for (let x = 0; x < cellW; x++) {
      if (x === cellW - 1 || y === cellH - 1) continue; // separador oscuro
      drawTile(bmp, P.GRASS, (cx + x) * TILE, (cy + y) * TILE);
    }
    tiles.forEach((row, y) => row.forEach((f, x) => {
      if (f >= 0) drawTile(bmp, f, (cx + x) * TILE, (cy + y) * TILE);
    }));
    console.log(`celda ${i}: fila ${Math.floor(i / perRow)} col ${i % perRow} = ${name}`);
  });
  return scale2x(bmp);
}

async function renderMap(id) {
  const { MAPS } = await import(join(ROOT, 'src/world/maps.js'));
  const map = MAPS[id];
  if (!map) throw new Error(`mapa desconocido: ${id} (hay: ${Object.keys(MAPS).join(', ')})`);
  const bmp = makeBitmap(map.width * TILE, map.height * TILE, [0, 0, 0, 255]);
  for (const layer of ['ground', 'deco', 'overhead']) {
    const grid = map.layers[layer];
    for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
      drawTile(bmp, grid[y][x], x * TILE, y * TILE);
    }
  }
  // Marcadores: spawn (cruz amarilla), warps (magenta), NPCs (cian), hierba (puntito verde)
  const mark = (x, y, rgb) => {
    for (let i = 4; i < 12; i++) {
      const o1 = ((y * TILE + i) * bmp.width + x * TILE + 8) * 4;
      const o2 = ((y * TILE + 8) * bmp.width + x * TILE + i) * 4;
      for (const o of [o1, o2]) { bmp.data[o] = rgb[0]; bmp.data[o + 1] = rgb[1]; bmp.data[o + 2] = rgb[2]; bmp.data[o + 3] = 255; }
    }
  };
  mark(map.playerSpawn.x, map.playerSpawn.y, [255, 220, 0]);
  for (const w of map.warps) mark(w.x, w.y, [255, 0, 255]);
  for (const n of map.npcs) mark(n.x, n.y, [0, 220, 255]);
  return bmp;
}

function renderStrip(spec) {
  // spec: "ini-fin[,ini-fin...]" — cada rango en una fila, sobre hierba
  const ranges = spec.split(',').map((r) => r.split('-').map(Number));
  const maxLen = Math.max(...ranges.map(([a, b]) => (b ?? a) - a + 1));
  const bmp = makeBitmap(maxLen * TILE, ranges.length * TILE * 2, [24, 24, 32, 255]);
  ranges.forEach(([a, b], row) => {
    for (let i = 0; i <= ((b ?? a) - a); i++) {
      drawTile(bmp, P.GRASS, i * TILE, row * 2 * TILE);
      drawTile(bmp, a + i, i * TILE, row * 2 * TILE);
    }
    console.log(`fila ${row}: frames ${a}..${b ?? a}`);
  });
  return scale2x(bmp);
}

mkdirSync(OUT, { recursive: true });
const [, , mode, arg] = process.argv;
if (mode === 'strip' && arg) {
  const bmp = renderStrip(arg);
  writeFileSync(join(OUT, 'strip.png'), encodePng(bmp.width, bmp.height, bmp.data));
  console.log(`→ ${join(OUT, 'strip.png')}`);
} else if (mode === 'palette') {
  const bmp = renderPalette();
  writeFileSync(join(OUT, 'palette.png'), encodePng(bmp.width, bmp.height, bmp.data));
  console.log(`→ ${join(OUT, 'palette.png')}`);
} else if (mode === 'map' && arg) {
  const bmp = await renderMap(arg);
  writeFileSync(join(OUT, `map-${arg}.png`), encodePng(bmp.width, bmp.height, bmp.data));
  console.log(`→ ${join(OUT, `map-${arg}.png`)}`);
} else {
  console.log('uso: node render_check.mjs palette | map <id>');
}
