// Módulo E (EXTENSIÓN) — ZONA NUEVA: BERCERO (pueblo de Valladolid, Tierra de Campos).
//
// Fichero AUTÓNOMO y ADITIVO. NO modifica los mapas existentes (Tetuán, rutas,
// Chamberí, Retiro…). Solo:
//   1) exporta `BERCERO_MAPS` (mismo formato que MAPS) — el pueblo + la casa del PADRE.
//   2) exporta `wireBerceroEntry(maps)` — engancha UN ÚNICO punto de viaje a Bercero
//      añadiendo una "Estación de Autobuses ALSA" en Tetuán (un cartel + un NPC
//      conductor que te lleva en bus + el warp de ida/vuelta), SIN reorganizar nada.
//
// CONTEXTO REAL (lore-roadmap "PRINCIPIO DE MUNDO"): Bercero es un pueblo castellano
// de la provincia de Valladolid (Tierra de Campos). Lo hacemos reconocible: campos
// de cereal dorados alrededor, casas bajas de ladrillo, IGLESIA con espadaña, PLAZA
// del pueblo con fuente, ambiente rural tranquilo. Aquí vive el PADRE de Marcelino
// (NPC central, con la BANDERA DE ESPAÑA en su casa) y la pandilla del pueblo
// (la peña, calderetas, la boda de Paula e Iván). Parodia CARIÑOSA.
//
// PRIVACIDAD (repo público): cero teléfonos/JIDs/emails/etiquetas privadas; no se
// geolocaliza ninguna casa real; se respetan los "NO publicar" de las fichas.
//
// Tiles: maps.js no exporta sus helpers, así que este módulo REPLICA las constantes
// y funciones de construcción que necesita (idénticas a maps.js/areaExtra.js).

// ---------- constantes de tileset (idénticas a maps.js/areaExtra.js) ----------

const GRASS = 113;
const TALL = 94;
const SIGN = 204;
const FLOWER = 658;
const FLOWER_Y = 661;
const BUSH = 88;

// Acera/calle clara (blob del camino de Oldale)
const PATH = { TL: 2487, T: 2488, TR: 2489, L: 2600, C: 2601, R: 2602, BL: 2713, B: 2714, BR: 2715 };
// Tierra arenosa (blob del camino de Petalburg) — para los caminos rurales/eras.
const DIRT = { TL: 2490, T: 2491, TR: 2492, L: 2603, C: 2604, R: 2605, BL: 2716, B: 2717, BR: 2718 };

const WATER = 4183;
const WEDGE = { TL: 4408, T: 4409, TR: 4410, L: 4521, R: 4523, B: 4635 };
const FENCE = { H_L: 540, H: 541, H_R: 542, V: 656, V_B: 769 };
const TREE = { TOP: [98, 99], MID: [211, 212], BOT: [437, 438] };

// "Campo de cereal" castellano: reutilizamos los tiles de FLOR amarilla (661) y la
// hierba alta (94) salpicados sobre el verde para sugerir trigales/eras doradas
// sin tiles nuevos. Es decorativo (no encuentros salvo en los prados marcados).

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
// "Iglesia" del pueblo: reusamos la fachada elegante (lectura de edificio noble,
// con la espadaña sugerida por el remate superior). Es solo decorado (sin interior).
const ELEGANT = {
  w: 6, h: 5, overheadRows: 1,
  tiles: [
    [30, 31, 31, 31, 31, 35], [143, 144, 144, 144, 144, 148], [256, 257, 258, 144, 260, 261],
    [369, 370, 371, 372, 373, 374], [482, 483, 484, 485, 486, 487]],
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
  m.signs.push({ x, y, lines: Array.isArray(text) ? text : [text] });
}

function sprinkle(m, tile, spots) {
  for (const [x, y] of spots) {
    if (m.collision[y][x] === 0 && m.layers.deco[y][x] === -1) m.layers.deco[y][x] = tile;
  }
}

// "Era de cereal": salpica flores amarillas + algún matojo sobre una franja para
// sugerir trigal castellano dorado. Decorativo (no colisiona, no es hierba alta).
function stampCereal(m, x, y, w, h) {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) {
    if (i < 0 || j < 0 || i >= m.width || j >= m.height) continue;
    if (m.collision[j][i] !== 0 || m.layers.deco[j][i] !== -1) continue;
    // patrón disperso: ~40% flor amarilla (espiga), resto verde de fondo.
    if (((i * 7 + j * 13) % 5) < 2) m.layers.deco[j][i] = FLOWER_Y;
  }
}

// ---------- BERCERO — pueblo (30×28) ----------
// Plaza central con fuente, IGLESIA con espadaña, casas bajas de ladrillo, la PEÑA
// "Las Escuelas", campos de cereal dorados al borde y un prado con hierba alta
// (encuentros suaves: fauna de campo castellano).

