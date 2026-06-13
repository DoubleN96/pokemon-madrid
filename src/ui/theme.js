// Módulo D — Estética compartida estilo GBA FRLG: cajas, texto, barras y constantes de UI.
import Phaser from 'phaser';
// Los nombres/descripciones de objetos viven ahora en el catálogo central
// (core/items.js). Se re-exportan aquí para no romper a quien ya los importaba
// desde theme.js (MenuScene, BattleScene, ui/shop.js).
import { ITEM_NAMES as _ITEM_NAMES, ITEM_DESCS as _ITEM_DESCS } from '../core/items.js';

// ─────────────────────────────────────────────────────────────────────────────
// FUENTE BITMAP NÍTIDA (BitmapText)
// ─────────────────────────────────────────────────────────────────────────────
// El texto se dibujaba antes con Phaser.GameObjects.Text (fuente web FRLG vía
// @font-face, rasterizada en el canvas 240×160 y reescalada canvas→carcasa→
// pantalla de alta DPI): el doble/triple reescalado lo ABLANDABA y se veía
// borroso en móvil, peor con texto denso (queja nº1 de Marcelino en el Pixel 10 XL).
//
// SOLUCIÓN: fuentes BITMAP pre-renderizadas SIN antialiasing (scripts/
// gen_bitmap_font.py → public/assets/fonts/frlg16.{png,fnt} y frlg10.{png,fnt}).
// Cada glifo es un trozo de textura colocado pixel-perfect; con pixelArt:true
// (NEAREST) los bordes quedan DUROS sin halo al escalar. Texto CRUJIENTE de verdad.
//
// Dos tamaños nativos (se eligen por legibilidad, NUNCA se reescalan a no-enteros
// para no emborronar):
//   - 'frlg16' (16px): superficies de LECTURA con mucho texto → diálogo, mensaje
//     de combate, intro. Es la prioridad.
//   - 'frlg10' (10px): etiquetas compactas → menús, databoxes, tienda, plaquita.
export const BM_FONT = 'frlg16';   // fuente bitmap grande (diálogo/combate)
export const BM_FONT_SMALL = 'frlg10'; // fuente bitmap compacta (menús/HUD)

// Convierte '#rrggbb' o '#rgb' a entero 0xRRGGBB para BitmapText.setTint().
function hexToInt(c) {
  if (typeof c !== 'string') return null;
  let h = c.trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  const n = parseInt(h, 16);
  return Number.isNaN(n) ? null : n;
}

// Helper central para crear texto BITMAP nítido. Sustituye a scene.add.text(...).
//   bmText(scene, x, y, 'HOLA')                        // 16px, color oscuro
//   bmText(scene, x, y, 'PS', { small: true })         // 10px compacto
//   bmText(scene, x, y, 'X', { color: '#d04040' })     // tinte de color
//   bmText(scene, x, y, txt, { wrap: 214 })            // word-wrap a 214px
// Devuelve un Phaser.GameObjects.BitmapText (soporta setText/setOrigin/setDepth/
// setVisible/setTint igual que el flujo anterior). El typewriter usa setText().
export function bmText(scene, x, y, str, opts = {}) {
  const {
    small = false, size = null, color = null, wrap = null,
    origin = null, depth = null, lineSpacing = null, letterSpacing = null,
  } = opts;
  const fontKey = small ? BM_FONT_SMALL : BM_FONT;
  const nativeSize = small ? 10 : 16;
  const t = scene.add.bitmapText(x, y, fontKey, String(str == null ? '' : str), nativeSize);
  // Tinte: por defecto casi-negro para máximo contraste sobre las cajas claras.
  const tint = hexToInt(color) != null ? hexToInt(color) : 0x181818;
  t.setTint(tint);
  if (size && size !== nativeSize) t.setFontSize(size);
  if (wrap) t.setMaxWidth(wrap);
  if (lineSpacing != null) t.setLineSpacing(lineSpacing);
  if (letterSpacing != null) t.setLetterSpacing(letterSpacing);
  if (origin != null) {
    if (Array.isArray(origin)) t.setOrigin(origin[0], origin[1]);
    else t.setOrigin(origin);
  }
  if (depth != null) t.setDepth(depth);
  return t;
}

