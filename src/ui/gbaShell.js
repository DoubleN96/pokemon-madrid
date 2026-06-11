// Carcasa Game Boy Advance SP a PANTALLA COMPLETA: construye el chasis
// (CSS en gbaShell.css) ocupando todo el viewport del móvil (full-bleed),
// con la PANTALLA DEL JUEGO arriba (#game, canvas Phaser, sin marco grueso) y
// el CUERPO verde con los controles físicos abajo (D-pad, A/B, START/SELECT,
// L/R, altavoz). Convierte esos botones físicos en los controles del juego.
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

// Construye el árbol DOM de la carcasa full-bleed y devuelve { sp, gameSlot }.
//
// Layout (de arriba a abajo):
//   #gba-sp (100vw × 100dvh, columna)
//   ├── .gba-screen-half   (mitad superior ~55%) -> pantalla negra + #game
//   ├── .gba-hinge         (banda de bisagra con L/R en los extremos)
//   └── .gba-body-half     (mitad inferior ~45%) -> cuerpo verde con controles
function buildShell() {
  const sp = el('div');
  sp.id = 'gba-sp';

  /* ----- MITAD SUPERIOR: la pantalla del juego ----- */
  const screenHalf = el('div', 'gba-screen-half');

  // Borde negro fino de la pantalla (NO un bisel grueso). Dentro va el #game.
  const screenFrame = el('div', 'gba-screen-frame');
  // Etiquetas serigrafiadas tipo "POWER ON / BATTERY FULL".
  screenFrame.appendChild(el('div', 'gba-screen-led'));
  screenFrame.appendChild(el('div', 'gba-screen-tag gba-tag-power', 'POWER ON'));
  screenFrame.appendChild(el('div', 'gba-screen-tag gba-tag-batt', 'BATTERY FULL'));

  // El slot donde Phaser monta el canvas (parent:'game'). Ocupa la pantalla.
  const gameSlot = el('div');
  gameSlot.id = 'game';
  screenFrame.appendChild(gameSlot);

  // Marca serigrafiada bajo la pantalla.
  screenFrame.appendChild(el('div', 'gba-brand',
    '<span class="gba-brand-gb">GAME&nbsp;BOY</span>' +
    '<span class="gba-brand-adv">ADVANCE</span>' +
    '<span class="gba-brand-sp">SP</span>'));

  screenHalf.appendChild(screenFrame);

  /* ----- BISAGRA (clamshell) con hombros L / R en los extremos ----- */
  const hinge = el('div', 'gba-hinge');
  hinge.appendChild(el('div', 'gba-hinge-bar'));
  hinge.appendChild(el('div', 'gba-hinge-seam gba-hinge-seam-l'));
  hinge.appendChild(el('div', 'gba-hinge-seam gba-hinge-seam-r'));

  const lShoulder = el('div', 'gba-btn gba-shoulder gba-shoulder-l', 'L');
  lShoulder.dataset.btn = 'l';
  const rShoulder = el('div', 'gba-btn gba-shoulder gba-shoulder-r', 'R');
  rShoulder.dataset.btn = 'r';
  hinge.append(lShoulder, rShoulder);

  /* ----- MITAD INFERIOR: cuerpo verde con los controles ----- */
  const bodyHalf = el('div', 'gba-body-half');

  // LED de encendido (decorativo) sobre el dpad, centrado arriba.
  const powerLed = el('div', 'gba-power-led', '<span class="dot"></span>');

  // Cruceta (D-pad) — izquierda.
  const dpad = el('div', 'gba-dpad');
  dpad.appendChild(el('div', 'gba-dpad-cross'));
  dpad.appendChild(el('div', 'gba-dpad-hub'));
  for (const dir of ['up', 'down', 'left', 'right']) {
    const seg = el('div', `gba-btn gba-dpad-seg gba-dpad-${dir}`);
    seg.dataset.btn = dir;
    dpad.appendChild(seg);
  }

  // Botones A / B — derecha, en diagonal (B abajo-izquierda, A arriba-derecha).
  const ab = el('div', 'gba-ab');
  const btnB = el('div', 'gba-btn gba-btn-round gba-btn-b', 'B');
  btnB.dataset.btn = 'b';
  const btnA = el('div', 'gba-btn gba-btn-round gba-btn-a', 'A');
  btnA.dataset.btn = 'a';
  ab.append(btnB, btnA);

  // Altavoz (rejilla de puntos) — centro.
  const speaker = el('div', 'gba-speaker');

  // START / SELECT — dos botones redondos en la parte baja, centrados.
  const select = el('div', 'gba-btn gba-pill gba-select',
    '<span class="gba-pill-label">SELECT</span>');
  select.dataset.btn = 'select';
  const start = el('div', 'gba-btn gba-pill gba-start',
    '<span class="gba-pill-label">START</span>');
  start.dataset.btn = 'start';

  bodyHalf.append(powerLed, dpad, ab, speaker, select, start);

  sp.append(screenHalf, hinge, bodyHalf);
  document.body.appendChild(sp);

  return { sp, gameSlot };
}

// Full-bleed: la carcasa ya ocupa 100vw × 100dvh vía CSS, así que no hay
// transform-scale. En escritorio (viewport ancho) acotamos el ancho a un
// aspecto de móvil para que no se estire feo, vía clase en el body.
function setupResponsiveFrame() {
  const apply = () => {
    const portraitLike = window.innerWidth <= window.innerHeight * 0.85;
    document.body.classList.toggle('gba-desktop', !portraitLike);
  };
  apply();
  window.addEventListener('resize', apply, { passive: true });
  window.addEventListener('orientationchange', apply, { passive: true });
  window.requestAnimationFrame(apply);
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

  setupResponsiveFrame();
  mirrorPhysicalKeyboard(sp);
  setupInputGuard(keys);
  return 'game';
}
