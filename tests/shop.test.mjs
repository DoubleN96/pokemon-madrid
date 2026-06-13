// Tests de la TIENDA y los OBJETOS (Módulo D — dinero/bolsa/tienda/uso de items).
// Sin framework: asserts nativos. Ejecutar:  node tests/shop.test.mjs
import assert from 'node:assert/strict';

import pokedex from '../src/data/pokedex.json' with { type: 'json' };
import movesData from '../src/data/moves.json' with { type: 'json' };
import {
  ITEMS, itemPrice, sellPriceOf, ballBonus, isBall, buyItem, sellItem,
  BATTLE_USABLE_ITEMS, DEFAULT_SHOP_STOCK, ensureWallet, DEFAULT_MONEY,
} from '../src/core/items.js';
import { createMonster, healFull } from '../src/core/monster.js';
import { createBattle } from '../src/core/battle.js';

// ---------- mini-runner ----------
let passed = 0;
let failed = 0;
function t(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}

const fixed = (v) => () => v;
function seqRng(values, fill = 0.5) {
  let i = 0;
  return () => (i < values.length ? values[i++] : fill);
}

const SQUIRT = 7;
const CHARM = 4;
const RATTATA = 19;

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— catálogo de objetos —');

t('el catálogo trae los items FRLG pedidos con precios coherentes', () => {
  for (const id of ['poke-ball', 'super-ball', 'potion', 'superpotion', 'antidote',
    'awakening', 'parlyzheal', 'burnheal', 'iceheal', 'revive']) {
    assert.ok(ITEMS[id], `falta el objeto ${id}`);
    assert.ok(itemPrice(id) > 0, `${id} debería tener precio > 0`);
  }
  assert.equal(itemPrice('poke-ball'), 200);
  assert.equal(itemPrice('super-ball'), 600);
  assert.equal(itemPrice('superpotion'), 700);
});

t('la Super Ball captura mejor que la Poké Ball (bonus > 1)', () => {
  assert.equal(ballBonus('poke-ball'), 1);
  assert.ok(ballBonus('super-ball') > 1, 'super-ball debe tener bonus > 1');
  assert.ok(ballBonus('ultra-ball') > ballBonus('super-ball'));
  assert.ok(isBall('poke-ball') && isBall('super-ball'));
  assert.ok(!isBall('potion'));
});

t('el surtido por defecto del tendero solo trae objetos del catálogo', () => {
  assert.ok(DEFAULT_SHOP_STOCK.length >= 6);
  for (const id of DEFAULT_SHOP_STOCK) assert.ok(ITEMS[id], `surtido con id desconocido ${id}`);
});

// ─────────────────────────────────────────────────────────────────────────────
// Comprar / Vender (lógica pura)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— comprar / vender —');

t('comprar descuenta dinero y añade el objeto a la bolsa', () => {
  const wallet = { money: 3000, bag: {} };
  const res = buyItem(wallet, 'poke-ball', 3); // 3 × 200 = 600
  assert.equal(res.ok, true);
  assert.equal(res.cost, 600);
  assert.equal(res.money, 2400, 'el dinero baja 600');
  assert.equal(res.bag['poke-ball'], 3, 'entran 3 Poké Balls en la bolsa');
  // No muta el wallet original (inmutabilidad).
  assert.equal(wallet.money, 3000);
  assert.deepEqual(wallet.bag, {});
});

t('comprar acumula sobre lo que ya hay en la bolsa', () => {
  const res = buyItem({ money: 5000, bag: { potion: 2 } }, 'potion', 1);
  assert.equal(res.bag.potion, 3);
});

t('NO se puede comprar sin dinero suficiente', () => {
  const wallet = { money: 100, bag: {} };
  const res = buyItem(wallet, 'super-ball', 1); // cuesta 600
  assert.equal(res.ok, false);
  assert.equal(res.reason, 'no-money');
  assert.equal(res.money, 100, 'el dinero no cambia');
  assert.equal(res.bag['super-ball'], undefined, 'no entra nada en la bolsa');
});

t('vender da la mitad del precio y descuenta de la bolsa', () => {
  const wallet = { money: 0, bag: { potion: 2 } };
  assert.equal(sellPriceOf('potion'), 150); // mitad de 300
  const res = sellItem(wallet, 'potion', 1);
  assert.equal(res.ok, true);
  assert.equal(res.gain, 150);
  assert.equal(res.money, 150);
  assert.equal(res.bag.potion, 1);
});

