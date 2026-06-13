// Tests del Módulo PC (almacenamiento "EL PC DE FINTIPS"). Sin framework: asserts
// nativos, mismo mini-runner que tests/core.test.mjs.
// Ejecutar:  node tests/pc.test.mjs
import assert from 'node:assert/strict';

import pokedex from '../src/data/pokedex.json' with { type: 'json' };
import { createMonster } from '../src/core/monster.js';
import {
  BOX_COUNT, BOX_SIZE, PARTY_MAX, createPc, ensurePc, defaultBoxName,
  consciousCount, firstFreeSlot, firstBoxWithSpace,
  deposit, withdraw, moveInPc, sendToPc, renameBox,
} from '../src/core/pcStorage.js';

// La versión del save no influye en la lógica del PC; usamos una constante local
// para no arrastrar src/config.js (que usa import.meta.env de Vite) a este test
// puro de Node, igual que hace tests/core.test.mjs.
const SAVE_VERSION = 1;

// ---------- mini-runner ----------
let passed = 0;
let failed = 0;
function t(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    failed += 1;
    console.error(`  ✗ ${name}\n    ${err.message}`);
  }
}

const fixed = (v) => () => v;
const mk = (sp = 1, lvl = 5) => createMonster(pokedex, sp, lvl, fixed(0.5));

const BULBA = 1;
const CHARM = 4;
const SQUIRT = 7;
const RATTATA = 19;

console.log('\n— createPc / ensurePc (forma y retrocompatibilidad) —');
t('createPc: 8 cajas × 30 slots vacíos, nombres por defecto, activeBox 0', () => {
  const pc = createPc();
  assert.equal(pc.boxes.length, BOX_COUNT);
  assert.ok(pc.boxes.every((b) => b.length === BOX_SIZE && b.every((s) => s === null)));
  assert.equal(pc.names[0], defaultBoxName(0));
  assert.equal(pc.names[7], 'CAJA 8');
  assert.equal(pc.activeBox, 0);
});
t('ensurePc en save SIN pc → crea pc vacío sin tocar la versión', () => {
  const save = { version: SAVE_VERSION, party: [mk()], pc: undefined };
  const pc = ensurePc(save);
  assert.ok(save.pc === pc, 'lo engancha al save');
  assert.equal(save.version, SAVE_VERSION, 'no sube versión');
  assert.equal(firstBoxWithSpace(pc), 0);
});
t('ensurePc repara un pc parcial (cajas/slots/names incompletos)', () => {
  const save = { pc: { boxes: [[mk()]], names: [], activeBox: 99 } };
  const pc = ensurePc(save);
  assert.equal(pc.boxes.length, BOX_COUNT);
  assert.ok(pc.boxes.every((b) => b.length === BOX_SIZE));
  assert.ok(pc.boxes[0][0], 'conserva el pokémon que ya había');
  assert.equal(pc.boxes[0][1], null, 'rellena el resto con null');
  assert.equal(pc.names.length >= BOX_COUNT, true);
  assert.equal(pc.activeBox, 0, 'activeBox fuera de rango → 0');
});
t('ensurePc es idempotente (llamarlo dos veces no cambia nada)', () => {
  const save = { party: [mk()] };
  const a = ensurePc(save);
  a.boxes[2][0] = mk(CHARM);
  const b = ensurePc(save);
  assert.ok(a === b);
  assert.ok(b.boxes[2][0], 'no borra lo guardado');
});

console.log('\n— consultas (consciousCount / firstFreeSlot / firstBoxWithSpace) —');
t('consciousCount cuenta solo los conscientes (currentHp > 0)', () => {
  const a = mk(); const b = mk(CHARM); b.currentHp = 0;
  assert.equal(consciousCount([a, b]), 1);
  assert.equal(consciousCount([]), 0);
  assert.equal(consciousCount(null), 0);
});
t('firstFreeSlot devuelve el primer hueco null y -1 si está llena', () => {
  const pc = createPc();
  assert.equal(firstFreeSlot(pc, 0), 0);
  pc.boxes[0][0] = mk();
  assert.equal(firstFreeSlot(pc, 0), 1);
  pc.boxes[0] = pc.boxes[0].map(() => mk());
  assert.equal(firstFreeSlot(pc, 0), -1);
});
t('firstBoxWithSpace salta cajas llenas hasta la primera con hueco', () => {
  const pc = createPc();
  pc.boxes[0] = pc.boxes[0].map(() => mk());
  pc.boxes[1] = pc.boxes[1].map(() => mk());
  assert.equal(firstBoxWithSpace(pc), 2);
});

