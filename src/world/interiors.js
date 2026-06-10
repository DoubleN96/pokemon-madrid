// Módulo E (extensión) — Interiores de los edificios de Madrid.
// Cada edificio con puerta del overworld tiene aquí un interior pequeño al que
// se entra por el warp de la puerta y del que se sale por la alfombra inferior.
// Mismo formato que `MAPS` (docs/CONTRACTS.md): se fusiona en MAPS desde maps.js.
//
// Paleta de tiles interiores minada y verificada visualmente del tileset
// reempaquetado `tiles` (127 col × 16 px; frame = fila*127 + col). Ver
// scripts/map_tools para el método de minado (render a escala + grid de índices):
//   2574 pared azul lisa · 2578 emblema Pokéball · 2580 ventana
//   2613 suelo de baldosa (centros/tiendas) · 3462 suelo de tarima (casas)
//   2601 alfombra verde · 2616 felpudo/alfombra crema (salida)
//   2701 mesa/mostrador · 2704+2705 máquina de curación · 3148 estantería
//   3335 vitrina/armario · 658 maceta (flor roja, reutilizada de exteriores).

const WALL = 2574;        // pared interior lisa
const WALL_BALL = 2578;   // pared con emblema Pokéball (centros)
const WALL_WINDOW = 2580; // pared con ventana
const FLOOR_TILE = 2613;  // suelo de baldosa clara (centros, tiendas, gimnasios)
const FLOOR_WOOD = 3462;  // suelo de tarima (casas)
const CARPET = 2601;      // alfombra verde decorativa
const MAT = 2616;         // felpudo de salida (alfombra crema)
const TABLE = 2701;       // mesa / mostrador
const HEAL_L = 2704;      // máquina de curación (izquierda)
const HEAL_R = 2705;      // máquina de curación (derecha)
const SHELF = 3148;       // estantería de libros
const CABINET = 3335;     // vitrina / armario blanco
const PLANT = 658;        // maceta (flor roja reutilizada)

// ---------- helpers de construcción ----------

function mat2d(w, h, v) {
  return Array.from({ length: h }, () => Array(w).fill(v));
}

// Crea la base de un interior: suelo uniforme, paredes en las dos filas
// superiores (con esquina-ventana decorativa), borde colisionable y felpudo
// de salida centrado abajo. Devuelve el mapa + la posición del felpudo.
function makeRoom(id, name, width, height, floor) {
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
  // Paredes: dos filas superiores. Fila 0 = pared; fila 1 = ventanas alternas.
  for (let x = 0; x < width; x++) {
    m.layers.ground[0][x] = WALL;
    m.layers.ground[1][x] = (x % 3 === 1) ? WALL_WINDOW : WALL;
    m.collision[0][x] = 1;
    m.collision[1][x] = 1;
  }
  // Paredes laterales y borde inferior colisionan (caja cerrada).
  for (let y = 0; y < height; y++) {
    m.collision[y][0] = 1;
    m.collision[y][width - 1] = 1;
  }
  for (let x = 0; x < width; x++) m.collision[height - 1][x] = 1;
  // Felpudo de salida, centrado en la fila inferior caminable.
  const matX = Math.floor(width / 2);
  const matY = height - 1;
  m.layers.deco[matY][matX] = MAT;
  m.collision[matY][matX] = 0; // el felpudo SÍ es pisable (es el warp de salida)
  return { m, matX, matY };
}

function setSolid(m, x, y, tile) {
  m.layers.deco[y][x] = tile;
  m.collision[y][x] = 1;
}

// Cartel/nota interior: se lee al mirarlo de frente. Marca la casilla como
// sólida (faceable, no pisable) y, si está vacía, le pone un mueble de fondo
// (vitrina) para que el cartel "tenga cuerpo". Si ya hay mueble, lo conserva.
function addSign(m, x, y, text, backing = CABINET) {
  if (m.layers.deco[y][x] === -1) m.layers.deco[y][x] = backing;
  m.collision[y][x] = 1;
  m.signs.push({ x, y, lines: Array.isArray(text) ? text : [text] });
}

