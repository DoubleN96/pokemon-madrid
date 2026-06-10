// Controles táctiles para móvil. Inyectan los MISMOS eventos de teclado que el
// juego ya consume (flechas, Z, X, Enter), así funcionan en todas las escenas
// (mundo, combate, menús, diálogos) sin tocar su lógica.

const KEYCODES = {
  ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39,
  z: 90, x: 88, Enter: 13,
};
const CODE_NAME = {
  ArrowUp: 'ArrowUp', ArrowDown: 'ArrowDown', ArrowLeft: 'ArrowLeft', ArrowRight: 'ArrowRight',
  z: 'KeyZ', x: 'KeyX', Enter: 'Enter',
};

// Despacha un KeyboardEvent sintético en window con keyCode forzado (Phaser lo lee).
function dispatchKey(type, key) {
  const keyCode = KEYCODES[key];
  const ev = new KeyboardEvent(type, {
    key, code: CODE_NAME[key], bubbles: true, cancelable: true, view: window,
  });
  try {
    Object.defineProperty(ev, 'keyCode', { get: () => keyCode });
    Object.defineProperty(ev, 'which', { get: () => keyCode });
  } catch (e) { /* algunos navegadores ya lo exponen */ }
  window.dispatchEvent(ev);
}

// Mantiene el estado "pulsado" por tecla para no repetir keydown ni colgar keyup.
function makeKeyHolder() {
  const held = new Set();
  return {
    down(key) { if (!held.has(key)) { held.add(key); dispatchKey('keydown', key); } },
    up(key) { if (held.has(key)) { held.delete(key); dispatchKey('keyup', key); } },
    tap(key) { dispatchKey('keydown', key); dispatchKey('keyup', key); },
    releaseAll() { for (const k of [...held]) this.up(k); },
  };
}

const DIRS = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

// Dirección cardinal dominante según la posición del dedo dentro del rect del dpad.
function dirFromPoint(rect, cx, cy) {
  const nx = (cx - rect.left) / rect.width - 0.5;  // -0.5..0.5
  const ny = (cy - rect.top) / rect.height - 0.5;
  const dead = 0.12;
  if (Math.abs(nx) < dead && Math.abs(ny) < dead) return null;
  if (Math.abs(nx) >= Math.abs(ny)) return nx < 0 ? 'ArrowLeft' : 'ArrowRight';
  return ny < 0 ? 'ArrowUp' : 'ArrowDown';
}

function el(tag, css, html) {
  const node = document.createElement(tag);
  node.style.cssText = css;
  if (html != null) node.innerHTML = html;
  return node;
}

const PAD = 'position:absolute;display:flex;align-items:center;justify-content:center;'
  + 'user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;'
  + 'touch-action:none;font-family:monospace;font-weight:700;color:#fff;'
  + 'background:rgba(20,20,32,0.55);border:2px solid rgba(255,255,255,0.35);'
  + 'box-shadow:0 2px 8px rgba(0,0,0,0.4);';

