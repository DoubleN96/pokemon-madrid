// Módulo L (extensión) — LIGA CHAMBERÍ: el ENDGAME.
// Interior autocontenido (mismo patrón que `src/world/gyms.js` y `interiors.js`):
// una sala alargada con un pasillo central que sube desde el felpudo de salida,
// flanqueado por dos miembros del ALTO MANDO que bloquean el paso, hasta el
// CAMPEÓN Álvaro "Álvarín" Alonso al fondo. Gated tras las 8 medallas: la PUERTA
// de entrada (en Tetuán) lleva un warp con `require:{badges:8}` (ver wireLigaDoor).
//
// IMPORTANTE: este fichero NO toca maps.js, gyms.js ni interiors.js. Replica los
// helpers privados de gyms.js (makeRoom, mat2d, setSolid, addSign, linkExit,
// addLeader, constantes de tile) para mantenerse autónomo. Exporta:
//   - LIGA_LINKS  : [{ liga, exit:{map,x,y,dir} }]  (espeja GYM_LINKS)
//   - buildLiga() : construye el mapa interior (espeja buildGyms)
//   - wireLigaDoor(maps) : abre la puerta gated de Tetuán y la cablea
//
// El CAMPEÓN no da medalla (`badge`), sino la marca `champion:true`, que en
// BattleScene.handleTrainerWin() corona al jugador, fija save.flags.champion y
// muestra el Salón de la Fama. Su flag es `liga_campeon_alvaro`.
//
// Equipo del Campeón (lógica/optimización; Gen 1, IDs 1-151, L52-56, as L56):
//   1. Snorlax  (143) L52 — el muro: "duermo tres horas y aún aguanto más que tú"
//   2. Arcanine (59)  L53 — velocidad de ejecución, pura eficiencia
//   3. Gengar   (94)  L54 — el humo hecho Pokémon (es el Vicepresidente del Humo)
//   4. Gyarados (130) L54 — escala bestialmente, como su hoja de cálculo
//   5. Alakazam (65)  L55 — la lógica pura, el Excel viviente
//   6. Dragonite(149) L56 — AS: la optimización perfecta, el remate del Campeón

// ---------- paleta de tiles interiores (idéntica a gyms.js/interiors.js) ----------
const WALL = 2574;        // pared interior lisa
const WALL_BALL = 2578;   // pared con emblema Pokéball
const WALL_WINDOW = 2580; // pared con ventana
const FLOOR_TILE = 2613;  // suelo de baldosa clara
const CARPET = 2601;      // alfombra (pasillo/arena)
const MAT = 2616;         // felpudo de salida (alfombra crema)
const TABLE = 2701;       // mesa / aparato temático
const SHELF = 3148;       // estantería
const CABINET = 3335;     // vitrina / armario
const PLANT = 658;        // maceta decorativa

// ---------- helpers de construcción (réplica de gyms.js) ----------

function mat2d(w, h, v) {
  return Array.from({ length: h }, () => Array(w).fill(v));
}

// Base de un interior (idéntico a gyms.js::makeRoom): suelo uniforme, dos filas de
// pared arriba, borde colisionable y felpudo de salida centrado abajo.
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
  for (let x = 0; x < width; x++) {
    m.layers.ground[0][x] = WALL;
    m.layers.ground[1][x] = (x % 3 === 1) ? WALL_WINDOW : WALL;
    m.collision[0][x] = 1;
    m.collision[1][x] = 1;
  }
  for (let y = 0; y < height; y++) {
    m.collision[y][0] = 1;
    m.collision[y][width - 1] = 1;
  }
  for (let x = 0; x < width; x++) m.collision[height - 1][x] = 1;
  if (withEmblem) {
    const cx = Math.floor(width / 2);
    m.layers.ground[1][cx - 1] = WALL_BALL;
    m.layers.ground[1][cx] = WALL_BALL;
  }
  const matX = Math.floor(width / 2);
  const matY = height - 1;
  m.layers.deco[matY][matX] = MAT;
  m.collision[matY][matX] = 0; // pisable: warp de salida.
  return { m, matX, matY };
}

