// E2E de partida completa (invitado): título → intro → inicial → hierba → combate → guardar → continuar.
// Uso: node tests/e2e/play.mjs [URL]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:5173') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const shot = (n) => page.screenshot({ path: `tests/e2e/shots/play-${n}.png` });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (key, times = 1, delay = 350) => {
  for (let i = 0; i < times; i++) { await page.keyboard.press(key); await sleep(delay); }
};
const evalGame = (fn) => page.evaluate(fn);
const sceneActive = (key) => evalGame(`window.game && window.game.scene.isActive('${key}')`);
const playerPos = () => evalGame(`(() => { const s = window.game.registry.get('save'); return s ? { map: s.player.map, x: s.player.x, y: s.player.y } : null })()`);
const fail = async (msg) => { console.error('FAIL:', msg); await shot('FAIL'); console.error('errores:', errors.slice(0, 8)); await browser.close(); process.exit(1); };

console.log('1. Título (storage limpio)');
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await shot('01-titulo');

console.log('2. Pulsa A → panel cuenta → SIN CUENTA');
await press('z', 1, 800);
const guestBtn = page.locator('button', { hasText: 'SIN CUENTA' });
try { await guestBtn.waitFor({ timeout: 5000 }); } catch { await fail('no apareció el panel de cuenta'); }
await shot('02-auth');
await guestBtn.click();
await sleep(1500);

console.log('3. Intro del profesor (avanzar diálogos)');
await shot('03-intro');
for (let i = 0; i < 25; i++) {
  if (await page.locator('input').count() > 0) break; // panel de nombre
  await press('z', 1, 450);
}
if (await page.locator('input').count() === 0) await fail('no llegó el panel de nombre tras la intro');
await shot('04-nombre');

console.log('4. Nombre: escribir ROJO → Enter');
await page.locator('input').fill('ROJO');
await page.locator('input').press('Enter');
await sleep(1200);

console.log('5. Elegir inicial: → derecha (Charmander) + A, confirmar');
for (let i = 0; i < 20; i++) {
  const ready = await evalGame("(() => { const sc = window.game.scene.getScene('Intro'); return !!(sc && sc.starterSprites && sc.starterSprites.length) })()");
  if (ready) break;
  await press('z', 1, 450);
}
await shot('05-iniciales');
await press('ArrowRight', 1, 400);
await press('z', 1, 600);
await shot('06-confirmar');
await press('z', 8, 500); // confirmación + diálogos post-elección