function buildBercero() {
  const m = makeBase('bercero', 'BERCERO', 30, 28);

  // Borde de árboles (chopos de ribera castellanos) con hueco NORTE (x14-15)
  // por donde llega/sale el autobús desde Madrid (warp de vuelta a Tetuán).
  stampTrees(m, 0, 0, 1, 27);
  stampTrees(m, 28, 0, 29, 27);
  stampTrees(m, 2, 0, 13, 2);
  stampTrees(m, 16, 0, 27, 2);
  stampTrees(m, 2, 25, 27, 27);

  // Campos de cereal dorados en las dos esquinas superiores (sello de Tierra de Campos).
  stampCereal(m, 2, 3, 11, 4);
  stampCereal(m, 17, 3, 11, 4);

  // Camino del pueblo: baja del autobús (norte) a la plaza y se ramifica a las casas.
  const cells = new Set();
  addRect(cells, 14, 1, 2, 10);    // bajada desde la parada de bus
  addRect(cells, 6, 10, 18, 2);    // calle mayor (horizontal)
  addRect(cells, 14, 11, 2, 11);   // bajada a la plaza y la peña
  addRect(cells, 6, 18, 18, 2);    // calle baja (a la iglesia y casas)
  stampPath(m, cells, DIRT);

  // PLAZA del pueblo (empedrado claro) alrededor de la fuente.
  const plaza = new Set();
  addRect(plaza, 11, 13, 8, 5);
  stampPath(m, plaza, PATH);
  stampPond(m, 13, 14, 3, 3);            // fuente de la plaza

  // IGLESIA con espadaña (lado sur, presidiendo la plaza).
  stampBuilding(m, 12, 20, ELEGANT);     // Iglesia de Bercero (decorado)
  addSign(m, 11, 23, 'IGLESIA DE BERCERO. "Aquí se casan Paula e Iván. El cura avisa: calzado cómodo para bailar y una chaqueta por si refresca de noche."');

  // CASA DEL PADRE de Marcelino (oeste de la calle mayor) — con la BANDERA DE ESPAÑA.
  // La puerta (8,8) se enlaza al interior `casa_padre` vía wireBerceroDoors.
  stampBuilding(m, 6, 4, HOUSE_BIG);     // casa del padre (puerta 8,8)
  addSign(m, 5, 8, 'CASA DEL PADRE DE MARCELINO. Ondea la BANDERA DE ESPAÑA en el balcón. "Llamar fuerte: o está en la huerta o echando la partida en la peña."');

  // PEÑA "LAS ESCUELAS": el club del pueblo que están reformando (barra, merendero).
  // Es ENTRABLE: la puerta (21,8) se enlaza al interior `pena_escuelas` (caldereta,
  // barra, nevera Beko de Wallapop) vía wireBerceroDoors. Ahí está la pandilla.
  stampBuilding(m, 20, 4, HOUSE);        // la peña (puerta 21,8)
  addSign(m, 19, 8, 'PEÑA "LAS ESCUELAS". Reformándose desde tiempos inmemoriales. "Caldereta del sábado: 7,5€. Trae el Bizum y NO preguntes quién pagó qué." (Entra, está la pandilla.)');

  // Tiendas/casas bajas de ladrillo del pueblo.
  stampBuilding(m, 22, 13, HOUSE);       // casa baja (vecinos)
  stampBuilding(m, 4, 20, HOUSE);        // bar/tienda del pueblo
  addSign(m, 5, 23, 'BAR DEL PUEBLO. "Vermú de grifo, gambas y la quiniela. Aquí se arreglan las medidas de la barra de la peña y el mundo entero."');

  // CENTRO SOCIAL IBAI — el "Centro Pokémon" de Bercero. Curas al equipo a base de
  // "sol y sombra" (coñac + anís), la copa marca de la casa (y de Laureano).
  // Reutiliza la fachada del Centro Pokémon; su interior es `centro_social_ibai`.
  stampBuilding(m, 24, 19, PKMN_CENTER); // Centro Social Ibai (puerta 25,22)
  addSign(m, 24, 22, 'CENTRO SOCIAL IBAI — el alma del pueblo. "Aquí se cura a los bichos con un SOL Y SOMBRA (coñac y anís), la copa que inventó Laureano. Pasa, que invita la casa... la primera."');

  // Vallas de huerta + chopos sueltos para sabor rural.
  fenceH(m, 2, 8, 4);
  fenceV(m, 27, 4, 5);
  stampTree(m, 10, 13);
  stampTree(m, 18, 4);

  // PRADO con hierba alta (eras del pueblo): encuentros suaves de campo castellano.
  stampTallGrass(m, 3, 12, 7, 5);
  stampTallGrass(m, 20, 21, 6, 3);

  sprinkle(m, FLOWER, [[12, 12], [18, 12], [11, 18], [19, 17]]);
  sprinkle(m, FLOWER_Y, [[3, 18], [26, 12], [9, 22], [22, 18]]);
  sprinkle(m, BUSH, [[2, 17], [27, 17], [16, 24], [9, 9]]);

  addSign(m, 14, 3, 'BIENVENIDO A BERCERO (Valladolid) — Tierra de Campos. "Pueblo de cereal, calderetas y buena gente. Aquí el caos de Madrid no tiene cobertura. Disfruta."');

  berceroData(m);
  return m;
}

function berceroData(m) {
  // Encuentros de campo castellano: fauna tranquila, nivel medio-bajo (zona opcional
  // de "vuelta al pueblo", coherente con post-Tetuán pero amable para visita temprana).
  m.encounters = [
    { species: 16, min: 6, max: 9, weight: 32 },  // Pidgey (gorriones de era)
    { species: 19, min: 6, max: 9, weight: 28 },  // Rattata (ratón de campo)
    { species: 43, min: 6, max: 10, weight: 20 }, // Oddish (huertas)
    { species: 69, min: 6, max: 10, weight: 14 }, // Bellsprout (entre el cereal)
    { species: 17, min: 8, max: 11, weight: 6 },  // Pidgeotto (raro)
  ];
  // Warp de VUELTA a Tetuán (la parada del bus). El toX/toY se rellena al enganchar
  // en wireBerceroEntry para clavarlo justo delante de la estación de Tetuán.
  m.warps = [
    { x: 14, y: 0, toMap: 'tetuan', toX: 1, toY: 1, dir: 'up' },
    { x: 15, y: 0, toMap: 'tetuan', toX: 1, toY: 1, dir: 'up' },
  ];
  m.npcs = BERCERO_NPCS;
  m.playerSpawn = { x: 14, y: 2 };
  m.healSpawn = { x: 25, y: 23 };
}