function setSolid(m, x, y, tile) {
  m.layers.deco[y][x] = tile;
  m.collision[y][x] = 1;
}

function addSign(m, x, y, text, backing = CABINET) {
  if (m.layers.deco[y][x] === -1) m.layers.deco[y][x] = backing;
  m.collision[y][x] = 1;
  m.signs.push({ x, y, lines: Array.isArray(text) ? text : [text] });
}

// Conecta el felpudo de salida con su baldosa exterior y fija el spawn del jugador
// encima del felpudo (idéntico a gyms.js::linkExit / interiors.js::linkExit).
function linkExit(m, matX, matY, exit) {
  m.warps.push({ x: matX, y: matY, toMap: exit.map, toX: exit.x, toY: exit.y, dir: exit.dir || 'down' });
  m.playerSpawn = { x: matX, y: matY - 1 };
  m.healSpawn = { x: matX, y: matY - 1 };
}

// Coloca a un entrenador mirando hacia abajo (al jugador) con su `trainer` completo.
function addLeader(m, x, y, npc) {
  m.npcs.push({ ...npc, x, y, dir: 'down', roam: false });
}

// Alfombra del pasillo central (estética de Liga).
function carpetAisle(m, matX, fromY, toY) {
  for (let y = toY; y <= fromY; y++) {
    if (m.layers.deco[y][matX] === -1) m.layers.deco[y][matX] = CARPET;
  }
}

// Estrechamiento de gala: rellena con muebles sólidos toda una fila DEJANDO
// caminables el pasillo central (aisleX) y la casilla del flanco donde se planta
// el Alto Mando (postX), para que sea un corredor angosto con el entrenador a un
// lado, mirando al pasillo. NUNCA bloquea el pasillo central: así no hay riesgo de
// soft-lock (el motor no elimina NPCs vencidos, que seguirían colisionando).
function chokeRow(m, y, aisleX, postX, tile) {
  for (let x = 1; x < m.width - 1; x++) {
    if (x === aisleX || x === postX) continue;
    setSolid(m, x, y, tile);
  }
}

// ---------- definición de la LIGA CHAMBERÍ ----------

const LIGA_BUILDERS = {};
function register(id, builder) { LIGA_BUILDERS[id] = builder; }

