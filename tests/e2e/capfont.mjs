// Captura a resolución Pixel 10 XL (móvil alta DPI) para inspeccionar la NITIDEZ
// del texto bitmap en un diálogo con MUCHO texto. Hace además un CROP AMPLIADO
// (zoom) de la caja de diálogo para ver glifo a glifo.
//
// Uso: node tests/e2e/capfont.mjs http://localhost:5180
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = (process.argv[2] || 'http://localhost:5180');
const URL = BASE + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });

// Pixel 10 XL: ~412 CSS px de ancho, pantalla altísima densidad. deviceScaleFactor
// 3.5 emula su DPR para que las capturas salgan a la resolución real del móvil.
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({
  viewport: { width: 412, height: 915 },
  deviceScaleFactor: 3.5,
  isMobile: true,
  hasTouch: true,
});
const errors = [];
const isAudioNoise = (s) => /decode audio|Unable to decode|Failed to process file|audio /i.test(String(s));
page.on('pageerror', (e) => { if (!isAudioNoise(e.message)) errors.push('pageerror: ' + e.message); });
page.on('console', (m) => { if (m.type() === 'error' && !isAudioNoise(m.text())) errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/font-${n}.png` });
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const ev = (fn) => page.evaluate(fn);

console.log('Resolución emulada: Pixel 10 XL (412x915 @ DPR 3.5)');
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);

// Entrar como invitado → intro Pokémon Piso (diálogo de Iván FinTips = MUCHO texto)
await press('z', 1, 800);
try { await page.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 4000 }); } catch (e) {}
await sleep(1500);

// El primer diálogo de la intro tiene párrafos largos. Capturamos varias páginas.
async function captureDialog(tag) {
  // espera a que la escena Dialog esté activa
  for (let i = 0; i < 10; i++) {
    const act = await ev("window.game && window.game.scene.isActive('Dialog')");
    if (act) break;
    await sleep(300);
  }
  await sleep(700); // dejar que el typewriter termine de escribir la página
  await shot(tag);
  // crop ampliado de la caja de diálogo (parte inferior de la pantalla)
  const buf = await page.screenshot();
  return buf;
}

// Captura la primera página del diálogo de intro (texto denso de Iván).
await captureDialog('01-dialog-pixel10xl');

// Avanza un par de páginas más para tener varias muestras de texto largo.
await press('z', 1, 900);
await captureDialog('02-dialog-pixel10xl');
await press('z', 1, 900);
await captureDialog('03-dialog-pixel10xl');

console.log('Errores consola:', errors.length);
errors.slice(0, 6).forEach((e) => console.log('  -', e.slice(0, 140)));
console.log('Capturas en tests/e2e/shots/font-0*.png');
await browser.close();
process.exit(0);
