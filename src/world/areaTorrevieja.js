// Módulo F (EXTENSIÓN) — ZONA NUEVA: TORREVIEJA (costa de Alicante, Levante).
//
// Fichero AUTÓNOMO y ADITIVO. NO modifica los mapas existentes (Tetuán, rutas,
// Chamberí, Retiro, Bercero…). Solo:
//   1) exporta `TORREVIEJA_MAPS` (mismo formato que MAPS) — el pueblo costero +
//      la casa de la MADRE de Marcelino (Marilyn Parada).
//   2) exporta `wireTorreviejaEntry(maps)` — engancha UN ÚNICO punto de viaje a
//      Torrevieja añadiendo una SEGUNDA línea de autobús en la estación de
//      autobuses de Tetuán (un cartel + un NPC conductor de la línea de Levante +
//      el warp de ida/vuelta), SIN reorganizar nada y SIN tocar la línea de
//      Bercero ni la navegación existente. 100% aditivo.
//
// CONTEXTO REAL (lore-roadmap "PRINCIPIO DE MUNDO"): Torrevieja es un pueblo de la
// costa mediterránea levantina (Alicante, Vega Baja). Lo hacemos RECONOCIBLE con
// sitios reales: LAS SALINAS (el lago salado ROSA icónico) y las ERAS DE LA SAL,
// las PLAYAS (Los Locos, La Mata), el PASEO MARÍTIMO y el PUERTO DEPORTIVO.
// Ambiente de pueblo costero de veraneo. Aquí vive la MADRE de Marcelino, Marilyn
// Parada (NPC central, CURA el equipo como el padre en Bercero). Parodia CARIÑOSA.
// Guiño a la "facción de Levante" (Ann Jou, Ramiro) que es de aquí — sin combates
// (esos personajes viven en liga.js/gyms.js): aquí solo ambiente y un cartel.
//
// AGUA / MOs FUTURAS: dejamos MAR visible y un embarcadero como preparación para
// la MO Surf (cruzar al futuro). NO se implementa Surf ahora: el mar colisiona.
//
// PRIVACIDAD (repo público): cero teléfonos/JIDs/emails/direcciones reales; no se
// geolocaliza ninguna casa; nada íntimo ni dañino. Solo cariño costero.
//
// Tiles: maps.js no exporta sus helpers, así que este módulo REPLICA las constantes
// y funciones de construcción que necesita (idénticas a maps.js/areaBercero.js).

// ---------- constantes de tileset (idénticas a maps.js/areaBercero.js) ----------

const GRASS = 113;
const TALL = 94;
const SIGN = 204;
const FLOWER = 658;     // flor rosa (acentos del lago rosa / paseo)
const FLOWER_Y = 661;   // flor amarilla
const BUSH = 88;

// Acera/calle clara (blob del camino de Oldale) — paseo marítimo empedrado.
const PATH = { TL: 2487, T: 2488, TR: 2489, L: 2600, C: 2601, R: 2602, BL: 2713, B: 2714, BR: 2715 };
// Tierra arenosa (blob del camino de Petalburg) — ARENA de playa y caminos costeros.
const SAND = { TL: 2490, T: 2491, TR: 2492, L: 2603, C: 2604, R: 2605, BL: 2716, B: 2717, BR: 2718 };

const WATER = 4183;     // MAR mediterráneo (azul) — colisiona (Surf futuro)
const WEDGE = { TL: 4408, T: 4409, TR: 4410, L: 4521, R: 4523, B: 4635 };
// "Sal rosa": usamos los tiles pinkish del set (124/115) para el agua/costra del
// lago salado rosa de Las Salinas (sello icónico de Torrevieja), framado con WEDGE
// y rematado con flores rosas. No hay tile de "agua rosa" nativo, así que se compone.
const SALT_PINK = 124;       // costra/agua rosada del lago salado
const SALT_PINK_LT = 115;    // rosa más claro (orilla salada)
const FENCE = { H_L: 540, H: 541, H_R: 542, V: 656, V_B: 769 };
const TREE = { TOP: [98, 99], MID: [211, 212], BOT: [437, 438] };

