// Tests del Módulo A (núcleo de combate). Sin framework: asserts nativos.
// Ejecutar:  node tests/core.test.mjs
import assert from 'node:assert/strict';

import pokedex from '../src/data/pokedex.json' with { type: 'json' };
import movesData from '../src/data/moves.json' with { type: 'json' };
import { effectiveness } from '../src/core/typechart.js';
import {
  calcStats, expForLevel, expGain, damage, captureChance,
} from '../src/core/formulas.js';
import {
  createMonster, gainExp, evolve, canEvolve, healFull,
} from '../src/core/monster.js';
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

// ---------- RNGs deterministas ----------
const fixed = (v) => () => v;
function seqRng(values, fill = 0.5) {
  let i = 0;
  return () => (i < values.length ? values[i++] : fill);
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let x = a;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}

// Conduce un combate hasta el final usando el primer movimiento con daño.
function playUntilOver(battle, maxTurns = 100) {
  const events = [];
  for (let i = 0; i < maxTurns; i++) {
    const st = battle.state();
    if (st.over) return { events, over: st.over };
    let res;
    if (st.phase === 'switch') {
      res = battle.act({ type: 'switch', index: st.party.findIndex((m) => m.currentHp > 0) });
    } else {
      const idx = Math.max(0, st.active.moves.findIndex((m) => m.data && m.data.power));
      res = battle.act({ type: 'move', index: idx });
    }
    events.push(...res.events);
    if (res.over) return { events, over: res.over };
  }
  throw new Error('el combate no terminó en el límite de turnos');
}

const BULBA = 1;
const CHARM = 4;
const SQUIRT = 7;
const RATTATA = 19;

console.log('\n— Tabla de tipos (Gen 3) —');
t('agua vs fuego = 2', () => assert.equal(effectiveness('water', ['fire']), 2));
t('agua vs planta = 0.5', () => assert.equal(effectiveness('water', ['grass']), 0.5));
t('eléctrico vs tierra = 0', () => assert.equal(effectiveness('electric', ['ground']), 0));
t('eléctrico vs agua/volador = 4', () => assert.equal(effectiveness('electric', ['water', 'flying']), 4));
t('fuego vs planta/veneno = 2', () => assert.equal(effectiveness('fire', ['grass', 'poison']), 2));
t('planta vs fuego/volador = 0.25', () => assert.equal(effectiveness('grass', ['fire', 'flying']), 0.25));
t('normal vs fantasma = 0', () => assert.equal(effectiveness('normal', ['ghost']), 0));
t('lucha vs fantasma = 0', () => assert.equal(effectiveness('fighting', ['ghost']), 0));
t('fantasma vs acero = 0.5 (Gen 3)', () => assert.equal(effectiveness('ghost', ['steel']), 0.5));
t('siniestro vs acero = 0.5 (Gen 3)', () => assert.equal(effectiveness('dark', ['steel']), 0.5));
t('veneno vs acero = 0', () => assert.equal(effectiveness('poison', ['steel']), 0));
t('hielo vs dragón/volador = 4', () => assert.equal(effectiveness('ice', ['dragon', 'flying']), 4));
t('tierra vs volador = 0', () => assert.equal(effectiveness('ground', ['flying']), 0));
t('psíquico vs siniestro = 0', () => assert.equal(effectiveness('psychic', ['dark']), 0));
t('bicho vs psíquico = 2', () => assert.equal(effectiveness('bug', ['psychic']), 2));
t('mismo tipo neutro: normal vs normal = 1', () => assert.equal(effectiveness('normal', ['normal']), 1));

console.log('\n— calcStats (Gen 3, EV=0, sin naturaleza) —');
t('Bulbasaur nv5 IV0: hp 19, atk 9', () => {
  const inst = createMonster(pokedex, BULBA, 5, fixed(0));
  const stats = calcStats(pokedex[BULBA - 1], inst);
  assert.equal(stats.hp, 19);
  assert.equal(stats.atk, 9);
  assert.equal(stats.spe, 9);
});
t('Bulbasaur nv100 IV31: hp 231', () => {
  const inst = createMonster(pokedex, BULBA, 100, fixed(0.999));
  assert.equal(calcStats(pokedex[BULBA - 1], inst).hp, 231);
});

console.log('\n— expForLevel (6 curvas oficiales) —');
t('nivel 1 = 0 en todas las curvas', () => {
  for (const r of ['fast', 'medium', 'medium-slow', 'slow', 'erratic', 'fluctuating']) {
    assert.equal(expForLevel(r, 1), 0, r);
  }
});
t('fast nv10 = 800', () => assert.equal(expForLevel('fast', 10), 800));
t('medium nv10 = 1000', () => assert.equal(expForLevel('medium', 10), 1000));
t('medium-slow nv5 = 135', () => assert.equal(expForLevel('medium-slow', 5), 135));
t('medium-slow nv10 = 560', () => assert.equal(expForLevel('medium-slow', 10), 560));
t('medium-slow nv100 = 1059860', () => assert.equal(expForLevel('medium-slow', 100), 1059860));
t('slow nv100 = 1250000', () => assert.equal(expForLevel('slow', 100), 1250000));
t('erratic nv10 = 1800', () => assert.equal(expForLevel('erratic', 10), 1800));
t('erratic nv60 = 194400', () => assert.equal(expForLevel('erratic', 60), 194400));
t('erratic nv100 = 600000', () => assert.equal(expForLevel('erratic', 100), 600000));
t('fluctuating nv10 = 540', () => assert.equal(expForLevel('fluctuating', 10), 540));
t('fluctuating nv100 = 1640000', () => assert.equal(expForLevel('fluctuating', 100), 1640000));

