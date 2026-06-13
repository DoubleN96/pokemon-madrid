// Módulo de OBJETOS — catálogo único (la "fuente de verdad" de los items del juego).
// Lógica pura sin Phaser: lo consumen la tienda (ui/shop.js), la mochila
// (MenuScene), el combate (core/battle.js) y la estética (ui/theme.js).
//
// Cada entrada describe un objeto FRLG castizo:
//   id        clave interna (también la que se guarda en save.bag)
//   name      nombre mostrado (MAYÚSCULAS, estilo GBA)
//   desc      descripción corta para la mochila/tienda
//   price     precio de COMPRA en pesetas (la venta es la mitad; ver shop.js)
//   category  'ball' | 'heal' | 'cure' | 'revive' | 'battle' | 'key'
//   heal      PS que restaura (objetos de curación)
//   cures     estado que cura: 'psn'|'par'|'brn'|'slp'|'frz' (objetos de estado)
//   revive    'half' (medio PS) si revive a un Pokémon debilitado
//   ball      multiplicador de captura (objetos Poké Ball); 1 = Poké Ball normal
//   usableInBattle  true si tiene efecto al usarse DENTRO de un combate
//   usableInField   true si tiene efecto desde la mochila FUERA de combate
//
// Coherencia de precios con la economía estilo FRLG (Gen 3).

export const ITEMS = {
  'poke-ball': {
    name: 'POKÉ BALL', desc: 'Para capturar Pokémon salvajes.',
    price: 200, category: 'ball', ball: 1, usableInBattle: true, usableInField: false,
  },
  'super-ball': {
    name: 'SUPER BALL', desc: 'Más eficaz que la Poké Ball para capturar.',
    price: 600, category: 'ball', ball: 1.5, usableInBattle: true, usableInField: false,
  },
  'ultra-ball': {
    name: 'ULTRA BALL', desc: 'Aún más eficaz que la Super Ball.',
    price: 1200, category: 'ball', ball: 2, usableInBattle: true, usableInField: false,
  },
  potion: {
    name: 'POCIÓN', desc: 'Restaura 20 PS de un Pokémon.',
    price: 300, category: 'heal', heal: 20, usableInBattle: true, usableInField: true,
  },
  superpotion: {
    name: 'SUPERPOCIÓN', desc: 'Restaura 50 PS de un Pokémon.',
    price: 700, category: 'heal', heal: 50, usableInBattle: true, usableInField: true,
  },
  hyperpotion: {
    name: 'HIPERPOCIÓN', desc: 'Restaura 200 PS de un Pokémon.',
    price: 1500, category: 'heal', heal: 200, usableInBattle: true, usableInField: true,
  },
  antidote: {
    name: 'ANTÍDOTO', desc: 'Cura a un Pokémon envenenado.',
    price: 100, category: 'cure', cures: 'psn', usableInBattle: true, usableInField: true,
  },
  awakening: {
    name: 'DESPERTAR', desc: 'Despierta a un Pokémon dormido.',
    price: 250, category: 'cure', cures: 'slp', usableInBattle: true, usableInField: true,
  },
  parlyzheal: {
    name: 'ANTIPARÁLISIS', desc: 'Cura la parálisis de un Pokémon.',
    price: 200, category: 'cure', cures: 'par', usableInBattle: true, usableInField: true,
  },
  burnheal: {
    name: 'ANTIQUEMAR', desc: 'Cura las quemaduras de un Pokémon.',
    price: 250, category: 'cure', cures: 'brn', usableInBattle: true, usableInField: true,
  },
  iceheal: {
    name: 'ANTIHIELO', desc: 'Descongela a un Pokémon congelado.',
    price: 250, category: 'cure', cures: 'frz', usableInBattle: true, usableInField: true,
  },
  revive: {
    name: 'REVIVIR', desc: 'Revive a un Pokémon debilitado con la mitad de PS.',
    price: 1500, category: 'revive', revive: 'half', usableInBattle: true, usableInField: true,
  },
  repel: {
    name: 'REPELENTE', desc: 'Aleja a los Pokémon salvajes un rato.',
    price: 350, category: 'battle', usableInBattle: false, usableInField: false,
  },
  'poke-doll': {
    name: 'POKÉ MUÑECO', desc: 'Permite huir de combates salvajes.',
    price: 1000, category: 'battle', usableInBattle: false, usableInField: false,
  },
  card: {
    name: 'CARTA', desc: 'Coleccionable castizo. No hace nada... aún.',
    price: 0, category: 'key', usableInBattle: false, usableInField: false,
  },
};

// Devuelve la definición del objeto o un objeto vacío seguro si no existe.
export function itemDef(id) {
  return ITEMS[id] || {};
}