// "Palmera" costera: el set no trae palmeras propias, así que reutilizamos el árbol
// (TREE) como arbolado del paseo. Decorativo. El sabor de "palmeras" lo dan los
// carteles y la disposición (paseo marítimo arbolado).

// Edificios (filas de tiles; overheadRows van a la capa overhead).
const PKMN_CENTER = {
  w: 4, h: 4, overheadRows: 1,
  tiles: [[22, 23, 24, 25], [135, 136, 137, 138], [248, 249, 250, 251], [361, 362, 363, 364]],
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
// Edificio "noble" reutilizado como las ERAS DE LA SAL / lonja del puerto (decorado).
const ELEGANT = {
  w: 6, h: 5, overheadRows: 1,
  tiles: [
    [30, 31, 31, 31, 31, 35], [143, 144, 144, 144, 144, 148], [256, 257, 258, 144, 260, 261],
    [369, 370, 371, 372, 373, 374], [482, 483, 484, 485, 486, 487]],
};

// ---------- helpers de construcción (idénticos a maps.js/areaBercero.js) ----------

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

// Estanque/agua genérico: framado WEDGE + relleno `fill` (WATER por defecto).
// `solid` marca el relleno como colisión (mar/lago no cruzable sin Surf).
function stampWaterBody(m, x, y, w, h, fill = WATER) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const px = x + i, py = y + j;
    if (px < 0 || py < 0 || px >= m.width || py >= m.height) continue;
    if (j === h - 1) setDeco(m, px, py, WEDGE.B);
    else if (j === 0) setDeco(m, px, py, i === 0 ? WEDGE.TL : (i === w - 1 ? WEDGE.TR : WEDGE.T));
    else if (i === 0) setDeco(m, px, py, WEDGE.L);
    else if (i === w - 1) setDeco(m, px, py, WEDGE.R);
    else { m.layers.ground[py][px] = fill; m.collision[py][px] = 1; }
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
    if (j < 0 || i < 0 || i >= m.width || j >= m.height) continue;
    if (m.collision[j][i] === 0 && m.layers.deco[j][i] === -1) {
      m.layers.deco[j][i] = TALL;
      m.tallGrass[j][i] = 1;
    }
  }
}

// Franja de ARENA de playa (decorativa, pisable). Rellena `deco` con el blob SAND
// como una "playa" continua junto al mar. No colisiona (es la orilla caminable).
function stampBeach(m, x, y, w, h) {
  const cells = new Set();
  addRect(cells, x, y, w, h);
  // recorta a límites del mapa
  const safe = new Set();
  for (const k of cells) {
    const [cx, cy] = k.split(',').map(Number);
    if (cx >= 0 && cy >= 0 && cx < m.width && cy < m.height && m.collision[cy][cx] === 0) safe.add(k);
  }
  stampPath(m, safe, SAND);
}

function fenceH(m, x, y, len) {
  for (let i = 0; i < len; i++) {
    setDeco(m, x + i, y, i === 0 ? FENCE.H_L : (i === len - 1 ? FENCE.H_R : FENCE.H));
  }
}

function addSign(m, x, y, text) {
  setDeco(m, x, y, SIGN);
  m.signs.push({ x, y, lines: Array.isArray(text) ? text : [text] });
}

function sprinkle(m, tile, spots) {
  for (const [x, y] of spots) {
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) continue;
    if (m.collision[y][x] === 0 && m.layers.deco[y][x] === -1) m.layers.deco[y][x] = tile;
  }
}

// ---------- TORREVIEJA — pueblo costero (32×30) ----------
// Norte = LAS SALINAS (lago rosa + eras de la sal). Centro = pueblo (paseo, plazas,
// casa de la madre, mercadillo, consultorio que cura). Sur = PLAYA y MAR (preparado
// para Surf futuro) con el PUERTO DEPORTIVO. Se llega por la línea de bus de Levante
// (hueco norte): el warp de vuelta a Tetuán.

