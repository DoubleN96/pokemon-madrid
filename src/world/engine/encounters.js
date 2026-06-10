// Selección de encuentros salvajes por peso (formato `encounters` del Módulo E):
// [{ species, min, max, weight }, ...]

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function pickWeighted(entries) {
  const total = entries.reduce((sum, e) => sum + (e.weight || 0), 0);
  if (total <= 0) return null;
  let roll = Math.random() * total;
  for (const entry of entries) {
    roll -= entry.weight || 0;
    if (roll < 0) return entry;
  }
  return entries[entries.length - 1];
}

// Tira la probabilidad de encuentro y, si toca, devuelve { species, level } o null.
export function rollEncounter(encounters, rate) {
  if (!Array.isArray(encounters) || encounters.length === 0) return null;
  if (Math.random() >= rate) return null;
  const entry = pickWeighted(encounters);
  if (!entry) return null;
  return { species: entry.species, level: randInt(entry.min, entry.max) };
}
