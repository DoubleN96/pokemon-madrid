// Carcasa Game Boy Advance SP: construye el chasis (CSS en gbaShell.css),
// reubica el #game (canvas Phaser) dentro del bisel de pantalla y convierte
// los botones físicos de la carcasa en los controles del juego.
//
// Los botones inyectan los MISMOS KeyboardEvent que el juego ya consume en
// todas las escenas (flechas/Z/X/Enter/Shift), por lo que NO se toca ninguna
// escena ni el sistema de input de Phaser. La técnica (dispatch de KeyboardEvent
// con keyCode/which forzados) es la del antiguo touchControls.js, que TitleScene
// necesita porque lee event.keyCode directamente.

import './gbaShell.css';

// keyCode legacy que Phaser y TitleScene leen.
const KEYCODES = {
  ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
  z: 90, x: 88, Enter: 13, Shift: 16,
};
const CODE_NAME = {
  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
  z: 'KeyZ', x: 'KeyX', Enter: 'Enter', Shift: 'ShiftLeft',
};
// Las teclas modificadoras necesitan key='Shift' (no 'Shift' lo es ya), pero
// el `key` de las flechas/letras debe ser distinto del `code`.
const KEY_NAME = {
  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
  z: 'z', x: 'x', Enter: 'Enter', Shift: 'Shift',
};

// Despacha un KeyboardEvent sintético en window, con keyCode/which forzados
// (Phaser y TitleScene los leen). `location` 1 para Shift izquierdo.
function dispatchKey(type, token) {
  const keyCode = KEYCODES[token];
  const ev = new KeyboardEvent(type, {
    key: KEY_NAME[token],
    code: CODE_NAME[token],
    bubbles: true,
    cancelable: true,
    view: window,
    shiftKey: token === 'Shift',
  });
  try {
    Object.defineProperty(ev, 'keyCode', { get: () => keyCode });
    Object.defineProperty(ev, 'which', { get: () => keyCode });
  } catch (e) { /* algunos navegadores ya lo exponen */ }
  window.dispatchEvent(ev);
}

// Estado "pulsado" por token: evita keydown repetidos y keyup colgados.
function makeKeyHolder() {
  const held = new Set();
  return {
    down(token) { if (!held.has(token)) { held.add(token); dispatchKey('keydown', token); } },
    up(token) { if (held.has(token)) { held.delete(token); dispatchKey('keyup', token); } },
    tap(token) { dispatchKey('keydown', token); dispatchKey('keyup', token); },
    releaseAll() { for (const t of [...held]) this.up(t); },
  };
}

// Mapa de botón de carcasa -> token de tecla del juego.
//   D-pad  -> flechas (held, para andar/correr de forma continua)
//   A      -> Z   (confirmar / interactuar / abrir menú via Enter, ver START)
//   B      -> X   (cancelar / correr — el juego lee X.isDown para correr)
//   START  -> Enter (abre el menú de pausa en World; confirma en menús)
//   SELECT -> Shift (equivale a B en menús/combate; "atrás" alternativo)
//   L / R  -> flechas izq/der en "tap" (paginar Pokédex/listas — estilo GBA)
const HOLD_BUTTONS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
  a: 'z',
  b: 'x',
};
const TAP_BUTTONS = {
  start: 'Enter',
  select: 'Shift',
  l: 'ArrowLeft',
  r: 'ArrowRight',
};

// Helper de creación de nodos con clase y contenido opcional.
function el(tag, className, html) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (html != null) node.innerHTML = html;
  return node;
}

// Construye el árbol DOM de la carcasa y devuelve { sp, screenFrame, gameSlot }.
function buildShell() {
  const stage = el('div');
  stage.id = 'gba-stage';

  const sp = el('div');
  sp.id = 'gba-sp';

  const lid = el('div', 'gba-lid');
  const base = el('div', 'gba-base');

  // Hombros L / R sobre la bisagra.
  const lShoulder = el('div', 'gba-btn gba-shoulder gba-shoulder-l', 'L');
  lShoulder.dataset.btn = 'l';
  const rShoulder = el('div', 'gba-btn gba-shoulder gba-shoulder-r', 'R');
  rShoulder.dataset.btn = 'r';

  // Bisel de pantalla: aquí va el #game (canvas Phaser).
  const screenFrame = el('div', 'gba-screen-frame');
  screenFrame.appendChild(el('div', 'gba-screen-led'));
  const gameSlot = el('div');
  gameSlot.id = 'game';
  screenFrame.appendChild(gameSlot);

  // Bisagra clamshell.
  const hinge = el('div', 'gba-hinge');
  hinge.appendChild(el('div', 'gba-hinge-bar'));
  hinge.appendChild(el('div', 'gba-hinge-knuckle left'));
  hinge.appendChild(el('div', 'gba-hinge-knuckle right'));

  // Cruceta (D-pad).
  const dpad = el('div', 'gba-dpad');
  dpad.appendChild(el('div', 'gba-dpad-cross'));
  dpad.appendChild(el('div', 'gba-dpad-hub'));
  for (const dir of ['up', 'down', 'left', 'right']) {
    const seg = el('div', `gba-btn gba-dpad-seg gba-dpad-${dir}`);
    seg.dataset.btn = dir;
    dpad.appendChild(seg);
  }

  // Botones A / B.
  const ab = el('div', 'gba-ab');
  const btnA = el('div', 'gba-btn gba-btn-round gba-btn-a', 'A');
  btnA.dataset.btn = 'a';
  const btnB = el('div', 'gba-btn gba-btn-round gba-btn-b', 'B');
  btnB.dataset.btn = 'b';
  ab.appendChild(btnA);
  ab.appendChild(btnB);

  // START / SELECT.
  const select = el('div', 'gba-btn gba-pill gba-select',
    '<span class="gba-pill-label">SELECT</span>');
  select.dataset.btn = 'select';
  const start = el('div', 'gba-btn gba-pill gba-start',
    '<span class="gba-pill-label">START</span>');
  start.dataset.btn = 'start';

  // LED de encendido y altavoz (decorativos).
  const powerLed = el('div', 'gba-power-led', '<span class="dot"></span>POWER');
  const speaker = el('div', 'gba-speaker');

  base.append(dpad, ab, select, start, powerLed, speaker);
  sp.append(lid, base, lShoulder, rShoulder, screenFrame, hinge);
  stage.appendChild(sp);
  document.body.appendChild(stage);

  return { sp, gameSlot };
}