console.log('\n— DEPOSITAR (regla FRLG: no queda equipo sin consciente) —');
t('deposita un Pokémon: sale del equipo y entra en la caja', () => {
  const party = [mk(BULBA), mk(CHARM)];
  const pc = createPc();
  const res = deposit(party, pc, 1, 0);
  assert.equal(res.ok, true);
  assert.equal(party.length, 1, 'el equipo encoge');
  assert.equal(party[0].species, BULBA);
  assert.equal(pc.boxes[0][0].species, CHARM, 'el depositado entra en la caja');
});
t('NO puedes depositar tu único Pokémon consciente (equipo no queda vacío)', () => {
  const only = mk(BULBA);
  const party = [only];
  const pc = createPc();
  const res = deposit(party, pc, 0, 0);
  assert.equal(res.ok, false);
  assert.match(res.error, /último Pokémon/i);
  assert.equal(party.length, 1, 'el equipo NO se vacía');
  assert.equal(firstFreeSlot(pc, 0), 0, 'no se guardó nada');
});
t('SÍ puedes depositar un debilitado aunque sea el "último" en pie (queda otro consciente)', () => {
  const fainted = mk(BULBA); fainted.currentHp = 0;
  const healthy = mk(CHARM);
  const party = [healthy, fainted];
  const pc = createPc();
  // depositar el debilitado deja 1 consciente: permitido
  const res = deposit(party, pc, 1, 0);
  assert.equal(res.ok, true);
  assert.equal(party.length, 1);
  assert.equal(party[0].species, CHARM);
});
t('NO puedes depositar el único CONSCIENTE aunque haya debilitados en el equipo', () => {
  const healthy = mk(CHARM);
  const fainted = mk(BULBA); fainted.currentHp = 0;
  const party = [healthy, fainted];
  const pc = createPc();
  const res = deposit(party, pc, 0, 0); // intentar guardar el único en pie
  assert.equal(res.ok, false, 'bloqueado: dejaría al equipo sin nadie capaz de luchar');
  assert.equal(party.length, 2);
});
t('deposit en caja llena devuelve error sin mutar', () => {
  const party = [mk(BULBA), mk(CHARM)];
  const pc = createPc();
  pc.boxes[0] = pc.boxes[0].map(() => mk());
  const res = deposit(party, pc, 1, 0);
  assert.equal(res.ok, false);
  assert.equal(party.length, 2, 'no se tocó el equipo');
});
t('deposit con índice de equipo vacío devuelve error', () => {
  const party = [mk(BULBA)];
  const pc = createPc();
  const res = deposit(party, pc, 5, 0);
  assert.equal(res.ok, false);
});

console.log('\n— RETIRAR (regla FRLG: equipo máx 6) —');
t('retira un Pokémon de la caja al equipo', () => {
  const party = [mk(BULBA)];
  const pc = createPc();
  const stored = mk(SQUIRT);
  pc.boxes[0][3] = stored;
  const res = withdraw(party, pc, 0, 3);
  assert.equal(res.ok, true);
  assert.equal(party.length, 2);
  assert.equal(party[1], stored, 'el mismo objeto entra al equipo');
  assert.equal(pc.boxes[0][3], null, 'el slot de la caja queda vacío');
});
t('NO puedes retirar si el equipo ya tiene 6', () => {
  const party = Array.from({ length: PARTY_MAX }, () => mk(BULBA));
  const pc = createPc();
  pc.boxes[0][0] = mk(SQUIRT);
  const res = withdraw(party, pc, 0, 0);
  assert.equal(res.ok, false);
  assert.match(res.error, /completo/i);
  assert.equal(party.length, 6, 'el equipo no crece');
  assert.ok(pc.boxes[0][0], 'el pokémon sigue en la caja');
});
t('retirar de un slot vacío devuelve error', () => {
  const party = [mk(BULBA)];
  const pc = createPc();
  const res = withdraw(party, pc, 0, 0);
  assert.equal(res.ok, false);
});