// ===== LIGA CHAMBERÍ — Salón del Alto Mando + el Campeón Álvaro =====
// Sala alargada (9×16). El jugador entra por el felpudo (abajo, centro x4) y sube
// por el pasillo central. Dos chokes con el ALTO MANDO (filas 10 y 6) le cierran
// el paso; al fondo (fila 3) espera el CAMPEÓN. Estética: moqueta de gala, plantas
// y un par de aparatos (el "Excel viviente" del lore).
register('liga_chamberi', (exit) => {
  const W = 9;
  const { m, matX, matY } = makeRoom('liga_chamberi', 'LIGA CHAMBERÍ', W, 16, FLOOR_TILE);
  linkExit(m, matX, matY, exit);            // felpudo (4,15) → Tetuán; spawn (4,14)
  carpetAisle(m, matX, matY - 1, 3);        // moqueta roja del pasillo central

  // Decoración de gala en el vestíbulo (parte baja).
  m.layers.deco[13][1] = PLANT; m.layers.deco[13][7] = PLANT;
  m.layers.deco[8][1] = PLANT;  m.layers.deco[8][7] = PLANT;
  addSign(m, 1, 12, 'NORMA DE LA LIGA CHAMBERÍ — "Solo Campeones con las 8 medallas. Prohibido: fumar (sí, Álvaro, va por ti), improvisar sin gracia y dejar la luz encendida."');
  addSign(m, 7, 12, 'PLACA DE HONOR — "Aquí se decide quién pone orden en el caos de Madrid. Arriba del todo te espera el Campeón. Sube si te atreves, compañero de piso."');

  // ---- ALTO MANDO 1: ROSA "LA AUDITORA" (fila 10) — Acero/Psíquico, control ----
  // Corredor angosto: archivadores en toda la fila salvo el pasillo (x4) y el
  // flanco donde se planta Rosa (x5). Rosa mira al pasillo (izquierda): el jugador,
  // de pie en el pasillo (x4), pulsa hacia ella y combate. El pasillo NUNCA se
  // bloquea, así que tras vencerla (sigue en el mapa) se puede seguir subiendo.
  chokeRow(m, 10, matX, matX + 1, CABINET);
  m.npcs.push({
    x: matX + 1, y: 10, dir: 'left', roam: false,
    id: 'liga_alto_mando_1', sprite: 'psychic',
    trainer: {
      name: 'ROSA "LA AUDITORA"',
      title: 'Alto Mando · Auditora Implacable',
      party: [
        { species: 82, level: 50 },  // Magneton (tres imanes, cuadre perfecto)
        { species: 122, level: 51 }, // Mr. Mime (la pantomima de un balance cuadrado)
        { species: 65, level: 52 },  // Alakazam — as del Alto Mando 1 (la mente que cuadra todo)
      ],
      intro: [
        'Alto. Antes de subir, una auditoría rápida. Soy Rosa, primera del Alto Mando, y reviso cuentas, equipos y excusas. Tú traes de las tres.',
        'Álvaro me fichó porque cuadro lo que él calcula. Si quieres llegar al Campeón, primero me cuadras a mí el balance. A ver ese caos tuyo, ¿da o no da beneficio?',
      ],
      win: [
        'Cuentas claras: me has ganado en buena lid. Lo firmo, lo sello y te dejo pasar.',
        'Sube, anda. El siguiente es más bruto que yo, y arriba... arriba está Álvaro con su dichoso Excel. Suerte, criatura.',
      ],
      defeat: [
        'Balance negativo. Tu plan no cuadra ni con calzador. Revísalo y vuelves.',
        'La Liga no se aprueba por la cara. Aquí cada combate se audita. Adiós.',
      ],
      prize: 5200,
      flag: 'liga_alto_mando_1',
    },
  });

  // ---- ALTO MANDO 2: D. RAMÓN "EL PORTERO" (fila 6) — Lucha/Roca, muro ----
  // Mismo esquema, flanco opuesto (x3): D. Ramón mira al pasillo (derecha). El
  // pasillo central (x4) queda libre; no hay riesgo de soft-lock.
  chokeRow(m, 6, matX, matX - 1, SHELF);
  m.npcs.push({
    x: matX - 1, y: 6, dir: 'right', roam: false,
    id: 'liga_alto_mando_2', sprite: 'gentleman',
    trainer: {
      name: 'D. RAMÓN "EL PORTERO"',
      title: 'Alto Mando · Muro de Contención',
      party: [
        { species: 68, level: 52 },  // Machamp (cuatro brazos, cero pasa)
        { species: 112, level: 53 }, // Rhydon (el muro que no se mueve)
        { species: 143, level: 54 }, // Snorlax — as del Alto Mando 2 (el tapón definitivo)
      ],
      intro: [
        'De aquí no pasa ni el aire, chaval. Soy D. Ramón, segundo del Alto Mando y portero de toda la vida del edificio del Campeón.',
        'Llevo 40 años diciéndole a la gente "no está" cuando viene el del recibo. A ti no te voy a decir que no está: te lo voy a demostrar a base de bien. ¡Pasa si puedes!',
      ],
      win: [
        '...Buah. Me has tumbado el muro. Eso no lo había hecho ni el casero, y mira que lo intentó.',
        'Anda, sube. Pero te aviso: el de arriba no juega. Ese sí que tiene un Excel de verdad. Yo solo tengo una fregona y mala leche.',
      ],
      defeat: [
        'Ea. De aquí no pasas. Como te he dicho: ni el aire.',
        'Entrena, come y vuelve. Y trae el recibo de la luz, que Álvaro lo está esperando.',
      ],
      prize: 5600,
      flag: 'liga_alto_mando_2',
    },
  });

  // Aparatos de gala junto al Campeón (su "Excel viviente").
  setSolid(m, 1, 4, TABLE); setSolid(m, 7, 4, TABLE);

  // ---- CAMPEÓN: ÁLVARO "ÁLVARÍN" ALONSO (fila 3, fondo, sobre la moqueta) ----
  // NO da medalla: marca `champion:true` → corona al jugador y Salón de la Fama.
  addLeader(m, matX, 3, {
    id: 'liga_campeon_alvaro', sprite: 'alvaro_rival',
    trainer: {
      name: 'ÁLVARO ALONSO',
      title: 'Campeón · Vicepresidente del Humo',
      champion: true,
      party: [
        { species: 143, level: 52 }, // Snorlax (duerme 3h y aún aguanta más que tú)
        { species: 59, level: 53 },  // Arcanine (velocidad de ejecución, pura eficiencia)
        { species: 94, level: 54 },  // Gengar (el humo hecho Pokémon; es el del Humo)
        { species: 130, level: 54 }, // Gyarados (escala bestial, como su hoja de cálculo)
        { species: 65, level: 55 },  // Alakazam (la lógica pura, el Excel viviente)
        { species: 149, level: 56 }, // Dragonite — AS (la optimización perfecta, el remate)
      ],
      intro: [
        'Vaya, vaya. Marcelino. Te tenía agendado para "nunca", y aquí estás, arriba del todo, con las ocho medallas. *da una calada larga* Lo apunto en el registro de imprevistos.',
        'Ocho líderes. El Alto Mando entero. Y ahora yo, el Campeón. Te recuerdo: yo trabajo veinte horas, duermo tres, me ducho en tres minutos clavados y lo optimizo TODO. Tú improvisas. Y aun así has llegado. Es... estadísticamente molesto.',
        'No traje el Maserati, que sigue siendo el TUYO, conste. Y el carnet me lo saqué por fin en Salamanca, no como otros. Pero la Liga, compañero de piso, la Liga es mía. Saco seis bichos, te optimizo la derrota y firmamos lo de la luz. ¿Listo? Yo siempre lo estoy.',
      ],
      win: [
        '...No. NO. *mira el cigarro como si tuviera la culpa de todo* Esto no estaba en la hoja de cálculo. Ni en la versión beta. Ni en el plan B. La improvisación me ha ganado la Liga ENTERA.',
        'Lo reconozco, y odio reconocer cosas: eres el Campeón. El caos, por una vez, ha batido a la lógica perfecta. Blanca me va a matar de la risa.',
        'Disfrútalo, anda. Te lo has ganado a pulso, sin Excel y sin dormir. Yo me piro a fumar al balcón y a recalcular el universo. Y oye... paga tu parte de la luz, campeón. Que la sigues dejando encendida igual que yo el portátil.',
      ],
      defeat: [
        'Previsible. Todo estaba en el Excel, asalto a asalto. *apaga el cigarro en un cenicero que rebosa* La lógica perfecta no se improvisa, compañero.',
        'Vuelve cuando hayas iterado. Yo no me muevo de aquí: soy el Campeón y tengo todo el tiempo del mundo... bueno, tres horas, que luego duermo.',
      ],
      prize: 20000,
      flag: 'liga_campeon_alvaro',
    },
  });
  addSign(m, 1, 2, 'TRONO DEL CAMPEÓN — "Aquí se sienta Álvaro Alonso, Vicepresidente del Humo y Campeón de la Liga Chamberí. Optimizó hasta el sillón. No fuma dentro. (Es mentira.)"');
  return m;
});

