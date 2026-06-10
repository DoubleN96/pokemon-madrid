// Módulo A — Máquina de turnos de combate (salvaje y entrenador).
// Lógica pura sin Phaser: emite eventos que la BattleScene anima en orden.
// API: createBattle({pokedex, movesData, party, enemyParty, isTrainer, bag, rng})
//   battle.state() → snapshot   |   battle.act(action) → { events, over }

import { effectiveness } from './typechart.js';
import {
  calcStats, damage, captureChance, expGain, stageMultiplier, accuracyMultiplier,
} from './formulas.js';
import { gainExp } from './monster.js';

// Forcejeo: se usa cuando no quedan PP en ningún movimiento (Gen 3: tipo normal,
// retroceso de 1/4 del daño causado).
const STRUGGLE = {
  name: 'Forcejeo', type: 'normal', power: 50, accuracy: 100, pp: 1, priority: 0,
  class: 'physical', ailment: null, ailmentChance: 0, statChanges: [], statChance: 0,
  target: 'selected-pokemon', drain: 0, healing: 0, flinchChance: 0,
};

const AILMENT_TO_STATUS = { paralysis: 'par', poison: 'psn', burn: 'brn', sleep: 'slp', freeze: 'frz' };
const STATUS_IMMUNE = { psn: ['poison', 'steel'], brn: ['fire'], frz: ['ice'] };
const STATUS_CATCH_BONUS = { slp: 2, frz: 2, par: 1.5, psn: 1.5, brn: 1.5 };
const STAT_KEY = {
  attack: 'atk', defense: 'def', 'special-attack': 'spa',
  'special-defense': 'spd', speed: 'spe', accuracy: 'acc', evasion: 'eva',
};
const STAT_NAME = {
  atk: 'Ataque', def: 'Defensa', spa: 'Ataque Especial',
  spd: 'Defensa Especial', spe: 'Velocidad', acc: 'Precisión', eva: 'Evasión',
};
/**
 * Crea un combate. Devuelve { state, act } según el contrato.
 * `rng` inyectable (devuelve [0,1)) para tests deterministas.
 */
export function createBattle({ pokedex, movesData, party, enemyParty, isTrainer = false, bag = {}, rng = Math.random }) {
  const b = {
    pokedex, moves: movesData, party, enemyParty,
    isTrainer: !!isTrainer, bag, rng,
    activeIndex: firstHealthy(party), enemyIndex: firstHealthy(enemyParty),
    stages: { player: freshStages(), enemy: freshStages() },
    flinched: { player: false, enemy: false },
    runAttempts: 0, turn: 0, phase: 'choice', over: false,
    expReports: [],
  };
  return { state: () => snapshot(b), act: (action) => act(b, action) };
}

// ---------- helpers básicos ----------

function freshStages() { return { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 }; }
function clampStage(v) { return Math.max(-6, Math.min(6, v)); }
function other(side) { return side === 'player' ? 'enemy' : 'player'; }
function firstHealthy(team) { const i = team.findIndex((m) => m.currentHp > 0); return i < 0 ? 0 : i; }
function activeMon(b, side) { return side === 'player' ? b.party[b.activeIndex] : b.enemyParty[b.enemyIndex]; }
function speciesOf(b, mon) { return b.pokedex[mon.species - 1]; }
function nameOf(b, mon) { return (mon.nickname || speciesOf(b, mon).name).toUpperCase(); }
function maxHpOf(b, mon) { return calcStats(speciesOf(b, mon), mon).hp; }

function displayName(b, side) {
  const n = nameOf(b, activeMon(b, side));
  if (side === 'player') return n;
  return b.isTrainer ? `${n} enemigo` : `${n} salvaje`;
}

function effSpeed(b, side) {
  const mon = activeMon(b, side);
  let spe = calcStats(speciesOf(b, mon), mon).spe * stageMultiplier(b.stages[side].spe);
  if (mon.status === 'par') spe *= 0.25;
  return Math.floor(spe);
}

function applyHp(b, side, delta, events) {
  const mon = activeMon(b, side);
  const max = maxHpOf(b, mon);
  const from = mon.currentHp;
  mon.currentHp = Math.max(0, Math.min(max, from + delta));
  events.push({ t: 'hp', side, from, to: mon.currentHp, max });
}

