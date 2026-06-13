// Datos del MAPA (Town Map estilo FRLG) — geografía ESQUEMÁTICA de España.
//
// No es arte pixel-perfect: define regiones (rectángulos de color con nombre) y
// PUNTOS (ciudades/zonas visitables) sobre el lienzo nativo GBA (240×160). La
// escena `Map` (src/scenes/MapScene.js) dibuja todo con gráficos de Phaser a
// partir de estos datos. Mantener la geografía REAL aproximada:
//   - MADRID en el CENTRO (meseta) con sus barrios/zonas.
//   - BERCERO al NOROESTE (Valladolid / Castilla y León).
//   - TORREVIEJA al SURESTE (costa mediterránea / Alicante).
//
// Todo es PURO (sin Phaser) para poder testearlo y reutilizarlo. La escena solo
// consume estas tablas. Prepara el terreno para el VUELO futuro (cada punto tiene
// `flyable` y un map/spawn de destino), pero el viaje rápido NO se implementa aún.

import { GAME_W, GAME_H } from '../config.js';

// Lienzo del mapa (deja margen para cabecera y pie de ayuda).
export const MAP_VIEW = {
  x: 6,
  y: 18,
  w: GAME_W - 12,   // 228
  h: GAME_H - 42,   // 118
};

// Paleta esquemática (enteros 0xRRGGBB para Phaser graphics).
export const MAP_COLORS = {
  sea: 0x3a6ea8,        // Mediterráneo / mar
  seaDeep: 0x2d5688,
  land: 0xcdb87f,       // meseta / tierra interior
  landNW: 0xb7c47a,     // Castilla (campos del noroeste)
  coast: 0xd8c98a,      // franja costera
  border: 0x6b5a2e,     // contornos de región
  point: 0xf0f0f0,      // relleno de punto normal
  pointEdge: 0x202020,
  pointVisited: 0xf8d038, // punto de centro/zona visitada (amarillo)
  here: 0xe03028,       // marcador "ESTÁS AQUÍ" (rojo parpadeante)
  grid: 0x00000022,
};

// Regiones esquemáticas (porcentajes 0..1 sobre MAP_VIEW). Se dibujan como
// rectángulos redondeados etiquetados. El orden importa (se pintan de fondo a
// frente): primero el mar, luego las masas de tierra.
export const REGIONS = [
  // Mar Mediterráneo (esquina sureste, detrás de la costa de Torrevieja).
  { id: 'mar', label: 'MEDITERRÁNEO', color: MAP_COLORS.sea, labelColor: '#cfe0ff',
    rect: { x: 0.70, y: 0.50, w: 0.30, h: 0.50 } },
  // Castilla y León (noroeste, Bercero/Valladolid).
  { id: 'castilla', label: 'CASTILLA', color: MAP_COLORS.landNW, labelColor: '#46461f',
    rect: { x: 0.0, y: 0.0, w: 0.42, h: 0.44 } },
  // Meseta central (Madrid y alrededores).
  { id: 'meseta', label: 'MADRID', color: MAP_COLORS.land, labelColor: '#6a5524',
    rect: { x: 0.30, y: 0.20, w: 0.46, h: 0.60 } },
  // Levante / costa de Alicante (sureste, franja de tierra junto al mar).
  { id: 'levante', label: 'LEVANTE', color: MAP_COLORS.coast, labelColor: '#6a5524',
    rect: { x: 0.60, y: 0.56, w: 0.16, h: 0.40 } },
];

