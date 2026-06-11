// Captura un diálogo a tamaño MÓVIL para revisar legibilidad del texto.
// Igual flujo que piso.mjs (nueva partida invitado → intro) pero se detiene en
// el primer diálogo de la intro y hace zoom-crop de la caja de texto.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:5173');
const TAG = process.argv[3] || 'baseline';
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
// Viewport móvil retrato típico (Pixel 7 ~ 412×915), DPR 2 para nitidez real.
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/${n}.png` });
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const ev = (fn) => page.evaluate(fn);

console.log('Cargando', URL, 'tag=', TAG);
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);

// Pantalla de título → PULSA A → SIN CUENTA
await press('z', 1, 900);
const btn = page.locator('button', { hasText: 'SIN CUENTA' });
if (await btn.count()) { await btn.click(); await sleep(1500); }

// Esperar a que la intro lance el diálogo (escena 'Dialog' activa).
let dialogUp = false;
for (let i = 0; i < 20; i++) {
  dialogUp = await ev("(() => window.game && window.game.scene.isActive('Dialog'))()");
  if (dialogUp) break;
  await press('z', 1, 400);
}
// Dejar que el typewriter termine de pintar la página (skip con una A).
await sleep(400);
await ev("(() => { const d=window.game.scene.getScene('Dialog'); if(d&&d.writer&&!d.writer.done) d.writer.skip(); })()");
await sleep(500);

console.log('Dialog activo:', dialogUp);
await shot(`dialog-${TAG}-full`);

// Crop ajustado a la caja de diálogo (parte inferior de la pantalla del juego).
// La carcasa GBA centra el canvas; localizamos el <canvas> y recortamos su tercio inferior.
const box = await page.evaluate(() => {
  const c = document.querySelector('#game canvas');
  if (!c) return null;
  const r = c.getBoundingClientRect();
  return { x: r.x, y: r.y, w: r.width, h: r.height };
});
if (box) {
  // La caja de diálogo ocupa ~ el 32% inferior del canvas (BOX_H 48 de 160 ≈ 30%).
  const clip = {
    x: Math.max(0, Math.round(box.x)),
    y: Math.round(box.y + box.h * 0.62),
    width: Math.round(box.w),
    height: Math.round(box.h * 0.38),
  };
  await page.screenshot({ path: `tests/e2e/shots/dialog-${TAG}-crop.png`, clip });
  console.log('Crop caja:', JSON.stringify(clip));
} else {
  console.log('No se encontró el canvas para recortar.');
}

await browser.close();
console.log('Capturas guardadas: dialog-' + TAG + '-full.png y dialog-' + TAG + '-crop.png');
