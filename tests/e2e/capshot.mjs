// Captura LIMPIA del canvas del juego (sin la carcasa) para enseñar calidad.
// Llega al mundo, captura el canvas; luego entra en combate y captura otra vez.
import { chromium } from 'playwright';
const URL = (process.argv[2] || 'https://pokemon-madrid.stratomai.com') + '/?canvas=1';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 }, deviceScaleFactor: 3 });
const sleep = (ms) => p.waitForTimeout(ms);
const press = async (k, n = 1, d = 220) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await sleep(d); } };
await p.goto(URL, { waitUntil: 'networkidle' });
await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await p.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 700);
try { await p.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 4000 }); } catch (e) {}
await sleep(1200);
for (let i = 0; i < 70; i++) { if (await p.locator('input').count() > 0) break; await press('z', 1, 170); }
if (await p.locator('input').count() > 0) { await p.locator('input').press('Enter'); await sleep(1000); }
// elegir inicial
for (let i = 0; i < 20; i++) { const r = await p.evaluate("(()=>{const s=window.game.scene.getScene('Intro');return !!(s&&s.starterSprites&&s.starterSprites.length)})()"); if (r) break; await press('z', 1, 200); }
// avanzar hasta entrar de verdad en el mundo
for (let i = 0; i < 30; i++) { if (await p.evaluate("window.game.scene.isActive('World')")) break; await press('z', 1, 300); }
await sleep(1800);
const canvas = p.locator('canvas');
const map = await p.evaluate("(()=>{const s=window.game.registry.get('save');return s?s.player.map+' '+s.player.x+','+s.player.y:null})()");
console.log('en World:', await p.evaluate("window.game.scene.isActive('World')"), '| pos:', map);
await canvas.screenshot({ path: 'tests/e2e/shots/cap-mundo.png' });
// caminar hacia Álvaro (rival 9,12; spawn 6,12) y entrar en combate
await press('ArrowRight', 2, 280);
await press('z', 1, 400);
await sleep(2200);
const inBattle = await p.evaluate("window.game.scene.isActive('Battle')");
await canvas.screenshot({ path: 'tests/e2e/shots/cap-combate.png' });
console.log('combate?', inBattle);
await b.close();
