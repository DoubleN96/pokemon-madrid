// Módulo E (EXTENSIÓN) — Zona nueva: RUTA 3 (Gran Vía) + PARQUE DEL RETIRO.
//
// Fichero AUTÓNOMO y aditivo: NO modifica maps.js, interiors.js ni otras escenas.
// Exporta `EXTRA_MAPS` (mismo formato que MAPS de maps.js) para que el
// orquestador lo fusione con MAPS cuando enganche los warps (ver bloque final).
//
// Coherencia con el lore (docs/SPEC-POKEMON-PISO.md §4):
//   - GRAN VÍA aparece como localización canónica de Madrid en el juego.
//   - PARQUE DEL RETIRO (Palacio de Cristal) también es localización canónica;
//     aquí es la zona de hierba alta con entrenadores castizos.
// Progresión: va DESPUÉS de Chamberí (3.ª ciudad), así que niveles ~8-15.
//
// IMPORTANTE sobre tiles: maps.js NO exporta sus helpers/constantes internas,
// así que este módulo REPLICA las constantes y funciones de construcción que
// necesita (mismos índices de tile y misma lógica de autotile/edificios). Esto
// mantiene el fichero independiente sin tocar maps.js. Si en el futuro maps.js
// exportara esos helpers, este módulo podría importarlos y borrar las copias.

// ---------- constantes de tileset (idénticas a maps.js) ----------

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
const ELEGANT = {
  w: 6, h: 5, overheadRows: 1,
  tiles: [
    [30, 31, 31, 31, 31, 35], [143, 144, 144, 144, 144, 148], [256, 257, 258, 144, 260, 261],
    [369, 370, 371, 372, 373, 374], [482, 483, 484, 485, 486, 487]],
};
// Edificio de GIMNASIO (4×4) — IDÉNTICO al GYM de maps.js (fachada cívica del MART
// para que se lea como edificio público, no vivienda). Aquí se usa para los
// gimnasios 5-8 de la zona nueva (Ruta 3 · Gran Vía y Parque del Retiro). La puerta
// es la baldosa caminable justo DEBAJO del edificio: la libera wireGymDoors (maps.js)
// recorriendo GYM_LINKS, igual que con los gimnasios 1-4 de Tetuán/Chamberí.
const GYM = {
  w: 4, h: 4, overheadRows: 1,
  tiles: [[26, 27, 27, 29], [139, 140, 141, 142], [252, 253, 254, 255], [361, 362, 367, 368]],
};

// ---------- helpers de construcción (idénticos a maps.js) ----------

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

// ---------- RUTA 3 — GRAN VÍA (22×34) ----------
// Tramo urbano que baja desde Chamberí hacia el Parque del Retiro. Avenida ancha
// de acera (Gran Vía), un par de jardincillos con hierba y entrenadores castizos.

