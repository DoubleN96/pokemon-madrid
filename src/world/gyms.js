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
// Líderes (tipo → "as", niveles progresivos 12-48), según docs/SPEC-POKEMON-PISO.md:
//   1. Iván "FinTips"   (Normal/Eléctrico, as: Persian "Porygon-Z" + Raichu)  L12-15
//   2. Mariel           (Eléctrico,        as: Electrode + Jolteon)            L16-19
//   3. Jesús "la Rata"  (Veneno/Fantasma,  as: Weezing + Gengar)              L20-24
//   4. Sergio Guillén   (Lucha/Normal,     as: Machamp + Snorlax)             L25-30
//   5. Blanca           (Psíquico/Hada,    as: Mr.Mime + Alakazam)            L32-36  ← Ruta 3 · Gran Vía
//   6. Eduardo + Madre  (Veneno/Siniestro, as: Persian + Muk/Weezing)         L36-40  ← Parque del Retiro
//   7. Ángel            (Acero/Psíquico,   as: Magneton + Alakazam)           L40-44  ← Parque del Retiro
//   8. Adrián Barrera   (Siniestro/Fantasma,as: Arbok + Gengar — el más duro) L44-48  ← Ruta 3 · Gran Vía
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
    id: 'gym_leader_ivan', sprite: 'ivan_fintips',
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
    id: 'gym_leader_mariel', sprite: 'mariel',
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
    id: 'gym_leader_jesus', sprite: 'jesus_la_rata',
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
    id: 'gym_leader_sergio', sprite: 'sergio_guillen',
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