// Esperar World
let inWorld = false;
for (let i = 0; i < 20; i++) { if (await sceneActive('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó a World tras la intro');
await sleep(800);
await shot('07-mundo');
let pos = await playerPos();
console.log('   En el mundo:', JSON.stringify(pos));

console.log('6. Caminar hasta la hierba alta (greedy)');
const DIRS = { right: 'ArrowRight', left: 'ArrowLeft', down: 'ArrowDown', up: 'ArrowUp' };
async function walkTo(tx, ty, maxSteps = 140) {
  let lastKey = null, stuck = 0;
  for (let i = 0; i < maxSteps; i++) {
    if (await sceneActive('Battle')) return 'battle';
    const p = await playerPos();
    if (!p) return 'lost';
    if (p.x === tx && p.y === ty) return 'ok';
    const dx = tx - p.x, dy = ty - p.y;
    let pref = Math.abs(dx) >= Math.abs(dy)
      ? [dx > 0 ? 'right' : 'left', dy > 0 ? 'down' : dy < 0 ? 'up' : null]
      : [dy > 0 ? 'down' : 'up', dx > 0 ? 'right' : dx < 0 ? 'left' : null];
    pref = pref.filter(Boolean);
    if (stuck >= 2) pref.reverse();
    if (stuck >= 4) pref.push(['up', 'down', 'left', 'right'][Math.floor(Math.random() * 4)]);
    const dir = pref[stuck % pref.length] || pref[0];
    await page.keyboard.down(DIRS[dir]);
    await sleep(300);
    await page.keyboard.up(DIRS[dir]);
    await sleep(120);
    const q = await playerPos();
    if (q && q.x === p.x && q.y === p.y) stuck++; else stuck = 0;
    lastKey = dir;
  }
  return 'timeout';
}
// vía: cruce del camino → encima de la hierba → dentro
await walkTo(17, 16);
let r = await walkTo(24, 23);
console.log('   ruta a hierba:', r, JSON.stringify(await playerPos()));
await shot('08-antes-hierba');

console.log('7. Pasear por la hierba hasta encuentro');
let battle = r === 'battle';
const grass = [[24, 25], [26, 25], [24, 27], [26, 27], [23, 26], [27, 26]];
for (let round = 0; round < 25 && !battle; round++) {
  const [gx, gy] = grass[round % grass.length];
  const res = await walkTo(gx, gy, 16);
  if (res === 'battle') { battle = true; break; }
}
if (!battle) await fail('no saltó ningún encuentro en la hierba');
await sleep(2500);
await shot('09-combate');
console.log('   ¡COMBATE!');

console.log('8. Luchar (machacar A con movimiento 1)');
let over = false;
for (let i = 0; i < 150; i++) {
  if (!(await sceneActive('Battle'))) { over = true; break; }
  await press('z', 1, 500);
  if (i === 6) await shot('10-combate-menu');
  if (i === 20) await shot('11-combate-medio');
}
if (!over) await fail('el combate no terminó tras 150 pulsaciones');
await sleep(1000);
await shot('12-tras-combate');
console.log('   Combate terminado. Pos:', JSON.stringify(await playerPos()));

console.log('9. Menú → GUARDAR');
const st = await evalGame(`(() => { const w = window.game.scene.getScene('World'); return JSON.stringify({ worldActive: window.game.scene.isActive('World'), sleeping: window.game.scene.isSleeping('World'), inputLocked: w&&w.inputLocked, transitioning: w&&w.transitioning, moving: w&&w.player&&w.player.moving, kb: w&&w.input.keyboard.enabled, dialog: window.game.scene.isActive('Dialog'), battle: window.game.scene.isActive('Battle') }) })()`);
console.log('   estado World pre-Enter:', st);
await press('Enter', 1, 700);
if (!(await sceneActive('Menu'))) { console.log('   estado tras Enter:', await evalGame(`(() => { const w=window.game.scene.getScene('World'); return JSON.stringify({inputLocked:w&&w.inputLocked, transitioning:w&&w.transitioning}) })()`)); await fail('Enter no abrió el menú'); }
await shot('13-menu');
await press('ArrowDown', 3, 300);
await press('z', 1, 900);
await shot('14-guardado');
await press('z', 2, 400); // cerrar confirmación
await press('Escape', 1, 300);
await press('Enter', 1, 300); // por si Enter cierra
const posBefore = await playerPos();

console.log('10. Recargar → SIN CUENTA → CONTINUAR');
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 800);
try { await page.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 5000 }); } catch { await fail('panel de cuenta no apareció tras recargar'); }
await sleep(1500);
await shot('15-continuar');
await press('z', 1, 1000); // CONTINUAR (primera opción)
let backInWorld = false;
for (let i = 0; i < 10; i++) { if (await sceneActive('World')) { backInWorld = true; break; } await sleep(500); }
if (!backInWorld) await fail('CONTINUAR no cargó el mundo');
const posAfter = await playerPos();
await shot('16-mundo-cargado');

console.log('\n=== RESUMEN ===');
console.log('Pos al guardar:', JSON.stringify(posBefore));
console.log('Pos al cargar :', JSON.stringify(posAfter));
const party = await evalGame(`(() => { const s = window.game.registry.get('save'); return s.party.map(p => 'sp' + p.species + ' nv' + p.level + ' hp' + p.currentHp) })()`);
console.log('Equipo:', party);
const realErrors = errors.filter(e => !e.includes('favicon'));
console.log('Errores de consola:', realErrors.length);
realErrors.slice(0, 10).forEach(e => console.log('  -', e.slice(0, 160)));

if (posAfter && posBefore && posAfter.map === posBefore.map && Math.abs(posAfter.x - posBefore.x) <= 1 && Math.abs(posAfter.y - posBefore.y) <= 1 && realErrors.length === 0) {
  console.log('\nPLAY E2E: PASS ✅');
  await browser.close();
  process.exit(0);
} else {
  console.log('\nPLAY E2E: REVISAR ⚠️ (pos restaurada o errores)');
  await browser.close();
  process.exit(realErrors.length ? 1 : 2);
}
