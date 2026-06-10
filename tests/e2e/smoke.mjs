// Smoke E2E: la página carga, el canvas de Phaser existe y no hay errores de consola.
// Uso: node tests/e2e/smoke.mjs [URL]   (por defecto http://localhost:5173)
import { chromium } from 'playwright';

const URL = process.argv[2] || 'http://localhost:5173';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 960, height: 640 } });

const errors = [];
page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));

console.log(`→ ${URL}`);
await page.goto(URL, { waitUntil: 'networkidle', timeout: 30000 });
await page.waitForTimeout(3000);

const canvas = await page.$('canvas');
if (!canvas) { console.error('FAIL: no hay <canvas>'); await browser.close(); process.exit(1); }

await page.screenshot({ path: 'tests/e2e/shots/smoke.png' });
console.log('Screenshot: tests/e2e/shots/smoke.png');

const realErrors = errors.filter(e => !e.includes('favicon'));
if (realErrors.length) {
  console.error(`FAIL: ${realErrors.length} errores de consola:`);
  for (const e of realErrors.slice(0, 10)) console.error('  -', e);
  await browser.close();
  process.exit(1);
}
console.log('SMOKE OK: canvas presente, 0 errores de consola');
await browser.close();
