// Módulo A — Instancias de monstruo: creación, experiencia, evolución y curación.
// Lógica pura sin Phaser. Importa los datos directamente porque el contrato
// fija firmas sin parámetro de datos (gainExp, evolve, healFull).

import pokedexData from '../data/pokedex.json' with { type: 'json' };
import movesData from '../data/moves.json' with { type: 'json' };
import { calcStats, expForLevel } from './formulas.js';

const IV_KEYS = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

function speciesById(id) {
  return pokedexData[id - 1];
}

function makeMoveSlot(slug) {
  const pp = movesData[slug]?.pp ?? 5;
  return { id: slug, pp, maxPp: pp };
}

// Últimos 4 movimientos del learnset con nivel <= level (sin duplicados).
function movesAtLevel(species, level) {
  const slugs = [];
  for (const entry of species.learnset) {
    if (entry.level > level || slugs.includes(entry.move)) continue;
    slugs.push(entry.move);
  }
  return slugs.slice(-4).map(makeMoveSlot);
}

/**
 * Crea una instancia de monstruo (salvaje o de equipo).
 * @param {Array} pokedex array de especies (índice = id-1)
 * @param {number} speciesId id 1-151
 * @param {number} level nivel inicial
 * @param {Function} [rng] inyectable para tests (devuelve [0,1))
 */
export function createMonster(pokedex, speciesId, level, rng = Math.random) {
  const dex = pokedex || pokedexData;
  const species = dex[speciesId - 1];
  const ivs = {};
  for (const key of IV_KEYS) ivs[key] = Math.floor(rng() * 32);
  const inst = {
    species: speciesId,
    level,
    exp: expForLevel(species.growthRate, level),
    ivs,
    currentHp: 0,
    status: null,
    sleepTurns: 0,
    moves: movesAtLevel(species, level),
    nickname: null,
    shiny: rng() < 1 / 8192,
  };
  inst.currentHp = calcStats(species, inst).hp;
  return inst;
}

/**
 * Añade experiencia con level-ups encadenados y aprendizaje de movimientos.
 * La evolución NO se aplica aquí (se hace al final del combate con evolve()).
 * @returns {Array} eventos: {t:"levelup",level,newStats} y {t:"learn",moveName,forgotten}
 */
export function gainExp(inst, amount) {
  const species = speciesById(inst.species);
  const events = [];
  inst.exp += amount;
  const cap = expForLevel(species.growthRate, 100);
  if (inst.exp > cap) inst.exp = cap;
  while (inst.level < 100 && inst.exp >= expForLevel(species.growthRate, inst.level + 1)) {
    levelUp(inst, species, events);
  }
  return events;
}

function levelUp(inst, species, events) {
  const oldMaxHp = calcStats(species, inst).hp;
  inst.level += 1;
  const newStats = calcStats(species, inst);
  if (inst.currentHp > 0) inst.currentHp += newStats.hp - oldMaxHp;
  events.push({ t: 'levelup', level: inst.level, newStats });
  for (const entry of species.learnset) {
    if (entry.level === inst.level) learnMove(inst, entry.move, events);
  }
}

// Si ya conoce 4 movimientos, reemplaza el más antiguo (MVP: sin diálogo de olvido).
function learnMove(inst, slug, events) {
  if (inst.moves.some((m) => m.id === slug)) return;
  const data = movesData[slug];
  if (!data) return;
  let forgotten = null;
  if (inst.moves.length >= 4) {
    const old = inst.moves.shift();
    forgotten = movesData[old.id]?.name ?? old.id;
  }
  inst.moves.push(makeMoveSlot(slug));
  events.push({ t: 'learn', moveName: data.name, forgotten });
}

/** ¿Cumple los requisitos de evolución por nivel? */
export function canEvolve(inst) {
  const evo = speciesById(inst.species).evolution;
  return !!evo && inst.level >= evo.level;
}

/**
 * Evoluciona la instancia (por nivel). Conserva exp, nivel, IVs y movimientos.
 * @returns {{fromName:string, toName:string, species:Object}|null}
 */
export function evolve(inst) {
  const species = speciesById(inst.species);
  if (!species.evolution) return null;
  const target = speciesById(species.evolution.to);
  const oldMaxHp = calcStats(species, inst).hp;
  inst.species = target.id;
  const newMaxHp = calcStats(target, inst).hp;
  if (inst.currentHp > 0) {
    inst.currentHp = Math.min(newMaxHp, inst.currentHp + (newMaxHp - oldMaxHp));
  }
  return { fromName: species.name, toName: target.name, species: target };
}

/** Cura por completo: PS al máximo, sin estados y PP restaurados. */
export function healFull(inst) {
  inst.currentHp = calcStats(speciesById(inst.species), inst).hp;
  inst.status = null;
  inst.sleepTurns = 0;
  for (const move of inst.moves) move.pp = move.maxPp;
  return inst;
}
