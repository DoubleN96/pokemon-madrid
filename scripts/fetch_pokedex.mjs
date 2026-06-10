// Genera src/data/pokedex.json y src/data/moves.json con datos reales de PokeAPI (Gen 1, learnsets FireRed/LeafGreen)
import { writeFileSync, mkdirSync } from 'fs';

const API = 'https://pokeapi.co/api/v2';
const GEN1 = 151;
const VG = 'firered-leafgreen';

async function getJSON(url, tries = 3) {
  for (let i = 0; i < tries; i++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (i === tries - 1) throw e;
      await new Promise(res => setTimeout(res, 1500 * (i + 1)));
    }
  }
}

async function pool(items, fn, size = 8) {
  const out = new Array(items.length);
  let idx = 0;
  await Promise.all(Array.from({ length: size }, async () => {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i], i);
    }
  }));
  return out;
}

const esName = (names, fallback) => names?.find(n => n.language.name === 'es')?.name || fallback;

console.log('Descargando 151 Pokémon...');
const ids = Array.from({ length: GEN1 }, (_, i) => i + 1);

const pokedex = await pool(ids, async (id) => {
  const [p, s] = await Promise.all([getJSON(`${API}/pokemon/${id}`), getJSON(`${API}/pokemon-species/${id}`)]);
  const stats = {};
  for (const st of p.stats) stats[st.stat.name] = st.base_stat;
  const learnset = [];
  for (const m of p.moves) {
    const v = m.version_group_details.find(d => d.version_group.name === VG && d.move_learn_method.name === 'level-up');
    if (v) learnset.push({ move: m.move.name, level: Math.max(1, v.level_learned_at) });
  }
  learnset.sort((a, b) => a.level - b.level);
  process.stdout.write('.');
  return {
    id,
    name: esName(s.names, p.name),
    slug: p.name,
    types: p.types.sort((a, b) => a.slot - b.slot).map(t => t.type.name),
    stats: {
      hp: stats.hp, atk: stats.attack, def: stats.defense,
      spa: stats['special-attack'], spd: stats['special-defense'], spe: stats.speed,
    },
    baseExp: p.base_experience,
    captureRate: s.capture_rate,
    growthRate: s.growth_rate.name,
    genus: esName(s.genera?.filter(g => g.language.name === 'es').map(g => ({ language: g.language, name: g.genus })), '') || s.genera?.find(g => g.language.name === 'es')?.genus || '',
    flavor: s.flavor_text_entries?.find(f => f.language.name === 'es')?.flavor_text?.replace(/[\n\f]/g, ' ') || '',
    evolutionChainUrl: s.evolution_chain?.url || null,
    learnset,
  };
}, 8);
console.log('\nPokémon OK');

// Evoluciones: por nivel dentro de Gen 1
console.log('Descargando cadenas de evolución...');
const chainUrls = [...new Set(pokedex.map(p => p.evolutionChainUrl).filter(Boolean))];
const slugToId = Object.fromEntries(pokedex.map(p => [p.slug, p.id]));
const evoMap = {}; // id -> {to, level}
await pool(chainUrls, async (url) => {
  const chain = await getJSON(url);
  const walk = (node) => {
    const fromId = slugToId[node.species.name];
    for (const next of node.evolves_to || []) {
      const toId = slugToId[next.species.name];
      if (fromId && toId) {
        const det = next.evolution_details?.find(d => d.trigger.name === 'level-up' && d.min_level);
        if (det) evoMap[fromId] = { to: toId, level: det.min_level };
        else {
          // Piedra/intercambio → nivel fijo jugable (decisión de diseño MVP)
          const trigger = next.evolution_details?.[0]?.trigger?.name;
          if (trigger === 'use-item') evoMap[fromId] = { to: toId, level: 36 };
          if (trigger === 'trade') evoMap[fromId] = { to: toId, level: 37 };
        }
      }
      walk(next);
    }
  };
  walk(chain.chain);
  process.stdout.write('.');
}, 8);
for (const p of pokedex) { p.evolution = evoMap[p.id] || null; delete p.evolutionChainUrl; }
console.log('\nEvoluciones OK:', Object.keys(evoMap).length);

// Movimientos usados por algún learnset
const moveNames = [...new Set(pokedex.flatMap(p => p.learnset.map(l => l.move)))];
console.log(`Descargando ${moveNames.length} movimientos...`);
const movesArr = await pool(moveNames, async (name) => {
  const m = await getJSON(`${API}/move/${name}`);
  process.stdout.write('.');
  return [name, {
    name: esName(m.names, m.name),
    type: m.type.name,
    power: m.power,
    accuracy: m.accuracy,
    pp: m.pp,
    priority: m.priority,
    class: m.damage_class.name, // physical | special | status
    ailment: m.meta?.ailment?.name && m.meta.ailment.name !== 'none' ? m.meta.ailment.name : null,
    ailmentChance: m.meta?.ailment_chance || 0,
    statChanges: (m.stat_changes || []).map(s => ({ stat: s.stat.name, change: s.change })),
    statChance: m.meta?.stat_chance || 0,
    target: m.target.name,
    drain: m.meta?.drain || 0,
    healing: m.meta?.healing || 0,
    flinchChance: m.meta?.flinch_chance || 0,
    effectChance: m.effect_chance || null,
    desc: m.flavor_text_entries?.find(f => f.language.name === 'es' && f.version_group.name === VG)?.flavor_text?.replace(/[\n\f]/g, ' ')
      || m.flavor_text_entries?.find(f => f.language.name === 'es')?.flavor_text?.replace(/[\n\f]/g, ' ') || '',
  }];
}, 8);
const moves = Object.fromEntries(movesArr);
console.log('\nMovimientos OK');

mkdirSync('src/data', { recursive: true });
writeFileSync('src/data/pokedex.json', JSON.stringify(pokedex));
writeFileSync('src/data/moves.json', JSON.stringify(moves));
console.log(`ESCRITO: pokedex.json (${pokedex.length} pokémon), moves.json (${Object.keys(moves).length} movimientos)`);
