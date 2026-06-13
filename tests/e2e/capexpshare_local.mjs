// Verifica el Reparto de Experiencia (EXP Share): abre OPCIONES, activa el toggle,
// confirma que persiste en el save, y comprueba que tras un combate la BANCA gana
// experiencia (no solo el Pokémon activo). Captura el menú de OPCIONES.
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
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const fail = async (m) => { console.error('FAIL:', m); await page.locator('canvas').screenshot({ path: 'tests/e2e/shots/expshare-FAIL.png' }); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };

console.log('1. Nueva partida → mundo');
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
await sleep(400);

console.log('   default options.expShare =', await ev("window.game.registry.get('save').options && window.game.registry.get('save').options.expShare"));

console.log('2. Abrir menú (Enter) → navegar a OPCIONES → A');
await page.keyboard.press('Enter'); await sleep(700);
let inMenu = await active('Menu');
if (!inMenu) await fail('no se abrió el menú');
// OPCIONES es la 5.ª opción (índice 4): bajar 4 veces y confirmar.
const rootLabels = await ev("(() => { const m=window.game.scene.getScene('Menu'); return m.rootTexts ? m.rootTexts.map(t=>t.text) : []; })()");
console.log('   menú raíz:', JSON.stringify(rootLabels));
const optIdx = rootLabels.findIndex((l) => /OPCIONES/i.test(l));
if (optIdx < 0) await fail('no hay entrada OPCIONES en el menú raíz');
await press('ArrowDown', optIdx, 250);
await page.keyboard.press('z'); await sleep(600);
const inOpts = await ev("(() => { const m=window.game.scene.getScene('Menu'); return m.mode === 'opts'; })()");
if (!inOpts) await fail('no entró en el submenú OPCIONES');
await page.locator('canvas').screenshot({ path: 'tests/e2e/shots/expshare-menu-canvas.png' });
await page.screenshot({ path: 'tests/e2e/shots/expshare-menu.png' });

console.log('3. Activar el toggle (A) y verificar persistencia');
await page.keyboard.press('z'); await sleep(400); // toggle Reparto EXP → SÍ
const afterToggle = await ev("window.game.registry.get('save').options.expShare");
console.log('   options.expShare tras toggle =', afterToggle);
if (afterToggle !== true) await fail('el toggle no activó expShare');
const valText = await ev("(() => { const m=window.game.scene.getScene('Menu'); return m.optRows ? m.optRows[0].valT.text : ''; })()");
console.log('   texto del valor en pantalla =', JSON.stringify(valText));

console.log('4. Cerrar menú, reforzar equipo (activo + banca) y combatir → la banca gana exp');
await page.keyboard.press('x'); await sleep(300); // B → vuelve a raíz
await page.keyboard.press('Enter'); await sleep(500); // cierra menú
for (let i = 0; i < 10; i++) { if (await active('World')) break; await sleep(200); }
const benchExpBefore = await ev(() => {
  const s = window.game.registry.get('save');
  const mon = s.party[0];
  mon.level = 50; mon.currentHp = 999;
  if (!mon.moves.some((m) => m.pp > 0)) mon.moves[0] = { id: 'tackle', pp: 35, maxPp: 35 };
  if (s.party.length < 2) {
    const bench = JSON.parse(JSON.stringify(mon));
    bench.species = 7; bench.level = 10; bench.currentHp = 30; bench.moves = [{ id: 'tackle', pp: 35, maxPp: 35 }];
    s.party.push(bench);
  }
  return s.party[1].exp;
});
console.log('   exp de la banca ANTES =', benchExpBefore);
// Lanza combate contra MARIEL (2 Pokémon) por API.
const launched = await ev(() => {
  const w = window.game.scene.getScene('World');
  const npc = (w.npcs || []).find((n) => n.def && n.def.trainer && n.def.trainer.name === 'MARIEL');
  if (!npc) return false; w.startTrainerBattle(npc); return true;
});
if (!launched) await fail('no se encontró a MARIEL');
for (let i = 0; i < 12; i++) { if (await active('Battle')) break; await sleep(400); }
// Lucha pulsando Z hasta que termine.
for (let i = 0; i < 220; i++) { if (!(await active('Battle'))) break; await page.keyboard.press('z'); await sleep(250); }
await sleep(800);
const benchExpAfter = await ev("window.game.registry.get('save').party[1] ? window.game.registry.get('save').party[1].exp : null");
console.log('   exp de la banca DESPUÉS =', benchExpAfter);

const ok = benchExpAfter !== null && benchExpAfter > benchExpBefore;
const realErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('404'));
console.log('\n=== RESUMEN EXP SHARE ===');
console.log('expShare persistido:', afterToggle === true, '| banca ganó exp:', ok, '| errores:', realErrors.length);
realErrors.slice(0, 6).forEach((e) => console.log('  ERR>', e.slice(0, 140)));
await browser.close();
process.exit(ok && afterToggle === true && realErrors.length === 0 ? 0 : 2);