t('vender todo elimina la entrada de la bolsa', () => {
  const res = sellItem({ money: 0, bag: { antidote: 1 } }, 'antidote', 1);
  assert.equal(res.bag.antidote, undefined);
});

t('no se puede vender más de lo que se lleva ni algo que no se tiene', () => {
  const r1 = sellItem({ money: 0, bag: { potion: 1 } }, 'potion', 5);
  assert.equal(r1.bag.potion, undefined, 'solo vende 1, la que había');
  const r2 = sellItem({ money: 0, bag: {} }, 'potion', 1);
  assert.equal(r2.ok, false);
  assert.equal(r2.reason, 'nothing');
});

// ─────────────────────────────────────────────────────────────────────────────
// Uso de objetos EN COMBATE (motor puro)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— uso de objetos en combate —');

function wildBattle(party, enemyParty, bag, rng) {
  return createBattle({
    pokedex, movesData, party, enemyParty, isTrainer: false, bag, rng,
  });
}

t('la Poké Ball captura al Pokémon salvaje (cuatro sacudidas)', () => {
  // RNG bajo → siempre dentro del umbral → captura.
  const mine = createMonster(pokedex, SQUIRT, 30);
  const wild = createMonster(pokedex, RATTATA, 3);
  wild.currentHp = 1; // muy débil → fácil de capturar
  const bag = { 'poke-ball': 1 };
  const battle = wildBattle([mine], [wild], bag, fixed(0));
  const { events, over } = battle.act({ type: 'item', item: 'poke-ball' });
  assert.equal(bag['poke-ball'], 0, 'gasta la bola');
  assert.ok(events.some((e) => e.t === 'ball' && e.caught), 'evento de bola con captura');
  assert.ok(over && over.result === 'caught', 'el combate acaba en captura');
});

t('la Super Ball NO se puede usar contra entrenadores', () => {
  const mine = createMonster(pokedex, SQUIRT, 30);
  const foe = createMonster(pokedex, RATTATA, 30);
  const bag = { 'super-ball': 1 };
  const battle = createBattle({
    pokedex, movesData, party: [mine], enemyParty: [foe], isTrainer: true, bag, rng: fixed(0),
  });
  const { events } = battle.act({ type: 'item', item: 'super-ball' });
  assert.ok(events.some((e) => e.t === 'text' && /chorizo/i.test(e.msg)), 'avisa de que no se puede');
  assert.equal(bag['super-ball'], 1, 'no gasta la bola');
});

t('la POCIÓN restaura 20 PS (según el evento del motor)', () => {
  // Se comprueba sobre el evento de curación (la cantidad real curada), no sobre
  // los PS finales: tras usar el objeto el rival actúa y puede volver a dañar.
  const mon = createMonster(pokedex, SQUIRT, 40);
  mon.currentHp = 1;
  const wild = createMonster(pokedex, RATTATA, 3);
  const bag = { potion: 1 };
  const battle = wildBattle([mon], [wild], bag, fixed(0.99));
  const { events } = battle.act({ type: 'item', item: 'potion', target: 0 });
  const healMsg = events.find((e) => e.t === 'text' && /recuperado/.test(e.msg));
  assert.ok(healMsg, 'hay mensaje de curación');
  assert.match(healMsg.msg, /20 PS/, 'la poción cura 20 PS');
  assert.equal(bag.potion, 0, 'se gasta la poción');
});

t('la SUPERPOCIÓN restaura 50 PS (según el evento del motor)', () => {
  const mon = createMonster(pokedex, SQUIRT, 40);
  mon.currentHp = 1; // hueco de PS amplio para que entren los 50
  const wild = createMonster(pokedex, RATTATA, 3);
  const bag = { superpotion: 1 };
  const battle = wildBattle([mon], [wild], bag, fixed(0.99));
  const { events } = battle.act({ type: 'item', item: 'superpotion', target: 0 });
  const healMsg = events.find((e) => e.t === 'text' && /recuperado/.test(e.msg));
  assert.ok(healMsg, 'hay mensaje de curación');
  assert.match(healMsg.msg, /50 PS/, 'la superpoción cura 50 PS');
  assert.equal(bag.superpotion, 0);
});

t('el ANTIPARÁLISIS cura la parálisis; el DESPERTAR el sueño', () => {
  const mon = createMonster(pokedex, SQUIRT, 40);
  mon.status = 'par';
  const wild = createMonster(pokedex, RATTATA, 3);
  const bag = { parlyzheal: 1, awakening: 1 };
  const battle = wildBattle([mon], [wild], bag, fixed(0.99));
  battle.act({ type: 'item', item: 'parlyzheal', target: 0 });
  assert.equal(mon.status, null, 'parálisis curada');
  assert.equal(bag.parlyzheal, 0);
  mon.status = 'slp';
  battle.act({ type: 'item', item: 'awakening', target: 0 });
  assert.equal(mon.status, null, 'despertado');
});

