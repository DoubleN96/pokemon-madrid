// Captura COMBATE + MENÚ a resolución Pixel 10 XL (WebGL) para verificar la
// nitidez del texto bitmap en esas superficies (mensaje de combate, menú 2x2,
// databoxes, menú de pausa). Reusa la navegación robusta de piso.mjs.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = (process.argv[2] || 'http://localhost:5180');
const URL = BASE + '/'; // WebGL
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({
  viewport: { width: 412, height: 915 }, deviceScaleFactor: 3.5, isMobile: true, hasTouch: true,
});
const errors = [];
const isAudioNoise = (s) => /decode audio|Unable to decode|Failed to process file|audio /i.test(String(s));
page.on('pageerror', (e) => { if (!isAudioNoise(e.message)) errors.push('pageerror: ' + e.message); });
page.on('console', (m) => { if (m.type() === 'error' && !isAudioNoise(m.text())) errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/surf-${n}.png` });
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const pos = () => ev("(() => { const s=window.game.registry.get('save'); return s?{x:s.player.x,y:s.player.y}:null })()");

await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2800);
await press('z', 1, 800);
try { await page.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 4000 }); } catch (e) {}
await sleep(1500);
for (let i = 0; i < 70; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 200); }
if (await page.locator('input').count() > 0) { await page.locator('input').press('Enter'); await sleep(1200); }
// inicial Charmander
for (let i = 0; i < 18; i++) { const r = await ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 420); }
await press('ArrowRight', 1, 300);
await press('z', 12, 450);
for (let i = 0; i < 18; i++) { if (await active('World')) break; await press('z', 1, 400); }
await sleep(700);

// MENÚ de pausa (Enter abre menú raíz: EQUIPO/MOCHILA/MOTO/POKÉDEX/GUARDAR/SALIR)
await page.keyboard.press('Enter'); await sleep(900);
if (await active('Menu')) { await shot('menu'); console.log('menu capturado'); }
await page.keyboard.press('x'); await sleep(500); // cerrar menú
// asegurar de vuelta en World
for (let i = 0; i < 6; i++) { if (await active('World')) break; await press('x', 1, 300); }

// COMBATE con Álvaro (rival 9,12; spawn 6,12)
for (let i = 0; i < 6; i++) { const p = await pos(); if (p && p.x >= 8) break; await page.keyboard.down('ArrowRight'); await sleep(300); await page.keyboard.up('ArrowRight'); await sleep(150); }
await page.keyboard.press('ArrowRight'); await sleep(150);
await page.keyboard.press('z'); await sleep(1500);
let inBattle = false;
for (let i = 0; i < 10; i++) { if (await active('Battle')) { inBattle = true; break; } await press('z', 1, 450); }
if (inBattle) {
  await sleep(2500); // pasar intro VS
  await shot('battle-intro');
  // avanzar mensajes hasta que aparezca el menú principal (LUCHA/MOCHILA/...)
  await press('z', 4, 700);
  await shot('battle-menu');
  console.log('combate capturado');
} else {
  console.log('no se llegó a combate (no crítico para la captura de menú)');
}

console.log('Errores consola:', errors.length);
errors.slice(0, 6).forEach((e) => console.log('  -', e.slice(0, 140)));
await browser.close();
process.exit(0);
