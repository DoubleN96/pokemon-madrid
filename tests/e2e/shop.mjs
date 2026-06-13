// E2E Tienda Pokémon Piso: nueva partida (invitado) → mundo → abrir la TIENDA
// sobre la WorldScene activa (como hace el tendero Eduardo) → COMPRAR Poké Balls
// → verificar que el dinero baja y la bolsa sube. Capturas en tests/e2e/shots/.
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
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/shop-${n}.png` });
const press = async (k, n = 1, d = 250) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
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
// elegir inicial (→ + A) y cerrar intro hasta el mundo.
await press('ArrowRight', 1, 300);
await press('z', 1, 400);
for (let i = 0; i < 80; i++) { if (await active('World')) break; await press('z', 1, 200); }
if (!await active('World')) await fail('no llegó al mundo');
await shot('01-mundo');

console.log('2. Fijar dinero/bolsa conocidos y abrir la TIENDA sobre WorldScene');
// Estado de partida determinista para la prueba.
await ev(() => {
  const s = window.game.registry.get('save');
  s.player.money = 3000;
  s.bag = { potion: 1 };
});
// Abre la tienda exactamente como el tendero (openShop sobre la escena World activa).
const opened = await page.evaluate(async () => {
  const world = window.game.scene.getScene('World');
  if (!world) return 'no-world';
  world.inputLocked = true; // como en una interacción real
  const mod = await import('/src/ui/shop.js');
  const ui = mod.openShop(world, { onClose: () => { window.__shopClosed = true; } });
  return ui ? 'ok' : 'no-ui';
});
if (opened !== 'ok') await fail(`no se abrió la tienda: ${opened}`);
await sleep(600);
await shot('02-tienda-menu');

const before = await ev(() => {
  const s = window.game.registry.get('save');
  return { money: s.player.money, balls: s.bag['poke-ball'] || 0 };
});
console.log('   antes:', JSON.stringify(before));

console.log('3. COMPRAR → Poké Ball → +2 unidades → confirmar SÍ');
// El menú raíz arranca en COMPRAR (idx 0). A para entrar en la lista de compra.
await press('z', 1, 400);            // COMPRAR
await shot('03-lista-compra');
// La lista de compra arranca en la primera fila = Poké Ball. A para elegirla.
await press('z', 1, 400);            // selecciona Poké Ball → caja de cantidad
// ↑ sube la cantidad (±1). Subimos a 3 (1 → 3).
await press('ArrowUp', 2, 300);
await shot('04-cantidad');
await press('z', 1, 400);            // confirma cantidad → caja SÍ/NO (cursor en SÍ)
await press('z', 1, 600);            // SÍ → compra
await sleep(500);
await shot('05-comprado');

const after = await ev(() => {
  const s = window.game.registry.get('save');
  return { money: s.player.money, balls: s.bag['poke-ball'] || 0 };
});
console.log('   después:', JSON.stringify(after));

console.log('\n=== RESUMEN TIENDA ===');
console.log(`dinero ${before.money} → ${after.money} | poke-ball ${before.balls} → ${after.balls}`);
console.log(`errores consola: ${errors.length}`);

let ok = true;
if (!(after.balls > before.balls)) { console.error('✗ la bolsa no aumentó'); ok = false; }
if (!(after.money < before.money)) { console.error('✗ el dinero no bajó'); ok = false; }
if (after.balls - before.balls !== 3) { console.error(`✗ se esperaban +3 Poké Balls, fueron +${after.balls - before.balls}`); ok = false; }
const expectedCost = (before.balls === after.balls) ? 0 : (after.balls - before.balls) * 200;
if (before.money - after.money !== expectedCost) { console.error(`✗ coste inesperado: ${before.money - after.money} (esperado ${expectedCost})`); ok = false; }
if (errors.length) { console.error('✗ errores de consola:', errors.slice(0, 5)); ok = false; }

await browser.close();
if (!ok) { console.error('SHOP E2E: FAIL ❌'); process.exit(1); }
console.log('SHOP E2E: PASS ✅ (comprar descuenta dinero y añade a la bolsa)');
