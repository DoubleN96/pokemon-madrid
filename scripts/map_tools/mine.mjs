#!/usr/bin/env node
// Herramienta de minado de tiles: parsea mapas TMX de gracidea (Tiled, capas CSV)
// y reporta frecuencias de GIDs por capa + volcado de rejilla para inspección.
// Uso: node mine.mjs <mapa.tmx> [--grid] [--layer N] [--freq N]
import { readFileSync } from 'node:fs';

const FLAG_MASK = 0x1fffffff; // Tiled usa los 3 bits altos para flip

export function parseTmx(path) {
  const xml = readFileSync(path, 'utf8');
  const firstgid = Number((xml.match(/firstgid="(\d+)"/) || [, '1'])[1]);
  const layers = [];
  const layerRe = /<layer[^>]*name="([^"]*)"[^>]*width="(\d+)"[^>]*height="(\d+)"[^>]*>[\s\S]*?<data encoding="csv">([\s\S]*?)<\/data>/g;
  let m;
  while ((m = layerRe.exec(xml)) !== null) {
    const [, name, w, h, csv] = m;
    const flat = csv.trim().split(',').map((n) => (Number(n.trim()) & FLAG_MASK));
    const grid = [];
    for (let y = 0; y < Number(h); y++) grid.push(flat.slice(y * Number(w), (y + 1) * Number(w)));
    layers.push({ name, width: Number(w), height: Number(h), grid });
  }
  return { firstgid, layers };
}

export function freq(grid) {
  const counts = new Map();
  for (const row of grid) for (const gid of row) {
    if (gid === 0) continue;
    counts.set(gid, (counts.get(gid) || 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function printGrid(grid, pad = 5) {
  for (const row of grid) {
    console.log(row.map((g) => String(g === 0 ? '.' : g).padStart(pad)).join(''));
  }
}

const [, , path, ...args] = process.argv;
if (path) {
  const wantGrid = args.includes('--grid');
  const layerIdx = args.includes('--layer') ? Number(args[args.indexOf('--layer') + 1]) : null;
  const topN = args.includes('--freq') ? Number(args[args.indexOf('--freq') + 1]) : 25;
  const { firstgid, layers } = parseTmx(path);
  console.log(`firstgid=${firstgid}  (frame Phaser = GID - ${firstgid})`);
  layers.forEach((l, i) => {
    if (layerIdx !== null && i !== layerIdx) return;
    console.log(`\n== capa ${i} "${l.name}" ${l.width}x${l.height} ==`);
    console.log(freq(l.grid).slice(0, topN).map(([g, c]) => `${g}:${c}`).join('  '));
    if (wantGrid) printGrid(l.grid);
  });
}
