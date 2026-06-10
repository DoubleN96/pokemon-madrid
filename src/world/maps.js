// Módulo E — Mapas de Madrid (Tetuán, Ruta 2, Chamberí)
// Formato según docs/CONTRACTS.md. Índices de tile = frame Phaser del tileset
// reempaquetado `tiles` (127 col × 16 px, frame = GID del TMX de gracidea − 1).
// Paleta minada de littleroot/oldale/verdanturf/petalburg/rutas 101-102
// (ver scripts/map_tools/palette.mjs y scripts/map_tools/out/*.png).

const GRASS = 113;
const TALL = 94;
const SIGN = 204;
const FLOWER = 658;
const FLOWER_Y = 661;
const BUSH = 88;

// Acera/calle clara (blob del camino de Oldale)
const PATH = { TL: 2487, T: 2488, TR: 2489, L: 2600, C: 2601, R: 2602, BL: 2713, B: 2714, BR: 2715 };
// Tierra arenosa (blob del camino de Petalburg)
const DIRT = { TL: 2490, T: 2491, TR: 2492, L: 2603, C: 2604, R: 2605, BL: 2716, B: 2717, BR: 2718 };

const WATER = 4183;
const WEDGE = { TL: 4408, T: 4409, TR: 4410, L: 4521, R: 4523, B: 4635 };
const FENCE = { H_L: 540, H: 541, H_R: 542, V: 656, V_B: 769 };
const TREE = { TOP: [98, 99], MID: [211, 212], BOT: [437, 438] };

// Edificios: tiles fila a fila; las primeras `overheadRows` filas van a overhead.
const PKMN_CENTER = {
  w: 4, h: 4, overheadRows: 1,
  tiles: [[22, 23, 24, 25], [135, 136, 137, 138], [248, 249, 250, 251], [361, 362, 363, 364]],
};
const MART = {
  w: 4, h: 4, overheadRows: 1,
  tiles: [[26, 27, 27, 29], [139, 140, 141, 142], [252, 253, 254, 255], [361, 362, 367, 368]],
};
const HOUSE = {
  w: 4, h: 4, overheadRows: 1,
  tiles: [[926, 927, 927, 930], [1039, 1040, 1040, 1043], [1152, 1153, 1154, 1156], [1265, 1266, 1267, 1269]],
};
const HOUSE_BIG = {
  w: 5, h: 5, overheadRows: 1,
  tiles: [
    [2734, 2735, 2735, 2735, 2740], [2847, 2848, 2848, 2848, 2853], [2960, 2961, 2961, 2961, 2966],
    [3073, 3074, 3075, 3076, 3079], [3186, 3187, 3188, 3189, 3192]],
};
const LAB = {
  w: 7, h: 5, overheadRows: 1,
  tiles: [
    [474, 476, 477, 475, 475, 475, 478], [587, 589, 590, 588, 588, 588, 591],
    [587, 588, 588, 588, 588, 588, 591], [700, 702, 702, 706, 701, 705, 704],
    [813, 815, 815, 819, 814, 818, 817]],
};
const ELEGANT = {
  w: 6, h: 5, overheadRows: 1,
  tiles: [
    [30, 31, 31, 31, 31, 35], [143, 144, 144, 144, 144, 148], [256, 257, 258, 144, 260, 261],
    [369, 370, 371, 372, 373, 374], [482, 483, 484, 485, 486, 487]],
};

// ---------- helpers de construcción ----------

function mat(w, h, v) {
  return Array.from({ length: h }, () => Array(w).fill(v));
}

function makeBase(id, name, width, height) {
  return {
    id, name, width, height,
    layers: { ground: mat(width, height, GRASS), deco: mat(width, height, -1), overhead: mat(width, height, -1) },
    collision: mat(width, height, 0),
    tallGrass: mat(width, height, 0),
    encounters: [], warps: [], npcs: [], signs: [],
    playerSpawn: { x: 0, y: 0 }, healSpawn: { x: 0, y: 0 },
  };
}

function setDeco(m, x, y, tile, solid = true) {
  m.layers.deco[y][x] = tile;
  if (solid) m.collision[y][x] = 1;
}

