// Captura de QA: sala del ALTO MANDO de la Liga Chamberí (4 miembros reales +
// Campeón). Nueva partida invitado → mundo → fuerza warp al interior
// `liga_chamberi` reiniciando WorldScene, y hace screenshots del recorrido.
// No forma parte de la suite E2E (es solo captura). Uso:
//   node scripts/shot_altomando.mjs [http://localhost:5173]
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:5173') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
const isAudioNoise = (s) => /decode audio|Unable to decode|Failed to process file|audio /i.test(String(s));
page.on('pageerror', (e) => { if (!isAudioNoise(e.message)) errors.push(`pageerror: ${e.message}`); });
page.on('console', (m) => { if (m.type() === 'error' && !isAudioNoise(m.text())) errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/altomando-${n}.png` });
const press = async (k, n = 1, d = 320) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);

await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 700);
await page.locator('button', { hasText: 'SIN CUENTA' }).click();
await sleep(1200);
for (let i = 0; i < 70; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 180); }
await page.locator('input').press('Enter');
await sleep(1000);
for (let i = 0; i < 18; i++) { const r = await ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 380); }
await press('z', 12, 380);
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 350); }
if (!inWorld) { console.error('no llegó al mundo'); await shot('FAIL'); await browser.close(); process.exit(1); }
await sleep(500);

// Forzar 8 medallas y teletransporte al interior de la Liga reiniciando WorldScene.
const spawn = await ev(`(() => {
  const save = window.game.registry.get('save');
  save.flags = save.flags || {};
  save.flags.badges = 8;
  const w = window.game.scene.getScene('World');
  w.scene.restart({ map: 'liga_chamberi', x: 4, y: 16, dir: 'up' });
  return true;
})()`);
await sleep(1400);
console.log('en liga_chamberi:', await ev("(() => { const s=window.game.registry.get('save'); return JSON.stringify({map:s.player.map,x:s.player.x,y:s.player.y}) })()"));
await shot('00-entrada');

// Subir por el pasillo central para ver a los 4 del Alto Mando + Campeón.
for (let i = 0; i < 6; i++) {
  await page.keyboard.down('ArrowUp'); await sleep(260); await page.keyboard.up('ArrowUp'); await sleep(200);
  await shot('step-' + i);
}
await shot('99-final');
console.log('Errores consola:', errors.filter(e => !e.includes('favicon')).length);
errors.slice(0, 6).forEach(e => console.log('  -', String(e).slice(0, 140)));
await browser.close();
process.exit(0);
