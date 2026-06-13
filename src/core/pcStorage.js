// Módulo PC — Sistema de Almacenamiento "EL PC DE FINTIPS" (cajas de Bill, FRLG).
// Lógica PURA sin Phaser: el save guarda los Pokémon depositados en cajas y aquí
// viven las reglas de depositar/retirar/mover + el overflow al capturar con el
// equipo lleno. La UI (PcScene) y BattleScene solo orquestan estas funciones.
//
// Forma de datos (retrocompatible: un save SIN `pc` se trata como cajas vacías):
//   save.pc = {
//     boxes:   Array<Array<Monster|null>>  // BOX_COUNT cajas × BOX_SIZE slots
//     names:   string[]                    // nombre de cada caja
//     activeBox: number                    // caja seleccionada por defecto en la UI
//   }
// Un Monster es EXACTAMENTE el mismo objeto que en save.party (mismo formato).

export const BOX_COUNT = 8;   // nº de cajas del PC (FRLG tiene 14; aquí 8)
export const BOX_SIZE = 30;   // slots por caja (igual que FRLG: 6×5)
export const PARTY_MAX = 6;   // equipo máximo (regla FRLG)

// Nombre por defecto de la caja i (0-based) → "CAJA 1", "CAJA 2"...
export function defaultBoxName(i) {
  return `CAJA ${i + 1}`;
}

// Crea una estructura de PC vacía y bien formada.
export function createPc() {
  return {
    boxes: Array.from({ length: BOX_COUNT }, () => Array(BOX_SIZE).fill(null)),
    names: Array.from({ length: BOX_COUNT }, (_, i) => defaultBoxName(i)),
    activeBox: 0,
  };
}

// Normaliza/repara un save para garantizar que `save.pc` existe y está bien
// formado (saves viejos sin `pc`, o con cajas/longitudes incompletas). Muta el
// save in-place de forma segura e idempotente y devuelve el `pc`.
// IMPORTANTE: no sube la versión del save; solo rellena lo que falte.
export function ensurePc(save) {
  if (!save || typeof save !== 'object') return createPc();
  if (!save.pc || typeof save.pc !== 'object') save.pc = createPc();
  const pc = save.pc;
  if (!Array.isArray(pc.boxes)) pc.boxes = [];
  // Garantiza BOX_COUNT cajas, cada una con BOX_SIZE slots (rellena con null).
  while (pc.boxes.length < BOX_COUNT) pc.boxes.push(Array(BOX_SIZE).fill(null));
  for (let i = 0; i < pc.boxes.length; i += 1) {
    if (!Array.isArray(pc.boxes[i])) pc.boxes[i] = Array(BOX_SIZE).fill(null);
    while (pc.boxes[i].length < BOX_SIZE) pc.boxes[i].push(null);
  }
  if (!Array.isArray(pc.names)) pc.names = [];
  for (let i = 0; i < pc.boxes.length; i += 1) {
    if (typeof pc.names[i] !== 'string' || !pc.names[i]) pc.names[i] = defaultBoxName(i);
  }
  const maxBox = pc.boxes.length - 1;
  if (!Number.isInteger(pc.activeBox) || pc.activeBox < 0 || pc.activeBox > maxBox) {
    pc.activeBox = 0;
  }
  return pc;
}

// ---------- consultas ----------

// nº de Pokémon conscientes (no debilitados) en el equipo. La regla FRLG impide
// quedarte sin NINGÚN Pokémon consciente en el equipo (no puedes depositar el
// último que aguanta en pie).
export function consciousCount(party) {
  return (party || []).filter((m) => m && m.currentHp > 0).length;
}

// Índice del primer slot vacío de la caja `boxIndex`, o -1 si está llena.
export function firstFreeSlot(pc, boxIndex) {
  const box = pc.boxes[boxIndex];
  if (!box) return -1;
  return box.findIndex((s) => s == null);
}

// Índice de la primera caja con al menos un hueco libre, o -1 si TODO el PC está
// lleno. Se usa en el overflow de captura (estilo FRLG: "la primera con hueco").
export function firstBoxWithSpace(pc) {
  for (let i = 0; i < pc.boxes.length; i += 1) {
    if (firstFreeSlot(pc, i) >= 0) return i;
  }
  return -1;
}

