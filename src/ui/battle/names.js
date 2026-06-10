// Módulo C — nombres y plantillas de texto de combate (castellano castizo).

// Artículo incluido para componer frases tipo "¡La DEFENSA de X ha bajado!".
export const STAT_ES = {
  atk: 'El ATAQUE',
  def: 'La DEFENSA',
  spa: 'El ATAQUE ESP.',
  spd: 'La DEFENSA ESP.',
  spe: 'La VELOCIDAD',
  acc: 'La PRECISIÓN',
  eva: 'La EVASIÓN',
};

export const STATUS_MSG_ES = {
  par: '¡{N} está paralizado! Quizá no pueda atacar.',
  psn: '¡{N} ha sido envenenado!',
  brn: '¡{N} se ha quemado!',
  slp: '¡{N} se ha quedado frito!',
  frz: '¡{N} se ha congelado!',
};

// Texto según el número de sacudidas de la Poké Ball antes de escapar (0-3).
export const BALL_ESCAPE_ES = [
  '¡Oh, no! ¡El Pokémon se ha escapado!',
  '¡Aj! ¡Casi lo tenías!',
  '¡Aaargh! ¡Por poco!',
  '¡Ostras! ¡Si ya casi era tuyo!',
];

export function monName(inst, pokedex) {
  const species = pokedex[inst.species - 1];
  const base = inst.nickname || (species ? species.name : '???');
  return base.toUpperCase();
}
