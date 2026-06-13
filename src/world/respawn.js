// Lógica pura de reaparición tras un whiteout (sin Phaser ni DOM, testeable).
// FRLG: al perder todos los Pokémon revives en el ÚLTIMO Centro Pokémon visitado;
// si aún no has curado en ninguno, caes en la ciudad inicial.

/**
 * Punto donde reaparecer tras un whiteout.
 * @param {Object} save estado de partida (lee save.flags.lastCenter)
 * @param {Object} maps tabla de mapas (para validar que lastCenter.map existe)
 * @param {string} [fallbackMap='tetuan'] ciudad inicial de respaldo
 * @returns {{map:string, x:number, y:number, dir:string}}
 */
export function whiteoutDestination(save, maps, fallbackMap = 'tetuan') {
  const last = save && save.flags && save.flags.lastCenter;
  if (last && maps[last.map] && Number.isInteger(last.x) && Number.isInteger(last.y)) {
    return { map: last.map, x: last.x, y: last.y, dir: last.dir || 'down' };
  }
  const home = maps[fallbackMap];
  const spawn = (home && (home.healSpawn || home.playerSpawn)) || { x: 1, y: 1 };
  return { map: fallbackMap, x: spawn.x, y: spawn.y, dir: 'down' };
}

/**
 * Construye el registro del último punto de curación a partir del mapa actual.
 * @param {string} mapId id del mapa donde se curó
 * @param {Object} mapData datos del mapa (usa healSpawn/playerSpawn)
 * @returns {{map:string, x:number, y:number, dir:string}}
 */
export function healPoint(mapId, mapData) {
  const spawn = (mapData && (mapData.healSpawn || mapData.playerSpawn)) || { x: 1, y: 1 };
  return { map: mapId, x: spawn.x, y: spawn.y, dir: 'down' };
}