// Muro de árboles: primera fila copas, después alterna tronco medio/base.
function stampTrees(m, x0, y0, x1, y1) {
  for (let y = y0; y <= y1; y++) {
    const r = y - y0;
    const pair = r === 0 ? TREE.TOP : (r % 2 === 1 ? TREE.MID : TREE.BOT);
    for (let x = x0; x <= x1; x++) setDeco(m, x, y, pair[(x - x0) % 2]);
  }
}

function stampTree(m, x, y) {
  [TREE.TOP, TREE.MID, TREE.BOT].forEach((pair, r) => {
    setDeco(m, x, y + r, pair[0]);
    setDeco(m, x + 1, y + r, pair[1]);
  });
}

function addRect(cells, x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) cells.add(`${i},${j}`);
}

// Autotile de caminos: elige borde/esquina/centro según vecinos (capa deco, caminable).
function stampPath(m, cells, blob) {
  const has = (x, y) => cells.has(`${x},${y}`);
  for (const key of cells) {
    const [x, y] = key.split(',').map(Number);
    const up = has(x, y - 1), down = has(x, y + 1), left = has(x - 1, y), right = has(x + 1, y);
    let t = blob.C;
    if (!up && !left) t = blob.TL;
    else if (!up && !right) t = blob.TR;
    else if (!down && !left) t = blob.BL;
    else if (!down && !right) t = blob.BR;
    else if (!up) t = blob.T;
    else if (!down) t = blob.B;
    else if (!left) t = blob.L;
    else if (!right) t = blob.R;
    m.layers.deco[y][x] = t;
  }
}

// Estanque/fuente: orillas en deco, agua interior en ground; todo colisiona.
function stampPond(m, x, y, w, h) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = x + i, py = y + j;
    if (j === h - 1) setDeco(m, px, py, WEDGE.B);
    else if (j === 0) setDeco(m, px, py, i === 0 ? WEDGE.TL : (i === w - 1 ? WEDGE.TR : WEDGE.T));
    else if (i === 0) setDeco(m, px, py, WEDGE.L);
    else if (i === w - 1) setDeco(m, px, py, WEDGE.R);
    else { m.layers.ground[py][px] = WATER; m.collision[py][px] = 1; }
  }
}

function stampBuilding(m, x, y, b) {
  b.tiles.forEach((row, ry) => row.forEach((tile, rx) => {
    const layer = ry < b.overheadRows ? 'overhead' : 'deco';
    m.layers[layer][y + ry][x + rx] = tile;
    m.collision[y + ry][x + rx] = 1;
  }));
}

function stampTallGrass(m, x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    if (m.collision[j][i] === 0 && m.layers.deco[j][i] === -1) {
      m.layers.deco[j][i] = TALL;
      m.tallGrass[j][i] = 1;
    }
  }
}

function fenceH(m, x, y, len) {
  for (let i = 0; i < len; i++) {
    setDeco(m, x + i, y, i === 0 ? FENCE.H_L : (i === len - 1 ? FENCE.H_R : FENCE.H));
  }
}

function fenceV(m, x, y, len) {
  for (let j = 0; j < len; j++) setDeco(m, x, y + j, j === len - 1 ? FENCE.V_B : FENCE.V);
}

function addSign(m, x, y, text) {
  setDeco(m, x, y, SIGN);
  m.signs.push({ x, y, lines: [text] });
}

function sprinkle(m, tile, spots) {
  for (const [x, y] of spots) {
    if (m.collision[y][x] === 0 && m.layers.deco[y][x] === -1) m.layers.deco[y][x] = tile;
  }
}

// ---------- TETUÁN (36×36) ----------

