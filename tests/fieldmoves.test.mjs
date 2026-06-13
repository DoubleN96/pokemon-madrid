// Tests de los MOVIMIENTOS DE CAMPO (MOs / HM, estilo FRLG) — lógica pura.
// Sin framework: asserts nativos. Ejecutar:  node tests/fieldmoves.test.mjs
import assert from 'node:assert/strict';

import pokedex from '../src/data/pokedex.json' with { type: 'json' };
import { createMonster } from '../src/core/monster.js';
import { ITEMS, isFieldMoveItem, fieldMoveOfItem } from '../src/core/items.js';
import {
  FIELD_MOVES, FIELD_MOVE_ORDER, OBSTACLE_TO_MOVE, OBSTACLE_TILES,
  canMonUseMove, partyCanUseMove, firstMonForMove,
  hasMoveItem, badgeCount, meetsBadgeGate, canUseFieldMove, whyCannotUse,
  usableMovesForMon,
  addFieldObstacle, obstacleAt,
  ensureFieldState, isObstacleCleared, markObstacleCleared,
  markVisited, isVisited,
} from '../src/world/fieldMoves.js';

// ---------- mini-runner ----------
let passed = 0;
let failed = 0;
function t(name, fn) {
  try { fn(); passed += 1; console.log(`  ✓ ${name}`); }
  catch (err) { failed += 1; console.error(`  ✗ ${name}\n    ${err.message}`); }
}

// Especies de prueba (id en pokedex):
const SQUIRTLE = 7;   // water → puede Surf
const BULBASAUR = 1;  // grass/poison → puede Corte
const PIDGEY = 16;    // normal/flying → puede Vuelo y Corte
const MACHOP = 66;    // fighting → puede Fuerza / Golpe Roca
const CHARMANDER = 4; // fire → no puede ninguna MO de tipo

function mon(id, level = 20) { return createMonster(pokedex, id, level); }
function saveWith({ bag = {}, party = [], badges = [], visited = {}, obstacles = {} } = {}) {
  return { version: 1, player: {}, party, bag, flags: { badges, visited, fieldObstacles: obstacles } };
}

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— catálogo de MOs y objetos MO —');

t('el catálogo trae las 5 MOs pedidas con tipos y objeto', () => {
  for (const id of ['fly', 'cut', 'strength', 'rocksmash', 'surf']) {
    assert.ok(FIELD_MOVES[id], `falta la MO ${id}`);
    assert.ok(Array.isArray(FIELD_MOVES[id].types) && FIELD_MOVES[id].types.length, `${id} sin tipos`);
    assert.ok(FIELD_MOVES[id].item, `${id} sin objeto MO`);
  }
});

t('cada MO tiene su objeto MO en el catálogo de items y son ítems de tipo MO', () => {
  for (const id of FIELD_MOVE_ORDER) {
    const itemId = FIELD_MOVES[id].item;
    assert.ok(ITEMS[itemId], `falta el objeto ${itemId} en items`);
    assert.ok(isFieldMoveItem(itemId), `${itemId} debería ser category 'mo'`);
    assert.equal(fieldMoveOfItem(itemId), id, `${itemId} debe enlazar con la MO ${id}`);
  }
});