function buildRuta3() {
  const m = makeBase('ruta3', 'RUTA 3 · GRAN VÍA', 22, 34);
  // Bordes de árboles con hueco NORTE (x10-11, hacia Chamberí) y SUR (x10-11, hacia el Retiro).
  stampTrees(m, 0, 0, 1, 33);
  stampTrees(m, 20, 0, 21, 33);
  stampTrees(m, 2, 0, 9, 2);
  stampTrees(m, 12, 0, 19, 2);
  stampTrees(m, 2, 31, 9, 33);
  stampTrees(m, 12, 31, 19, 33);

  // Gran Vía: avenida principal en zigzag suave (acera clara).
  const cells = new Set();
  addRect(cells, 10, 0, 2, 9);     // bajada desde Chamberí
  addRect(cells, 5, 7, 7, 2);      // tramo oeste (escaparates)
  addRect(cells, 5, 7, 2, 12);     // bajada oeste
  addRect(cells, 5, 17, 12, 2);    // travesía central (Callao)
  addRect(cells, 15, 17, 2, 9);    // bajada este
  addRect(cells, 10, 24, 7, 2);    // recodo final
  addRect(cells, 10, 24, 2, 9);    // bajada al Retiro
  stampPath(m, cells, PATH);

  // Fachadas de la Gran Vía (cines, comercios) — solo decorado, sin interior.
  stampBuilding(m, 13, 3, ELEGANT);     // Cine Callao (marquesina)
  stampBuilding(m, 2, 10, HOUSE_BIG);   // Edificio Metrópolis (fachada)
  stampBuilding(m, 17, 9, HOUSE);       // Vodevil / tienda de vapeo de Jesús (guiño)
  stampBuilding(m, 2, 22, HOUSE);       // Telefónica (fachada)

  // GIMNASIOS de la Liga (zona nueva). El interior se enlaza en wireGymDoors
  // (GYM_LINKS, maps.js). La puerta = baldosa caminable justo debajo del edificio.
  // GIM 5 · NOTARÍAS (Blanca) — plaza central oeste, puerta (8,14).
  stampBuilding(m, 7, 10, GYM);
  addSign(m, 7, 14, 'GIMNASIO NOTARÍAS — Líder: BLANCA. "Te gano con cariño y jurisprudencia. ¿Firmas el consentimiento para perder?" Medalla: Contrato.');
  // GIM 8 · CUARTEL TEAM SCHIZO (Adrián Barrera) — plaza central este, puerta (14,14).
  // El penúltimo reto, el más duro: la base del villano.
  stampBuilding(m, 13, 10, GYM);
  addSign(m, 16, 14, 'CUARTEL DEL TEAM SCHIZO — Líder: ADRIÁN BARRERA. "El caos se acabó. Aquí se impone el ORDEN PERFECTO." Medalla: Orden. (El más duro.)');

  // Jardincillos con hierba alta (encuentros urbanos).
  stampTallGrass(m, 3, 4, 4, 5);
  stampTallGrass(m, 16, 20, 4, 6);
  stampTallGrass(m, 7, 26, 6, 3);
  stampTree(m, 18, 26);
  stampPond(m, 6, 28, 3, 3);            // fuente de la acera

  sprinkle(m, FLOWER, [[4, 9], [17, 26], [12, 16], [9, 25]]);
  sprinkle(m, FLOWER_Y, [[8, 6], [19, 19], [3, 21], [13, 30]]);
  sprinkle(m, BUSH, [[2, 16], [19, 16], [9, 30], [12, 29]]);

  addSign(m, 11, 3, 'GRAN VÍA — "El Broadway madrileño". Abajo, el PARQUE DEL RETIRO. "Mucho neón, mucho turisteo y mucho carterista. Agarra la mochila."');
  addSign(m, 12, 16, 'PLAZA DEL CALLAO. "Pantallas gigantes, gente haciéndose fotos y un Pokémon salvaje colándose entre las piernas. Esto es Madrid."');
  addSign(m, 16, 9, 'VAPE SHOP "LA NUBE DE LUXEMBURGO". "Franquicia de Jesús la Rata. Sabores: fresa tóxica, cundo y derrota ajena."');
  addSign(m, 3, 21, 'EDIFICIO TELEFÓNICA. "El primer rascacielos de Europa, dicen. Ahora solo da cobertura para que te entre el WhatsApp del casero."');
  ruta3Data(m);
  return m;
}

function ruta3Data(m) {
  // Encuentros urbanos: fauna de calle de Madrid, niveles 8-12 (post-Chamberí).
  // Curva: Gran Vía es zona MEDIA-TARDÍA (tras gimnasios 1-4 ~L30, gimnasios 5/8 aquí L32-48).
  m.encounters = [
    { species: 20, min: 22, max: 26, weight: 30 },  // Raticate (la rata de Gran Vía, ya crecidita)
    { species: 17, min: 22, max: 26, weight: 28 },  // Pidgeotto (palomas de Callao)
    { species: 53, min: 24, max: 28, weight: 22 },  // Persian (gato callejero ladrón)
    { species: 22, min: 22, max: 26, weight: 15 },  // Fearow (gorriones bordes)
    { species: 110, min: 24, max: 28, weight: 5 },  // Weezing (humo de la avenida)
  ];
  // Warps: NORTE → Chamberí (su hueco sur), SUR → Parque del Retiro.
  // NOTA: el toX/toY del lado de Chamberí los rellena el orquestador al enganchar
  // (Chamberí aún no tiene salida sur). Aquí dejamos un destino tentativo coherente.
  m.warps = [
    { x: 10, y: 0, toMap: 'chamberi', toX: 14, toY: 26, dir: 'up' },
    { x: 11, y: 0, toMap: 'chamberi', toX: 15, toY: 26, dir: 'up' },
    { x: 10, y: 33, toMap: 'retiro', toX: 9, toY: 1, dir: 'down' },
    { x: 11, y: 33, toMap: 'retiro', toX: 10, toY: 1, dir: 'down' },
  ];
  m.npcs = RUTA3_NPCS;
  m.playerSpawn = { x: 10, y: 2 };
  m.healSpawn = { x: 10, y: 2 };
}