function buildTetuan() {
  const m = makeBase('tetuan', 'TETUÁN', 36, 36);
  // Borde de árboles con hueco sur (x17-18) hacia la Ruta 2
  stampTrees(m, 0, 0, 35, 2);
  stampTrees(m, 0, 3, 1, 35);
  stampTrees(m, 34, 3, 35, 35);
  stampTrees(m, 2, 33, 16, 35);
  stampTrees(m, 19, 33, 33, 35);
  // Calle Bravo Murillo + travesías (acera clara)
  const cells = new Set();
  addRect(cells, 2, 18, 32, 3);     // Bravo Murillo, horizontal
  addRect(cells, 6, 11, 2, 7);      // travesía a la casa del jugador
  addRect(cells, 25, 10, 2, 8);     // travesía al Centro Pokémon
  addRect(cells, 17, 21, 2, 15);    // bajada a la salida sur
  stampPath(m, cells, PATH);
  // Edificios
  stampBuilding(m, 4, 6, HOUSE_BIG);     // casa del jugador (puerta 6,10)
  stampBuilding(m, 12, 4, LAB);          // Bar "El Tetuán" (puerta 15,8)
  stampBuilding(m, 24, 6, PKMN_CENTER);  // Centro Pokémon (puerta 25,9)
  stampBuilding(m, 8, 23, MART);         // Ultramarinos Don Paco (puerta 9,26)
  stampBuilding(m, 13, 23, HOUSE);       // Farmacia (fachada)
  stampBuilding(m, 3, 23, HOUSE);        // Peluquería "Manoli" (fachada)
  // Parque Móvil del Estado: recinto vallado al noreste
  fenceV(m, 29, 4, 7);
  fenceV(m, 33, 4, 7);
  fenceH(m, 29, 11, 5);
  // Plaza Tetuán: hierba alta + deco
  stampTree(m, 29, 24);
  stampTallGrass(m, 22, 24, 6, 5);
  sprinkle(m, FLOWER, [[21, 23], [28, 29], [23, 30], [31, 27], [25, 31]]);
  sprinkle(m, FLOWER_Y, [[3, 14], [11, 13], [21, 14], [32, 22], [13, 29]]);
  sprinkle(m, BUSH, [[2, 17], [33, 17], [20, 31], [32, 30]]);
  tetuanFurniture(m);
  return m;
}

function tetuanFurniture(m) {
  addSign(m, 8, 11, 'BRAVO MURILLO, 37 — Aquí vive el héroe de esta historia.');
  addSign(m, 17, 9, 'BAR "EL TETUÁN" — Hoy: cocido completo, 12 pavos.');
  addSign(m, 11, 27, 'ULTRAMARINOS "DON PACO" — Desde 1962. Hoy hay género fresco.');
  addSign(m, 15, 27, 'FARMACIA — De guardia 24 horas.');
  addSign(m, 5, 27, 'PELUQUERÍA "MANOLI" — Corte y marcado, 10 pavos.');
  addSign(m, 21, 17, '[M] METRO DE TETUÁN — Línea 1. "Cerrado por obras. Disculpen las molestias."');
  addSign(m, 31, 12, '[PARQUE MÓVIL DEL ESTADO] "Ministerio de la Presidencia" — "Acceso restringido al personal".');
  addSign(m, 28, 23, 'PLAZA DE TETUÁN — Cuidado: hay Pokémon en la hierba alta.');
  m.encounters = [
    { species: 19, min: 2, max: 4, weight: 40 },  // Rattata
    { species: 16, min: 2, max: 4, weight: 35 },  // Pidgey
    { species: 58, min: 3, max: 5, weight: 15 },  // Growlithe
    { species: 52, min: 4, max: 6, weight: 10 },  // Meowth
  ];
  m.warps = [
    { x: 17, y: 35, toMap: 'ruta2', toX: 9, toY: 1, dir: 'down' },
    { x: 18, y: 35, toMap: 'ruta2', toX: 10, toY: 1, dir: 'down' },
  ];
  m.npcs = TETUAN_NPCS;
  m.playerSpawn = { x: 6, y: 12 };
  m.healSpawn = { x: 25, y: 11 };
}

