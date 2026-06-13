// Módulo de MOVIMIENTOS DE CAMPO (MOs, estilo FRLG) — LÓGICA PURA sin Phaser.
//
// Define el catálogo de MOs, las reglas de compatibilidad (qué Pokémon puede
// usar cada MO), el gating por medalla y los OBSTÁCULOS de campo que cada mapa
// puede declarar. Todo es testeable de forma aislada (tests/fieldmoves.test.mjs).
//
// FILOSOFÍA (segura, aditiva): una MO NO es un movimiento de combate de verdad
// (no toca core/battle.js ni moves.json). Es una CAPACIDAD que se desbloquea
// cuando:
//   1) tienes el OBJETO MO en la mochila (save.bag, p.ej. 'mo01' para Corte), y
//   2) llevas en el equipo un Pokémon COMPATIBLE (por tipo, regla FRLG simplificada), y
//   3) cumples el gate de medalla (save.flags.badges.length >= requiredBadges).
//
// Las MOs se usan de DOS formas (ambas integradas en WorldScene/MenuScene):
//   A) CONTEXTUAL: al chocar de frente con un obstáculo cortable/empujable/agua,
//      el juego ofrece usar la MO (si puedes). Igual que FRLG ("¡Es un arbusto!").
//   B) DESDE EL MENÚ: en el detalle de un Pokémon, "USAR MO" lista las MOs que ese
//      Pokémon puede usar y que tienes desbloqueadas; al elegir, se aplica al
//      obstáculo de enfrente (o, para Vuelo, abre el mapa de Vuelo).
//
// Persistencia en el save (retrocompatible, sin subir versión):
//   save.flags.fieldObstacles : { [mapId]: { 'x,y': true } }  obstáculos ya retirados
//   save.flags.visited        : { [mapId]: true }             zonas visitadas (Vuelo)
// Helpers `ensureFieldState`, `markObstacleCleared`, `isObstacleCleared`,
// `markVisited`, `isVisited` normalizan estas estructuras sin romper saves viejos.

// ---------- Tiles de OBSTÁCULO (GID del tileset `tiles`) ----------
// Tiles que representan cada obstáculo de campo en el overworld. El arbusto reusa
// el tile de matojo ya existente (88); la roca de Fuerza y la de Golpe Roca son
// tiles pintados en huecos en blanco del final del tileset (ver BootScene + el
// script que los dibujó). El agua de Surf usa el WATER del propio mapa (no aquí).
export const OBSTACLE_TILES = {
  bush: 88,       // arbusto cortable (Corte)
  boulder: 6328,  // roca grande empujable (Fuerza)
  rock: 6329,     // roca pequeña rompible (Golpe Roca)
};

// ---------- Catálogo de MOs ----------
// id        clave interna (= objeto MO en la mochila)
// name      nombre mostrado (estilo GBA, MAYÚSCULAS)
// move      nombre del "movimiento" mostrado al enseñarla (flavor)
// item      id del objeto MO en save.bag que la desbloquea
// types     tipos de Pokémon que PUEDEN usarla (regla FRLG simplificada por tipo)
// requiredBadges  nº mínimo de medallas para poder usarla (gate FRLG). 0 = sin gate.
// obstacle  clase de obstáculo de campo que retira (para uso contextual)
// verb      texto del "¡... usó MO!" mostrado al activarla
export const FIELD_MOVES = {
  fly: {
    id: 'fly', name: 'VUELO', move: 'Vuelo', item: 'mo02',
    types: ['flying'], requiredBadges: 0, obstacle: null,
    verb: 'surcó los cielos de Madrid',
  },
  cut: {
    id: 'cut', name: 'CORTE', move: 'Corte', item: 'mo01',
    types: ['grass', 'bug', 'normal'], requiredBadges: 0, obstacle: 'bush',
    verb: 'cortó el arbusto de un tajo',
  },
  strength: {
    id: 'strength', name: 'FUERZA', move: 'Fuerza', item: 'mo04',
    types: ['fighting', 'normal', 'ground', 'rock'], requiredBadges: 0, obstacle: 'boulder',
    verb: 'empujó la roca con fuerza',
  },
  rocksmash: {
    id: 'rocksmash', name: 'GOLPE ROCA', move: 'Golpe Roca', item: 'mo06',
    types: ['fighting', 'normal', 'ground', 'rock'], requiredBadges: 0, obstacle: 'rock',
    verb: 'rompió la roca de un golpe',
  },
  surf: {
    id: 'surf', name: 'SURF', move: 'Surf', item: 'mo03',
    types: ['water'], requiredBadges: 0, obstacle: 'water',
    verb: 'se lanzó a surfear las olas',
  },
};