// ---------- ensamblado (espeja gyms.js::GYM_LINKS / buildGyms) ----------

// La `exit` es la baldosa de Tetuán a la que devuelve el felpudo al salir: la
// casilla JUSTO DEBAJO de la puerta gated del Parque Móvil (31,11) → (31,12).
export const LIGA_LINKS = [
  { liga: 'liga_chamberi', exit: { map: 'tetuan', x: 31, y: 12, dir: 'down' } },
];

// Construye los mapas de la Liga enlazados a su salida exterior.
// Uso desde maps.js: Object.assign(MAPS, buildLiga()).
export function buildLiga() {
  const out = {};
  for (const link of LIGA_LINKS) {
    const build = LIGA_BUILDERS[link.liga];
    if (!build) continue;
    out[link.liga] = build({ map: link.exit.map, x: link.exit.x, y: link.exit.y, dir: link.exit.dir });
  }
  return out;
}

// Puerta GATED de la Liga (en Tetuán). A diferencia de wireGymDoors, el warp de
// ENTRADA lleva `require:{badges:8}`: si el jugador no tiene las 8 medallas se le
// muestra el aviso y no entra (lo gestiona WorldScene.useWarp/meetsWarpRequire).
//
// Geometría (verificada contra la colisión real de Tetuán):
//   - Recinto del Parque Móvil del Estado: vallas en x29 y x33 (y4-10) y muro sur
//     en y11 (x29-33). Interior caminable: x30-32, y4-10.
//   - PUERTA = (31,11): se abre un hueco central en la valla sur (colisión 0) y se
//     pavimenta con moqueta para que se lea como entrada de la Liga.
//   - El sign original del Parque Móvil estaba en (31,12), justo bajo la puerta:
//     se libera esa baldosa (debe ser caminable para pisar la puerta desde abajo)
//     y el cartel actualizado de la Liga se recoloca a un lateral (33,12).
const LIGA_DOOR = { map: 'tetuan', x: 31, y: 11 };
const LIGA_PATH_TILE = 2601; // moqueta/acera clara para la baldosa de la puerta
const LIGA_SIGN_TILE = 204;  // tile de cartel (SIGN) en el overworld

