// Captura de Ann Jou: (1) su sprite en el overworld de Chamberí (junto al
// Gimnasio Trading de Mariel) y (2) el combate de entrenador contra él.
// Nueva partida invitado → inicial → teletransporte a chamberi (16,12, mirando
// arriba a Ann Jou en 16,11) → captura overworld → fuerza startTrainerBattle.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'fs';

const PORT = process.argv[2] || '8211';
const URL = `http://localhost:${PORT}/?canvas=1`;
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const sleep = (ms) => page.waitForTimeout(ms);
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const grab = async (name) => { const d = await ev(() => { const c = document.querySelector('canvas'); return c ? c.toDataURL('image/png') : null; }); if (d) writeFileSync(`tests/e2e/shots/${name}.png`, Buffer.from(d.split(',')[1], 'base64')); };

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

// Teletransporta el WorldScene a Chamberí, justo debajo de Ann Jou (16,11),
// mirando hacia arriba para verlo de frente.
await ev(() => {
  const w = window.game.scene.getScene('World');
  const save = window.game.registry.get('save');
  Object.assign(save.player, { map: 'chamberi', x: 16, y: 12, dir: 'up' });
  w.scene.restart({ map: 'chamberi', x: 16, y: 12, dir: 'up' });
});
for (let i = 0; i < 12; i++) { if (await active('World')) break; await sleep(300); }
await sleep(1200);
const annjou = await ev(() => {
  const w = window.game.scene.getScene('World');
  const n = (w.npcs || []).find((x) => x.def && x.def.id === 'ann_jou');
  return n ? { id: n.def.id, x: n.def.x, y: n.def.y, sprite: n.def.sprite, hasTrainer: !!n.def.trainer } : null;
});
console.log('Ann Jou NPC en chamberi:', JSON.stringify(annjou));
await grab('annjou-overworld');
console.log('captura overworld -> tests/e2e/shots/annjou-overworld.png');

// Fuerza el combate de entrenador contra Ann Jou.
await ev(() => {
  const w = window.game.scene.getScene('World');
  const n = (w.npcs || []).find((x) => x.def && x.def.id === 'ann_jou');
  if (n) w.startTrainerBattle(n);
});
let inB = false;
for (let i = 0; i < 14; i++) { if (await active('Battle')) { inB = true; break; } await sleep(300); }
console.log('en combate de entrenador:', inB);
await sleep(2600);
await grab('annjou-battle');
console.log('captura combate -> tests/e2e/shots/annjou-battle.png');

const party = await ev(() => {
  const s = window.game.scene.getScene('Battle');
  return s && s.enemyParty ? s.enemyParty.map((p) => ({ sp: p.species, lvl: p.level, name: p.name })) : null;
});
console.log('equipo enemigo:', JSON.stringify(party));
await browser.close();
console.log('OK');