const RUTA3_NPCS = [
  // Juan Carlos "el Guapo" — aspirante a Julio Iglesias, narrador/galán pringado.
  // Trainer ligero y cómico: Jigglypuff que canta y duerme al rival.
  {
    id: 'juancarlos_guapo', sprite: 'guitarist', x: 7, y: 7, dir: 'right', roam: false,
    trainer: {
      name: 'JUAN CARLOS "EL GUAPO"',
      title: 'Aspirante a Julio Iglesias',
      party: [
        { species: 39, level: 9 },   // Jigglypuff (canta pero adormece al público)
        { species: 39, level: 10 },  // Jigglypuff (el bis, que el público pide más)
      ],
      intro: [
        '*se atusa el tupé bajo el neón de la Gran Vía* Ah, mira quién baja por mi avenida. El gran Marcelino. Permíteme que TE NARRE tu propia derrota, con pasión.',
        'Modelo, cantante, galán... y, todo hay que decirlo, alma que no se come una rosca. Pero en la tarima, amigo, AQUÍ mando yo.',
        'Mi Jigglypuff te va a cantar una balada. Si te duermes, pierdes. Si lloras, también. Y créeme: vas a llorar de emoción. ¡Que empiece el espectáculo!',
      ],
      win: [
        '*se le descuadra el tupé* Inaudito. El público... digo, el combate... no estaba preparado para tanto talento tuyo.',
        'Está bien, está bien. Yo narro tu victoria con la misma pasión con que narraría la mía. "Y Marcelino venció en la Gran Vía...". ¡Suena a peliculón!',
      ],
      defeat: [
        '*lanza un beso al cielo de Madrid* ¡Y el Guapo se sale con la suya UNA VEZ MÁS! Esto va por mis fans, los dos que tengo.',
        'Anda, ve a ensayar, figura. Cuando vuelvas te dedico una canción. De despedida, claro.',
      ],
      prize: 540,
      flag: 'juancarlos_ruta3',
    },
  },
  // Maura — celestina cubana, controla la noche con salsa y reparto.
  // NPC de charla (sin combate): da ambiente y un consejo de "networking".
  {
    id: 'maura_celestina', sprite: 'lass', x: 14, y: 18, dir: 'left', roam: true,
    dialog: [
      '¡Mi niño, Marcelino! ¿Pa\'l Retiro vas? Espérate, que te presento a alguien... yo a ti te veo soltero de equipo, te falta química en la party.',
      'Que yo de esto sé un rato: la salsa, el reparto y juntar a la gente. A tu Dana te la presenté yo, no se te olvide, ¿eh?',
      'Tú entra en la hierba con los oídos abiertos, que entre el ruido de la Gran Vía hay bichos buenos escondidos. ¡Y ponle ritmo, papi, que sin ritmo no se atrapa na\'!',
    ],
  },
  // Carterista de Gran Vía (entrenador "ratero" castizo, fauna urbana).
  {
    id: 'carterista_granvia', sprite: 'pokemaniac', x: 17, y: 23, dir: 'down', roam: false,
    trainer: {
      name: 'EL TRILERO',
      title: 'Artista del Trapicheo',
      party: [
        { species: 19, level: 10 },  // Rattata
        { species: 52, level: 11 },  // Meowth (uñas largas para el bolsillo ajeno)
      ],
      intro: [
        '¿Dónde está la bolita, jefe? ¿Aquí? ¿Allá? Ponga 20 pavos y... ah, que usté es de los listos. Pues entonces combatimos, que de algo hay que vivir.',
        'En la Gran Vía o me das tu cartera o me das tu equipo Pokémon. Elija usted, que soy un caballero del trapicheo.',
      ],
      win: [
        '¡Ozú, qué manos tiene el muchacho! Vale, vale, hoy no pico. Tome, su premio, todo legal por una vez.',
        'Y agárrese la mochila al salir, que aquí hasta los Meowth roban. Mire el mío.',
      ],
      defeat: [
        '*hace desaparecer una pokéball entre los dedos* La banca siempre gana, primo. Y en Gran Vía, la banca soy yo.',
        'Vuelva cuando sepa dónde está la bolita. Pista: nunca está.',
      ],
      prize: 480,
      flag: 'trilero_ruta3',
    },
  },
  // Guiri turista (charla cómica de ambiente).
  {
    id: 'guiri_callao', sprite: 'youngster', x: 9, y: 17, dir: 'up', roam: true,
    dialog: [
      'Oh! Spanish trainer! I luv Madrid, mucho calor, mucha fiesta, ¿sí? I look for the... ¿cómo se dice... Retiro Park?',
      'Down there, ¿no? Beautiful Pokémon in the grass, they tell me. But careful with the... ¿gato? The Meowth, he steal my hat. Twice!',
    ],
  },
];