console.log('\n— expGain —');
t('Rattata nv3: floor(51·3/7) = 21', () => {
  assert.equal(expGain(pokedex[RATTATA - 1], 3), 21);
});
t('de entrenador ×1.5: 31', () => {
  assert.equal(expGain(pokedex[RATTATA - 1], 3, 1, true), 31);
});
t('2 participantes: 10', () => {
  assert.equal(expGain(pokedex[RATTATA - 1], 3, 2), 10);
});

console.log('\n— damage (determinista con rng inyectado) —');
const atkChar = createMonster(pokedex, CHARM, 5, fixed(0)); // IVs 0
const defBulb = createMonster(pokedex, BULBA, 5, fixed(0));
const base = {
  attacker: atkChar, defender: defBulb,
  attackerSpecies: pokedex[CHARM - 1], defenderSpecies: pokedex[BULBA - 1],
};
t('Arañazo nv5: tirada mínima (85%) = 4', () => {
  const r = damage({ ...base, move: movesData.scratch, rng: fixed(0) });
  assert.deepEqual(r, { dmg: 4, effectiveness: 1, crit: false });
});
t('Arañazo nv5: tirada máxima (100%) = 5', () => {
  const r = damage({ ...base, move: movesData.scratch, rng: fixed(0.999) });
  assert.equal(r.dmg, 5);
});
t('Ascuas: STAB ×1.5 y eficacia ×2 = 11', () => {
  const r = damage({ ...base, move: movesData.ember, rng: fixed(0) });
  assert.equal(r.dmg, 11);
  assert.equal(r.effectiveness, 2);
});
t('crítico ×2: Arañazo = 8', () => {
  const r = damage({ ...base, move: movesData.scratch, crit: true, rng: fixed(0) });
  assert.equal(r.dmg, 8);
  assert.equal(r.crit, true);
});
t('quemadura reduce ataque físico ×0.5: Arañazo = 2', () => {
  const burned = { ...atkChar, status: 'brn' };
  const r = damage({ ...base, attacker: burned, move: movesData.scratch, rng: fixed(0) });
  assert.equal(r.dmg, 2);
});
t('inmunidad → dmg 0, eff 0', () => {
  const sandshrew = createMonster(pokedex, 27, 5, fixed(0)); // tierra
  const r = damage({
    ...base, defender: sandshrew, defenderSpecies: pokedex[26],
    move: movesData['thunder-shock'], rng: fixed(0),
  });
  assert.deepEqual(r, { dmg: 0, effectiveness: 0, crit: false });
});
t('movimiento de estado (power null) → dmg 0', () => {
  const r = damage({ ...base, move: movesData['tail-whip'], rng: fixed(0) });
  assert.equal(r.dmg, 0);
});

console.log('\n— captureChance (límites Gen 3) —');
const wildRat = createMonster(pokedex, RATTATA, 5, fixed(0)); // maxHp 18, ratio 255
t('rng 0 → capturado con 4 sacudidas', () => {
  const r = captureChance(pokedex[RATTATA - 1], wildRat, 1, 1, fixed(0));
  assert.deepEqual(r, { caught: true, shakes: 4 });
});
t('rng 0.99 a tope de vida → falla a la primera (0 sacudidas)', () => {
  const r = captureChance(pokedex[RATTATA - 1], wildRat, 1, 1, fixed(0.99));
  assert.deepEqual(r, { caught: false, shakes: 0 });
});
t('secuencia → escapa tras 2 sacudidas', () => {
  const r = captureChance(pokedex[RATTATA - 1], wildRat, 1, 1, seqRng([0, 0, 0.99]));
  assert.deepEqual(r, { caught: false, shakes: 2 });
});
t('a ≥ 255 → captura garantizada (hp 1 + dormido ×2) incluso con rng 0.999', () => {
  const lowHp = { ...wildRat, currentHp: 1, status: 'slp' };
  const r = captureChance(pokedex[RATTATA - 1], lowHp, 1, 2, fixed(0.999));
  assert.deepEqual(r, { caught: true, shakes: 4 });
});