const BERCERO_NPCS = [
  // Iván de Fuentes — el NOVIO (boda de Paula e Iván el 6 de junio). Combate cariñoso
  // temático "día de boda / le hacen todo". Nidoking + acompañantes Gen-1.
  {
    id: 'ivan_novio', sprite: 'ivan_novio', x: 12, y: 12, dir: 'down', roam: false,
    trainer: {
      name: 'IVÁN',
      title: 'El Novio de la Boda del Pueblo',
      party: [
        { species: 35, level: 8 },   // Clefairy (boda/romance Gen-1)
        { species: 34, level: 10 },  // Nidoking (el "novio" clásico de Gen-1)
      ],
      intro: [
        '¡Marcelino, has venido al pueblo! Justo a tiempo: Paula me ha hecho la maleta, Diego me la ha bajado al coche y yo... yo solo tengo que aparecer y casarme. La vida bien organizada, ¿eh?',
        'Oye, antes de la caldereta echamos un combate, que para algo eres el de los Pokémon. Pero rapidito, que Paula me quiere para la prueba del traje y a Paula no se le dice que no.',
        '¡Va! Que diga la peña que el novio aún sabe pelear. Aunque sea lo último que haga de soltero, jajaja.',
      ],
      win: [
        '¡Buah, me has ganado el día de mi despedida casi! Bien jugado, crack. Esto lo cuento en el banquete fijo.',
        'Anda, vente a la peña a la caldereta, que invita... bueno, paga cada uno su parte por Bizum, ya sabes cómo va esto aquí. ¡Nos vemos en la boda!',
      ],
      defeat: [
        '¡El novio sigue invicto! Algo tenía que ganar yo esta semana, que entre el traje y los asientos de la iglesia me tienen frito.',
        'Entrena un poco y vuelves, que tengo que ir a que Paula me apruebe los zapatos. La logística de boda no para.',
      ],
      prize: 480,
      flag: 'ivan_novio_bercero',
    },
  },
  // Laura Gallega — la jefa de logística del grupo (cuidadora, agua/Galicia).
  // OK público: organiza y pone orden. NO se la etiqueta como pareja de Marcelino.
  {
    id: 'laura_gallega', sprite: 'laura_gallega', x: 18, y: 13, dir: 'down', roam: false,
    trainer: {
      name: 'LAURA',
      title: 'La Jefa de Logística del Grupo',
      party: [
        { species: 134, level: 9 },  // Vaporeon (agua, Galicia/mar)
        { species: 113, level: 11 }, // Chansey (cuidadora del grupo)
      ],
      intro: [
        'Hola, Marcelino. A ver, lista mental: la caldereta encargada, las sillas de la iglesia contadas, el gel de ducha para los que se quedan a dormir... y ahora apareces tú a desordenarlo todo. Típico.',
        'Alguien tiene que poner orden en esta pandilla, que si no, la boda acaba siendo otra fiesta gánster con pijama de invierno y toalla. Y de eso ya tuvimos bastante.',
        'Venga, te combato, pero con cariño y sin que se enfríe la comida. Y luego me ayudas a recoger, ¿eh? Que aquí no se libra nadie.',
      ],
      win: [
        'Bien jugado, mira tú. Lo apunto en mi lista: "Marcelino - combate - ganado". Todo en orden, como debe ser.',
        'Toma tu premio. Y avisa a la peña de que la caldereta es a y media, que como sea por ellos comemos a las cinco. ¡Hala, a ayudar!',
      ],
      defeat: [
        'Y otra cosa que sale como yo digo. La logística siempre gana, cielo, deberías saberlo ya.',
        'Anda, descansa y luego me echas una mano con las sillas. Que ser el de los Pokémon no te libra de currar en la boda.',
      ],
      prize: 560,
      flag: 'laura_gallega_bercero',
    },
  },
  // Alvaro Nozal — el trotamundos / BBQ master del grupo (viajes, parrilla).
  {
    id: 'alvaro_nozal', sprite: 'alvaro_nozal', x: 8, y: 16, dir: 'down', roam: true,
    trainer: {
      name: 'ÁLVARO NOZAL',
      title: 'El Trotamundos de la Parrilla',
      party: [
        { species: 58, level: 9 },   // Growlithe (leal, fuego de parrilla)
        { species: 22, level: 11 },  // Fearow (millas de avión, el viajero)
      ],
      intro: [
        '¡Marce! Mira quién baja al pueblo. Yo acabo de volver de... a ver, ¿esta semana era Lisboa o Torrevieja? Se me juntan los viajes, chaval.',
        'Estoy encendiendo la parrilla para la caldereta y el BBQ de después. Tú échate un combate mientras cojo brasa, que de paso entras en calor.',
        'Que no se diga que en Bercero no se combate antes de comer. ¡Aquí se hace TODO antes de comer, y comer también!',
      ],
      win: [
        '¡Olé tú! Bueno, la parrilla la sigo ganando yo, que la chuleta no se hace sola. Buen combate, fiera.',
        'Vente luego al BBQ, que hay de sobra. Y la próxima escapada de la pandilla te apuntas, que siempre faltas tú y Cuba no se viaja solo.',
      ],
      defeat: [
        'Jaja, gano yo, como en la parrilla. Soy de los pocos que está en todos los planes Y los gana. Marca de la casa.',
        'Anda, ve cogiendo fuerzas, que en nada está la caldereta y ahí sí que no perdona nadie. ¡A entrenar!',
      ],
      prize: 540,
      flag: 'alvaro_nozal_bercero',
    },
  },
  // Arantza — la tech/emprendedora del pueblo (n8n, automatizaciones). Eléctrica.
  {
    id: 'arantza', sprite: 'arantza', x: 22, y: 15, dir: 'left', roam: false,
    trainer: {
      name: 'ARANTZA',
      title: 'La de las Automatizaciones del Pueblo',
      party: [
        { species: 81, level: 9 },   // Magnemite (máquinas, n8n)
        { species: 82, level: 11 },  // Magneton (automatización en cadena)
      ],
      intro: [
        '¡Marce! Justo a ti te quería ver. Mira, he montado un workflow en n8n que avisa por Telegram cuando la caldereta está lista. Automatizar el pueblo, esa es la movida.',
        'Tú y yo somos los raros de aquí: en vez de echar la siesta, montamos sistemas. Adrián también se ha picado, ya somos tres. La peña no nos entiende, pero nos quiere.',
        'Va, combáteme, que entre que se ejecuta el workflow tengo un hueco. Eficiencia, Marce, eficiencia.',
      ],
      win: [
        '¡Anda! Pues sí que has optimizado bien el equipo. Respeto. Te paso el flujo de la caldereta si me lo pides bien.',
        'Toma tu premio, ya lo he automatizado para que se descuente solo. Es broma... ¿o no? Nos vemos en la boda, que de la música me encargo yo, claro.',
      ],
      defeat: [
        'Te ha faltado un par de iteraciones, majo. Como un workflow sin testear: bonito pero peta a la primera.',
        'Refactoriza ese equipo y vuelves. Yo mientras dejo corriendo otro proceso. El pueblo no se automatiza solo.',
      ],
      prize: 600,
      flag: 'arantza_bercero',
    },
  },
  // (Nano y Alberto están DENTRO de la Peña "Las Escuelas" — ver pena_escuelas.)
  // Ana — alegre y juguetona ("niña interior"), pareja de Adrián. Charla cariñosa
  // (sin combate aquí; da ambiente de la pandilla y la boda).
  {
    id: 'ana', sprite: 'ana', x: 20, y: 16, dir: 'down', roam: true,
    dialog: [
      '¡Marceee, has venido al pueblo! Qué ilusión, que estamos todos con la boda de Paula e Iván y faltabas tú.',
      'Adrián anda con Arantza montando no sé qué de automatizar la lista de la caldereta. Yo les digo que se relajen, que esto es Bercero, ¡aquí se vive despacito y se ríe deprisa!',
      'Oye, ¿te quedas a dormir? Que la peña se llena y al final acabamos todos de pijama como en la casa rural del cumple. ¡Trae buen rollo y poco más!',
    ],
  },
  // Adrián — pareja de Ana, el otro tech-social del grupo (n8n, automatización).
  // Charla cariñosa (sin combate; ya combaten Iván/Laura/Álvaro/Arantza/Nano/Alberto).
  {
    id: 'adrian_bercero', sprite: 'youngster', x: 21, y: 16, dir: 'down', roam: false,
    dialog: [
      '¡Marcelino! Estaba con Arantza enganchando un workflow a la nevera de la peña. Si baja de 5 birras, salta una alerta. Es el futuro, te lo digo yo.',
      'Sí, soy el de los cumples de enero y el de los planes. Ana dice que me pase el día montando cosas en vez de vivir. Tiene razón, pero es que MOLA.',
      'Vente a la caldereta del sábado. La lista cambia cada hora, pero tú apúntate, que ya te cuadro yo el Bizum. Y bienvenido al pueblo, crack.',
    ],
  },
  // Vecino mayor de relleno (sabor de pueblo, sin sprite propio → fallback genérico).
  {
    id: 'vecino_bercero', sprite: 'elder_m', x: 6, y: 13, dir: 'right', roam: false,
    dialog: [
      'Tú eres el hijo del de la huerta, ¿verdad? El que se fue a Madrid a eso de los ordenadores. Buen muchacho, aunque no para quieto.',
      'Aquí en Bercero se está bien: cereal, caldereta y la fiesta de San Isidro. Lo demás, ruido de ciudad. Dale recuerdos a tu padre, que hoy andaba en la peña.',
    ],
  },
  // Niña del pueblo (ambiente).
  {
    id: 'nina_bercero', sprite: 'lass', x: 17, y: 19, dir: 'left', roam: true,
    dialog: [
      '¿Has visto la fuente de la plaza? En verano nos remojamos aquí hasta que abre la piscina del pueblo, el 20 de junio. ¡Lo tenemos contado!',
      'Mi prima dice que en la hierba de las eras salen bichos. Yo solo he visto un Pidgey robándole la merienda a mi abuelo. ¡Casi le da algo!',
    ],
  },
  // Luisan "el Mago" — Luis Ángel. Hombre-orquesta del pueblo: mago, fotógrafo,
  // cura, pastor y alguacil. Su presentación clava el meme "¡Bienvenido Luis Ángel!!!"
  // (lo que le gritaban cuando venía a echarlos de la piscina de noche). Entrenador:
  // equipo temático de sus cinco oficios. Frases ligadas a sus profesiones.
  {
    id: 'luisan_mago', sprite: 'gentleman', x: 14, y: 17, dir: 'down', roam: false,
    trainer: {
      name: 'LUISAN',
      title: 'El Mago del Pueblo (y otros 4 oficios)',
      party: [
        { species: 65, level: 12 },   // Alakazam — el MAGO (psíquico, trucos)
        { species: 122, level: 11 },  // Mr. Mime — el FOTÓGRAFO/showman (barrera, luz)
        { species: 113, level: 11 },  // Chansey — el CURA/PASTOR (sana al rebaño)
        { species: 59, level: 13 },   // Arcanine — el ALGUACIL (perro de la ley)
      ],
      intro: [
        '¡¡¡BIENVENIDO LUIS ÁNGEL!!! 🪄 ...Ah, no: ése es MI saludo. Soy Luisan: mago, fotógrafo, cura, pastor y alguacil. En Bercero hago de todo, hasta de árbitro en la caldereta.',
        'Como alguacil te pediría el permiso de entrenador... pero como mago prefiero un truco. ¡Saca a tus bichos, que les hago una foto de recuerdo antes de ganarte!',
      ],
      win: [
        '¡Magia de la buena! Ni con mis cinco oficios te paro. Te haría una foto, pero esta derrota mejor no la inmortalizo, jajaja.',
        'Pásate por la piscina esta noche... pero pronto, que luego como alguacil os tengo que echar a todos. ¡Bienvenido al pueblo, crack!',
      ],
      defeat: [
        'Que conste en acta del alguacil: el forastero ha perdido. Como cura te absuelvo, pero como pastor te digo que vuelvas al redil a entrenar.',
        'Hazte la foto del recuerdo y vuelve cuando estés a la altura. ¡El espectáculo de Luisan no se gana a la primera!',
      ],
      prize: 520,
      flag: 'luisan_mago_bercero',
    },
  },
  // Laureano "El tío de Bercero" — terrateniente patatero y disfrutón de época.
  // Se pasea en su calesa tirada por su caballo Popeye (= su Rapidash). Pedido por Adrián.
  {
    id: 'laureano_bercero', sprite: 'hiker', x: 10, y: 18, dir: 'down', roam: false,
    trainer: {
      name: 'LAUREANO',
      title: 'El Tío de Bercero (terrateniente patatero)',
      party: [
        { species: 128, level: 12 },  // Tauros — el ganado del terrateniente
        { species: 51, level: 11 },   // Dugtrio — las patatas (excava la tierra)
        { species: 143, level: 13 },  // Snorlax — el DISFRUTÓN de época
        { species: 78, level: 14 },   // Rapidash — POPEYE, su caballo de la calesa
      ],
      intro: [
        '¡Ahá, forastero! Soy Laureano, el tío de Bercero: terrateniente, patatero mayor del reino y disfrutón de época. La calesa de ahí con el caballo Popeye es mía, que uno se pasea como un señor.',
        'Mis patatas son las mejores de Valladolid y mis fiestas, legendarias. ¿Un combate antes de la caldereta? ¡Que corra el vino y los Pokémon!',
      ],
      win: [
        '¡Recórcholis! Me has ganado... habrá que invitarte a unas patatas y a un SOL Y SOMBRA, mi copa (coñac y anís), que un buen rival se celebra. La sirven en el Centro Social Ibai. ¡Arre, Popeye, que nos vamos de fiesta!',
      ],
      defeat: [
        '¡Jajaja! En mis tierras mando yo y mi ganado. Vuelve cuando aguantes el ritmo de un disfrutón de época, muchacho.',
      ],
      prize: 560,
      flag: 'laureano_bercero',
    },
  },
  // JUNE — "la pitillera suprema" del pueblo. NO combate: te PIDE un cigarro de
  // liar de los buenos (CIGARROS INDUS) y, si se lo das, te suelta su tesoro: una
  // MASTER BALL que guardaba "pa una ocasión". Trueque único (flag june_reward).
  // Si no llevas tabaco, solo te lo pide (con retranca), sin decir dónde comprarlo.
  // Los CIGARROS INDUS se venden en el Estanco de Bercero (NPC tendero, abajo).
  {
    id: 'june_pitillera', sprite: 'expert_f', x: 17, y: 18, dir: 'down', roam: false,
    barter: {
      need: 'cigarros', qty: 1, flag: 'june_reward',
      reward: { item: 'master-ball', qty: 1 },
      // No llevas CIGARROS INDUS: June SOLO te los pide (sin pista de dónde comprarlos).
      askLines: [
        'Me das un piti.',
        'Si yo tengo de liar, pero me gustan los indus, que el de liar me sabe a chamusquina.',
        'Anda, no seas agarrao, que un cigarro no se le niega a una señora. Vuelve cuando lleves de los buenos.',
      ],
      // Sí los llevas: charla previa antes de la decisión SÍ/NO.
      haveLines: [
        '¡Ahí va, indus! Esos sí. Me los hueles a la legua, criatura.',
        '¿Me das uno? Te lo cambio por una cosa que guardo pa una ocasión... y tú tienes pinta de ocasión.',
      ],
      // Al aceptar: entrega la Master Ball con retranca de pitillera.
      rewardLines: [
        'Toma, pa ti. Es de las gordas, no la malgastes en un Rattata, no seas manta.',
        'Con esa cazas hasta al lucero del alba. Yo me fumo este a tu salud, hala.',
      ],
      // Al rechazar la entrega.
      declineLines: [
        'Anda que... me dejas con el ansia. Tú te lo pierdes, que lo que guardo es bueno.',
      ],
      // Ya canjeado.
      doneLines: [
        'Qué, ¿echando humo por ahí? Gracias por el piti, majo, eres un señor.',
        'La bola esa cuídamela, que no se ven muchas. Y si pillas más indus, ya sabes dónde vivo.',
      ],
    },
  },
  // ESTANCO de Bercero — el tendero que vende los CIGARROS INDUS (y básicos del
  // pueblo). Tienda overworld (shop:true) con catálogo explícito vía shopItems.
  {
    id: 'estanquero_bercero', sprite: 'shopkeeper_m', x: 5, y: 19, dir: 'down', roam: false,
    shop: true,
    shopItems: ['cigarros', 'poke-ball', 'potion', 'antidote'],
    dialog: [
      'Estanco y ultramarinos de Bercero, dígame usted. Tabaco, sellos, pipas y lo que haga falta.',
      'Los CIGARROS INDUS son lo más vendido, sobre todo desde que June se aficionó. Esa mujer fuma más que la chimenea de la caldereta.',
      '¿Le pongo algo? Que tengo que cerrar pa ir a la partida, no se me eternice.',
    ],
  },
  // ====== "ASOCIACIÓN DE AMAS DE CASA" — organización estilo Team Rocket ======
  // Banda de mujeres del pueblo que controla las festividades y las comidas
  // "solo para ellas". Pedida por Adrián. Lema, jerarquía (grunts + presidenta)
  // y combates al estilo de las organizaciones malvadas Pokémon.
  {
    id: 'ama_grunt_1', sprite: 'shopkeeper_f', x: 7, y: 15, dir: 'down', roam: true,
    trainer: {
      name: 'AMA DE CASA',
      title: 'Asociación de Amas de Casa',
      party: [ { species: 39, level: 9 }, { species: 35, level: 10 } ], // Jigglypuff + Clefairy
      intro: [
        '¡Alto ahí! Esta plaza la tenemos RESERVADA para la comida de la Asociación. Hoy es "solo mujeres", así que circulando, guapo.',
        '¿Que quién manda aquí? La ASOCIACIÓN DE AMAS DE CASA. Nosotras decidimos las fiestas, los menús y quién barre el merendero. ¡A combatir!',
      ],
      win: ['Bah, suerte tienes. Pero a la caldereta de mañana NO estás invitado.'],
      defeat: ['¡Ja! Vuelve a tu casa, anda. Y dile a tu madre que se apunte a la Asociación.'],
      prize: 300,
      flag: 'ama_grunt_1_bercero',
    },
  },
  {
    id: 'ama_grunt_2', sprite: 'elder_f', x: 23, y: 16, dir: 'left', roam: true,
    trainer: {
      name: 'AMA DE CASA',
      title: 'Asociación de Amas de Casa',
      party: [ { species: 113, level: 10 }, { species: 108, level: 10 } ], // Chansey + Lickitung
      intro: [
        'Lema de la Asociación: "¡Por las fiestas del pueblo! ¡Por las comidas sin maridos! ¡Y por el bingo de los jueves!".',
        'Llevo 40 años organizando San Isidro. ¿Y tú vienes a darme lecciones? Saca los bichos, criatura.',
      ],
      win: ['Está bien, está bien... pero la receta de la caldereta NO te la doy.'],
      defeat: ['En mis tiempos los jóvenes respetaban a la Asociación. ¡A fregar!'],
      prize: 340,
      flag: 'ama_grunt_2_bercero',
    },
  },
  {
    id: 'ama_grunt_3', sprite: 'swimmer_f', x: 12, y: 20, dir: 'up', roam: false,
    trainer: {
      name: 'AMA DE CASA',
      title: 'Asociación de Amas de Casa',
      party: [ { species: 40, level: 11 }, { species: 44, level: 11 } ], // Wigglytuff + Gloom
      intro: [
        'La piscina del pueblo, las verbenas, la matanza... TODO lo organizamos nosotras. Y tú ni te enteras.',
        'Si quieres pasar a ver a la Presidenta, primero me ganas a mí. Reglas de la Asociación.',
      ],
      win: ['Pasa, pasa... pero como toques el bizcocho de la mesa te las ves conmigo.'],
      defeat: ['¡Ni hablar! Hoy no entra ningún hombre a la comida. ¡Hala, fuera!'],
      prize: 380,
      flag: 'ama_grunt_3_bercero',
    },
  },
  {
    id: 'ama_presidenta', sprite: 'expert_f', x: 12, y: 22, dir: 'down', roam: false,
    trainer: {
      name: 'DOÑA NIEVES',
      title: 'PRESIDENTA — Asociación de Amas de Casa',
      party: [
        { species: 122, level: 13 }, // Mr. Mime (la barrera: "aquí no entran hombres")
        { species: 45, level: 13 },  // Vileplume
        { species: 36, level: 14 },  // Clefable (la matriarca)
      ],
      intro: [
        'Así que has derrotado a mis socias para llegar hasta mí. Tienes agallas, hijo. Soy Doña Nieves, PRESIDENTA de la Asociación de Amas de Casa.',
        'Nosotras movemos los hilos de este pueblo: las fiestas, las comidas, las habladurías y hasta quién se sienta con quién en la verbena. El poder REAL de Bercero.',
        'Pero hoy te has colado en nuestra comida de mujeres. Eso se paga con un combate. ¡Por la Asociación!',
      ],
      win: [
        '...Está bien. Te lo has ganado, muchacho. Quedas nombrado "amigo honorario" de la Asociación. Es el mayor honor del pueblo, que lo sepas.',
        'Anda, siéntate y come algo. Pero como cuentes lo que se habla en estas comidas... te buscamos. Jajaja.',
      ],
      defeat: [
        '¡La Asociación no se derrota tan fácil! Vuelve a casa, repón fuerzas, y que tu abuela te enseñe a pelear.',
      ],
      prize: 720,
      flag: 'ama_presidenta_bercero',
    },
  },
];

