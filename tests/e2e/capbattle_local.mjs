// Captura del layout de combate (databoxes + bocadillo) contra el build local,
// siguiendo el flujo probado de piso.mjs hasta el combate de Álvaro. Guarda el
// canvas 1:1 (240x160) para medir el layout sin el shell GBA.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv[2] || '8199';
const TAG = process.argv[3] || 'after';
const URL = `http://localhost:${PORT}/?canvas=1`;
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
const isAudioNoise = (s) => /decode audio|Unable to decode|Failed to process file|audio /i.test(String(s));
page.on('pageerror', (e) => { if (!isAudioNoise(e.message)) errors.push(`pageerror: ${e.message}`); });
page.on('console', (m) => { if (m.type() === 'error' && !isAudioNoise(m.text())) errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const pos = () => ev("(() => { const s=window.game.registry.get('save'); return s?{x:s.player.x,y:s.player.y}:null })()");
const grabCanvas = async (name) => {
  const dataUrl = await ev(() => { const c = document.querySelector('canvas'); return c ? c.toDataURL('image/png') : null; });
  if (dataUrl) writeFileSync(`tests/e2e/shots/${name}.png`, Buffer.from(dataUrl.split(',')[1], 'base64'));
};

await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 800);
await page.locator('button', { hasText: 'SIN CUENTA' }).click();
await sleep(1500);
for (let i = 0; i < 70; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 200); }
await page.locator('input').press('Enter');
await sleep(1200);
for (let i = 0; i < 18; i++) { const r = await ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 420); }
await press('z', 12, 450);
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 400); }
console.log('en mundo:', inWorld);
await sleep(600);
// caminar a Álvaro
for (let i = 0; i < 6; i++) { const p = await pos(); if (p && p.x >= 8) break; await page.keyboard.down('ArrowRight'); await sleep(300); await page.keyboard.up('ArrowRight'); await sleep(150); }
await page.keyboard.press('ArrowRight'); await sleep(150);
await page.keyboard.press('z'); await sleep(1500);
let inBattle = false;
for (let i = 0; i < 8; i++) { if (await active('Battle')) { inBattle = true; break; } await press('z', 1, 400); }
if (!inBattle) { for (let i = 0; i < 6 && !inBattle; i++) { await press('z', 1, 500); inBattle = await active('Battle'); } }
console.log('en combate:', inBattle);
// Espera a que termine la intro VS y se vea el layout con cajas + primer mensaje
await sleep(3500);
await page.locator('canvas').screenshot({ path: `tests/e2e/shots/bug3-shell-${TAG}.png` });
await grabCanvas(`bug3-canvas-${TAG}`);
const realErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('404'));
console.log('errores consola (no-404):', realErrors.length);
realErrors.slice(0, 8).forEach((e) => console.log('  ERR>', e.slice(0, 140)));
await browser.close();