// ---------- PARQUE DEL RETIRO (32×32) ----------
// El gran parque verde: hierba alta por todas partes, estanque, Palacio de
// Cristal y dos entrenadores castizos de peso (Eduardo el avaro, Álvaro Benito
// el cenizo). Es la zona "salvaje" densa de la zona nueva.

function buildRetiro() {
  const m = makeBase('retiro', 'PARQUE DEL RETIRO', 32, 32);
  // Bordes de árboles. Hueco NORTE (x9-10) hacia Ruta 3. (Sur reservado para fase futura.)
  stampTrees(m, 0, 0, 1, 31);
  stampTrees(m, 30, 0, 31, 31);
  stampTrees(m, 2, 0, 8, 2);
  stampTrees(m, 11, 0, 29, 2);
  stampTrees(m, 2, 29, 29, 31);

  // Caminos de tierra del parque (paseos del Retiro).
  const cells = new Set();
  addRect(cells, 9, 0, 2, 8);      // entrada desde la Ruta 3
  addRect(cells, 4, 7, 14, 2);     // paseo horizontal norte
  addRect(cells, 16, 7, 2, 18);    // paseo del estanque (este)
  addRect(cells, 6, 23, 14, 2);    // paseo horizontal sur
  addRect(cells, 6, 14, 2, 11);    // paseo oeste (al Palacio de Cristal)
  addRect(cells, 18, 14, 8, 2);    // ramal al Palacio
  stampPath(m, cells, DIRT);

  // Estanque grande del Retiro (el del Monumento a Alfonso XII).
  stampPond(m, 19, 9, 6, 5);
  // Palacio de Cristal (edificio elegante de cristal).
  stampBuilding(m, 24, 17, ELEGANT);
  // Centro Pokémon del parque (caseta de los jardineros).
  stampBuilding(m, 3, 3, PKMN_CENTER);
  // Algún árbol suelto.
  stampTree(m, 12, 25);
  stampTree(m, 26, 4);

  // GIMNASIOS de la Liga (zona nueva). Interior enlazado en wireGymDoors (GYM_LINKS).
  // La puerta = baldosa caminable justo debajo del edificio.
  // GIM 7 · MÁSTER DE MÁSTERS (Ángel) — paseo norte, puerta (21,7).
  stampBuilding(m, 20, 3, GYM);
  addSign(m, 19, 7, 'GIMNASIO MÁSTER — Líder: ÁNGEL. "Aquí nada pasa sin mi revisión. Ni tú, ni tu estrategia." Medalla: Revisión.');
  // GIM 6 · TIENDA DE TODO A CIEN (Eduardo + la Madre) — esquina sureste, puerta (24,26).
  // Doble liderazgo (te cobran por usar pociones); la Madre es la "mente maestra".
  stampBuilding(m, 23, 22, GYM);
  addSign(m, 22, 26, 'GIMNASIO TACAÑOS — Líderes: EDUARDO y SU MADRE. "Entrar: 3€. Respirar el aire: 2€. Aquí TODO se paga." Medalla: Hipoteca.');

  // HIERBA ALTA abundante (es un parque): varios prados.
  stampTallGrass(m, 3, 10, 12, 6);
  stampTallGrass(m, 19, 16, 9, 6);
  stampTallGrass(m, 9, 24, 9, 4);
  stampTallGrass(m, 26, 8, 4, 9);

  sprinkle(m, FLOWER, [[5, 9], [14, 13], [22, 23], [10, 27], [27, 18]]);
  sprinkle(m, FLOWER_Y, [[7, 12], [13, 9], [20, 22], [28, 12], [4, 26]]);
  sprinkle(m, BUSH, [[2, 18], [29, 24], [12, 28], [18, 4]]);

  addSign(m, 10, 3, 'PARQUE DEL RETIRO. "El pulmón verde de Madrid. Hierba alta por todas partes: aquí los bichos son de nivel y traen mala leche."');
  addSign(m, 18, 11, 'ESTANQUE DEL RETIRO. "Se alquilan barcas. No, no puedes pescar al Magikarp del fondo: es leyenda urbana. Probablemente."');
  addSign(m, 23, 17, 'PALACIO DE CRISTAL. "Todo cristal y luz. Como el Excel de Álvaro, pero bonito. Exposición de arte hasta que alguien lo entienda."');
  addSign(m, 13, 24, 'PASEO DE LAS ESTATUAS. "Cuidado: una de estas estatuas es Álvaro Benito dando una chapa sobre la decadencia de España. No le mires a los ojos."');
  retiroData(m);
  return m;
}