console.log('\n— createMonster / gainExp / evolve / healFull —');
t('createMonster: estructura, últimos 4 movimientos y PS al máximo', () => {
  const m = createMonster(pokedex, BULBA, 5, fixed(0));
  assert.equal(m.species, BULBA);
  assert.equal(m.level, 5);
  assert.equal(m.exp, 135); // medium-slow nv5
  assert.deepEqual(m.moves.map((x) => x.id), ['tackle', 'growl']);
  assert.equal(m.moves[0].pp, movesData.tackle.pp);
  assert.equal(m.currentHp, 19);
  assert.equal(m.status, null);
  assert.equal(m.shiny, true); // rng fijo 0 < 1/8192 → shiny determinista
  assert.equal(createMonster(pokedex, BULBA, 5, fixed(0.5)).shiny, false);
});
t('gainExp: niveles encadenados 5→7 y aprende Drenadoras', () => {
  const m = createMonster(pokedex, BULBA, 5, fixed(0));
  const events = gainExp(m, 101); // 135+101 = 236 = exp exacta de nv7
  assert.equal(m.level, 7);
  assert.equal(m.exp, 236);
  const ups = events.filter((e) => e.t === 'levelup');
  assert.deepEqual(ups.map((e) => e.level), [6, 7]);
  assert.ok(ups[1].newStats.hp > 0);
  const learns = events.filter((e) => e.t === 'learn');
  assert.equal(learns.length, 1);
  assert.equal(learns[0].moveName, movesData['leech-seed'].name);
  assert.ok(m.moves.some((x) => x.id === 'leech-seed'));
});
t('aprender con 4 movimientos reemplaza el más antiguo', () => {
  const m = createMonster(pokedex, BULBA, 14, fixed(0));
  assert.deepEqual(m.moves.map((x) => x.id), ['tackle', 'growl', 'leech-seed', 'vine-whip']);
  const events = gainExp(m, expForLevel('medium-slow', 15) - m.exp);
  assert.equal(m.level, 15);
  // nv15: polvo veneno y somnífero reemplazan a placaje y gruñido
  assert.deepEqual(m.moves.map((x) => x.id), ['leech-seed', 'vine-whip', 'poison-powder', 'sleep-powder']);
  const learns = events.filter((e) => e.t === 'learn');
  assert.equal(learns.length, 2);
  assert.equal(learns[0].forgotten, movesData.tackle.name);
});
t('canEvolve + evolve: Bulbasaur nv16 → Ivysaur', () => {
  const m = createMonster(pokedex, BULBA, 15, fixed(0));
  assert.equal(canEvolve(m), false);
  gainExp(m, expForLevel('medium-slow', 16) - m.exp);
  assert.equal(m.level, 16);
  assert.equal(canEvolve(m), true);
  const r = evolve(m);
  assert.equal(r.fromName, 'Bulbasaur');
  assert.equal(r.toName, 'Ivysaur');
  assert.equal(m.species, 2);
  assert.equal(m.currentHp, calcStats(pokedex[1], m).hp); // PS suben con el delta
});
t('healFull restaura PS, estado y PP', () => {
  const m = createMonster(pokedex, SQUIRT, 10, fixed(0));
  m.currentHp = 1;
  m.status = 'psn';
  m.moves[0].pp = 0;
  healFull(m);
  assert.equal(m.currentHp, calcStats(pokedex[SQUIRT - 1], m).hp);
  assert.equal(m.status, null);
  assert.equal(m.moves[0].pp, m.moves[0].maxPp);
});

console.log('\n— battle: combate salvaje completo paso a paso —');
t('victoria contra Rattata salvaje con eventos coherentes', () => {
  const rng = mulberry32(42);
  const party = [createMonster(pokedex, SQUIRT, 12, rng)];
  const wild = createMonster(pokedex, RATTATA, 3, rng);
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], isTrainer: false, bag: {}, rng });

  const st0 = battle.state();
  assert.equal(st0.phase, 'choice');
  assert.equal(st0.canRun, true);
  assert.equal(st0.enemy.name, 'RATTATA');
  assert.ok(st0.active.maxHp > 0);

  let prevTurn = 0;
  let all = [];
  for (let i = 0; i < 30; i++) {
    const st = battle.state();
    if (st.over) break;
    const idx = st.active.moves.findIndex((m) => m.data && m.data.power);
    const res = battle.act({ type: 'move', index: idx });
    all = all.concat(res.events);
    const now = battle.state();
    assert.ok(now.turn > prevTurn, 'el turno avanza');
    prevTurn = now.turn;
  }
  const over = battle.state().over;
  assert.equal(over.result, 'win');
  assert.deepEqual(over.expReports, [{ index: 0, amount: expGain(pokedex[RATTATA - 1], 3) }]);
  assert.ok(all.some((e) => e.t === 'move' && e.side === 'player'));
  assert.ok(all.some((e) => e.t === 'hp' && e.side === 'enemy' && e.to < e.from));
  assert.ok(all.some((e) => e.t === 'faint' && e.side === 'enemy'));
  assert.ok(all.some((e) => e.t === 'exp'));
  assert.ok(all.some((e) => e.t === 'end' && e.result === 'win'));
  assert.equal(wild.currentHp, 0);
  assert.ok(party[0].exp > expForLevel('medium-slow', 12));
});

console.log('\n— battle: huir, objetos, captura —');
t('huir siempre funciona si el salvaje es más lento', () => {
  const party = [createMonster(pokedex, SQUIRT, 20, fixed(0.4))];
  const wild = createMonster(pokedex, RATTATA, 2, fixed(0.4));
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], rng: fixed(0.99) });
  const res = battle.act({ type: 'run' });
  assert.equal(res.over.result, 'ran');
  assert.ok(res.events.some((e) => e.t === 'end' && e.result === 'ran'));
});
t('no se puede huir contra entrenador', () => {
  const party = [createMonster(pokedex, SQUIRT, 10, fixed(0))];
  const enemy = [createMonster(pokedex, RATTATA, 4, fixed(0))];
  const battle = createBattle({ pokedex, movesData, party, enemyParty: enemy, isTrainer: true, rng: fixed(0.5) });
  assert.equal(battle.state().canRun, false);
  const res = battle.act({ type: 'run' });
  assert.equal(res.invalid, true);
  assert.equal(res.over, false);
  assert.match(res.events[0].msg, /No puedes huir/);
});
t('poke-ball bloqueada contra entrenador (sin gastar)', () => {
  const party = [createMonster(pokedex, SQUIRT, 10, fixed(0))];
  const enemy = [createMonster(pokedex, RATTATA, 4, fixed(0))];
  const bag = { 'poke-ball': 1 };
  const battle = createBattle({ pokedex, movesData, party, enemyParty: enemy, isTrainer: true, bag, rng: fixed(0.5) });
  const res = battle.act({ type: 'item', item: 'poke-ball' });
  assert.equal(res.invalid, true);
  assert.equal(bag['poke-ball'], 1);
});
t('captura: rng 0 → 4 sacudidas, caught, ball gastada', () => {
  const party = [createMonster(pokedex, SQUIRT, 10, fixed(0))];
  const wild = createMonster(pokedex, RATTATA, 3, fixed(0));
  const bag = { 'poke-ball': 2 };
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], bag, rng: fixed(0) });
  const res = battle.act({ type: 'item', item: 'poke-ball' });
  const ball = res.events.find((e) => e.t === 'ball');
  assert.deepEqual(ball, { t: 'ball', shakes: 4, caught: true });
  assert.equal(res.over.result, 'caught');
  assert.equal(res.over.caughtMonster, wild);
  assert.equal(bag['poke-ball'], 1);
});
t('poción cura +20 y el enemigo ataca después', () => {
  const party = [createMonster(pokedex, SQUIRT, 15, fixed(0))];
  party[0].currentHp -= 25;
  const wild = createMonster(pokedex, RATTATA, 3, fixed(0));
  const bag = { potion: 1 };
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], bag, rng: mulberry32(7) });
  const res = battle.act({ type: 'item', item: 'potion' });
  const heal = res.events.find((e) => e.t === 'hp' && e.side === 'player' && e.to > e.from);
  assert.ok(heal, 'hay evento de curación');
  assert.equal(heal.to - heal.from, 20);
  assert.equal(bag.potion, 0);
  assert.ok(res.events.some((e) => e.t === 'move' && e.side === 'enemy'), 'el enemigo ataca tras el objeto');
});
t('antídoto cura el veneno', () => {
  const party = [createMonster(pokedex, SQUIRT, 15, fixed(0))];
  party[0].status = 'psn';
  const wild = createMonster(pokedex, RATTATA, 3, fixed(0));
  const bag = { antidote: 1 };
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], bag, rng: mulberry32(7) });
  const res = battle.act({ type: 'item', item: 'antidote' });
  assert.equal(party[0].status, null);
  assert.ok(res.events.some((e) => e.t === 'status' && e.side === 'player' && e.status === null));
});

