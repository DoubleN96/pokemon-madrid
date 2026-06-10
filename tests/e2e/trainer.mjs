// E2E de COMBATE DE ENTRENADOR (invitado): título → intro → inicial → mundo →
// inyectar combate de entrenador vía WorldScene.startTrainerBattle → machacar Z
// hasta que acabe → verificar (a) terminó, (b) dinero +~200, (c) flag = true.
// Uso: node tests/e2e/trainer.mjs [URL]   (requiere `npm run dev` en :5173)
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:5173') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const shot = (n) => page.screenshot({ path: `tests/e2e/shots/trainer-${n}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (key, times = 1, delay = 350) => {
  for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(delay); }
};
const evalGame = (fn) => page.evaluate(fn);
const sceneActive = (key) => evalGame(`window.game && window.game.scene.isActive('${key}')`);
const saveSnap = () => evalGame(`(() => { const s = window.game.registry.get('save'); return s ? JSON.stringify({ money: s.player.money, flags: s.flags, party: s.party.map(p => p.species+':'+p.currentHp) }) : null })()`);
const fail = async (msg) => {
  console.error('FAIL:', msg);
  await shot('FAIL');
  console.error('errores:', errors.slice(0, 8));
  await browser.close();
  process.exit(1);
};

const TRAINER = {
  name: 'TEST',
  party: [{ species: 16, level: 3 }, { species: 19, level: 3 }],
  intro: ['¡Hola!'],
  win: ['¡Vaya!'],
  defeat: ['Ja'],
  prize: 200,
  flag: 'test_t',
};

console.log('1. Título (storage limpio)');
await page.goto(URL, { waitUntil: 'networkidle' });
await sleep(500);
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} }).catch(() => {});
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await shot('01-titulo');

console.log('2. A → SIN CUENTA');
await press('z', 1, 800);
const guestBtn = page.locator('button', { hasText: 'SIN CUENTA' });
try { await guestBtn.waitFor({ timeout: 5000 }); } catch { await fail('no apareció el panel de cuenta'); }
await guestBtn.click();
await sleep(1500);

console.log('3. Intro: avanzar hasta el panel de nombre');
for (let i = 0; i < 25; i++) {
  if (await page.locator('input').count() > 0) break;
  await press('z', 1, 450);
}
if (await page.locator('input').count() === 0) await fail('no llegó el panel de nombre');
await page.locator('input').fill('MARCE');
await page.locator('input').press('Enter');
await sleep(1200);

console.log('4. Elegir inicial + confirmar');
for (let i = 0; i < 20; i++) {
  const ready = await evalGame("(() => { const sc = window.game.scene.getScene('Intro'); return !!(sc && sc.starterSprites && sc.starterSprites.length) })()");
  if (ready) break;
  await press('z', 1, 450);
}
await press('z', 1, 600);          // elegir el primero (Bulbasaur)
await press('z', 10, 500);          // confirmación + diálogos post-elección

let inWorld = false;
for (let i = 0; i < 20; i++) { if (await sceneActive('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó a World tras la intro');
await sleep(800);
await shot('05-mundo');

const before = JSON.parse(await saveSnap());
console.log('   estado pre-combate:', JSON.stringify(before));
if (!before || before.party.length === 0) await fail('el equipo está vacío antes del combate');

console.log('5. Inyectar combate de entrenador (startTrainerBattle)');
const launched = await evalGame(`(() => {
  const w = window.game.scene.getScene('World');
  if (!w || typeof w.startTrainerBattle !== 'function') return 'no-method';
  w.startTrainerBattle(${JSON.stringify(TRAINER)});
  return 'ok';
})()`);
if (launched !== 'ok') await fail('WorldScene.startTrainerBattle no disponible: ' + launched);

let inBattle = false;
for (let i = 0; i < 16; i++) { if (await sceneActive('Battle')) { inBattle = true; break; } await sleep(400); }
if (!inBattle) await fail('no se abrió la escena Battle de entrenador');
await sleep(1500);
await shot('06-combate');

console.log('6. Machacar Z hasta que el combate acabe');
let over = false;
for (let i = 0; i < 260; i++) {
  if (!(await sceneActive('Battle'))) { over = true; break; }
  await press('z', 1, 320);
  if (i === 5) await shot('07-intro-combate');
  if (i === 40) await shot('08-medio');
}
if (!over) await fail('el combate de entrenador no terminó tras muchas pulsaciones');

// Asegurar vuelta a World (algunos diálogos finales se cierran solos).
for (let i = 0; i < 12; i++) { if (await sceneActive('World')) break; await press('z', 1, 350); }
await sleep(800);
await shot('09-tras-combate');

const after = JSON.parse(await saveSnap());
console.log('   estado post-combate:', JSON.stringify(after));

console.log('\n=== RESUMEN ===');
const won = after && after.party.some((p) => Number(p.split(':')[1]) > 0); // sobrevivió al menos uno
const moneyDelta = after.money - before.money;
const flagSet = !!(after.flags && after.flags.test_t === true);
console.log('Combate terminó:', over);
console.log('Δ dinero:', moneyDelta, '(esperado ~+200 si victoria)');
console.log('flag test_t:', after.flags && after.flags.test_t);
console.log('Equipo vivo:', won);

const realErrors = errors.filter((e) => !e.includes('favicon'));
console.log('Errores de consola:', realErrors.length);
realErrors.slice(0, 10).forEach((e) => console.log('  -', e.slice(0, 160)));

// El test espera VICTORIA (Bulbasaur lv5 contra Pidgey/Rattata lv3).
if (over && moneyDelta === 200 && flagSet && realErrors.length === 0) {
  console.log('\nTRAINER E2E: PASS ✅');
  await browser.close();
  process.exit(0);
}
console.log('\nTRAINER E2E: FAIL ❌');
await browser.close();
process.exit(1);