function retiroData(m) {
  // Encuentros de parque: fauna verde de nivel medio (10-15), zona post-Chamberí.
  // Curva: el Retiro es zona TARDÍA (gimnasios 7-8 aquí L44-48); fauna de nivel alto.
  m.encounters = [
    { species: 17, min: 28, max: 32, weight: 25 },  // Pidgeotto
    { species: 44, min: 28, max: 32, weight: 24 },  // Gloom (jardín)
    { species: 49, min: 30, max: 34, weight: 18 },  // Venomoth (bicho de parque)
    { species: 70, min: 30, max: 34, weight: 16 },  // Weepinbell (entre setos)
    { species: 64, min: 32, max: 36, weight: 12 },  // Kadabra (raro, místico)
    { species: 123, min: 34, max: 38, weight: 5 },  // Scyther (muy raro, el "premio")
  ];
  // Warps: NORTE → Ruta 3. (Sur queda para una fase futura: Las Ventas / Salamanca.)
  m.warps = [
    { x: 9, y: 0, toMap: 'ruta3', toX: 10, toY: 32, dir: 'up' },
    { x: 10, y: 0, toMap: 'ruta3', toX: 11, toY: 32, dir: 'up' },
  ];
  m.npcs = RETIRO_NPCS;
  m.playerSpawn = { x: 9, y: 2 };
  m.healSpawn = { x: 4, y: 5 };
}

