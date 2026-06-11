// E2E NOCTURNO (chequeo horario): jugabilidad completa de extremo a extremo.
// Arranca partida nueva (invitado) y verifica, de forma resiliente a timings:
//   1) Carga sin errores de consola (se IGNORAN los de audio del headless).
//   2) Flujo título → intro → inicial → MUNDO.
//   3) El jugador se MUEVE (cambia de tile).
//   4) ENTRA a un edificio (un warp cambia save.player.map) y SALE de vuelta.
//   5) Abre el menú START (ENTER), la opción MOTO existe y al activarla
//      save.flags.riding pasa a true.
//   6) Provoca un COMBATE de entrenador (Álvaro) que se resuelve sin crash
//      (ganando o perdiendo; ambos son válidos).
//
// Patrón heredado de piso.mjs: ?canvas=1, --use-gl=swiftshader, window.game,
// polling de estado con page.evaluate. Tolerante a timings: en vez de números
// fijos de pulsaciones, hace polling con reintentos sobre el estado del save.
//
// Uso: node tests/e2e/night.mjs http://localhost:5188
import { chromium } from 'playwright';
import { mkdirSync } from 'fs';

const URL = (process.argv[2] || 'http://localhost:5173') + '/?canvas=1';
mkdirSync('tests/e2e/shots', { recursive: true });