function buildTorrevieja() {
  const m = makeBase('torrevieja', 'TORREVIEJA', 32, 30);

  // Borde de arbolado del paseo, con hueco NORTE (x15-16) por donde llega/sale el
  // autobús de Levante (warp de vuelta a Tetuán).
  stampTrees(m, 0, 0, 1, 29);
  stampTrees(m, 30, 0, 31, 29);
  stampTrees(m, 2, 0, 14, 1);
  stampTrees(m, 17, 0, 29, 1);

  // === NORTE: LAS SALINAS (el LAGO SALADO ROSA icónico) + ERAS DE LA SAL ===
  // Lago rosa grande presidiendo el norte del pueblo. Es lo PRIMERO que se ve.
  stampWaterBody(m, 3, 3, 11, 5, SALT_PINK);     // lago rosa de Las Salinas
  // Orilla salada rosa-clara alrededor (decorativa, sabor de costra de sal).
  sprinkle(m, SALT_PINK_LT, [[2, 4], [2, 5], [14, 4], [14, 5], [4, 8], [9, 8], [12, 8]]);
  sprinkle(m, FLOWER, [[3, 9], [6, 9], [10, 9], [13, 9]]); // flamencos/flor rosa: acento rosado
  // ERAS DE LA SAL (lonja salinera, decorado noble) al lado del lago.
  stampBuilding(m, 17, 3, ELEGANT);              // Eras de la Sal (decorado)
  addSign(m, 16, 7, 'ERAS DE LA SAL. Montañas blancas de sal de Las Salinas. "De aquí salía la sal en barco por todo el Mediterráneo. Hoy huele a salitre y a verano." ');
  addSign(m, 8, 2, 'LAS SALINAS DE TORREVIEJA. El lago es ROSA de verdad (lo tiñen unas algas y una bacteria). "Hazte la foto, pero NO te bañes: es agua salada de la buena."');

  // === CENTRO: el pueblo — paseo, plazas, casa de la madre, mercadillo ===
  // Calle/paseo principal en cruz que baja del lago a la playa y cruza el pueblo.
  const cells = new Set();
  addRect(cells, 15, 2, 2, 13);    // bajada norte→centro (desde la parada de bus)
  addRect(cells, 5, 13, 22, 2);    // paseo central (horizontal)
  addRect(cells, 15, 15, 2, 11);   // bajada centro→playa (paseo marítimo)
  stampPath(m, cells, PATH);

  // PLAZA del pueblo (empedrado) con fuente, junto a la calle central.
  const plaza = new Set();
  addRect(plaza, 6, 9, 6, 4);
  stampPath(m, plaza, PATH);
  stampWaterBody(m, 7, 9, 3, 3);                 // fuente de la plaza (agua azul)

  // CASA DE LA MADRE de Marcelino (oeste del paseo central). La puerta (5,13) está en
  // la fila INFERIOR del edificio, con el paseo (y14) libre justo debajo para entrar.
  // Se enlaza al interior `casa_madre_torrevieja` vía wireTorreviejaEntry.
  stampBuilding(m, 3, 9, HOUSE_BIG);             // casa de la madre (puerta 5,13)
  addSign(m, 2, 14, 'CASA DE MARILYN, LA MADRE DE MARCELINO. Macetas con geranios y un toldo a rayas. "Si la puerta está abierta, es que está esperándote con la comida hecha."');

  // MERCADILLO / casa baja del pueblo costero (vecinos, veraneantes).
  stampBuilding(m, 22, 9, HOUSE);                // mercadillo (vecinos)
  addSign(m, 21, 12, 'MERCADILLO DE TORREVIEJA. "Los jueves y domingos: toallas, hamacas, fruta y el sombrero de paja que SIEMPRE acabas comprando."');

  // CONSULTORIO costero (CURACIÓN secundaria del pueblo). Reutiliza la fachada del
  // Centro Pokémon; su interior es `consultorio_torrevieja`. La madre también cura
  // (en su casa), pero el consultorio del paseo da curación cómoda junto a la playa.
  stampBuilding(m, 25, 16, PKMN_CENTER);         // Consultorio del paseo (puerta 26,19)
  addSign(m, 25, 19, 'CONSULTORIO DEL PASEO. "Curación de bichos y crema solar factor 50. En verano hay cola; trae paciencia y un abanico."');

  // CHIRINGUITO / heladería en el paseo (ambiente; el heladero es un NPC).
  stampBuilding(m, 8, 16, HOUSE);                // chiringuito-heladería
  addSign(m, 7, 19, 'CHIRINGUITO "EL SALERO". Horchata, helado de turrón y bravas. "El cartel de cerrado es decorativo: aquí no cierran ni con temporal."');

  // === SUR: PLAYA + MAR (preparado para Surf futuro) + PUERTO DEPORTIVO ===
  // ARENA de playa ancha en el sur, y MAR abierto al borde inferior (colisiona).
  stampBeach(m, 2, 22, 28, 3);
  stampWaterBody(m, 2, 25, 28, 5, WATER);        // MAR mediterráneo (Surf futuro)
  // EMBARCADERO de madera asomando al mar (preparación visible para cruzar con Surf).
  fenceH(m, 14, 24, 4);                          // pantalán del puerto deportivo
  addSign(m, 13, 23, 'PUERTO DEPORTIVO DE TORREVIEJA. Veleros, gaviotas y el faro al fondo. "Dicen que algún día se podrá cruzar el mar a nado... con el Pokémon adecuado." (MO Surf, futuro.)');
  addSign(m, 18, 23, 'PLAYA DE LOS LOCOS / LA MATA. Arena fina, banderita verde. "Sombrilla clavada a las 8, sitio para toda la vida. Reglas del veraneo levantino."');

  // Detalles del paseo: arbolado, vallas, flores.
  stampTree(m, 28, 12);
  stampTree(m, 4, 20);
  fenceH(m, 20, 21, 6);                           // barandilla del paseo marítimo
  sprinkle(m, FLOWER, [[12, 13], [19, 13], [11, 16], [24, 13]]);
  sprinkle(m, FLOWER_Y, [[6, 14], [27, 14], [10, 20], [23, 16]]);
  sprinkle(m, BUSH, [[2, 12], [29, 16], [13, 16], [27, 21]]);

  // GUIÑO a la facción de Levante (Ann Jou / Ramiro son de aquí). Cartel de ambiente,
  // SIN combate (esos personajes viven en liga.js/gyms.js). Cariñoso, sin PII.
  addSign(m, 17, 13, 'CASINO-CHIRINGUITO "EL AS DE LEVANTE". Aquí la peña de Torrevieja juega al póker y cambia cartas de One Piece. "Si ves a Ramiro repartir, cuenta tus cartas DOS veces."');

  addSign(m, 15, 2, 'BIENVENIDO A TORREVIEJA (Alicante) — Costa del Levante. "Salinas rosas, playa, paseo y la mejor madre del mundo. Aquí el verano no se acaba nunca. Disfruta."');

  torreviejaData(m);
  return m;
}