// Devuelve las líneas resultantes de envolver `str` con el ancho máximo actual del
// BitmapText (BitmapText no tiene getWrappedText como Text). Lo usa la paginación
// del diálogo/combate para trocear en páginas de 2 renglones.
export function bmWrap(bitmapText, str) {
  const s = String(str == null ? '' : str);
  const prev = bitmapText.text;
  bitmapText.setText(s);
  const bounds = bitmapText.getTextBounds(false);
  // Phaser rellena lines/words en getTextBounds cuando hay maxWidth; reconstruimos
  // las líneas a partir del texto envuelto que Phaser calcula internamente.
  let wrapped;
  const maxW = bitmapText.maxWidth || bitmapText._maxWidth || 0;
  if (maxW > 0 && typeof bitmapText.getTextBounds === 'function') {
    // Phaser parte el texto en \n cuando hay maxWidth; getTextBounds no expone las
    // líneas directamente, así que replicamos su algoritmo de wrap por palabras.
    wrapped = wrapByWidth(bitmapText, s, maxW);
  } else {
    wrapped = s.split('\n');
  }
  bitmapText.setText(prev);
  return wrapped;
}

// Envuelve por palabras midiendo con el ancho real de cada glifo del BitmapText.
function wrapByWidth(bitmapText, str, maxWidth) {
  const lines = [];
  for (const rawLine of str.split('\n')) {
    const words = rawLine.split(' ');
    let cur = '';
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      const width = measureBm(bitmapText, test);
      if (width > maxWidth && cur) {
        lines.push(cur);
        cur = w;
      } else {
        cur = test;
      }
    }
    lines.push(cur);
  }
  return lines;
}

// Mide el ancho en px de una cadena con la fuente/escala del BitmapText.
function measureBm(bitmapText, str) {
  const prev = bitmapText.text;
  const hadMax = bitmapText.maxWidth;
  bitmapText.setMaxWidth(0);
  bitmapText.setText(str);
  const w = bitmapText.width;
  bitmapText.setText(prev);
  bitmapText.setMaxWidth(hadMax || 0);
  return w;
}

export const BOX_COLORS = {
  fill: 0xf8f8f8,        // fondo de caja FRLG
  borderDark: 0x585858,  // borde exterior
  borderLight: 0xa0a0a0, // borde interior
  panelTeam: 0x98d8c0,   // fondo panel equipo
  panelBag: 0xe8e0c0,    // fondo panel mochila
  panelDex: 0xc04838,    // fondo panel pokédex
  panelDetail: 0xd0e8f8, // fondo panel detalle
};

// Texto bien OSCURO sobre la caja clara para máximo contraste (antes #383838,
// se veía grisáceo en móvil). Casi negro = trazo nítido y "crujiente".
export const TEXT_COLOR = '#181818';
export const TEXT_COLOR_LIGHT = '#f8f8f8';
export const TEXT_COLOR_DIM = '#707070';

// Sombra clara de 1px bajo el texto oscuro: define el borde de cada glifo (le
// da el aspecto nítido tipo GBA) sin emborronar el píxel-art.
export const TEXT_SHADOW = '#c8c8c8';

// Fuente píxel del juego: la AUTÉNTICA de Pokémon Rojo Fuego/Verde Hoja (GBA),
// cargada vía @font-face en index.html bajo el alias 'PixelMadrid'. Es una
// recreación libre con trazos GRUESOS de 2px pensada para leerse a tamaño
// pequeño en la pantalla GBA — por eso sale legible y nítida en móvil (al
// contrario que las pixel-fonts finas como Pixelify, que se veían como hilos
// grises). El fallback a 'monospace' cubre los pocos glifos que no trae
// (cursores ▶ ▼ ↑ ↓, ₧ pesetas, € y ★), igual que antes.
export const GAME_FONT = '"PixelMadrid", monospace';

// Estilo de texto estándar del juego. La fuente FRLG es monoespaciada y su
// rejilla cae en píxeles enteros; a 10px se lee CLARA y GRUESA en la pantalla
// GBA escalada en móvil. resolution 4 rasteriza a 4× para que no haya bordes
// borrosos al escalar, y la sombra clara de 1px remata el contraste.
export function textStyle(overrides = {}) {
  const { shadow: shadowOverride, ...rest } = overrides;
  return {
    fontFamily: GAME_FONT,
    fontSize: '10px',
    color: TEXT_COLOR,
    resolution: 4,
    shadow: shadowOverride === null
      ? { offsetX: 0, offsetY: 0, color: '#000', blur: 0, stroke: false, fill: false }
      : { offsetX: 0, offsetY: 1, color: TEXT_SHADOW, blur: 0, stroke: false, fill: true, ...(shadowOverride || {}) },
    ...rest,
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

// Re-exportados del catálogo central (core/items.js).
export const ITEM_NAMES = _ITEM_NAMES;
export const ITEM_DESCS = _ITEM_DESCS;