// PUNTOS del mapa (zonas que el jugador reconoce). Coordenadas en porcentaje
// 0..1 sobre MAP_VIEW. Cada punto agrupa uno o varios `maps` del mundo real del
// juego para que "ESTÁS AQUÍ" funcione estés donde estés (calle, interior, gym…).
//
// `region`  : etiqueta corta para el panel de información.
// `flyable` : si el VUELO futuro podrá traer aquí (centros Pokémon). No se usa aún.
// `flyTo`   : destino del vuelo futuro { map, x, y } (preparado, no usado todavía).
export const MAP_POINTS = [
  {
    id: 'tetuan', name: 'TETUÁN', region: 'Madrid',
    pos: { x: 0.42, y: 0.30 }, labelAt: 'left',
    desc: 'Tu barrio. Casa, Centro Pokémon y el Gimnasio Cashflow.',
    flyable: true, flyTo: { map: 'tetuan', x: 25, y: 11 },
    maps: [
      'tetuan', 'casa_marcelino', 'bar_tetuan', 'cpoke_tetuan', 'ultramarinos',
      'farmacia', 'peluqueria', 'gym_cashflow', 'liga_chamberi',
    ],
  },
  {
    id: 'ruta2', name: 'RUTA 2', region: 'Madrid',
    pos: { x: 0.42, y: 0.45 }, labelAt: 'left',
    desc: 'Tramo con entrenadores entre Tetuán y Chamberí.',
    flyable: false,
    maps: ['ruta2', 'quiosco'],
  },
  {
    id: 'chamberi', name: 'CHAMBERÍ', region: 'Madrid',
    pos: { x: 0.42, y: 0.60 }, labelAt: 'left',
    desc: 'Plaza de Olavide y los gimnasios de la Liga Chamberí.',
    flyable: true, flyTo: { map: 'chamberi', x: 6, y: 11 },
    maps: [
      'chamberi', 'cpoke_chamberi', 'cafe_modernismo', 'mercado_vallehermoso',
      'estacion_fantasma', 'gym_trading', 'gym_fantasma', 'gym_camion',
      'gym_notarias', 'gym_tacanos',
    ],
  },
  {
    id: 'ruta3', name: 'GRAN VÍA', region: 'Madrid',
    pos: { x: 0.55, y: 0.68 }, labelAt: 'below',
    desc: 'Ruta 3 · Gran Vía, camino del Retiro.',
    flyable: false,
    maps: ['ruta3'],
  },
  {
    id: 'retiro', name: 'RETIRO', region: 'Madrid',
    pos: { x: 0.66, y: 0.56 }, labelAt: 'right',
    desc: 'Parque del Retiro. Aire libre en pleno centro.',
    flyable: false,
    maps: ['retiro'],
  },
  {
    id: 'bercero', name: 'BERCERO', region: 'Valladolid',
    pos: { x: 0.16, y: 0.22 }, labelAt: 'below',
    desc: 'Pueblo del padre, al noroeste. La pandilla y la Peña.',
    flyable: true, flyTo: { map: 'bercero', x: 8, y: 9 },
    maps: ['bercero', 'casa_padre', 'pena_escuelas'],
  },
  {
    id: 'torrevieja', name: 'TORREVIEJA', region: 'Alicante',
    pos: { x: 0.80, y: 0.82 }, labelAt: 'above',
    desc: 'Costa de la madre, al sureste. Playa y salinas.',
    flyable: true, flyTo: { map: 'torrevieja', x: 5, y: 14 },
    maps: ['torrevieja', 'casa_madre_torrevieja'],
  },
];

// Resuelve un id de mapa del mundo (calle/interior/gym/liga) a su PUNTO del mapa.
// Devuelve el punto o `null` si el mapa no está catalogado (p. ej. una zona nueva
// aún sin entrada: el mapa se mostrará igual, solo sin marcador "ESTÁS AQUÍ").
export function pointForMap(mapId) {
  if (!mapId) return null;
  for (const p of MAP_POINTS) {
    if (p.maps.includes(mapId)) return p;
  }
  return null;
}

// Convierte una posición en porcentaje (0..1) a coordenadas de pantalla dentro de
// MAP_VIEW. Útil tanto para puntos como para esquinas de regiones.
export function toScreen(pos, view = MAP_VIEW) {
  return {
    x: Math.round(view.x + pos.x * view.w),
    y: Math.round(view.y + pos.y * view.h),
  };
}

// Convierte un rect en porcentaje a rect de pantalla (px) dentro de MAP_VIEW.
export function rectToScreen(rect, view = MAP_VIEW) {
  return {
    x: Math.round(view.x + rect.x * view.w),
    y: Math.round(view.y + rect.y * view.h),
    w: Math.round(rect.w * view.w),
    h: Math.round(rect.h * view.h),
  };
}
