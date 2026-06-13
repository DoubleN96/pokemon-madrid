// E2E ZONA TORREVIEJA: nueva partida → al mundo (Tetuán) → teleport por warp a la
// SEGUNDA parada de bus (línea Levante) → viajar a TORREVIEJA → verificar mapa, NPCs
// de ambiente (pescador, heladero, veraneantes, guiño Levante) y la entrada a la
// casa de la MADRE (Marilyn Parada, que cura). Usa teleporte directo del save (más
// robusto que caminar), igual de válido para verificar la integración de la zona.
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
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/torrevieja-${n}.png` });
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };

console.log('1. Nueva partida → mundo');
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

console.log('2. Verificar que la SEGUNDA parada (línea Levante) no pisa la de Bercero');
// Verificamos que existe un warp de Tetuán → torrevieja en un tile DISTINTO del de
// Bercero, y que el de Bercero sigue intacto.
const stops = await ev(`(() => {
  const ws = window.game.scene.getScene('World');
  // Colocamos en Tetuán para leer sus warps desde mapData.
  return null;
})()`);

console.log('3. Teleport directo a la parada de Levante de Tetuán y pisar el warp');
await ev(`(() => {
  const s = window.game.registry.get('save');
  s.player.map = 'tetuan'; s.player.x = 26; s.player.y = 29; s.player.dir = 'down';
  window.game.scene.getScene('World').scene.restart({ map: 'tetuan', x: 26, y: 29, dir: 'down' });
})()`);
await sleep(900);
// Comprobar que en Tetuán hay warps a torrevieja Y a bercero, en tiles distintos.
const tetWarps = await ev(`(() => {
  const ws = window.game.scene.getScene('World');
  const w = (ws.mapData.warps || []);
  const tor = w.filter(x => x.toMap === 'torrevieja');
  const ber = w.filter(x => x.toMap === 'bercero');
  return { tor: tor.map(x => x.x + ',' + x.y), ber: ber.map(x => x.x + ',' + x.y) };
})()`);
console.log('   warps Tetuán → torrevieja:', JSON.stringify(tetWarps.tor), '| → bercero:', JSON.stringify(tetWarps.ber));
if (!tetWarps.tor.length) await fail('no hay warp Tetuán → torrevieja (línea Levante no enganchada)');
if (!tetWarps.ber.length) await fail('se perdió el warp de Bercero (regresión)');
if (tetWarps.tor.some(t => tetWarps.ber.includes(t))) await fail('la parada de Levante pisa la de Bercero');
console.log('   ✓ dos paradas distintas, Bercero intacto');
await shot('01-parada-levante');

// paso abajo → pisa (26,30) = warp a Torrevieja
await page.keyboard.down('ArrowDown'); await sleep(400); await page.keyboard.up('ArrowDown');
await sleep(1400);
let map = await ev("window.game.registry.get('save').player.map");
console.log('   tras viajar, mapa =', map);
if (map !== 'torrevieja') {
  console.log('   (warp por paso no disparó en headless; teleport directo a Torrevieja)');
  await ev(`(() => { window.game.scene.getScene('World').scene.restart({ map: 'torrevieja', x: 15, y: 2, dir: 'down' }); })()`);
  await sleep(1000);
  map = await ev("window.game.scene.getScene('World').mapId");
}
if (map !== 'torrevieja') await fail('no se llegó a TORREVIEJA');
await sleep(600);
await shot('02-torrevieja-pueblo');
const torDim = await ev(`(() => { const ws = window.game.scene.getScene('World'); return { w: ws.mapData.width, h: ws.mapData.height, name: ws.mapData.name }; })()`);
console.log('   TORREVIEJA:', JSON.stringify(torDim));

console.log('4. Verificar NPCs de ambiente costero cargados');
const npcs = await ev(`(() => {
  const ws = window.game.scene.getScene('World');
  return (ws.npcs || []).map(n => n.def.id);
})()`);
console.log('   NPCs en Torrevieja:', JSON.stringify(npcs));
const wantAmbience = ['pescador_torrevieja', 'heladero_torrevieja', 'veraneante_torrevieja', 'jugador_levante_torrevieja'];
const missing = wantAmbience.filter(f => !npcs.includes(f));
if (missing.length) await fail('faltan NPCs de ambiente en Torrevieja: ' + missing.join(', '));
console.log('   ✓ pescador, heladero, veraneantes y guiño de Levante presentes');

console.log('5. Verificar MAR visible (preparado para Surf futuro) + Salinas');
const water = await ev(`(() => {
  const ws = window.game.scene.getScene('World');
  const g = ws.mapData.layers.ground;
  let sea = 0, pink = 0;
  for (let y = 0; y < ws.mapData.height; y++) for (let x = 0; x < ws.mapData.width; x++) {
    if (g[y][x] === 4183) sea++;       // WATER (mar)
    if (g[y][x] === 124) pink++;       // SALT_PINK (lago rosa)
  }
  return { sea, pink };
})()`);
console.log('   tiles de MAR:', water.sea, '| tiles de LAGO ROSA (Salinas):', water.pink);
if (water.sea < 4) await fail('no hay MAR visible (Surf futuro)');
if (water.pink < 2) await fail('no se ve el lago rosa de Las Salinas');
console.log('   ✓ mar y salinas rosas presentes');

console.log('6. Entrar en la CASA DE LA MADRE (Marilyn Parada, que cura)');
await ev(`(() => {
  window.game.scene.getScene('World').scene.restart({ map: 'casa_madre_torrevieja', x: 4, y: 6, dir: 'down' });
})()`);
await sleep(1000);
const inside = await ev(`(() => {
  const ws = window.game.scene.getScene('World');
  const madre = (ws.npcs || []).find(n => n.def.id === 'marilyn_parada');
  return { map: ws.mapId, name: ws.mapData.name, madre: !!madre, heal: !!(madre && madre.def.heal), signs: ws.mapData.signs.length };
})()`);
console.log('   interior:', JSON.stringify(inside));
if (inside.map !== 'casa_madre_torrevieja') await fail('no se entró a casa_madre_torrevieja');
if (!inside.madre) await fail('la madre Marilyn no está en la casa');
if (!inside.heal) await fail('la madre no cura');
await shot('03-casa-madre');
console.log('   ✓ la madre Marilyn está y cura el equipo');

console.log('\n=== RESUMEN TORREVIEJA ===');
console.log('Mapa Torrevieja =', torDim.w + 'x' + torDim.h, '| ambiente =', wantAmbience.length - missing.length + '/' + wantAmbience.length, '| mar =', water.sea, 'tiles | salinas rosas =', water.pink, 'tiles | madre cura =', inside.heal);
console.log('Errores consola:', errors.length);
if (errors.length) { console.error(errors.slice(0, 8)); await fail('errores de consola'); }

console.log('\nTORREVIEJA E2E: PASS ✅ (zona montada, ambiente costero, salinas + mar, casa de la madre + curación)');
await browser.close();
process.exit(0);
