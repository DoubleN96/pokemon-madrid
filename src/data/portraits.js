// IDs de los retratos de personajes de Pokémon Piso (generados con IA en
// public/assets/portraits/<id>.png). Coinciden con el `id` de los NPCs en maps.js,
// así que un NPC con retrato se detecta por su id.
export const PORTRAIT_IDS = [
  'marcelino',
  'alvaro_rival',
  'alex_digital',
  'ivan_fintips',
  'jesus_la_rata',
  'sergio_guillen',
  'eduardo',
  'blanca_notarias',
  'jose_antonio_casero',
  'angel_perfeccionista',
  'adrian_schizo',
  'mariel',
];

const SET = new Set(PORTRAIT_IDS);

// Clave de textura Phaser para un retrato.
export function portraitKey(id) {
  return `portrait_${id}`;
}

// Devuelve el id de retrato para un NPC (o null si no tiene).
export function portraitForNpc(npcDef) {
  if (!npcDef) return null;
  if (npcDef.portrait && SET.has(npcDef.portrait)) return npcDef.portrait;
  if (npcDef.id && SET.has(npcDef.id)) return npcDef.id;
  // NPCs con sufijo (p.ej. 'alvaro_rival_2') → raíz conocida
  if (npcDef.id) {
    const root = npcDef.id.replace(/_\d+$/, '');
    if (SET.has(root)) return root;
  }
  return null;
}

export function hasPortrait(id) {
  return SET.has(id);
}