export function initTouchControls() {
  const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0
    || new URLSearchParams(location.search).has('touch');
  if (!isTouch || document.getElementById('touch-controls')) return;

  const keys = makeKeyHolder();
  const root = el('div', 'position:fixed;inset:0;z-index:9000;pointer-events:none;');
  root.id = 'touch-controls';

  // --- D-pad (abajo izquierda) ---
  const dpad = el('div', `${PAD};left:14px;bottom:18px;width:132px;height:132px;border-radius:18px;`
    + 'pointer-events:auto;background:rgba(20,20,32,0.4);');
  dpad.id = 'touch-dpad';
  const arrow = (sym, pos) => el('div',
    `position:absolute;${pos};width:42px;height:42px;display:flex;align-items:center;justify-content:center;`
    + 'font-size:20px;color:rgba(255,255,255,0.85);', sym);
  const aUp = arrow('▲', 'top:6px;left:45px');
  const aDown = arrow('▼', 'bottom:6px;left:45px');
  const aLeft = arrow('◀', 'left:6px;top:45px');
  const aRight = arrow('▶', 'right:6px;top:45px');
  dpad.append(aUp, aDown, aLeft, aRight);
  const hi = { ArrowUp: aUp, ArrowDown: aDown, ArrowLeft: aLeft, ArrowRight: aRight };

  let activeDir = null;
  const setDir = (dir) => {
    if (dir === activeDir) return;
    if (activeDir) { keys.up(activeDir); hi[activeDir].style.color = 'rgba(255,255,255,0.85)'; }
    activeDir = dir;
    if (activeDir) { keys.down(activeDir); hi[activeDir].style.color = '#ffcb05'; }
  };
  const onPad = (e) => {
    e.preventDefault();
    const t = e.touches ? e.touches[0] : e;
    setDir(dirFromPoint(dpad.getBoundingClientRect(), t.clientX, t.clientY));
  };
  const endPad = (e) => { if (e) e.preventDefault(); setDir(null); };
  dpad.addEventListener('touchstart', onPad, { passive: false });
  dpad.addEventListener('touchmove', onPad, { passive: false });
  dpad.addEventListener('touchend', endPad, { passive: false });
  dpad.addEventListener('touchcancel', endPad, { passive: false });
  // Soporte ratón (para probar en escritorio con ?touch=1)
  let mouseDown = false;
  dpad.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') { mouseDown = true; onPad(e); } });
  window.addEventListener('pointermove', (e) => { if (mouseDown) onPad(e); });
  window.addEventListener('pointerup', (e) => { if (mouseDown) { mouseDown = false; endPad(e); } });

  // --- Botones A / B (abajo derecha) ---
  const actionBtn = (label, key, css) => {
    const b = el('div', `${PAD};${css};width:64px;height:64px;border-radius:50%;font-size:22px;pointer-events:auto;`, label);
    b.id = `touch-btn-${key}`;
    const press = (e) => { e.preventDefault(); b.style.background = 'rgba(220,60,60,0.75)'; keys.tap(key); };
    const release = (e) => { if (e) e.preventDefault(); b.style.background = 'rgba(20,20,32,0.55)'; };
    b.addEventListener('touchstart', press, { passive: false });
    b.addEventListener('touchend', release, { passive: false });
    b.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') press(e); });
    b.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') release(e); });
    return b;
  };
  // A = Z (confirmar/interactuar); B = X (cancelar/correr)
  const btnA = actionBtn('A', 'z', 'right:18px;bottom:30px;background:rgba(40,40,60,0.6);border-color:rgba(255,203,5,0.6);');
  const btnB = actionBtn('B', 'x', 'right:88px;bottom:70px;background:rgba(40,40,60,0.6);');

  // --- START (centro abajo) = Enter (menú / continuar) ---
  const btnStart = el('div', `${PAD};left:50%;transform:translateX(-50%);bottom:10px;`
    + 'padding:6px 16px;border-radius:14px;font-size:11px;pointer-events:auto;', 'START');
  btnStart.id = 'touch-btn-start';
  const startPress = (e) => { e.preventDefault(); btnStart.style.background = 'rgba(220,60,60,0.75)'; keys.tap('Enter'); };
  const startRelease = (e) => { if (e) e.preventDefault(); btnStart.style.background = 'rgba(20,20,32,0.55)'; };
  btnStart.addEventListener('touchstart', startPress, { passive: false });
  btnStart.addEventListener('touchend', startRelease, { passive: false });
  btnStart.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'touch') startPress(e); });
  btnStart.addEventListener('pointerup', (e) => { if (e.pointerType !== 'touch') startRelease(e); });

  root.append(dpad, btnA, btnB, btnStart);
  document.body.appendChild(root);

  // Ocultar los controles mientras se escribe en un input DOM (login / nombre):
  // así el teclado virtual del móvil y el formulario tienen prioridad.
  const setHidden = (hidden) => {
    root.style.display = hidden ? 'none' : 'block';
    if (hidden) { keys.releaseAll(); activeDir = null; }
  };
  document.addEventListener('focusin', (e) => {
    if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) setHidden(true);
  });
  document.addEventListener('focusout', () => {
    setTimeout(() => {
      const a = document.activeElement;
      if (!a || !/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)) setHidden(false);
    }, 50);
  });
  // Soltar todo si la pestaña pierde el foco (evita teclas colgadas).
  window.addEventListener('blur', () => { keys.releaseAll(); activeDir = null; });
}