const RETIRO_NPCS = [
  // Eduardo — el postureador avaro. Persian/Meowth (avaricia, "acumula y no comparte").
  // BALANCE: zona post-Chamberí; equipo Nv.12-14.
  {
    id: 'eduardo_avaro', sprite: 'gentleman', x: 13, y: 13, dir: 'down', roam: false,
    trainer: {
      name: 'EDUARDO',
      title: 'El del Postureo en Redes',
      party: [
        { species: 52, level: 12 },  // Meowth (monedas, "Día de Pago")
        { species: 53, level: 14 },  // Persian (la avaricia que araña)
      ],
      intro: [
        '*haciéndose un selfie con el Palacio de Cristal de fondo* Ah, Marcelino. Espera, que esto sube a stories. "Domingo de Retiro y reflexión", con esta luz quedo divino.',
        'Me encantaría ser humilde contigo, de verdad, pero sería mentirte. ¿Sabías que cobro poco pero invierto en imagen? La imagen no caduca, el sueldo sí.',
        'Te combato, pero te aviso: aquí cada poción que uses te la cobro. Como mi madre, que le cobró una Coca-Cola a Álvaro. Genética, chaval. ¡Y di patata!',
      ],
      win: [
        'Bueno... lo borro de stories y arreglado, como si no hubiera pasado. Para los seguidores, hoy NO he combatido.',
        'Toma tu premio. Y no se lo cuentes a Sofía, que como se entere de que he soltado dinero me monta un drama hasta la boda. Otra vez.',
      ],
      defeat: [
        '¡Y a esto le llamo yo rentabilidad! Tu derrota, mis stories, cero gasto. Engagement puro, primo.',
        'Vuelve cuando puedas permitirte perder con estilo. El estilo, como ves, no se regala. Ni yo lo regalo.',
      ],
      prize: 760,
      flag: 'eduardo_retiro',
    },
  },
  // Álvaro Benito — historiador cenizo, "el combate más aburrido de la historia".
  // Tipo roca/muro (Geodude/Graveler), testarudo y defensivo. Nv.13-15.
  {
    id: 'alvaro_benito_cenizo', sprite: 'scientist', x: 22, y: 19, dir: 'down', roam: false,
    trainer: {
      name: 'ÁLVARO BENITO',
      title: 'El Cenizo Historiador',
      party: [
        { species: 74, level: 13 },  // Geodude (muro aburrido)
        { species: 75, level: 15 },  // Graveler (el muro que NO se mueve)
      ],
      intro: [
        '*encorvado, despeinado, con cara de funeral* Marcelino. Antes de combatir, deja que te explique por qué España, como tu equipo, está condenada a la decadencia. Tengo aquí trece tomos.',
        'Soy interino, tengo hernia, mala suerte crónica y una opinión sobre cada monumento de Madrid. ¿Quieres que te lleve al Palacio de Cristal a que te dé una chapa de dos horas? Acompáñame.',
        'Mi estrategia es la defensa total: el aburrimiento. Te voy a ganar a base de no pasar nada hasta que te rindas del tedio. Como la historia. Empecemos... despacito.',
      ],
      win: [
        '*suspira como si cargara con el Imperio entero* Cómo no. Pierdo yo, que para variar. Cenizo hasta en el combate.',
        'Toma. Y si algún día quieres torturarte de verdad, te llevo de ruta por los monumentos. Empezamos por uno que NADIE conoce. Ese es lo bueno.',
      ],
      defeat: [
        'Lo ves. Ni con mala suerte se me gana hoy. La decadencia, amigo mío, siempre encuentra la manera de vencer. Hasta a ti.',
        'Vete a entrenar. Y de paso lee algo de Historia, anda, que se nota que no. *vuelve a su chapa, solo, mirando una estatua*',
      ],
      prize: 820,
      flag: 'alvaro_benito_retiro',
    },
  },
  // Blanca — cameo de ayuda (sin combate aquí; ya combate en Chamberí).
  // Aparece dando un "pase" burocrático para zonas futuras. Charla.
  {
    id: 'blanca_retiro_cameo', sprite: 'lass', x: 10, y: 26, dir: 'up', roam: false,
    dialog: [
      'Anda, Marcelino, qué bien que te encuentro en el Retiro. Tomaba el aire entre tanto papeleo de la Liga.',
      'Te dejo el aviso oficial, en regla: más al sur, cuando se abra la ruta, te pedirán los permisos de Las Ventas y del Barrio de Salamanca. Yo te los tramito, descuida.',
      'Y dile a Álvaro que se eche crema, que con tanto Excel y tan poca calle se va a poner del color del Palacio de Cristal. Cuídate, cielo.',
    ],
  },
  // Jardinero del parque (charla de ambiente + pista de encuentros).
  {
    id: 'jardinero_retiro', sprite: 'hiker', x: 6, y: 13, dir: 'right', roam: false,
    dialog: [
      'Yo riego esta hierba desde antes de que tú nacieras, chaval. Y mira cómo me lo pagan: bichos que pican y turistas que pisan.',
      'En los prados de la izquierda salen Oddish y algún Bellsprout. Y si tienes mucha, mucha suerte... a veces baja un Scyther de los árboles. Filo puro. Lleva pociones.',
    ],
  },
  // Niño de las barcas (charla cómica del estanque).
  {
    id: 'nino_barcas', sprite: 'youngster', x: 17, y: 14, dir: 'left', roam: true,
    dialog: [
      '¡Mi padre dice que en el fondo del estanque vive un Pokémon gigante! Yo creo que es una barca hundida, pero mola más lo del Pokémon.',
      '¿Tú tienes uno de agua? ¡Échalo aquí y a ver qué pasa! ...Bueno, mejor no, que mi madre dice que no toque el agua. Aún.',
    ],
  },
];

