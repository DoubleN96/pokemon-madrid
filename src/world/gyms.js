// Módulo G (extensión) — GIMNASIOS de la Liga Chamberí.
// Cada gimnasio es un INTERIOR autocontenido (caja cerrada con felpudo de
// salida) construido con el MISMO patrón que `src/world/interiors.js`:
//   register('id', (exit) => { ...; return m; })
// y se ensambla con `GYM_LINKS` + `buildGyms()`, espejando la API pública de
// interiors.js (BUILDING_LINKS + buildInteriors). El formato de mapa es el de
// `MAPS` (docs/CONTRACTS.md): se fusiona en MAPS desde maps.js.
//
// IMPORTANTE: este fichero NO toca maps.js ni interiors.js ni otras escenas.
// interiors.js solo exporta { BUILDING_LINKS, buildInteriors }; sus helpers de
// construcción (makeRoom, setSolid, register, constantes de tile) son privados
// del módulo, así que se replican aquí de forma idéntica para mantener el módulo
// autónomo. Si en el futuro interiors.js exporta esos helpers, basta con
// importarlos y borrar las copias locales: la firma es la misma.
//
// Líderes (tipo → "as", niveles progresivos 12-30), según docs/SPEC-POKEMON-PISO.md:
//   1. Iván "FinTips"   (Normal/Eléctrico, as: Persian "Porygon-Z" + Raichu)  L12-15
//   2. Mariel           (Eléctrico,        as: Electrode + Jolteon)            L16-19
//   3. Jesús "la Rata"  (Veneno/Fantasma,  as: Weezing + Gengar)              L20-24
//   4. Sergio Guillén   (Lucha/Normal,     as: Machamp + Snorlax)             L25-30
//
// Paleta de tiles interiores (idéntica a interiors.js):
const WALL = 2574;        // pared interior lisa
const WALL_BALL = 2578;   // pared con emblema Pokéball
const WALL_WINDOW = 2580; // pared con ventana
const FLOOR_TILE = 2613;  // suelo de baldosa clara (gimnasios)
const CARPET = 2601;      // alfombra verde decorativa (pasillo/arena)
const MAT = 2616;         // felpudo de salida (alfombra crema)
const TABLE = 2701;       // mesa / mostrador / aparato temático
const SHELF = 3148;       // estantería
const CABINET = 3335;     // vitrina / armario
const PLANT = 658;        // maceta decorativa

// ---------- helpers de construcción (réplica de interiors.js) ----------

function mat2d(w, h, v) {
  return Array.from({ length: h }, () => Array(w).fill(v));
}

// Base de un interior: suelo uniforme, dos filas de pared arriba (con ventanas
// alternas y, si se pide, emblema Pokéball del gimnasio), borde colisionable y
// felpudo de salida centrado abajo. Devuelve el mapa + posición del felpudo.
function makeRoom(id, name, width, height, floor, withEmblem = true) {
  const m = {
    id, name, width, height,
    layers: {
      ground: mat2d(width, height, floor),
      deco: mat2d(width, height, -1),
      overhead: mat2d(width, height, -1),
    },
    collision: mat2d(width, height, 0),
    tallGrass: mat2d(width, height, 0),
    encounters: [], warps: [], npcs: [], signs: [],
    playerSpawn: { x: 0, y: 0 }, healSpawn: { x: 0, y: 0 },
    isInterior: true,
  };
  // Paredes: fila 0 = pared; fila 1 = ventanas alternas.
  for (let x = 0; x < width; x++) {
    m.layers.ground[0][x] = WALL;
    m.layers.ground[1][x] = (x % 3 === 1) ? WALL_WINDOW : WALL;
    m.collision[0][x] = 1;
    m.collision[1][x] = 1;
  }
  // Caja cerrada: laterales y fila inferior colisionan.
  for (let y = 0; y < height; y++) {
    m.collision[y][0] = 1;
    m.collision[y][width - 1] = 1;
  }
  for (let x = 0; x < width; x++) m.collision[height - 1][x] = 1;
  // Emblema Pokéball del gimnasio sobre el centro de la pared (decorativo).
  if (withEmblem) {
    const cx = Math.floor(width / 2);
    m.layers.ground[1][cx - 1] = WALL_BALL;
    m.layers.ground[1][cx] = WALL_BALL;
  }
  // Felpudo de salida centrado en la fila inferior caminable.
  const matX = Math.floor(width / 2);
  const matY = height - 1;
  m.layers.deco[matY][matX] = MAT;
  m.collision[matY][matX] = 0; // pisable: es el warp de salida.
  return { m, matX, matY };
}

