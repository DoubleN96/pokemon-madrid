import { TILE } from '../../config.js';

// Depth contractual: ground 0, deco 1, overhead 100 (jugador/NPCs van en 10+y).
const LAYER_DEPTHS = { ground: 0, deco: 1, overhead: 100 };

// Crea las 3 capas de tiles de un mapa (formato MAPS del Módulo E).
// Cada capa es su propio Tilemap creado desde la matriz de índices (-1 = vacío).
// Tileset = spritesheet 'tiles' (16×16, 127 columnas → índice = fila*127+col).
export function createMapLayers(scene, mapData) {
  const layers = {};
  for (const name of ['ground', 'deco', 'overhead']) {
    const data = mapData.layers && mapData.layers[name];
    if (!data) continue;
    const tilemap = scene.make.tilemap({ data, tileWidth: TILE, tileHeight: TILE });
    const tileset = tilemap.addTilesetImage('tiles', 'tiles', TILE, TILE, 0, 0);
    const layer = tilemap.createLayer(0, tileset, 0, 0);
    layer.setDepth(LAYER_DEPTHS[name]);
    layers[name] = layer;
  }
  return layers;
}
