#!/usr/bin/env node
// Validador de MAPS (Módulo E). Ejecutar: node scripts/map_tools/validate.mjs
// Comprueba dimensiones, spawns, warps bidireccionales, NPCs, alcanzabilidad
// (BFS desde playerSpawn) de hierba alta, warps, healSpawn, carteles y NPCs.
import { MAPS } from '../../src/world/maps.js';

const errors = [];
const err = (map, msg) => errors.push(`[${map}] ${msg}`);

function walkable(m, x, y) {
  return x >= 0 && y >= 0 && x < m.width && y < m.height && m.collision[y][x] === 0;
}

function bfs(m, start, blocked) {
  const seen = new Set();
  const queue = [start];
  seen.add(`${start.x},${start.y}`);
  while (queue.length) {
    const { x, y } = queue.shift();
    for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
      const nx = x + dx, ny = y + dy, key = `${nx},${ny}`;
      if (seen.has(key) || !walkable(m, nx, ny) || blocked.has(key)) continue;
      seen.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return seen;
}

function checkGrids(id, m) {
  for (const [name, grid] of [
    ['ground', m.layers.ground], ['deco', m.layers.deco], ['overhead', m.layers.overhead],
    ['collision', m.collision], ['tallGrass', m.tallGrass]]) {
    if (grid.length !== m.height) err(id, `capa ${name}: ${grid.length} filas != height ${m.height}`);
    grid.forEach((row, y) => {
      if (row.length !== m.width) err(id, `capa ${name} fila ${y}: ${row.length} != width ${m.width}`);
    });
  }
  for (const layer of ['ground', 'deco', 'overhead']) {
    m.layers[layer].forEach((row, y) => row.forEach((t, x) => {
      if (t !== -1 && (t < 0 || t > 6327)) err(id, `${layer}(${x},${y}): frame ${t} fuera de rango`);
    }));
  }
}

function checkEncounters(id, m) {
  const hasGrass = m.tallGrass.some((row) => row.includes(1));
  if (hasGrass && !m.encounters.length) err(id, 'hay hierba alta pero no hay encuentros');
  for (const e of m.encounters) {
    if (!(e.species >= 1 && e.species <= 151)) err(id, `encuentro especie inválida: ${e.species}`);
    if (!(e.min <= e.max) || e.min < 1) err(id, `encuentro niveles inválidos: ${e.min}-${e.max}`);
    if (!(e.weight > 0)) err(id, `encuentro peso inválido: ${e.weight}`);
  }
}

function checkNpcsWarps(id, m, npcCells) {
  const positions = new Set();
  for (const n of m.npcs) {
    if (!walkable(m, n.x, n.y)) err(id, `NPC ${n.id} en celda no caminable (${n.x},${n.y})`);
    const key = `${n.x},${n.y}`;
    if (positions.has(key)) err(id, `NPC ${n.id} solapa con otro NPC en (${n.x},${n.y})`);
    positions.add(key);
    if (m.tallGrass[n.y]?.[n.x] === 1) err(id, `NPC ${n.id} dentro de hierba alta (${n.x},${n.y})`);
  }
  for (const w of m.warps) {
    if (!walkable(m, w.x, w.y)) err(id, `warp origen no caminable (${w.x},${w.y})`);
    if (npcCells.has(`${w.x},${w.y}`)) err(id, `warp origen pisado por NPC (${w.x},${w.y})`);
    const target = MAPS[w.toMap];
    if (!target) { err(id, `warp a mapa inexistente "${w.toMap}"`); continue; }
    if (!walkable(target, w.toX, w.toY)) err(id, `warp destino no caminable ${w.toMap}(${w.toX},${w.toY})`);
    if (target.npcs.some((n) => n.x === w.toX && n.y === w.toY)) {
      err(id, `warp destino pisado por NPC en ${w.toMap}(${w.toX},${w.toY})`);
    }
    if (!target.warps.some((b) => b.toMap === id)) {
      err(id, `warp a ${w.toMap} sin warp de vuelta (no es bidireccional)`);
    }
  }
  const spawnKey = `${m.playerSpawn.x},${m.playerSpawn.y}`;
  if (positions.has(spawnKey)) err(id, 'playerSpawn solapa con un NPC');
}

function checkReach(id, m, npcCells) {
  for (const [name, p] of [['playerSpawn', m.playerSpawn], ['healSpawn', m.healSpawn]]) {
    if (!walkable(m, p.x, p.y)) err(id, `${name} no caminable (${p.x},${p.y})`);
  }
  const reach = bfs(m, m.playerSpawn, npcCells);
  const reached = (x, y) => reach.has(`${x},${y}`);
  const nearReached = (x, y) =>
    [[0, 1], [0, -1], [1, 0], [-1, 0]].some(([dx, dy]) => reached(x + dx, y + dy));
  if (!reached(m.healSpawn.x, m.healSpawn.y)) err(id, 'healSpawn inalcanzable desde playerSpawn');
  m.tallGrass.forEach((row, y) => row.forEach((v, x) => {
    if (v === 1 && !reached(x, y)) err(id, `hierba alta inalcanzable (${x},${y})`);
  }));
  for (const w of m.warps) {
    if (!reached(w.x, w.y)) err(id, `warp inalcanzable (${w.x},${w.y})`);
  }
  for (const n of m.npcs) {
    if (!nearReached(n.x, n.y)) err(id, `NPC ${n.id} sin casilla adyacente alcanzable`);
  }
  for (const s of m.signs ?? []) {
    if (!nearReached(s.x, s.y)) err(id, `cartel inalcanzable (${s.x},${s.y})`);
  }
}

for (const [id, m] of Object.entries(MAPS)) {
  if (m.id !== id) err(id, `id interno "${m.id}" != clave "${id}"`);
  const npcCells = new Set(m.npcs.map((n) => `${n.x},${n.y}`));
  checkGrids(id, m);
  checkEncounters(id, m);
  checkNpcsWarps(id, m, npcCells);
  checkReach(id, m, npcCells);
}

if (errors.length) {
  console.error(`✗ ${errors.length} errores:`);
  for (const e of errors) console.error('  ' + e);
  process.exit(1);
}
console.log(`✓ MAPS válido: ${Object.entries(MAPS).map(([k, m]) => `${k} ${m.width}×${m.height}`).join(', ')}`);