// ---------- BERCERO — interiores ----------
// Constantes de tiles de interior (idénticas a interiors.js).
const I_WALL = 2574;
const I_WALL_WINDOW = 2580;
const I_WALL_BALL = 2578;
const I_FLOOR_WOOD = 3462;
const I_FLOOR_TILE = 2613;
const I_CARPET = 2601;
const I_MAT = 2616;
const I_TABLE = 2701;
const I_HEAL_L = 2704;
const I_HEAL_R = 2705;
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

// CASA DEL PADRE — el PADRE es el NPC central. Cura el equipo (como Mamá en Tetuán)
// y luce la BANDERA DE ESPAÑA en la pared. Parodia cariñosa del padre de pueblo.
function buildCasaPadre(exit) {
  const { m, matX, matY } = makeRoom('casa_padre', 'CASA DEL PADRE', 9, 8, I_FLOOR_WOOD);
  iLinkExit(m, matX, matY, exit);

  // BANDERA DE ESPAÑA en la pared (rojo-amarillo-rojo, 3 tiles de la fila de ventanas).
  // Usamos índices de tile sólidos del tileset para las tres franjas. Marcada sólida
  // (es pared/decoración) y descrita con un cartel para que se lea bien en el juego.
  m.layers.ground[1][6] = I_WALL;       // base de pared bajo la bandera
  m.layers.deco[1][5] = 540;            // franja roja (reutiliza tile cálido del set)
  m.layers.deco[1][6] = 661;            // franja amarilla (flor amarilla = oro)
  m.layers.deco[1][7] = 540;            // franja roja
  m.collision[1][5] = 1; m.collision[1][6] = 1; m.collision[1][7] = 1;
  iAddSign(m, 6, 2, 'LA BANDERA DE ESPAÑA. El padre la tiene con orgullo en el salón. "Esto es lo primero que ve quien entra. Y lo segundo, la partida de cartas a medias."', I_WALL);

  // Mobiliario de casa de pueblo: aparador, mesa camilla, brasero, la radio.
  iSetSolid(m, 1, 2, I_CABINET);   // aparador
  iSetSolid(m, 2, 2, I_SHELF);     // vitrina con fotos del pueblo
  iSetSolid(m, 7, 3, I_TABLE);     // mesa camilla (con brasero)
  m.layers.deco[5][4] = I_CARPET;  // alfombra del salón
  m.layers.deco[5][5] = I_CARPET;
  m.layers.deco[4][1] = I_PLANT;   // maceta

  // El PADRE — NPC central. Cura el equipo (heal). Diálogo cariñoso de padre de pueblo.
  m.npcs.push({
    id: 'padre_marcelino', sprite: 'padre_marcelino', x: 4, y: 4, dir: 'down', roam: false, heal: true,
    dialog: [
      '¡Hombre, mi hijo! Mira quién se acuerda del pueblo. Quita esa mochila y siéntate, que te curo a esos bichos antes de nada. Y come algo, que se te ve flaco de tanto Excel.',
      'Aquí en Bercero se vive bien: la huerta, la peña, la caldereta del sábado y la partida. Lo de Madrid déjalo en Madrid, anda. Aunque traigas Pokémon, que eso sí me gusta.',
      '...¡Listo! Tu equipo está como nuevo, curado por tu padre, que es gratis y con cariño. Ahora ve a saludar a la pandilla, que andan todos con la boda de Iván y Paula. Y NO te vayas sin pasar por la peña, ¿eh?',
    ],
  });
  iAddSign(m, 7, 2, 'FOTOS DEL PUEBLO — viajes de la pandilla (París, Lisboa, Cuba), San Isidro, calderetas... y una de Marcelino dormido en el reservado. "Esa la quito cuando quiera." — el padre.');
  return m;
}