console.log('\n— battle: estados, stats, prioridad, forcejeo —');
t('somnífero duerme al enemigo (evento status slp)', () => {
  const party = [createMonster(pokedex, BULBA, 15, fixed(0))];
  const wild = createMonster(pokedex, RATTATA, 3, fixed(0));
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], rng: fixed(0) });
  const idx = party[0].moves.findIndex((m) => m.id === 'sleep-powder');
  const res = battle.act({ type: 'move', index: idx });
  assert.ok(res.events.some((e) => e.t === 'status' && e.side === 'enemy' && e.status === 'slp'));
});
t('polvo veneno + daño residual 1/8 al final del turno', () => {
  const party = [createMonster(pokedex, BULBA, 15, fixed(0))];
  const wild = createMonster(pokedex, RATTATA, 3, fixed(0));
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], rng: fixed(0) });
  const idx = party[0].moves.findIndex((m) => m.id === 'poison-powder');
  const res = battle.act({ type: 'move', index: idx });
  const statusIdx = res.events.findIndex((e) => e.t === 'status' && e.side === 'enemy' && e.status === 'psn');
  assert.ok(statusIdx >= 0, 'el enemigo queda envenenado');
  const enemyMax = battle.state().enemy.maxHp;
  const residual = res.events.slice(statusIdx).find((e) => e.t === 'hp' && e.side === 'enemy' && e.to < e.from);
  assert.equal(residual.from - residual.to, Math.max(1, Math.floor(enemyMax / 8)));
});
t('látigo baja Defensa enemiga y respeta el tope -6', () => {
  const party = [createMonster(pokedex, SQUIRT, 30, fixed(0))];
  party[0].moves = [{ id: 'tail-whip', pp: 30, maxPp: 30 }];
  const wild = createMonster(pokedex, RATTATA, 2, fixed(0));
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], rng: mulberry32(3) });
  let drops = 0;
  let cappedMsg = false;
  for (let i = 0; i < 8 && !battle.state().over; i++) {
    const res = battle.act({ type: 'move', index: 0 });
    drops += res.events.filter((e) => e.t === 'stat' && e.side === 'enemy' && e.stat === 'def' && e.change === -1).length;
    cappedMsg = cappedMsg || res.events.some((e) => e.t === 'text' && /no puede bajar más/.test(e.msg));
  }
  assert.equal(drops, 6);
  assert.ok(cappedMsg, 'avisa al llegar al tope');
});
t('prioridad: Ataque Rápido actúa primero aunque sea más lento', () => {
  const party = [createMonster(pokedex, BULBA, 15, fixed(0))]; // spe 18
  const wild = createMonster(pokedex, RATTATA, 3, fixed(0)); // spe 9
  wild.moves = [{ id: 'quick-attack', pp: 30, maxPp: 30 }];
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], rng: fixed(0.5) });
  const idx = party[0].moves.findIndex((m) => m.id === 'vine-whip');
  const res = battle.act({ type: 'move', index: idx });
  const firstMove = res.events.find((e) => e.t === 'move');
  assert.equal(firstMove.side, 'enemy');
  assert.equal(firstMove.moveName, movesData['quick-attack'].name);
});
t('sin PP en nada → Forcejeo con retroceso', () => {
  const party = [createMonster(pokedex, SQUIRT, 20, fixed(0))];
  for (const m of party[0].moves) m.pp = 0;
  const wild = createMonster(pokedex, RATTATA, 3, fixed(0));
  const battle = createBattle({ pokedex, movesData, party, enemyParty: [wild], rng: mulberry32(11) });
  const res = battle.act({ type: 'move', index: 0 });
  assert.ok(res.events.some((e) => e.t === 'move' && e.side === 'player' && e.moveName === 'Forcejeo'));
  assert.ok(res.events.some((e) => e.t === 'text' && /retroceso/.test(e.msg)));
});

