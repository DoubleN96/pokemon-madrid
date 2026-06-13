// Tests del respawn tras whiteout (último Centro Pokémon) y del round-trip de
// guardado/carga conservando la posición. Sin framework: asserts nativos.
// Ejecutar:  node tests/respawn.test.mjs
import { register } from 'node:module';
import assert from 'node:assert/strict';

import { whiteoutDestination, healPoint } from '../src/world/respawn.js';

// config.js usa import.meta.env (Vite); shim para Node antes de importar saves.
register('./vite-env-shim.mjs', import.meta.url);

let passed = 0;
let failed = 0;
function t(name, fn) {
  Promise.resolve()
    .then(fn)
    .then(() => { passed += 1; console.log(`  ✓ ${name}`); })
    .catch((err) => { failed += 1; console.error(`  ✗ ${name}\n    ${err.message}`); });
}

const MAPS = {
  tetuan: { healSpawn: { x: 25, y: 11 }, playerSpawn: { x: 6, y: 12 } },
  cpoke_tetuan: { healSpawn: { x: 5, y: 6 }, playerSpawn: { x: 5, y: 6 } },
  cpoke_chamberi: { healSpawn: { x: 5, y: 6 }, playerSpawn: { x: 5, y: 6 } },
};

console.log('\n— respawn tras whiteout (estilo FRLG) —');
t('sin Centro visitado → reaparece en la ciudad inicial (Tetuán healSpawn)', () => {
  const save = { flags: {} };
  const dest = whiteoutDestination(save, MAPS, 'tetuan');
  assert.deepEqual(dest, { map: 'tetuan', x: 25, y: 11, dir: 'down' });
});
t('con Centro visitado → reaparece en el ÚLTIMO Centro (no al inicio)', () => {
  const save = { flags: { lastCenter: { map: 'cpoke_chamberi', x: 5, y: 6, dir: 'down' } } };
  const dest = whiteoutDestination(save, MAPS, 'tetuan');
  assert.deepEqual(dest, { map: 'cpoke_chamberi', x: 5, y: 6, dir: 'down' });
});
t('lastCenter con mapa inexistente → fallback seguro a la ciudad inicial', () => {
  const save = { flags: { lastCenter: { map: 'mapa_que_no_existe', x: 1, y: 1 } } };
  const dest = whiteoutDestination(save, MAPS, 'tetuan');
  assert.equal(dest.map, 'tetuan');
});
t('healPoint construye el registro desde el healSpawn del mapa actual', () => {
  const hp = healPoint('cpoke_tetuan', MAPS.cpoke_tetuan);
  assert.deepEqual(hp, { map: 'cpoke_tetuan', x: 5, y: 6, dir: 'down' });
});

console.log('\n— guardado/carga conserva la posición (modo invitado, localStorage) —');
// Polyfill mínimo de localStorage para probar el round-trip sin red ni Supabase.
function installLocalStorage() {
  const store = new Map();
  globalThis.localStorage = {
    getItem: (k) => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => { store.set(k, String(v)); },
    removeItem: (k) => { store.delete(k); },
    clear: () => store.clear(),
  };
}
installLocalStorage();

const { saveGame, loadGame } = await import('../src/services/saves.js');
const { SAVE_VERSION } = await import('../src/config.js');

t('guardar en (x,y,map) concretos → cargar devuelve la MISMA posición', async () => {
  const state = {
    version: SAVE_VERSION,
    player: { name: 'MARCELINO', map: 'cpoke_chamberi', x: 7, y: 4, dir: 'left', money: 1234 },
    party: [{ species: 4, level: 12, currentHp: 30, status: null, sleepTurns: 0, moves: [], ivs: {} }],
    bag: {}, pokedex: { seen: [], caught: [] }, flags: { introDone: true }, playTimeS: 42,
  };
  const saved = await saveGame(state);
  assert.equal(saved.ok, true, `saveGame falló: ${saved.error}`);
  const loaded = await loadGame();
  assert.equal(loaded.ok, true, `loadGame falló: ${loaded.error}`);
  assert.equal(loaded.state.player.map, 'cpoke_chamberi', 'mapa conservado');
  assert.equal(loaded.state.player.x, 7, 'x conservada');
  assert.equal(loaded.state.player.y, 4, 'y conservada');
  assert.equal(loaded.state.player.dir, 'left', 'dirección conservada');
  assert.equal(loaded.state.player.money, 1234, 'dinero conservado');
});

// Resumen tras dar tiempo a las promesas.
setTimeout(() => {
  console.log(`\n${passed} pasados, ${failed} fallidos`);
  if (failed > 0) process.exit(1);
}, 300);
