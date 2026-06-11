// QA visual: lleva al combate de Álvaro y captura la intro VS (retrato anime).
import { chromium } from 'playwright';
const URL = (process.argv[2] || 'http://localhost:5191') + '/?canvas=1';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (k, n = 1, d = 280) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const ev = (fn) => page.evaluate(fn);
const active = (s) => ev(`window.game && window.game.scene.isActive('${s}')`);
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
// saltar intro hasta elegir inicial
for (let i = 0; i < 22; i++) { const r = await ev("(()=>{const s=window.game.scene.getScene('Intro');return !!(s&&s.starterSprites&&s.starterSprites.length)})()"); if (r) break; await press('z', 1, 380); }
await press('ArrowRight', 1); await press('z', 2, 500);     // elegir Charmander
for (let i = 0; i < 16; i++) { if (await active('World')) break; await press('z', 1, 380); }
await sleep(800);
// caminar a Álvaro (9,12) desde 6,12 y retar
await press('ArrowRight', 2, 320);
await page.keyboard.press('ArrowRight'); await sleep(150);
await press('z', 1, 600);  // iniciar combate
// capturar durante la intro del entrenador (retrato anime visible)
for (let i = 0; i < 4; i++) { await page.screenshot({ path: `tests/e2e/shots/qa-intro-${i}.png` }); await sleep(700); }
console.log('battle activo:', await active('Battle'));
await browser.close();
