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
export function createBattle({
  pokedex, movesData, party, enemyParty, isTrainer = false, bag = {}, rng = Math.random,
  shiftPrompt = false,
}) {
  const b = {
    pokedex, moves: movesData, party, enemyParty,
    isTrainer: !!isTrainer, bag, rng,
    // shiftPrompt: estilo SHIFT de FRLG. Cuando el jugador debilita a un Pokémon
    // del entrenador rival y a este le quedan más, se ofrece cambiar antes de que
    // el rival saque al siguiente. Solo lo activa BattleScene (la UI); el motor
    // puro y los tests sin el flag conservan el relevo enemigo inmediato.
    shiftPrompt: !!shiftPrompt,
    activeIndex: firstHealthy(party), enemyIndex: firstHealthy(enemyParty),
    stages: { player: freshStages(), enemy: freshStages() },
    flinched: { player: false, enemy: false },
    // Crítico aumentado por Foco Energía (Gen 3: +2 niveles de prob.). Por bando.
    focused: { player: false, enemy: false },
    // Último daño DIRECTO recibido este turno por bando (para Contraataque/Manto Espejo).
    lastDamage: { player: null, enemy: null },
    // Relevo pendiente del rival cuando shiftPrompt está activo.
    pendingEnemyIndex: -1,
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
    // Relevo pendiente del rival (solo válido en fase 'enemy-shift').
    pendingEnemy: b.pendingEnemyIndex >= 0 ? b.enemyParty[b.pendingEnemyIndex] : null,
    over: b.over,
  };
}

// ---------- acción principal ----------

function act(b, action) {
  if (b.over) return { events: [], over: b.over };
  if (b.phase === 'switch') return forcedSwitch(b, action);
  if (b.phase === 'enemy-shift') return resolveShift(b, action);
  const events = [];
  if (validateAction(b, action, events)) return { events, over: false, invalid: true };
  b.turn += 1;
  runTurn(b, action, events);
  if (b.over) finishBattle(b, events);
  return { events, over: b.over };
}

function runTurn(b, action, events) {
  b.flinched = { player: false, enemy: false };
  b.lastDamage = { player: null, enemy: null };
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
  b.focused.player = false;
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
  // Mecánicas especiales (datos PokeAPI normalizados a `mechanic`). Algunas se
  // resuelven aquí por completo (daño fijo, KO directo, auto-curación); otras
  // ajustan el movimiento y dejan que el flujo normal continúe.
  if (data.mechanic && handleMechanic(b, side, defSide, data, isStruggle, events)) return;
  if (!hitCheck(b, side, defSide, data, events)) return;
  if (data.power) dealDamage(b, side, defSide, data, isStruggle, events);
  else statusMove(b, side, defSide, data, events);
}

// Tabla de potencia variable Flail/Reversal según fracción de PS (Gen 3).
function lowHpPower(ratio) {
  if (ratio <= 0.0417) return 200;
  if (ratio <= 0.1042) return 150;
  if (ratio <= 0.2083) return 100;
  if (ratio <= 0.3542) return 80;
  if (ratio <= 0.6875) return 40;
  return 20;
}