// CENTRO SOCIAL IBAI — el "Centro Pokémon" de Bercero. El camarero te cura el equipo
// sirviéndole un "sol y sombra" (coñac + anís), la copa marca de la casa y de Laureano.
function buildCentroSocialIbai(exit) {
  const { m, matX, matY } = makeRoom('centro_social_ibai', 'CENTRO SOCIAL IBAI', 9, 8, I_FLOOR_TILE);
  iLinkExit(m, matX, matY, exit);

  // BARRA del centro social con su botellero (coñac + anís para el sol y sombra).
  for (let i = 0; i < 4; i++) iSetSolid(m, 2 + i, 3, I_TABLE);  // barra
  iSetSolid(m, 6, 2, I_SHELF);     // botellero (coñac/anís)
  iSetSolid(m, 1, 2, I_CABINET);   // nevera de bebidas
  m.layers.deco[5][4] = I_CARPET;
  m.layers.deco[5][5] = I_CARPET;
  m.layers.deco[4][7] = I_PLANT;

  // EL CAMARERO — cura el equipo (heal) sirviendo un "sol y sombra".
  m.npcs.push({
    id: 'camarero_ibai', sprite: 'shopkeeper_m', x: 4, y: 4, dir: 'down', roam: false, heal: true,
    dialog: [
      'Bienvenido al CENTRO SOCIAL IBAI, el alma de Bercero. ¿Los bichos hechos polvo? Eso aquí se arregla con un buen SOL Y SOMBRA: coñac y anís a partes iguales, receta de la casa.',
      '...¡Hala! Un sol y sombra para cada Pokémon y como nuevos. (Ellos lo huelen y reviven, no preguntes.) La copa la puso de moda Laureano, que de disfrutar sabe un rato.',
      'Si te cruzas a Laureano con la calesa y Popeye, dile que su sol y sombra cura hasta la resaca de los Tauros. ¡Que aproveche, y a ganar gimnasios!',
    ],
  });
  iAddSign(m, 7, 2, 'CARTA DEL IBAI — Sol y sombra (coñac+anís), vermú de grifo, gambas y la quiniela. "El sol y sombra es de Laureano; aquí solo lo servimos bien frío."');
  return m;
}