// ---------- snapshot ----------

function sideView(b, side) {
  const mon = activeMon(b, side);
  const species = speciesOf(b, mon);
  const stats = calcStats(species, mon);
  return {
    monster: mon, species, name: nameOf(b, mon), level: mon.level,
    hp: mon.currentHp, maxHp: stats.hp, status: mon.status, stats,
    stages: { ...b.stages[side] },
    moves: mon.moves.map((m) => ({ id: m.id, pp: m.pp, maxPp: m.maxPp, data: b.moves[m.id] })),
  };
}

function snapshot(b) {
  return {
    phase: b.over ? 'over' : b.phase,
    turn: b.turn,
    active: sideView(b, 'player'),
    enemy: sideView(b, 'enemy'),
    party: b.party,
    bag: b.bag,
    isTrainer: b.isTrainer,
    canRun: !b.isTrainer,
    over: b.over,
  };
}

// ---------- acción principal ----------

function act(b, action) {
  if (b.over) return { events: [], over: b.over };
  if (b.phase === 'switch') return forcedSwitch(b, action);
  const events = [];
  if (validateAction(b, action, events)) return { events, over: false, invalid: true };
  b.turn += 1;
  runTurn(b, action, events);
  if (b.over) finishBattle(b, events);
  return { events, over: b.over };
}

function runTurn(b, action, events) {
  b.flinched = { player: false, enemy: false };
  if (action.type === 'move') {
    moveVsMove(b, action.index, events);
  } else {
    const ended = playerUtility(b, action, events);
    if (ended) return;
    if (!b.over && b.phase === 'choice') performMove(b, 'enemy', aiChooseMove(b), events);
  }
  if (!b.over && b.phase === 'choice') endOfTurn(b, events);
}

// Acciones que no son movimiento: huir / objeto / cambio. Devuelve true si el
// combate terminó (huida o captura); si no, el enemigo ataca gratis después.
function playerUtility(b, action, events) {
  if (action.type === 'run') return tryRun(b, events);
  if (action.type === 'item') return useItem(b, action, events);
  doSwitch(b, action.index, events, true);
  return false;
}

// ---------- validación ----------

function validateAction(b, action, events) {
  if (action.type === 'run') {
    if (!b.isTrainer) return false;
    events.push({ t: 'text', msg: '¡No puedes huir de un combate contra entrenador!' });
    return true;
  }
  if (action.type === 'switch') return validateSwitch(b, action, events);
  if (action.type === 'item') return validateItem(b, action, events);
  if (action.type === 'move') return validateMove(b, action, events);
  events.push({ t: 'text', msg: '¡Eso no se puede hacer ahora!' });
  return true;
}

function validateMove(b, action, events) {
  const mon = activeMon(b, 'player');
  const slot = mon.moves[action.index];
  const anyPp = mon.moves.some((m) => m.pp > 0);
  if (!anyPp) return false; // sin PP en nada → Forcejeo
  if (!slot) { events.push({ t: 'text', msg: '¡Ese movimiento no existe!' }); return true; }
  if (slot.pp <= 0) { events.push({ t: 'text', msg: '¡No quedan PP para este movimiento!' }); return true; }
  return false;
}

function validateSwitch(b, action, events) {
  const mon = b.party[action.index];
  if (!mon) { events.push({ t: 'text', msg: '¡Ahí no hay ningún Pokémon!' }); return true; }
  if (action.index === b.activeIndex) { events.push({ t: 'text', msg: '¡Ya está en combate!' }); return true; }
  if (mon.currentHp <= 0) { events.push({ t: 'text', msg: '¡No le quedan fuerzas para luchar!' }); return true; }
  return false;
}

function validateItem(b, action, events) {
  if ((b.bag[action.item] || 0) <= 0) {
    events.push({ t: 'text', msg: '¡No te queda ninguno!' });
    return true;
  }
  if (action.item === 'poke-ball') {
    if (!b.isTrainer) return false;
    events.push({ t: 'text', msg: '¡No seas chorizo! ¡No puedes capturar Pokémon de otro entrenador!' });
    return true;
  }
  const mon = b.party[action.target ?? b.activeIndex];
  if (!mon) { events.push({ t: 'text', msg: '¡Ahí no hay ningún Pokémon!' }); return true; }
  if (action.item === 'potion') return validatePotion(b, mon, events);
  if (action.item === 'antidote') {
    if (mon.status === 'psn') return false;
    events.push({ t: 'text', msg: 'No tendría ningún efecto.' });
    return true;
  }
  events.push({ t: 'text', msg: '¡No puedes usar eso ahora!' });
  return true;
}