// Mostrador de centro Pokémon: máquina de curación sobre una mesa, con la
// enfermera de pie detrás. La enfermera mira hacia abajo (al jugador).
function addHealCounter(m, x, y, nurse) {
  setSolid(m, x, y, HEAL_L);
  setSolid(m, x + 1, y, HEAL_R);
  setSolid(m, x, y + 1, TABLE);
  setSolid(m, x + 1, y + 1, TABLE);
  m.npcs.push({ ...nurse, heal: true, x, y: y - 1, dir: 'down' });
}

// Mostrador de tienda: mesa larga con el tendero centrado detrás.
function addShopCounter(m, x, y, len, clerk) {
  for (let i = 0; i < len; i++) setSolid(m, x + i, y, TABLE);
  m.npcs.push({ ...clerk, x: x + Math.floor((len - 1) / 2), y: y - 1, dir: 'down' });
}

// ---------- definición de cada interior ----------
//
// Config común: { exit } donde exit = { map, x, y, dir } es a dónde te
// devuelve el felpudo (la baldosa de delante de la puerta en el overworld).

const INTERIOR_BUILDERS = {};

function register(id, builder) { INTERIOR_BUILDERS[id] = builder; }

// Conecta el felpudo de salida del interior con su baldosa exterior.
function linkExit(m, matX, matY, exit) {
  m.warps.push({ x: matX, y: matY, toMap: exit.map, toX: exit.x, toY: exit.y, dir: exit.dir || 'down' });
  // El jugador aparece justo encima del felpudo al entrar.
  m.playerSpawn = { x: matX, y: matY - 1 };
  m.healSpawn = { x: matX, y: matY - 1 };
}

// ===== CASA DE MARCELINO (Tetuán) — Mamá cura aquí =====
register('casa_marcelino', (exit) => {
  const { m, matX, matY } = makeRoom('casa_marcelino', 'CASA DE MARCELINO', 9, 8, FLOOR_WOOD);
  linkExit(m, matX, matY, exit);
  // Cama improvisada de muebles + escritorio con Excels (mesa).
  setSolid(m, 1, 2, CABINET);    // armario
  setSolid(m, 2, 2, SHELF);      // estantería de cómics y Excels impresos
  setSolid(m, 7, 2, TABLE);      // escritorio del "Excel Sagrado"
  m.layers.deco[5][4] = CARPET;  // alfombrilla del salón
  m.layers.deco[5][5] = CARPET;
  // Mamá — cura el equipo (heal), clásico de Pokémon.
  m.npcs.push({
    id: 'mama_casa', sprite: 'aroma', x: 3, y: 4, dir: 'down', roam: false, heal: true,
    dialog: [
      '¡Hijo, ya estás otra vez con la mochila a cuestas! Anda, ven, que te curo a los bichos antes de salir.',
      '...¡Listo! Tu equipo está como nuevo. Abrígate, come algo en condiciones y no me hagas tonterías por ahí.',
      'Y ordena ese cuarto, que pareces Jesús "la Rata". ¡Hala, a comerte el mundo!',
    ],
  });
  // La tele del salón (objeto interactivo) — guiño castizo.
  addSign(m, 6, 4, 'LA TELE — Echan "La que se avecina". Sergio diría que es un documental. Marcelino la deja encendida para no sentirse solo con los Excels.');
  addSign(m, 7, 3, 'EL EXCEL SAGRADO DE RENTABILIDAD — "No tocar. Hay fórmulas que ni yo entiendo." — Marcelino');
  return m;
});