function torreviejaData(m) {
  // Encuentros de costa levantina: fauna de playa/agua salada, nivel medio-bajo
  // (zona opcional de "visita a la madre", amable). Sin Pokémon de agua jugables aún
  // (el mar es Surf futuro): los encuentros van por la arena/matojos del paseo.
  m.encounters = [
    { species: 16, min: 7, max: 10, weight: 30 },  // Pidgey (gaviotas del paseo)
    { species: 21, min: 7, max: 10, weight: 24 },  // Spearow (pájaro de costa)
    { species: 27, min: 7, max: 11, weight: 20 },  // Sandshrew (arena de playa)
    { species: 98, min: 7, max: 11, weight: 16 },  // Krabby (orilla/rocas) — sabor de mar
    { species: 22, min: 9, max: 12, weight: 10 },  // Fearow (raro, sobre el mar)
  ];
  // Warp de VUELTA a Tetuán (la parada del bus). El toX/toY se rellena al enganchar
  // en wireTorreviejaEntry para clavarlo justo encima de la parada de Tetuán.
  m.warps = [
    { x: 15, y: 0, toMap: 'tetuan', toX: 1, toY: 1, dir: 'up' },
    { x: 16, y: 0, toMap: 'tetuan', toX: 1, toY: 1, dir: 'up' },
  ];
  m.npcs = TORREVIEJA_NPCS;
  m.playerSpawn = { x: 15, y: 3 };
  m.healSpawn = { x: 26, y: 20 };
}