function validatePotion(b, mon, events) {
  if (mon.currentHp <= 0) {
    events.push({ t: 'text', msg: '¡Está debilitado! Eso no le serviría de nada.' });
    return true;
  }
  if (mon.currentHp >= maxHpOf(b, mon)) {
    events.push({ t: 'text', msg: 'No tendría ningún efecto. ¡Tiene la salud a tope!' });
    return true;
  }
  return false;
}

// ---------- huida / objetos / cambio ----------

// Fórmula Gen 3 con velocidades; si el salvaje es más lento, escapas siempre.
function tryRun(b, events) {
  b.runAttempts += 1;
  const ps = effSpeed(b, 'player');
  const es = Math.max(1, effSpeed(b, 'enemy'));
  let ok = ps >= es;
  if (!ok) {
    const f = Math.floor((ps * 128) / es) + 30 * b.runAttempts;
    ok = f >= 256 || Math.floor(b.rng() * 256) < f;
  }
  if (!ok) {
    events.push({ t: 'text', msg: '¡No has podido escapar!' });
    return false;
  }
  events.push({ t: 'text', msg: '¡Has escapado sin problemas!' });
  b.over = { result: 'ran' };
  return true;
}

function useItem(b, action, events) {
  b.bag[action.item] = (b.bag[action.item] || 0) - 1;
  if (action.item === 'poke-ball') return throwBall(b, events);
  const target = action.target ?? b.activeIndex;
  const mon = b.party[target];
  if (action.item === 'potion') {
    const healed = Math.min(20, maxHpOf(b, mon) - mon.currentHp);
    if (target === b.activeIndex) applyHp(b, 'player', healed, events);
    else mon.currentHp += healed;
    events.push({ t: 'text', msg: `¡${nameOf(b, mon)} ha recuperado ${healed} PS!` });
  } else if (action.item === 'antidote') {
    mon.status = null;
    if (target === b.activeIndex) events.push({ t: 'status', side: 'player', status: null });
    events.push({ t: 'text', msg: `¡${nameOf(b, mon)} se ha curado del veneno!` });
  }
  return false;
}

function throwBall(b, events) {
  const foe = activeMon(b, 'enemy');
  const bonus = STATUS_CATCH_BONUS[foe.status] || 1;
  const { caught, shakes } = captureChance(speciesOf(b, foe), foe, 1, bonus, b.rng);
  events.push({ t: 'ball', shakes, caught });
  if (!caught) return false;
  b.over = { result: 'caught', caughtMonster: foe, expReports: b.expReports };
  return true;
}

function doSwitch(b, index, events, voluntary) {
  b.activeIndex = index;
  b.stages.player = freshStages();
  b.flinched.player = false;
  events.push({ t: 'switch', side: 'player', monster: b.party[index] });
}

// Tras un debilitamiento propio solo se acepta cambiar (sin ataque gratis enemigo).
function forcedSwitch(b, action) {
  const events = [];
  if (action.type !== 'switch' || validateSwitch(b, action, events)) {
    if (!events.length) events.push({ t: 'text', msg: '¡Tienes que sacar otro Pokémon!' });
    return { events, over: false, invalid: true };
  }
  doSwitch(b, action.index, events, false);
  b.phase = 'choice';
  return { events, over: false };
}

// ---------- movimiento contra movimiento ----------

function moveVsMove(b, playerIdx, events) {
  const enemyIdx = aiChooseMove(b);
  const startingEnemy = activeMon(b, 'enemy');
  const first = whoActsFirst(b, playerIdx, enemyIdx);
  const order = first === 'player'
    ? [['player', playerIdx], ['enemy', enemyIdx]]
    : [['enemy', enemyIdx], ['player', playerIdx]];
  for (const [side, idx] of order) {
    if (b.over || b.phase !== 'choice') return;
    // El relevo enemigo (entrenador) no actúa el turno en que entra.
    if (side === 'enemy' && activeMon(b, 'enemy') !== startingEnemy) continue;
    if (activeMon(b, side).currentHp <= 0) continue;
    performMove(b, side, idx, events);
  }
}