// Lista ordenada de MOs para menús (orden de prioridad de presentación).
export const FIELD_MOVE_ORDER = ['fly', 'cut', 'surf', 'strength', 'rocksmash'];

// Mapa obstáculo → MO que lo retira (uso contextual al chocar).
export const OBSTACLE_TO_MOVE = {
  bush: 'cut',
  boulder: 'strength',
  rock: 'rocksmash',
  water: 'surf',
};

// ---------- Declaración de obstáculos en un mapa ----------
// Coloca un obstáculo de campo en (x,y) de un `mapData` ya construido (formato MAPS):
//   - pinta su tile en la capa `deco`,
//   - lo marca como colisión (no se puede pasar sin la MO),
//   - quita hierba alta bajo él (no debe haber encuentros encima),
//   - lo registra en `mapData.fieldObstacles` (lista que lee WorldScene).
// Para 'water' NO se pinta tile (el agua ya está en el mapa); solo se registra el
// punto de ENTRADA al surf si se desea (no usado: el surf se detecta por choque con
// agua, ver WorldScene). `addFieldObstacle` se usa para bush/boulder/rock.
// Es idempotente: no duplica entradas en la lista.
export function addFieldObstacle(mapData, x, y, kind) {
  if (!mapData || !mapData.layers) return mapData;
  const tile = OBSTACLE_TILES[kind];
  if (tile == null) return mapData;
  if (mapData.layers.deco[y]) mapData.layers.deco[y][x] = tile;
  if (mapData.collision[y]) mapData.collision[y][x] = 1;
  if (mapData.tallGrass && mapData.tallGrass[y]) mapData.tallGrass[y][x] = 0;
  if (!Array.isArray(mapData.fieldObstacles)) mapData.fieldObstacles = [];
  if (!mapData.fieldObstacles.some((o) => o.x === x && o.y === y)) {
    mapData.fieldObstacles.push({ x, y, kind });
  }
  return mapData;
}

// Busca la definición de obstáculo en (x,y) de un mapa, o null.
export function obstacleAt(mapData, x, y) {
  const list = (mapData && mapData.fieldObstacles) || [];
  return list.find((o) => o.x === x && o.y === y) || null;
}

// ---------- Compatibilidad ----------

// Devuelve la especie (objeto pokedex) de una instancia de Pokémon.
function speciesOf(pokedex, mon) {
  if (!mon || !Array.isArray(pokedex)) return null;
  return pokedex[mon.species - 1] || null;
}

// ¿Este Pokémon concreto puede usar esta MO? (por compatibilidad de tipo FRLG).
export function canMonUseMove(pokedex, mon, moveId) {
  const def = FIELD_MOVES[moveId];
  if (!def) return false;
  const sp = speciesOf(pokedex, mon);
  if (!sp || !Array.isArray(sp.types)) return false;
  return sp.types.some((t) => def.types.includes(t));
}

// ¿Algún miembro NO debilitado del equipo puede usar esta MO?
export function partyCanUseMove(pokedex, party, moveId) {
  if (!Array.isArray(party)) return false;
  return party.some((mon) => mon && mon.currentHp > 0 && canMonUseMove(pokedex, mon, moveId));
}

// Primer Pokémon del equipo (vivo) capaz de usar la MO, o null.
export function firstMonForMove(pokedex, party, moveId) {
  if (!Array.isArray(party)) return null;
  return party.find((mon) => mon && mon.currentHp > 0 && canMonUseMove(pokedex, mon, moveId)) || null;
}

// ---------- Gate (objeto MO + medalla) ----------