export function itemName(id) {
  return ITEMS[id]?.name || String(id).toUpperCase();
}

export function itemDesc(id) {
  return ITEMS[id]?.desc || '';
}

export function itemPrice(id) {
  return ITEMS[id]?.price ?? 0;
}

export function isBall(id) {
  return ITEMS[id]?.category === 'ball';
}

// Multiplicador de captura de una Ball (1 si no es una Ball conocida).
export function ballBonus(id) {
  return ITEMS[id]?.ball ?? 1;
}

// Objetos que tienen efecto al usarse dentro del combate (para el menú MOCHILA).
export const BATTLE_USABLE_ITEMS = Object.keys(ITEMS).filter((id) => ITEMS[id].usableInBattle);

// Catálogo por defecto del tendero general (estilo FRLG): bolas + curación básica.
export const DEFAULT_SHOP_STOCK = [
  'poke-ball', 'super-ball', 'potion', 'superpotion', 'antidote',
  'parlyzheal', 'awakening', 'burnheal', 'iceheal', 'repel',
];

// Mapas planos NOMBRE/DESC (compatibilidad con código que ya importaba ITEM_NAMES/
// ITEM_DESCS desde theme.js). Se generan una sola vez del catálogo.
export const ITEM_NAMES = Object.fromEntries(
  Object.entries(ITEMS).map(([id, def]) => [id, def.name]),
);
export const ITEM_DESCS = Object.fromEntries(
  Object.entries(ITEMS).map(([id, def]) => [id, def.desc]),
);

// Dinero inicial de una partida nueva (estilo FRLG, en pesetas).
export const DEFAULT_MONEY = 3000;

// Backfill RETROCOMPATIBLE de cartera para saves antiguos (mismo patrón que
// ensurePc / options): si falta `player.money` o `bag`, los crea bien formados
// SIN subir la versión del save. Muta el save in situ y lo devuelve.
export function ensureWallet(save, startMoney = DEFAULT_MONEY) {
  if (!save || typeof save !== 'object') return save;
  if (!save.player || typeof save.player !== 'object') save.player = {};
  if (typeof save.player.money !== 'number' || !Number.isFinite(save.player.money)) {
    save.player.money = startMoney;
  }
  if (!save.bag || typeof save.bag !== 'object' || Array.isArray(save.bag)) {
    save.bag = {};
  }
  return save;
}

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACCIONES PURAS (sin Phaser) — la "lógica de tienda" testeable.
// ─────────────────────────────────────────────────────────────────────────────
// Trabajan con un objeto `wallet` { money, bag } y devuelven un resultado SIN
// mutar la entrada: { ok, reason?, money, bag, cost?/gain? }. La UI (ui/shop.js)
// puede usarlas o aplicar su propia mutación equivalente; los tests usan estas.

// Razón de venta: el comprador paga la MITAD del precio de compra (suelo entero).
export const SELL_RATIO = 0.5;

export function sellPriceOf(id) {
  return Math.max(0, Math.floor(itemPrice(id) * SELL_RATIO));
}

// Compra `qty` unidades de `id` por `unitPrice` (por defecto el de catálogo).
// Devuelve una copia nueva de { money, bag } si hay saldo; si no, ok:false.
export function buyItem(wallet, id, qty = 1, unitPrice = null) {
  const n = Math.max(1, Math.floor(qty));
  const price = unitPrice != null ? unitPrice : itemPrice(id);
  const cost = price * n;
  const money = Math.max(0, Math.floor(wallet?.money || 0));
  const bag = { ...(wallet?.bag || {}) };
  if (cost > money) {
    return { ok: false, reason: 'no-money', money, bag, cost };
  }
  bag[id] = (bag[id] || 0) + n;
  return { ok: true, money: money - cost, bag, cost };
}

// Vende `qty` unidades de `id` por `unitPrice` (por defecto la mitad del catálogo).
// No permite vender más de lo que se lleva. Devuelve copia nueva de { money, bag }.
export function sellItem(wallet, id, qty = 1, unitPrice = null) {
  const owned = Math.max(0, Math.floor((wallet?.bag || {})[id] || 0));
  const n = Math.min(Math.max(1, Math.floor(qty)), owned);
  const money = Math.max(0, Math.floor(wallet?.money || 0));
  const bag = { ...(wallet?.bag || {}) };
  if (owned <= 0 || n <= 0) {
    return { ok: false, reason: 'nothing', money, bag, gain: 0 };
  }
  const price = unitPrice != null ? unitPrice : sellPriceOf(id);
  const gain = price * n;
  const left = owned - n;
  if (left <= 0) delete bag[id];
  else bag[id] = left;
  return { ok: true, money: money + gain, bag, gain };
}
