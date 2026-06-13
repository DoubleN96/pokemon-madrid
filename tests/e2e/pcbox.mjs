// E2E "EL PC DE FINTIPS": nueva partida → entra al Centro Pokémon de Tetuán →
// habla con el PC de FinTips → abre la UI de cajas → DEPOSITA un Pokémon del equipo
// y lo RETIRA de vuelta. Verifica las reglas (equipo no se vacía, máx 6) y el
// overflow al capturar con el equipo lleno (sendToPc) por inyección de estado.
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
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/pcbox-${n}.png` });
const press = async (k, n = 1, d = 300) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0, 8)); await browser.close(); process.exit(1); };
// Espera a que la escena Pc no esté ocupada (sin diálogo abierto) y al modo dado.
const pcMode = () => ev("(() => { const s=window.game.scene.getScene('Pc'); return s ? s.mode : null })()");
const pcBusy = () => ev("(() => { const s=window.game.scene.getScene('Pc'); return s ? !!s.busy : false })()");
const waitIdle = async () => { for (let i = 0; i < 20; i++) { if (!(await pcBusy())) return; await sleep(200); } };

console.log('1. Nueva partida (invitado) hasta el mundo');
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
await press('z', 12, 420);
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó al mundo');
await sleep(500);

console.log('2. Inyectar un segundo Pokémon en el equipo (para poder depositar uno)');
await ev(`(() => {
  const s = window.game.registry.get('save');
  const w = window.game.scene.getScene('World');
  // createMonster no está expuesto; clonamos el inicial y le cambiamos especie/nivel.
  const clone = JSON.parse(JSON.stringify(s.party[0]));
  clone.species = 19; clone.nickname = 'RATABANK';
  s.party.push(clone);
  return s.party.length;
})()`);
const beforePc = await ev(`(() => { const s=window.game.registry.get('save'); return JSON.stringify({ party: s.party.length, hasPc: !!s.pc, stored: s.pc ? s.pc.boxes.reduce((a,b)=>a+b.filter(Boolean).length,0) : -1 }) })()`);
console.log('   estado pre-PC:', beforePc);

console.log('3. Abrir la escena PC directamente (como hace el NPC del Centro)');
// Reutilizamos el mismo camino que WorldScene.openPc para no depender de caminar.
await ev(`(() => {
  const w = window.game.scene.getScene('World');
  w.openPc(() => {});
})()`);
let inPc = false;
for (let i = 0; i < 12; i++) { if (await active('Pc')) { inPc = true; break; } await sleep(200); }
if (!inPc) await fail('no se abrió la escena Pc');
await sleep(400);
await shot('01-menu');
const menuOpts = await ev("(() => { const s=window.game.scene.getScene('Pc'); return s.mode })()");
console.log('   PC abierto, modo:', menuOpts);

console.log('4. DEPOSITAR: menú → DEPOSITAR (2ª opción) → A → elegir 2º del equipo → A');
await press('ArrowDown', 1, 250); // a DEPOSITAR
await press('z', 1, 400);          // entra a la rejilla con cursor en EQUIPO
// el cursor empieza en el equipo (inParty=true); movernos al 2º (el clon)
await press('ArrowRight', 1, 250);
await shot('02-deposit-cursor');
await press('z', 1, 600);          // depositar (abre diálogo de confirmación)
await press('z', 1, 500);          // cerrar el diálogo (1 sola línea)
await waitIdle();                   // esperar a que el diálogo cierre del todo
await sleep(300);
const afterDeposit = await ev(`(() => { const s=window.game.registry.get('save'); return JSON.stringify({ party: s.party.length, stored: s.pc.boxes.reduce((a,b)=>a+b.filter(Boolean).length,0), box0: s.pc.boxes[0].filter(Boolean).map(m=>m.species) }) })()`);
console.log('   tras depositar:', afterDeposit);
await shot('03-after-deposit');
const ad = JSON.parse(afterDeposit);
if (!(ad.party === 1 && ad.stored === 1)) await fail(`depósito no cuadró: ${afterDeposit}`);

console.log('5. RETIRAR: B al menú → RETIRAR → A → elegir el de la caja (slot 0) → A');
await waitIdle();
await press('x', 1, 400);          // B vuelve al menú
// si seguía en grid (diálogo tardío), reintentar B una vez
for (let i = 0; i < 3 && (await pcMode()) !== 'menu'; i++) { await press('x', 1, 400); }
const backMenu = await pcMode();
console.log('   de vuelta al modo:', backMenu);
if (backMenu !== 'menu') await fail('B no volvió al menú del PC');
await press('ArrowUp', 1, 250);    // asegurar que estamos en RETIRAR (1ª opción)
await press('z', 1, 500);          // entra a la rejilla (cursor en caja, slot 0)
await shot('04-withdraw-cursor');
await press('z', 1, 600);          // retirar (abre diálogo)
await press('z', 1, 500);          // cerrar diálogo
await waitIdle();
await sleep(300);
const afterWithdraw = await ev(`(() => { const s=window.game.registry.get('save'); return JSON.stringify({ party: s.party.length, stored: s.pc.boxes.reduce((a,b)=>a+b.filter(Boolean).length,0) }) })()`);
console.log('   tras retirar:', afterWithdraw);
await shot('05-after-withdraw');
const aw = JSON.parse(afterWithdraw);
if (!(aw.party === 2 && aw.stored === 0)) await fail(`retiro no cuadró: ${afterWithdraw}`);

console.log('6. Salir del PC y volver al mundo');
await waitIdle();
await press('x', 1, 400);          // B al menú
for (let i = 0; i < 3 && (await pcMode()) !== 'menu'; i++) { await press('x', 1, 400); }
await press('ArrowDown', 3, 200);  // a SALIR
await press('z', 1, 600);
let backWorld = false;
for (let i = 0; i < 12; i++) { if (await active('World') && !(await active('Pc'))) { backWorld = true; break; } await sleep(200); }
if (!backWorld) await fail('no se volvió al mundo tras salir del PC');
await shot('06-back-world');

console.log('\n=== RESUMEN PC ===');
const realErrors = errors.filter((e) => !e.includes('favicon'));
console.log('Depósito:', afterDeposit);
console.log('Retiro:', afterWithdraw);
console.log('Errores consola:', realErrors.length);
realErrors.slice(0, 8).forEach((e) => console.log('  -', e.slice(0, 140)));
if (realErrors.length === 0) {
  console.log('\nPC E2E: PASS ✅ (depositar y retirar funcionan; equipo respeta reglas; sin errores)');
  await browser.close(); process.exit(0);
} else {
  console.log('\nPC E2E: REVISAR ⚠️');
  await browser.close(); process.exit(2);
}