const TORREVIEJA_NPCS = [
  // Pescador del puerto (ambiente costero). Charla cariñosa del veraneo levantino.
  {
    id: 'pescador_torrevieja', sprite: 'fisher', x: 16, y: 23, dir: 'down', roam: false,
    dialog: [
      'Buenas, mozo. ¿Vienes a ver a tu madre? Marilyn anda preguntando por ti TODO el verano, que lo sepas.',
      'Yo aquí, echando la caña en el pantalán. El mar de Torrevieja es de los buenos: salado, calentito y con su brisa de poniente.',
      'Dicen que algún día se cruzará a nado hasta esa isla del fondo... con el bicho adecuado. Yo, de momento, con la barca y la paciencia.',
    ],
  },
  // Heladero del chiringuito "El Salero" (ambiente). Cariñoso, de pueblo de veraneo.
  {
    id: 'heladero_torrevieja', sprite: 'shopkeeper_m', x: 9, y: 15, dir: 'down', roam: false,
    dialog: [
      '¡Helado de turrón, horchata fresquita y bravas! El chiringuito "El Salero" no cierra ni en septiembre, chaval.',
      'Tú eres el hijo de Marilyn, ¿a que sí? Se te ve el aire. Llévale un cucurucho de fresa, que es el que le gusta.',
      'Y ponte crema, anda, que vienes de Madrid blanco como la sal de las eras. ¡Aquí el sol levantino no perdona!',
    ],
  },
  // Veraneante con flotador (ambiente alegre). Roam por el paseo.
  {
    id: 'veraneante_torrevieja', sprite: 'lass', x: 20, y: 14, dir: 'left', roam: true,
    dialog: [
      '¿Has visto el lago rosa de Las Salinas? ¡Es rosa de verdad! Mi madre dice que es por unas algas, pero yo creo que es magia.',
      'Nosotros venimos cada verano. Sombrilla a las ocho, baño, chiringuito y siesta. ¡El plan perfecto del Levante!',
    ],
  },
  // Veraneante mayor en el paseo (ambiente). Charla del pueblo y la sal.
  {
    id: 'abuelo_paseo_torrevieja', sprite: 'elder_m', x: 24, y: 14, dir: 'down', roam: false,
    dialog: [
      'Yo de joven trabajé en las eras de la sal, ¿sabes? Cargando sacos al barco. Duro, pero el pueblo entero olía a mar.',
      'Ahora me siento en el paseo a ver el atardecer sobre Las Salinas. El cielo se pone del color del lago. No hay postal que lo iguale.',
    ],
  },
  // Guiño a la facción de Levante (turbios del póker): NPC de ambiente charlando del
  // casino-chiringuito. SIN combate (Ramiro/Ann Jou viven en liga.js/gyms.js).
  {
    id: 'jugador_levante_torrevieja', sprite: 'gentleman', x: 18, y: 14, dir: 'left', roam: false,
    dialog: [
      'En "El As de Levante" se juega fuerte, amigo. Aquí la peña de Torrevieja vive del póker y de cambiar cartas de One Piece.',
      'Ramiro repartiendo es de los que siempre tiene un as guardado. Y Ann Jou presume de haber cambiado un Luffy por tres del doble. Cosas de Levante.',
      'Tú a lo tuyo: ve a ver a tu madre, hazte la foto en el lago rosa y báñate en Los Locos. El casino déjalo para los turbios. ',
    ],
  },
  // Niña del paseo (ambiente).
  {
    id: 'nina_torrevieja', sprite: 'youngster', x: 11, y: 14, dir: 'down', roam: true,
    dialog: [
      'En la arena de la playa salen Sandshrew, ¡los he visto cavar! Y en las rocas del puerto hay Krabby que pellizcan. ¡Cuidado con los dedos!',
      '¿A que el lago es rosa de mentira? ¡Pues no! Es rosa rosa. Mi abuela dice que es la sal y los flamencos. Yo solo veo gaviotas, pero mola igual.',
    ],
  },
];