console.log('\n— battle: cambio forzado, entrenador multi-pokémon, evolución —');
t('al debilitarse el activo: phase switch, cambio sin ataque gratis, y victoria', () => {
  const rng = mulberry32(99);
  const weak = createMonster(pokedex, CHARM, 3, rng);
  weak.currentHp = 1;
  const strong = createMonster(pokedex, SQUIRT, 14, rng);
  const wild = createMonster(pokedex, RATTATA, 10, rng);
  const battle = createBattle({ pokedex, movesData, party: [weak, strong], enemyParty: [wild], rng });

  let sawSwitchPhase = false;
  const { events, over } = (() => {
    const all = [];
    for (let i = 0; i < 100; i++) {
      const st = battle.state();
      if (st.over) return { events: all, over: st.over };
      let res;
      if (st.phase === 'switch') {
        sawSwitchPhase = true;
        const hpBefore = strong.currentHp;
        res = battle.act({ type: 'switch', index: 1 });
        assert.equal(strong.currentHp, hpBefore, 'sin ataque gratis tras cambio forzado');
        assert.equal(battle.state().phase, 'choice');
      } else {
        const idx = Math.max(0, st.active.moves.findIndex((m) => m.data && m.data.power));
        res = battle.act({ type: 'move', index: idx });
      }
      all.push(...res.events);
      if (res.over) return { events: all, over: res.over };
    }
    throw new Error('no terminó');
  })();

  assert.ok(sawSwitchPhase, 'hubo fase de cambio forzado');
  assert.ok(events.some((e) => e.t === 'faint' && e.side === 'player'));
  assert.ok(events.some((e) => e.t === 'switch' && e.side === 'player' && e.monster === strong));
  assert.equal(over.result, 'win');
});
t('entrenador con 2 pokémon: cambio enemigo, exp doble, victoria', () => {
  const rng = mulberry32(5);
  const party = [createMonster(pokedex, SQUIRT, 20, rng)];
  const enemy = [createMonster(pokedex, RATTATA, 2, rng), createMonster(pokedex, RATTATA, 2, rng)];
  const battle = createBattle({ pokedex, movesData, party, enemyParty: enemy, isTrainer: true, rng });
  const { events, over } = playUntilOver(battle);
  assert.equal(over.result, 'win');
  assert.equal(events.filter((e) => e.t === 'faint' && e.side === 'enemy').length, 2);
  assert.ok(events.some((e) => e.t === 'switch' && e.side === 'enemy'));
  assert.equal(over.expReports.length, 2);
  assert.equal(over.expReports[0].amount, expGain(pokedex[RATTATA - 1], 2, 1, true));
});
t('el relevo enemigo no actúa el turno en que entra', () => {
  const rng = mulberry32(17);
  const party = [createMonster(pokedex, SQUIRT, 50, rng)]; // garantiza el KO de un golpe
  const enemy = [createMonster(pokedex, RATTATA, 2, rng), createMonster(pokedex, RATTATA, 2, rng)];
  const battle = createBattle({ pokedex, movesData, party, enemyParty: enemy, isTrainer: true, rng });
  const idx = battle.state().active.moves.findIndex((m) => m.data && m.data.power);
  const res = battle.act({ type: 'move', index: idx });
  const switchIdx = res.events.findIndex((e) => e.t === 'switch' && e.side === 'enemy');
  assert.ok(switchIdx >= 0, 'el primer rattata cae y entra el relevo');
  const enemyMovesAfter = res.events.slice(switchIdx).filter((e) => e.t === 'move' && e.side === 'enemy');
  assert.equal(enemyMovesAfter.length, 0, 'el relevo no ataca en el mismo turno');
});
t('subir a nv16 en combate → el motor NO evoluciona (lo hace BattleScene) pero queda listo', () => {
  const rng = mulberry32(21);
  const bulba = createMonster(pokedex, BULBA, 15, rng);
  bulba.exp = expForLevel('medium-slow', 16) - 5; // a 5 exp del nivel 16
  const wild = createMonster(pokedex, RATTATA, 3, rng);
  const battle = createBattle({ pokedex, movesData, party: [bulba], enemyParty: [wild], rng });
  const { events, over } = playUntilOver(battle);
  assert.equal(over.result, 'win');
  assert.ok(events.some((e) => e.t === 'levelup' && e.level === 16));
  // La evolución es del módulo C (BattleScene): el motor no emite 'evolve' ni muta la especie.
  assert.ok(!events.some((e) => e.t === 'evolve'), 'el motor no emite evolve');
  assert.equal(bulba.species, 1, 'el motor no evoluciona la especie');
  assert.equal(bulba.level, 16);
  assert.ok(canEvolve(bulba), 'queda listo para que BattleScene evolucione');
});
t('derrota: sin pokémon sanos → lose', () => {
  const weak = createMonster(pokedex, CHARM, 2, fixed(0));
  weak.currentHp = 1;
  const wild = createMonster(pokedex, RATTATA, 12, fixed(0.4));
  const battle = createBattle({ pokedex, movesData, party: [weak], enemyParty: [wild], rng: mulberry32(13) });
  const { over } = playUntilOver(battle);
  assert.equal(over.result, 'lose');
});

// ---------- mecánicas especiales de movimientos (auditoría PokeAPI) ----------

// Fija un único movimiento (con PP de sobra) en un monstruo para tests deterministas.
function withMove(mon, slug, pp = 10) {
  mon.moves = [{ id: slug, pp, maxPp: pp }];
  return mon;
}

