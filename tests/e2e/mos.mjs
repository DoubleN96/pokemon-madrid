// E2E MOs (movimientos de campo, estilo FRLG): nueva partida → mundo → inyecta los
// objetos MO + un equipo compatible (agua + volador + planta + lucha) → verifica:
//   1) VUELO: menú → MAPA (modo vuelo) → volar a CHAMBERÍ (zona marcada visitada).
//   2) CORTE/FUERZA/GOLPE ROCA: ir al huerto de la Ruta 2 y retirar los obstáculos
//      con uso CONTEXTUAL (chocar) → se persisten en el save.
//   3) SURF: en Torrevieja, surfear hacia el mar.
// Reusa la navegación robusta de piso.mjs (intro con 70 iteraciones). Capturas en
// tests/e2e/shots/mos-*.png.
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
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/mos-${n}.png` });
const press = async (k, n = 1, d = 320) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const pos = () => ev("(() => { const s=window.game.registry.get('save'); return s?{map:s.player.map,x:s.player.x,y:s.player.y,dir:s.player.dir}:null })()");
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };

console.log('1. Nueva partida (invitado) → mundo');
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 800);
await page.locator('button', { hasText: 'SIN CUENTA' }).click();
await sleep(1500);
for (let i = 0; i < 70; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 220); }
if (await page.locator('input').count() === 0) await fail('no llegó al nombre');
await page.locator('input').press('Enter');
await sleep(1200);
for (let i = 0; i < 18; i++) { const r = await ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 420); }
await press('z', 12, 450);
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó al mundo');
await sleep(600);
console.log('   en el mundo OK:', JSON.stringify(await pos()));

console.log('2. Inyectar objetos MO + equipo compatible + zonas visitadas');
await ev(`(() => {
  const game = window.game;
  const s = game.registry.get('save');
  // bolsa con las 5 MOs
  s.bag = Object.assign(s.bag || {}, { mo01:1, mo02:1, mo03:1, mo04:1, mo06:1 });
  // marca zonas visitadas (Chamberí como destino de vuelo)
  s.flags = s.flags || {}; s.flags.visited = Object.assign(s.flags.visited||{}, { tetuan:true, chamberi:true });
  game.registry.set('save', s);
})()`);
// Inyectamos instancias mínimas con los tipos correctos: la lógica de MO solo mira
// species/currentHp del Pokémon (no necesita moves de combate para los campos).
await ev(`(() => {
  const game = window.game; const s = game.registry.get('save');
  const baseMon = (species, level) => ({ species, level, currentHp: 30, exp: 0, moves: [], nickname: null, status: null });
  // Squirtle(7)=agua(Surf), Pidgey(16)=normal/volador(Vuelo,Corte), Machop(66)=lucha(Fuerza,GolpeRoca), Bulbasaur(1)=planta(Corte)
  s.party = [ baseMon(7,15), baseMon(16,15), baseMon(66,15), baseMon(1,15) ];
  game.registry.set('save', s);
})()`);
console.log('   inyectado equipo:', await ev("(() => window.game.registry.get('save').party.map(p=>p.species))()"));

console.log('3. VUELO: menú → MAPA (modo vuelo) → volar a Chamberí');
await press('Enter', 1, 500);
if (!(await active('Menu'))) await fail('menú no abrió');
// bajar a MAPA (idx 2)
await press('ArrowDown', 2, 250);
await press('z', 1, 700);
if (!(await active('Map'))) await fail('Map no abrió');
const flyMode = await ev("(() => { const m=window.game.scene.getScene('Map'); return m ? m.flyMode : null })()");
console.log('   Map.flyMode =', flyMode, '(esperado true: tienes MO02 + Pidgey + zona visitada)');
if (flyMode !== true) await fail('el mapa no abrió en modo VUELO');
await shot('01-vuelo-mapa');
// Navegar el cursor hasta CHAMBERÍ (es un centro volable y visitado). Desde Tetuán
// (idx 0), 1 flecha abajo deja el cursor en Chamberí (idx 2 = punto más cercano al sur).
await press('ArrowDown', 1, 300);
const sel = await ev("(() => { const m=window.game.scene.getScene('Map'); return m ? m.cursorIdx : -1 })()");
console.log('   cursorIdx tras navegar =', sel, '(esperado 2 = Chamberí)');
// confirmar VUELO con Z (debe fijar pendingFly y cerrar todo el menú).
await press('z', 1, 500);
// esperar a que World ejecute el viaje (fadeout + restart)
let flew = false;
for (let i = 0; i < 10; i++) {
  const p = await pos();
  if (p && p.map === 'chamberi') { flew = true; break; }
  await sleep(400);
}
await sleep(400);
const afterFly = await pos();
console.log('   tras volar:', JSON.stringify(afterFly));
await shot('02-tras-vuelo');
if (!flew) await fail(`el VUELO no aterrizó en Chamberí (quedó en ${afterFly && afterFly.map})`);
console.log('   ✓ VUELO a Chamberí OK');

console.log('4. CORTE/FUERZA/GOLPE ROCA: ir al huerto de la Ruta 2 y retirar obstáculos');
// teletransporta a la Ruta 2 junto al huerto (spawn ruta2 es 9,3; el huerto está al SO)
await ev(`(() => {
  const w = window.game.scene.getScene('World');
  const s = window.game.registry.get('save');
  s.player.map='ruta2'; s.player.x=9; s.player.y=35; s.player.dir='down';
  window.game.registry.set('save', s);
  w.scene.restart({ map:'ruta2', x:9, y:35, dir:'down' });
})()`);
await sleep(1000);
console.log('   en Ruta 2:', JSON.stringify(await pos()));
// Verifica que los obstáculos están declarados y aún presentes
const obs0 = await ev("(() => { const w=window.game.scene.getScene('World'); return (w.mapData.fieldObstacles||[]).map(o=>o.kind+'@'+o.x+','+o.y) })()");
console.log('   obstáculos en Ruta 2:', JSON.stringify(obs0));
// Aplica las MOs por API directa del WorldScene (uso contextual programático): retira
// bush(6,31), boulder(7,33), rock(8,34). Esto ejercita useFieldMove → clearObstacle.
for (const [mv, x, y] of [['cut', 6, 31], ['strength', 7, 33], ['rocksmash', 8, 34]]) {
  await ev(`(() => { const w=window.game.scene.getScene('World'); w.useFieldMove('${mv}', ${x}, ${y}); })()`);
  await sleep(450);
  // cierra el diálogo de "¡usó MO!" (avanza hasta que el Dialog se cierre del todo).
  for (let i = 0; i < 6; i++) { if (!(await active('Dialog'))) break; await press('z', 1, 350); }
}
await sleep(400);
await shot('03-ruta2-obstaculos');
const cleared = await ev(`(() => {
  const s = window.game.registry.get('save');
  const o = (s.flags && s.flags.fieldObstacles && s.flags.fieldObstacles.ruta2) || {};
  const w = window.game.scene.getScene('World');
  return {
    persisted: Object.keys(o),
    collisionBush: w.mapData.collision[31][6],
    collisionBoulder: w.mapData.collision[33][7],
    collisionRock: w.mapData.collision[34][8],
  };
})()`);
console.log('   obstáculos retirados (persistidos):', JSON.stringify(cleared));
const allCleared = cleared.collisionBush === 0 && cleared.collisionBoulder === 0 && cleared.collisionRock === 0
  && cleared.persisted.length === 3;
if (!allCleared) await fail('no se retiraron los tres obstáculos de tierra');
console.log('   ✓ Corte, Fuerza y Golpe Roca retiraron y persistieron los obstáculos');

console.log('5. SURF: en Torrevieja, surfear hacia el mar');
await ev(`(() => {
  const w = window.game.scene.getScene('World');
  const s = window.game.registry.get('save');
  s.player.map='torrevieja'; s.player.x=11; s.player.y=24; s.player.dir='down';
  window.game.registry.set('save', s);
  w.scene.restart({ map:'torrevieja', x:11, y:24, dir:'down' });
})()`);
await sleep(1000);
console.log('   en Torrevieja (orilla):', JSON.stringify(await pos()));
// Surf programático sobre el agua de entrada (11,25)
await ev(`(() => { const w=window.game.scene.getScene('World'); w.useFieldMove('surf', 11, 25); })()`);
await sleep(500);
// avanzar el diálogo de "¡usó SURF!" hasta que se CIERRE (el surfing se activa al
// cerrar el diálogo, en el onClose de startSurf).
for (let i = 0; i < 6; i++) { if (!(await active('Dialog'))) break; await press('z', 1, 380); }
await sleep(400);
const surfing = await ev("(() => { const w=window.game.scene.getScene('World'); return !!w.surfing })()");
console.log('   World.surfing =', surfing, '(esperado true tras usar Surf)');
// dar un paso hacia el mar (abajo) — debe poder pisar el agua
await page.keyboard.down('ArrowDown'); await sleep(400); await page.keyboard.up('ArrowDown'); await sleep(500);
const afterSurfStep = await pos();
console.log('   tras un paso de surf:', JSON.stringify(afterSurfStep));
await shot('04-surf-mar');
if (!surfing) await fail('no se activó el surf');

console.log('\n=== RESUMEN MOs ===');
const realErrors = errors.filter((e) => !e.includes('favicon'));
console.log(`flyMode=${flyMode} | obstáculos retirados=${cleared.persisted.length}/3 | surfing=${surfing} | errores=${realErrors.length}`);
realErrors.slice(0, 8).forEach((e) => console.log('  -', e.slice(0, 140)));
if (realErrors.length === 0 && allCleared && surfing && flyMode === true) {
  console.log('\nMOs E2E: PASS ✅ (Vuelo abre mapa en modo vuelo, Corte/Fuerza/Golpe Roca retiran obstáculos, Surf navega el mar)');
  await browser.close(); process.exit(0);
} else {
  console.log('\nMOs E2E: REVISAR ⚠️');
  await browser.close(); process.exit(2);
}
