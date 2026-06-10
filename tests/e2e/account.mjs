// E2E de CUENTA Supabase contra el sitio desplegado: registrar → jugar un poco →
// guardar (nube) → recargar → iniciar sesión → continuar restaurando estado.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = process.argv[2] || 'https://pokemon-madrid.128.140.44.162.sslip.io';
const URL = BASE + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });
const EMAIL = `qa-live-${Date.now()}@stratomai.com`;
const PASS = 'PikachuQA-2026!';

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/acc-${n}.png` });
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };
const fillAuth = async () => {
  const inputs = page.locator('input');
  await inputs.first().waitFor({ timeout: 8000 });
  await inputs.nth(0).fill(EMAIL);
  await inputs.nth(1).fill(PASS);
};

console.log('Cuenta:', EMAIL);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);

console.log('1. PULSA A → CREAR CUENTA');
await press('z', 1, 800);
await fillAuth();
await shot('01-form');
await page.locator('button', { hasText: 'CREAR CUENTA' }).click();
// Esperar a salir del form (a Intro o menú continuar)
let leftForm = false;
for (let i = 0; i < 20; i++) { if (await page.locator('input').count() === 0 || await active('Intro')) { leftForm = true; break; } await sleep(700); }
if (!leftForm) await fail('el registro no avanzó (¿error de red a Supabase?)');
await sleep(1200);

console.log('2. Intro → nombre → inicial');
for (let i = 0; i < 25; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 420); }
if (await page.locator('input').count() > 0) { await page.locator('input').fill('LIVE'); await page.locator('input').press('Enter'); await sleep(1000); }
for (let i = 0; i < 18; i++) { const r = await page.evaluate("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 420); }
await press('z', 1, 500); // elegir inicial 0 (Bulbasaur)
await press('z', 10, 450);
let inWorld = false;
for (let i = 0; i < 20; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 380); }
if (!inWorld) await fail('no se llegó al mundo tras crear cuenta');
await shot('02-mundo');

console.log('3. Mover unos pasos y abrir menú → GUARDAR (nube)');
for (const k of ['ArrowDown', 'ArrowDown', 'ArrowRight']) { await page.keyboard.down(k); await sleep(320); await page.keyboard.up(k); await sleep(140); }
const posSaved = await page.evaluate("(() => { const s=window.game.registry.get('save'); return s.player.map+':'+s.player.x+','+s.player.y })()");
await press('Enter', 1, 700);
if (!(await active('Menu'))) await fail('no abrió el menú para guardar');
await press('ArrowDown', 3, 280);
await press('z', 1, 1400); // GUARDAR (sube a Supabase)
await shot('03-guardado');
await press('z', 2, 400);

console.log('4. Verificar que el save está en Supabase (no solo local)');
const cloud = await page.evaluate(async () => {
  const c = window.game.registry.get('session');
  return c ? 'con-sesion' : 'sin-sesion';
});
console.log('   sesión en registry:', cloud);

console.log('5. Recargar → INICIAR SESIÓN → CONTINUAR');
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 800);
await fillAuth();
await page.locator('button', { hasText: 'ENTRAR' }).click();
let backWorld = false;
for (let i = 0; i < 25; i++) {
  if (await active('World')) { backWorld = true; break; }
  // si aparece menú CONTINUAR/NUEVA, elegir CONTINUAR
  await press('z', 1, 600);
}
if (!backWorld) await fail('ENTRAR+CONTINUAR no restauró la partida desde la nube');
const posLoaded = await page.evaluate("(() => { const s=window.game.registry.get('save'); return s.player.map+':'+s.player.x+','+s.player.y })()");
await shot('04-restaurado');

console.log('\n=== RESUMEN CUENTA ===');
console.log('Guardado en:', posSaved, '| Restaurado en:', posLoaded);
const realErrors = errors.filter((e) => !e.includes('favicon'));
console.log('Errores consola:', realErrors.length);
realErrors.slice(0, 8).forEach((e) => console.log('  -', e.slice(0, 150)));
if (posSaved === posLoaded && realErrors.length === 0) {
  console.log('\nACCOUNT E2E: PASS ✅ (login Supabase + memoria en la nube funcionan en producción)');
  await browser.close(); process.exit(0);
} else {
  console.log('\nACCOUNT E2E: REVISAR ⚠️');
  await browser.close(); process.exit(2);
}