// ---------- export ----------

export const EXTRA_MAPS = {
  ruta3: buildRuta3(),
  retiro: buildRetiro(),
};

// ============================================================================
//  CÓMO ENGANCHAR ESTA ZONA AL MUNDO (instrucciones para el orquestador)
// ============================================================================
//
//  Esta zona NO está conectada todavía porque NO se puede tocar maps.js.
//  Para integrarla, el orquestador debe hacer DOS cosas:
//
//  1) FUSIONAR los mapas en MAPS. En maps.js, en el export final, añadir:
//
//        import { EXTRA_MAPS } from './areaExtra.js';
//        export const MAPS = {
//          tetuan: buildTetuan(),
//          ruta2: buildRuta2(),
//          chamberi: buildChamberi(),
//          ...buildInteriors(),
//          ...EXTRA_MAPS,            // <-- ruta3 + retiro
//        };
//        wireBuildingDoors(MAPS);
//
//  2) ABRIR LA SALIDA SUR DE CHAMBERÍ y conectarla con Ruta 3 (Gran Vía).
//     Chamberí (30×30) hoy se cierra entero por el sur con:
//          stampTrees(m, 2, 27, 27, 29);   // en buildChamberi()
//     Hay que dejar un HUECO de 2 tiles (p.ej. x14-15) en esa fila para la salida,
//     o cambiar esa línea por dos tramos:
//          stampTrees(m, 2, 27, 13, 29);
//          stampTrees(m, 16, 27, 27, 29);
//     y añadir un pequeño camino bajando hasta el borde (addRect en x14-15 hasta y29).
//
//     Después, AÑADIR estos warps de salida en chamberiData(m).warps (Chamberí → Ruta 3):
//          { x: 14, y: 29, toMap: 'ruta3', toX: 10, toY: 1, dir: 'down' },
//          { x: 15, y: 29, toMap: 'ruta3', toX: 11, toY: 1, dir: 'down' },
//
//     Los warps de VUELTA ya están definidos en este fichero:
//        - Ruta 3  x10-11,y0  → chamberi (toX 14-15, toY 26)  [AJUSTAR toY a la
//          coord real del hueco sur de Chamberí cuando se abra; 26 es tentativo].
//        - Ruta 3  x10-11,y33 → retiro   (toX 9-10, toY 1)
//        - Retiro  x9-10, y0  → ruta3    (toX 10-11, toY 32)
//
//  RESUMEN DEL WARP A CONECTAR:
//     DESDE  Chamberí (3.ª ciudad), borde SUR, tiles aprox. x14-15, y29
//     HACIA  Ruta 3 · Gran Vía, entrada norte x10-11, y1
//     y de Ruta 3 sur (x10-11, y33) se baja al Parque del Retiro (x9-10, y1).
//     (El borde SUR del Retiro queda reservado para la fase futura
//      Las Ventas / Barrio de Salamanca, según docs/SPEC-POKEMON-PISO.md §4.)
