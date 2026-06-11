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

// Nombre visible del personaje, mostrado en la plaquita del bocadillo de diálogo.
// (Marcelino pidió que aparezca el nombre del que habla encima de su foto.)
export const PORTRAIT_NAMES = {
  marcelino: 'Marcelino',
  alvaro_rival: 'Álvarín',
  alex_digital: 'Alex',
  ivan_fintips: 'Iván',
  jesus_la_rata: 'Jesús',
  sergio_guillen: 'Sergio',
  eduardo: 'Eduardo',
  blanca_notarias: 'Blanca',
  jose_antonio_casero: 'José Antonio',
  angel_perfeccionista: 'Ángel',
  adrian_schizo: 'Adrián',
  mariel: 'Mariel',
};

// Nombre visible para un id de retrato (o null si no se conoce).
export function nameForPortrait(id) {
  return (id && PORTRAIT_NAMES[id]) || null;
}

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
  // Los líderes de gimnasio (id 'gym_leader_ivan'…) tienen su sprite overworld =
  // id del personaje ('ivan_fintips'). Si el sprite es un personaje conocido,
  // ese es su retrato → muestran foto+nombre en combate/diálogo igual que el resto.
  if (npcDef.sprite && SET.has(npcDef.sprite)) return npcDef.sprite;
  return null;
}

export function hasPortrait(id) {
  return SET.has(id);
}