// ---------- TORREVIEJA — interiores ----------
// Constantes de tiles de interior (idénticas a interiors.js/areaBercero.js).
const I_WALL = 2574;
const I_WALL_WINDOW = 2580;
const I_FLOOR_WOOD = 3462;
const I_FLOOR_TILE = 2613;
const I_CARPET = 2601;
const I_MAT = 2616;
const I_TABLE = 2701;
const I_SHELF = 3148;
const I_CABINET = 3335;
const I_PLANT = 658;

function makeRoom(id, name, width, height, floor) {
  const m = {
    id, name, width, height,
    layers: {
      ground: mat(width, height, floor),
      deco: mat(width, height, -1),
      overhead: mat(width, height, -1),
    },
    collision: mat(width, height, 0),
    tallGrass: mat(width, height, 0),
    encounters: [], warps: [], npcs: [], signs: [],
    playerSpawn: { x: 0, y: 0 }, healSpawn: { x: 0, y: 0 },
    isInterior: true,
  };
  for (let x = 0; x < width; x++) {
    m.layers.ground[0][x] = I_WALL;
    m.layers.ground[1][x] = (x % 3 === 1) ? I_WALL_WINDOW : I_WALL;
    m.collision[0][x] = 1;
    m.collision[1][x] = 1;
  }
  for (let y = 0; y < height; y++) {
    m.collision[y][0] = 1;
    m.collision[y][width - 1] = 1;
  }
  for (let x = 0; x < width; x++) m.collision[height - 1][x] = 1;
  const matX = Math.floor(width / 2);
  const matY = height - 1;
  m.layers.deco[matY][matX] = I_MAT;
  m.collision[matY][matX] = 0;
  return { m, matX, matY };
}

function iSetSolid(m, x, y, tile) {
  m.layers.deco[y][x] = tile;
  m.collision[y][x] = 1;
}

function iAddSign(m, x, y, text, backing = I_CABINET) {
  if (m.layers.deco[y][x] === -1) m.layers.deco[y][x] = backing;
  m.collision[y][x] = 1;
  m.signs.push({ x, y, lines: Array.isArray(text) ? text : [text] });
}

function iLinkExit(m, matX, matY, exit) {
  m.warps.push({ x: matX, y: matY, toMap: exit.map, toX: exit.x, toY: exit.y, dir: exit.dir || 'down' });
  m.playerSpawn = { x: matX, y: matY - 1 };
  m.healSpawn = { x: matX, y: matY - 1 };
}

// CASA DE LA MADRE — Marilyn Parada es la NPC central. Cura el equipo (como el
// padre en Bercero / Mamá en Tetuán) y da un objeto con cariño. Parodia cariñosa de
// la madre costera: comida hecha, toldo a rayas, fotos del lago rosa.
function buildCasaMadre(exit) {
  const { m, matX, matY } = makeRoom('casa_madre_torrevieja', 'CASA DE LA MADRE', 9, 8, I_FLOOR_TILE);
  iLinkExit(m, matX, matY, exit);

  // Mobiliario de casa costera: aparador con fotos, mesa puesta, plantas, alfombra.
  iSetSolid(m, 1, 2, I_CABINET);   // aparador con la vajilla buena
  iSetSolid(m, 2, 2, I_SHELF);     // vitrina con fotos del lago rosa y de la familia
  iSetSolid(m, 7, 3, I_TABLE);     // mesa puesta (siempre con comida)
  m.layers.deco[5][4] = I_CARPET;  // alfombra del salón
  m.layers.deco[5][5] = I_CARPET;
  m.layers.deco[4][1] = I_PLANT;   // maceta de geranios

  // MARILYN PARADA — la MADRE. NPC central. Cura el equipo (heal). Diálogo cariñoso
  // de madre levantina. Da un objeto con cariño en el diálogo (narrativo).
  m.npcs.push({
    id: 'marilyn_parada', sprite: 'marilyn_parada', x: 4, y: 4, dir: 'down', roam: false, heal: true,
    dialog: [
      '¡Mi niño! ¡Pero si has venido a Torrevieja! Ven, ven, dame un abrazo. Estás flaco, ¿comes bien en Madrid? Anda, siéntate que te curo a esos bichitos y te pongo un plato.',
      'Ya te he hecho arroz a banda y una ensalada con tomate de la huerta. Y de postre, helado de turrón del Salero. Aquí no se va nadie con hambre, y menos mi hijo.',
      'Toma, llévate esto: te he preparado una bolsa con fruta, agua y crema solar. "Una madre previene." Y no te olvides de hacerte la foto en el lago rosa, que sales guapísimo.',
      '...¡Listo! Tu equipo está como nuevo, curado por mamá, que es gratis y con todo el cariño del mundo. Ahora ve a la playa, salúdame al del chiringuito y vuelve para la cena. ¡Y ponte el sombrero!',
    ],
  });
  iAddSign(m, 7, 2, 'FOTOS DE LA FAMILIA — Marcelino de pequeño en la playa de Los Locos, la madre en el lago rosa, comidas de verano en el paseo... "Esta de ti dormido en la hamaca la enseño a las visitas." — mamá.');
  return m;
}

