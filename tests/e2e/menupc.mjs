// E2E REGRESIÓN "MENÚ + PC abren" — protege contra el input-bleed de la PR de MOs:
//   1) Enter abre el MENÚ en el overworld.
//   2) menú → MAPA → cerrar NO deja el input de World pegado (inputLocked stuck).
//   3) pulsar teclas MIENTRAS el MAPA está abierto NO se filtra a World (la pila de
//      escenas no se corrompe): tras cerrar todo, el menú vuelve a abrir y se camina.
//   4) EL PC DE FINTIPS abre por interacción REAL (Z) frente al PC del Centro Pokémon.
//
// Histórico: la PR de MOs desbloqueaba el input de World al DORMIR el menú (evento
// 'sleep', cuando se abre el MAPA por encima), no solo al cerrarlo ('shutdown'). Eso
// filtraba las pulsaciones del mapa a World.openMenu()/interact() y dejaba el menú y
// el PC sin poder abrirse ("no se abre NADA"). Fix: desbloquear solo en 'shutdown'.
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
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/menupc-${n}.png` });
const press = async (k, n = 1, d = 320) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const wLocked = () => ev("(()=>{const w=window.game.scene.getScene('World');return !!w.inputLocked;})()");
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };

console.log('1. Nueva partida (invitado) → mundo');
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 800);
await page.locator('button', { hasText: 'SIN CUENTA' }).click();
await sleep(1500);
for (let i = 0; i < 70; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 200); }
if (await page.locator('input').count() === 0) await fail('no llegó al nombre');
await page.locator('input').press('Enter');
await sleep(1200);
for (let i = 0; i < 18; i++) { const r = await ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 420); }
await press('z', 12, 450);
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó al mundo');
await sleep(600);

console.log('2. Enter abre el MENÚ');
await press('Enter', 1, 600);
if (!(await active('Menu'))) await fail('Enter no abrió el menú');
await shot('01-menu');

console.log('3. menú → MAPA (idx 2) → input-bleed test → cerrar');
await press('ArrowDown', 2, 250);
await press('z', 1, 700); // abre MAPA
if (!(await active('Map'))) await fail('no se abrió el MAPA desde el menú');
// Con el MAPA abierto, World debe seguir BLOQUEADO (si no, el input se filtra).
if (!(await wLocked())) await fail('REGRESIÓN: World quedó desbloqueado con el MAPA abierto (input-bleed)');
// Pulsa Enter/Z dentro del mapa: NO debe filtrarse a World.openMenu()/interact().
await press('Enter', 1, 500);
await press('z', 1, 500);
if (!(await wLocked())) await fail('REGRESIÓN: input filtrado a World mientras el mapa estaba abierto');
// Cierra mapa y menú.
await press('x', 4, 450);
for (let i = 0; i < 10; i++) { if (!(await active('Menu')) && !(await active('Map'))) break; await press('x', 1, 400); }
if (await active('Menu') || await active('Map')) await fail('no se cerraron menú/mapa');
if (await wLocked()) await fail('REGRESIÓN: inputLocked quedó pegado tras cerrar menú/mapa');

console.log('4. tras todo, Enter REABRE el menú y se puede CAMINAR');
await press('Enter', 1, 600);
if (!(await active('Menu'))) await fail('REGRESIÓN: el menú ya no reabre con Enter');
await press('x', 1, 500);
const bx = await ev("(()=>window.game.scene.getScene('World').player.tileX)()");
await page.keyboard.down('ArrowRight'); await sleep(450); await page.keyboard.up('ArrowRight'); await sleep(350);
const ax = await ev("(()=>window.game.scene.getScene('World').player.tileX)()");
if (ax === bx) await fail('REGRESIÓN: el jugador no se mueve (input de World muerto)');
console.log('   menú reabre OK · jugador camina', `${bx}->${ax}`);

console.log('5. EL PC DE FINTIPS abre por interacción REAL (Z) en el Centro Pokémon');
// El PC (pcAccess) vive en el interior cpoke_tetuan en (8,3). Colocamos al jugador
// justo debajo (8,4) mirando arriba y usamos la tecla de interacción de verdad.
await ev(`(() => {
  const w = window.game.scene.getScene('World');
  w.scene.restart({ map: 'cpoke_tetuan', x: 8, y: 4, dir: 'up' });
})()`);
let inCenter = false;
for (let i = 0; i < 20; i++) { const mid = await ev("(()=>{const w=window.game.scene.getScene('World');return w&&w.mapId;})()"); if (mid === 'cpoke_tetuan') { inCenter = true; break; } await sleep(200); }
if (!inCenter) await fail('no se entró al Centro Pokémon (cpoke_tetuan)');
await sleep(500);
// Asegura que mira al PC (arriba) y que el input no está bloqueado.
await press('ArrowUp', 1, 250);
if (await wLocked()) await fail('input bloqueado al llegar al Centro Pokémon');
await shot('02-ante-pc');
// Interactúa: abre el diálogo del PC.
await press('z', 1, 800);
if (!(await active('Dialog'))) await fail('la interacción con el PC no abrió diálogo');
// Avanza el diálogo del PC página a página; al cerrarse el diálogo, World programa
// openPc (delayedCall 60ms) → la escena Pc arranca. Avanzamos mientras haya diálogo
// y luego damos margen a que el PC abra.
let pcOpen = false;
for (let i = 0; i < 12; i++) {
  if (await active('Pc')) { pcOpen = true; break; }
  if (await active('Dialog')) { await press('z', 1, 550); continue; }
  // Diálogo cerrado: espera a que openPc lance la escena Pc.
  await sleep(300);
  if (await active('Pc')) { pcOpen = true; break; }
}
if (!pcOpen) await fail('REGRESIÓN: EL PC DE FINTIPS no se abrió tras interactuar');
await shot('03-pc-abierto');
console.log('   PC de FinTips abierto OK');

console.log('\nPASS — menú abre, mapa no corrompe el input, jugador camina, PC abre.');
if (errors.length) { console.log('errores de consola (no fatales):', errors.slice(0, 6)); }
await browser.close();
process.exit(0);