function setSolid(m, x, y, tile) {
  m.layers.deco[y][x] = tile;
  m.collision[y][x] = 1;
}

// Cartel/placa de pared: legible de frente, sólido (faceable, no pisable). Si la
// casilla está vacía, le pone un mueble de fondo para "darle cuerpo".
function addSign(m, x, y, text, backing = CABINET) {
  if (m.layers.deco[y][x] === -1) m.layers.deco[y][x] = backing;
  m.collision[y][x] = 1;
  m.signs.push({ x, y, lines: Array.isArray(text) ? text : [text] });
}

const GYM_BUILDERS = {};

function register(id, builder) { GYM_BUILDERS[id] = builder; }

// Conecta el felpudo de salida del gimnasio con su baldosa exterior y fija el
// spawn del jugador justo encima del felpudo (igual que interiors.js::linkExit).
function linkExit(m, matX, matY, exit) {
  m.warps.push({ x: matX, y: matY, toMap: exit.map, toX: exit.x, toY: exit.y, dir: exit.dir || 'down' });
  m.playerSpawn = { x: matX, y: matY - 1 };
  m.healSpawn = { x: matX, y: matY - 1 };
}

// Coloca al líder de gimnasio mirando hacia abajo (al jugador) al fondo de la
// arena, con su `trainer` completo. El campo `badge` hace que, al vencerlo,
// BattleScene añada la medalla a save.flags.badges y muestre el aviso clásico.
function addLeader(m, x, y, npc) {
  m.npcs.push({ ...npc, x, y, dir: 'down', roam: false });
}

// Pasillo de alfombra desde el felpudo hasta el líder (estética de gimnasio).
function carpetAisle(m, matX, fromY, toY) {
  for (let y = toY; y <= fromY; y++) {
    if (m.layers.deco[y][matX] === -1) m.layers.deco[y][matX] = CARPET;
  }
}

// ---------- definición de cada gimnasio ----------
//
// Config común: { exit } = { map, x, y, dir } a dónde te devuelve el felpudo.