// ===== BAR "EL TETUÁN" (Tetuán) — tapeo y cotilleo =====
register('bar_tetuan', (exit) => {
  const { m, matX, matY } = makeRoom('bar_tetuan', 'BAR "EL TETUÁN"', 10, 8, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  // Barra del bar a lo largo.
  addShopCounter(m, 2, 3, 5, {
    id: 'tabernero', sprite: 'shopkeeper_m', roam: false,
    dialog: [
      '¡Hombre, Marcelino! ¿Lo de siempre? Cocido, una caña y a poner orden en el caos.',
      'Aquí venía Álvaro a "teletrabajar". Dejaba el portátil encendido para fingir y se iba a fumar al portal. ¡Menudo elemento, el de Deloitte!',
      'El tapeo sube la moral del equipo, que lo sepas. Una de bravas y tus Pokémon combaten más a gusto.',
    ],
  });
  setSolid(m, 8, 2, SHELF);   // botellero
  setSolid(m, 8, 3, CABINET); // nevera
  m.layers.deco[6][4] = CARPET;
  // Cliente del barrio.
  m.npcs.push({
    id: 'parroquiano', sprite: 'generic_m1', x: 7, y: 5, dir: 'left', roam: false,
    dialog: [
      'Este bar lleva en Bravo Murillo desde antes de que tú nacieras, chaval.',
      'Dicen que el campeón de la Liga es uno que combate fumando y mirando un Excel. Cosas de Madrid, oye.',
    ],
  });
  addSign(m, 7, 3, 'CARTA DEL DÍA — Cocido completo 12 pavos · Bravas con alma · Caña bien tirada.');
  return m;
});

// ===== CENTRO POKÉMON DE TETUÁN =====
register('cpoke_tetuan', (exit) => {
  const { m, matX, matY } = makeRoom('cpoke_tetuan', 'CENTRO POKÉMON', 10, 8, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  m.layers.ground[1][4] = WALL_BALL; // emblema Pokéball sobre el mostrador
  m.layers.ground[1][5] = WALL_BALL;
  addHealCounter(m, 4, 3, {
    id: 'enfermera_tetuan', sprite: 'pokefan', roam: false,
    dialog: [
      '¡Bienvenido al Centro Pokémon de Tetuán, majo! Te curo el equipo en un periquete, gratis y sin cita.',
      '...¡Listo! Tus Pokémon están como nuevos. ¡Toma nota, José Antonio: ESTO sí que es servicio público!',
      'Que vaya bien. Y si ves a Álvaro, dile de mi parte que se duche más de tres minutos.',
    ],
  });
  // PC de almacenamiento (charla decorativa).
  m.npcs.push({
    id: 'pc_box_tetuan', sprite: 'scientist', x: 8, y: 3, dir: 'down', roam: false,
    dialog: [
      'Este es el PC de almacenamiento, conectado al sistema del Profesor Galdós.',
      'Aún está en pruebas, así que de momento solo cura y guarda. Como el Excel de Marcelino: prometía mucho y hace dos cosas.',
    ],
  });
  addSign(m, 1, 3, 'TABLÓN — "Se busca compañero de piso. Imprescindible: pagar a tiempo y no usar el vape de Jesús."');
  return m;
});

// ===== ULTRAMARINOS "DON PACO" (Tetuán) — Eduardo, el tacaño (tienda) =====
register('ultramarinos', (exit) => {
  const { m, matX, matY } = makeRoom('ultramarinos', 'ULTRAMARINOS DON PACO', 9, 8, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  addShopCounter(m, 2, 3, 4, {
    id: 'eduardo_tienda', sprite: 'rich_boy', roam: false, shop: true,
    dialog: [
      'Hombre, Marcelino. Te atiendo porque eres tú; que a otro le cobro hasta por mirar el escaparate.',
      'Mi madre me enseñó bien. Una vez le cobró una Coca-Cola a Álvaro. ¡Una leyenda, mi madre! Tendrías que verla con Sofía.',
      'Precios de catálogo, ni un duro de rebaja. Que la boda eterna no se paga sola. ¿Qué te pongo?',
    ],
  });
  setSolid(m, 7, 2, SHELF);   // estantes de conservas
  setSolid(m, 7, 3, SHELF);
  setSolid(m, 7, 4, CABINET);
  addSign(m, 1, 3, 'ULTRAMARINOS "DON PACO" — Desde 1962. "Aquí no se fía, que se fió Jesús y aún lo estamos buscando."');
  return m;
});

// ===== FARMACIA (Tetuán) =====
register('farmacia', (exit) => {
  const { m, matX, matY } = makeRoom('farmacia', 'FARMACIA', 8, 7, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  addShopCounter(m, 2, 3, 3, {
    id: 'farmaceutica', sprite: 'generic_f1', roam: false, shop: true,
    dialog: [
      'Buenas. Farmacia de guardia, veinticuatro horas, como el estrés de Álvaro.',
      'Antídotos, despertares, algo para la resaca del tapeo... lo típico. Para el burnout, me temo, aún no hay pastilla.',
      'Cuídate esos Pokémon. Y bebe agua, anda, que se te ve venido de la hierba alta. ¿Te pongo algo?',
    ],
  });
  setSolid(m, 6, 2, CABINET);
  setSolid(m, 6, 3, CABINET);
  addSign(m, 1, 3, 'FARMACIA — De guardia. "Tenemos de todo menos paciencia para los que vapean en la cola."');
  return m;
});

// ===== PELUQUERÍA "MANOLI" (Tetuán) =====
register('peluqueria', (exit) => {
  const { m, matX, matY } = makeRoom('peluqueria', 'PELUQUERÍA MANOLI', 8, 7, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  setSolid(m, 2, 3, TABLE);   // tocador con espejo
  setSolid(m, 5, 3, TABLE);
  m.layers.deco[5][3] = CARPET;
  m.layers.deco[5][4] = CARPET;
  m.npcs.push({
    id: 'manoli', sprite: 'generic_f2', x: 3, y: 3, dir: 'down', roam: false,
    dialog: [
      'Ay, Marcelino, ese pelo afro lo llevas que da gusto. No me lo toques, que está perfecto.',
      'A quien tendrías que traerme es a tu amigo Jesús. ¡Pobre! Calvo a parches, y luego viene de Luxemburgo con un injerto de risa.',
      'Y a Álvaro, ese flequillo de casco... se lo corté yo una vez y casi me denuncia. ¡Con un Excel de reclamaciones, el tío!',
    ],
  });
  m.npcs.push({
    id: 'cliente_peluqueria', sprite: 'generic_m2', x: 5, y: 4, dir: 'left', roam: false,
    dialog: [
      'Vengo a cortarme el pelo cada mes, religiosamente. Como el casero con el alquiler.',
      'Manoli es la mejor de Tetuán. Eso sí, te enteras de TODOS los cotilleos del barrio.',
    ],
  });
  addSign(m, 1, 3, 'PELUQUERÍA "MANOLI" — Corte y marcado 10 pavos. "Injertos, derivamos a Luxemburgo."');
  return m;
});

// ===== QUIOSCO (Ruta 2) =====
register('quiosco', (exit) => {
  const { m, matX, matY } = makeRoom('quiosco', 'QUIOSCO', 7, 7, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  addShopCounter(m, 2, 3, 3, {
    id: 'quiosquero', sprite: 'generic_m3', roam: false, shop: true,
    dialog: [
      'Prensa, cromos, pipas y chuches. El quiosco de toda la vida, aquí plantado en plena Ruta 2.',
      '¿Cromos de la Liga Chamberí? Se agotan en cuanto llegan. El de Álvaro fumando es el más raro de la colección, no veas cómo lo buscan.',
      'Llévate también algo para el camino, anda. La hierba alta de esta ruta está plagada de bichos, vas a tener para rato. ¿Qué te pongo?',
    ],
  });
  setSolid(m, 5, 2, SHELF);
  addSign(m, 1, 3, 'QUIOSCO — "Hoy entran los cromos nuevos: serie Team Piso. Pregunta por el de Jesús con pelo."');
  return m;
});

// ===== CENTRO POKÉMON DE CHAMBERÍ =====
register('cpoke_chamberi', (exit) => {
  const { m, matX, matY } = makeRoom('cpoke_chamberi', 'CENTRO POKÉMON', 10, 8, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  m.layers.ground[1][4] = WALL_BALL;
  m.layers.ground[1][5] = WALL_BALL;
  addHealCounter(m, 4, 3, {
    id: 'enfermera_chamberi', sprite: 'aroma', roam: false,
    dialog: [
      'Bienvenido al Centro Pokémon de Chamberí, joven. Permítame su equipo, que aquí se cura con clase.',
      '...Sus Pokémon han quedado perfectamente restablecidos. Sin cobrarle, no como cierto casero calvo de por aquí.',
      'Vuelva cuando guste. Y salude a Blanca de mi parte: esa muchacha es la única persona cuerda de todo este barrio.',
    ],
  });
  m.npcs.push({
    id: 'pc_box_chamberi', sprite: 'gentleman', x: 8, y: 3, dir: 'down', roam: false,
    dialog: [
      'Disfruto del café de enfrente mientras curan a mis Pokémon. La vida señorial de Chamberí, ya sabe.',
      'Dicen que la Estación Fantasma esconde algo. Yo, de noche, prefiero no acercarme. Hay cosas que ni la jurisprudencia de Blanca arregla.',
    ],
  });
  addSign(m, 1, 3, 'TABLÓN — "Tertulia en el Café del Modernismo, hoy a las cinco. Tema: ¿es el ladrillo un Pokémon?"');
  return m;
});

// ===== CAFÉ DEL MODERNISMO (Chamberí) — tertulia =====
register('cafe_modernismo', (exit) => {
  const { m, matX, matY } = makeRoom('cafe_modernismo', 'CAFÉ DEL MODERNISMO', 10, 8, FLOOR_WOOD);
  linkExit(m, matX, matY, exit);
  // Mesas de tertulia.
  setSolid(m, 2, 3, TABLE);
  setSolid(m, 6, 3, TABLE);
  setSolid(m, 4, 5, TABLE);
  m.layers.deco[2][1] = CARPET;
  setSolid(m, 8, 2, SHELF); // biblioteca del café
  setSolid(m, 8, 3, SHELF);
  // Abuelo Ramón — ex-trabajador de la Estación Fantasma (lore de la llave).
  m.npcs.push({
    id: 'abuelo_ramon', sprite: 'elder_m', x: 2, y: 4, dir: 'down', roam: false,
    dialog: [
      'Siéntate, muchacho, y escucha. Yo trabajé en la Estación de Chamberí antes de que la clausuraran, allá por el 66.',
      'La cerraron de un día para otro. Los obreros decían que "veían cosas" en el túnel. Yo no vi nada... pero tampoco volví a dormir igual.',
      'Si algún día consigues la Llave Antigua, baja con cuidado. Hay algo ahí abajo esperando. Algo que hace mucho ruido de metal.',
    ],
  });
  // Contertulio de café.
  m.npcs.push({
    id: 'contertulio', sprite: 'scientist', x: 6, y: 4, dir: 'down', roam: false,
    dialog: [
      'En la tertulia de hoy debatimos si la improvisación de Marcelino puede vencer a la lógica de Álvaro.',
      'Yo soy del Team Lógica, lo confieso. Pero entre nosotros... me caes mejor tú. No se lo digas a Adrián, que se enfada como un crío.',
    ],
  });
  addSign(m, 1, 3, 'CAFÉ DEL MODERNISMO — Tertulia diaria a las cinco. "Prohibido vapear. Sí, Jesús, va por ti."');
  return m;
});

// ===== MERCADO DE VALLEHERMOSO (Chamberí) =====
register('mercado_vallehermoso', (exit) => {
  const { m, matX, matY } = makeRoom('mercado_vallehermoso', 'MERCADO DE VALLEHERMOSO', 11, 8, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  // Dos puestos de mercado.
  addShopCounter(m, 2, 3, 3, {
    id: 'puesto_jamon', sprite: 'shopkeeper_f', roam: false, shop: true,
    dialog: [
      'Género fresco de la sierra, caballero. Jamón ibérico que cura hasta el mal de amores de Alex, fíjese si es bueno.',
      'El queso manchego va de maravilla para la confusión. Y la manzana madrileña, para reponer fuerzas en plena ruta.',
      'Pruebe, pruebe, que aquí no cobramos el aire, no como la madre de Eduardo. ¿Qué le pongo?',
    ],
  });
  setSolid(m, 7, 3, TABLE);
  setSolid(m, 8, 3, TABLE);
  setSolid(m, 9, 3, CABINET);
  m.npcs.push({
    id: 'casera_mercado', sprite: 'generic_f3', x: 8, y: 2, dir: 'down', roam: false,
    dialog: [
      'Toda la vida en el mercado, hijo. He visto crecer a media Chamberí entre acelgas y chismorreos.',
      'A la madre de Marcelino la admiro: cría a ese chaval entre Excels y Pokémon y no pierde la sonrisa. ¡Eso es echarle ganas!',
    ],
  });
  addSign(m, 1, 3, 'MERCADO DE VALLEHERMOSO — Curativos castizos. "El que regatea, que regatee con la madre de Eduardo."');
  return m;
});

// ===== ESTACIÓN FANTASMA DE CHAMBERÍ (vestíbulo clausurado) =====
register('estacion_fantasma', (exit) => {
  const { m, matX, matY } = makeRoom('estacion_fantasma', 'ESTACIÓN DE CHAMBERÍ', 9, 8, FLOOR_TILE);
  linkExit(m, matX, matY, exit);
  // Vestíbulo polvoriento: tornos viejos (mesas) y un cartel clausurado.
  setSolid(m, 2, 4, TABLE);
  setSolid(m, 6, 4, TABLE);
  setSolid(m, 4, 2, CABINET); // taquilla antigua
  // Vigilante que no te deja bajar al túnel todavía (gate narrativo suave).
  m.npcs.push({
    id: 'vigilante_estacion', sprite: 'guitarist', x: 4, y: 3, dir: 'down', roam: false,
    dialog: [
      'Eh, eh. Por ahí no se baja. El andén lleva clausurado desde 1966 y va a seguir clausurado.',
      'Sin la Llave Antigua no abro esa verja ni loco. Y aunque la tuvieras... ¿tú has oído lo que sube por el túnel de noche? Metal. Mucho metal.',
      'Anda, vuelve a la luz, que aquí abajo solo hay polvo, ratas y leyendas. Y a las ratas ya las conoces: una se fue a Luxemburgo.',
    ],
  });
  addSign(m, 7, 4, 'AVISO OFICIAL — "ESTACIÓN CLAUSURADA EN 1966. Prohibido el paso al andén. Firmado: Metro de Madrid."');
  addSign(m, 1, 4, 'NOTA GARABATEADA — "Lo que duerme en la vía no es un tren. Trae la llave si te atreves." (sin firma)');
  return m;
});

// ---------- ensamblado ----------
//
// Mapa de cada edificio overworld → su interior y la baldosa de salida.
// `door` es la baldosa del overworld donde se pone el warp de entrada (la
// casilla de la puerta). `exit` es a dónde te devuelve el interior (la casilla
// de delante de la puerta, donde reaparece el jugador al salir).

export const BUILDING_LINKS = [
  // --- TETUÁN ---
  { interior: 'casa_marcelino', door: { map: 'tetuan', x: 6, y: 10 }, exit: { x: 6, y: 11, dir: 'down' } },
  { interior: 'bar_tetuan', door: { map: 'tetuan', x: 15, y: 8 }, exit: { x: 15, y: 9, dir: 'down' } },
  { interior: 'cpoke_tetuan', door: { map: 'tetuan', x: 25, y: 9 }, exit: { x: 25, y: 10, dir: 'down' } },
  { interior: 'ultramarinos', door: { map: 'tetuan', x: 9, y: 26 }, exit: { x: 9, y: 27, dir: 'down' } },
  { interior: 'farmacia', door: { map: 'tetuan', x: 14, y: 26 }, exit: { x: 14, y: 27, dir: 'down' } },
  { interior: 'peluqueria', door: { map: 'tetuan', x: 4, y: 26 }, exit: { x: 4, y: 27, dir: 'down' } },
  // --- RUTA 2 ---
  { interior: 'quiosco', door: { map: 'ruta2', x: 15, y: 15 }, exit: { x: 15, y: 16, dir: 'down' } },
  // --- CHAMBERÍ ---
  { interior: 'cpoke_chamberi', door: { map: 'chamberi', x: 6, y: 9 }, exit: { x: 6, y: 10, dir: 'down' } },
  { interior: 'cafe_modernismo', door: { map: 'chamberi', x: 22, y: 9 }, exit: { x: 22, y: 10, dir: 'down' } },
  { interior: 'mercado_vallehermoso', door: { map: 'chamberi', x: 7, y: 24 }, exit: { x: 7, y: 25, dir: 'down' } },
  { interior: 'estacion_fantasma', door: { map: 'chamberi', x: 21, y: 25 }, exit: { x: 21, y: 26, dir: 'down' } },
];

// Construye todos los interiores enlazados a su salida exterior.
export function buildInteriors() {
  const out = {};
  for (const link of BUILDING_LINKS) {
    const build = INTERIOR_BUILDERS[link.interior];
    if (!build) continue;
    out[link.interior] = build({ map: link.door.map, x: link.exit.x, y: link.exit.y, dir: link.exit.dir });
  }
  return out;
}