// ¿Se tiene el objeto MO en la mochila?
export function hasMoveItem(save, moveId) {
  const def = FIELD_MOVES[moveId];
  if (!def) return false;
  const bag = (save && save.bag) || {};
  return (bag[def.item] || 0) > 0;
}

// nº de medallas conseguidas (lectura segura de save.flags.badges).
export function badgeCount(save) {
  const badges = save && save.flags && Array.isArray(save.flags.badges) ? save.flags.badges : [];
  return badges.length;
}

// ¿Cumple el gate de medalla de esta MO?
export function meetsBadgeGate(save, moveId) {
  const def = FIELD_MOVES[moveId];
  if (!def) return false;
  return badgeCount(save) >= (def.requiredBadges || 0);
}

// ¿Está la MO DESBLOQUEADA para usarse? (objeto + medalla + Pokémon compatible vivo).
export function canUseFieldMove(pokedex, save, moveId) {
  if (!FIELD_MOVES[moveId]) return false;
  if (!hasMoveItem(save, moveId)) return false;
  if (!meetsBadgeGate(save, moveId)) return false;
  const party = (save && save.party) || [];
  return partyCanUseMove(pokedex, party, moveId);
}

// Razón por la que NO se puede usar (para mensajes claros al jugador). Devuelve
// null si SÍ se puede usar.
export function whyCannotUse(pokedex, save, moveId) {
  const def = FIELD_MOVES[moveId];
  if (!def) return 'Esa MO no existe.';
  if (!hasMoveItem(save, moveId)) return `Necesitas la ${def.name} (objeto MO) para esto.`;
  if (!meetsBadgeGate(save, moveId)) {
    return `Aún no puedes usar ${def.name}. Te faltan medallas de la Liga.`;
  }
  if (!partyCanUseMove(pokedex, (save && save.party) || [], moveId)) {
    return `Ninguno de tus Pokémon puede usar ${def.name} ahora mismo.`;
  }
  return null;
}

// Lista de MOs que un Pokémon CONCRETO puede usar y que están desbloqueadas
// (para el submenú "USAR MO" del detalle de Pokémon).
export function usableMovesForMon(pokedex, save, mon) {
  return FIELD_MOVE_ORDER.filter((id) => {
    if (!hasMoveItem(save, id)) return false;
    if (!meetsBadgeGate(save, id)) return false;
    return canMonUseMove(pokedex, mon, id);
  });
}

// ---------- Estado de obstáculos / zonas visitadas (save) ----------

// Garantiza save.flags.fieldObstacles y save.flags.visited (saves viejos).
export function ensureFieldState(save) {
  if (!save || typeof save !== 'object') return save;
  if (!save.flags || typeof save.flags !== 'object') save.flags = {};
  if (!save.flags.fieldObstacles || typeof save.flags.fieldObstacles !== 'object') {
    save.flags.fieldObstacles = {};
  }
  if (!save.flags.visited || typeof save.flags.visited !== 'object') {
    save.flags.visited = {};
  }
  return save;
}

function obstacleKey(x, y) { return `${x},${y}`; }

// ¿El obstáculo en (mapId,x,y) ya fue retirado en una partida anterior?
export function isObstacleCleared(save, mapId, x, y) {
  const obs = save && save.flags && save.flags.fieldObstacles;
  return !!(obs && obs[mapId] && obs[mapId][obstacleKey(x, y)]);
}

// Marca un obstáculo como retirado (persiste en el save). Idempotente.
export function markObstacleCleared(save, mapId, x, y) {
  ensureFieldState(save);
  const obs = save.flags.fieldObstacles;
  if (!obs[mapId]) obs[mapId] = {};
  obs[mapId][obstacleKey(x, y)] = true;
  return save;
}

// Marca una zona como VISITADA (para el Vuelo). Idempotente.
export function markVisited(save, mapId) {
  if (!mapId) return save;
  ensureFieldState(save);
  save.flags.visited[mapId] = true;
  return save;
}

// ¿La zona fue visitada alguna vez?
export function isVisited(save, mapId) {
  const v = save && save.flags && save.flags.visited;
  return !!(v && v[mapId]);
}