const TETUAN_NPCS = [
  {
    id: 'mama', sprite: 'mom', x: 6, y: 11, dir: 'down', roam: false, heal: true,
    dialog: [
      '¡Bienvenido a casa, cariño! ¿Quieres que cure a tus Pokémon?',
      '...¡Listo! Tus Pokémon están perfectamente sanos ahora.',
      '¡Ten cuidado ahí fuera!',
    ],
  },
  {
    id: 'enfermera_tetuan', sprite: 'aroma', x: 25, y: 10, dir: 'down', roam: false, heal: true,
    dialog: [
      '¡Bienvenido al Centro Pokémon de Tetuán! Te curo el equipo en un periquete.',
      '...¡Listo! Tus Pokémon están como nuevos.',
      '¡Que vaya bien, majo!',
    ],
  },
  {
    id: 'don_paco', sprite: 'shopkeeper_m', x: 9, y: 27, dir: 'down', roam: false, shop: true,
    dialog: [
      '¡Hombre, el chavalín de Arturo! Tu padre era buen cliente.',
      'Siempre compraba Repelentes antes de sus expediciones.',
      '¿Qué te pongo?',
    ],
  },
  {
    id: 'viejo_bar', sprite: 'elder_m', x: 14, y: 9, dir: 'down', roam: false,
    dialog: [
      'Este bar lleva aquí desde antes de que tú nacieras, chaval.',
      'Tu padre se tomaba el café aquí cada mañana antes de entrar al Parque Móvil.',
      'Un hombre de bien, sí señor. Ojalá vuelva pronto.',
    ],
  },
  {
    id: 'senora_bata', sprite: 'generic_f1', x: 12, y: 16, dir: 'down', roam: true,
    dialog: [
      '¡Anda, el hijo de Arturo! ¿Cómo está tu madre, majo?',
      'Tu padre era un hombre muy majo. Siempre me ayudaba con la compra.',
      'Ojalá aparezca pronto...',
    ],
  },
  {
    id: 'hombre_periodico', sprite: 'elder_m', x: 20, y: 22, dir: 'down', roam: false,
    dialog: [
      '¿Tú eres el chaval que va a ver al profesor ese de los bichos?',
      'En mis tiempos no había esas cosas. ¡Solo teníamos cromos de fútbol!',
      'Aunque debo admitir que esos Pokémon del Metro molan bastante.',
    ],
  },
  {
    id: 'nino_balon', sprite: 'youngster', x: 29, y: 30, dir: 'left', roam: true,
    dialog: [
      '¡Eh! ¿Vas a ser entrenador Pokémon? ¡Yo también quiero!',
      'Pero mi madre dice que primero acabe el cole.',
      '¡Cuando tenga mi Pokémon, te reto!',
    ],
  },
  {
    id: 'vigilante_parque', sprite: 'generic_m1', x: 30, y: 12, dir: 'down', roam: false,
    dialog: [
      'Esto es el Parque Móvil del Estado. Acceso restringido al personal, chaval.',
      '...¿Eres el hijo de Arturo? Tu padre trabajaba aquí, de mecánico jefe.',
      'Ahora está cerrado al público. Órdenes de arriba.',
    ],
  },
];

// ---------- RUTA 2 (20×40) ----------

function buildRuta2() {
  const m = makeBase('ruta2', 'RUTA 2', 20, 40);
  // Bordes con huecos norte (Tetuán) y sur (Chamberí) en x9-10
  stampTrees(m, 0, 0, 1, 39);
  stampTrees(m, 18, 0, 19, 39);
  stampTrees(m, 2, 0, 8, 2);
  stampTrees(m, 11, 0, 17, 2);
  stampTrees(m, 2, 37, 8, 39);
  stampTrees(m, 11, 37, 17, 39);
  // Camino de tierra con tres recodos
  const cells = new Set();
  addRect(cells, 9, 0, 2, 11);    // bajada desde Tetuán
  addRect(cells, 4, 9, 7, 2);     // recodo 1: hacia la izquierda
  addRect(cells, 4, 9, 2, 14);    // bajada oeste
  addRect(cells, 4, 21, 11, 2);   // recodo 2: hacia la derecha
  addRect(cells, 13, 21, 2, 10);  // bajada este
  addRect(cells, 9, 29, 6, 2);    // recodo 3: vuelta al centro
  addRect(cells, 9, 29, 2, 11);   // bajada a Chamberí
  stampPath(m, cells, DIRT);
  // Quiosco, fuente y árbol que esconde al punki
  stampBuilding(m, 14, 12, HOUSE);
  stampPond(m, 4, 32, 3, 3);
  stampTree(m, 15, 31);
  // Hierba alta abundante (jardincillos)
  stampTallGrass(m, 12, 4, 5, 6);
  stampTallGrass(m, 6, 13, 6, 7);
  stampTallGrass(m, 6, 24, 7, 5);
  stampTallGrass(m, 15, 17, 2, 12);
  sprinkle(m, FLOWER, [[7, 11], [12, 20], [6, 30], [3, 5]]);
  sprinkle(m, FLOWER_Y, [[3, 19], [11, 32], [17, 35], [2, 27]]);
  sprinkle(m, BUSH, [[2, 12], [17, 10], [3, 35]]);
  addSign(m, 11, 3, 'RUTA 2 — Bravo Murillo, dirección CHAMBERÍ.');
  addSign(m, 16, 16, 'QUIOSCO — Prensa, cromos y pipas.');
  ruta2Data(m);
  return m;
}

