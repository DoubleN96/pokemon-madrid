// E2E auth + guardado: registra cuenta, entra, juega, GUARDA, recarga y verifica
// que la SESIÓN persiste y la PARTIDA se carga desde Supabase. Uso: node authsave.mjs <url>
import { chromium } from 'playwright';
const URL = (process.argv[2] || 'https://pokemon-madrid.stratomai.com') + '/?canvas=1';
const EMAIL = `qa.test.${Date.now()}@stratomai-qa.com`;
const PASS = 'QaTest123!';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 } });
const sleep = (ms) => p.waitForTimeout(ms);
const press = async (k, n = 1, d = 220) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await sleep(d); } };
const errs = [];
const isAudio = (s) => /decode audio|Unable to decode|Failed to process file|audio /i.test(String(s));
p.on('console', (m) => { if (m.type() === 'error' && !isAudio(m.text()) && !/404/.test(m.text())) errs.push(m.text()); });
const sbSession = () => p.evaluate(() => { try { for (const k of Object.keys(localStorage)) { if (/sb-.*-auth-token|supabase.auth.token/.test(k)) { const v = JSON.parse(localStorage.getItem(k)); return !!(v && (v.access_token || (v.currentSession && v.currentSession.access_token))); } } } catch (e) {} return false; });

console.log('email de prueba:', EMAIL);
await p.goto(URL, { waitUntil: 'networkidle' });
await p.evaluate(() => { try { localStorage.clear(); } catch (e) {} });
await p.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z', 1, 700); // arranca → aparece panel de cuenta
// === REGISTRO ===
await p.waitForSelector('input[type=email]', { timeout: 8000 });
await p.locator('input[type=email]').fill(EMAIL);
await p.locator('input[type=password]').fill(PASS);
await p.locator('button', { hasText: 'CREAR CUENTA' }).click();
await sleep(3500);
const formGone = (await p.locator('button', { hasText: 'CREAR CUENTA' }).count()) === 0;
const hasSession1 = await sbSession();
console.log('REGISTRO → form cerrado:', formGone, '| sesión Supabase creada:', hasSession1);
// === avanzar intro → mundo ===
for (let i = 0; i < 70; i++) { if (await p.locator('input').count() > 0) break; await press('z', 1, 180); }
if (await p.locator('input').count() > 0) { await p.locator('input').press('Enter'); await sleep(900); }
for (let i = 0; i < 22; i++) { const r = await p.evaluate("(()=>{const s=window.game.scene.getScene('Intro');return !!(s&&s.starterSprites&&s.starterSprites.length)})()"); if (r) break; await press('z', 1, 200); }
await press('z', 14, 280);
for (let i = 0; i < 30; i++) { if (await p.evaluate("window.game.scene.isActive('World')")) break; await press('z', 1, 250); }
await sleep(1200);
const pos1 = await p.evaluate("(()=>{const s=window.game.registry.get('save');return s?s.player.map+' '+s.player.x+','+s.player.y:null})()");
console.log('en mundo, pos:', pos1);
// === GUARDAR vía menú (GUARDAR = opción 5 → 4 ArrowDown desde arriba) ===
await press('ArrowDown', 1, 260); await press('ArrowDown', 1, 260); // mover 2 abajo para que la pos guardada difiera del spawn
const posSaved = await p.evaluate("(()=>{const s=window.game.registry.get('save');return s?{m:s.player.map,x:s.player.x,y:s.player.y}:null})()");
await press('Enter', 1, 700);  // abrir menú
await press('ArrowDown', 4, 260); // bajar a GUARDAR
await press('z', 1, 900);       // seleccionar GUARDAR (puede pedir confirm SÍ/NO)
await press('z', 4, 500);       // confirmar + cerrar diálogo "guardado"
await sleep(1200);
console.log('GUARDAR ejecutado. pos guardada:', JSON.stringify(posSaved));
// === RECARGAR y verificar persistencia (sesión recordada + save cargado) ===
await p.reload({ waitUntil: 'networkidle' });
await sleep(2800);
const hasSession2 = await sbSession();
await press('z', 1, 1500); // pulsar A en título → con sesión recordada entra directo y carga el save
await sleep(1500);
const authReappeared = (await p.locator('button', { hasText: 'CREAR CUENTA' }).count()) > 0;
// con la sesión recordada + save en la nube, el Título debe quedar en phase 'menu' con pendingState (CONTINUAR)
const titleState = await p.evaluate("(()=>{const t=window.game.scene.getScene('Title');return t?{phase:t.phase,hasPending:!!t.pendingState,loaded:t.pendingState?{m:t.pendingState.player&&t.pendingState.player.map,x:t.pendingState.player&&t.pendingState.player.x,y:t.pendingState.player&&t.pendingState.player.y}:null}:null})()");
console.log('TRAS RECARGA → sesión persiste:', hasSession2, '| panel login reaparece:', authReappeared);
console.log('  estado Título:', JSON.stringify(titleState));
const saveLoaded = !!(titleState && titleState.phase === 'menu' && titleState.hasPending);
console.log('=== RESUMEN ===');
console.log('  registro OK:', formGone && hasSession1);
console.log('  sesión recordada (sin re-login):', hasSession2 && !authReappeared);
console.log('  partida GUARDADA y CARGADA de la nube:', saveLoaded, '(pos guardada vs cargada:', JSON.stringify(posSaved), 'vs', JSON.stringify(titleState && titleState.loaded), ')');
console.log('  errores consola:', errs.slice(0, 5));
await p.screenshot({ path: 'tests/e2e/shots/authsave-final.png' });
await b.close();
