// Verifica el fix de la moto: al montar, el sprite debe seguir siendo Marcelino
// (NO el genérico "Red" partido). Captura a pie y montado, en 4 direcciones, y
// lee el charKey del player para confirmar que montado usa 'marcelino'.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv[2] || '8199';
const URL = `http://localhost:${PORT}/?canvas=1`;
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const grab = async (name) => { const d = await ev(() => { const c = document.querySelector('canvas'); return c ? c.toDataURL('image/png') : null; }); if (d) writeFileSync(`tests/e2e/shots/${name}.png`, Buffer.from(d.split(',')[1], 'base64')); };
const playerInfo = () => ev(`(() => { const w = window.game.scene.getScene('World'); if (!w || !w.player) return null; const sp = w.player.sprite; return { charKey: w.player.charKey, dir: w.player.dir, frame: sp.frame.name, riding: !!(window.game.registry.get('save').flags||{}).riding }; })()`);

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

console.log('A PIE:', JSON.stringify(await playerInfo()));
await grab('moto-fix-1-apie');

// Monta la moto: pon flag riding=true y re-sincroniza el sprite (como hace el menú).
await ev(() => {
  const save = window.game.registry.get('save');
  save.flags = save.flags || {}; save.flags.riding = true;
  const w = window.game.scene.getScene('World');
  w.syncPlayerMount();
});
await sleep(400);
console.log('MONTADO idle:', JSON.stringify(await playerInfo()));
await grab('moto-fix-2-montado-down');

// Muévete en las 4 direcciones para ver el sprite montado en cada una.
for (const [key, tag] of [['ArrowRight', 'right'], ['ArrowUp', 'up'], ['ArrowLeft', 'left'], ['ArrowDown', 'down']]) {
  await page.keyboard.down(key); await sleep(260); await page.keyboard.up(key); await sleep(220);
  console.log(`MONTADO ${tag}:`, JSON.stringify(await playerInfo()));
}
await grab('moto-fix-3-montado-mov');

// Baja de la moto.
await ev(() => {
  const save = window.game.registry.get('save');
  save.flags.riding = false;
  window.game.scene.getScene('World').syncPlayerMount();
});
await sleep(400);
console.log('BAJADO:', JSON.stringify(await playerInfo()));
await grab('moto-fix-4-baja');
await browser.close();