console.log('\n— movimientos especiales: self-faint, daño fijo, KO, estado —');
t('Autodestrucción: hace daño Y el usuario se debilita siempre', () => {
  // Jugador muy rápido y fuerte (CHARM nv60) actúa primero; el rival es un BLASTOISE
  // (id 9) nv50 con MUCHOS PS, así que sobrevive al golpe y el combate no termina:
  // aislamos el auto-debilitamiento del usuario. rng fijo bajo (sin crítico enemigo
  // porque el enemigo ni llega a atacar: el usuario se autodestruye antes).
  const rng = fixed(0.5);
  const boom = withMove(createMonster(pokedex, CHARM, 60, rng), 'self-destruct');
  const tgt = createMonster(pokedex, 9, 50, rng); // BLASTOISE, muchos PS
  const reserve = createMonster(pokedex, SQUIRT, 30, rng);
  const battle = createBattle({ pokedex, movesData, party: [boom, reserve], enemyParty: [tgt], rng });
  const res = battle.act({ type: 'move', index: 0 });
  assert.ok(res.events.some((e) => e.t === 'hp' && e.side === 'enemy' && e.to < e.from), 'el enemigo recibió daño');
  assert.ok(res.events.some((e) => e.t === 'faint' && e.side === 'player'), 'el usuario se debilitó');
  assert.equal(boom.currentHp, 0, 'el usuario queda a 0 PS');
  assert.ok(tgt.currentHp > 0, 'el rival sobrevivió (combate no termina)');
  assert.equal(battle.state().phase, 'switch', 'fase de cambio forzado tras autodestruirse');
});
t('Explosión funciona igual que Autodestrucción (mechanic self-faint)', () => {
  assert.equal(movesData['explosion'].mechanic, 'self-faint');
  assert.equal(movesData['self-destruct'].mechanic, 'self-faint');
});
t('Daño fijo: Bomba Sónica resta exactamente 20 PS', () => {
  const rng = mulberry32(7);
  const atkr = withMove(createMonster(pokedex, SQUIRT, 40, rng), 'sonic-boom');
  const tgt = createMonster(pokedex, RATTATA, 40, rng);
  const hpBefore = tgt.currentHp;
  const battle = createBattle({ pokedex, movesData, party: [atkr], enemyParty: [tgt], rng });
  battle.act({ type: 'move', index: 0 });
  assert.equal(tgt.currentHp, hpBefore - 20, 'restó 20 PS exactos');
});
t('Seísmo/Tinieblas (level-damage): night-shade resta = nivel del usuario', () => {
  // night-shade es FANTASMA (inmune contra tipo Normal en Gen 3). Usamos un objetivo
  // de tipo Agua (SQUIRT) que NO es inmune. Jugador rápido (nv60) para atacar primero.
  const rng = fixed(0.5);
  const atkr = withMove(createMonster(pokedex, CHARM, 60, rng), 'night-shade');
  const tgt = createMonster(pokedex, 9, 50, rng); // BLASTOISE (agua, no inmune a fantasma)
  const hpBefore = tgt.currentHp;
  const battle = createBattle({ pokedex, movesData, party: [atkr], enemyParty: [tgt], rng });
  battle.act({ type: 'move', index: 0 });
  assert.equal(tgt.currentHp, hpBefore - 60, 'restó PS = nivel del usuario (60)');
});
t('Super Fang (half-hp) reduce los PS del objetivo a la mitad', () => {
  // Jugador rápido (nv60) actúa primero; objetivo con muchos PS sobrevive.
  const rng = fixed(0.5);
  const atkr = withMove(createMonster(pokedex, RATTATA, 60, rng), 'super-fang');
  const tgt = createMonster(pokedex, 9, 50, rng); // BLASTOISE
  const hpBefore = tgt.currentHp;
  const battle = createBattle({ pokedex, movesData, party: [atkr], enemyParty: [tgt], rng });
  battle.act({ type: 'move', index: 0 });
  assert.equal(tgt.currentHp, hpBefore - Math.floor(hpBefore / 2), 'restó la mitad de los PS');
});
t('KO fulminante (Fisura) falla si el rival es de mayor nivel', () => {
  const rng = fixed(0); // rng=0 garantizaría acierto si el nivel lo permitiera
  const atkr = withMove(createMonster(pokedex, RATTATA, 10, rng), 'fissure');
  const tgt = createMonster(pokedex, SQUIRT, 50, rng);
  const battle = createBattle({ pokedex, movesData, party: [atkr], enemyParty: [tgt], rng });
  const res = battle.act({ type: 'move', index: 0 });
  assert.ok(res.events.some((e) => e.t === 'miss'), 'falla contra mayor nivel');
  assert.ok(tgt.currentHp > 0, 'el rival no se debilita');
});
t('KO fulminante (Guillotina) debilita de un golpe si acierta (jugador más rápido)', () => {
  // Jugador nv60 (más rápido) usa Guillotina con rng=0 (acierta) contra rival nv30.
  const rng = fixed(0);
  const atkr = withMove(createMonster(pokedex, CHARM, 60, rng), 'guillotine');
  const tgt = createMonster(pokedex, RATTATA, 30, rng);
  const reserve = createMonster(pokedex, SQUIRT, 30, rng);
  const battle = createBattle({ pokedex, movesData, party: [atkr], enemyParty: [tgt, reserve], rng, isTrainer: true });
  const res = battle.act({ type: 'move', index: 0 });
  assert.ok(res.events.some((e) => e.t === 'faint' && e.side === 'enemy'), 'el rival cae de un golpe');
  assert.equal(tgt.currentHp, 0, 'el rival queda KO');
});
t('Descanso (rest) cura del todo y duerme al usuario', () => {
  // Comprobamos el efecto inmediato del motor antes de cualquier contraataque:
  // inspeccionamos los eventos de la acción, no el estado tras el turno completo.
  const rng = fixed(0.5);
  const atkr = withMove(createMonster(pokedex, SQUIRT, 60, rng), 'rest'); // rápido: actúa 1.º
  const max = calcStats(pokedex[SQUIRT - 1], atkr).hp;
  atkr.currentHp = 1;
  const tgt = createMonster(pokedex, RATTATA, 5, rng);
  const battle = createBattle({ pokedex, movesData, party: [atkr], enemyParty: [tgt], rng });
  const res = battle.act({ type: 'move', index: 0 });
  // El evento de estado slp y la subida de PS al máximo ocurren al usar Descanso.
  assert.ok(res.events.some((e) => e.t === 'status' && e.status === 'slp'), 'emite sueño');
  const hpEv = res.events.find((e) => e.t === 'hp' && e.side === 'player' && e.to === max);
  assert.ok(hpEv, 'recupera hasta el máximo de PS');
  assert.equal(atkr.status, 'slp', 'queda dormido');
});
t('Salpicadura (splash) no falla silenciosamente: mensaje coherente', () => {
  const rng = mulberry32(5);
  const atkr = withMove(createMonster(pokedex, SQUIRT, 30, rng), 'splash');
  const tgt = createMonster(pokedex, RATTATA, 5, rng);
  const battle = createBattle({ pokedex, movesData, party: [atkr], enemyParty: [tgt], rng });
  const res = battle.act({ type: 'move', index: 0 });
  assert.ok(res.events.some((e) => e.t === 'text' && /no pasó nada/.test(e.msg)), 'mensaje canónico de Salpicadura');
});

