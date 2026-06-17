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
import { buildGyms, GYM_LINKS } from './gyms.js';
import { buildLiga, wireLigaDoor } from './liga.js';
import { EXTRA_MAPS } from './areaExtra.js';
import { BERCERO_MAPS, wireBerceroEntry } from './areaBercero.js';
import { TORREVIEJA_MAPS, wireTorreviejaEntry } from './areaTorrevieja.js';
import { addFieldObstacle } from './fieldMoves.js';

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
// Edificio de GIMNASIO (4×4): reusa la fachada cívica del MART para que se lea
// distinto de las casas vecinas (es un edificio público, no una vivienda). La
// fila inferior central (idx 2) es la puerta: wireGymDoors la libera como warp.
const GYM = {
  w: 4, h: 4, overheadRows: 1,
  tiles: [[26, 27, 27, 29], [139, 140, 141, 142], [252, 253, 254, 255], [361, 362, 367, 368]],
};
// Gimnasio COMPACTO (3×3) para los huecos estrechos del sur de Chamberí: misma
// fachada cívica que GYM pero más estrecho, para dejar libre el corredor central
// (x14-15) que baja a Ruta 3 entre dos gimnasios contiguos.
const GYM3 = {
  w: 3, h: 3, overheadRows: 1,
  tiles: [[26, 27, 29], [139, 141, 142], [361, 367, 368]],
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

// Igual que wireBuildingDoors pero para los GIMNASIOS (GYM_LINKS). El tile
// `exit` de cada gimnasio en la ciudad ES la puerta: se libera la colisión (para
// pisarlo y disparar el warp) y se añade el warp de ENTRADA al spawn del interior.
// El warp de SALIDA (gimnasio → ciudad, a ese mismo tile) ya lo crea gyms.js
// vía linkExit, así que puerta de entrada y baldosa de reaparición coinciden.
function wireGymDoors(maps) {
  for (const link of GYM_LINKS) {
    const { map, x, y } = link.exit;
    const m = maps[map];
    if (!m || !maps[link.gym]) continue;
    if (m.collision[y]) m.collision[y][x] = 0; // la puerta del gimnasio es pisable
    if (m.tallGrass && m.tallGrass[y]) m.tallGrass[y][x] = 0; // sin hierba bajo la puerta
    const dest = maps[link.gym].playerSpawn || { x: 1, y: 1 };
    if (!(m.warps || []).some((w) => w.x === x && w.y === y)) {
      m.warps.push({ x, y, toMap: link.gym, toX: dest.x, toY: dest.y, dir: 'up' });
    }
  }
}

// Carva el corredor peatonal del sur de Chamberí: conecta la plaza con las
// puertas de los gimnasios sur (Camión 11,25 · Fantasma 17,26) y con la salida a
// Ruta 3 (hueco x14-15, y26-29). Lo ejecuta buildChamberi DESPUÉS de edificios y
// hierba: pavimenta las baldosas (PATH), las hace pisables y borra la hierba para
// que el recorrido sea limpio y caminable. No pisa NINGÚN edificio (verificado).
function southConnect(m) {
  const corridor = new Set();
  addRect(corridor, 14, 18, 2, 12);  // autopista central x14-15, y18-29 → salida sur
  addRect(corridor, 11, 25, 5, 2);   // ramal oeste x11-15, y25-26 → puerta Camión
  addRect(corridor, 15, 26, 3, 1);   // ramal este x15-17, y26 → puerta Fantasma
  stampPath(m, corridor, PATH);
  for (const key of corridor) {
    const [x, y] = key.split(',').map(Number);
    m.collision[y][x] = 0;
    if (m.tallGrass[y]) m.tallGrass[y][x] = 0;
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
  // GIMNASIO 1 · CASHFLOW (Iván "FinTips") — sobre Bravo Murillo, puerta en (20,9).
  // El interior se enlaza en wireGymDoors (GYM_LINKS: tetuan 20,9 → gym_cashflow).
  stampBuilding(m, 19, 5, GYM);          // Gimnasio Cashflow (puerta 20,9)
  addSign(m, 19, 9, 'GIMNASIO CASHFLOW — Líder: IVÁN "FINTIPS". "Aquí se combate con ROI. El que pierde, invita a las bravas." Medalla: Liquidez.');
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
  // Álvarín — RIVAL. Te reta nada más empezar. flag alvaro_rival_1.
  // BALANCE: primer combate del rival = UN solo Pokémon de nivel ~5-6, ganable
  // con el inicial L5 por un jugador novato cuidadoso (objetivo compartido con
  // el agente de combate). Su equipo grande llega más adelante (es el Campeón).
  {
    id: 'alvaro_rival', sprite: 'alvaro_rival', x: 9, y: 12, dir: 'left', roam: false,
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
        'Me piro a Salamanca, que me estoy sacando el carnet de conducir de una vez. Y el Maserati es el TUYO, que conste — yo aún ni conduzco. Tú improvisas hasta para tener coche; no lo entenderías, es una estrategia fiscal.',
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
    id: 'ivan_fintips', sprite: 'ivan_fintips', x: 8, y: 16, dir: 'down', roam: false,
    dialog: [
      'Ah, Marcelino, el visionario. ¿Ya sales a eso de "poner orden en el caos"? Muy bien, muy bien... pero dime, ¿la rentabilidad de eso cuál es exactamente?',
      'Yo lo observo todo desde la barrera, con mi cartera bien diversificada: cripto, ladrillo, un poco de rent2rent. El caos da ROI si sabes leerlo, te lo digo yo.',
      'Consejo de socio gratis, que para algo soy tu mentor: un equipo Pokémon es una cartera. Diversifica tipos, no te apalanques en un solo bicho. Y nunca, jamás, le pidas un préstamo a Eduardo.',
      '¿Te conté lo de Cancún? El Churches y yo la liamos pardísima en el RIU. #FinTipsYElChurchesLaLianEnRiuCancun, lo tengo hasta de dominio. Marca personal, bro, marca personal.',
    ],
  },
  // Mariel — amiga venezolana de Iván FinTips. Trader hiperactiva (HFT), ludópata,
  // baila sevillanas, influencer. No te deja hablar. Entrenadora de eléctricos veloces.
  {
    id: 'mariel', sprite: 'mariel', x: 11, y: 16, dir: 'left', roam: true,
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
    id: 'jose_antonio_casero', sprite: 'jose_antonio_casero', x: 16, y: 30, dir: 'down', roam: false,
    dialog: [
      'Eh, eh, eh. Marcelino. ¿Dónde vas con tanta prisa, majo? Que estamos a día 1, no te hagas el loco.',
      'El alquiler. La calvicie es poder y el alquiler SIEMPRE sube. *se acaricia la cabeza, lisa y reluciente como una bola de billar*',
      'Anda, hoy te dejo salir porque vas a hacer cosas de Pokémon y eso da prestigio al edificio. Pero a la vuelta... el recibo, majo. El recibo.',
      'Y dile a tu compañero Álvarín que el agua no es gratis, que me la negocia cada mes como si fuera la Liga. ¡Y mira que el del Maserati eres TÚ, no él, que ese aún se está sacando el carnet en Salamanca! ¡Lo que hay que ver!',
    ],
  },
  // Alex — el Tentado Digital. Trainer menor (Pikachu/Magnemite). Toca la guitarra → sprite guitarist.
  {
    id: 'alex_digital', sprite: 'alex_digital', x: 22, y: 16, dir: 'down', roam: false,
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
      'Vengo todos los días a tomar el sol a la puerta del bar. Es mi oficina, como el portal era la de Álvarín.',
      'Tú eres el del 37, ¿no? El que se va a la Liga a "poner orden". Suerte, chaval, que orden en Madrid hay poco y caro.',
      'Si entras al bar, pídete las bravas. Y dile a Manoli la peluquera que ya me toca corte, que parezco un Pidgey despeinado.',
    ],
  },
  // Gustavo — entrenador NPC de la Plaza de Tetuán. Cerebrito con cuerpo de
  // gimnasio (atlético, gafas, rapado): hace pesas en la plaza. Parodia CARIÑOSA
  // del gym-bro intelectual. Equipo Gen-1 temático Lucha + un guiño Dragón
  // (Dratini, único dragón de Gen 1). Sin PII; nada sobre su vida íntima.
  // BALANCE: 1.ª ciudad, equipo Nv.5-7 (entrenador opcional de plaza).
  {
    id: 'gustavo', sprite: 'gustavo', x: 28, y: 26, dir: 'left', roam: false,
    trainer: {
      name: 'GUSTAVO',
      title: 'Cerebro con Cuerpo de Gimnasio',
      party: [
        { species: 66, level: 5 },   // Machop — disciplina marcial, hierro en la plaza
        { species: 56, level: 6 },   // Mankey — cardio y mala leche de gimnasio
        { species: 147, level: 6 },  // Dratini — el guiño "dragón" (escamas como piercings)
      ],
      intro: [
        'Hombre, Marcelino. Espera, que termino la serie. *acaba unas dominadas en la rama del árbol y se ajusta las gafas* Diez más y soy todo tuyo.',
        'La gente cree que por hacer pesas no leo. Pues mira: estoy con el doctorado, soy de los mejores de mi promoción Y levanto más que tú. Cuerpo Y cabeza, ¿eh?',
        'Va, combatimos. Te aviso: aquí se entrena en serio. Calienta, hidrátate y no me lo pongas fácil, anda.',
      ],
      win: [
        '¡Buah! Pues nada, hoy te toca el día de tu vida. Bien jugado, en serio. Eso se respeta.',
        'Oye, cuando subas a la Liga pásate por la playa de Torrevieja, que monto un gimnasio en la arena. Allí combatimos otra vez, pero con chanclas. ¡Un abrazo, máquina!',
      ],
      defeat: [
        'Lo dicho: cuerpo Y cabeza. *bebe de la botella sin perder la postura* No te frustres, que entrenar es esto, fallar y volver.',
        'Anda, hazte unas series y vuelve. Y come proteína, que ese inicial lo veo flojo de bíceps.',
      ],
      prize: 360,
      flag: 'gustavo_tetuan',
    },
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
  // ── REPARTIDORES DE MOs (HM) de Tetuán ─────────────────────────────────────
  // JARDINERO de la plaza — regala la MO01 CORTE (corta arbustos). Lore: poda los
  // setos de la Plaza de Tetuán.
  {
    id: 'jardinero_corte', sprite: 'aroma', x: 5, y: 30, dir: 'down', roam: false,
    gift: {
      item: 'mo01', flag: 'mo_cut_given',
      lines: [
        'Buenas, chaval. Soy el jardinero de la plaza. Llevo toda la vida podando los setos de Tetuán.',
        'Mira, te voy a dar una cosa que me sobra: la MO01, CORTE. Enséñasela a un bicho de tipo planta o normal y podrás cortar los arbustos finos que bloquean el paso.',
      ],
      doneLines: [
        '¿Qué tal va el CORTE? Acuérdate: un Pokémon de tipo planta, bicho o normal puede aprenderlo.',
        'Por la Ruta 2, en un huerto escondido, hay arbustos y rocas que cortar. ¡Échale un ojo!',
      ],
    },
  },
  // OBRERO del Parque Móvil — regala la MO04 FUERZA (empuja rocas). Lore: mueve
  // bloques de hormigón en las obras eternas del barrio.
  {
    id: 'obrero_fuerza', sprite: 'generic_m1', x: 20, y: 28, dir: 'down', roam: false,
    gift: {
      item: 'mo04', flag: 'mo_strength_given',
      lines: [
        'Eh, tú, el de los Pokémon. Yo trabajo en las obras del Parque Móvil, moviendo bloques de hormigón a pulso.',
        'Toma, la MO04, FUERZA. Con un Pokémon fuerte (lucha, tierra, roca o normal) podrás empujar esas rocas enormes que cortan el camino. A mí me viene grande sin grúa.',
      ],
      doneLines: [
        'La FUERZA es para las rocas GRANDES. Las pequeñas y quebradizas se rompen con Golpe Roca, que eso te lo da el cantero.',
      ],
    },
  },
  // CANTERO — regala la MO06 GOLPE ROCA (rompe rocas pequeñas). Lore: pica piedra.
  {
    id: 'cantero_golperoca', sprite: 'elder_m', x: 6, y: 29, dir: 'right', roam: false,
    gift: {
      item: 'mo06', flag: 'mo_rocksmash_given',
      lines: [
        'Soy cantero, muchacho. Me paso el día picando piedra. Hay rocas que se rompen de un golpe seco, si sabes dónde dar.',
        'Quédate la MO06, GOLPE ROCA. Un Pokémon de lucha, tierra, roca o normal romperá las rocas pequeñas que estorban. A veces, debajo, sale algún bicho.',
      ],
      doneLines: [
        'El GOLPE ROCA rompe las rocas chicas. Para las grandes, FUERZA, que esa la lleva el obrero del Parque Móvil.',
      ],
    },
  },
  // AVIADOR del barrio — regala la MO02 VUELO. Lore: cuida palomas mensajeras en
  // una azotea de Bravo Murillo; te enseña a viajar volando.
  {
    id: 'aviador_vuelo', sprite: 'gentleman', x: 10, y: 21, dir: 'down', roam: false,
    gift: {
      item: 'mo02', flag: 'mo_fly_given',
      lines: [
        'Hombre, el aspirante a Campeón. Yo crío palomas mensajeras en la azotea, ¿sabes? Conocen Madrid mejor que el GPS.',
        'Toma, la MO02, VUELO. Con un Pokémon de tipo volador podrás viajar al instante a cualquier zona con Centro Pokémon que ya hayas visitado. Ábrelo desde el MAPA.',
      ],
      doneLines: [
        'Para VOLAR, abre el MAPA (en el menú) y elige una zona ya visitada con Centro Pokémon. Mi paloma te lleva. ¡Madrid en un visto y no visto!',
      ],
    },
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
  addSign(m, 16, 16, 'QUIOSCO. Prensa, cromos y pipas. "Ya están los cromos de la Liga Chamberí. El de Álvarín fumando es el raro."');
  // RINCÓN DE LAS MOs (jardincillo opcional, SO de la ruta): muestra de los tres
  // movimientos de campo de TIERRA. Un ARBUSTO cortable (Corte), una ROCA grande
  // empujable (Fuerza) y una ROCA pequeña rompible (Golpe Roca) bloquean un huerto
  // con un cartel-recompensa. Está FUERA del camino principal (x9-10 / x13-14): no
  // afecta a la navegación entre warps. Cada obstáculo guarda una baldosa distinta.
  // Arbusto cortable: tapa la entrada al huerto desde el oeste (x6,y31).
  addFieldObstacle(m, 6, 31, 'bush');
  // Roca grande (Fuerza): corta el paso por el centro del huerto (x7,y32).
  addFieldObstacle(m, 7, 33, 'boulder');
  // Roca pequeña (Golpe Roca): última barrera antes del cartel (x8,y34).
  addFieldObstacle(m, 8, 34, 'rock');
  // Cartel-recompensa al fondo del huerto (solo se lee tras retirar los obstáculos).
  addSign(m, 8, 33, 'HUERTO ESCONDIDO DE LA RUTA 2. "El que llega hasta aquí con Corte, Fuerza y Golpe Roca, se merece el secreto: las mejores pipas de Madrid se cultivan en este rincón. Chsss."');
  ruta2Data(m);
  return m;
}

function ruta2Data(m) {
  m.encounters = [
    { species: 19, min: 6, max: 10, weight: 44 }, // Rattata
    { species: 16, min: 6, max: 10, weight: 40 }, // Pidgey
    { species: 58, min: 7, max: 11, weight: 14 }, // Growlithe
    { species: 63, min: 8, max: 11, weight: 2 },  // Abra (raro)
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
    id: 'sergio_guillen', sprite: 'sergio_guillen', x: 8, y: 22, dir: 'down', roam: false,
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
    id: 'jesus_la_rata', sprite: 'jesus_la_rata', x: 14, y: 34, dir: 'up', roam: false,
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
  // David Guillén — HERMANO de Sergio Guillén (que está aquí mismo en la Ruta 2).
  // Profesor de historia y "bienqueda" patológico: cambia de opinión tres veces en
  // la misma frase para no quedar mal con nadie. Parodia CARIÑOSA del indeciso
  // simpático. Equipo Gen-1 temático "variable/cambia de forma": Eevee (el que
  // puede ser cualquier cosa) + Ditto (literalmente copia al de enfrente). Sin PII.
  // BALANCE: ruta temprana, equipo Nv.6-7 (entrenador de paso).
  {
    id: 'david_guillen', sprite: 'david_guillen', x: 11, y: 20, dir: 'down', roam: false,
    trainer: {
      name: 'DAVID',
      title: 'El Profesor Bienqueda',
      party: [
        { species: 133, level: 6 },  // Eevee — el que aún no sabe en qué evolucionar (indeciso)
        { species: 132, level: 7 },  // Ditto — copia al rival para no llevarle la contraria
      ],
      intro: [
        'Anda, ¡el compañero de piso de mi hermano Sergio! Oye, qué alegría... bueno, alegría a medias, que tampoco quiero exagerar, aunque sí, alegría plena, vamos.',
        'Mira, yo de combatir... a favor totalmente. O sea, en contra no estoy, ¿eh? Bueno, depende de cómo lo veas. Tienes razón tú, y yo también. Los dos, vamos.',
        'Soy profe de historia, ¿sabes? Y lo bonito de la historia es que cada uno tiene su versión y todas valen. Va, combatimos... si te parece. Si no, también. Tú dirás.',
      ],
      win: [
        '¡Y has ganado! Qué bien, oye. O sea, yo quería ganar, claro, pero que ganes tú también me parece estupendo, no te creas.',
        'Le diré a Sergio que eres un crack. Y al rival también le diré que es un crack, no vaya a ser. A todos crack, así nadie se enfada. ¡Un placer, de verdad de la buena!',
      ],
      defeat: [
        'Vaya, gané yo. Lo siento mucho, ¿eh? O sea, no lo siento, que es un combate... pero sí lo siento, no quiero que te lo tomes a mal. ¿Estamos bien? Dime que estamos bien.',
        'Entrena un poco y vuelves, que seguro que la próxima ganas tú. O yo. O empatamos, que sería lo más justo para todos, ¿no crees?',
      ],
      prize: 380,
      flag: 'david_ruta2',
    },
  },
  // NPCs de charla del lore.
  {
    id: 'nina_lucia', sprite: 'lass', x: 3, y: 14, dir: 'down', roam: false,
    dialog: [
      '¿Tú también vas a la Liga Chamberí? ¡Yo empecé ayer y ya me ha mordido un Rattata!',
      'Dicen que el Campeón es un tal Álvarín que combate fumando y mirando un Excel. A mí me da más miedo el Excel, la verdad.',
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
  // Bordes con hueco norte (x14-15) hacia la Ruta 2 y hueco SUR (x14-15) hacia
  // la Ruta 3 · Gran Vía (zona nueva). El muro sur se parte en dos tramos para
  // dejar pasar el corredor de salida hacia Ruta 3.
  stampTrees(m, 0, 0, 1, 29);
  stampTrees(m, 28, 0, 29, 29);
  stampTrees(m, 2, 0, 13, 2);
  stampTrees(m, 16, 0, 27, 2);
  stampTrees(m, 2, 27, 13, 29);   // muro sur (tramo oeste)
  stampTrees(m, 16, 27, 27, 29);  // muro sur (tramo este) — hueco x14-15 hacia Ruta 3
  // Plaza de Olavide: disco aproximado + entrada desde el norte + corredor sur.
  const cells = new Set();
  addRect(cells, 14, 0, 2, 12);
  addRect(cells, 14, 26, 2, 4);   // corredor de salida sur hacia Ruta 3 (x14-15, y26-29)
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
  // GIMNASIOS de la Liga Chamberí (interiores enlazados en wireGymDoors).
  // GIM 2 · TRADING/Casino (Mariel) — junto a la plaza, puerta en (14,10).
  stampBuilding(m, 12, 6, GYM);          // Gimnasio Trading (puerta 14,10)
  addSign(m, 13, 10, 'GIMNASIO TRADING — Líder: MARIEL. "Microsegundos, sevillanas y velas japonesas. La banca, o sea YO, siempre gana." Medalla: Velocidad.');
  // GIM 4 · CAMIÓN (Sergio Guillén) — zona sur-oeste donde aparca, puerta (11,25).
  // Compacto (3×3) para dejar libre el corredor x14-15 que baja a Ruta 3.
  stampBuilding(m, 11, 22, GYM3);        // Gimnasio Camión (puerta 11,25)
  addSign(m, 10, 26, 'GIMNASIO CAMIÓN — Líder: SERGIO GUILLÉN. "Este camión es mi casa, mi gimnasio y mi bar. Aparcar = combatir." Medalla: Cerveza.');
  // GIM 3 · FANTASMA (Jesús "la Rata") — sótano junto a la Estación Fantasma, puerta (17,26).
  // Compacto (3×3), al este del corredor central (flanquea la salida a Ruta 3).
  stampBuilding(m, 16, 23, GYM3);        // Gimnasio Fantasma (puerta 17,26)
  addSign(m, 18, 26, 'GIMNASIO FANTASMA — Líder: JESÚS "LA RATA". "Volví con pelo, con flow y con venganza. Respira hondo... mejor no respires." Medalla: Niebla.');
  // Jardines de Olavide: hierba alta
  stampTallGrass(m, 3, 12, 5, 6);
  stampTallGrass(m, 22, 12, 5, 6);
  stampTallGrass(m, 11, 23, 7, 3);
  // Corredor sur: conecta la plaza con las puertas de los gimnasios del sur y con
  // la salida a Ruta 3 (hueco x14-15). Se carva DESPUÉS de edificios y hierba para
  // garantizar que las baldosas del corredor queden pisables y sin hierba.
  southConnect(m);
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
    { species: 43, min: 12, max: 16, weight: 28 }, // Oddish (jardines de Olavide)
    { species: 16, min: 12, max: 16, weight: 26 }, // Pidgey
    { species: 63, min: 13, max: 17, weight: 18 }, // Abra (raro, místico)
    { species: 58, min: 13, max: 17, weight: 16 }, // Growlithe
    { species: 52, min: 14, max: 18, weight: 8 },  // Meowth
    { species: 44, min: 16, max: 19, weight: 4 },  // Gloom (el premio raro de la plaza)
  ];
  m.warps = [
    { x: 14, y: 0, toMap: 'ruta2', toX: 9, toY: 38, dir: 'up' },
    { x: 15, y: 0, toMap: 'ruta2', toX: 10, toY: 38, dir: 'up' },
    // Salida SUR → Ruta 3 · Gran Vía (zona nueva). Recíproco de los warps norte
    // de ruta3 (x10-11, y0 → chamberi 14-15, y26). Entra por la entrada norte de
    // Ruta 3 (x10-11, y1).
    { x: 14, y: 29, toMap: 'ruta3', toX: 10, toY: 1, dir: 'down' },
    { x: 15, y: 29, toMap: 'ruta3', toX: 11, toY: 1, dir: 'down' },
  ];
  m.npcs = CHAMBERI_NPCS;
  m.playerSpawn = { x: 14, y: 2 };
  m.healSpawn = { x: 6, y: 11 };
}

const CHAMBERI_NPCS = [
  // (La enfermera de Chamberí se ha trasladado a su INTERIOR: cura dentro del
  //  Centro Pokémon. Su tile de puerta queda libre como warp de entrada.)
  // Blanca — novia de Álvarín, estudia notarías. Gardevoir en el lore.
  // BALANCE: 3.ª ciudad; equipo Nv.8-9, ajustado a un inicial recién crecido.
  {
    id: 'blanca_notarias', sprite: 'blanca_notarias', x: 10, y: 11, dir: 'down', roam: false,
    trainer: {
      name: 'BLANCA',
      title: 'Academia de Notarías Encantadas',
      party: [
        { species: 35, level: 8 },   // Clefairy (el "hada" castiza; en Gen 1 es Normal)
        { species: 122, level: 9 },  // Mr. Mime (la pantomima notarial)
      ],
      intro: [
        'Hola, Marcelino. Antes de nada, el papeleo: para batirte en la Liga necesito que me firmes este consentimiento. Aquí, aquí y... aquí.',
        'Sí, soy la novia de Álvarín. Alguien tiene que ser el único punto de cordura en todo este caos de pisos, Tinder y vapeo, ¿no crees?',
        'Te voy a ganar con cariño y jurisprudencia, sin acritud. ¿Me firmas también el consentimiento para perder? Es por dejarlo todo en regla.',
      ],
      win: [
        'Vaya, impecable. Queda debidamente registrado en acta: has ganado en buena lid y sin un solo vicio de forma.',
        'Aquí tienes tu premio, con su factura y todo en regla. Y por favor, dile a Álvarín que se duche más de tres minutos. A ti te hará más caso que a mí.',
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
    id: 'angel_perfeccionista', sprite: 'angel_perfeccionista', x: 18, y: 11, dir: 'down', roam: false,
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
    id: 'adrian_schizo', sprite: 'adrian_schizo', x: 20, y: 12, dir: 'down', roam: false,
    dialog: [
      'Vaya, vaya. El célebre Marcelino. El "Emprendedor Caótico". Qué apodo más espantoso, por cierto.',
      'Yo soy Adrián. Y todo este caos vuestro —los pisos, el Tinder, el vapeo, la improvisación de tres al cuarto— se ha acabado. El Team Schizo va a imponer el ORDEN PERFECTO.',
      'Vacaciones planificadas por decreto. Debates ganados por decreto. Y las risas... cuando yo lo diga. *frunce el ceño como un crío al que le quitan el postre*',
      'Hoy no voy a combatirte; no estás a mi altura todavía. Pero pronto mi Mr. Mime y yo te pondremos en tu sitio. En el sitio CORRECTO. Tú espera.',
    ],
  },
  // Ann Jou — amigo de Marcelino. Asiático, gafas, sudadera negra. Se cree
  // SUPERIOR y muy negativo; vive del PÓKER profesional y de CAMBIAR cromos de
  // One Piece. Tapa su vacío existencial yéndose a ganar a pueblerinos. Novia
  // venezolana, Lucía, muy maja, que su familia no acaba de aceptar.
  // Lo plantamos junto al Gimnasio Trading/Casino de Mariel (puerta 14,10): pega
  // con su rollo de azar, cartas y banca. Tile (16,11) — plaza, alcanzable a pie.
  // BALANCE: 3.ª ciudad, equipo Nv.9-11 (azar/casino): Voltorb (ruleta), Meowth
  // (Pay Day = vive del juego) y Persian, su "as" engreído.
  {
    id: 'ann_jou', sprite: 'ann_jou', x: 16, y: 11, dir: 'down', roam: false,
    trainer: {
      name: 'ANN JOU',
      title: 'Crupier del Vacío Existencial',
      party: [
        { species: 100, level: 9 },  // Voltorb — la bola de la ruleta
        { species: 52, level: 10 },  // Meowth — Pay Day, "yo del póker vivo"
        { species: 53, level: 11 },  // Persian — su as engreído y elegante
      ],
      intro: [
        'Anda, Marcelino. Mira, te lo digo de buen rollo, que somos colegas: esto de los Pokémon no se te da. Pero bueno, a casi nadie. La gente, en general, es bastante mediocre.',
        'Yo me bajo a los pueblos de al lado a ganarles a todos. Es triste, ¿eh? Ganas a quince paletos y por dentro sigues igual de vacío. Pero algo hay que hacer entre torneo y torneo de póker.',
        '¿Sabes que ayer cambié un Luffy Líder de One Piece por tres cartas que valían el doble? Lo de leerle la cara a la gente es lo mío. Por eso vivo del póker, no por suerte. La suerte es para los pobres de espíritu.',
        'Va, te combato. Pero conste que esto es como el casino de tu amiga Mariel: la banca, o sea yo, siempre gana. Lucía me dice que sea más majo... ella sí que es maja, oye. Lástima lo de mi familia. En fin. Reparte.',
      ],
      win: [
        '...Vale. Vale. No pasa nada. Ha sido la varianza, una mala racha, un bad beat de manual. A nivel teórico yo iba ganando, que lo sepas.',
        'Toma tu premio, anda, que del póker de esta semana me sobra. Y no se lo cuentes a Lucía, que luego me dice que ves, que no soy tan bueno. Es muy maja, pero qué pesadita con la humildad.',
      ],
      defeat: [
        'Lo ves. Te lo dije. Esto no se te da, y a la mayoría tampoco. Que no es algo personal, es que el mundo es mediocre y ya está.',
        'Me vuelvo a mi pueblo de turno a ganarle a la peña y a sentir exactamente lo mismo de siempre: nada. *se ajusta las gafas* Bueno. A ver si Lucía me ha guardado cena.',
      ],
      prize: 720,
      flag: 'ann_jou_chamberi',
    },
  },
  // Pablo Gallo — cameo SIMPÁTICO y NEUTRO (NPC entrenador majo, NO Alto Mando).
  // Rasgos LIMPIOS: argentino de buen rollo, ingeniero de software, gym, anime y
  // tatuajes. El material sensible/difamatorio del roadmap (secc. D) se EXCLUYE por
  // completo: repo público, nada acusatorio/dañino sobre una persona real. Cameo
  // amistoso de parodia cariñosa. Lo plantamos en la plaza de Olavide (20,13),
  // tile libre del disco, lejos de los otros entrenadores (Blanca/Ángel/Ann Jou).
  // BALANCE: 3.ª ciudad, equipo Nv.18-21 temático "gym + anime + código".
  {
    id: 'pablo_gallo', sprite: 'pablo_gallo', x: 20, y: 13, dir: 'left', roam: false,
    trainer: {
      name: 'PABLO GALLO',
      title: 'Programador Tatuado de Buen Rollo',
      party: [
        { species: 66, level: 18 },  // Machop — el del gym, levanta hierro
        { species: 25, level: 19 },  // Pikachu — anime puro, el favorito de todos
        { species: 67, level: 21 },  // Machoke — su as, brazos de hacer dominadas
      ],
      intro: [
        '¡Eh, qué hacés, campeón! *deja las pesas un momento* Pablo, ingeniero de software, de Buenos Aires pero afincado en Madrid. Vos sos Marcelino, ¿no? Me hablaron bien de vos.',
        'Mirá, yo soy tranqui: código de día, gimnasio de tarde, y a la noche, anime hasta las mil. Esta vida es redonda, te lo firmo. Ah, y los tatuajes... cada uno tiene su historia, pero esa te la cuento con una birra.',
        'Dale, tirá unos Pokémon que te muestro lo que entrena un porteño con disciplina. Sin maldad, ¿eh? Acá venimos a pasarla bien y a sudar la camiseta.',
      ],
      win: [
        '¡Uhh, qué máquina! Me ganaste limpio, eso se respeta, che. Tenés actitud de protagonista de shonen, te lo digo en serio.',
        'Tomá tu premio, te lo ganaste con codo. Y si algún día querés que te arme un script o te recomiende un anime, ya sabés dónde encontrarme: entre las pesas y el portátil. ¡Un abrazo grande!',
      ],
      defeat: [
        'Jaja, ¡me salió bien la rutina de hoy! Tranqui, che, que perder también entrena. Mañana volvés más fuerte.',
        'Pasá por el gym cuando quieras y entrenamos juntos. Eso sí, traete agua, que sin hidratación no hay gloria. ¡Nos vemos, crack!',
      ],
      prize: 1320,
      flag: 'pablo_gallo_chamberi',
    },
  },
  // Álvaro Benito — entrenador NPC junto al Café del Modernismo (la tertulia diaria
  // le viene de perlas para soltar sus chapas). Historiador interino, cenizo,
  // agotado y con mala suerte; te endosa el combate más aburrido del barrio mientras
  // te da la chapa con sus opiniones. Parodia CARIÑOSA del cenizo coñazo — SIN
  // etiqueta política explícita ni nada hiriente. Equipo Gen-1 temático "muro de
  // ACERO/defensa lenta y testaruda" (sustituto de su Bastiodon canónico): Geodude,
  // Onix (la pared prehistórica) y Magnemite (toque metálico). Sin PII.
  // BALANCE: 3.ª ciudad, equipo Nv.16-19, muy defensivo (combate largo y tostón).
  {
    id: 'alvaro_benito', sprite: 'alvaro_benito', x: 24, y: 11, dir: 'down', roam: false,
    trainer: {
      name: 'ÁLVARO BENITO',
      title: 'El Historiador Cenizo',
      party: [
        { species: 74, level: 16 },  // Geodude — la cabezonería hecha roca
        { species: 81, level: 17 },  // Magnemite — el toque metálico/acero
        { species: 95, level: 19 },  // Onix — el muro prehistórico, lento y testarudo
      ],
      intro: [
        '*suspira y se estira la espalda con cara de dolor* Ah, eres tú. Justo le decía a la tertulia del café que esto, en mi época, se hacía mejor. Todo iba mejor antes, fíjate.',
        'Soy historiador, ¿sabes? Interino, eso sí, que la oposición es un cenizo total. Como yo. *anda un poco encorvado, casi de puntillas* La espalda me está matando, pero da igual, total, qué más da.',
        'Te aviso de que combatir conmigo es un tostón. Mi equipo solo defiende; tú ataca, ataca, que ya te cansarás antes tú. Y mientras, te cuento por qué todo va a salir mal. Va, cuando quieras.',
      ],
      win: [
        '...Pues claro. Si es que tengo una suerte malísima, oye. Hasta perdiendo soy un cenizo. *se frota los riñones* Era de esperar.',
        'Anda, llévate el premio antes de que me arrepienta. Y un consejo de historiador: visita más museos, que la juventud no valora el patrimonio. Ale, a otra cosa. Qué cansancio.',
      ],
      defeat: [
        'Lo ves. Ganó la defensa. Aburrido pero efectivo, como las clases de los lunes a primera hora. *bosteza* Te lo dije, ¿eh? Que era un tostón.',
        'Vuelve cuando tengas más paciencia... y un par de ataques que peguen de verdad. Yo me quedo aquí, dándole vueltas a lo mal que va todo. Como siempre.',
      ],
      prize: 660,
      flag: 'alvaro_benito_chamberi',
    },
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
  ...buildGyms(),   // gimnasios de la Liga Chamberí (interiores)
  ...buildLiga(),   // ENDGAME: Liga Chamberí (Alto Mando + Campeón Álvaro)
  ...EXTRA_MAPS,    // zona nueva: Ruta 3 · Gran Vía + Parque del Retiro
  ...BERCERO_MAPS,  // zona nueva: BERCERO (pueblo de Valladolid, el padre + la pandilla)
  ...TORREVIEJA_MAPS,  // zona nueva: TORREVIEJA (costa de Alicante, la madre Marilyn + playa/salinas)
};

// Enlaza las puertas del overworld con sus interiores (warps de ida).
wireBuildingDoors(MAPS);
// Enlaza las puertas de los gimnasios con sus interiores (warps de ida).
wireGymDoors(MAPS);
// Abre la puerta GATED de la Liga (Tetuán, 8 medallas) y la cablea al interior.
wireLigaDoor(MAPS);
// Engancha la ZONA BERCERO de forma aditiva: interior de la casa del padre +
// la "Estación de Autobuses" en un tile libre de Tetuán (único punto de viaje) +
// los warps de ida/vuelta. No reorganiza ningún mapa existente.
wireBerceroEntry(MAPS);
// Engancha la ZONA TORREVIEJA de forma aditiva: interior de la casa de la madre +
// una SEGUNDA línea de bus (Levante) en un tile libre de Tetuán (distinto del de
// Bercero) + los warps de ida/vuelta. No reorganiza ningún mapa existente ni Bercero.
wireTorreviejaEntry(MAPS);