function whoActsFirst(b, playerIdx, enemyIdx) {
  const pPrio = priorityOf(b, activeMon(b, 'player'), playerIdx);
  const ePrio = priorityOf(b, activeMon(b, 'enemy'), enemyIdx);
  if (pPrio !== ePrio) return pPrio > ePrio ? 'player' : 'enemy';
  const ps = effSpeed(b, 'player');
  const es = effSpeed(b, 'enemy');
  if (ps !== es) return ps > es ? 'player' : 'enemy';
  return b.rng() < 0.5 ? 'player' : 'enemy';
}

function priorityOf(b, mon, idx) {
  const slot = idx >= 0 ? mon.moves[idx] : null;
  if (!slot || slot.pp <= 0) return 0;
  return b.moves[slot.id]?.priority ?? 0;
}

// IA: pondera daño estimado (poder × efectividad × STAB), 20% aleatorio puro.
function aiChooseMove(b) {
  const mon = activeMon(b, 'enemy');
  const usable = mon.moves.map((m, i) => ({ m, i })).filter((x) => x.m.pp > 0 && b.moves[x.m.id]);
  if (!usable.length) return -1; // Forcejeo
  if (b.rng() < 0.2) return usable[Math.floor(b.rng() * usable.length)].i;
  const defTypes = speciesOf(b, activeMon(b, 'player')).types;
  const atkTypes = speciesOf(b, mon).types;
  let best = usable[0];
  let bestScore = -1;
  for (const x of usable) {
    const data = b.moves[x.m.id];
    let score = 5; // valor bajo fijo para movimientos de estado
    if (data.power) {
      score = data.power * effectiveness(data.type, defTypes) * (atkTypes.includes(data.type) ? 1.5 : 1);
    }
    if (score > bestScore) { bestScore = score; best = x; }
  }
  return best.i;
}

function resolveMoveSlot(b, mon, moveIndex) {
  const usable = mon.moves.filter((m) => m.pp > 0);
  if (!usable.length) return { data: STRUGGLE, slot: null, isStruggle: true };
  let slot = mon.moves[moveIndex];
  if (!slot || slot.pp <= 0) slot = usable[0];
  return { data: b.moves[slot.id] || STRUGGLE, slot, isStruggle: false };
}

function performMove(b, side, moveIndex, events) {
  const mon = activeMon(b, side);
  if (!preMoveCheck(b, side, mon, events)) return;
  const { data, slot, isStruggle } = resolveMoveSlot(b, mon, moveIndex);
  if (slot) slot.pp = Math.max(0, slot.pp - 1);
  if (isStruggle) events.push({ t: 'text', msg: `¡A ${displayName(b, side)} no le quedan PP!` });
  events.push({ t: 'move', side, moveName: data.name });
  const defSide = other(side);
  if (!hitCheck(b, side, defSide, data, events)) return;
  if (data.power) dealDamage(b, side, defSide, data, isStruggle, events);
  else statusMove(b, side, defSide, data, events);
}

// Estados que impiden actuar: amedrentado, dormido, congelado, paralizado.
function preMoveCheck(b, side, mon, events) {
  const name = displayName(b, side);
  if (b.flinched[side]) {
    events.push({ t: 'text', msg: `¡${name} se ha amedrentado y no puede moverse!` });
    return false;
  }
  if (mon.status === 'slp') {
    mon.sleepTurns -= 1;
    if (mon.sleepTurns > 0) {
      events.push({ t: 'text', msg: `${name} está dormido como un tronco.` });
      return false;
    }
    mon.status = null;
    events.push({ t: 'status', side, status: null });
    events.push({ t: 'text', msg: `¡${name} se ha despertado!` });
  }
  if (mon.status === 'frz') {
    if (b.rng() >= 0.2) {
      events.push({ t: 'text', msg: `${name} está congelado y no puede moverse.` });
      return false;
    }
    mon.status = null;
    events.push({ t: 'status', side, status: null });
    events.push({ t: 'text', msg: `¡${name} se ha descongelado!` });
  }
  if (mon.status === 'par' && b.rng() < 0.25) {
    events.push({ t: 'text', msg: `¡${name} está paralizado! ¡No puede moverse!` });
    return false;
  }
  return true;
}

