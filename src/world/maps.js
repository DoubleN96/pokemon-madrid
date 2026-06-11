// Módulo E — Mapas de Madrid (Tetuán, Ruta 2, Chamberí) + interiores.
// Formato según docs/CONTRACTS.md. Índices de tile = frame Phaser del tileset
// reempaquetado `tiles` (127 col × 16 px, frame = GID del TMX de gracidea − 1).
// Paleta minada de littleroot/oldale/verdanturf/petalburg/rutas 101-102
// (ver scripts/map_tools/palette.mjs y scripts/map_tools/out/*.png).
//
// Los INTERIORES de cada edificio (casas, tiendas, centros, café, estación...)
// viven en src/world/interiors.js y se fusionan aquí en MAPS. Cada puerta del
// overworld recibe un warp de entrada (wireBuildingDoors) que clava el tile de
// la puerta y conecta con el interior; el felpudo del interior devuelve fuera.

import { buildInteriors, BUILDING_LINKS } from './interiors.js';

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

// Conecta cada puerta del overworld con su interior: libera la colisión del
// tile de la puerta (para poder pisarlo) y añade el warp de entrada. Idempotente.
function wireBuildingDoors(maps) {
  for (const link of BUILDING_LINKS) {
    const m = maps[link.door.map];
    if (!m || !maps[link.interior]) continue;
    const { x, y } = link.door;
    if (m.collision[y]) m.collision[y][x] = 0; // la puerta es pisable (warp)
    const dest = maps[link.interior].playerSpawn || { x: 1, y: 1 };
    if (!(m.warps || []).some((w) => w.x === x && w.y === y)) {
      m.warps.push({ x, y, toMap: link.interior, toX: dest.x, toY: dest.y, dir: 'up' });
    }
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
  addSign(m, 8, 11, 'BRAVO MURILLO, 37. "Aquí vive Marcelino, el Emprendedor Caótico. Llamar al telefonillo y rezar para que esté."');
  addSign(m, 17, 9, 'BAR "EL TETUÁN". Hoy: cocido completo por 12 pavos. "El tapeo sube la moral. Pasa y prueba."');
  addSign(m, 11, 27, 'ULTRAMARINOS "DON PACO". Desde 1962. "Hoy hay género fresco. Aquí no se fía, que se fió Jesús."');
  addSign(m, 15, 27, 'FARMACIA. De guardia 24 horas. "Para el burnout aún no hay pastilla. Para todo lo demás, entre."');
  addSign(m, 5, 27, 'PELUQUERÍA "MANOLI". Corte y marcado, 10 pavos. "Injertos capilares: derivamos a Luxemburgo."');
  addSign(m, 21, 17, '[M] METRO DE TETUÁN — Línea 1. "Cerrado por obras desde tiempos inmemoriales. Disculpen las molestias."');
  addSign(m, 31, 12, 'PARQUE MÓVIL DEL ESTADO — Ministerio de la Presidencia. "Acceso restringido. Vuelva cuando sea Campeón... o nunca."');
  addSign(m, 28, 23, 'PLAZA DE TETUÁN. "Ojo con la hierba alta: ahí dentro hay bichos. Trae pociones o trae suerte."');
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
  // (Mamá, la enfermera y Eduardo se han trasladado a sus INTERIORES:
  //  Mamá cura en la casa de Marcelino, la enfermera en el Centro Pokémon y
  //  Eduardo cobra en Ultramarinos. Sus tiles de puerta quedan libres como warp.)
  // Álvaro Alonso — RIVAL. Te reta nada más empezar. flag alvaro_rival_1.
  // BALANCE: primer combate del rival = UN solo Pokémon de nivel ~5-6, ganable
  // con el inicial L5 por un jugador novato cuidadoso (objetivo compartido con
  // el agente de combate). Su equipo grande llega más adelante (es el Campeón).
  {
    id: 'alvaro_rival', sprite: 'norman', x: 9, y: 12, dir: 'left', roam: false,
    trainer: {
      name: 'ÁLVARO ALONSO',
      title: 'Rival · Vicepresidente del Humo',
      party: [
        // Inicial del rival = el FUERTE contra el tuyo (mecánica clásica de Pokémon),
        // a nivel 5 (igual que tú): reñido pero justo elijas lo que elijas. Sin STAB aún.
        { species: 'RIVAL_STARTER', level: 5 },
      ],
      intro: [
        'Hombre, Marcelino. Te tenía agendado para las 9:14. Llegas con catorce segundos de retraso, lo apunto.',
        '*da una calada al cigarro* Yo trabajo veinte horas, duermo tres y me ducho en tres minutos clavados. Tú improvisas. Y la improvisación NO escala, compañero de piso.',
        'Blanca me llama en nada, así que esto va a ser un combate corto. Saco un bicho, te optimizo la derrota y cada uno a lo suyo. ¿Listo?',
      ],
      win: [
        '...Vaya. Eso no estaba en la hoja de cálculo. *otra calada, mira el cigarro como si tuviera la culpa*',
        'Lo anoto en el registro de riesgos. La improvisación me ha ganado un asalto. UNO. No te acostumbres.',
        'Disfruta el momento, anda. Yo soy el Campeón de esta Liga y te espero arriba del todo. Y paga tu parte de la luz, que la dejas encendida igual que yo el portátil.',
      ],
      defeat: [
        'Previsible. Estaba todo en el Excel. *apaga el cigarro en un cenicero que rebosa*',
        'Vuelve cuando hayas... iterado. Y entrena un poco a ese inicial, que da penita. Nos vemos, compañero.',
      ],
      prize: 500,
      flag: 'alvaro_rival_1',
    },
  },
  // Iván "FinTips" — socio/mentor financiero. Porygon en el lore.
  {
    id: 'ivan_fintips', sprite: 'gentleman', x: 8, y: 16, dir: 'down', roam: false,
    dialog: [
      'Ah, Marcelino, el visionario. ¿Ya sales a eso de "poner orden en el caos"? Muy bien, muy bien... pero dime, ¿la rentabilidad de eso cuál es exactamente?',
      'Yo lo observo todo desde la barrera, con mi cartera bien diversificada: cripto, ladrillo, un poco de rent2rent. El caos da ROI si sabes leerlo, te lo digo yo.',
      'Consejo de socio gratis, que para algo soy tu mentor: un equipo Pokémon es una cartera. Diversifica tipos, no te apalanques en un solo bicho. Y nunca, jamás, le pidas un préstamo a Eduardo.',
    ],
  },
  // Mariel — amiga venezolana de Iván FinTips. Trader hiperactiva (HFT), ludópata,
  // baila sevillanas, influencer. No te deja hablar. Entrenadora de eléctricos veloces.
  {
    id: 'mariel', sprite: 'lass', x: 11, y: 16, dir: 'left', roam: true,
    trainer: {
      name: 'MARIEL',
      title: 'La Reina del High-Frequency',
      party: [
        { species: 100, level: 6 },  // Voltorb (rápido, explosivo)
        { species: 101, level: 8 },  // Electrode (el más veloz, su "as" HFT)
      ],
      intro: [
        '¡Marceee! ¡Mi amor, qué casualidad, justo estaba rebalanceando el riesgo de mi cartera y ejecutando un arbitraje en tres exchanges a la vez, una locura, mira que el spread estaba divino pero el slippage, ay, el slippage!',
        '¿Sabes lo que es el high-frequency trading? Te lo explico: microsegundos, algoritmos, latencia, colocación de órdenes... ¡es como bailar sevillanas pero con velas japonesas! Yo voy a clases de sevillanas, ¿te lo había contado? ¡Y al casino, anoche bordé un pleno!',
        '¡Pero bueno, que me enrollo! Iván dice que soy la única que habla más rápido que sube el Bitcoin. ¡Combáteme, que te enseño lo que es la VELOCIDAD, papá!',
      ],
      win: [
        '¡NOOO, mi liquidez! Vale, vale, has sido más rápido que mi algoritmo. Respeto, respeto.',
        'Oye, ¿y si montamos un fondo juntos? Tú el caos, yo el HFT, Iván el Excel... ¡nos forramos! Ya hablamos, que me voy a sevillanas. ¡Chaooo!',
      ],
      defeat: [
        '¡JA! ¿Ves? ¡VELOCIDAD! Esto es como el casino, cariño: la banca, o sea YO, siempre gana. Vuelve cuando subas de nivel, ¡un besito!',
      ],
      prize: 720,
      flag: 'mariel_1',
    },
  },
  // José Antonio — el casero. NPC de bloqueo temático ligero (solo charla). Junto a la salida sur.
  {
    id: 'jose_antonio_casero', sprite: 'elder_m', x: 16, y: 30, dir: 'down', roam: false,
    dialog: [
      'Eh, eh, eh. Marcelino. ¿Dónde vas con tanta prisa, majo? Que estamos a día 1, no te hagas el loco.',
      'El alquiler. La calvicie es poder y el alquiler SIEMPRE sube. *se acaricia la cabeza, lisa y reluciente como una bola de billar*',
      'Anda, hoy te dejo salir porque vas a hacer cosas de Pokémon y eso da prestigio al edificio. Pero a la vuelta... el recibo, majo. El recibo.',
    ],
  },
  // Alex — el Tentado Digital. Trainer menor (Pikachu/Magnemite). Toca la guitarra → sprite guitarist.
  {
    id: 'alex_digital', sprite: 'guitarist', x: 22, y: 16, dir: 'down', roam: false,
    trainer: {
      name: 'ALEX',
      title: 'El Tentado Digital',
      party: [
        { species: 25, level: 5 },   // Pikachu (eléctrico = tecnología/IA)
        { species: 81, level: 6 },   // Magnemite
      ],
      intro: [
        '¡Marcelino, bro! Mira, justo estaba haciendo match con una chica de Liubliana... pero te combato, que yo a un plan no le digo que no JAMÁS.',
        'Programé este combate ayer mientras stalkeaba Instagram y daba mi clase del máster. Multitarea, ¿eh? Ángel me mata si se entera.',
        'Va, rapidito, que he quedado para tres planes más y todavía tengo que fingir que esta semana sí adelgazo.',
      ],
      win: [
        '¡Buah, qué owned! Vale, vale, lo desinstalo todo... el Tinder, el Bumble, el Instagram... bueno, el Instagram no.',
        'Oye, ¿te vienes luego a tocar la guitarra y a planear un Erasmus a Eslovenia? ¡Va, di que sí, que tú nunca dices que no... espera, ese soy yo!',
      ],
      defeat: [
        'Jaja, te he ganado mientras miraba el móvil. Imagínate con las dos manos, bro.',
        'Va, entrena un poco y vuelves. Yo me apunto a la revancha, como a todo.',
      ],
      prize: 320,
      flag: 'alex_tetuan',
    },
  },
  // Vecino apoyado en la fachada del Bar El Tetuán (charla de barrio).
  {
    id: 'vecino_bar', sprite: 'generic_m1', x: 13, y: 9, dir: 'right', roam: false,
    dialog: [
      'Vengo todos los días a tomar el sol a la puerta del bar. Es mi oficina, como el portal era la de Álvaro.',
      'Tú eres el del 37, ¿no? El que se va a la Liga a "poner orden". Suerte, chaval, que orden en Madrid hay poco y caro.',
      'Si entras al bar, pídete las bravas. Y dile a Manoli la peluquera que ya me toca corte, que parezco un Pidgey despeinado.',
    ],
  },
  // Niño de la plaza, sueña con ser entrenador como Marcelino (el jugador).
  {
    id: 'nino_plaza', sprite: 'youngster', x: 29, y: 30, dir: 'left', roam: true,
    dialog: [
      '¡Eh, tú! ¿Te vas a la Liga Chamberí? ¡Yo de mayor quiero ser entrenador, como tú!',
      'Mi madre dice que primero el cole, luego la hierba alta. ¡Pero yo ya tengo nombre para mi primer Pokémon!',
      '¡Cuando lo atrape, te reto aquí en la plaza! Tú entrena, que yo voy a por ti.',
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
  addSign(m, 11, 3, 'RUTA 2 — Bravo Murillo abajo, dirección CHAMBERÍ. "Tramo con entrenadores. Camina con el equipo a tono."');
  addSign(m, 16, 16, 'QUIOSCO. Prensa, cromos y pipas. "Ya están los cromos de la Liga Chamberí. El de Álvaro fumando es el raro."');
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
  // Sergio Guillén — camionero de Lavapiés. Trainer de fuerza bruta.
  // BALANCE ruta temprana: 2 Pokémon, Nv.5-6 (Snorlax es tanque, va a Nv.6).
  {
    id: 'sergio_guillen', sprite: 'hiker', x: 8, y: 22, dir: 'down', roam: false,
    trainer: {
      name: 'SERGIO',
      title: 'Camionero de la Bundesliga',
      party: [
        { species: 66, level: 5 },   // Machop (la fuerza bruta de Lavapiés)
        { species: 143, level: 6 },  // Snorlax (sobándola en la cabina del camión)
      ],
      intro: [
        '¿Una cañita y unas bravas antes del combate, majo? Que yo tengo siete días de vacaciones al año y me los gasto todos contigo. No hay huevos.',
        'Echaban La que se avecina y el Bayern a la vez, pero he parado el camión solo para zurrarte. Eso es cariño del de verdad, ¿eh?',
        'Avisa cuando estés. Mi Snorlax está sobándola en la cabina y, como el rato libre, hay que despertarlo a gritos.',
      ],
      win: [
        '¡Buah! Pues nada, otra birra que me debo. ¡Salud, campeón, que has podido con el camión y todo!',
        'Oye, ¿tú no conocerás a alguna ucraniana maja para mi hermano David? ...Digo, para un amigo. Eso, para un amigo, claro.',
      ],
      defeat: [
        '¡JA! A casa con tu madre, chaval, que esto es la Bundesliga y no la regional. *eructa con orgullo*',
        'Venga, no te enfades: te invito a una caña de consolación. Que no se diga que Sergio no es generoso... con la cerveza.',
      ],
      prize: 360,
      flag: 'sergio_ruta2',
    },
  },
  // Jesús "la Rata" — ente del caos vapeador, vuelto de Luxemburgo.
  // BALANCE ruta temprana: 2 Pokémon, Nv.6-7.
  {
    id: 'jesus_la_rata', sprite: 'pokemaniac', x: 14, y: 34, dir: 'up', roam: false,
    trainer: {
      name: 'JESÚS "LA RATA"',
      title: 'El que volvió de Luxemburgo',
      party: [
        { species: 92, level: 6 },   // Gastly (la nube de vapor hecha Pokémon)
        { species: 109, level: 7 },  // Koffing (humo de fresa tóxica)
      ],
      intro: [
        '*da una calada larguísima al vape y una nube morada lo envuelve entero* Te abandoné en el piso, Marcelino... pero he vuelto.',
        'He vuelto con pelo nuevo, con flow y con VENGANZA. Vale, el pelo es injerto, pero a efectos de drama cuenta igual.',
        'Llevo semanas sobreviviendo a base de comida ajena y vapor de fresa. Estoy en mi mejor momento. Prepárate para olerme a kilómetros.',
      ],
      win: [
        '*tose una nube espesa* Vale... vale... has ganado. Pero la próxima vez vuelvo con MÁS pelo. Y a lo mejor con barba.',
        'Me piro otra vez. A Luxemburgo, o al sofá de alguien. Donde haya comida gratis y un enchufe para el vape.',
      ],
      defeat: [
        '*calada triunfal entre la niebla* ¿Lo ves? El caos siempre gana. Y el pelo... el pelo ya volverá, dalo por hecho.',
        'Anda, vete a entrenar y déjame disfrutar mi nube en paz, que la tengo cara.',
      ],
      prize: 420,
      flag: 'jesus_ruta2',
    },
  },
  // NPCs de charla del lore.
  {
    id: 'nina_lucia', sprite: 'lass', x: 3, y: 14, dir: 'down', roam: false,
    dialog: [
      '¿Tú también vas a la Liga Chamberí? ¡Yo empecé ayer y ya me ha mordido un Rattata!',
      'Dicen que el Campeón es un tal Álvaro que combate fumando y mirando un Excel. A mí me da más miedo el Excel, la verdad.',
      'Cuidado con la hierba alta de aquí, que está hasta arriba de bichos. ¡Lleva pociones de sobra!',
    ],
  },
  {
    id: 'senora_carmen', sprite: 'generic_f1', x: 13, y: 27, dir: 'left', roam: false,
    dialog: [
      'Anda, qué entrenador tan apañado. Tú eres el chaval de los Excels y los Pokémon, ¿a que sí? Tu madre habla mucho de ti.',
      'A ver si sientas la cabeza, ¿eh? Que con tus negocios raros... a ver si la vas a liar otra vez como la del rent2rent.',
    ],
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
  addSign(m, 12, 10, 'PLAZA DE OLAVIDE — Chamberí. "Jardines señoriales con Pokémon en la hierba. Redonda como una rosquilla."');
  addSign(m, 24, 10, 'CAFÉ DEL MODERNISMO. Tertulia diaria a las cinco. "Hoy: ¿puede la improvisación vencer a la lógica? Pase y opine."');
  addSign(m, 9, 25, 'MERCADO DE VALLEHERMOSO. "Género fresco de la sierra. Curativos castizos. Regatear, con la madre de Eduardo."');
  addSign(m, 23, 26, 'ESTACIÓN DE CHAMBERÍ. "CLAUSURADA EN 1966. No baje al andén. Lo que sube por el túnel no es un tren."');
  addSign(m, 19, 10, '[M] METRO DE IGLESIA — Línea 1. "Cerrada por obras. Como casi todo en esta región, oiga."');
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
  // (La enfermera de Chamberí se ha trasladado a su INTERIOR: cura dentro del
  //  Centro Pokémon. Su tile de puerta queda libre como warp de entrada.)
  // Blanca — novia de Álvaro, estudia notarías. Gardevoir en el lore.
  // BALANCE: 3.ª ciudad; equipo Nv.8-9, ajustado a un inicial recién crecido.
  {
    id: 'blanca_notarias', sprite: 'lass', x: 10, y: 11, dir: 'down', roam: false,
    trainer: {
      name: 'BLANCA',
      title: 'Academia de Notarías Encantadas',
      party: [
        { species: 35, level: 8 },   // Clefairy (el "hada" castiza; en Gen 1 es Normal)
        { species: 122, level: 9 },  // Mr. Mime (la pantomima notarial)
      ],
      intro: [
        'Hola, Marcelino. Antes de nada, el papeleo: para batirte en la Liga necesito que me firmes este consentimiento. Aquí, aquí y... aquí.',
        'Sí, soy la novia de Álvaro. Alguien tiene que ser el único punto de cordura en todo este caos de pisos, Tinder y vapeo, ¿no crees?',
        'Te voy a ganar con cariño y jurisprudencia, sin acritud. ¿Me firmas también el consentimiento para perder? Es por dejarlo todo en regla.',
      ],
      win: [
        'Vaya, impecable. Queda debidamente registrado en acta: has ganado en buena lid y sin un solo vicio de forma.',
        'Aquí tienes tu premio, con su factura y todo en regla. Y por favor, dile a Álvaro que se duche más de tres minutos. A ti te hará más caso que a mí.',
      ],
      defeat: [
        'Caso cerrado. Sin rencor, ¿eh, cielo? La burocracia siempre gana, es ley de vida.',
        'Estudia un poquito y vuelves cuando quieras. Te espero con los papeles preparados y el sello a mano.',
      ],
      prize: 640,
      flag: 'blanca_chamberi',
    },
  },
  // Ángel — el ansiolítico perfeccionista, el que endereza a Alex.
  // BALANCE: equipo Nv.9-10.
  {
    id: 'angel_perfeccionista', sprite: 'scientist', x: 18, y: 11, dir: 'down', roam: false,
    trainer: {
      name: 'ÁNGEL',
      title: 'El Ansiolítico Perfeccionista',
      party: [
        { species: 96, level: 9 },   // Drowzee (la mente que todo lo repasa)
        { species: 64, level: 10 },  // Kadabra (la revisión psíquica final)
      ],
      intro: [
        'Un momento. Aquí nada pasa sin mi revisión. Ni tú, ni tu estrategia, ni esa cuarta poción que llevas mal colocada en la mochila. La he visto.',
        'Soy el que mantiene a Alex con los pies en la tierra. Si fuera por él, estaría ligando en el máster en lugar de aprobando. No lo permito.',
        'He repasado tu equipo tres veces y tiene fallos. Permíteme que te los señale... uno a uno, con calma. Cuando quieras, combatimos.',
      ],
      win: [
        'Mmm. Aceptable. No es perfecto, pero... es aceptable. Lo anoto en mi cuaderno de mejoras, sección "imprevistos".',
        'Toma tu premio. Y ordena la mochila antes de salir, te lo pido por favor. El orden reduce la ansiedad. La tuya, y sobre todo la mía.',
      ],
      defeat: [
        'Lo ves. Un fallo en la línea tres de tu plan. Te lo avisé. Siempre, siempre hay un fallo.',
        'Respira, corrígelo y vuelve. La perfección es un proceso, no un golpe de suerte. Yo te espero, no tengo ninguna prisa.',
      ],
      prize: 680,
      flag: 'angel_chamberi',
    },
  },
  // Adrián Barrera — villano (Team Schizo). Cameo que amenaza con el "Orden Perfecto".
  {
    id: 'adrian_schizo', sprite: 'psychic', x: 20, y: 12, dir: 'down', roam: false,
    dialog: [
      'Vaya, vaya. El célebre Marcelino. El "Emprendedor Caótico". Qué apodo más espantoso, por cierto.',
      'Yo soy Adrián. Y todo este caos vuestro —los pisos, el Tinder, el vapeo, la improvisación de tres al cuarto— se ha acabado. El Team Schizo va a imponer el ORDEN PERFECTO.',
      'Vacaciones planificadas por decreto. Debates ganados por decreto. Y las risas... cuando yo lo diga. *frunce el ceño como un crío al que le quitan el postre*',
      'Hoy no voy a combatirte; no estás a mi altura todavía. Pero pronto mi Mr. Mime y yo te pondremos en tu sitio. En el sitio CORRECTO. Tú espera.',
    ],
  },
  // Flavor castizo conservado, mejorado.
  {
    id: 'senora_olavide', sprite: 'generic_f1', x: 12, y: 20, dir: 'down', roam: true,
    dialog: [
      'La plaza de Olavide es redonda como una rosquilla de San Isidro, hijo. Me he criado dando vueltas a esta fuente.',
      'Antes había un mercado de hierro aquí en medio, ¿sabes? Lo derribaron en el 74. ¡Pum! Y mira ahora, todo terracitas y perritos.',
    ],
  },
  {
    id: 'viejo_fuente', sprite: 'fisher', x: 17, y: 17, dir: 'left', roam: false,
    dialog: [
      'En esta fuente no se pesca, chaval, te lo digo yo. Pero a veces se asoma algún Pokémon de agua a beber, lo he visto.',
      '...O eso cuentan los del barrio en el café. Yo, por si las moscas, vengo todos los días con la caña preparada.',
    ],
  },
];

// ---------- export ----------

export const MAPS = {
  tetuan: buildTetuan(),
  ruta2: buildRuta2(),
  chamberi: buildChamberi(),
  ...buildInteriors(),
};

// Enlaza las puertas del overworld con sus interiores (warps de ida).
wireBuildingDoors(MAPS);
