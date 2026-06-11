// Módulo G — Panel de cuenta DOM superpuesto al canvas (estilo GBA).
// showAuthForm(onDone): crea el panel; al resolver llama onDone(session|null)
// (null = invitado) y se destruye del DOM sin dejar listeners colgando.
// También exporta helpers de estilo (el, ROOT_CSS...) para otros paneles DOM
// del propio Módulo G (entrada de nombre en IntroScene).
import { signIn, signUp, signOut } from '../services/auth.js';

export const ROOT_CSS = [
  'position:absolute', 'left:0', 'top:0', 'right:0', 'bottom:0',
  'display:flex', 'align-items:center', 'justify-content:center',
  'z-index:1000', 'background:rgba(16,16,32,.45)',
].join(';');

export const PANEL_CSS = [
  'background:#f8f8f8', 'border:4px solid #585858', 'border-radius:8px',
  'box-shadow:inset 0 0 0 2px #a0a0a0, 4px 4px 0 rgba(0,0,0,.35)',
  'padding:16px 18px', 'width:min(300px,86vw)', 'box-sizing:border-box',
  "font-family:'Courier New',monospace", 'color:#303030', 'text-align:center',
].join(';');

export const TITLE_CSS = 'font-weight:bold;font-size:14px;letter-spacing:1px;margin-bottom:10px;color:#303030';

export const INPUT_CSS = [
  'display:block', 'width:100%', 'box-sizing:border-box', 'margin:0 0 8px',
  'padding:6px 8px', 'border:2px solid #a0a0a0', 'border-radius:4px',
  'background:#ffffff', "font-family:'Courier New',monospace", 'font-size:13px',
  'color:#303030', 'outline:none',
].join(';');

export const BTN_CSS = [
  'padding:6px 10px', 'border:2px solid #585858', 'border-radius:4px',
  'background:#ffffff', 'color:#303030', "font-family:'Courier New',monospace",
  'font-size:12px', 'font-weight:bold', 'cursor:pointer',
  'box-shadow:2px 2px 0 #a0a0a0',
].join(';');

export const ERROR_CSS = 'color:#d22828;font-size:11px;min-height:14px;margin:2px 0 8px;white-space:pre-wrap';

/** Crea un elemento con estilos inline y texto opcional. */
export function el(tag, css, text) {
  const node = document.createElement(tag);
  if (css) node.style.cssText = css;
  if (text !== undefined) node.textContent = text;
  return node;
}

function buildAuthDom() {
  const root = el('div', ROOT_CSS);
  const panel = el('div', PANEL_CSS);
  const email = el('input', INPUT_CSS);
  email.type = 'email';
  email.placeholder = 'Correo electrónico';
  email.autocomplete = 'email';
  const pass = el('input', INPUT_CSS);
  pass.type = 'password';
  pass.placeholder = 'Contraseña';
  pass.autocomplete = 'current-password';
  pass.style.cssText += ';margin:0;flex:1';
  // Botón 👁 para MOSTRAR/ocultar la contraseña (Marcelino: "que te deje ver la contraseña").
  const eye = el('button', BTN_CSS + ';margin:0;padding:6px 9px;min-width:38px', '👁');
  eye.type = 'button';
  eye.title = 'Mostrar/ocultar contraseña';
  eye.addEventListener('click', () => {
    const show = pass.type === 'password';
    pass.type = show ? 'text' : 'password';
    eye.textContent = show ? '🙈' : '👁';
    pass.focus();
  });
  const passWrap = el('div', 'display:flex;gap:6px;align-items:stretch;margin:0 0 8px');
  passWrap.append(pass, eye);
  const error = el('div', ERROR_CSS, '');
  const row = el('div', 'display:flex;gap:8px;flex-wrap:wrap;justify-content:center');
  const bIn = el('button', BTN_CSS, 'ENTRAR');
  const bUp = el('button', BTN_CSS, 'CREAR CUENTA');
  const bGuest = el('button', BTN_CSS, 'SIN CUENTA');
  row.append(bIn, bUp, bGuest);
  panel.append(el('div', TITLE_CSS, 'TU CUENTA DE ENTRENADOR'), email, passWrap, error, row);
  root.appendChild(panel);
  return { root, email, pass, error, buttons: [bIn, bUp, bGuest] };
}

/** Registro con autoconfirm: si no devuelve sesión, entra directamente. */
async function signUpAndEnter(em, pw) {
  const res = await signUp(em, pw);
  if (res.error || res.session) return res;
  return signIn(em, pw);
}

/**
 * Muestra el panel de cuenta sobre el canvas.
 * onDone(session|null) — null = jugar sin cuenta (invitado).
 */
export function showAuthForm(onDone) {
  const ui = buildAuthDom();
  const [bIn, bUp, bGuest] = ui.buttons;
  const listeners = [];
  const on = (node, type, fn) => { node.addEventListener(type, fn); listeners.push([node, type, fn]); };
  let done = false;

  const finish = (session) => {
    if (done) return;
    done = true;
    for (const [node, type, fn] of listeners) node.removeEventListener(type, fn);
    ui.root.remove();
    onDone(session ?? null);
  };

  const submit = async (action) => {
    if (done || bIn.disabled) return; // evita doble envío (Enter + click)
    ui.error.textContent = '';
    ui.buttons.forEach((b) => { b.disabled = true; });
    const res = await action(ui.email.value.trim(), ui.pass.value);
    ui.buttons.forEach((b) => { b.disabled = false; });
    if (res.error) { ui.error.textContent = res.error; return; }
    finish(res.session ?? null);
  };

  on(bIn, 'click', () => submit(signIn));
  on(bUp, 'click', () => submit(signUpAndEnter));
  // Invitado: cerrar cualquier sesión Supabase persistida para no leer/pisar
  // el save en la nube de otra cuenta — el modo invitado va solo a localStorage.
  on(bGuest, 'click', async () => { await signOut(); finish(null); });
  on(ui.root, 'keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Enter') submit(signIn);
  });

  document.body.appendChild(ui.root);
  ui.email.focus();
}
