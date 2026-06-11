// Diagnóstico rápido contra una URL: boota el juego, lista 404s, avanza la intro
// con muchos toques y reporta la escena activa + captura. Uso: node diag.mjs <url>
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';
const URL = (process.argv[2] || 'http://localhost:4321') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const e404 = new Set();
const errs = [];
const isAudio = (s) => /decode audio|Unable to decode|Failed to process file|audio /i.test(String(s));
page.on('response', (r) => { if (r.status() === 404) e404.add(r.url()); });
page.on('pageerror', (e) => { if (!isAudio(e.message)) errs.push('PAGEERR: ' + e.message); });
page.on('console', (m) => { if (m.type() === 'error' && !isAudio(m.text()) && !/404/.test(m.text())) errs.push('CONSOLE: ' + m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
await page.goto(URL, { waitUntil: 'networkidle' });
await page.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
const booted = await page.evaluate("!!(window.game && window.game.scene)");
await page.keyboard.press('z'); await sleep(700);
try { await page.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 4000 }); } catch (e) { console.log('no SIN CUENTA btn'); }
await sleep(1200);
let reachedName = false;
for (let i = 0; i < 80; i++) {
  if (await page.locator('input').count() > 0) { reachedName = true; break; }
  await page.keyboard.press('z'); await sleep(160);
}
const activeScenes = await page.evaluate("window.game ? window.game.scene.scenes.filter(s=>s.scene.isActive()).map(s=>s.scene.key) : null");
await page.screenshot({ path: 'tests/e2e/shots/diag.png' });
console.log('booted:', booted, '| reachedName:', reachedName, '| activeScenes:', JSON.stringify(activeScenes));
console.log('errores no-audio:', errs.slice(0, 8));
console.log('404s (' + e404.size + '):', [...e404].slice(0, 10).map(u => u.replace('https://pokemon-madrid.stratomai.com', '')));
await browser.close();