// Resuelve movimientos con `mechanic`. Devuelve true si la ejecución TERMINA aquí
// (no debe seguir el flujo normal de daño/estado). Cualquier rama produce un
// efecto coherente: nunca "no pasa nada" silencioso.
function handleMechanic(b, side, defSide, move, isStruggle, events) {
  const mech = move.mechanic;
  const atk = activeMon(b, side);
  const def = activeMon(b, defSide);

  // --- Daño fijo / proporcional / nivel / KO: requieren acierto y no-inmunidad ---
  const damageMechs = new Set([
    'self-faint', 'ohko', 'fixed-40', 'fixed-20', 'level-damage', 'half-hp', 'endeavor',
    'counter-physical', 'counter-special',
  ]);
  if (damageMechs.has(mech)) {
    // Inmunidad por tipo (un Fantasma ignora Golpe Bajo normal, etc.).
    if (effectiveness(move.type, speciesOf(b, def).types) === 0) {
      events.push({ t: 'text', msg: `No afecta a ${displayName(b, defSide)}...` });
      return true;
    }
  }

  switch (mech) {
    case 'self-faint': {
      // Autodestrucción/Explosión: golpe normal (en Gen 3 además parte la Defensa),
      // y el usuario SE DEBILITA siempre tras usarlo, acierte o falle el KO.
      const halfDef = { ...move, _halveDef: true };
      if (hitCheck(b, side, defSide, move, events)) {
        dealDamage(b, side, defSide, halfDef, false, events);
      }
      if (!b.over && atk.currentHp > 0) {
        applyHp(b, side, -atk.currentHp, events);
        handleFaint(b, side, events);
      }
      return true;
    }
    case 'ohko': {
      // KO de un golpe: precisión Gen 3 = 30 + (nivel atacante - nivel defensor);
      // falla siempre si el defensor es de mayor nivel.
      if (def.level > atk.level) {
        events.push({ t: 'miss' });
        events.push({ t: 'text', msg: `¡${displayName(b, defSide)} es demasiado fuerte para un KO fulminante!` });
        return true;
      }
      const acc = 30 + (atk.level - def.level);
      if (b.rng() * 100 >= acc) { events.push({ t: 'miss' }); return true; }
      applyHp(b, defSide, -def.currentHp, events);
      events.push({ t: 'text', msg: '¡KO de un solo golpe!' });
      handleFaint(b, defSide, events);
      return true;
    }
    case 'fixed-40': return fixedDamage(b, side, defSide, move, 40, events);
    case 'fixed-20': return fixedDamage(b, side, defSide, move, 20, events);
    case 'level-damage': return fixedDamage(b, side, defSide, move, atk.level, events);
    case 'half-hp': return fixedDamage(b, side, defSide, move, Math.max(1, Math.floor(def.currentHp / 2)), events);
    case 'endeavor': {
      if (atk.currentHp >= def.currentHp) { events.push({ t: 'text', msg: '¡Pero ha fallado!' }); return true; }
      if (!hitCheck(b, side, defSide, move, events)) return true;
      return fixedDamage(b, side, defSide, move, def.currentHp - atk.currentHp, events);
    }
    case 'counter-physical':
    case 'counter-special': {
      const want = mech === 'counter-physical' ? 'physical' : 'special';
      const last = b.lastDamage[side];
      if (!last || last.class !== want || last.amount <= 0) {
        events.push({ t: 'text', msg: '¡Pero ha fallado!' });
        return true;
      }
      return fixedDamage(b, side, defSide, move, last.amount * 2, events);
    }
    // --- Potencia variable: ajustan move.power y SIGUEN al flujo normal de daño ---
    case 'low-hp-power': {
      move = { ...move, power: lowHpPower(atk.currentHp / maxHpOf(b, atk)) };
      return finishVariablePower(b, side, defSide, move, isStruggle, events);
    }
    case 'fixed-power-50':
      return finishVariablePower(b, side, defSide, { ...move, power: 50 }, isStruggle, events);
    case 'fixed-power-70':
      return finishVariablePower(b, side, defSide, { ...move, power: 70 }, isStruggle, events);
    case 'fixed-power-100':
      return finishVariablePower(b, side, defSide, { ...move, power: 100 }, isStruggle, events);
    // --- Estado / utilidad con degradación elegante ---
    case 'rest': {
      const max = maxHpOf(b, atk);
      if (atk.currentHp >= max && !atk.status) {
        events.push({ t: 'text', msg: '¡Pero ha fallado!' });
        return true;
      }
      applyHp(b, side, max - atk.currentHp, events);
      atk.status = 'slp';
      atk.sleepTurns = 2;
      events.push({ t: 'status', side, status: 'slp' });
      events.push({ t: 'text', msg: `¡${displayName(b, side)} se ha dormido y ha recuperado toda su salud!` });
      return true;
    }
    case 'refresh': {
      if (!atk.status) { events.push({ t: 'text', msg: '¡Pero ha fallado!' }); return true; }
      atk.status = null;
      events.push({ t: 'status', side, status: null });
      events.push({ t: 'text', msg: `¡${displayName(b, side)} se ha curado!` });
      return true;
    }
    case 'haze': {
      b.stages.player = freshStages();
      b.stages.enemy = freshStages();
      events.push({ t: 'text', msg: '¡Una neblina ha borrado todos los cambios de estadísticas!' });
      return true;
    }
    case 'focus-energy': {
      if (b.focused[side]) { events.push({ t: 'text', msg: '¡Pero ha fallado!' }); return true; }
      b.focused[side] = true;
      events.push({ t: 'text', msg: `¡${displayName(b, side)} se concentra y aumenta su puntería para golpes críticos!` });
      return true;
    }
    case 'belly-drum': {
      const max = maxHpOf(b, atk);
      if (atk.currentHp <= Math.floor(max / 2) || b.stages[side].atk >= 6) {
        events.push({ t: 'text', msg: '¡Pero ha fallado!' });
        return true;
      }
      applyHp(b, side, -Math.floor(max / 2), events);
      b.stages[side].atk = 6;
      events.push({ t: 'stat', side, stat: 'atk', change: 6 });
      events.push({ t: 'text', msg: `¡${displayName(b, side)} sacrifica salud y maximiza su Ataque!` });
      return true;
    }
    case 'splash':
      events.push({ t: 'text', msg: '¡Pero no pasó nada en absoluto!' });
      return true;
    case 'protect-degrade':
      // Protección/Detección/Aguante: aún no hay turno de "intención"; degradamos a
      // un mensaje coherente de que el Pokémon se pone en guardia (sin efecto real).
      events.push({ t: 'text', msg: `¡${displayName(b, side)} se pone en guardia!` });
      return true;
    case 'force-switch': {
      // Rugido/Remolino: forzar cambio rival no encaja en el motor 1-a-1 actual;
      // degradamos a un mensaje coherente sin romper el combate.
      events.push({ t: 'text', msg: `¡${displayName(b, side)} ruge, pero ${displayName(b, defSide)} no se inmuta!` });
      return true;
    }
    default:
      return false; // mecánica desconocida: que siga el flujo normal
  }
}

