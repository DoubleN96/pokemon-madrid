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
// Sala alargada (9×18). El jugador entra por el felpudo (abajo, centro x4) y sube
// por el pasillo central. CUATRO chokes con el ALTO MANDO real de Marcelino
// (filas 14, 11, 8 y 5) le cierran el paso; al fondo (fila 3) espera el CAMPEÓN
// Álvaro. Estética: moqueta de gala, plantas y un par de aparatos (el "Excel
// viviente" del lore).
//
// EL ALTO MANDO son amigos reales de Marcelino (parodia cariñosa). Solo Pokémon
// Gen-1 (IDs 1-151), niveles L50-54 (por debajo/cerca del Campeón, L52-56):
//   1. RAMIRO         (Siniestro/tramposo, póker)  — as: Gengar 94  (el as bajo la manga)
//   2. TATIÁN         (Lucha/mole adorable)        — as: Snorlax 143 (el osito que te parte)
//   3. RAFAEL ROBLEDO (Acero/Oro, estafador)       — as: Persian 53 (Día de Pago = te lanza dinero)
//   4. ALEX           (Eléctrico/Tóxico)           — as: Electabuzz 125 (combate mirando el móvil)
register('liga_chamberi', (exit) => {
  const W = 9;
  const { m, matX, matY } = makeRoom('liga_chamberi', 'LIGA CHAMBERÍ', W, 18, FLOOR_TILE);
  linkExit(m, matX, matY, exit);            // felpudo (4,17) → Tetuán; spawn (4,16)
  carpetAisle(m, matX, matY - 1, 3);        // moqueta roja del pasillo central

  // Decoración de gala en el vestíbulo (parte baja) y entre salas.
  m.layers.deco[15][1] = PLANT; m.layers.deco[15][7] = PLANT;
  m.layers.deco[9][1] = PLANT;  m.layers.deco[9][7] = PLANT;
  addSign(m, 1, 16, 'NORMA DE LA LIGA CHAMBERÍ — "Solo Campeones con las 8 medallas. Prohibido: fumar (sí, Álvaro, va por ti), improvisar sin gracia y dejar la luz encendida."');
  addSign(m, 7, 16, 'PLACA DE HONOR — "Cuatro del Alto Mando y el Campeón. Todos compañeros de piso o de fatigas de Marcelino. Sube si te atreves: arriba te espera Álvaro."');

  // ---- ALTO MANDO 1: RAMIRO (fila 14) — Siniestro/tramposo, póker ----
  // Corredor angosto: muebles en toda la fila salvo el pasillo (x4) y el flanco
  // donde se planta el miembro del Alto Mando. Mira al pasillo: el jugador, de pie
  // en el pasillo (x4), pulsa hacia él y combate. El pasillo NUNCA se bloquea, así
  // que tras vencerlo (sigue en el mapa) se puede seguir subiendo. Sin soft-lock.
  chokeRow(m, 14, matX, matX + 1, CABINET);
  m.npcs.push({
    x: matX + 1, y: 14, dir: 'left', roam: false,
    id: 'liga_alto_mando_1', sprite: 'ramiro',
    trainer: {
      name: 'RAMIRO',
      title: 'Alto Mando · El As Bajo la Manga',
      party: [
        { species: 53, level: 50 },  // Persian (gato ladino, el farol con bigotes)
        { species: 42, level: 51 },  // Golbat (juega de noche, en la sombra)
        { species: 110, level: 51 }, // Weezing (cortina de humo: nunca le ves las cartas)
        { species: 94, level: 54 },  // Gengar — AS (el truco que no veías venir)
      ],
      intro: [
        'Hombre, Marcelino. Siéntate, que esto es una partida y acabas de entrar tarde, con la mano ya repartida. Soy Ramiro, primero del Alto Mando. De Torrevieja, pa servirte.',
        'Yo vivo del póker, chaval: leo a la gente como tú lees... bueno, tú no lees mucho. Y siempre, SIEMPRE, me guardo un as bajo la manga. *se ajusta las gafas de sol bajo techo*',
        'Va, repartamos. Si me ganas, subes. Pero te aviso: aquí el que va de farol soy yo, y el farol me lo creo hasta yo. Tu colega Ann Jou ya lo sabe... aún me debe tres cartas de One Piece.',
      ],
      win: [
        'Bua. Me has visto el farol. *deja las cartas boca arriba* Eso no me pasa ni en la partida del jueves. Lo reconozco: ibas de menos y tenías la mano buena.',
        'Sube, anda. Y si ves a Ann Jou, dile que la próxima me trae el "Luffy Líder" o se viene conmigo a Torrevieja a explicármelo. Suerte arriba, que el de la azotea no se marca faroles: tiene los números de verdad.',
      ],
      defeat: [
        'Casa gana. *recoge la banca con una sonrisa* No es nada personal, compañero: es que yo ya jugaba antes de que tú te sentaras a la mesa.',
        'Vuelve cuando sepas mirar a los ojos sin pestañear. Y trae algo que apostar, que esto sin emoción no es póker.',
      ],
      prize: 5200,
      flag: 'liga_alto_mando_1',
    },
  });

  // ---- ALTO MANDO 2: TATIÁN (fila 11) — Lucha/mole adorable ----
  // Flanco opuesto (x3): mira al pasillo (derecha). El pasillo central (x4) queda
  // libre; sin riesgo de soft-lock.
  chokeRow(m, 11, matX, matX - 1, SHELF);
  m.npcs.push({
    x: matX - 1, y: 11, dir: 'right', roam: false,
    id: 'liga_alto_mando_2', sprite: 'tatian',
    trainer: {
      name: 'TATIÁN',
      title: 'Alto Mando · El Osito Amoroso',
      party: [
        { species: 57, level: 51 },  // Primeape (la fiesta que se pone seria)
        { species: 62, level: 52 },  // Poliwrath (puro músculo de gimnasio)
        { species: 68, level: 52 },  // Machamp (cuatro brazos para abrazarte)
        { species: 143, level: 54 }, // Snorlax — AS (gigante, adorable, te aplasta de cariño)
      ],
      intro: [
        '¡EHHH, Marcelino!! *con vozarrón finísimo de peluche* ¡Ven aquí, ven aquí que te como a besos! ...digo, que te combato. Soy Tatián, segundo del Alto Mando, camionero de Levante y el más blandito de toda Torrevieja.',
        'Mira esta mole, ¿eh? Ciento diez kilos de osito amoroso. Doy miedo hasta que abro la boca y me sale esta vocecita. La gente flipa. Pero ojo: en combate abrazo MUY fuerte. *risa aguda*',
        'Venga, dame guerra, peque. Si me ganas subes; si pierdes, te invito a una y tan amigos. ¡Que para eso estamos, hombre! Pero primero te parto, con todo el amor del mundo.',
      ],
      win: [
        '¡JOPÉ! *aplaude con dos manos como sartenes* ¡Qué máquina, Marcelino! Me has tumbado al Snorlax y todo. Ven que te dé un abrazo... ¡no corras, hombre, que es de los buenos!',
        'Sube, fiera, sube. El siguiente es Rafael, el del traje: como te quiera vender algo, NO firmes nada. Y arriba está Álvaro, que ese no abraza, ese optimiza. ¡Mucha suerte, peque!',
      ],
      defeat: [
        'Ay, no, no... *te recoge del suelo con cuidado* Perdona, ¿te he apretado mucho? Es que no controlo la fuerza, soy un trozo de pan con bíceps.',
        'Cura a tus bichos y vuelves, anda. Y la próxima te traes meriendas, que combatir con hambre es muy triste. ¡Un besito!',
      ],
      prize: 5500,
      flag: 'liga_alto_mando_2',
    },
  });

  // ---- ALTO MANDO 3: RAFAEL ROBLEDO (fila 8) — Acero/Oro, estafador ----
  chokeRow(m, 8, matX, matX + 1, CABINET);
  m.npcs.push({
    x: matX + 1, y: 8, dir: 'left', roam: false,
    id: 'liga_alto_mando_3', sprite: 'rafael_robledo',
    trainer: {
      name: 'RAFAEL ROBLEDO',
      title: 'Alto Mando · El Encantador de Serpientes',
      party: [
        { species: 82, level: 52 },  // Magneton (atrae el dinero como un imán)
        { species: 91, level: 52 },  // Cloyster (la perla que no te va a dar)
        { species: 99, level: 53 },  // Kingler (pinzas doradas, te las clava en la firma)
        { species: 53, level: 54 },  // Persian — AS (DÍA DE PAGO: te lanza el dinero a la cara)
      ],
      intro: [
        'Buenas, buenas. Marcelino, ¿verdad? El cuñado de... bueno, el compañero de piso del Campeón. Soy Rafael Robledo, hermano de Blanca. *te tiende la mano y un folleto a la vez*',
        'Tengo un producto FINANCIERO que te va a interesar muchísimo: alto riesgo, rentabilidad garantizada (entre comillas), y de legalidad... pues regulera. Firma aquí, aquí y aquí y pasas directo al Campeón. ¿No? Bueno, hombre, no te enfades.',
        'Entonces a la antigua: te combato, y mi Persian usa Día de Pago, que es como yo cobro: lanzándote el dinero a la cara hasta que caes. Si me ganas, te dejo subir. Y NO firmas nada. Avaricia, chaval, que mueve el mundo.',
      ],
      win: [
        '...Vaya. Me has dejado sin cartera y sin clientela. *recoge las monedas del suelo* Eres más listo de lo que vendía tu expediente. Mi hermana Blanca tenía razón contigo, qué rabia.',
        'Sube, anda, que arriba te espera Álvaro y ese sí que tiene dinero DE VERDAD, no como mis preferentes. Y dile a Blanca que su hermano sigue siendo un crack... aunque haya perdido.',
      ],
      defeat: [
        'Lo sabía. *te guarda la cartera en el bolsillo* La avaricia es un don, y tú no lo tienes. Sin acritud: el dinero busca a quien sabe apostarlo.',
        'Vuelve con mejor cartera de bichos. Y de paso, ¿no querrás un plan de pensiones? Es coña. ...¿O no?',
      ],
      prize: 5700,
      flag: 'liga_alto_mando_3',
    },
  });

  // ---- ALTO MANDO 4: ALEX (fila 5) — Eléctrico/Tóxico, combate mirando el móvil ----
  // Flanco opuesto (x3): mira al pasillo (derecha).
  chokeRow(m, 5, matX, matX - 1, SHELF);
  m.npcs.push({
    x: matX - 1, y: 5, dir: 'right', roam: false,
    id: 'liga_alto_mando_4', sprite: 'alex_digital',
    trainer: {
      name: 'ALEX',
      title: 'Alto Mando · El Programador Enamoradizo',
      party: [
        { species: 101, level: 52 }, // Electrode (explota como su batería social)
        { species: 110, level: 53 }, // Weezing (el aire del piso a las 3 a.m.)
        { species: 89, level: 53 },  // Muk (todo lo tóxico, con mucho cariño)
        { species: 125, level: 54 }, // Electabuzz — AS (combate a 200 pulsaciones y mirando el móvil)
      ],
      intro: [
        '¡Eyyy, Marcelino, tío! *no levanta la vista del móvil* Espera, espera, que estoy en un match importantísimo... vale, ya. Bueno, sí: soy Alex, el cuarto del Alto Mando. Tu colega del piso, el de la guitarra a las tantas.',
        'Álvaro me puso aquí "para que socialice", dice. Yo le dije que no, pero ya sabes que no sé decir que no a nadie... ni a un combate, ni a un match, ni a la pizza de las 4 a.m. Es mi don y mi condena.',
        'Va, te combato mientras voy deslizando, que multitarea soy un crack. Tóxico-eléctrico, como mi vida amorosa. Si me ganas subes; si pierdes, te enseño la conversación que me tiene en ascuas. ¡Dale!',
      ],
      win: [
        'Buah, me has ganado mientras escribía... y encima me ha dejado en visto. Día redondo, oye. *suelta el móvil un segundo* En serio, máquina: pocos me ganan al Electabuzz.',
        'Sube, crack, que arriba está Álvaro y ese no mira el móvil ni cuando duerme las tres horas que duerme. Yo me quedo aquí... a ver si me contesta. Suerte, tío, te lo mereces.',
      ],
      defeat: [
        'Jajaja, ¿ves? Tú tampoco le dices que no a una derrota. *te da una palmada* Somos iguales, Marcelino, por eso nos llevamos bien.',
        'Cura a los bichos y vuelves. Yo aquí sigo, deslizando y combatiendo. La constancia que no tengo en el amor la echo en los combates. ¡Nos vemos!',
      ],
      prize: 5800,
      flag: 'liga_alto_mando_4',
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