function hitCheck(b, side, defSide, move, events) {
  if (move.accuracy == null) return true;
  const stage = clampStage(b.stages[side].acc - b.stages[defSide].eva);
  if (b.rng() * 100 < move.accuracy * accuracyMultiplier(stage)) return true;
  events.push({ t: 'miss' });
  return false;
}

// ---------- daño y efectos ----------

function dealDamage(b, side, defSide, move, isStruggle, events) {
  const atk = activeMon(b, side);
  const def = activeMon(b, defSide);
  const crit = b.rng() < 1 / 16;
  const res = damage({
    attacker: atk, defender: def,
    attackerSpecies: speciesOf(b, atk), defenderSpecies: speciesOf(b, def),
    move, crit,
    attackerStages: b.stages[side], defenderStages: b.stages[defSide], rng: b.rng,
  });
  if (res.effectiveness === 0) {
    events.push({ t: 'text', msg: `No afecta a ${displayName(b, defSide)}...` });
    return;
  }
  applyHp(b, defSide, -res.dmg, events);
  if (res.crit) events.push({ t: 'crit' });
  if (res.effectiveness !== 1) events.push({ t: 'eff', mult: res.effectiveness });
  recoilAndDrain(b, side, move, isStruggle, res.dmg, events);
  if (def.currentHp > 0) applySecondary(b, side, defSide, move, events);
  if (def.currentHp <= 0) handleFaint(b, defSide, events);
  if (atk.currentHp <= 0 && !b.over) handleFaint(b, side, events);
}

function recoilAndDrain(b, side, move, isStruggle, dmg, events) {
  if (isStruggle) {
    applyHp(b, side, -Math.max(1, Math.floor(dmg / 4)), events);
    events.push({ t: 'text', msg: `¡${displayName(b, side)} se resiente del retroceso!` });
    return;
  }
  if (move.drain > 0) {
    applyHp(b, side, Math.max(1, Math.floor((dmg * move.drain) / 100)), events);
    events.push({ t: 'text', msg: `¡${displayName(b, side)} ha absorbido energía!` });
  } else if (move.drain < 0) {
    applyHp(b, side, -Math.max(1, Math.floor((dmg * -move.drain) / 100)), events);
    events.push({ t: 'text', msg: `¡${displayName(b, side)} se resiente del retroceso!` });
  }
}

// Efectos secundarios de movimientos con daño (probabilidades propias).
function applySecondary(b, side, defSide, move, events) {
  if (move.ailment && move.ailmentChance > 0 && b.rng() * 100 < move.ailmentChance) {
    applyAilment(b, defSide, move, events);
  }
  if (move.statChanges?.length && move.statChance > 0 && b.rng() * 100 < move.statChance) {
    applyStatChanges(b, side, defSide, move, events, true);
  }
  if (move.flinchChance > 0 && b.rng() * 100 < move.flinchChance) {
    b.flinched[defSide] = true;
  }
  if (move.healing > 0) applyHealing(b, side, move, events);
}

// Movimientos de estado (sin poder): cambios de stats, estados y curación.
function statusMove(b, side, defSide, move, events) {
  const targetsSelf = move.target === 'user' || move.target === 'users-field';
  if (!targetsSelf && effectiveness(move.type, speciesOf(b, activeMon(b, defSide)).types) === 0) {
    events.push({ t: 'text', msg: `No afecta a ${displayName(b, defSide)}...` });
    return;
  }
  let did = false;
  if (move.healing > 0) did = applyHealing(b, side, move, events) || did;
  if (move.statChanges?.length) did = applyStatChanges(b, side, defSide, move, events, false) || did;
  if (move.ailment) did = applyAilment(b, defSide, move, events) || did;
  if (!did) events.push({ t: 'text', msg: '¡Pero ha fallado!' });
}

