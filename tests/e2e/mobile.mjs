// E2E MÓVIL: emula iPhone con táctil y juega SOLO con los controles en pantalla
// (D-pad + A + START), sin usar el teclado. Verifica que mueven y abren menús.
import { chromium, devices } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.argv[2] || 'http://localhost:5173';
const URL = BASE + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });

const iphone = devices['iPhone 13'];
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const context = await browser.newContext({ ...iphone, hasTouch: true, isMobile: true });
const page = await context.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/mob-${n}.png` });
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const pos = () => page.evaluate("(() => { const s=window.game.registry.get('save'); return s? {x:s.player.x,y:s.player.y,map:s.player.map} : null })()");
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };

// Helpers táctiles: tocar un control por su texto / id
const center = async (sel) => {
  const box = await page.locator(sel).boundingBox();
  if (!box) throw new Error('no encuentro ' + sel);
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, box };
};
// Tap táctil real sobre un elemento
const tapEl = async (sel) => { const c = await center(sel); await page.touchscreen.tap(c.x, c.y); };
// Mantener pulsada una dirección del dpad: touchstart → esperar → touchend (hold real).
async function holdDir(dir, ms = 450) {
  const offs = { up: [0, -0.32], down: [0, 0.32], left: [-0.32, 0], right: [0.32, 0] }[dir];
  const startTouch = (ox, oy) => page.evaluate(({ ox, oy }) => {
    const pad = document.getElementById('touch-dpad');
    const r = pad.getBoundingClientRect();
    const x = r.left + r.width * (0.5 + ox);
    const y = r.top + r.height * (0.5 + oy);
    const t = new Touch({ identifier: 1, target: pad, clientX: x, clientY: y });
    pad.dispatchEvent(new TouchEvent('touchstart', { touches: [t], targetTouches: [t], changedTouches: [t], bubbles: true, cancelable: true }));
    window.__pmTouch = { x, y };
  }, { ox: offs[0], oy: offs[1] });
  const endTouch = () => page.evaluate(() => {
    const pad = document.getElementById('touch-dpad');
    const { x, y } = window.__pmTouch || { x: 0, y: 0 };
    const t = new Touch({ identifier: 1, target: pad, clientX: x, clientY: y });
    pad.dispatchEvent(new TouchEvent('touchend', { touches: [], targetTouches: [], changedTouches: [t], bubbles: true, cancelable: true }));
  });
  await startTouch(offs[0], offs[1]);
  await sleep(ms);
  await endTouch();
  await sleep(120);
}

console.log('Dispositivo:', iphone.viewport, 'touch:', iphone.hasTouch);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await shot('01-titulo');

// ¿Existen los controles táctiles?
const hasControls = await page.locator('#touch-controls').count();
if (!hasControls) await fail('no se montó la capa de controles táctiles');
const btnA = '#touch-btn-z';
const btnStart = '#touch-btn-start';
console.log('Controles táctiles presentes ✓');

console.log('1. START/A para pasar título → cuenta → SIN CUENTA');
await tapEl(btnA);            // PULSA A
await sleep(900);
// panel de cuenta DOM → tocar SIN CUENTA
const guest = page.locator('button', { hasText: 'SIN CUENTA' });
try { await guest.waitFor({ timeout: 6000 }); } catch { await fail('no apareció panel de cuenta'); }
await guest.tap();
await sleep(1500);

console.log('2. Intro: avanzar con A hasta el nombre');
for (let i = 0; i < 25; i++) { if (await page.locator('input').count() > 0) break; await tapEl(btnA); await sleep(450); }
if (await page.locator('input').count() === 0) await fail('no llegó al panel de nombre');
await page.locator('input').fill('MOVIL');
await page.locator('input').press('Enter');
await sleep(1200);

console.log('3. Elegir inicial con A (los controles reaparecen al cerrar el input)');
for (let i = 0; i < 18; i++) { const r = await page.evaluate("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await tapEl(btnA); await sleep(450); }
await sleep(400);
await tapEl(btnA);     // confirmar inicial 0
for (let i = 0; i < 10; i++) await tapEl(btnA);
let inWorld = false;
for (let i = 0; i < 15; i++) { if (await active('World')) { inWorld = true; break; } await tapEl(btnA); await sleep(400); }
if (!inWorld) await fail('no se llegó al mundo');
await sleep(600);
await shot('02-mundo');
const p0 = await pos();
console.log('   en el mundo:', JSON.stringify(p0));

console.log('4. Mover con el D-PAD táctil (abajo y derecha)');
for (let i = 0; i < 4; i++) await holdDir('down', 360);
for (let i = 0; i < 4; i++) await holdDir('right', 360);
const p1 = await pos();
console.log('   tras D-pad:', JSON.stringify(p1));
await shot('03-movido');
const moved = p1 && p0 && (p1.x !== p0.x || p1.y !== p0.y);
if (!moved) await fail('el D-pad táctil NO movió al jugador');
console.log('   D-pad mueve ✓');

console.log('5. START táctil abre el menú');
await tapEl(btnStart);
await sleep(800);
if (!(await active('Menu'))) await fail('START táctil no abrió el menú');
await shot('04-menu');
console.log('   START abre menú ✓');

console.log('\n=== RESUMEN MÓVIL ===');
const realErrors = errors.filter((e) => !e.includes('favicon'));
console.log('Movimiento por D-pad:', moved ? 'SÍ' : 'NO', '| Menú por START: SÍ');
console.log('Errores consola:', realErrors.length);
realErrors.slice(0, 8).forEach((e) => console.log('  -', e.slice(0, 140)));
if (moved && realErrors.length === 0) {
  console.log('\nMOBILE E2E: PASS ✅ (jugable solo con controles táctiles)');
  await browser.close(); process.exit(0);
} else {
  console.log('\nMOBILE E2E: REVISAR ⚠️');
  await browser.close(); process.exit(2);
}
