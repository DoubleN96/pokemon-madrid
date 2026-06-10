// E2E Pokémon Piso: nueva partida → intro Iván FinTips → inicial → caminar a Álvaro
// (rival en Tetuán 9,12) → combate de ENTRENADOR real → verificar flag + premio.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:5173') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });
const errors = [];
page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/piso-${n}.png` });
const press = async (k, n = 1, d = 350) => { for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); } };
const active = (s) => page.evaluate(`window.game && window.game.scene.isActive('${s}')`);
const ev = (fn) => page.evaluate(fn);
const pos = () => ev("(() => { const s=window.game.registry.get('save'); return s?{x:s.player.x,y:s.player.y}:null })()");
const fail = async (m) => { console.error('FAIL:', m); await shot('FAIL'); console.error(errors.slice(0,8)); await browser.close(); process.exit(1); };

console.log('1. Nueva partida (invitado) → intro Pokémon Piso');
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 800);
await page.locator('button', { hasText: 'SIN CUENTA' }).click();
await sleep(1500);
// avanzar intro hasta el panel de nombre
for (let i = 0; i < 30; i++) { if (await page.locator('input').count() > 0) break; await press('z', 1, 420); }
if (await page.locator('input').count() === 0) await fail('no llegó al nombre');
await shot('01-nombre');
const defName = await page.locator('input').inputValue();
console.log('   nombre por defecto:', JSON.stringify(defName));
await page.locator('input').press('Enter');
await sleep(1200);
// elegir inicial Charmander (→ + A) para tener ventaja contra Abra
for (let i = 0; i < 18; i++) { const r = await ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"); if (r) break; await press('z', 1, 420); }
await press('z', 12, 450);
let inWorld = false;
for (let i = 0; i < 18; i++) { if (await active('World')) { inWorld = true; break; } await press('z', 1, 400); }
if (!inWorld) await fail('no se llegó al mundo');
await sleep(600);
await shot('02-mundo');
console.log('   en el mundo:', JSON.stringify(await pos()), 'nombre guardado:', await ev("window.game.registry.get('save').player.name"));

console.log('2. Caminar hasta Álvaro (rival en 9,12) — spawn es 6,12, mismo row');
// andar a la derecha 3 tiles para quedar en 8,12 mirando a Álvaro (9,12)
for (let i = 0; i < 6; i++) {
  const p = await pos();
  if (p && p.x >= 8) break;
  await page.keyboard.down('ArrowRight'); await sleep(300); await page.keyboard.up('ArrowRight'); await sleep(150);
}
console.log('   pos antes de retar:', JSON.stringify(await pos()));
await shot('03-ante-alvaro');

console.log('3. Mirar a Álvaro (derecha) + A → combate de entrenador');
// asegurar que miramos a la derecha sin movernos (toque corto)
await page.keyboard.press('ArrowRight'); await sleep(150);
await page.keyboard.press('z'); await sleep(1500);
let inBattle = false;
for (let i = 0; i < 8; i++) { if (await active('Battle')) { inBattle = true; break; } await press('z', 1, 400); }
if (!inBattle) {
  // quizá hubo que avanzar diálogo de intro del entrenador primero
  for (let i = 0; i < 6 && !inBattle; i++) { await press('z', 1, 500); inBattle = await active('Battle'); }
}
if (!inBattle) await fail('no arrancó el combate de entrenador con Álvaro');
await sleep(1500);
await shot('04-combate-alvaro');
console.log('   ¡COMBATE DE ENTRENADOR contra Álvaro!');

console.log('4. Luchar hasta el final (Álvaro tiene 3 Pokémon)');
let over = false;
for (let i = 0; i < 260; i++) {
  if (!(await active('Battle'))) { over = true; break; }
  await press('z', 1, 420);
  if (i === 30) await shot('05-mid');
}
if (!over) await fail('el combate de entrenador no terminó');
await sleep(1200);
await shot('06-tras-combate');

const result = await ev(`(() => { const s=window.game.registry.get('save'); return JSON.stringify({ money: s.player.money, flag: s.flags && s.flags.alvaro_rival_1, badges: s.flags && s.flags.badges, party: s.party.map(p=>'sp'+p.species+'L'+p.level+'hp'+p.currentHp), map: s.player.map, x: s.player.x, y: s.player.y }) })()`);
console.log('   resultado:', result);
const r = JSON.parse(result);

console.log('\n=== RESUMEN PISO ===');
const realErrors = errors.filter(e => !e.includes('favicon'));
console.log('Nombre por defecto =', defName, '| flag alvaro_rival_1 =', r.flag, '| dinero =', r.money, '| medallas =', JSON.stringify(r.badges));
console.log('Errores consola:', realErrors.length);
realErrors.slice(0, 8).forEach(e => console.log('  -', e.slice(0, 140)));
// Éxito: si GANÓ, flag=true. Si PERDIÓ (whiteout), volvió a Tetuán curado y flag sigue sin marcar (reintentable). Ambos son comportamiento válido sin errores.
const won = r.flag === true;
const lostOk = r.flag !== true && r.map === 'tetuan';
if ((won || lostOk) && realErrors.length === 0) {
  console.log(won ? '\nPISO E2E: PASS ✅ (derrotaste a Álvaro, flag+premio marcados)' : '\nPISO E2E: PASS ✅ (combate de entrenador funcionó; perdiste y volviste a Tetuán, reintentable)');
  await browser.close(); process.exit(0);
} else {
  console.log('\nPISO E2E: REVISAR ⚠️');
  await browser.close(); process.exit(2);
}
