// Captura VISUAL de la feature MOTO: entra al mundo, abre el menú, selecciona MOTO,
// y captura el canvas a pie vs en bici (idle + moviéndose) para confirmar que el
// sprite del jugador cambia a la bici/moto cuando save.flags.riding está activo.
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:5214') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 }, deviceScaleFactor: 4 });
const sleep = (ms) => p.waitForTimeout(ms);
const press = async (k, n = 1, d = 220) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await sleep(d); } };
const ev = (fn) => p.evaluate(fn);
const active = (s) => ev(`window.game && window.game.scene.isActive('${s}')`);
// inspecciona el charKey real del GridMover del jugador y el frame que muestra
const playerState = () => ev(`(() => {
  const w = window.game.scene.getScene('World');
  if (!w || !w.player) return null;
  const s = window.game.registry.get('save');
  return { charKey: w.player.charKey, frame: w.player.sprite.frame.name, riding: !!(s && s.flags && s.flags.riding) };
})()`);

await p.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await p.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 700);
try { await p.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 4000 }); } catch (e) {}
await sleep(1200);
for (let i = 0; i < 70; i++) { if (await p.locator('input').count() > 0) break; await press('z', 1, 170); }
if (await p.locator('input').count() > 0) { await p.locator('input').press('Enter'); await sleep(1000); }
for (let i = 0; i < 20; i++) { const r = await ev("(()=>{const s=window.game.scene.getScene('Intro');return !!(s&&s.starterSprites&&s.starterSprites.length)})()"); if (r) break; await press('z', 1, 200); }
for (let i = 0; i < 30; i++) { if (await active('World')) break; await press('z', 1, 300); }
await sleep(1500);

const canvas = p.locator('canvas');
console.log('en World:', await active('World'));
console.log('estado A PIE:', JSON.stringify(await playerState()));
await canvas.screenshot({ path: 'tests/e2e/shots/moto-1-apie.png' });

// abrir menú (Enter) → bajar el cursor hasta MOTO (índice 2: EQUIPO, MOCHILA, MOTO) → confirmar
console.log('abriendo menú y seleccionando MOTO...');
await press('Enter', 1, 500);
const inMenu = await active('Menu');
console.log('menú abierto:', inMenu);
await press('ArrowDown', 2, 250);  // EQUIPO(0) → MOCHILA(1) → MOTO(2)
await press('z', 1, 600);          // confirmar MOTO (toggleMoto + closeMenu)
await sleep(800);

const after = await playerState();
console.log('estado TRAS MOTO:', JSON.stringify(after));
await canvas.screenshot({ path: 'tests/e2e/shots/moto-2-montado-idle.png' });

// moverse en bici para capturar el pedaleo (mantener derecha y capturar a mitad del tween)
await p.keyboard.down('ArrowRight');
await sleep(120);
await canvas.screenshot({ path: 'tests/e2e/shots/moto-3-montado-mov.png' });
const moving = await playerState();
await p.keyboard.up('ArrowRight');
await sleep(400);
console.log('estado MOVIÉNDOSE en bici:', JSON.stringify(moving));

// bajarse de la moto: reabrir menú, MOTO de nuevo
console.log('bajándose de la moto...');
await press('Enter', 1, 500);
await press('ArrowDown', 2, 250);
await press('z', 1, 600);
await sleep(800);
const off = await playerState();
console.log('estado DE NUEVO A PIE:', JSON.stringify(off));
await canvas.screenshot({ path: 'tests/e2e/shots/moto-4-baja.png' });

// veredicto automático
const ok = after && after.riding === true && after.charKey === 'bike'
  && String(after.frame || '').startsWith('bike_')
  && off && off.riding === false && off.charKey === 'marcelino';
console.log('\n=== VEREDICTO MOTO ===');
console.log('montado→charKey=bike y frame bike_*:', after && after.charKey === 'bike' && String(after.frame).startsWith('bike_'));
console.log('moviéndose→frame:', moving && moving.frame);
console.log('a pie de nuevo→charKey=marcelino:', off && off.charKey === 'marcelino');
console.log(ok ? 'MOTO VISUAL: PASS ✅' : 'MOTO VISUAL: REVISAR ⚠️');
await b.close();
process.exit(ok ? 0 : 2);
