// Captura el NUEVO sprite de Marcelino en moto/bici (marcelino_bike_*) contra el
// build local. Monta la bici, mira en las 4 direcciones, y para cada una graba el
// canvas 1:1 + lee el charKey/frame del player para confirmar que usa
// 'marcelino_bike'. Guarda shots con nombres moto-v2-*.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv[2] || '40133';
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
// Recorta el canvas alrededor del jugador (centrado) y amplía para juzgar el sprite.
const grabZoom = async (name) => {
  const d = await ev(() => {
    const c = document.querySelector('canvas');
    if (!c) return null;
    // canvas interno del juego es 240x160; el jugador está centrado por la cámara.
    const tmp = document.createElement('canvas');
    const S = 6; const CW = 64; const CH = 64; // ventana 64x64 alrededor del centro
    tmp.width = CW * S; tmp.height = CH * S;
    const ctx = tmp.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // centro del canvas del juego
    const gx = c.width / 2 - CW / 2;
    const gy = c.height / 2 - CH / 2;
    ctx.drawImage(c, gx, gy, CW, CH, 0, 0, CW * S, CH * S);
    return tmp.toDataURL('image/png');
  });
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
await sleep(800);

console.log('A PIE:', JSON.stringify(await playerInfo()));
await grabZoom('moto-v2-0-apie');

// Monta la bici.
await ev(() => {
  const save = window.game.registry.get('save');
  save.flags = save.flags || {}; save.flags.riding = true;
  window.game.scene.getScene('World').syncPlayerMount();
});
await sleep(400);
console.log('MONTADO down(idle):', JSON.stringify(await playerInfo()));
await grabZoom('moto-v2-1-down');
await grab('moto-v2-full-down');

// 4 direcciones, una captura por dirección (gira sin moverse mucho).
for (const [key, tag] of [['ArrowRight', 'right'], ['ArrowUp', 'up'], ['ArrowLeft', 'left'], ['ArrowDown', 'down']]) {
  await page.keyboard.press(key); await sleep(120);
  await page.keyboard.down(key); await sleep(180); await page.keyboard.up(key); await sleep(260);
  console.log(`MONTADO ${tag}:`, JSON.stringify(await playerInfo()));
  await grabZoom(`moto-v2-2-${tag}`);
}

await browser.close();
console.log('OK capmoto_v2');
