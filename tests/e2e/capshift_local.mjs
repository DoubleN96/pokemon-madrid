// Captura del prompt SHIFT (FRLG): cuando el jugador debilita a un Pokémon del
// rival entrenador y a este le quedan más, el juego ofrece "[Rival] va a sacar a
// [X]. ¿Quieres cambiar de POKéMON?" (SÍ/NO). Combatimos contra MARIEL (2 Pokémon)
// con un equipo reforzado de 2 miembros (para que tenga sentido la oferta) y
// capturamos el menú SÍ/NO. Sirve dist/ vía vite dev (igual que piso.mjs).
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
const phase = () => ev("(() => { const b=window.game.scene.getScene('Battle'); return (b&&b.battle)?b.battle.state().phase:''; })()");
const shiftCount = () => ev('window.__shiftPromptShown || 0');
const msgText = () => ev("(() => { const b=window.game.scene.getScene('Battle'); return (b && b.msg && b.msg.text) ? b.msg.text.text : ''; })()");
const fail = async (m) => { console.error('FAIL:', m); await page.locator('canvas').screenshot({ path: 'tests/e2e/shots/shift-FAIL.png' }); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };

console.log('1. Nueva partida invitado → mundo');
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
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó al mundo');
await sleep(400);

console.log('2. Reforzar equipo (inicial fuerte + 1 reserva sana) para que la oferta SHIFT tenga sentido');
await ev(() => {
  const s = window.game.registry.get('save');
  const mon = s.party[0];
  mon.level = 60; mon.currentHp = 999;
  if (!mon.moves.some((m) => m.pp > 0)) mon.moves[0] = { id: 'tackle', pp: 35, maxPp: 35 };
  if (s.party.length < 2) {
    const reserve = JSON.parse(JSON.stringify(mon));
    reserve.species = 7; reserve.level = 25; reserve.currentHp = 60;
    reserve.moves = [{ id: 'tackle', pp: 35, maxPp: 35 }];
    s.party.push(reserve);
  }
});

console.log('3. Lanzar combate contra MARIEL (2 Pokémon) por API de WorldScene');
const launched = await ev(() => {
  const w = window.game.scene.getScene('World');
  const npc = (w.npcs || []).find((n) => n.def && n.def.trainer && n.def.trainer.name === 'MARIEL');
  if (!npc) return false;
  w.startTrainerBattle(npc);
  return true;
});
if (!launched) await fail('no se encontró a MARIEL');
let inBattle = false;
for (let i = 0; i < 12; i++) { if (await active('Battle')) { inBattle = true; break; } await sleep(400); }
if (!inBattle) await fail('no arrancó el combate con MARIEL');
console.log('   ¡combate de entrenador contra MARIEL!');
// Avanza la intro VS hasta el menú de acción.
for (let i = 0; i < 24; i++) { if (/qué hará/i.test(await msgText())) break; await press('z', 1, 300); }

console.log('4. Atacar hasta que se muestre el prompt SÍ/NO de cambio (handleEnemyShift)');
let caught = false;
for (let guard = 0; guard < 400 && !caught; guard++) {
  if (!(await active('Battle'))) break;
  const ph = await phase();
  const m = await msgText();
  // En cuanto el menú SÍ/NO esté en pantalla (texto "¿Quieres cambiar...") paramos.
  if (/cambiar de POK/i.test(m)) { caught = true; break; }
  // Si el motor ya está en enemy-shift, NO pulsamos nada que pueda navegar el menú;
  // solo confirmamos el mensaje de debilitamiento con UNA pulsación y esperamos.
  if (ph === 'enemy-shift') {
    if (/debilitado|usó|eficaz|crítico|afecta/i.test(m)) { await page.keyboard.press('z'); await sleep(250); }
    else { await sleep(120); }
    continue;
  }
  if (/qué hará/i.test(m)) { await press('z', 1, 160); await press('z', 1, 220); continue; } // LUCHA + 1.er movimiento
  if (/usó|debilitado|eficaz|crítico|ganado|nivel|aprendido|afecta|fallado/i.test(m)) await page.keyboard.press('z');
  await sleep(55);
}

if (caught) {
  await sleep(450); // deja respirar al render del menú SÍ/NO
  // Captura ampliada (shell GBA, 720x480) para que se lea el bocadillo + menú SÍ/NO,
  // y una 1:1 del canvas nativo (240x160) para inspección de layout.
  await page.screenshot({ path: 'tests/e2e/shots/shift-prompt.png' });
  await page.locator('canvas').screenshot({ path: 'tests/e2e/shots/shift-prompt-canvas.png' });
}

console.log('   prompt SHIFT alcanzado:', caught, '| shiftCount:', await shiftCount());
console.log('   mensaje en pantalla:', JSON.stringify((await msgText()).slice(0, 60)));
const realErrors = errors.filter((e) => !e.includes('favicon') && !e.includes('404'));
console.log('   errores consola:', realErrors.length);
realErrors.slice(0, 6).forEach((e) => console.log('  ERR>', e.slice(0, 140)));
await browser.close();
process.exit(caught ? 0 : 2);