function ruta2Data(m) {
  m.encounters = [
    { species: 19, min: 3, max: 5, weight: 45 },  // Rattata
    { species: 16, min: 3, max: 5, weight: 40 },  // Pidgey
    { species: 58, min: 4, max: 6, weight: 14 },  // Growlithe
    { species: 63, min: 5, max: 7, weight: 1 },   // Abra (raro)
  ];
  m.warps = [
    { x: 9, y: 0, toMap: 'tetuan', toX: 17, toY: 34, dir: 'up' },
    { x: 10, y: 0, toMap: 'tetuan', toX: 18, toY: 34, dir: 'up' },
    { x: 9, y: 39, toMap: 'chamberi', toX: 14, toY: 1, dir: 'down' },
    { x: 10, y: 39, toMap: 'chamberi', toX: 15, toY: 1, dir: 'down' },
  ];
  m.npcs = RUTA2_NPCS;
  m.playerSpawn = { x: 9, y: 3 };
  m.healSpawn = { x: 9, y: 3 };
}

const RUTA2_NPCS = [
  {
    id: 'nino_oscar', sprite: 'youngster', x: 8, y: 5, dir: 'right', roam: false,
    dialog: ['¡Mi Rattata es el más fuerte del barrio! ¡Te lo demuestro!'],
  },
  {
    id: 'nina_lucia', sprite: 'lass', x: 3, y: 14, dir: 'right', roam: false,
    dialog: ['¿Tú también vas a ser entrenador? ¡Yo empecé ayer!', '¡Vamos a ver quién ha aprendido más!'],
  },
  {
    id: 'joven_marcos', sprite: 'generic_m1', x: 8, y: 22, dir: 'up', roam: false,
    dialog: ['Los Pokémon de ciudad son más listos que los del campo.', '¡Déjame demostrártelo!'],
  },
  {
    id: 'senora_carmen', sprite: 'generic_f1', x: 13, y: 27, dir: 'left', roam: false,
    dialog: [
      'Oh, qué entrenador tan joven. ¿No deberías estar en el colegio?',
      '...¿Vacaciones? Bueno, entonces ¡vamos a combatir un poco!',
    ],
  },
  {
    id: 'punk_dani', sprite: 'guitarist', x: 15, y: 34, dir: 'up', roam: false,
    dialog: ['Eh, ¿qué miras? ¿Buscas pelea?', '¡Pues la vas a encontrar!'],
  },
];

// ---------- CHAMBERÍ (30×30) ----------