function applyAilment(b, defSide, move, events) {
  const status = AILMENT_TO_STATUS[move.ailment];
  if (!status) return false;
  const mon = activeMon(b, defSide);
  if (mon.status || mon.currentHp <= 0) return false;
  const types = speciesOf(b, mon).types;
  if (STATUS_IMMUNE[status]?.some((t) => types.includes(t))) return false;
  if (status === 'slp') mon.sleepTurns = 1 + Math.floor(b.rng() * 4);
  mon.status = status;
  events.push({ t: 'status', side: defSide, status });
  return true;
}

function applyStatChanges(b, side, defSide, move, events, silentCap) {
  const targetSide = move.target === 'user' ? side : defSide;
  let any = false;
  for (const { stat, change } of move.statChanges) {
    const key = STAT_KEY[stat];
    if (!key) continue;
    const cur = b.stages[targetSide][key];
    const next = clampStage(cur + change);
    if (next === cur) {
      if (!silentCap) {
        const verb = change > 0 ? 'subir' : 'bajar';
        events.push({ t: 'text', msg: `¡El ${STAT_NAME[key]} de ${displayName(b, targetSide)} ya no puede ${verb} más!` });
      }
      continue;
    }
    b.stages[targetSide][key] = next;
    events.push({ t: 'stat', side: targetSide, stat: key, change });
    any = true;
  }
  return any;
}

function applyHealing(b, side, move, events) {
  const mon = activeMon(b, side);
  const max = maxHpOf(b, mon);
  if (mon.currentHp >= max) return false;
  applyHp(b, side, Math.max(1, Math.floor((max * move.healing) / 100)), events);
  events.push({ t: 'text', msg: `¡${displayName(b, side)} ha recuperado salud!` });
  return true;
}

// ---------- final de turno y debilitamientos ----------

function endOfTurn(b, events) {
  for (const side of ['player', 'enemy']) {
    if (b.over || b.phase !== 'choice') return;
    const mon = activeMon(b, side);
    if (mon.currentHp <= 0) continue;
    if (mon.status === 'psn') residual(b, side, 8, `¡${displayName(b, side)} sufre por el veneno!`, events);
    else if (mon.status === 'brn') residual(b, side, 16, `¡${displayName(b, side)} sufre por las quemaduras!`, events);
  }
}

function residual(b, side, divisor, msg, events) {
  const mon = activeMon(b, side);
  events.push({ t: 'text', msg });
  applyHp(b, side, -Math.max(1, Math.floor(maxHpOf(b, mon) / divisor)), events);
  if (mon.currentHp <= 0) handleFaint(b, side, events);
}

function handleFaint(b, side, events) {
  events.push({ t: 'faint', side });
  if (side === 'enemy') return handleEnemyFaint(b, events);
  if (b.party.some((m) => m.currentHp > 0)) {
    b.phase = 'switch';
    return;
  }
  b.over = { result: 'lose' };
}

function handleEnemyFaint(b, events) {
  awardExp(b, events);
  const next = b.enemyParty.findIndex((m) => m.currentHp > 0);
  if (next < 0) {
    b.over = { result: 'win', expReports: b.expReports };
    return;
  }
  b.enemyIndex = next;
  b.stages.enemy = freshStages();
  b.flinched.enemy = false;
  events.push({ t: 'switch', side: 'enemy', monster: activeMon(b, 'enemy') });
  events.push({ t: 'text', msg: `¡El rival saca a ${nameOf(b, activeMon(b, 'enemy'))}!` });
}

// Exp solo para el participante activo (MVP); ×1.5 contra entrenadores.
function awardExp(b, events) {
  const receiver = b.party[b.activeIndex];
  if (!receiver || receiver.currentHp <= 0) return;
  const foe = activeMon(b, 'enemy');
  const amount = expGain(speciesOf(b, foe), foe.level, 1, b.isTrainer);
  events.push({ t: 'exp', amount });
  events.push(...gainExp(receiver, amount));
  b.expReports.push({ index: b.activeIndex, amount });
}

// ---------- fin de combate ----------

// La evolución es responsabilidad de BattleScene (módulo C): anima, evoluciona y registra en la pokédex.
function finishBattle(b, events) {
  events.push({ t: 'end', result: b.over.result });
  b.phase = 'over';
}