// Escalado responsive: la consola entera cabe centrada en el viewport con un
// pequeño margen. Una sola variable CSS (--gba-scale) controla todo.
function setupResponsiveScale(sp) {
  const MARGIN = 16; // px de aire a cada lado
  const baseW = 460;
  const baseH = 470;
  const fit = () => {
    const vw = window.innerWidth - MARGIN * 2;
    const vh = window.innerHeight - MARGIN * 2;
    const scale = Math.max(0.35, Math.min(vw / baseW, vh / baseH));
    sp.style.setProperty('--gba-scale', String(scale));
  };
  fit();
  window.addEventListener('resize', fit, { passive: true });
  window.addEventListener('orientationchange', fit, { passive: true });
  // Reajuste tras el primer layout/fuentes.
  window.requestAnimationFrame(fit);
}

// Conecta un nodo-botón "mantenido" (D-pad, A, B): keydown al presionar,
// keyup al soltar. Soporta puntero (ratón/touch unificado) con captura.
function wireHoldButton(node, token, keys) {
  const press = (e) => {
    e.preventDefault();
    node.classList.add('is-pressed');
    keys.down(token);
    if (e.pointerId != null && node.setPointerCapture) {
      try { node.setPointerCapture(e.pointerId); } catch (err) { /* noop */ }
    }
  };
  const release = (e) => {
    if (e) e.preventDefault();
    node.classList.remove('is-pressed');
    keys.up(token);
  };
  node.addEventListener('pointerdown', press);
  node.addEventListener('pointerup', release);
  node.addEventListener('pointercancel', release);
  node.addEventListener('pointerleave', release);
  // Si el dedo/ratón sale del botón sin soltar, lo damos por liberado.
  node.addEventListener('lostpointercapture', () => release());
}

// Conecta un botón "tap" (START, SELECT, L, R): un único keydown+keyup.
function wireTapButton(node, token, keys) {
  const press = (e) => {
    e.preventDefault();
    node.classList.add('is-pressed');
    keys.tap(token);
  };
  const release = (e) => {
    if (e) e.preventDefault();
    node.classList.remove('is-pressed');
  };
  node.addEventListener('pointerdown', press);
  node.addEventListener('pointerup', release);
  node.addEventListener('pointercancel', release);
  node.addEventListener('pointerleave', release);
}

// Soporte teclado físico: refleja en la carcasa la pulsación real para feedback
// visual (sin reinyectar eventos, así no se duplica el input).
function mirrorPhysicalKeyboard(sp) {
  const CODE_TO_BTN = {
    ArrowUp: 'up', KeyW: 'up',
    ArrowDown: 'down', KeyS: 'down',
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    KeyZ: 'a', Space: 'a', Enter: 'start',
    KeyX: 'b', ShiftLeft: 'select', ShiftRight: 'select',
  };
  const find = (btn) => sp.querySelector(`[data-btn="${btn}"]`);
  window.addEventListener('keydown', (e) => {
    const btn = CODE_TO_BTN[e.code];
    if (btn) { const n = find(btn); if (n) n.classList.add('is-pressed'); }
  });
  window.addEventListener('keyup', (e) => {
    const btn = CODE_TO_BTN[e.code];
    if (btn) { const n = find(btn); if (n) n.classList.remove('is-pressed'); }
  });
}

// Oculta/atenúa los botones mientras un input DOM (login/nombre) tiene foco,
// para que el formulario y el teclado virtual del móvil tengan prioridad.
function setupInputGuard(keys) {
  const isField = (node) => node && /^(INPUT|TEXTAREA|SELECT)$/.test(node.tagName);
  document.addEventListener('focusin', (e) => {
    if (isField(e.target)) { document.body.classList.add('gba-input-active'); keys.releaseAll(); }
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      if (!isField(document.activeElement)) document.body.classList.remove('gba-input-active');
    }, 50);
  });
  // Soltar todo al perder el foco de la pestaña (evita teclas colgadas).
  window.addEventListener('blur', () => keys.releaseAll());
}

// API pública: monta la carcasa ANTES de arrancar Phaser. Devuelve el id del
// contenedor donde Phaser debe montar el canvas (siempre 'game').
export function mountGbaShell() {
  if (document.getElementById('gba-sp')) return 'game';
  const { sp } = buildShell();
  const keys = makeKeyHolder();

  // Cablear botones mantenidos (D-pad + A/B).
  for (const [btn, token] of Object.entries(HOLD_BUTTONS)) {
    const node = sp.querySelector(`[data-btn="${btn}"]`);
    if (node) wireHoldButton(node, token, keys);
  }
  // Cablear botones de toque (START/SELECT/L/R).
  for (const [btn, token] of Object.entries(TAP_BUTTONS)) {
    const node = sp.querySelector(`[data-btn="${btn}"]`);
    if (node) wireTapButton(node, token, keys);
  }

  setupResponsiveScale(sp);
  mirrorPhysicalKeyboard(sp);
  setupInputGuard(keys);
  return 'game';
}