// PEÑA "LAS ESCUELAS" — el club/local de la pandilla del pueblo, en plena reforma.
// Barra, merendero, la nevera Beko de Wallapop, lista de la caldereta. Aquí está
// parte de la pandilla (Nano y Alberto) con su rollo: caldereta 7,5€, Bizum, peña.
function buildPenaEscuelas(exit) {
  const { m, matX, matY } = makeRoom('pena_escuelas', 'PEÑA "LAS ESCUELAS"', 11, 9, I_FLOOR_TILE);
  iLinkExit(m, matX, matY, exit);

  // BARRA del bar de la peña (mesa larga) con el barril/nevera detrás.
  for (let i = 0; i < 5; i++) iSetSolid(m, 2 + i, 3, I_TABLE);   // barra
  iSetSolid(m, 8, 2, I_SHELF);    // botellero de la barra
  iSetSolid(m, 9, 2, I_CABINET);  // NEVERA BEKO de Wallapop (vitrina)
  iSetSolid(m, 9, 3, I_CABINET);  // nevera vieja de Coca-Cola para las bebidas
  m.layers.deco[6][5] = I_CARPET; // merendero (zona de comer)
  m.layers.deco[6][6] = I_CARPET;
  m.layers.deco[4][1] = I_PLANT;

  // NANO — el fijo de confianza, cargando la nevera de la peña. Combate cariñoso.
  m.npcs.push({
    id: 'nano', sprite: 'nano', x: 9, y: 4, dir: 'down', roam: false,
    trainer: {
      name: 'NANO',
      title: 'El Fijo de la Peña',
      party: [
        { species: 74, level: 9 },   // Geodude (de la obra/reforma de la peña)
        { species: 143, level: 11 }, // Snorlax (el cachazas querido)
      ],
      intro: [
        'Hombre, Marcelino, ¡a la peña! Estaba subiendo la nevera Beko que pillamos de Wallapop. Pesa lo suyo, pero pa eso estamos los fijos de "Las Escuelas".',
        'Llevamos media vida reformando este local: la barra, el merendero, la parrilla, el baño del patio... y eternas discusiones de medidas y presupuestos. Pero es NUESTRO.',
        'Va, échame un Pokémon, que descanso de la nevera. Luego me ayudas a colocar las bebidas de la caldereta, ¿eh?',
      ],
      win: [
        'Buah, qué fuerte vas. Tú ganas, pero la nevera la coloco yo, que de eso entiendo más que de bichos.',
        'Toma. Hoy hay macarrones con chorizo y pechugas con vainas. La lista de la caldereta la lleva Laura: apúntate y manda el Bizum, 7,5€, sin preguntar quién pagó qué.',
      ],
      defeat: [
        'Aguanté como aguanta la barra de la peña tras la reforma: firme. Algo gano yo esta semana de locos.',
        'Anda, entrena y vuelves. Yo sigo con la nevera, que las birras de la caldereta no se enfrían solas.',
      ],
      prize: 520,
      flag: 'nano_bercero',
    },
  });

  // ALBERTO — el meme-lord, preparando el disfraz/baile para la boda en la peña.
  m.npcs.push({
    id: 'alberto', sprite: 'alberto', x: 4, y: 5, dir: 'down', roam: false,
    trainer: {
      name: 'ALBERTO',
      title: 'El Meme-Lord de la Peña',
      party: [
        { species: 122, level: 9 },  // Mr. Mime (mimo/show)
        { species: 132, level: 10 }, // Ditto (se disfraza de lo que sea)
      ],
      intro: [
        'Marce, tío, atento: aquí en la peña ensayo el disfraz de la boda. Implica un meme italiano absurdo y mucho ruido. "Las Escuelas" aún no se ha recuperado de la fiesta gánster.',
        'Yo a un plan no falto: caldereta, viaje, Interpeñas... si hay risas, estoy yo liándola. Pregúntale a cualquiera de la pandilla.',
        'Va, te combato con la misma seriedad con la que elijo disfraz: ninguna. ¡Que empiece el show, papá!',
      ],
      win: [
        'JAJAJA me ganas y con estilo, eso es un meme en sí mismo. Lo subo al grupo del pueblo fijo.',
        'Toma premio. Y vente a ensayar el baile, que llevo una coreografía absurda. Laura aún no lo sabe; va a flipar... o a matarme.',
      ],
      defeat: [
        'JA, gano yo, como el que ríe último. Combato mejor de lo que bailo, y eso ya es decir poco.',
        'Anda, entrena, figura. Yo termino el disfraz, que el ruido no se hace solo.',
      ],
      prize: 460,
      flag: 'alberto_bercero',
    },
  });

  // El "presi" de la peña detrás de la barra (NPC de relleno con sabor; sin sprite
  // propio → fallback genérico). Sirve la caldereta y lleva las cuentas del Bizum.
  m.npcs.push({
    id: 'presi_pena', sprite: 'shopkeeper_m', x: 5, y: 2, dir: 'down', roam: false,
    dialog: [
      '¡Bienvenido a la Peña "Las Escuelas", Marcelino! Caldereta del sábado a 7,5€ el cubierto. Hoy toca, así que ponte cómodo.',
      'La nevera Beko la trajo Nano de Wallapop; la vieja de Coca-Cola es pa las bebidas. Y el frigorífico funciona... a ratos, como la reforma.',
      'Manda el Bizum y NO preguntes quién pagó qué, que ahí nos liamos siempre. Esto es una peña de pueblo: se come, se ríe y se discute de medidas. ¡Bienvenido!',
    ],
  });
  iAddSign(m, 7, 2, 'LISTA DE LA CALDERETA — sábado, 7,5€/cubierto. "Apúntate y paga por Bizum. La lista cambia cada hora; pregunta a Laura." Macarrones con chorizo · pechugas con vainas.');
  iAddSign(m, 1, 3, 'NORMAS DE LA PEÑA "LAS ESCUELAS": 1) Se recoge entre todos. 2) El último apaga la parrilla. 3) Las medidas de la barra NO se vuelven a discutir (es coña, sí se discuten).');
  return m;
}

