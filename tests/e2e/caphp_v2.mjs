// Captura las barras de PS a PS LLENO (jugador y enemigo) contra el build local,
// para verificar el ajuste: más llena que el original PERO sin tocar el borde
// verde. Llega al combate de Álvaro (flujo de piso.mjs) y graba zooms de cada caja.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:40133') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
const isNoise = (s) => /decode audio|Unable to decode|Failed to process file|audio |favicon|404/i.test(String(s));
page.on('pageerror', (e) => { if (!isNoise(e.message)) errors.push(`pageerror: ${e.message}`); });
page.on('console', (m) => { if (m.type() === 'error' && !isNoise(m.text())) errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const pos = () => ev("(() => { const s=window.game.registry.get('save'); return s?{x:s.player.x,y:s.player.y}:null })()");
const grab = async (name) => { const d = await ev(() => { const c = document.querySelector('canvas'); return c ? c.toDataURL('image/png') : null; }); if (d) writeFileSync(`tests/e2e/shots/${name}.png`, Buffer.from(d.split(',')[1], 'base64')); };
// Recorta una región rectangular del canvas (en px del canvas 240x160) y amplía.
const grabRegion = async (name, rx, ry, rw, rh, S = 8) => {
  const d = await page.evaluate((a) => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    // El canvas DOM puede estar escalado; trabajamos en coords internas del canvas.
    const sx = c.width / 240, sy = c.height / 160;
    const tmp = document.createElement('canvas');
    tmp.width = a.rw * a.S; tmp.height = a.rh * a.S;
    const ctx = tmp.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(c, a.rx * sx, a.ry * sy, a.rw * sx, a.rh * sy, 0, 0, a.rw * a.S, a.rh * a.S);
    return tmp.toDataURL('image/png');
  }, { rx, ry, rw, rh, S });
  if (d) writeFileSync(`tests/e2e/shots/${name}.png`, Buffer.from(d.split(',')[1], 'base64'));
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
for (let i = 0; i < 18; i++) { if (await active('World')) break; await press('z', 1, 400); }
await sleep(600);
// caminar a Álvaro y retar
for (let i = 0; i < 6; i++) { const p = await pos(); if (p && p.x >= 8) break; await page.keyboard.down('ArrowRight'); await sleep(300); await page.keyboard.up('ArrowRight'); await sleep(150); }
await page.keyboard.press('ArrowRight'); await sleep(150);
await page.keyboard.press('z'); await sleep(1500);
let inBattle = false;
for (let i = 0; i < 10 && !inBattle; i++) { inBattle = await active('Battle'); if (!inBattle) await press('z', 1, 500); }
console.log('en combate:', inBattle);
// Espera a que aparezcan AMBAS cajas con PS lleno (tras intro VS y entrada de mons).
await sleep(4000);
await grab('hpbar-tuned-full-scene');
// Lee la posición real de las cajas para recortar el zoom.
const boxes = await ev(() => {
  const b = window.game.scene.getScene('Battle');
  if (!b) return null;
  const out = {};
  for (const k of ['playerBox', 'enemyBox', 'foeBox', 'allyBox']) {
    const d = b[k];
    if (d && typeof d.x === 'number') out[k] = { x: d.x, y: d.y, barX: d.cfg && d.cfg.barX, barY: d.cfg && d.cfg.barY, full: d.barFullW };
  }
  return out;
});
console.log('boxes:', JSON.stringify(boxes));
// Zoom genérico de las dos esquinas donde van las cajas FRLG:
//   enemigo arriba-izquierda, jugador abajo-derecha.
await grabRegion('hpbar-tuned-enemy', 0, 0, 110, 40, 8);
await grabRegion('hpbar-tuned-player', 128, 110, 112, 40, 8);
console.log('errores consola:', errors.length);
errors.slice(0, 6).forEach((e) => console.log('  ERR>', String(e).slice(0, 140)));
await browser.close();
console.log('OK caphp_v2');