// ===== GIMNASIO 1 · CASHFLOW CENTRAL — Iván "FinTips" (Normal/Eléctrico) =====
// Distrito financiero / despacho de inversión. Líder financiero; su "as" es un
// Persian Chamberiano (el Porygon-Z del lore, remapeado a Gen 1: gato del dinero)
// rematado por un Raichu (la "chispa" del trading). Entrenador menor: becario.
register('gym_cashflow', (exit) => {
  const { m, matX, matY } = makeRoom('gym_cashflow', 'GIMNASIO CASHFLOW', 11, 11, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  carpetAisle(m, matX, matY - 1, 4);
  // Mostradores de "bolsa": pantallas de cotización (mesas) a ambos lados.
  setSolid(m, 1, 3, TABLE); setSolid(m, 2, 3, TABLE);
  setSolid(m, 8, 3, TABLE); setSolid(m, 9, 3, TABLE);
  setSolid(m, 1, 6, SHELF); // archivador de Excels
  setSolid(m, 9, 6, SHELF);
  m.layers.deco[5][2] = PLANT; m.layers.deco[5][8] = PLANT;
  // Becario del fondo (entrenador menor opcional) — bloquea el flanco izquierdo.
  m.npcs.push({
    id: 'gym_cashflow_becario', sprite: 'gentleman', x: 3, y: 6, dir: 'right', roam: false,
    trainer: {
      name: 'BECARIO DE IVÁN',
      title: 'Analista en prácticas',
      party: [
        { species: 100, level: 11 }, // Voltorb (volátil, como su cartera apalancada)
        { species: 52, level: 12 },  // Meowth (gato del dinero, junior)
      ],
      intro: [
        'Iván me paga en "experiencia" y café. Si quieres pasar a verlo, primero rentabilízame a mí.',
        'Llevo tres pantallas, dos cafés y un Excel abierto desde las seis. El ROI de combatirte es bajo, pero lo apunto igual.',
      ],
      win: ['Vale, vale, has batido al mercado. No se lo digas a Iván o me sube la "carga formativa".'],
      defeat: ['Diversifica el equipo, anda. Apalancarte en un solo bicho es de novato.'],
      prize: 240,
      flag: 'gym_cashflow_becario',
    },
  });
  // LÍDER: Iván "FinTips".
  addLeader(m, matX, 3, {
    id: 'gym_leader_ivan', sprite: 'gentleman',
    trainer: {
      name: 'IVÁN "FINTIPS"',
      title: 'Líder · Gimnasio Cashflow',
      badge: 'Liquidez',
      party: [
        { species: 81, level: 12 },  // Magnemite (cripto-bro: imán de capital, Eléctrico)
        { species: 25, level: 13 },  // Pikachu (la "chispa" del mercado)
        { species: 53, level: 15 },  // Persian — AS (Persian Chamberiano = Porygon-Z del lore, Normal)
      ],
      intro: [
        'Ah, Marcelino, el visionario. Antes de combatir... ¿me enseñas tu Excel de rentabilidad? No acepto combates sin ROI.',
        'Yo lo observo todo desde la barrera, cartera bien diversificada: cripto, ladrillo, un poco de rent2rent. Un equipo Pokémon es exactamente eso: una cartera. Si no inviertes, ¿cómo esperas vencer?',
        'Mi Persian no maquina como el Porygon que querría, pero lanza el "Día de Pago" igual de bien. Veamos si tu caos tiene rentabilidad de verdad.',
      ],
      win: [
        'Vaya... la improvisación me ha batido el índice. Eso no estaba en mi modelo de riesgo.',
        'Toma la Medalla Liquidez, te la has ganado con números reales. Y oye: lo del fondo conjunto sigue en pie, tú el caos y yo el Excel. Nos forramos.',
      ],
      defeat: [
        'Previsible. El caos sin gestión de riesgo siempre acaba en margin call.',
        'Vuelve cuando hayas... rebalanceado el equipo. Y nunca, jamás, le pidas un préstamo a Eduardo.',
      ],
      prize: 1500,
      flag: 'gym_cashflow_ivan',
    },
  });
  addSign(m, 1, 9, 'PANEL DE COTIZACIÓN — "Bravo Murillo: +0,3%. Vape de Jesús: en caída libre. Alquiler de José Antonio: máximos históricos."');
  addSign(m, 9, 9, 'NORMA DEL GIMNASIO — "Aquí se combate con ROI. El que pierde, invita a las bravas. Firmado: Iván."');
  return m;
});

// ===== GIMNASIO 2 · TRADING & CASINO — Mariel (Eléctrico) =====
// Sala de trading high-frequency con tapete de casino. Líder hiperactiva; "as"
// es Electrode (el más veloz, su algoritmo HFT) rematando un Jolteon (energía
// pura). Entrenador menor: crupier ludópata.
register('gym_trading', (exit) => {
  const { m, matX, matY } = makeRoom('gym_trading', 'GIMNASIO TRADING', 11, 11, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  carpetAisle(m, matX, matY - 1, 4);
  // Tapetes de casino (alfombra) a los lados + máquinas de cotización.
  m.layers.deco[6][2] = CARPET; m.layers.deco[6][3] = CARPET;
  m.layers.deco[6][7] = CARPET; m.layers.deco[6][8] = CARPET;
  setSolid(m, 2, 3, TABLE); setSolid(m, 8, 3, TABLE); // pantallas de velas japonesas
  setSolid(m, 1, 6, CABINET); setSolid(m, 9, 6, CABINET);
  m.layers.deco[3][1] = PLANT; m.layers.deco[3][9] = PLANT;
  // Crupier ludópata (entrenador menor opcional).
  m.npcs.push({
    id: 'gym_trading_crupier', sprite: 'lass', x: 3, y: 6, dir: 'right', roam: false,
    trainer: {
      name: 'CRUPIER MARÍA',
      title: 'Reparte cartas y derrotas',
      party: [
        { species: 100, level: 15 }, // Voltorb (la ruleta que explota)
        { species: 25, level: 16 },  // Pikachu
      ],
      intro: [
        '¡Hagan juego! El que pierde paga la ronda. ¿Te atreves con la banca antes de ver a Mariel?',
        'Spoiler: la banca, o sea yo, casi siempre gana. Casi.',
      ],
      win: ['¡Mecachis, pleno a tu favor! Pasa, pasa, que Mariel ya te ha visto venir en sus gráficos.'],
      defeat: ['¡La casa gana! Vuelve con más fichas... digo, con más nivel.'],
      prize: 320,
      flag: 'gym_trading_crupier',
    },
  });
  // LÍDER: Mariel.
  addLeader(m, matX, 3, {
    id: 'gym_leader_mariel', sprite: 'lass',
    trainer: {
      name: 'MARIEL',
      title: 'Líder · Reina del High-Frequency',
      badge: 'Velocidad',
      party: [
        { species: 25, level: 16 },  // Pikachu
        { species: 135, level: 18 }, // Jolteon (energía desbordante, hiperactiva)
        { species: 101, level: 19 }, // Electrode — AS (el más veloz: su algoritmo HFT)
      ],
      intro: [
        '¡Marceee! ¡Mi amor, qué casualidad, justo cerraba un arbitraje en tres exchanges y bordaba un pleno en el casino, una locura, el spread divino pero el slippage, ay!',
        '¿Sabes lo que es el high-frequency trading? Microsegundos, latencia, colocación de órdenes... ¡es como bailar sevillanas pero con velas japonesas! Y yo voy a clases de sevillanas, ¿te lo había contado?',
        '¡Que me enrollo! Iván dice que hablo más rápido que sube el Bitcoin. ¡Combáteme y te enseño lo que es la VELOCIDAD, papá!',
      ],
      win: [
        '¡NOOO, mi liquidez! Vale, has sido más rápido que mi algoritmo. Respeto, respeto.',
        '¡Toma la Medalla Velocidad! Y oye, ¿montamos fondo? Tú el caos, yo el HFT, Iván el Excel... ¡nos forramos! Ya hablamos, que me voy a sevillanas. ¡Chaooo!',
      ],
      defeat: [
        '¡JA! ¿Ves? ¡VELOCIDAD! Esto es como el casino, cariño: la banca, o sea YO, siempre gana.',
        'Vuelve cuando subas de nivel, ¡un besito! Y dile a Iván que ya le he ganado el spread de hoy.',
      ],
      prize: 1900,
      flag: 'gym_trading_mariel',
    },
  });
  addSign(m, 1, 9, 'PANTALLA HFT — "Latencia: 0,3 ms. Sevillanas: nivel 2. Bitcoin: que suba, que suba. Slippage: NO MIRAR."');
  addSign(m, 9, 9, 'AVISO — "Prohibido el vapeo de Jesús cerca de los servidores. La última vez petó el algoritmo."');
  return m;
});

// ===== GIMNASIO 3 · FANTASMA DE LUXEMBURGO — Jesús "la Rata" (Veneno/Fantasma) =====
// Sótano lleno de vapor; el más desordenado de España, vuelve de Luxemburgo
// "con pelo, flow y venganza". "As" doble: Weezing (vapeo) + Gengar (fantasma).
// Entrenador menor: vapeador del fondo.
register('gym_fantasma', (exit) => {
  const { m, matX, matY } = makeRoom('gym_fantasma', 'GIMNASIO FANTASMA', 11, 12, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  carpetAisle(m, matX, matY - 1, 4);
  // Decoración: cachivaches de vapeo y mugre (estanterías desordenadas).
  setSolid(m, 1, 3, SHELF); setSolid(m, 2, 3, CABINET); // trastero de vapes
  setSolid(m, 8, 3, CABINET); setSolid(m, 9, 3, SHELF);
  setSolid(m, 1, 7, TABLE);  setSolid(m, 9, 7, TABLE);   // mesas con comida ajena
  m.layers.deco[6][2] = PLANT; m.layers.deco[6][8] = PLANT; // plantas medio muertas
  // Vapeador del fondo (entrenador menor opcional).
  m.npcs.push({
    id: 'gym_fantasma_vapeador', sprite: 'pokemaniac', x: 3, y: 7, dir: 'right', roam: false,
    trainer: {
      name: 'COLEGA DE JESÚS',
      title: 'Aprendiz de la nube',
      party: [
        { species: 109, level: 18 }, // Koffing
        { species: 88, level: 19 },  // Grimer (mugre andante)
      ],
      intro: [
        'Buah, qué humo, ¿no? Jesús dejó el vape encendido y ya no se ve ni el suelo. Combáteme mientras se despeja.',
        'Llevo aquí desde que la Rata se fue a Luxemburgo. Sobrevivo a base de comida ajena, como él me enseñó.',
      ],
      win: ['Cof, cof... vale, pasa. Jesús está al fondo, con pelo nuevo y mala leche.'],
      defeat: ['¡Toma vapor! Vuelve cuando se te aclaren las ideas... y los pulmones.'],
      prize: 380,
      flag: 'gym_fantasma_vapeador',
    },
  });
  // LÍDER: Jesús "la Rata".
  addLeader(m, matX, 3, {
    id: 'gym_leader_jesus', sprite: 'pokemaniac',
    trainer: {
      name: 'JESÚS "LA RATA"',
      title: 'Líder · Fantasma de Luxemburgo',
      badge: 'Niebla',
      party: [
        { species: 109, level: 20 }, // Koffing
        { species: 93, level: 21 },  // Haunter (el injerto fantasmal)
        { species: 110, level: 22 }, // Weezing (el vapeo eterno)
        { species: 94, level: 24 },  // Gengar — AS (vuelve "con pelo, flow y venganza")
      ],
      intro: [
        'Hombre, Marcelino... *exhala una nube densa de vapor* Te abandoné en el piso lleno de mugre... pero he vuelto. Con pelo, flow y venganza.',
        'Luxemburgo me hizo rico, me hizo un injerto y me hizo MÁS desordenado, si es que se podía. Este gimnasio huele a lo que dejé bajo tu cama.',
        'No tengo casa fija, pero tengo niebla, ratas y dos bichos que envenenan y otros dos que atraviesan paredes. Respira hondo... mejor no respires. ¡Vamos!',
      ],
      win: [
        '...Buah. Me has ganado en mi propio humo. *tose, se atusa el injerto* Eso tiene mérito, primo.',
        'Toma la Medalla Niebla. Y oye, ¿me dejas un sofá unos meses? Prometo no vapear dentro. Es mentira, pero prométemelo tú a mí.',
      ],
      defeat: [
        'Jejeje... el caos siempre vuelve, como yo de Luxemburgo. *otra calada al vape*',
        'Vuelve cuando aguantes el humo, fiera. Y tráete comida, que aquí compartimos... lo tuyo.',
      ],
      prize: 2400,
      flag: 'gym_fantasma_jesus',
    },
  });
  addSign(m, 1, 10, 'PINTADA EN LA PARED — "Volví con pelo. Volví con flow. Volví con venganza. — La Rata"');
  addSign(m, 9, 10, 'NOTA SUCIA — "Lo que olía bajo tu cama en 2019 sigue vivo. Le he puesto nombre. — J."');
  return m;
});

// ===== GIMNASIO 4 · CAMIÓN DE LAVAPIÉS — Sergio Guillén (Lucha/Normal) =====
// Caja de un camión aparcado (donde duerme): cervezas, fútbol y fuerza bruta.
// "As": Machamp (fuerza) rematando un Snorlax (mediocridad cervecera, Normal).
// Entrenador menor: amigo de la Bundesliga.
register('gym_camion', (exit) => {
  const { m, matX, matY } = makeRoom('gym_camion', 'GIMNASIO CAMIÓN', 11, 11, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  carpetAisle(m, matX, matY - 1, 4);
  // Caja del camión: cajas de cerveza (vitrinas), saco de boxeo (mesa), tele.
  setSolid(m, 1, 3, CABINET); setSolid(m, 2, 3, CABINET); // palés de cerveza
  setSolid(m, 8, 3, CABINET); setSolid(m, 9, 3, CABINET);
  setSolid(m, 1, 6, TABLE);   setSolid(m, 9, 6, TABLE);   // banco de pesas / saco
  m.layers.deco[7][2] = CARPET; m.layers.deco[7][8] = CARPET;
  // Amigo de la Bundesliga (entrenador menor opcional).
  m.npcs.push({
    id: 'gym_camion_bundesliga', sprite: 'hiker', x: 3, y: 6, dir: 'right', roam: false,
    trainer: {
      name: 'COLEGA DE SERGIO',
      title: 'Forofo de la Bundesliga',
      party: [
        { species: 56, level: 22 },  // Mankey
        { species: 57, level: 24 },  // Primeape (puños cerveceros)
      ],
      intro: [
        'Cierra la puerta del camión, que entra frío y se calienta la cerveza. ¿Una cañita antes del combate? No hay huevos.',
        'Sergio y yo solo libramos 7 días al año, así que esto va rápido: te zumbo y nos vemos en La que se avecina.',
      ],
      win: ['¡Buah, qué owned! Pasa al fondo, Sergio está echando la siesta en la cabina. Despiértalo tú, que a mí me da miedo.'],
      defeat: ['¡A la próxima trae bravas! Sin bravas no hay revancha, chaval.'],
      prize: 480,
      flag: 'gym_camion_bundesliga',
    },
  });
  // LÍDER: Sergio Guillén.
  addLeader(m, matX, 3, {
    id: 'gym_leader_sergio', sprite: 'hiker',
    trainer: {
      name: 'SERGIO GUILLÉN',
      title: 'Líder · El Camionero de Lavapiés',
      badge: 'Cerveza',
      party: [
        { species: 57, level: 25 },  // Primeape (fuerza bruta de barra)
        { species: 128, level: 26 }, // Tauros (embestida de camión)
        { species: 143, level: 27 }, // Snorlax (7 días de vacaciones al año, dormido)
        { species: 68, level: 30 },  // Machamp — AS (Slaking Cervecero del lore, cuatro brazos para cuatro cañas)
      ],
      intro: [
        '¿Una cañita y unas bravas antes de tu combate? No hay huevos. *eructa, se rasca con casco de camionero puesto*',
        'Yo duermo en el camión, libro 7 días al año y veo la Bundesliga con una birra calentita. Fuerza bruta y poco más, pero la fuerza bruta GANA combates, chaval.',
        'Mi Machamp tiene cuatro brazos: uno para cada caña. Si me ganas, te invito. Y yo NUNCA invito. ¡Vamos allá!',
      ],
      win: [
        '...Joé. Me has ganado y encima sobrio. Eso no lo veía venir ni en La que se avecina.',
        'Toma la Medalla Cerveza, que es la única ronda que pago en mi vida. Y dile a Marcelino... espera, eres tú. Pues eso, paga tú la próxima.',
      ],
      defeat: [
        '¡JA! Fuerza bruta, chaval. El gimnasio no se gana con Excels, se gana con bíceps y birra.',
        'Vuelve cuando le eches huevos. Y trae bravas, que ya te lo ha dicho mi colega.',
      ],
      prize: 3000,
      flag: 'gym_camion_sergio',
    },
  });
  addSign(m, 1, 9, 'TABLÓN DEL CAMIÓN — "Calendario Bundesliga. Vacaciones: 7 días (ya gastados). Nevera: NO TOCAR sin pagar."');
  addSign(m, 9, 9, 'PEGATINA — "Este camión es mi casa, mi gimnasio y mi bar. Aparcar = combatir. — Sergio"');
  return m;
});

// ---------- ensamblado (espeja interiors.js::BUILDING_LINKS / buildInteriors) ----------
//
// Mapa de cada gimnasio → su baldosa de salida exterior. `exit` es a dónde te
// devuelve el felpudo al salir (la casilla de delante de la puerta del gimnasio
// en el overworld). Las coordenadas `exit` de abajo son PLACEHOLDERS coherentes
// con las ciudades existentes; el orquestador debe ajustarlas a la baldosa real
// de cada puerta cuando añada los warps en maps.js (ver bloque de DOC al final).

export const GYM_LINKS = [
  // GIM 1 · Cashflow (Iván) → ciudad TETUÁN (distrito financiero del barrio).
  { gym: 'gym_cashflow', exit: { map: 'tetuan', x: 20, y: 9, dir: 'down' } },
  // GIM 2 · Trading/Casino (Mariel) → ciudad CHAMBERÍ (junto a Iván).
  { gym: 'gym_trading', exit: { map: 'chamberi', x: 14, y: 10, dir: 'down' } },
  // GIM 3 · Fantasma (Jesús) → ciudad CHAMBERÍ (sótano cerca de la Estación Fantasma).
  { gym: 'gym_fantasma', exit: { map: 'chamberi', x: 17, y: 26, dir: 'down' } },
  // GIM 4 · Camión (Sergio) → ciudad CHAMBERÍ (zona sur, donde aparca).
  { gym: 'gym_camion', exit: { map: 'chamberi', x: 11, y: 25, dir: 'down' } },
];

// Construye todos los gimnasios enlazados a su salida exterior.
// Uso desde maps.js (a confirmar por el orquestador), idéntico a buildInteriors:
//   import { buildGyms } from './gyms.js';
//   Object.assign(MAPS, buildGyms());
export function buildGyms() {
  const out = {};
  for (const link of GYM_LINKS) {
    const build = GYM_BUILDERS[link.gym];
    if (!build) continue;
    out[link.gym] = build({ map: link.exit.map, x: link.exit.x, y: link.exit.y, dir: link.exit.dir });
  }
  return out;
}

// =====================================================================
// WARPS A CONECTAR POR EL ORQUESTADOR (NO se tocan maps.js / interiors.js aquí)
// =====================================================================
//
// Cada gimnasio es un mapa interior cerrado con UN felpudo de salida ya enlazado
// a `GYM_LINKS[i].exit`. Para engancharlos al mundo, el orquestador debe:
//
//   1) Registrar los mapas: en maps.js, tras construir MAPS, fusionar los
//      gimnasios igual que ya se hace con los interiores. Ejemplo (a confirmar):
//        import { buildGyms } from './gyms.js';
//        Object.assign(MAPS, buildGyms());   // o el mecanismo que use el motor
//
//   2) Añadir el WARP DE ENTRADA en la baldosa de la PUERTA de cada gimnasio,
//      en el `warps` de la ciudad correspondiente (mismo formato que los warps
//      de interiors.js). El jugador entra por la puerta y aparece en el
//      `playerSpawn` del gimnasio (encima del felpudo, mirando arriba).
//
//   3) Asegurar que la `exit` de GYM_LINKS apunta a la baldosa JUSTO DEBAJO de
//      esa puerta (la casilla a la que se reaparece al salir). Las coords de
//      GYM_LINKS son placeholders: ajustarlas a la baldosa real de cada puerta.
//
// TABLA DE WARPS DE ENTRADA SUGERIDOS (desde ciudad → gimnasio):
// ┌──────────────┬───────────┬──────────────────────┬──────────────────────────────┐
// │ Gimnasio     │ Ciudad    │ Puerta (entrada)     │ Reaparición al salir (exit)  │
// ├──────────────┼───────────┼──────────────────────┼──────────────────────────────┤
// │ gym_cashflow │ tetuan    │ door  { x:20, y:8 }   │ exit { x:20, y:9, dir:down }  │
// │ gym_trading  │ chamberi  │ door  { x:14, y:9 }   │ exit { x:14, y:10, dir:down } │
// │ gym_fantasma │ chamberi  │ door  { x:17, y:25 }  │ exit { x:17, y:26, dir:down } │
// │ gym_camion   │ chamberi  │ door  { x:11, y:24 }  │ exit { x:11, y:25, dir:down } │
// └──────────────┴───────────┴──────────────────────┴──────────────────────────────┘
//
// Es decir, por cada fila, añadir al `m.warps` de la CIUDAD (no del gimnasio):
//   tetuan:   { x:20, y:8,  toMap:'gym_cashflow', toX:<spawnX>, toY:<spawnY>, dir:'up' }
//   chamberi: { x:14, y:9,  toMap:'gym_trading',  toX:<spawnX>, toY:<spawnY>, dir:'up' }
//   chamberi: { x:17, y:25, toMap:'gym_fantasma', toX:<spawnX>, toY:<spawnY>, dir:'up' }
//   chamberi: { x:11, y:24, toMap:'gym_camion',   toX:<spawnX>, toY:<spawnY>, dir:'up' }
// donde <spawnX>/<spawnY> = el `playerSpawn` del gimnasio destino (lo fija
// linkExit: x = centro del mapa, y = altura-2). El motor ya usa el playerSpawn
// del mapa destino al entrar, así que toX/toY pueden tomarse de ahí.
//
// NOTA: las coords `door`/`exit` de arriba son SUGERENCIAS sobre casillas
// caminables plausibles de cada ciudad; el orquestador debe verificarlas contra
// la colisión real de tetuan/chamberi en maps.js y reubicar la puerta si pisa
// un edificio o un árbol. Lo único fijo es la correspondencia gimnasio↔ciudad y
// que la `exit` quede en la baldosa inmediatamente DEBAJO de la puerta.
