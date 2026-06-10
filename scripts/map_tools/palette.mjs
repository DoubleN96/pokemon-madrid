// Paleta de tiles minada de los TMX reales de gracidea (littleroot, oldale,
// verdanturf, petalburg, rutas 101/102). Todos los valores son ÍNDICES DE FRAME
// de Phaser (= GID del TMX − 1) sobre el tileset reempaquetado 127 col × 16 px.
//
// Evidencia de minado (GIDs, frame = GID−1):
// - 114 suelo hierba: capa base completa en littleroot/oldale/r101/r102/petalburg.
// - 95 hierba alta: 89× r101, 143× r102, en clusters caminables (zona encuentros).
// - 2488-2490/2601-2603/2714-2716 blob 3×3 de camino de tierra (oldale, r101).
// - 99,100/212,213/438,439 árbol 2×3; 325,326 fila de solape al apilar (bordes).
// - 205 cartel (4× littleroot, 1× oldale/r101/r102, 2× petalburg — verificado en render).
// - 659 flores rojas animadas (tsx: tile 658 frames=3), 662 flores amarillas (verdanturf).
// - 4184 agua centro (capa suelo r102/petalburg); 4409-4411/4522-4524/4635-4637 orillas.
// - 541/542/543 valla horizontal, 657 poste vertical, 770 remate inferior (petalburg).
// - Centro Pokémon 4×4 GIDs 23-26/136-139/249-252/362-365 (oldale+petalburg;
//   tsx marca ids 22-25 con zindex=2 → fila superior es overhead).
// - Tienda 4×4 GIDs [27,28,28,30]/140-143/253-256/[362,363,368,369] (oldale+petalburg).
// - Casa RSE 4×4 GIDs [927,928,928,931]/[1040,1041,1041,1044]/[1153,1154,1155,1157]/
//   [1266,1267,1268,1270] — puerta=1267 (variante 5-anchos centra 1267: petalburg).
// - Casa Littleroot 5×5 GIDs 2735-2741/2848-2854/2961-2967/3074-3080/3187-3193.
// - Laboratorio 7×5 GIDs 475-479/588-592/701-707/814-820 (littleroot).
// - Edificio elegante (gimnasio Petalburg) 6×5 GIDs 31-36/144-149/257-262/370-375/483-488.

export const GRASS = 113;        // suelo de hierba base
export const TALL_GRASS = 94;    // hierba alta (encuentros)
export const SIGN = 204;         // cartel (GID 205: 4× littleroot, 2× petalburg, 1× oldale/r101/r102)
export const FLOWER = 658;       // flores rojas (animada: tsx tile 658 frames=3)
export const FLOWER_Y = 661;     // flores amarillas (GID 662, deco de verdanturf)
export const BUSH = 88;          // arbusto redondo

// Acera/calle clara: blob 3×3 pálido (camino de Oldale)
export const PATH = {
  TL: 2487, T: 2488, TR: 2489,
  L: 2600, C: 2601, R: 2602,
  BL: 2713, B: 2714, BR: 2715,
};

// Tierra arenosa: blob 3×3 (camino de Petalburg) — para la Ruta 2
export const DIRT = {
  TL: 2490, T: 2491, TR: 2492,
  L: 2603, C: 2604, R: 2605,
  BL: 2716, B: 2717, BR: 2718,
};

// Agua: centro (capa suelo) + orillas (capa deco). Minado del estanque de la
// ruta 102: GIDs 4409/4410/4411 arriba, 4522 izq, 4524 dcha, 4636 todo el fondo.
export const WATER = 4183;
export const WATER_EDGE = {
  TL: 4408, T: 4409, TR: 4410,
  L: 4521, R: 4523,
  BL: 4635, B: 4635, BR: 4635,
};

// Valla
export const FENCE = { H: 541, H_L: 540, H_R: 542, V: 656, V_B: 769 };

// Árbol 2 ancho × 3 alto; OVERLAP sustituye a MID al apilar verticalmente
export const TREE = {
  TOP: [98, 99],
  MID: [211, 212],
  BOT: [437, 438],
  OVERLAP: [324, 325],
};

// Edificios: matrices de frames fila a fila (−1 = hueco).
// door = posición {dx, dy} de la puerta dentro del bloque.
// overheadRows = nº de filas superiores que van a la capa overhead.
export const PKMN_CENTER = {
  w: 4, h: 4, door: { dx: 1, dy: 3 }, overheadRows: 1,
  tiles: [
    [22, 23, 24, 25],
    [135, 136, 137, 138],
    [248, 249, 250, 251],
    [361, 362, 363, 364],
  ],
};

export const MART = {
  w: 4, h: 4, door: { dx: 1, dy: 3 }, overheadRows: 1,
  tiles: [
    [26, 27, 27, 29],
    [139, 140, 141, 142],
    [252, 253, 254, 255],
    [361, 362, 367, 368],
  ],
};

export const HOUSE = {
  w: 4, h: 4, door: { dx: 1, dy: 3 }, overheadRows: 1,
  tiles: [
    [926, 927, 927, 930],
    [1039, 1040, 1040, 1043],
    [1152, 1153, 1154, 1156],
    [1265, 1266, 1267, 1269],
  ],
};

export const HOUSE5 = {
  w: 5, h: 4, door: { dx: 2, dy: 3 }, overheadRows: 1,
  tiles: [
    [926, 927, 927, 927, 930],
    [1039, 1040, 1040, 1040, 1043],
    [1152, 1154, 1153, 1154, 1156],
    [1265, 1267, 1266, 1267, 1269],
  ],
};

// Casa estilo Littleroot 5×5 (variante puerta derecha-centro)
export const HOUSE_BIG = {
  w: 5, h: 5, door: { dx: 2, dy: 4 }, overheadRows: 1,
  tiles: [
    [2734, 2735, 2735, 2735, 2740],
    [2847, 2848, 2848, 2848, 2853],
    [2960, 2961, 2961, 2961, 2966],
    [3073, 3074, 3075, 3076, 3079],
    [3186, 3187, 3188, 3189, 3192],
  ],
};

// Laboratorio Littleroot 7×5 — sirve de edificio grande genérico (bar/mercado)
export const LAB = {
  w: 7, h: 5, door: { dx: 3, dy: 4 }, overheadRows: 1,
  tiles: [
    [474, 476, 477, 475, 475, 475, 478],
    [587, 589, 590, 588, 588, 588, 591],
    [587, 588, 588, 588, 588, 588, 591],
    [700, 702, 702, 706, 701, 705, 704],
    [813, 815, 815, 819, 814, 818, 817],
  ],
};

// Edificio elegante (gimnasio Petalburg) 6×5 — fachadas señoriales de Chamberí
export const ELEGANT = {
  w: 6, h: 5, door: { dx: 2, dy: 4 }, overheadRows: 1,
  tiles: [
    [30, 31, 31, 31, 31, 35],
    [143, 144, 144, 144, 144, 148],
    [256, 257, 258, 144, 260, 261],
    [369, 370, 371, 372, 373, 374],
    [482, 483, 484, 485, 486, 487],
  ],
};

export const BUILDINGS = { PKMN_CENTER, MART, HOUSE, HOUSE5, HOUSE_BIG, LAB, ELEGANT };