// ---------- operaciones (devuelven { ok, error?, ... } sin lanzar) ----------

// DEPOSITAR: mueve party[partyIndex] al primer hueco de la caja `boxIndex`.
// Reglas FRLG: no puedes depositar tu ÚLTIMO Pokémon consciente. Muta party y pc.
export function deposit(party, pc, partyIndex, boxIndex) {
  const mon = (party || [])[partyIndex];
  if (!mon) return { ok: false, error: 'No hay ningún Pokémon en ese hueco del equipo.' };
  if (mon.currentHp > 0 && consciousCount(party) <= 1) {
    return { ok: false, error: 'No puedes guardar a tu último Pokémon en condiciones de luchar.' };
  }
  const slot = firstFreeSlot(pc, boxIndex);
  if (slot < 0) return { ok: false, error: 'Esa caja está hasta los topes, majo.' };
  pc.boxes[boxIndex][slot] = mon;
  party.splice(partyIndex, 1);
  return { ok: true, boxIndex, slot, mon };
}

// RETIRAR: mueve pc.boxes[boxIndex][slot] al equipo.
// Reglas FRLG: el equipo no puede pasar de 6. Muta party y pc.
export function withdraw(party, pc, boxIndex, slot) {
  const box = pc.boxes[boxIndex];
  const mon = box ? box[slot] : null;
  if (!mon) return { ok: false, error: 'Ahí no hay ningún Pokémon que sacar.' };
  if ((party || []).length >= PARTY_MAX) {
    return { ok: false, error: 'Tu equipo ya está completo (6 Pokémon).' };
  }
  box[slot] = null;
  party.push(mon);
  return { ok: true, mon, partyIndex: party.length - 1 };
}

// MOVER dentro del PC: lleva un Pokémon de (fromBox, fromSlot) a (toBox, toSlot).
// Si el destino está OCUPADO, intercambia ambos (swap). Si está vacío, lo coloca.
// Mover a su mismo sitio es un no-op válido. Muta pc.
export function moveInPc(pc, fromBox, fromSlot, toBox, toSlot) {
  const src = pc.boxes[fromBox];
  const dst = pc.boxes[toBox];
  if (!src || !dst) return { ok: false, error: 'Caja no válida.' };
  const mon = src[fromSlot];
  if (!mon) return { ok: false, error: 'Ahí no hay nada que mover.' };
  if (fromBox === toBox && fromSlot === toSlot) return { ok: true, swapped: false };
  const target = dst[toSlot];
  dst[toSlot] = mon;
  src[fromSlot] = target ?? null; // swap si había algo; null si estaba vacío
  return { ok: true, swapped: target != null };
}

// OVERFLOW al capturar con el equipo lleno: mete `mon` en la primera caja con
// hueco. Devuelve { ok, boxIndex, slot } o { ok:false } si TODO el PC está lleno.
// Muta pc. (BattleScene lo llama tras una captura cuando party.length >= 6.)
export function sendToPc(pc, mon) {
  if (!mon) return { ok: false, error: 'No hay Pokémon que enviar.' };
  const boxIndex = firstBoxWithSpace(pc);
  if (boxIndex < 0) return { ok: false, error: 'El PC de FinTips está hasta arriba: no cabe ni un activo más.' };
  const slot = firstFreeSlot(pc, boxIndex);
  pc.boxes[boxIndex][slot] = mon;
  return { ok: true, boxIndex, slot };
}

// Renombra una caja (opcional). Sanea el nombre como los nombres del juego:
// mayúsculas, sin caracteres raros, máx 9. Cadena vacía → vuelve al nombre por
// defecto. Muta pc.
export function renameBox(pc, boxIndex, rawName) {
  if (!pc.boxes[boxIndex]) return { ok: false, error: 'Caja no válida.' };
  const clean = String(rawName || '')
    .toUpperCase()
    .replace(/[^A-ZÁÉÍÓÚÑ0-9 ]/g, '')
    .trim()
    .slice(0, 9);
  pc.names[boxIndex] = clean || defaultBoxName(boxIndex);
  return { ok: true, name: pc.names[boxIndex] };
}
