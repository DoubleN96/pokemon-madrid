// Igual que capfont.mjs pero en modo WebGL (sin ?canvas) para comparar la nitidez
// del texto bitmap. Pixel 10 XL emulado.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const BASE = (process.argv[2] || 'http://localhost:5180');
const URL = BASE + '/'; // WebGL (Phaser.AUTO)
mkdirSync('tests/e2e/shots', { recursive: true });

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

await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2800);
await press('z', 1, 800);
try { await page.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 4000 }); } catch (e) {}
await sleep(1500);
for (let i = 0; i < 10; i++) {
  const act = await ev("window.game && window.game.scene.isActive('Dialog')");
  if (act) break;
  await sleep(300);
}
await sleep(800);
await shot('webgl-01-dialog');
console.log('WebGL render:', await ev("window.game && window.game.renderer && window.game.renderer.type")); // 1=canvas 2=webgl
console.log('Errores consola:', errors.length);
errors.slice(0, 6).forEach((e) => console.log('  -', e.slice(0, 140)));
await browser.close();
process.exit(0);
