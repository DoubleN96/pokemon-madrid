// Módulo A — Fórmulas Gen 3: stats, experiencia, daño y captura.
// Lógica pura, sin Phaser ni DOM. Sin naturalezas ni EVs (MVP), IVs 0-31.

import { effectiveness } from './typechart.js';

const STAT_KEYS = ['atk', 'def', 'spa', 'spd', 'spe'];

/**
 * Stats reales Gen 3 (EV=0, sin naturaleza).
 * @returns {{hp:number, atk:number, def:number, spa:number, spd:number, spe:number}}
 */
export function calcStats(species, inst) {
  const base = species.stats;
  const { ivs, level } = inst;
  const out = { hp: Math.floor(((2 * base.hp + ivs.hp) * level) / 100) + level + 10 };
  for (const s of STAT_KEYS) {
    out[s] = Math.floor(((2 * base[s] + ivs[s]) * level) / 100) + 5;
  }
  return out;
}

/** Experiencia total acumulada necesaria para estar en un nivel (curvas oficiales). */
export function expForLevel(growthRate, level) {
  const n = Math.max(1, Math.min(100, level));
  if (n === 1) return 0;
  const c = n ** 3;
  switch (growthRate) {
    case 'fast': return Math.floor((4 * c) / 5);
    case 'medium':
    case 'medium-fast': return c;
    case 'medium-slow': return Math.max(0, Math.floor((6 * c) / 5) - 15 * n * n + 100 * n - 140);
    case 'slow': return Math.floor((5 * c) / 4);
    case 'erratic': return expErratic(n, c);
    case 'fluctuating': return expFluctuating(n, c);
    default: return c;
  }
}

function expErratic(n, c) {
  if (n < 50) return Math.floor((c * (100 - n)) / 50);
  if (n < 68) return Math.floor((c * (150 - n)) / 100);
  if (n < 98) return Math.floor((c * Math.floor((1911 - 10 * n) / 3)) / 500);
  return Math.floor((c * (160 - n)) / 100);
}

function expFluctuating(n, c) {
  if (n < 15) return Math.floor((c * (Math.floor((n + 1) / 3) + 24)) / 50);
  if (n < 36) return Math.floor((c * (n + 14)) / 50);
  return Math.floor((c * (Math.floor(n / 2) + 32)) / 50);
}

/**
 * Experiencia ganada al derrotar a un enemigo (Gen 3).
 * EXP = baseExp · nivel / 7, repartida entre participantes; ×1.5 si es de entrenador.
 */
export function expGain(enemySpecies, enemyLevel, participants = 1, isTrainer = false) {
  const base = Math.floor((enemySpecies.baseExp * enemyLevel) / (7 * Math.max(1, participants)));
  return isTrainer ? Math.floor(base * 1.5) : base;
}

/** Multiplicador de stat stage Gen 3 (-6..+6) para atk/def/spa/spd/spe. */
export function stageMultiplier(stage) {
  return stage >= 0 ? (2 + stage) / 2 : 2 / (2 - stage);
}

/** Multiplicador de stage para precisión/evasión (-6..+6). */
export function accuracyMultiplier(stage) {
  return stage >= 0 ? (3 + stage) / 3 : 3 / (3 - stage);
}

// En crítico Gen 3 se ignoran los stages que perjudican al atacante.
function offensiveMult(stages, key, crit) {
  const stage = stages ? stages[key] || 0 : 0;
  return stageMultiplier(crit && stage < 0 ? 0 : stage);
}

function defensiveMult(stages, key, crit) {
  const stage = stages ? stages[key] || 0 : 0;
  return stageMultiplier(crit && stage > 0 ? 0 : stage);
}

/**
 * Daño Gen 3. `rng` inyectable para tests deterministas (devuelve [0,1)).
 * Quemadura: ataque físico ×0.5. STAB ×1.5. Crítico ×2. Aleatorio 85-100%.
 * @returns {{dmg:number, effectiveness:number, crit:boolean}}
 */
export function damage({
  attacker, defender, attackerSpecies, defenderSpecies, move,
  crit = false, attackerStages = null, defenderStages = null, rng = Math.random,
}) {
  const eff = effectiveness(move.type, defenderSpecies.types);
  if (!move.power || eff === 0) return { dmg: 0, effectiveness: eff, crit: false };

  const physical = move.class === 'physical';
  const atkStats = calcStats(attackerSpecies, attacker);
  const defStats = calcStats(defenderSpecies, defender);
  const A = Math.floor((physical ? atkStats.atk : atkStats.spa)
    * offensiveMult(attackerStages, physical ? 'atk' : 'spa', crit));
  const D = Math.max(1, Math.floor((physical ? defStats.def : defStats.spd)
    * defensiveMult(defenderStages, physical ? 'def' : 'spd', crit)));

  let base = Math.floor(Math.floor((Math.floor((2 * attacker.level) / 5) + 2) * move.power * A / D) / 50);
  if (physical && attacker.status === 'brn') base = Math.floor(base / 2);
  base += 2;
  if (crit) base *= 2;
  if (attackerSpecies.types.includes(move.type)) base = Math.floor(base * 1.5);
  base = Math.floor(base * eff);

  const roll = 85 + Math.floor(rng() * 16); // 85..100
  const dmg = Math.max(1, Math.floor((base * roll) / 100));
  return { dmg, effectiveness: eff, crit };
}

/**
 * Captura Gen 3 con sacudidas. `rng` inyectable.
 * @returns {{caught:boolean, shakes:number}} shakes: 0-4
 */
export function captureChance(species, inst, ballBonus = 1, statusBonus = 1, rng = Math.random) {
  const maxHp = calcStats(species, inst).hp;
  const hp = Math.max(1, inst.currentHp);
  let a = Math.floor(((3 * maxHp - 2 * hp) * species.captureRate * ballBonus) / (3 * maxHp));
  a = Math.max(1, Math.floor(a * statusBonus));
  if (a >= 255) return { caught: true, shakes: 4 };

  const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / a))))));
  let shakes = 0;
  for (let i = 0; i < 4; i++) {
    if (Math.floor(rng() * 65536) >= b) return { caught: false, shakes };
    shakes++;
  }
  return { caught: true, shakes: 4 };
}