t('los obstáculos se mapean a su MO y tienen tile (salvo agua)', () => {
  assert.equal(OBSTACLE_TO_MOVE.bush, 'cut');
  assert.equal(OBSTACLE_TO_MOVE.boulder, 'strength');
  assert.equal(OBSTACLE_TO_MOVE.rock, 'rocksmash');
  assert.equal(OBSTACLE_TO_MOVE.water, 'surf');
  assert.equal(OBSTACLE_TILES.bush, 88);
  assert.ok(OBSTACLE_TILES.boulder > 0 && OBSTACLE_TILES.rock > 0);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— compatibilidad por tipo —');

t('Squirtle (agua) puede Surf pero no Fuerza', () => {
  assert.equal(canMonUseMove(pokedex, mon(SQUIRTLE), 'surf'), true);
  assert.equal(canMonUseMove(pokedex, mon(SQUIRTLE), 'strength'), false);
});

t('Pidgey (normal/volador) puede Vuelo y Corte', () => {
  assert.equal(canMonUseMove(pokedex, mon(PIDGEY), 'fly'), true);
  assert.equal(canMonUseMove(pokedex, mon(PIDGEY), 'cut'), true);
});

t('Machop (lucha) puede Fuerza y Golpe Roca', () => {
  assert.equal(canMonUseMove(pokedex, mon(MACHOP), 'strength'), true);
  assert.equal(canMonUseMove(pokedex, mon(MACHOP), 'rocksmash'), true);
});

t('Charmander (fuego) no puede usar ninguna MO de campo', () => {
  for (const id of FIELD_MOVE_ORDER) assert.equal(canMonUseMove(pokedex, mon(CHARMANDER), id), false);
});

t('partyCanUseMove ignora a los debilitados', () => {
  const m = mon(SQUIRTLE); m.currentHp = 0;
  assert.equal(partyCanUseMove(pokedex, [m], 'surf'), false);
  m.currentHp = 10;
  assert.equal(partyCanUseMove(pokedex, [m], 'surf'), true);
});

t('firstMonForMove devuelve el primer compatible vivo', () => {
  const charm = mon(CHARMANDER);
  const squirt = mon(SQUIRTLE);
  const got = firstMonForMove(pokedex, [charm, squirt], 'surf');
  assert.equal(got, squirt);
  assert.equal(firstMonForMove(pokedex, [charm], 'surf'), null);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— gate (objeto MO + medalla + Pokémon) —');

t('hasMoveItem detecta el objeto MO en la bolsa', () => {
  assert.equal(hasMoveItem(saveWith({ bag: { mo03: 1 } }), 'surf'), true);
  assert.equal(hasMoveItem(saveWith({ bag: {} }), 'surf'), false);
});

t('badgeCount / meetsBadgeGate leen save.flags.badges con seguridad', () => {
  assert.equal(badgeCount(saveWith({ badges: ['a', 'b'] })), 2);
  assert.equal(badgeCount({}), 0);
  // las MOs base no exigen medallas (requiredBadges 0)
  assert.equal(meetsBadgeGate(saveWith({ badges: [] }), 'surf'), true);
});

t('canUseFieldMove exige objeto + Pokémon compatible + medalla', () => {
  const ok = saveWith({ bag: { mo03: 1 }, party: [mon(SQUIRTLE)] });
  assert.equal(canUseFieldMove(pokedex, ok, 'surf'), true);
  // sin objeto
  assert.equal(canUseFieldMove(pokedex, saveWith({ party: [mon(SQUIRTLE)] }), 'surf'), false);
  // sin Pokémon compatible
  assert.equal(canUseFieldMove(pokedex, saveWith({ bag: { mo03: 1 }, party: [mon(CHARMANDER)] }), 'surf'), false);
});

t('whyCannotUse explica la razón concreta y null si se puede', () => {
  assert.match(whyCannotUse(pokedex, saveWith({ party: [mon(SQUIRTLE)] }), 'surf'), /objeto MO|SURF/i);
  assert.match(whyCannotUse(pokedex, saveWith({ bag: { mo03: 1 }, party: [mon(CHARMANDER)] }), 'surf'), /ninguno/i);
  assert.equal(whyCannotUse(pokedex, saveWith({ bag: { mo03: 1 }, party: [mon(SQUIRTLE)] }), 'surf'), null);
});

t('usableMovesForMon lista solo las MOs desbloqueadas que ese Pokémon puede usar', () => {
  const save = saveWith({ bag: { mo01: 1, mo03: 1, mo04: 1 } });
  // Squirtle (agua): tiene mo03(surf) desbloqueada → solo surf
  assert.deepEqual(usableMovesForMon(pokedex, save, mon(SQUIRTLE)), ['surf']);
  // Bulbasaur (grass): tiene mo01(cut) desbloqueada → solo cut
  assert.deepEqual(usableMovesForMon(pokedex, save, mon(BULBASAUR)), ['cut']);
  // Machop (lucha): mo04(strength) desbloqueada → strength (rocksmash mo06 NO está en bolsa)
  assert.deepEqual(usableMovesForMon(pokedex, save, mon(MACHOP)), ['strength']);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— obstáculos en mapas (declaración + estado) —');

function fakeMap(w = 6, h = 6) {
  const mat = (v) => Array.from({ length: h }, () => Array(w).fill(v));
  return {
    id: 'test', width: w, height: h,
    layers: { ground: mat(0), deco: mat(-1), overhead: mat(-1) },
    collision: mat(0), tallGrass: mat(0),
  };
}

t('addFieldObstacle pinta tile, colisiona, quita hierba y registra el obstáculo', () => {
  const m = fakeMap();
  m.tallGrass[2][3] = 1;
  addFieldObstacle(m, 3, 2, 'bush');
  assert.equal(m.layers.deco[2][3], OBSTACLE_TILES.bush);
  assert.equal(m.collision[2][3], 1);
  assert.equal(m.tallGrass[2][3], 0, 'quita la hierba bajo el obstáculo');
  assert.equal(obstacleAt(m, 3, 2).kind, 'bush');
});

t('addFieldObstacle es idempotente (no duplica)', () => {
  const m = fakeMap();
  addFieldObstacle(m, 1, 1, 'boulder');
  addFieldObstacle(m, 1, 1, 'boulder');
  assert.equal(m.fieldObstacles.filter((o) => o.x === 1 && o.y === 1).length, 1);
});

t('obstacleAt devuelve null fuera de un obstáculo', () => {
  const m = fakeMap();
  addFieldObstacle(m, 1, 1, 'rock');
  assert.equal(obstacleAt(m, 2, 2), null);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— estado en el save (obstáculos retirados, zonas visitadas) —');

t('ensureFieldState crea las estructuras sin romper saves viejos', () => {
  const old = { version: 1, player: {}, party: [] };
  ensureFieldState(old);
  assert.deepEqual(old.flags.fieldObstacles, {});
  assert.deepEqual(old.flags.visited, {});
  assert.equal(old.version, 1, 'no sube la versión del save');
});

t('markObstacleCleared / isObstacleCleared persisten por mapa y casilla', () => {
  const save = saveWith();
  assert.equal(isObstacleCleared(save, 'ruta2', 6, 31), false);
  markObstacleCleared(save, 'ruta2', 6, 31);
  assert.equal(isObstacleCleared(save, 'ruta2', 6, 31), true);
  // otra casilla del mismo mapa sigue sin retirar
  assert.equal(isObstacleCleared(save, 'ruta2', 7, 33), false);
  // idempotente
  markObstacleCleared(save, 'ruta2', 6, 31);
  assert.equal(Object.keys(save.flags.fieldObstacles.ruta2).length, 1);
});

t('markVisited / isVisited registran zonas para el Vuelo', () => {
  const save = saveWith();
  assert.equal(isVisited(save, 'chamberi'), false);
  markVisited(save, 'chamberi');
  assert.equal(isVisited(save, 'chamberi'), true);
  // saves viejos sin flags
  const old = { version: 1, player: {} };
  markVisited(old, 'tetuan');
  assert.equal(isVisited(old, 'tetuan'), true);
});

// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— integración con MAPS reales (sin Phaser) —');

t('Ruta 2 declara los tres obstáculos de tierra (arbusto, roca, roca chica)', async () => {
  const { MAPS } = await import('../src/world/maps.js');
  const r = MAPS.ruta2;
  assert.ok(Array.isArray(r.fieldObstacles) && r.fieldObstacles.length >= 3);
  const kinds = r.fieldObstacles.map((o) => o.kind).sort();
  assert.deepEqual(kinds, ['boulder', 'bush', 'rock']);
});

t('los obstáculos de Ruta 2 NO bloquean el camino de los warps (x9-10, x13-14)', async () => {
  const { MAPS } = await import('../src/world/maps.js');
  const r = MAPS.ruta2;
  for (const o of r.fieldObstacles) {
    assert.ok(!([9, 10, 13, 14].includes(o.x) && o.y >= 0),
      `obstáculo en (${o.x},${o.y}) cae sobre una columna de paso de warp`);
  }
});

t('Torrevieja tiene MAR (agua) reachable como entrada de Surf', async () => {
  const { MAPS } = await import('../src/world/maps.js');
  const tor = MAPS.torrevieja;
  const WATER = 4183;
  // entrada de surf abierta en (11,25)/(12,25): agua, con arena pisable encima.
  assert.equal(tor.layers.ground[25][11], WATER, 'orilla (11,25) debe ser agua');
  assert.equal(tor.collision[24][11], 0, 'la arena (11,24) debe ser pisable');
});

t('el pescador de Torrevieja regala la MO03 SURF (gift)', async () => {
  const { MAPS } = await import('../src/world/maps.js');
  const tor = MAPS.torrevieja;
  const pesc = (tor.npcs || []).find((n) => n.id === 'pescador_torrevieja');
  assert.ok(pesc && pesc.gift, 'el pescador debe tener gift');
  assert.equal(pesc.gift.item, 'mo03');
});

t('Tetuán tiene repartidores de Corte, Fuerza, Golpe Roca y Vuelo', async () => {
  const { MAPS } = await import('../src/world/maps.js');
  const npcs = MAPS.tetuan.npcs || [];
  const items = npcs.filter((n) => n.gift).map((n) => n.gift.item).sort();
  for (const it of ['mo01', 'mo02', 'mo04', 'mo06']) {
    assert.ok(items.includes(it), `falta un repartidor de ${it} en Tetuán`);
  }
});

// ---------- resumen ----------
console.log(`\n${passed} pasados, ${failed} fallidos`);
if (failed > 0) process.exit(1);