// ---------- export ----------

export const BERCERO_MAPS = {
  bercero: buildBercero(),
};

// Engancha la zona Bercero al mundo de forma 100% ADITIVA. Hace TRES cosas, todas
// sobre tiles libres y sin reorganizar ningún mapa existente:
//   1) registra el interior `casa_padre` y lo cablea con la puerta (8,8) de Bercero.
//   2) añade la "Estación de Autobuses ALSA" en Tetuán: un cartel + un NPC conductor
//      sobre un tile LIBRE de la plaza de Tetuán, y un warp de ida a Bercero clavado
//      en ese tile (al pisarlo, autobús a Bercero). Es el ÚNICO punto de viaje.
//   3) clava el warp de VUELTA (Bercero norte → ese mismo tile de Tetuán).
//
// IMPORTANTE: NO toca los warps norte/sur de Tetuán ni su layout. Solo añade un warp
// nuevo en un tile que verificamos libre (sin colisión, sin hierba, sin otro warp).
export function wireBerceroEntry(maps) {
  const ber = maps.bercero;

  // (1) interiores de Bercero: casa del padre + Peña "Las Escuelas".
  if (!maps.casa_padre) {
    maps.casa_padre = buildCasaPadre({ map: 'bercero', x: 8, y: 9, dir: 'down' });
  }
  if (!maps.pena_escuelas) {
    maps.pena_escuelas = buildPenaEscuelas({ map: 'bercero', x: 21, y: 9, dir: 'down' });
  }
  if (!maps.centro_social_ibai) {
    maps.centro_social_ibai = buildCentroSocialIbai({ map: 'bercero', x: 25, y: 23, dir: 'down' });
  }
  // Puertas de Bercero (pisable + warp de ida al interior). Idempotente.
  const berceroDoors = [
    { x: 8, y: 8, interior: 'casa_padre' },     // puerta de la casa del padre
    { x: 21, y: 8, interior: 'pena_escuelas' },  // puerta de la Peña "Las Escuelas"
    { x: 25, y: 22, interior: 'centro_social_ibai' }, // puerta del Centro Social Ibai
  ];
  if (ber) {
    for (const door of berceroDoors) {
      const { x: dx, y: dy, interior } = door;
      if (!maps[interior]) continue;
      if (ber.collision[dy]) ber.collision[dy][dx] = 0;
      if (ber.tallGrass && ber.tallGrass[dy]) ber.tallGrass[dy][dx] = 0;
      const dest = maps[interior].playerSpawn || { x: 4, y: 6 };
      if (!ber.warps.some((w) => w.x === dx && w.y === dy)) {
        ber.warps.push({ x: dx, y: dy, toMap: interior, toX: dest.x, toY: dest.y, dir: 'up' });
      }
    }
  }

  // (2)+(3) Estación de Autobuses en Tetuán → Bercero (ida) y vuelta.
  const tet = maps.tetuan;
  if (!tet || !ber) return;

  // Tile de la parada de bus: esquina libre del SO de la plaza de Tetuán. La plaza
  // de Tetuán tiene hierba alta en x22-28,y24-29; elegimos un tile FUERA de la
  // hierba y sin edificio: (22,30) suele estar libre (verde, sin deco). Hacemos una
  // búsqueda defensiva por si cambiara: probamos candidatos y cogemos el 1.º libre.
  const candidates = [[22, 30], [23, 30], [21, 30], [24, 30], [20, 30], [22, 29]];
  let stopX = null, stopY = null;
  for (const [cx, cy] of candidates) {
    if (cy >= tet.height || cx >= tet.width) continue;
    const blocked = tet.collision[cy] && tet.collision[cy][cx] === 1;
    const grass = tet.tallGrass && tet.tallGrass[cy] && tet.tallGrass[cy][cx] === 1;
    const hasWarp = (tet.warps || []).some((w) => w.x === cx && w.y === cy);
    const hasDeco = tet.layers.deco[cy] && tet.layers.deco[cy][cx] !== -1;
    if (!blocked && !grass && !hasWarp && !hasDeco) { stopX = cx; stopY = cy; break; }
  }
  if (stopX === null) return; // sin tile libre seguro → no enganchamos (zona inalcanzable, build sigue OK)

  // Cartel de la estación (en un tile ADYACENTE libre, para no tapar el warp).
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
        lines: ['ESTACIÓN DE AUTOBUSES "ALSA" — Línea Madrid ⇄ BERCERO (Valladolid). "Sube al bus y vete al pueblo a ver a tu padre y a la pandilla. La caldereta no espera."'],
      });
      break;
    }
  }

  // NPC conductor del bus (charla de ambiente; el viaje lo hace el warp del tile).
  if (!tet.npcs.some((n) => n.id === 'conductor_bus_bercero')) {
    const npcSpots = [[stopX, stopY - 1], [stopX + 1, stopY - 1], [stopX - 1, stopY - 1]];
    for (const [nx, ny] of npcSpots) {
      if (nx < 0 || ny < 0 || nx >= tet.width || ny >= tet.height) continue;
      const blocked = tet.collision[ny] && tet.collision[ny][nx] === 1;
      if (!blocked) {
        tet.npcs.push({
          id: 'conductor_bus_bercero', sprite: 'gentleman', x: nx, y: ny, dir: 'down', roam: false,
          dialog: [
            'Buenas. ¿El de las 10 a Bercero? Súbete por ahí, majo, que sale puntual... o cuando termine el café.',
            'Bercero, Valladolid, Tierra de Campos. Cuatro horas de cereal por la ventanilla y a comer caldereta con la familia. No hay plan mejor.',
            'Pisa el escalón del autobús (esa baldosa de ahí) y te llevo. Para volver, el mismo bus desde la plaza del pueblo.',
          ],
        });
        break;
      }
    }
  }

  // Warp de IDA: Tetuán (tile de la parada) → Bercero (spawn norte del pueblo).
  if (!tet.warps.some((w) => w.x === stopX && w.y === stopY)) {
    tet.warps.push({ x: stopX, y: stopY, toMap: 'bercero', toX: ber.playerSpawn.x, toY: ber.playerSpawn.y, dir: 'down' });
  }
  // Warp de VUELTA: Bercero (borde norte x14-15) → Tetuán (justo encima de la parada).
  const backX = stopX;
  const backY = Math.max(0, stopY - 1);
  for (const w of ber.warps) {
    if (w.toMap === 'tetuan') { w.toX = backX; w.toY = backY; }
  }
}