function buildChamberi() {
  const m = makeBase('chamberi', 'CHAMBERÍ', 30, 30);
  // Bordes con hueco norte (x14-15) hacia la Ruta 2
  stampTrees(m, 0, 0, 1, 29);
  stampTrees(m, 28, 0, 29, 29);
  stampTrees(m, 2, 0, 13, 2);
  stampTrees(m, 16, 0, 27, 2);
  stampTrees(m, 2, 27, 27, 29);
  // Plaza de Olavide: disco aproximado + entrada desde el norte
  const cells = new Set();
  addRect(cells, 14, 0, 2, 12);
  for (let y = 10; y <= 21; y++) for (let x = 9; x <= 21; x++) {
    const dx = x - 15, dy = y - 15.5;
    if (dx * dx + dy * dy <= 30) cells.add(`${x},${y}`);
  }
  stampPath(m, cells, PATH);
  stampPond(m, 13, 13, 4, 4);            // fuente de la plaza
  stampBuilding(m, 5, 6, PKMN_CENTER);   // Centro Pokémon Chamberí (puerta 6,9)
  stampBuilding(m, 20, 5, HOUSE_BIG);    // Café del Modernismo (fachada)
  stampBuilding(m, 4, 20, LAB);          // Mercado de Vallehermoso (fachada)
  stampBuilding(m, 19, 21, ELEGANT);     // Estación Fantasma (fachada)
  // Jardines de Olavide: hierba alta
  stampTallGrass(m, 3, 12, 5, 6);
  stampTallGrass(m, 22, 12, 5, 6);
  stampTallGrass(m, 11, 23, 7, 3);
  sprinkle(m, FLOWER, [[10, 9], [20, 9], [9, 21], [21, 19], [12, 11], [18, 20]]);
  sprinkle(m, FLOWER_Y, [[11, 10], [19, 21], [8, 18], [22, 10], [16, 22]]);
  sprinkle(m, BUSH, [[3, 10], [26, 10], [2, 25], [27, 19]]);
  addSign(m, 12, 10, 'PLAZA DE OLAVIDE — Chamberí. Jardines con Pokémon.');
  addSign(m, 24, 10, 'CAFÉ DEL MODERNISMO — Tertulia diaria a las cinco.');
  addSign(m, 9, 25, 'MERCADO DE VALLEHERMOSO — Género fresco de la sierra.');
  addSign(m, 23, 26, 'ESTACIÓN DE CHAMBERÍ — "CLAUSURADA EN 1966".');
  addSign(m, 19, 10, '[M] METRO DE IGLESIA — Línea 1. "Cerrada por obras".');
  chamberiData(m);
  return m;
}

function chamberiData(m) {
  m.encounters = [
    { species: 43, min: 6, max: 9, weight: 30 },  // Oddish
    { species: 16, min: 5, max: 8, weight: 30 },  // Pidgey
    { species: 63, min: 6, max: 9, weight: 20 },  // Abra
    { species: 58, min: 5, max: 8, weight: 15 },  // Growlithe
    { species: 52, min: 7, max: 10, weight: 5 },  // Meowth
  ];
  m.warps = [
    { x: 14, y: 0, toMap: 'ruta2', toX: 9, toY: 38, dir: 'up' },
    { x: 15, y: 0, toMap: 'ruta2', toX: 10, toY: 38, dir: 'up' },
  ];
  m.npcs = CHAMBERI_NPCS;
  m.playerSpawn = { x: 14, y: 2 };
  m.healSpawn = { x: 6, y: 11 };
}

const CHAMBERI_NPCS = [
  {
    id: 'enfermera_chamberi', sprite: 'aroma', x: 6, y: 10, dir: 'down', roam: false, heal: true,
    dialog: [
      'Bienvenido al Centro Pokémon de Chamberí, joven. Permítame su equipo.',
      '...Sus Pokémon han quedado perfectamente restablecidos.',
      'Vuelva usted cuando guste.',
    ],
  },
  {
    id: 'senor_elegante', sprite: 'gentleman', x: 21, y: 11, dir: 'down', roam: false,
    dialog: [
      'Chamberí es el barrio más señorial de Madrid, joven.',
      'Aquí hasta los Pokémon tienen pedigrí, no como esos gatos de Tetuán.',
    ],
  },
  {
    id: 'senora_olavide', sprite: 'generic_f1', x: 12, y: 20, dir: 'down', roam: true,
    dialog: [
      'La plaza de Olavide es redonda como una rosquilla de San Isidro.',
      'Antes había un mercado aquí en medio, ¿sabes? Lo volaron en el 74. ¡Pum!',
    ],
  },
  {
    id: 'viejo_fuente', sprite: 'fisher', x: 17, y: 17, dir: 'left', roam: false,
    dialog: [
      'En esta fuente no se pesca, chaval, pero a veces se asoma algún Pokémon de agua.',
      '...O eso dicen los del barrio. Yo, por si acaso, traigo la caña.',
    ],
  },
];

// ---------- export ----------

export const MAPS = {
  tetuan: buildTetuan(),
  ruta2: buildRuta2(),
  chamberi: buildChamberi(),
};
