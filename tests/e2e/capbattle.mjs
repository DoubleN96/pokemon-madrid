// Captura LIMPIA del combate (canvas) para verificar la UI FRLG nueva.
import { chromium } from 'playwright';
const URL = (process.argv[2] || 'https://pokemon-madrid.stratomai.com') + '/?canvas=1';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 }, deviceScaleFactor: 3 });
const sleep = (ms) => p.waitForTimeout(ms);
const press = async (k, n = 1, d = 230) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await sleep(d); } };
await p.goto(URL, { waitUntil: 'networkidle' });
await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await p.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 700);
try { await p.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 4000 }); } catch (e) {}
await sleep(1000);
for (let i = 0; i < 70; i++) { if (await p.locator('input').count() > 0) break; await press('z', 1, 170); }
if (await p.locator('input').count() > 0) { await p.locator('input').press('Enter'); await sleep(900); }
// inicial Charmander (→ + A)
for (let i = 0; i < 20; i++) { const r = await p.evaluate("(()=>{const s=window.game.scene.getScene('Intro');return !!(s&&s.starterSprites&&s.starterSprites.length)})()"); if (r) break; await press('z', 1, 200); }
await press('ArrowRight', 1, 250); await press('z', 14, 280);
for (let i = 0; i < 30; i++) { if (await p.evaluate("window.game.scene.isActive('World')")) break; await press('z', 1, 250); }
await sleep(1200);
// caminar a Álvaro (rival 9,12; spawn 6,12) y retar
await press('ArrowRight', 2, 300);
for (let i = 0; i < 6; i++) {
  if (await p.evaluate("window.game.scene.isActive('Battle')")) break;
  await press('ArrowRight', 1, 280); await press('z', 1, 350);
}
await sleep(2500); // dejar pasar la intro VS al combate
const inB = await p.evaluate("window.game.scene.isActive('Battle')");
await p.locator('canvas').screenshot({ path: 'tests/e2e/shots/cap-battle.png' });
console.log('en combate:', inB);
await b.close();