console.log('\n— MOVER dentro del PC (colocar y swap) —');
t('mover a un slot vacío de otra caja', () => {
  const pc = createPc();
  const a = mk(BULBA);
  pc.boxes[0][0] = a;
  const res = moveInPc(pc, 0, 0, 3, 10);
  assert.equal(res.ok, true);
  assert.equal(res.swapped, false);
  assert.equal(pc.boxes[0][0], null);
  assert.equal(pc.boxes[3][10], a);
});
t('mover a un slot ocupado INTERCAMBIA ambos', () => {
  const pc = createPc();
  const a = mk(BULBA); const b = mk(CHARM);
  pc.boxes[0][0] = a;
  pc.boxes[1][5] = b;
  const res = moveInPc(pc, 0, 0, 1, 5);
  assert.equal(res.ok, true);
  assert.equal(res.swapped, true);
  assert.equal(pc.boxes[1][5], a);
  assert.equal(pc.boxes[0][0], b);
});
t('mover a su mismo sitio es un no-op válido', () => {
  const pc = createPc();
  const a = mk(BULBA);
  pc.boxes[0][0] = a;
  const res = moveInPc(pc, 0, 0, 0, 0);
  assert.equal(res.ok, true);
  assert.equal(pc.boxes[0][0], a);
});
t('mover desde un slot vacío devuelve error', () => {
  const pc = createPc();
  const res = moveInPc(pc, 0, 0, 1, 1);
  assert.equal(res.ok, false);
});

console.log('\n— OVERFLOW al capturar con equipo lleno (sendToPc) —');
t('overflow: va a la primera caja con hueco (caja 0, slot 0)', () => {
  const pc = createPc();
  const caught = mk(RATTATA);
  const res = sendToPc(pc, caught);
  assert.equal(res.ok, true);
  assert.equal(res.boxIndex, 0);
  assert.equal(res.slot, 0);
  assert.equal(pc.boxes[0][0], caught);
});
t('overflow: salta cajas llenas y usa la primera con hueco', () => {
  const pc = createPc();
  pc.boxes[0] = pc.boxes[0].map(() => mk());      // caja 0 llena
  pc.boxes[1] = pc.boxes[1].map(() => mk());      // caja 1 llena
  pc.boxes[2][7] = mk();                            // caja 2 con un hueco antes (slot 0)
  const caught = mk(RATTATA);
  const res = sendToPc(pc, caught);
  assert.equal(res.boxIndex, 2);
  assert.equal(res.slot, 0, 'primer hueco libre de la caja 2');
  assert.equal(pc.boxes[2][0], caught);
});
t('overflow con TODO el PC lleno → ok:false (no se pierde, se avisa)', () => {
  const pc = createPc();
  for (let i = 0; i < BOX_COUNT; i += 1) pc.boxes[i] = pc.boxes[i].map(() => mk());
  const res = sendToPc(pc, mk(RATTATA));
  assert.equal(res.ok, false);
  assert.match(res.error, /hasta arriba|lleno/i);
});

console.log('\n— RENOMBRAR caja (opcional) —');
t('renombra una caja saneando el texto (mayúsculas, máx 9)', () => {
  const pc = createPc();
  const res = renameBox(pc, 0, 'rentables!!');
  assert.equal(res.ok, true);
  assert.equal(pc.names[0], 'RENTABLES');
});
t('nombre vacío vuelve al por defecto', () => {
  const pc = createPc();
  renameBox(pc, 2, 'XXX');
  renameBox(pc, 2, '   ');
  assert.equal(pc.names[2], 'CAJA 3');
});

console.log('\n— round-trip de integración (party → caja → party) —');
t('depositar y volver a retirar preserva el objeto y las reglas', () => {
  const a = mk(BULBA); const b = mk(CHARM);
  const party = [a, b];
  const pc = createPc();
  const dep = deposit(party, pc, 1, 0); // guarda CHARM
  assert.equal(dep.ok, true);
  assert.equal(party.length, 1);
  const wd = withdraw(party, pc, 0, 0); // saca CHARM
  assert.equal(wd.ok, true);
  assert.equal(party.length, 2);
  assert.equal(party[1], b, 'es exactamente el mismo objeto Monster');
  assert.equal(pc.boxes[0][0], null);
});

// ---------- resumen ----------
console.log(`\n${passed} pasados, ${failed} fallidos`);
if (failed > 0) process.exit(1);
