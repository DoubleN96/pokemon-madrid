// E2E Mundo conectado: verifica que los GIMNASIOS y la ZONA NUEVA (Ruta 3 · Gran
// Vía) quedaron ACCESIBLES y JUGABLES tras engancharlos en src/world/maps.js.
//
// Flujo:
//   1) Nueva partida (invitado) → intro → inicial → llega al mundo (Tetuán).
//   2) GIMNASIO: teletransporte a Chamberí justo bajo la puerta del Gimnasio
//      Trading (14,10), se CAMINA arriba hasta pisarla y se comprueba que el warp
//      cambia save.player.map al interior 'gym_trading'. (También se prueba salir.)
//   3) ZONA NUEVA: teletransporte al corredor sur de Chamberí (14,28), se camina
//      hacia abajo hasta el warp (14,29) y se comprueba que se llega a 'ruta3'.
//
// Patrón calcado de piso.mjs: ?canvas=1, swiftshader, window.game, filtro de
// ruido de audio del Chromium headless. El teletransporte usa la MISMA mecánica
// que el motor (scene.restart con {map,x,y,dir}) — no salta colisiones: el cambio
// de mapa solo ocurre si la puerta es realmente alcanzable y pisable.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:5173') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
const isAudioNoise = (s) => /decode audio|Unable to decode|Failed to process file|audio /i.test(String(s));
page.on('pageerror', (e) => { if (!isAudioNoise(e.message)) errors.push(`pageerror: ${e.message}`); });
page.on('console', (m) => { if (m.type() === 'error' && !isAudioNoise(m.text())) errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/world-${n}.png` });
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const save = () => ev("(() => { const s=window.game.registry.get('save'); return s?{map:s.player.map,x:s.player.x,y:s.player.y,dir:s.player.dir}:null })()");
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };

// Teletransporta usando la mecánica del motor (igual que useWarp): fija la
// posición en el save y reinicia la escena World con {map,x,y,dir}. No atraviesa
// colisión: solo coloca al jugador en una baldosa pisable concreta.
async function teleport(map, x, y, dir = 'down') {
  await ev(`(() => {
    const s = window.game.registry.get('save');
    s.player.map = '${map}'; s.player.x = ${x}; s.player.y = ${y}; s.player.dir = '${dir}';
    window.game.registry.set('save', s);
    const w = window.game.scene.getScene('World');
    w.scene.restart({ map: '${map}', x: ${x}, y: ${y}, dir: '${dir}' });
  })()`);
  await sleep(900);
}

// Camina en una dirección hasta que se cumpla cond() o se agoten los intentos.
async function walkUntil(key, cond, tries = 12) {
  for (let i = 0; i < tries; i++) {
    if (await cond()) return true;
    await page.keyboard.down(key); await sleep(320); await page.keyboard.up(key); await sleep(220);
  }
  return await cond();
}

console.log('1. Nueva partida (invitado) → mundo');
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 800);
await page.locator('button', { hasText: 'SIN CUENTA' }).click();
await sleep(1500);
for (let i = 0; i < 30; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 420); }
if (await page.locator('input').count() === 0) await fail('no llegó al nombre');
await page.locator('input').press('Enter');
await sleep(1200);
for (let i = 0; i < 18; i++) { const r = await ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 420); }
await press('z', 12, 450);
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó al mundo');
await sleep(600);
await shot('01-mundo');
console.log('   en el mundo:', JSON.stringify(await save()));

// ============================================================================
// 2) GIMNASIO: caminar a la puerta del Gimnasio Trading (Chamberí 14,10)
// ============================================================================
console.log('2. Caminar a la PUERTA del Gimnasio Trading (Chamberí 14,10) → warp al interior');
// Colocar al jugador en (14,11), justo DEBAJO de la puerta del gimnasio, mirando arriba.
await teleport('chamberi', 14, 11, 'up');
let cpos = await save();
console.log('   tras teletransporte:', JSON.stringify(cpos));
if (!cpos || cpos.map !== 'chamberi') await fail('teletransporte a Chamberí falló');
await shot('02-ante-gym');

// Caminar ARRIBA: al pisar (14,10) el warp cambia el mapa a 'gym_trading'.
const enteredGym = await walkUntil('ArrowUp', async () => {
  const p = await save();
  return !!(p && p.map === 'gym_trading');
}, 10);
const gymPos = await save();
if (!enteredGym) await fail(`no entró al gimnasio; quedó en ${JSON.stringify(gymPos)}`);
await sleep(500);
await shot('03-dentro-gym');
console.log('   ✅ DENTRO del gimnasio:', JSON.stringify(gymPos));

// Salir del gimnasio (bajar al felpudo) → vuelve a 'chamberi'.
const exitedGym = await walkUntil('ArrowDown', async () => {
  const p = await save();
  return !!(p && p.map === 'chamberi');
}, 12);
console.log('   salida del gimnasio:', exitedGym ? `de vuelta en ${JSON.stringify(await save())}` : 'NO salió (no bloqueante)');

// ============================================================================
// 3) ZONA NUEVA: llegar a Ruta 3 · Gran Vía por la salida sur de Chamberí
// ============================================================================
console.log('3. Llegar a la ZONA NUEVA (Ruta 3 · Gran Vía) por el sur de Chamberí');
// Corredor sur: colocar en (14,28) mirando abajo; el warp está en (14,29).
await teleport('chamberi', 14, 28, 'down');
const spos = await save();
console.log('   en el corredor sur:', JSON.stringify(spos));
if (!spos || spos.map !== 'chamberi') await fail('teletransporte al corredor sur falló');
await shot('04-corredor-sur');

const reachedRuta3 = await walkUntil('ArrowDown', async () => {
  const p = await save();
  return !!(p && p.map === 'ruta3');
}, 8);
const r3pos = await save();
if (!reachedRuta3) await fail(`no se llegó a Ruta 3; quedó en ${JSON.stringify(r3pos)}`);
await sleep(500);
await shot('05-en-ruta3');
console.log('   ✅ EN RUTA 3 · GRAN VÍA:', JSON.stringify(r3pos));

// ============================================================================
// 4) COBERTURA EXTRA (no bloqueante salvo el gimnasio de Tetuán):
//    - Gimnasio Cashflow (Tetuán 20,9): caminar a la puerta → 'gym_cashflow'.
//    - Continuar Ruta 3 → Parque del Retiro por el sur (x10-11, y33).
// ============================================================================
console.log('4. Cobertura extra: Gimnasio Cashflow (Tetuán) + Ruta 3 → Retiro');
// Gimnasio de Tetuán: colocar bajo la puerta (20,10) mirando arriba.
await teleport('tetuan', 20, 10, 'up');
const tpos = await save();
console.log('   ante Gimnasio Cashflow:', JSON.stringify(tpos));
const enteredCashflow = await walkUntil('ArrowUp', async () => {
  const p = await save();
  return !!(p && p.map === 'gym_cashflow');
}, 8);
if (!enteredCashflow) await fail(`no entró al Gimnasio Cashflow; quedó en ${JSON.stringify(await save())}`);
await shot('06-gym-cashflow');
console.log('   ✅ DENTRO del Gimnasio Cashflow:', JSON.stringify(await save()));

// Ruta 3 → Retiro: colocar cerca de la salida sur de Ruta 3 (10,32) mirando abajo.
await teleport('ruta3', 10, 32, 'down');
const reachedRetiro = await walkUntil('ArrowDown', async () => {
  const p = await save();
  return !!(p && p.map === 'retiro');
}, 6);
console.log('   Ruta 3 → Retiro:', reachedRetiro ? `EN ${JSON.stringify(await save())}` : 'NO (no bloqueante)');

// ============================================================================
// RESUMEN
// ============================================================================
console.log('\n=== RESUMEN MUNDO ===');
const realErrors = errors.filter((e) => !e.includes('favicon'));
console.log('Gimnasio alcanzable  : gym_trading  (puerta Chamberí 14,10) →', enteredGym ? 'PASS' : 'FALLO');
console.log('Zona nueva alcanzable: ruta3        (salida sur Chamberí)   →', reachedRuta3 ? 'PASS' : 'FALLO');
console.log('Gimnasio alcanzable  : gym_cashflow (puerta Tetuán  20,9)   →', enteredCashflow ? 'PASS' : 'FALLO');
console.log('Cadena de zona nueva : ruta3 → retiro                       →', reachedRetiro ? 'PASS' : '(no bloqueante)');
console.log('Errores consola:', realErrors.length);
realErrors.slice(0, 8).forEach((e) => console.log('  -', e.slice(0, 140)));

if (enteredGym && reachedRuta3 && enteredCashflow && realErrors.length === 0) {
  console.log('\nWORLD E2E: PASS ✅ (gimnasio Trading entrable + Ruta 3 alcanzable, sin errores)');
  await browser.close(); process.exit(0);
} else {
  console.log('\nWORLD E2E: REVISAR ⚠️');
  await browser.close(); process.exit(2);
}