// ---------- export ----------

export const TORREVIEJA_MAPS = {
  torrevieja: buildTorrevieja(),
};

// Engancha la zona Torrevieja al mundo de forma 100% ADITIVA. Hace TRES cosas, todas
// sobre tiles libres y sin reorganizar ningún mapa existente:
//   1) registra el interior `casa_madre_torrevieja` y lo cablea con la puerta (5,12).
//   2) añade una SEGUNDA línea de bus en Tetuán (línea de LEVANTE): un cartel + un
//      NPC conductor sobre tiles LIBRES de la plaza de Tetuán (DISTINTOS de los que
//      usa Bercero), y un warp de ida a Torrevieja clavado en ese tile. Es el ÚNICO
//      punto de viaje a Torrevieja.
//   3) clava el warp de VUELTA (Torrevieja norte → ese mismo tile de Tetuán).
//
// IMPORTANTE: NO toca los warps norte/sur de Tetuán, ni su layout, ni la línea de
// Bercero. Solo añade warps nuevos en tiles que verificamos libres (sin colisión,
// sin hierba, sin deco, sin otro warp — incluido el de Bercero).
export function wireTorreviejaEntry(maps) {
  const tor = maps.torrevieja;

  // (1) interior de Torrevieja: casa de la madre. El warp de salida del interior
  // devuelve al jugador al PASEO (5,14), justo debajo de la puerta (5,13).
  if (!maps.casa_madre_torrevieja) {
    maps.casa_madre_torrevieja = buildCasaMadre({ map: 'torrevieja', x: 5, y: 14, dir: 'down' });
  }
  // Puerta de Torrevieja (pisable + warp de ida al interior). La puerta (5,13) está
  // en la fila inferior del edificio; al pisarla desde el paseo (5,14) entra. Idempotente.
  if (tor && maps.casa_madre_torrevieja) {
    const dx = 5, dy = 13, interior = 'casa_madre_torrevieja';
    if (tor.collision[dy]) tor.collision[dy][dx] = 0;
    if (tor.tallGrass && tor.tallGrass[dy]) tor.tallGrass[dy][dx] = 0;
    const dest = maps[interior].playerSpawn || { x: 4, y: 6 };
    if (!tor.warps.some((w) => w.x === dx && w.y === dy)) {
      tor.warps.push({ x: dx, y: dy, toMap: interior, toX: dest.x, toY: dest.y, dir: 'up' });
    }
  }

  // (2)+(3) Línea de bus de LEVANTE en Tetuán → Torrevieja (ida) y vuelta.
  const tet = maps.tetuan;
  if (!tet || !tor) return;

  // Tile de la parada de bus de Levante: tiles libres de la plaza de Tetuán DISTINTOS
  // de los que ocupa la línea de Bercero (Bercero usa ~22,30). Probamos candidatos a
  // la DERECHA de la plaza y cogemos el primero realmente libre (sin colisión, sin
  // hierba, sin deco, sin NINGÚN warp existente — incluidos los de Bercero).
  const isFree = (cx, cy) => {
    if (cy >= tet.height || cx >= tet.width || cx < 0 || cy < 0) return false;
    const blocked = tet.collision[cy] && tet.collision[cy][cx] === 1;
    const grass = tet.tallGrass && tet.tallGrass[cy] && tet.tallGrass[cy][cx] === 1;
    const hasWarp = (tet.warps || []).some((w) => w.x === cx && w.y === cy);
    const hasDeco = tet.layers.deco[cy] && tet.layers.deco[cy][cx] !== -1;
    return !blocked && !grass && !hasWarp && !hasDeco;
  };
  const candidates = [[26, 30], [27, 30], [25, 30], [28, 30], [24, 30], [29, 30], [26, 29]];
  let stopX = null, stopY = null;
  for (const [cx, cy] of candidates) {
    if (isFree(cx, cy)) { stopX = cx; stopY = cy; break; }
  }
  if (stopX === null) return; // sin tile libre seguro → no enganchamos (build sigue OK)

  // Cartel de la línea de Levante (en un tile ADYACENTE libre, para no tapar el warp).
  const signSpots = [[stopX + 1, stopY], [stopX - 1, stopY], [stopX, stopY - 1]];
  for (const [sx, sy] of signSpots) {
    if (sx < 0 || sy < 0 || sx >= tet.width || sy >= tet.height) continue;
    const blocked = tet.collision[sy] && tet.collision[sy][sx] === 1;
    const hasDeco = tet.layers.deco[sy] && tet.layers.deco[sy][sx] !== -1;
    const hasWarp = (tet.warps || []).some((w) => w.x === sx && w.y === sy);
    if (!blocked && !hasDeco && !hasWarp) {
      tet.layers.deco[sy][sx] = SIGN;
      tet.collision[sy][sx] = 1;
      tet.signs.push({
        x: sx, y: sy,
        lines: ['ESTACIÓN DE AUTOBUSES — Línea LEVANTE: Madrid ⇄ TORREVIEJA (Alicante). "Vete a la costa a ver a tu madre, al lago rosa y a la playa. El verano no espera."'],
      });
      break;
    }
  }

  // NPC conductor del bus de Levante (charla de ambiente; el viaje lo hace el warp).
  if (!tet.npcs.some((n) => n.id === 'conductor_bus_torrevieja')) {
    const npcSpots = [[stopX, stopY - 1], [stopX + 1, stopY - 1], [stopX - 1, stopY - 1]];
    for (const [nx, ny] of npcSpots) {
      if (nx < 0 || ny < 0 || nx >= tet.width || ny >= tet.height) continue;
      const blocked = tet.collision[ny] && tet.collision[ny][nx] === 1;
      const hasNpc = (tet.npcs || []).some((n) => n.x === nx && n.y === ny);
      if (!blocked && !hasNpc) {
        tet.npcs.push({
          id: 'conductor_bus_torrevieja', sprite: 'gentleman', x: nx, y: ny, dir: 'down', roam: false,
          dialog: [
            'Buenas. ¿El de Levante, a Torrevieja? Súbete, majo, que vamos llenos de gente con sombrero y nevera de playa.',
            'Torrevieja, Alicante. Cinco horas y aparece el mar, las salinas rosas y el olor a salitre. Tu madre estará esperándote con la comida hecha, ya verás.',
            'Pisa el escalón del autobús (esa baldosa de ahí) y te llevo a la costa. Para volver, el mismo bus desde el paseo del pueblo.',
          ],
        });
        break;
      }
    }
  }

  // Warp de IDA: Tetuán (tile de la parada de Levante) → Torrevieja (spawn norte).
  if (!tet.warps.some((w) => w.x === stopX && w.y === stopY)) {
    tet.warps.push({ x: stopX, y: stopY, toMap: 'torrevieja', toX: tor.playerSpawn.x, toY: tor.playerSpawn.y, dir: 'down' });
  }
  // Warp de VUELTA: Torrevieja (borde norte x15-16) → Tetuán (justo encima de la parada).
  const backX = stopX;
  const backY = Math.max(0, stopY - 1);
  for (const w of tor.warps) {
    if (w.toMap === 'tetuan') { w.toX = backX; w.toY = backY; }
  }
}
