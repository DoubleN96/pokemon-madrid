// E2E MAPA (Town Map): nueva partida → mundo → abrir menú (Enter) → bajar a "MAPA"
// → A para abrir la escena Map → verificar que está activa y que resuelve "ESTÁS
// AQUÍ" en Tetuán → captura → cerrar con Esc → vuelve al menú → cerrar menú.
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
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/mapa-${n}.png` });
const press = async (k, n = 1, d = 300) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };

console.log('1. Nueva partida (invitado) → mundo');
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 800);
await page.locator('button', { hasText: 'SIN CUENTA' }).click();
await sleep(1500);
for (let i = 0; i < 70; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 200); }
if (await page.locator('input').count() === 0) await fail('no llegó al nombre');
await page.locator('input').press('Enter');
await sleep(1200);
for (let i = 0; i < 18; i++) { const r = await ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 420); }
await press('z', 12, 450);
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó al mundo');
await sleep(600);
console.log('   en el mundo OK');

console.log('2. Abrir menú (Enter) y bajar el cursor a "MAPA"');
await press('Enter', 1, 500);
if (!(await active('Menu'))) await fail('el menú no se abrió');
// Índice de "MAPA" en OPTIONS (team, bag, MAP, moto, dex, opts, save, exit) = 2.
await press('ArrowDown', 2, 250);
const rootIdx = await ev("(() => { const s=window.game.scene.getScene('Menu'); return s ? s.rootIdx : -1 })()");
console.log('   rootIdx tras 2× abajo =', rootIdx, '(esperado 2 = MAPA)');
if (rootIdx !== 2) await fail(`cursor no quedó en MAPA (rootIdx=${rootIdx})`);
await shot('01-menu-mapa');

console.log('3. A → abrir escena Map');
await press('z', 1, 700);
if (!(await active('Map'))) await fail('la escena Map no se activó');
await sleep(400);
await shot('02-mapa');
const here = await ev("(() => { const s=window.game.scene.getScene('Map'); return s && s.herePoint ? s.herePoint.id : null })()");
console.log('   herePoint (ESTÁS AQUÍ) =', JSON.stringify(here), '(esperado tetuan)');
if (here !== 'tetuan') await fail(`ESTÁS AQUÍ mal resuelto: ${here}`);

console.log('4. Navegar el cursor con flechas (espacial) y leer info');
await press('ArrowDown', 1, 250); // tetuan → ruta2 (al sureste)
const selName = await ev("(() => { const s=window.game.scene.getScene('Map'); return s && s.infoText ? s.infoText.text : '' })()");
console.log('   info tras moverse:', JSON.stringify(selName).slice(0, 80));
if (!selName) await fail('el pie de info quedó vacío tras navegar');
await shot('03-mapa-nav');

console.log('5. Cerrar con Esc → vuelve al menú');
await press('Escape', 1, 600);
if (await active('Map')) await fail('Map no se cerró con Esc');
if (!(await active('Menu'))) await fail('el menú no volvió tras cerrar el mapa');
console.log('   menú activo de nuevo OK');

console.log('6. Cerrar el menú → vuelve al mundo jugable');
await press('Enter', 1, 500);
if (!(await active('World'))) await fail('no se volvió al mundo tras cerrar el menú');
// Comprobar que el mundo sigue respondiendo (no quedó inputLocked).
const locked = await ev("(() => { const s=window.game.scene.getScene('World'); return s ? !!s.inputLocked : true })()");
console.log('   World.inputLocked =', locked, '(esperado false)');
if (locked) await fail('World quedó bloqueado tras cerrar el mapa/menú');
await shot('04-vuelta-mundo');

console.log('\n=== RESUMEN MAPA ===');
console.log(`ESTÁS AQUÍ = ${here} | info navegación = "${String(selName).slice(0, 60)}..." | Errores consola: ${errors.length}`);
if (errors.length) { console.error('Errores:', errors.slice(0, 8)); await fail('hubo errores de consola'); }
console.log('\nMAPA E2E: PASS ✅ (menú→MAPA→escena Map, ESTÁS AQUÍ en Tetuán, navegación y cierre OK)');
await browser.close();
process.exit(0);