// ===== GIMNASIO 5 · ACADEMIA DE NOTARÍAS ENCANTADAS — Blanca (Psíquico/Hada) =====
// Despacho notarial impecable: archivadores, sellos y mucha jurisprudencia. Líder
// dulce y sensata (la novia de Álvaro, "el único punto de cordura"); te gana "con
// cariño y jurisprudencia". "As": Alakazam (la mente que todo lo registra) rematando
// un Mr. Mime (la pantomima notarial; Psíquico/Hada en este pokedex). Gen 1 no tiene
// Gardevoir → Mr.Mime/Alakazam, como propone la nota de diseño del SPEC. Entrenador
// menor: el opositor a notarías que lleva ocho convocatorias.
register('gym_notarias', (exit) => {
  const { m, matX, matY } = makeRoom('gym_notarias', 'GIMNASIO NOTARÍAS', 11, 12, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  carpetAisle(m, matX, matY - 1, 4);
  // Mostradores de firma y archivadores de expedientes (orden absoluto).
  setSolid(m, 1, 3, TABLE); setSolid(m, 2, 3, TABLE);   // mesa de firmas
  setSolid(m, 8, 3, TABLE); setSolid(m, 9, 3, TABLE);
  setSolid(m, 1, 6, CABINET); setSolid(m, 9, 6, CABINET); // archivadores de escrituras
  setSolid(m, 1, 8, SHELF);  setSolid(m, 9, 8, SHELF);    // tomos del código civil
  m.layers.deco[5][2] = PLANT; m.layers.deco[5][8] = PLANT;
  // Opositor eterno (entrenador menor opcional).
  m.npcs.push({
    id: 'gym_notarias_opositor', sprite: 'scientist', x: 3, y: 6, dir: 'right', roam: false,
    trainer: {
      name: 'OPOSITOR A NOTARÍAS',
      title: 'Octava convocatoria',
      party: [
        { species: 96, level: 31 },  // Drowzee (la mente machacada de tanto repasar)
        { species: 122, level: 32 }, // Mr. Mime (mima el temario, no se lo sabe)
      ],
      intro: [
        'Llevo OCHO convocatorias, ocho. Blanca aprobó a la primera y encima es maja. La vida es injusta, combáteme.',
        'Si me ganas, paso página del tema 47. Si pierdes, te lo recito entero. Tú verás qué prefieres.',
      ],
      win: ['Vale, vale, pasa con Blanca. Yo vuelvo al tema 47, que me lo sé... casi.'],
      defeat: ['¡Suspendido! Como yo, pero al menos tú puedes presentarte otra vez. Anda, repasa.'],
      prize: 1280,
      flag: 'gym_notarias_opositor',
    },
  });
  // LÍDER: Blanca.
  addLeader(m, matX, 3, {
    id: 'gym_leader_blanca', sprite: 'blanca_notarias',
    trainer: {
      name: 'BLANCA',
      title: 'Líder · Academia de Notarías Encantadas',
      badge: 'Contrato',
      party: [
        { species: 35, level: 32 },  // Clefairy (el "hada" castiza; Normal en Gen 1)
        { species: 36, level: 34 },  // Clefable (la fe pública evolucionada)
        { species: 122, level: 35 }, // Mr. Mime (la pantomima notarial, Psíquico/Hada)
        { species: 65, level: 36 },  // Alakazam — AS (la mente que registra cada cláusula)
      ],
      intro: [
        'Hola otra vez, Marcelino. Aquí, en la Gran Vía, tengo el despacho en regla y al día. Antes de batirnos, fírmame el consentimiento. Aquí, aquí y... aquí.',
        'Sí, sigo siendo la novia de Álvaro y el único punto de cordura de todo este caos de pisos, Tinder y vapeo. Alguien tiene que llevar los papeles, ¿no crees?',
        'Te voy a ganar con cariño y jurisprudencia, sin un solo vicio de forma. ¿Me firmas también el consentimiento para perder? Es por dejarlo todo registrado.',
      ],
      win: [
        'Impecable. Queda debidamente protocolizado: has vencido en buena lid y elevado a público tu mérito.',
        'Toma la Medalla Contrato, con su factura y su sello. Y dile a Álvaro que se duche más de tres minutos; a ti te hará más caso que a mí. Suerte arriba, cielo.',
      ],
      defeat: [
        'Caso cerrado, sin acritud. La burocracia siempre gana, es ley de vida y de notaría.',
        'Estudia un poquito y vuelves cuando quieras. Te espero con los papeles preparados y el sello a mano.',
      ],
      prize: 4200,
      flag: 'gym_notarias_blanca',
    },
  });
  addSign(m, 1, 10, 'TABLÓN DE LA ACADEMIA — "Para combatir en la Liga: aporte original y copia. Las pociones usadas tributan al 21%. Firmado: Blanca."');
  addSign(m, 9, 10, 'PLACA — "Mejor promoción de notarías. Y sí, también la mejor novia de la región, no como cierto Vicepresidente del Humo."');
  return m;
});

// ===== GIMNASIO 6 · TIENDA DE TODO A CIEN — Eduardo + la Madre (Veneno/Siniestro) =====
// Doble liderazgo (SPEC 3.D: "Eduardo + su madre", te cobran por usar pociones). Un
// bazar tacaño donde hasta el aire se factura. Sableye/Greedent no son Gen 1 → se usan
// Persian/Meowth (avaricia que araña), Muk/Weezing (la mugre venenosa que acumulan) y
// Gengar/Haunter (el duende que roba joyas del lore de la Madre). Entrenador menor:
// Sofía, la novia omnipresente, que cobra la entrada.
register('gym_tacanos', (exit) => {
  const { m, matX, matY } = makeRoom('gym_tacanos', 'GIMNASIO TACAÑOS', 11, 12, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  carpetAisle(m, matX, matY - 1, 4);
  // Estanterías de bazar repletas y caja registradora (todo se cobra).
  setSolid(m, 1, 3, SHELF); setSolid(m, 2, 3, SHELF);   // baratijas chinas
  setSolid(m, 8, 3, SHELF); setSolid(m, 9, 3, SHELF);
  setSolid(m, 1, 6, TABLE); setSolid(m, 9, 6, TABLE);   // mostrador con caja registradora
  setSolid(m, 1, 8, CABINET); setSolid(m, 9, 8, CABINET); // vitrina de "ofertas" no rebajadas
  m.layers.deco[7][2] = PLANT; m.layers.deco[7][8] = PLANT;
  // Sofía — novia omnipresente de Eduardo (entrenador menor opcional).
  m.npcs.push({
    id: 'gym_tacanos_sofia', sprite: 'lass', x: 3, y: 6, dir: 'right', roam: false,
    trainer: {
      name: 'SOFÍA',
      title: 'Novia (y caja) de Eduardo',
      party: [
        { species: 52, level: 35 },  // Meowth (recauda monedas)
        { species: 88, level: 36 },  // Grimer (lo que se pega a la cartera ajena)
      ],
      intro: [
        'Para ver a Eduardo y a su madre hay que pasar por caja. Son 3 pavos la entrada, 2 más por respirar el aire acondicionado. ¿Pagas o combates?',
        'Llevo organizando nuestra boda pública desde 2019. La pagamos a plazos... bueno, la paga su madre a plazos. Combáteme mientras imprimo facturas.',
      ],
      win: ['Vale, pasa, pero NO toques nada que no esté pagado. Eduardo, ¡cariño, tienes visita que no ha pagado el aire!'],
      defeat: ['¡Caja registradora hace CHING! Vuelve con el cambio justo, que aquí no se devuelve.'],
      prize: 1500,
      flag: 'gym_tacanos_sofia',
    },
  });
  // LÍDERES: Eduardo (delante) + la Madre (al fondo, la "mente maestra").
  // La Madre es el verdadero AS: lleva el equipo más fuerte y la medalla.
  m.npcs.push({
    id: 'gym_leader_eduardo', sprite: 'eduardo', x: matX - 2, y: 4, dir: 'down', roam: false,
    trainer: {
      name: 'EDUARDO',
      title: 'El del Postureo en Redes',
      party: [
        { species: 52, level: 36 },  // Meowth ("Día de Pago")
        { species: 53, level: 38 },  // Persian (la avaricia que araña)
        { species: 110, level: 39 }, // Weezing (la imagen que monta humo)
      ],
      intro: [
        '*selfie con la caja registradora de fondo* Ah, Marcelino. Espera, que esto sube a stories: "Domingo de bazar familiar y reflexión". Con esta luz quedo divino.',
        'Te combato, pero te aviso: aquí cada poción que uses te la cobro. Genética pura. Mi madre le cobró una Coca-Cola a Álvaro y lo cuenta con ORGULLO. Cuando me ganes —si me ganas— habla con ella, que es la jefa.',
      ],
      win: [
        'Bueno... lo borro de stories y arreglado. Para los seguidores, hoy NO he perdido. Pasa con mi madre, valiente. Suerte la vas a necesitar.',
      ],
      defeat: [
        '¡Y a esto le llamo yo rentabilidad! Tu derrota, mis stories, cero gasto. Engagement puro, primo.',
        'Vuelve cuando puedas permitirte perder con estilo. El estilo no se regala. Ni yo, ni mi madre, regalamos nada.',
      ],
      prize: 1800,
      flag: 'gym_tacanos_eduardo',
    },
  });
  addLeader(m, matX + 1, 3, {
    id: 'gym_leader_madre', sprite: 'elder_m',
    trainer: {
      name: 'LA MADRE DE EDUARDO',
      title: 'Líder · Mente Maestra de la Tacañería',
      badge: 'Hipoteca',
      party: [
        { species: 53, level: 37 },  // Persian (araña hasta el último céntimo)
        { species: 109, level: 38 }, // Koffing (el aire que también cobra)
        { species: 93, level: 39 },  // Haunter (el duende que roba joyas del lore)
        { species: 89, level: 40 },  // Muk — AS (todo lo que acumula y NO comparte)
      ],
      intro: [
        '*gafas gruesas, mirada severa* Conque tú eres el amigo de mi hijo. El del caos. Siéntate. No, de pie, que la silla son 5 pavos.',
        'Yo cobro hasta el aire que respiras. Le cobré una Coca-Cola a tu amigo Álvaro y volvería a hacerlo. La tacañería, criatura, no es un defecto: es un MÉTODO.',
        'Mi Muk acumula todo lo que toca y no suelta ni una. Igualito que yo con la cartera. Combate, anda. Y como uses una poción, te la facturo con IVA.',
      ],
      win: [
        '...Hmpf. Me has ganado. Cosa que no perdono, pero registro. Toma la Medalla Hipoteca; te la has GANADO, que es lo único que respeto en esta vida: lo ganado.',
        'Y dile a mi hijo que deje de hacerse fotos y empiece a ahorrar. Que de algún sitio tiene que salir lo de su boda eterna. Ale, fuera, que cierro.',
      ],
      defeat: [
        'Lo que yo decía. Aquí no se gana gratis, ni la medalla ni nada. Todo se paga, criatura. TODO.',
        'Vuelve cuando tengas con qué. Y trae el dinero en mano, que aquí no se fía. Que se fió Jesús... y mira.',
      ],
      prize: 5000,
      flag: 'gym_tacanos_madre',
    },
  });
  addSign(m, 1, 10, 'LISTA DE PRECIOS — "Entrar: 3€. Respirar aire fresco: 2€. Mirar sin comprar: 5€. Usar el baño: PROHIBIDO. — La Dirección (Mamá)."');
  addSign(m, 9, 10, 'CARTEL — "Aquí NO se fía. Que se fió Jesús la Rata en 2019 y aún lo estamos cobrando. Pregunte por nuestra boda pública (financiada)."');
  return m;
});

// ===== GIMNASIO 7 · MÁSTER DE MÁSTERS — Ángel (Acero/Psíquico) =====
// Aula-laboratorio obsesivamente ordenada del "ansiolítico perfeccionista" que no
// deja ligar a Alex. Todo revisado tres veces. Tipo Acero/Psíquico → Magneton (el
// imán que todo lo alinea) + Alakazam (la revisión psíquica final). Entrenador menor:
// el alumno al que Ángel corrige sin parar.
register('gym_master', (exit) => {
  const { m, matX, matY } = makeRoom('gym_master', 'GIMNASIO MÁSTER', 11, 12, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  carpetAisle(m, matX, matY - 1, 4);
  // Pupitres alineados al milímetro y aparatos de "revisión".
  setSolid(m, 1, 3, TABLE); setSolid(m, 2, 3, TABLE);   // pupitres revisados
  setSolid(m, 8, 3, TABLE); setSolid(m, 9, 3, TABLE);
  setSolid(m, 1, 6, CABINET); setSolid(m, 9, 6, CABINET); // archivo de correcciones
  setSolid(m, 1, 8, SHELF);  setSolid(m, 9, 8, SHELF);    // manuales subrayados
  m.layers.deco[5][2] = PLANT; m.layers.deco[5][8] = PLANT;
  // Alumno corregido sin descanso (entrenador menor opcional).
  m.npcs.push({
    id: 'gym_master_alumno', sprite: 'guitarist', x: 3, y: 6, dir: 'right', roam: false,
    trainer: {
      name: 'ALUMNO DE ÁNGEL',
      title: 'Corregido en bucle',
      party: [
        { species: 81, level: 39 },  // Magnemite (alineado al milímetro)
        { species: 64, level: 40 },  // Kadabra (repasa, repasa, repasa)
      ],
      intro: [
        'Ángel me ha corregido el trabajo trece veces. TRECE. Combáteme antes de que encuentre el error catorce.',
        'Yo solo quería aprobar el máster. Vine con Alex "a ligar" y mira, acabé revisando comas a las tres de la mañana.',
      ],
      win: ['Vale, pasa con Ángel. Y si ves un fallo en mi formación... no se lo digas. Por favor.'],
      defeat: ['¡Error en tu línea de ataque! Ángel tenía razón: siempre hay un fallo. Repásalo.'],
      prize: 1560,
      flag: 'gym_master_alumno',
    },
  });
  // LÍDER: Ángel.
  addLeader(m, matX, 3, {
    id: 'gym_leader_angel', sprite: 'angel_perfeccionista',
    trainer: {
      name: 'ÁNGEL',
      title: 'Líder · El Ansiolítico Perfeccionista',
      badge: 'Revisión',
      party: [
        { species: 96, level: 40 },  // Drowzee (la mente que todo repasa)
        { species: 82, level: 42 },  // Magneton (tres imanes alineados, simétricos)
        { species: 64, level: 43 },  // Kadabra (penúltima revisión)
        { species: 65, level: 44 },  // Alakazam — AS (la revisión psíquica final, perfecta)
      ],
      intro: [
        'Un momento. Aquí, en mi máster, nada pasa sin mi revisión. Ni tú, ni tu estrategia, ni esa cuarta poción que llevas mal colocada en la mochila. La he visto. La he apuntado.',
        'Soy el que mantiene a Alex con los pies en la tierra. Si fuera por él estaría haciendo match con una eslava en lugar de aprobando. No. Lo. Permito.',
        'He repasado tu equipo tres veces y tiene fallos. Permíteme señalártelos uno a uno, con calma, antes de pulverizarte con precisión milimétrica. Cuando quieras.',
      ],
      win: [
        'Mmm. Aceptable. No es perfecto —nunca lo es— pero es... aceptable. Lo anoto en el cuaderno de mejoras, sección "imprevistos que no preví".',
        'Toma la Medalla Revisión. Y ordena la mochila antes de salir, te lo pido por favor: el orden reduce la ansiedad. La tuya, y sobre todo la mía.',
      ],
      defeat: [
        'Lo ves. Un fallo en la línea tres de tu plan. Te lo avisé. Siempre, SIEMPRE hay un fallo.',
        'Respira, corrígelo y vuelve. La perfección es un proceso, no un golpe de suerte. Yo te espero. No tengo ninguna prisa. Tengo todo medido.',
      ],
      prize: 4600,
      flag: 'gym_master_angel',
    },
  });
  addSign(m, 1, 10, 'NORMA DEL AULA — "Prohibido: improvisar, llegar tarde, dejar la mochila desordenada y ligar en horario lectivo. Cumplimiento: 100%. — Ángel."');
  addSign(m, 9, 10, 'CUADRO DE HONOR — "Trabajos sin un solo error: 0. Es estadísticamente imposible, pero seguimos intentándolo. Cada día. Sin falta."');
  return m;
});

// ===== GIMNASIO 8 · CUARTEL DEL TEAM SCHIZO — Adrián Barrera (Siniestro/Fantasma) =====
// El penúltimo reto y el MÁS DURO: la base del villano, donde Adrián impone su "Orden
// Perfecto". Música, risas por decreto y dominación intelectual. Mr.Mime Tirano del
// lore → en Gen 1, equipo Siniestro/Fantasma de control mental: Hypno (hipnosis),
// Arbok (la serpiente que aprieta), Haunter→Gengar (la sombra que controla). Entrenador
// menor: un comandante del Team Schizo (guiño a Cortina, sabotaje gástrico).
register('gym_schizo', (exit) => {
  const { m, matX, matY } = makeRoom('gym_schizo', 'CUARTEL TEAM SCHIZO', 11, 13, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  carpetAisle(m, matX, matY - 1, 4);
  // Sala de mando: pantallas de propaganda, atriles y vitrinas de "decretos".
  setSolid(m, 1, 3, CABINET); setSolid(m, 2, 3, CABINET); // archivos del "Orden Perfecto"
  setSolid(m, 8, 3, CABINET); setSolid(m, 9, 3, CABINET);
  setSolid(m, 1, 6, TABLE); setSolid(m, 9, 6, TABLE);     // atriles de decretos
  setSolid(m, 1, 8, SHELF); setSolid(m, 9, 8, SHELF);     // partituras y libros de debate
  m.layers.deco[7][2] = PLANT; m.layers.deco[7][8] = PLANT;
  // Comandante del Team Schizo (entrenador menor opcional).
  m.npcs.push({
    id: 'gym_schizo_comandante', sprite: 'psychic', x: 3, y: 6, dir: 'right', roam: false,
    trainer: {
      name: 'COMANDANTE SCHIZO',
      title: 'Sabotaje Gástrico',
      party: [
        { species: 89, level: 43 },  // Muk (revuelve estómagos)
        { species: 24, level: 44 },  // Arbok (aprieta hasta rendirte)
      ],
      intro: [
        'Alto. Para ver a Adrián, primero pasas por mí. Yo soy el que sabotea las cenas y revuelve los estómagos del enemigo. Una especialidad.',
        'El Orden Perfecto exige sacrificios. El mío fue el aparato digestivo. Combate, intruso del caos.',
      ],
      win: ['*náuseas* Ugh... pasa, pasa. Adrián te espera al fondo, con el ceño fruncido de siempre.'],
      defeat: ['¡El caos siempre revuelve! Vuelve cuando tengas el estómago... y el equipo, más fuertes.'],
      prize: 1760,
      flag: 'gym_schizo_comandante',
    },
  });
  // LÍDER: Adrián Barrera — el más duro de la Liga (penúltimo reto antes del Campeón).
  addLeader(m, matX, 3, {
    id: 'gym_leader_adrian', sprite: 'adrian_schizo',
    trainer: {
      name: 'ADRIÁN BARRERA',
      title: 'Líder · Tirano del Team Schizo',
      badge: 'Orden',
      party: [
        { species: 96, level: 44 },  // Drowzee (primera capa de control mental)
        { species: 24, level: 45 },  // Arbok (la serpiente que estrangula la voluntad)
        { species: 97, level: 46 },  // Hypno (hipnosis: el debate ganado por decreto)
        { species: 93, level: 46 },  // Haunter (la sombra que vigila)
        { species: 94, level: 48 },  // Gengar — AS (el Mr.Mime Tirano del lore, en sombra)
      ],
      intro: [
        'Vaya, vaya. El célebre Marcelino. El "Emprendedor Caótico". Has llegado lejos para alguien sin un plan decente. Me sorprende. Me irrita, pero me sorprende.',
        'Yo soy Adrián, y esto se acabó: el caos, los pisos, el Tinder, el vapeo, la improvisación de tres al cuarto. El Team Schizo impone el ORDEN PERFECTO. Vacaciones por decreto. Debates ganados por decreto. Y las risas... cuando YO lo diga.',
        '*frunce el ceño como un crío al que le quitan el postre* Mi madre me consintió todo y mira qué bien salí. Ahora te toca a ti obedecer. Mi equipo te va a poner en tu sitio. En el sitio CORRECTO. ¡Empieza el orden!',
      ],
      win: [
        '...No. NO. Esto no estaba en mi plan. *le tiembla el bigote* El caos no PUEDE vencer al orden, es... es incorrecto, es antinatural, voy a llamar a mi tía.',
        'Toma tu maldita Medalla Orden. Te la has ganado, lo reconozco, y odio reconocer cosas. Pero esto no acaba aquí: arriba te espera Álvaro, el Campeón. Y él SÍ tiene un Excel. Veremos cuánto te dura el caos contra la lógica perfecta.',
      ],
      defeat: [
        'Previsible. El caos nunca tuvo nada que hacer contra el Orden Perfecto. Lo tenía todo calculado, decretado y firmado.',
        'Vuelve cuando aceptes que el mundo necesita un dueño. Y ese dueño, querido Marcelino, soy yo. Yo y mi tía, que da el visto bueno.',
      ],
      prize: 7000,
      flag: 'gym_schizo_adrian',
    },
  });
  addSign(m, 1, 11, 'DECRETO Nº1 DEL TEAM SCHIZO — "Las vacaciones se planifican. Los debates se ganan por decreto. Las risas, cuando lo diga Adrián. Incumplir = expulsión."');
  addSign(m, 9, 11, 'PROCLAMA — "El caos es un error de diseño. El Orden Perfecto es inevitable. Música, risas e intelecto: los tres pilares. Firmado y sellado por mi tía."');
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
  // ---- GIMNASIOS 5-8 (Liga de 8 medallas), zona nueva (areaExtra.js) ----
  // El edificio GYM (4×4) se estampa en areaExtra.js sobre la baldosa indicada;
  // la `exit`/puerta es la baldosa caminable JUSTO DEBAJO del edificio (la libera
  // wireGymDoors). Coords verificadas contra la colisión real de ruta3/retiro
  // (footprint despejado + puerta alcanzable a pie desde el spawn de cada zona).
  // GIM 5 · Notarías (Blanca) → RUTA 3 · Gran Vía (plaza central oeste).
  { gym: 'gym_notarias', exit: { map: 'ruta3', x: 8, y: 14, dir: 'down' } },
  // GIM 6 · Tacaños (Eduardo + Madre) → PARQUE DEL RETIRO (esquina sureste, "bazar").
  { gym: 'gym_tacanos', exit: { map: 'retiro', x: 24, y: 26, dir: 'down' } },
  // GIM 7 · Máster (Ángel) → PARQUE DEL RETIRO (paseo norte, aula-laboratorio).
  { gym: 'gym_master', exit: { map: 'retiro', x: 21, y: 7, dir: 'down' } },
  // GIM 8 · Team Schizo (Adrián) → RUTA 3 · Gran Vía (plaza central este, cuartel).
  { gym: 'gym_schizo', exit: { map: 'ruta3', x: 14, y: 14, dir: 'down' } },
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
// │ gym_notarias │ ruta3     │ bldg  { 7,10 } 4×4    │ exit { x:8,  y:14, dir:down } │
// │ gym_tacanos  │ retiro    │ bldg  { 23,22 } 4×4   │ exit { x:24, y:26, dir:down } │
// │ gym_master   │ retiro    │ bldg  { 20,3 } 4×4    │ exit { x:21, y:7,  dir:down } │
// │ gym_schizo   │ ruta3     │ bldg  { 13,10 } 4×4   │ exit { x:14, y:14, dir:down } │
// └──────────────┴───────────┴──────────────────────┴──────────────────────────────┘
//
// NOTA gimnasios 5-8: a diferencia de los 1-4 (donde la "puerta" es 1 tile bajo un
// edificio ya existente en la ciudad), aquí areaExtra.js ESTAMPA el edificio GYM
// (4×4) en la baldosa `bldg` indicada y la puerta es la baldosa caminable JUSTO
// DEBAJO del edificio (= la `exit`). wireGymDoors la libera y crea el warp de
// entrada, igual que con los 1-4. El warp de SALIDA lo crea gyms.js vía linkExit.
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