console.log('\n— SHIFT (FRLG): ofrecer cambio al debilitar a un rival de entrenador —');
t('SHIFT: al caer el 1.º del rival se ofrece cambiar (fase enemy-shift)', () => {
  const rng = mulberry32(17);
  const ace = createMonster(pokedex, SQUIRT, 50, rng); // KO de un golpe
  const reserve = createMonster(pokedex, CHARM, 30, rng);
  const enemy = [createMonster(pokedex, RATTATA, 2, rng), createMonster(pokedex, BULBA, 25, rng)];
  const battle = createBattle({ pokedex, movesData, party: [ace, reserve], enemyParty: enemy, isTrainer: true, rng, shiftPrompt: true });
  const idx = battle.state().active.moves.findIndex((m) => m.data && m.data.power);
  const res = battle.act({ type: 'move', index: idx });
  assert.ok(res.events.some((e) => e.t === 'faint' && e.side === 'enemy'), 'el rival cae');
  assert.ok(res.events.some((e) => e.t === 'shift-offer'), 'se emite la oferta de cambio');
  const st = battle.state();
  assert.equal(st.phase, 'enemy-shift', 'fase enemy-shift');
  assert.equal(st.pendingEnemy, enemy[1], 'se ve a quién sacará el rival');
});
t('SHIFT: el jugador dice NO → el rival saca al siguiente y sigue el combate', () => {
  const rng = mulberry32(17);
  const ace = createMonster(pokedex, SQUIRT, 50, rng);
  const reserve = createMonster(pokedex, CHARM, 30, rng);
  const enemy = [createMonster(pokedex, RATTATA, 2, rng), createMonster(pokedex, BULBA, 25, rng)];
  const battle = createBattle({ pokedex, movesData, party: [ace, reserve], enemyParty: enemy, isTrainer: true, rng, shiftPrompt: true });
  const idx = battle.state().active.moves.findIndex((m) => m.data && m.data.power);
  battle.act({ type: 'move', index: idx });
  const res = battle.act({ type: 'shift-decision', switch: false });
  assert.ok(res.events.some((e) => e.t === 'switch' && e.side === 'enemy' && e.monster === enemy[1]), 'el rival saca al BULBA');
  assert.equal(battle.state().phase, 'choice', 'vuelve a la fase de elección');
  assert.equal(battle.state().active.monster, ace, 'el jugador conserva su Pokémon');
});
t('SHIFT: el jugador dice SÍ → cambia ANTES de que el rival saque al suyo', () => {
  const rng = mulberry32(17);
  const ace = createMonster(pokedex, SQUIRT, 50, rng);
  const reserve = createMonster(pokedex, CHARM, 30, rng);
  const enemy = [createMonster(pokedex, RATTATA, 2, rng), createMonster(pokedex, BULBA, 25, rng)];
  const battle = createBattle({ pokedex, movesData, party: [ace, reserve], enemyParty: enemy, isTrainer: true, rng, shiftPrompt: true });
  const idx = battle.state().active.moves.findIndex((m) => m.data && m.data.power);
  battle.act({ type: 'move', index: idx });
  const res = battle.act({ type: 'shift-decision', switch: true, index: 1 });
  const switchIdxs = res.events.map((e, i) => ((e.t === 'switch') ? { i, side: e.side, mon: e.monster } : null)).filter(Boolean);
  assert.equal(switchIdxs.length, 2, 'dos cambios: jugador y rival');
  assert.equal(switchIdxs[0].side, 'player', 'el jugador cambia primero');
  assert.equal(switchIdxs[0].mon, reserve);
  assert.equal(switchIdxs[1].side, 'enemy', 'luego el rival');
  assert.equal(battle.state().active.monster, reserve, 'el jugador entró con su reserva');
  assert.equal(battle.state().phase, 'choice');
});
t('SHIFT desactivado (sin flag): el rival saca al siguiente inmediatamente (compat)', () => {
  const rng = mulberry32(17);
  const ace = createMonster(pokedex, SQUIRT, 50, rng);
  const reserve = createMonster(pokedex, CHARM, 30, rng);
  const enemy = [createMonster(pokedex, RATTATA, 2, rng), createMonster(pokedex, BULBA, 25, rng)];
  const battle = createBattle({ pokedex, movesData, party: [ace, reserve], enemyParty: enemy, isTrainer: true, rng });
  const idx = battle.state().active.moves.findIndex((m) => m.data && m.data.power);
  const res = battle.act({ type: 'move', index: idx });
  assert.ok(!res.events.some((e) => e.t === 'shift-offer'), 'sin oferta de cambio');
  assert.ok(res.events.some((e) => e.t === 'switch' && e.side === 'enemy'), 'relevo inmediato');
  assert.notEqual(battle.state().phase, 'enemy-shift');
});