// Continúa el flujo normal de daño con un movimiento de potencia ya ajustada.
function finishVariablePower(b, side, defSide, move, isStruggle, events) {
  if (!hitCheck(b, side, defSide, move, events)) return true;
  dealDamage(b, side, defSide, move, isStruggle, events);
  return true;
}

// Aplica una cantidad fija de daño (respeta inmunidad ya comprobada arriba) con
// precisión. Gestiona el debilitamiento resultante.
function fixedDamage(b, side, defSide, move, amount, events) {
  if (!hitCheck(b, side, defSide, move, events)) return true;
  const def = activeMon(b, defSide);
  const dmg = Math.max(1, Math.min(def.currentHp, Math.floor(amount)));
  applyHp(b, defSide, -dmg, events);
  if (def.currentHp <= 0) handleFaint(b, defSide, events);
  return true;
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
  // Foco Energía sube la probabilidad de crítico (Gen 3 simplificado: 1/16 → 1/4).
  const critChance = b.focused[side] ? 1 / 4 : 1 / 16;
  const crit = b.rng() < critChance;
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
  // Registra el daño directo recibido por el defensor (Contraataque/Manto Espejo).
  b.lastDamage[defSide] = { amount: res.dmg, class: move.class };
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
  // Estilo SHIFT (FRLG): en combate de ENTRENADOR, antes de que el rival saque al
  // siguiente, se ofrece al jugador cambiar de Pokémon viendo a quién sacará el
  // rival. Solo si shiftPrompt está activo y el jugador tiene un relevo sano y no
  // está obligado a cambiar él mismo (su activo sigue en pie).
  if (b.shiftPrompt && b.isTrainer && activeMon(b, 'player').currentHp > 0
      && b.party.some((m, i) => i !== b.activeIndex && m.currentHp > 0)) {
    b.pendingEnemyIndex = next;
    b.phase = 'enemy-shift';
    const nextMon = b.enemyParty[next];
    events.push({
      t: 'shift-offer', enemyIndex: next, monster: nextMon, species: nextMon.species,
    });
    return;
  }
  bringInEnemy(b, next, events);
}

// Saca al siguiente Pokémon del rival (relevo). Resetea sus stages/foco.
function bringInEnemy(b, next, events) {
  b.enemyIndex = next;
  b.stages.enemy = freshStages();
  b.flinched.enemy = false;
  b.focused.enemy = false;
  events.push({ t: 'switch', side: 'enemy', monster: activeMon(b, 'enemy') });
  events.push({ t: 'text', msg: `¡El rival saca a ${nameOf(b, activeMon(b, 'enemy'))}!` });
}

// Resuelve la decisión del jugador ante el relevo del rival (fase enemy-shift).
// action: { type:'shift-decision', switch:boolean, index?:number }
// Si switch=true, el jugador entra con el Pokémon `index` ANTES de que el rival
// saque al suyo. En cualquier caso, el rival saca a su siguiente Pokémon.
function resolveShift(b, action) {
  const events = [];
  const next = b.pendingEnemyIndex;
  if (next < 0 || b.enemyParty[next]?.currentHp <= 0) {
    // Estado inconsistente: degradar con elegancia recalculando el relevo.
    const fallback = b.enemyParty.findIndex((m) => m.currentHp > 0);
    if (fallback < 0) { b.phase = 'choice'; b.over = { result: 'win', expReports: b.expReports }; finishBattle(b, events); return { events, over: b.over }; }
    b.pendingEnemyIndex = fallback;
    return resolveShift(b, { ...action, _retry: true });
  }
  if (action && action.type === 'shift-decision' && action.switch) {
    if (validateSwitch(b, action, events)) {
      // Índice inválido: ignorar el cambio pero seguir sacando al rival.
    } else {
      doSwitch(b, action.index, events, true);
    }
  }
  bringInEnemy(b, next, events);
  b.pendingEnemyIndex = -1;
  b.phase = 'choice';
  return { events, over: false };
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
