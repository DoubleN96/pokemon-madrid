// Módulo C — menús de combate navegables con flechas + A/B:
// principal 2×2 (LUCHA/MOCHILA/POKéMON/HUIR), movimientos, mochila y equipo.
// Todos devuelven una promesa que resuelve la selección (o null si se cancela con B).
import { drawBox, bmText, TYPE_NAMES } from '../theme.js';
import { buttonFromEvent } from './keys.js';

function cursorText(scene) {
  return bmText(scene, 0, 0, '▶', { small: true, color: '#d04040', depth: 11 });
}

function moveIndex(index, button, cols, total) {
  const rows = Math.ceil(total / cols);
  let col = index % cols;
  let row = Math.floor(index / cols);
  if (button === 'left') col = (col + cols - 1) % cols;
  if (button === 'right') col = (col + 1) % cols;
  if (button === 'up') row = (row + rows - 1) % rows;
  if (button === 'down') row = (row + 1) % rows;
  const next = row * cols + col;
  return next < total ? next : index;
}

// Bucle genérico de menú: entries = [{ value, x, y, disabled? }].
function runMenu(scene, { entries, cols, canCancel = true, onMove = null, cleanup = [] }) {
  return new Promise((resolve) => {
    const cursor = cursorText(scene);
    let index = Math.max(0, entries.findIndex((e) => !e.disabled));
    const place = () => {
      cursor.setPosition(entries[index].x - 8, entries[index].y);
      if (onMove) onMove(entries[index], index);
    };
    const finish = (value) => {
      scene.input.keyboard.off('keydown', handler);
      cursor.destroy();
      cleanup.forEach((obj) => { if (obj && obj.destroy) obj.destroy(); });
      resolve(value);
    };
    const handler = (event) => {
      const button = buttonFromEvent(event);
      if (!button) return;
      if (button === 'a') {
        if (!entries[index].disabled) finish(entries[index].value);
        return;
      }
      if (button === 'b') {
        if (canCancel) finish(null);
        return;
      }
      const next = moveIndex(index, button, cols, entries.length);
      if (next !== index) {
        index = next;
        place();
      }
    };
    place();
    scene.input.keyboard.on('keydown', handler);
  });
}

// Menú principal 2×2. Resuelve 'fight' | 'bag' | 'pokemon' | 'run'.
export function mainMenu(scene) {
  const frame = drawBox(scene, 122, 112, 116, 46, { depth: 10 });
  const cleanup = [frame];
  const defs = [
    ['LUCHA', 'fight', 134, 120],
    ['MOCHILA', 'bag', 188, 120],
    ['POKéMON', 'pokemon', 134, 138],
    ['HUIR', 'run', 188, 138],
  ];
  const entries = defs.map(([label, value, x, y]) => {
    cleanup.push(bmText(scene, x, y, label, { small: true, depth: 11 }));
    return { value, x, y };
  });
  return runMenu(scene, { entries, cols: 2, canCancel: false, cleanup });
}

// Submenú de movimientos con panel de PP y tipo. Resuelve el índice o null.
export function fightMenu(scene, moves, movesData) {
  const frame = drawBox(scene, 2, 112, 160, 46, { depth: 10 });
  const info = drawBox(scene, 164, 112, 74, 46, { depth: 10 });
  const ppText = bmText(scene, 170, 120, '', { small: true, depth: 11 });
  const typeText = bmText(scene, 170, 138, '', { small: true, depth: 11 });
  const cleanup = [frame, info, ppText, typeText];
  const positions = [[16, 120], [90, 120], [16, 138], [90, 138]];
  const entries = moves.map((move, i) => {
    const data = movesData[move.id] || { name: move.id, type: 'normal' };
    const label = data.name.toUpperCase().slice(0, 12);
    cleanup.push(bmText(scene, positions[i][0], positions[i][1], label, { small: true, depth: 11 }));
    return { value: i, x: positions[i][0], y: positions[i][1], disabled: move.pp <= 0, move, data };
  });
  const onMove = (entry) => {
    ppText.setText(`PP ${entry.move.pp}/${entry.move.maxPp}`);
    typeText.setText(`TIPO/${TYPE_NAMES[entry.data.type] || '???'}`);
  };
  return runMenu(scene, { entries, cols: 2, canCancel: true, onMove, cleanup });
}

// Mochila simple: lista de objetos con cantidades + CANCELAR.
// items = [{ item, label, qty }]. Resuelve el slug del objeto o null.
export function bagMenu(scene, items) {
  const rows = items.length + 1;
  const h = rows * 14 + 12;
  const y0 = 110 - h;
  const frame = drawBox(scene, 118, y0, 120, h, { depth: 10 });
  const cleanup = [frame];
  const all = items.concat([{ item: null, label: 'CANCELAR', qty: null }]);
  const entries = all.map((it, i) => {
    const y = y0 + 7 + i * 14;
    const label = it.qty === null ? it.label : `${it.label.padEnd(10)}×${it.qty}`;
    cleanup.push(bmText(scene, 132, y, label, { small: true, depth: 11 }));
    return { value: it.item, x: 132, y };
  });
  return runMenu(scene, { entries, cols: 1, canCancel: true, cleanup });
}

// Menú SÍ/NO estilo FRLG (esquina inferior derecha, sobre el bocadillo). Resuelve
// true (SÍ) o false (NO). Con B equivale a NO (no se puede dejar sin responder).
export function yesNoMenu(scene) {
  const frame = drawBox(scene, 190, 78, 48, 30, { depth: 12 });
  const cleanup = [frame];
  const defs = [['SÍ', true, 204, 84], ['NO', false, 204, 96]];
  const entries = defs.map(([label, value, x, y]) => {
    cleanup.push(bmText(scene, x, y, label, { small: true, depth: 13 }));
    return { value, x, y };
  });
  return new Promise((resolve) => {
    let index = 0;
    const cursor = bmText(scene, 0, 0, '▶', { small: true, color: '#d04040', depth: 13 });
    const place = () => cursor.setPosition(entries[index].x - 8, entries[index].y);
    const finish = (value) => {
      scene.input.keyboard.off('keydown', handler);
      cursor.destroy();
      cleanup.forEach((o) => o && o.destroy && o.destroy());
      resolve(value);
    };
    const handler = (event) => {
      const button = buttonFromEvent(event);
      if (!button) return;
      if (button === 'a') { finish(entries[index].value); return; }
      if (button === 'b') { finish(false); return; }
      if (button === 'up' || button === 'down') {
        index = index === 0 ? 1 : 0;
        place();
      }
    };
    place();
    scene.input.keyboard.on('keydown', handler);
  });
}

// Lista del equipo para cambiar de Pokémon. rows = [{ index, label, disabled }].
// Con forced=true no se puede cancelar (cambio obligatorio tras debilitarse).
export function partyMenu(scene, rows, { forced = false } = {}) {
  const frame = drawBox(scene, 10, 8, 220, 100, { depth: 10 });
  const title = forced ? '¿A quién vas a sacar?' : 'ELIGE UN POKéMON';
  const cleanup = [frame, bmText(scene, 20, 14, title, { small: true, depth: 11 })];
  const entries = rows.map((row, i) => {
    const y = 28 + i * 13;
    const opts = { small: true, depth: 11 };
    if (row.disabled) opts.color = '#909090';
    cleanup.push(bmText(scene, 28, y, row.label, opts));
    return { value: row.index, x: 28, y, disabled: row.disabled };
  });
  return runMenu(scene, { entries, cols: 1, canCancel: !forced, cleanup });
}