console.log('\n— Reparto de Experiencia (EXP Share) —');
t('OFF (clásico): solo el participante activo gana experiencia', () => {
  const rng = mulberry32(31);
  const active = createMonster(pokedex, SQUIRT, 30, rng);
  const banca = createMonster(pokedex, CHARM, 5, rng);
  const wild = createMonster(pokedex, RATTATA, 3, rng);
  const battle = createBattle({ pokedex, movesData, party: [active, banca], enemyParty: [wild], rng });
  const { events, over } = playUntilOver(battle);
  assert.equal(over.result, 'win');
  const expEvents = events.filter((e) => e.t === 'exp');
  assert.equal(expEvents.length, 1, 'solo un evento de exp');
  assert.ok(expEvents.every((e) => e.index === 0 || e.index == null), 'la exp es del activo (índice 0)');
  // El de la banca NO sube nivel ni gana exp.
  assert.equal(banca.exp, expForLevel(pokedex[CHARM - 1].growthRate, 5), 'la banca conserva su exp');
});
t('ON (Reparto EXP): TODO el equipo consciente gana experiencia a la vez', () => {
  const rng = mulberry32(31);
  const active = createMonster(pokedex, SQUIRT, 30, rng);
  const banca = createMonster(pokedex, CHARM, 5, rng);
  const wild = createMonster(pokedex, RATTATA, 3, rng);
  const expBancaBefore = banca.exp;
  const battle = createBattle({ pokedex, movesData, party: [active, banca], enemyParty: [wild], rng, expShare: true });
  const { events, over } = playUntilOver(battle);
  assert.equal(over.result, 'win');
  const expEvents = events.filter((e) => e.t === 'exp');
  assert.equal(expEvents.length, 2, 'dos eventos de exp: activo y banca');
  assert.ok(expEvents.some((e) => e.index === 0), 'el activo recibe exp');
  assert.ok(expEvents.some((e) => e.index === 1), 'la banca recibe exp');
  // El de la banca GANA exp de verdad.
  assert.ok(banca.exp > expBancaBefore, 'la banca ha ganado experiencia');
  // Misma cantidad para todos (modern gen): los dos eventos comparten amount.
  assert.equal(expEvents[0].amount, expEvents[1].amount, 'mismo reparto para todos');
});
t('ON: la banca debilitada NO recibe experiencia', () => {
  const rng = mulberry32(31);
  const active = createMonster(pokedex, SQUIRT, 30, rng);
  const banca = createMonster(pokedex, CHARM, 5, rng);
  banca.currentHp = 0; // debilitado
  const expBancaBefore = banca.exp;
  const wild = createMonster(pokedex, RATTATA, 3, rng);
  const battle = createBattle({ pokedex, movesData, party: [active, banca], enemyParty: [wild], rng, expShare: true });
  const { events } = playUntilOver(battle);
  const expEvents = events.filter((e) => e.t === 'exp');
  assert.ok(!expEvents.some((e) => e.index === 1), 'la banca debilitada no recibe exp');
  assert.equal(banca.exp, expBancaBefore, 'su exp no cambia');
});
t('ON: los eventos de exp/nivel llegan etiquetados con índice y nombre', () => {
  const rng = mulberry32(31);
  const active = createMonster(pokedex, SQUIRT, 30, rng);
  const banca = createMonster(pokedex, CHARM, 5, rng);
  const wild = createMonster(pokedex, RATTATA, 3, rng);
  const battle = createBattle({ pokedex, movesData, party: [active, banca], enemyParty: [wild], rng, expShare: true });
  const { events } = playUntilOver(battle);
  const tagged = events.filter((e) => e.t === 'exp' || e.t === 'levelup' || e.t === 'learn');
  assert.ok(tagged.length > 0, 'hay eventos de exp/nivel');
  assert.ok(tagged.every((e) => Number.isInteger(e.index) && typeof e.name === 'string'), 'todos llevan index + name');
});
t('ON: subidas de nivel y aprendizaje de movimientos de la banca siguen funcionando', () => {
  const rng = mulberry32(7);
  const active = createMonster(pokedex, SQUIRT, 50, rng); // garantiza el KO
  // Banca a punto de subir y aprender: BULBASAUR a 5 exp del nivel 7 (aprende algo pronto).
  const banca = createMonster(pokedex, BULBA, 6, rng);
  banca.exp = expForLevel('medium-slow', 7) - 5;
  const wild = createMonster(pokedex, RATTATA, 20, rng); // mucha exp
  const battle = createBattle({ pokedex, movesData, party: [active, banca], enemyParty: [wild], rng, expShare: true });
  const { events, over } = playUntilOver(battle);
  assert.equal(over.result, 'win');
  const bancaLevelups = events.filter((e) => e.t === 'levelup' && e.index === 1);
  assert.ok(bancaLevelups.length >= 1, 'la banca subió al menos un nivel');
  assert.ok(banca.level > 6, 'la banca subió de nivel de verdad');
});

// ---------- resumen ----------
console.log(`\n${passed} pasados, ${failed} fallidos`);
if (failed > 0) process.exit(1);
