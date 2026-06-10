// Tests de integración del Módulo F contra el Supabase REAL.
// Ejecutar:
//   NODE_TLS_REJECT_UNAUTHORIZED=0 node --test tests/services.test.mjs
// (la variable TLS solo es necesaria si el cert del servidor es self-signed;
//  jamás ponerla en el código del juego).
import { register } from 'node:module';
import test from 'node:test';
import assert from 'node:assert/strict';

// config.js usa import.meta.env (Vite); en Node hay que shimearlo antes de importar.
register('./vite-env-shim.mjs', import.meta.url);

const { signUp, signIn, signOut, getSession } = await import('../src/services/auth.js');
const { saveGame, loadGame, deleteSave } = await import('../src/services/saves.js');
const { SAVE_VERSION } = await import('../src/config.js');

const EMAIL = `qa+${Date.now()}@stratomai.com`;
const PASS = `Qa!Castiza-${Date.now()}-7x`;

const dummyState = {
  version: SAVE_VERSION,
  player: { name: 'ROJO', map: 'tetuan', x: 14, y: 20, dir: 'down', money: 3000 },
  party: [{
    species: 1,
    level: 5,
    exp: 135,
    ivs: { hp: 10, atk: 20, def: 15, spa: 31, spd: 0, spe: 7 },
    currentHp: 19,
    status: null,
    sleepTurns: 0,
    moves: [
      { id: 'tackle', pp: 35, maxPp: 35 },
      { id: 'growl', pp: 40, maxPp: 40 },
    ],
    nickname: null,
    shiny: false,
  }],
  bag: { 'poke-ball': 5, potion: 3, antidote: 0 },
  pokedex: { seen: [1], caught: [1] },
  flags: { introDone: true },
  playTimeS: 42,
};

test('signUp crea un usuario nuevo (autoconfirm)', async () => {
  const res = await signUp(EMAIL, PASS);
  assert.equal(res.error, undefined, `signUp falló: ${res.error}`);
  assert.ok(res.user, 'signUp debe devolver user');
});

test('signIn devuelve sesión', async () => {
  const res = await signIn(EMAIL, PASS);
  assert.equal(res.error, undefined, `signIn falló: ${res.error}`);
  assert.ok(res.session?.access_token, 'signIn debe devolver session con access_token');
});

test('getSession devuelve la sesión activa', async () => {
  const session = await getSession();
  assert.ok(session, 'debe haber sesión tras signIn');
  assert.equal(session.user.email, EMAIL);
});

test('signIn con contraseña mala devuelve error en español sin lanzar', async () => {
  const res = await signIn(EMAIL, 'contraseña-mala-123');
  assert.ok(res.error, 'debe devolver error');
  assert.match(res.error, /incorrectos/i);
});

test('saveGame con sesión guarda en supabase', async () => {
  const res = await saveGame(dummyState);
  assert.equal(res.ok, true, `saveGame falló: ${res.error}`);
  assert.equal(res.where, 'supabase');
});

test('loadGame recupera el estado idéntico desde supabase', async () => {
  const res = await loadGame();
  assert.equal(res.ok, true, `loadGame falló: ${res.error}`);
  assert.equal(res.where, 'supabase');
  assert.deepEqual(res.state, dummyState);
});

test('loadGame descarta un guardado de versión vieja con aviso', async () => {
  const old = await saveGame({ ...dummyState, version: SAVE_VERSION - 1 });
  assert.equal(old.ok, true, `saveGame (versión vieja) falló: ${old.error}`);
  const res = await loadGame();
  assert.equal(res.ok, false, 'una versión vieja no debe cargarse');
  assert.match(res.error, /versión antigua/i);
});

test('deleteSave borra la partida (Nueva Partida)', async () => {
  const res = await deleteSave();
  assert.equal(res.ok, true, `deleteSave falló: ${res.error}`);
  const after = await loadGame();
  assert.equal(after.ok, false, 'tras borrar no debe quedar partida');
});

test('signOut cierra la sesión', async () => {
  const res = await signOut();
  assert.equal(res.error, undefined, `signOut falló: ${res.error}`);
  const session = await getSession();
  assert.equal(session, null, 'tras signOut no debe haber sesión');
});

test('sin sesión y sin localStorage (Node) saveGame/loadGame degradan sin lanzar', async () => {
  const saved = await saveGame(dummyState);
  assert.equal(saved.where, 'local');
  assert.equal(saved.ok, false, 'en Node no hay localStorage: no puede guardar');
  const loaded = await loadGame();
  assert.equal(loaded.where, 'local');
  assert.equal(loaded.ok, false);
});