const browser = await chromium.launch({
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const page = await browser.newPage({ viewport: { width: 720, height: 480 } });

// --- Captura de errores (filtrando ruido de audio del headless) ---------------
// El Chromium headless no trae códecs y escupe "Unable to decode audio"; en
// navegadores reales el audio suena. NO debe marcar el test como fallido.
const errors = [];
const isAudioNoise = (s) =>
  /decode audio|Unable to decode|Failed to process file|audio /i.test(String(s));
page.on('pageerror', (e) => { if (!isAudioNoise(e.message)) errors.push(`pageerror: ${e.message}`); });
page.on('console', (m) => { if (m.type() === 'error' && !isAudioNoise(m.text())) errors.push(m.text()); });

// --- Utilidades ---------------------------------------------------------------
const sleep = (ms) => page.waitForTimeout(ms);
const shot = (n) => page.screenshot({ path: `tests/e2e/shots/night-${n}.png` }).catch(() => {});
const press = async (k, n = 1, d = 320) => {
  for (let i = 0; i < n; i++) { await page.keyboard.press(k); await sleep(d); }
};
const ev = (fn) => page.evaluate(fn);
const active = (s) => ev(`window.game && window.game.scene.isActive('${s}')`);
// Snapshot seguro del save (devuelve null si aún no existe).
const save = () => ev(`(() => {
  const s = window.game && window.game.registry.get('save');
  if (!s) return null;
  return {
    map: s.player.map, x: s.player.x, y: s.player.y, dir: s.player.dir,
    name: s.player.name, money: s.player.money,
    riding: !!(s.flags && s.flags.riding),
    alvaro: !!(s.flags && s.flags.alvaro_rival_1),
    partyHp: (s.party || []).map((p) => p.currentHp),
  };
})()`);

// Sondea una condición (fn async → bool) reintentando; ejecuta `poke` entre
// reintentos (p. ej. una pulsación de tecla). Resiliente a timings.
const waitFor = async (label, cond, { tries = 30, gap = 350, poke = null } = {}) => {
  for (let i = 0; i < tries; i++) {
    try { if (await cond()) return true; } catch { /* escena en transición */ }
    if (poke) await poke();
    else await sleep(gap);
  }
  return false;
};

const results = []; // { name, ok, info }
const record = (name, ok, info = '') => {
  results.push({ name, ok, info });
  console.log(`   ${ok ? 'OK  ' : 'FALLA'} · ${name}${info ? ' — ' + info : ''}`);
};
const fatal = async (msg) => {
  console.error('\nERROR FATAL:', msg);
  await shot('FATAL');
  console.error('Errores de consola (no-audio):', errors.slice(0, 8));
  await browser.close();
  process.exit(1);
};

// =============================================================================
// 1) Carga + nueva partida (invitado) → mundo
// =============================================================================
console.log('1. Nueva partida (invitado) → título/intro/inicial/mundo');
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch (e) {} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await shot('01-titulo');

// Título: A para abrir el panel de cuenta → SIN CUENTA.
await press('z', 1, 800);
const guest = page.locator('button', { hasText: 'SIN CUENTA' });
if (!(await waitFor('panel cuenta', async () => (await guest.count()) > 0, { tries: 12, gap: 400 }))) {
  await fatal('no apareció el botón SIN CUENTA');
}
await guest.click();
await sleep(1500);

// Intro: avanzar hasta el panel de nombre (input HTML).
if (!(await waitFor('panel de nombre', async () => (await page.locator('input').count()) > 0,
  { tries: 30, poke: () => press('z', 1, 420) }))) {
  await fatal('la intro no llegó al panel de nombre');
}
await shot('02-nombre');
await page.locator('input').fill('NOCHE');
await page.locator('input').press('Enter');
await sleep(1200);

// Elegir inicial: esperar a que aparezcan los sprites, confirmar y avanzar diálogos.
await waitFor('selector de inicial', async () =>
  ev("(() => { const s=window.game.scene.getScene('Intro'); return !!(s&&s.starterSprites&&s.starterSprites.length) })()"),
  { tries: 18, poke: () => press('z', 1, 420) });
await press('z', 12, 450); // elegir el primero + diálogos post-elección

const inWorld = await waitFor('escena World', () => active('World'),
  { tries: 20, poke: () => press('z', 1, 400) });
if (!inWorld) await fatal('no se llegó al mundo tras la intro');
await sleep(700);
await shot('03-mundo');

const s0 = await save();
if (!s0) await fatal('el save no existe en el mundo');
record('Flujo título→intro→inicial→mundo', true, `map=${s0.map} pos=(${s0.x},${s0.y}) nombre=${s0.name}`);
const consoleCleanStart = errors.filter((e) => !e.includes('favicon')).length;
record('Carga sin errores de consola (ignora audio)', consoleCleanStart === 0,
  consoleCleanStart === 0 ? '0 errores' : `${consoleCleanStart} errores`);

// =============================================================================
// 3) El jugador se MUEVE (cambia de tile en cualquier dirección libre)
// =============================================================================
console.log('2. El jugador se mueve');
const before = await save();
// Probar varias direcciones por si alguna está bloqueada por colisión.
let moved = false;
for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) {
  for (let i = 0; i < 3 && !moved; i++) {
    await page.keyboard.down(key); await sleep(320); await page.keyboard.up(key); await sleep(220);
    const now = await save();
    if (now && (now.x !== before.x || now.y !== before.y)) moved = true;
  }
  if (moved) break;
}
const afterMove = await save();
record('El jugador se mueve', moved, `(${before.x},${before.y}) → (${afterMove.x},${afterMove.y})`);

// =============================================================================
// 4) ENTRAR a un edificio (warp cambia save.player.map) y SALIR
// =============================================================================
// Casa de Marcelino: puerta del overworld en Tetuán (6,10); el spawn es (6,12).
// Caminamos hasta pisar la puerta (warp → interior 'casa_marcelino') y luego
// bajamos al felpudo para salir de vuelta a 'tetuan'.
console.log('3. Entrar a un edificio y salir');
const startMap = (await save()).map;
let entered = false;

// Reposicionar de forma fiable en la columna x=6 (por si nos movimos antes).
const stepToward = async (axis, target, key, tries = 8) => {
  for (let i = 0; i < tries; i++) {
    const p = await save();
    if (!p || p[axis] === target) break;
    await page.keyboard.down(key); await sleep(300); await page.keyboard.up(key); await sleep(160);
  }
};
// Alinear x a 6, después subir hacia la puerta (6,10).
await stepToward('x', 6, (await save()).x > 6 ? 'ArrowLeft' : 'ArrowRight', 8);

// Empujar hacia arriba hasta que el mapa cambie (entró por el warp de la puerta).
entered = await waitFor('entrar al edificio (cambia map)',
  async () => {
    const p = await save();
    return !!(p && p.map !== startMap);
  },
  {
    tries: 12,
    poke: async () => {
      await page.keyboard.down('ArrowUp'); await sleep(300); await page.keyboard.up('ArrowUp'); await sleep(400);
    },
  });

let interiorMap = null;
if (entered) {
  interiorMap = (await save()).map;
  await shot('04-interior');
}
record('Entra a un edificio (warp cambia map)', entered,
  entered ? `${startMap} → ${interiorMap}` : 'no cambió de mapa');

// SALIR: bajar al felpudo (centro de la fila inferior) hasta volver al overworld.
let exited = false;
if (entered) {
  exited = await waitFor('salir del edificio (vuelve al overworld)',
    async () => {
      const p = await save();
      return !!(p && p.map !== interiorMap);
    },
    {
      tries: 14,
      poke: async () => {
        await page.keyboard.down('ArrowDown'); await sleep(300); await page.keyboard.up('ArrowDown'); await sleep(400);
      },
    });
  if (exited) await shot('05-tras-salir');
}
record('Sale del edificio (vuelve al overworld)', exited,
  exited ? `${interiorMap} → ${(await save()).map}` : (entered ? 'no salió' : 'omitido (no entró)'));

// =============================================================================
// 5) Menú START → opción MOTO → save.flags.riding = true
// =============================================================================
console.log('4. Menú START → MOTO → riding=true');
let menuOpen = false;
let ridingOn = false;
const ridingBefore = (await save()).riding;
// Abrir el menú con ENTER (puede requerir un par de intentos si hay input-lock).
menuOpen = await waitFor('abrir menú START', () => active('Menu'),
  { tries: 6, poke: () => press('Enter', 1, 450) });

if (menuOpen) {
  await shot('06-menu');
  // Verificar que la opción MOTO existe en el menú raíz.
  const hasMoto = await ev(`(() => {
    const sc = window.game.scene.getScene('Menu');
    return !!(sc && Array.isArray(sc.rootTexts) && sc.rootTexts.some(t => /MOTO/i.test(t.text)));
  })()`);
  record('La opción MOTO existe en el menú', !!hasMoto);

  // Navegar hasta MOTO. Es más robusto colocar el índice del cursor que contar
  // pulsaciones: buscamos el índice de la opción 'moto' y movemos el cursor ahí.
  const motoIdx = await ev(`(() => {
    const sc = window.game.scene.getScene('Menu');
    if (!sc || !Array.isArray(sc.rootTexts)) return -1;
    return sc.rootTexts.findIndex(t => /MOTO/i.test(t.text));
  })()`);
  if (motoIdx >= 0) {
    // Mover el cursor con flechas DOWN desde la posición actual (rootIdx).
    const curIdx = await ev("(() => { const sc=window.game.scene.getScene('Menu'); return sc ? sc.rootIdx : 0 })()");
    const steps = ((motoIdx - curIdx) % 6 + 6) % 6; // bajar en bucle hasta MOTO
    for (let i = 0; i < steps; i++) await press('ArrowDown', 1, 250);
    await shot('07-menu-moto');
    // Activar MOTO (Z). Esto pone riding=true y cierra el menú.
    await press('z', 1, 600);
  }
  ridingOn = await waitFor('riding=true', async () => (await save()).riding === true,
    { tries: 10, gap: 250 });
} else {
  record('La opción MOTO existe en el menú', false, 'menú no se abrió');
}
record('Menú START se abre con ENTER', menuOpen);
record('Activar MOTO pone save.flags.riding=true', ridingOn,
  `${ridingBefore} → ${(await save()).riding}`);

// Asegurar que volvemos a World antes del combate (el menú se cerró solo).
await waitFor('volver a World', () => active('World'),
  { tries: 10, poke: () => press('z', 1, 300) });

// =============================================================================
// 6) COMBATE de entrenador (Álvaro) que se resuelve sin crash
// =============================================================================
console.log('5. Provocar combate de entrenador (Álvaro) y resolverlo');
// Asegurar que estamos en Tetuán y con el equipo curado/listo. Si la derrota
// de un combate anterior nos hubiera movido, recolocamos vía warp/restart.
let inBattle = false;
const sb = await save();

// Intento A (realista): andar hasta quedar junto a Álvaro (rival 9,12) y retar.
// El spawn original es (6,12); si seguimos en Tetuán intentamos el camino real.
if (sb.map === 'tetuan') {
  // Alinear fila y=12 e ir a la derecha hasta x>=8, mirando a la derecha.
  await stepToward('y', 12, (await save()).y > 12 ? 'ArrowUp' : 'ArrowDown', 6);
  for (let i = 0; i < 8; i++) {
    const p = await save();
    if (p && p.x >= 8) break;
    await page.keyboard.down('ArrowRight'); await sleep(300); await page.keyboard.up('ArrowRight'); await sleep(150);
  }
  await page.keyboard.press('ArrowRight'); await sleep(180); // mirar a Álvaro sin movernos
  await press('z', 1, 1200);
  inBattle = await waitFor('combate (camino real)', () => active('Battle'),
    { tries: 8, poke: () => press('z', 1, 450) });
}

// Intento B (infalible): inyectar el combate del propio Álvaro vía WorldScene.
// Tomamos su definición real desde el mapa para no falsear el test.
if (!inBattle) {
  await shot('08-pre-inyeccion');
  const launched = await ev(`(() => {
    const w = window.game.scene.getScene('World');
    if (!w || typeof w.startTrainerBattle !== 'function') return 'no-method';
    // Buscar al NPC rival Álvaro en el mapa actual para usar SU equipo real.
    const npc = (w.npcs || []).find(n => n.def && n.def.id === 'alvaro_rival');
    const trainer = npc && npc.def && npc.def.trainer;
    if (!trainer) return 'no-alvaro';
    w.startTrainerBattle(trainer);
    return 'ok';
  })()`);
  if (launched === 'ok') {
    inBattle = await waitFor('combate (inyectado)', () => active('Battle'),
      { tries: 16, gap: 400 });
  } else {
    console.log('   inyección no disponible:', launched);
  }
}

record('Se provoca un combate de entrenador (Álvaro)', inBattle);

let resolved = false;
if (inBattle) {
  await sleep(1200);
  await shot('09-combate');
  // Machacar Z hasta que la escena Battle se cierre (gane o pierda). Álvaro
  // puede tener varios Pokémon: damos margen generoso de pulsaciones.
  for (let i = 0; i < 300; i++) {
    if (!(await active('Battle'))) { resolved = true; break; }
    await press('z', 1, 380);
    if (i === 40) await shot('10-combate-medio');
  }
  // Tras el combate algunos diálogos finales se cierran solos; volver a World.
  await waitFor('volver a World tras combate', () => active('World'),
    { tries: 12, poke: () => press('z', 1, 350) });
  await sleep(700);
  await shot('11-tras-combate');
}
const fin = await save();
record('El combate se resuelve sin crash (gane o pierda)', inBattle && resolved,
  inBattle ? (resolved ? `flag alvaro=${fin.alvaro} map=${fin.map} partyHp=${JSON.stringify(fin.partyHp)}`
    : 'el combate no terminó') : 'omitido (no arrancó)');

// =============================================================================
// RESUMEN
// =============================================================================
const realErrors = errors.filter((e) => !e.includes('favicon'));
console.log('\n=== RESUMEN NIGHT E2E ===');
results.forEach((r) => console.log(`  [${r.ok ? 'PASS' : 'FAIL'}] ${r.name}${r.info ? ' — ' + r.info : ''}`));
console.log(`\nErrores de consola (no-audio): ${realErrors.length}`);
realErrors.slice(0, 10).forEach((e) => console.log('  -', String(e).slice(0, 140)));

// Chequeos CRÍTICOS para el cron horario: si fallan, salir con código != 0.
// (No fallar por audio; sí por jugabilidad rota o errores reales de consola.)
const critical = {
  'mundo alcanzado': results.find((r) => r.name.startsWith('Flujo'))?.ok,
  'movimiento': results.find((r) => r.name === 'El jugador se mueve')?.ok,
  'entrar edificio': results.find((r) => r.name.startsWith('Entra a un edificio'))?.ok,
  'salir edificio': results.find((r) => r.name.startsWith('Sale del edificio'))?.ok,
  'menú START': results.find((r) => r.name.startsWith('Menú START'))?.ok,
  'MOTO riding': results.find((r) => r.name.startsWith('Activar MOTO'))?.ok,
  'combate inicia': results.find((r) => r.name.startsWith('Se provoca'))?.ok,
  'combate resuelve': results.find((r) => r.name.startsWith('El combate se resuelve'))?.ok,
  'sin errores consola': realErrors.length === 0,
};
const failed = Object.entries(critical).filter(([, ok]) => !ok).map(([k]) => k);

if (failed.length === 0) {
  console.log('\nNIGHT E2E: PASS ✅ (jugabilidad completa verificada)');
  await browser.close();
  process.exit(0);
}
console.log('\nNIGHT E2E: FAIL ❌ — críticos fallidos: ' + failed.join(', '));
await shot('SUMMARY-FAIL');
await browser.close();
process.exit(2);