export function wireLigaDoor(maps) {
  const m = maps[LIGA_DOOR.map];
  if (!m || !maps.liga_chamberi) return;
  const { x, y } = LIGA_DOOR;

  // 1) Liberar el sign original bajo la puerta (31,12) para que sea caminable: la
  //    puerta se pisa desde abajo. Se elimina ese sign y se restaura la baldosa.
  m.signs = (m.signs || []).filter((s) => !(s.x === x && s.y === y + 1));
  if (m.collision[y + 1]) m.collision[y + 1][x] = 0;
  if (m.layers && m.layers.deco[y + 1]) m.layers.deco[y + 1][x] = -1; // revela el suelo base (caminable)
  if (m.tallGrass && m.tallGrass[y + 1]) m.tallGrass[y + 1][x] = 0;

  // 2) Abrir la puerta: el tile de la valla sur (31,11) pasa a ser pisable y se
  //    pavimenta con moqueta para leerse como entrada.
  if (m.collision[y]) m.collision[y][x] = 0;
  if (m.layers && m.layers.deco[y]) m.layers.deco[y][x] = LIGA_PATH_TILE;
  if (m.tallGrass && m.tallGrass[y]) m.tallGrass[y][x] = 0;

  // 3) Warp de ENTRADA gated (8 medallas). Sin medallas → aviso y no entra.
  const dest = maps.liga_chamberi.playerSpawn || { x: 1, y: 1 };
  if (!(m.warps || []).some((w) => w.x === x && w.y === y)) {
    m.warps.push({
      x, y, toMap: 'liga_chamberi', toX: dest.x, toY: dest.y, dir: 'up',
      require: {
        badges: 8,
        lines: [
          'PARQUE MÓVIL DEL ESTADO — Sede de la LIGA CHAMBERÍ.',
          'Un ujier impecable te cierra el paso: «Solo Campeones con las 8 medallas, compañero. Vuelve cuando las tengas todas.»',
          'Te suena la voz. Es clavada a la de Álvaro... pero con uniforme. Decides no preguntar.',
        ],
      },
    });
  }

  // 4) Cartel actualizado de la Liga, recolocado a un lateral caminable (33,12),
  //    sin tapar la aproximación vertical a la puerta.
  const sx = x + 2, sy = y + 1; // (33,12)
  if (m.layers && m.layers.deco[sy] && m.collision[sy]
      && !(m.signs || []).some((s) => s.x === sx && s.y === sy)) {
    m.layers.deco[sy][sx] = LIGA_SIGN_TILE;
    m.collision[sy][sx] = 1;
    m.signs.push({
      x: sx, y: sy,
      lines: ['LIGA CHAMBERÍ — Alto Mando + Campeón Álvaro. "Solo se entra con las 8 medallas. Aquí se decide quién pone orden en el caos de Madrid."'],
    });
  }
}
