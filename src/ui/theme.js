// Módulo D — Estética compartida estilo GBA FRLG: cajas, texto, barras y constantes de UI.

export const BOX_COLORS = {
  fill: 0xf8f8f8,        // fondo de caja FRLG
  borderDark: 0x585858,  // borde exterior
  borderLight: 0xa0a0a0, // borde interior
  panelTeam: 0x98d8c0,   // fondo panel equipo
  panelBag: 0xe8e0c0,    // fondo panel mochila
  panelDex: 0xc04838,    // fondo panel pokédex
  panelDetail: 0xd0e8f8, // fondo panel detalle
};

export const TEXT_COLOR = '#383838';
export const TEXT_COLOR_LIGHT = '#f8f8f8';
export const TEXT_COLOR_DIM = '#787878';

// Estilo de texto estándar del juego (monospace nítida, sin fuentes externas en MVP).
export function textStyle(overrides = {}) {
  return {
    fontFamily: 'monospace',
    fontSize: '8px',
    color: TEXT_COLOR,
    resolution: 2,
    ...overrides,
  };
}

// Caja FRLG: doble borde (oscuro fuera, claro dentro) + fondo claro, esquinas redondeadas pequeñas.
export function drawBox(scene, x, y, w, h, opts = {}) {
  const { fill = BOX_COLORS.fill, radius = 3, alpha = 1, depth = null } = opts;
  const g = scene.add.graphics();
  g.fillStyle(BOX_COLORS.borderDark, alpha);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(BOX_COLORS.borderLight, alpha);
  g.fillRoundedRect(x + 1, y + 1, w - 2, h - 2, Math.max(radius - 1, 1));
  g.fillStyle(fill, alpha);
  g.fillRoundedRect(x + 2, y + 2, w - 4, h - 4, Math.max(radius - 2, 1));
  if (depth !== null) g.setDepth(depth);
  return g;
}

// Texto letra a letra. Devuelve un control con skip() y la propiedad done.
export function typewriterText(scene, textObj, str, speed = 28, onDone = null) {
  let finished = false;
  const full = String(str == null ? '' : str);
  const finish = () => {
    if (finished) return;
    finished = true;
    textObj.setText(full);
    if (onDone) onDone();
  };
  if (!full.length) {
    finish();
    return { skip: finish, get done() { return finished; } };
  }
  let i = 0;
  textObj.setText('');
  const timer = scene.time.addEvent({
    delay: speed,
    repeat: full.length - 1,
    callback: () => {
      i += 1;
      textObj.setText(full.slice(0, i));
      if (i >= full.length) {
        timer.remove();
        finish();
      }
    },
  });
  return {
    skip: () => { timer.remove(); finish(); },
    get done() { return finished; },
  };
}

// Color de barra de PS según el porcentaje restante.
export function hpColor(ratio) {
  if (ratio > 0.5) return 0x30c850;
  if (ratio > 0.2) return 0xf8d048;
  return 0xf85848;
}

// Barra de PS estilo GBA: marco oscuro, pista clara y relleno coloreado.
export function drawHpBar(scene, x, y, w, h, ratio) {
  const r = Math.max(0, Math.min(1, ratio || 0));
  const g = scene.add.graphics();
  g.fillStyle(BOX_COLORS.borderDark, 1);
  g.fillRect(x, y, w, h);
  g.fillStyle(0xb8b8b0, 1);
  g.fillRect(x + 1, y + 1, w - 2, h - 2);
  if (r > 0) {
    g.fillStyle(hpColor(r), 1);
    g.fillRect(x + 1, y + 1, Math.max(1, Math.round((w - 2) * r)), h - 2);
  }
  return g;
}

// Formato de dinero: 3.000₧
export function formatMoney(n) {
  const v = Math.max(0, Math.floor(n || 0));
  return `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}₧`;
}

export const TYPE_NAMES = {
  normal: 'NORMAL', fire: 'FUEGO', water: 'AGUA', grass: 'PLANTA',
  electric: 'ELÉCTRICO', ice: 'HIELO', fighting: 'LUCHA', poison: 'VENENO',
  ground: 'TIERRA', flying: 'VOLADOR', psychic: 'PSÍQUICO', bug: 'BICHO',
  rock: 'ROCA', ghost: 'FANTASMA', dragon: 'DRAGÓN', dark: 'SINIESTRO',
  steel: 'ACERO',
};

export const TYPE_COLORS = {
  normal: 0xa8a878, fire: 0xf08030, water: 0x6890f0, grass: 0x78c850,
  electric: 0xf8d030, ice: 0x98d8d8, fighting: 0xc03028, poison: 0xa040a0,
  ground: 0xe0c068, flying: 0xa890f0, psychic: 0xf85888, bug: 0xa8b820,
  rock: 0xb8a038, ghost: 0x705898, dragon: 0x7038f8, dark: 0x705848,
  steel: 0xb8b8d0,
};

export const STATUS_LABELS = { par: 'PAR', psn: 'PSN', brn: 'QUE', slp: 'DOR', frz: 'CON' };

export const ITEM_NAMES = {
  'poke-ball': 'POKÉ BALL',
  potion: 'POCIÓN',
  antidote: 'ANTÍDOTO',
  'poke-doll': 'POKÉ MUÑECO',
  card: 'CARTA',
};

export const ITEM_DESCS = {
  'poke-ball': 'Para capturar Pokémon salvajes.',
  potion: 'Restaura 20 PS de un Pokémon.',
  antidote: 'Cura a un Pokémon envenenado.',
  'poke-doll': 'Permite huir de combates salvajes.',
  card: 'Coleccionable castizo. No hace nada... aún.',
};