t('un objeto de estado sin el estado correspondiente no tiene efecto ni se gasta', () => {
  const mon = createMonster(pokedex, SQUIRT, 40);
  mon.status = null;
  const wild = createMonster(pokedex, RATTATA, 3);
  const bag = { antidote: 1 };
  const battle = wildBattle([mon], [wild], bag, fixed(0.99));
  const { events } = battle.act({ type: 'item', item: 'antidote', target: 0 });
  assert.ok(events.some((e) => e.t === 'text' && /efecto/i.test(e.msg)), 'avisa sin efecto');
  assert.equal(bag.antidote, 1, 'no gasta el antídoto');
});

t('REVIVIR devuelve a la vida a un Pokémon debilitado de la banca', () => {
  const active = createMonster(pokedex, SQUIRT, 40);
  const banca = createMonster(pokedex, CHARM, 30);
  const maxBanca = banca.currentHp;
  banca.currentHp = 0; // debilitado en la banca
  const wild = createMonster(pokedex, RATTATA, 3);
  const bag = { revive: 1 };
  const battle = wildBattle([active, banca], [wild], bag, fixed(0.99));
  battle.act({ type: 'item', item: 'revive', target: 1 });
  assert.ok(banca.currentHp > 0, 'la banca revive');
  assert.equal(banca.currentHp, Math.max(1, Math.floor(maxBanca / 2)), 'revive con la mitad de PS');
  assert.equal(bag.revive, 0);
});

t('todos los items del menú de mochila de combate están en el catálogo y son usables', () => {
  for (const id of BATTLE_USABLE_ITEMS) {
    assert.ok(ITEMS[id], `${id} no está en el catálogo`);
    assert.equal(ITEMS[id].usableInBattle, true);
  }
  // Repelente/muñeco/carta no son utilizables en combate.
  assert.ok(!BATTLE_USABLE_ITEMS.includes('repel'));
  assert.ok(!BATTLE_USABLE_ITEMS.includes('card'));
});

// ─────────────────────────────────────────────────────────────────────────────
// Round-trip de save con dinero + bolsa (sin red: solo serialización)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n— round-trip de guardado (dinero + bolsa) —');

t('el estado con dinero y bolsa sobrevive a JSON round-trip', () => {
  // Simula comprar y luego serializar/deserializar como hace saves.js.
  const wallet = { money: 3000, bag: { 'poke-ball': 5, potion: 3 } };
  const bought = buyItem(wallet, 'super-ball', 2); // 2×600 = 1200
  const state = {
    version: 1,
    player: { name: 'ROJO', money: bought.money },
    bag: bought.bag,
    party: [],
  };
  const round = JSON.parse(JSON.stringify(state));
  assert.equal(round.player.money, 1800, 'dinero correcto tras compra');
  assert.equal(round.bag['super-ball'], 2);
  assert.equal(round.bag['poke-ball'], 5);
  assert.equal(round.bag.potion, 3);
});

t('ensureWallet rellena money/bag en saves viejos sin subir versión', () => {
  const oldState = { version: 1, player: { name: 'ROJO', map: 'tetuan' }, party: [] };
  ensureWallet(oldState);
  assert.equal(oldState.player.money, DEFAULT_MONEY, 'pone dinero por defecto');
  assert.deepEqual(oldState.bag, {}, 'crea una bolsa vacía');
  assert.equal(oldState.version, 1, 'NO sube la versión del save');
  // Comprar funciona sobre el estado ya normalizado.
  const res = buyItem({ money: oldState.player.money, bag: oldState.bag }, 'potion', 1);
  assert.equal(res.ok, true);
  assert.equal(res.money, 2700);
  assert.equal(res.bag.potion, 1);
});

t('ensureWallet RESPETA el dinero y la bolsa ya existentes (no pisa saves buenos)', () => {
  const good = { version: 1, player: { money: 1234 }, bag: { potion: 5 } };
  ensureWallet(good);
  assert.equal(good.player.money, 1234, 'no toca el dinero existente');
  assert.equal(good.bag.potion, 5, 'no toca la bolsa existente');
});

// ---------- resumen ----------
console.log(`\n${passed} pasados, ${failed} fallidos`);
if (failed > 0) process.exit(1);
