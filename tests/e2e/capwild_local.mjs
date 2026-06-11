// Captura de un combate SALVAJE (CHARMANDER) ya asentado para inspeccionar el
// hueco caja-enemiga ↔ bocadillo y la barra de HP a vida llena. Fuerza el
// encuentro vía WorldScene.startWildBattle para que sea determinista y rápido.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv[2] || '8199';
const TAG = process.argv[3] || 'after';
const URL = `http://localhost:${PORT}/?canvas=1`;
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const grab = async (name) => { const d = await ev(() => { const c = document.querySelector('canvas'); return c ? c.toDataURL('image/png') : null; }); if (d) writeFileSync(`tests/e2e/shots/${name}.png`, Buffer.from(d.split(',')[1], 'base64')); };
const layout = () => ev(`(() => {
  const s = window.game.scene.getScene('Battle');
  if (!s || !s.enemyBox) return null;
  const eb = s.enemyBox, msg = s.msg;
  const out = { enemyBox: { x: eb.x, y: eb.y, panelH: eb.panel ? eb.panel.height : null } };
  out.enemyBox.bottom = eb.panel ? eb.y + eb.panel.height : null;
  out.enemyHpBar = { scaleX: eb.hpBarScaleX, displayW: eb.hpBar.displayWidth, ratio: eb.curHp / eb.maxHp };
  if (msg && msg.frame) out.msgFrameY = msg.frame.y;
  out.enemySpriteY = s.enemySprite ? { y: s.enemySprite.y, dispH: s.enemySprite.displayHeight, top: s.enemySprite.y - s.enemySprite.displayHeight } : null;
  return out;
})()`);

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
for (let i = 0; i < 18; i++) { if (await active('World')) break; await press('z', 1, 400); }
await sleep(800);
// Fuerza un combate salvaje contra CHARMANDER (species 4, nivel 9) vía la World.
await ev(() => {
  const w = window.game.scene.getScene('World');
  w.startWildBattle({ species: 4, level: 9 });
});
let inB = false;
for (let i = 0; i < 12; i++) { if (await active('Battle')) { inB = true; break; } await sleep(300); }
console.log('en combate salvaje:', inB);
// Espera a que el wild aparezca y se pinte el primer mensaje ("¡Un CHARMANDER salvaje apareció!")
await sleep(2600);
await grab(`bug3-wild-${TAG}`);
await page.locator('canvas').screenshot({ path: `tests/e2e/shots/bug3-wild-shell-${TAG}.png` });
console.log('LAYOUT:', JSON.stringify(await layout()));
await browser.close();
