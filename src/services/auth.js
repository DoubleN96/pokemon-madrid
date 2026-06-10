// Módulo F — Autenticación.
// Ninguna función lanza excepciones hacia la UI: los fallos llegan como
// { error: "mensaje legible en español" }.
import { supabase } from './supabase.js';

const NETWORK_ERROR = 'No hay conexión con el servidor. Comprueba tu red e inténtalo otra vez.';

const ERROR_MESSAGES = [
  [/invalid login credentials/i, 'Correo o contraseña incorrectos.'],
  [/already (been )?registered/i, 'Ese correo ya está registrado. Prueba a iniciar sesión.'],
  [/at least 6 characters|password should be/i, 'La contraseña es muy corta: mínimo 6 caracteres.'],
  [/unable to validate email|invalid email|is invalid/i, 'Ese correo no tiene buena pinta. Revísalo, anda.'],
  [/rate limit|too many requests/i, 'Demasiados intentos seguidos. Espera un momento y vuelve a probar.'],
  [/signups not allowed/i, 'El registro está cerrado ahora mismo.'],
];

function toSpanish(error) {
  const raw = error?.message || '';
  for (const [pattern, msg] of ERROR_MESSAGES) {
    if (pattern.test(raw)) return msg;
  }
  return raw
    ? `No se ha podido completar la operación (${raw}).`
    : 'No se ha podido completar la operación.';
}

/** Registra una cuenta nueva. El servidor autoconfirma el email. */
export async function signUp(email, pass) {
  if (!email || !pass) return { error: 'Pon un correo y una contraseña, que sin eso no hay cuenta.' };
  try {
    const { data, error } = await supabase.auth.signUp({ email, password: pass });
    if (error) return { error: toSpanish(error) };
    return { user: data.user, session: data.session };
  } catch {
    return { error: NETWORK_ERROR };
  }
}

/** Inicia sesión con email y contraseña. */
export async function signIn(email, pass) {
  if (!email || !pass) return { error: 'Pon un correo y una contraseña para entrar.' };
  try {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: pass });
    if (error) return { error: toSpanish(error) };
    return { user: data.user, session: data.session };
  } catch {
    return { error: NETWORK_ERROR };
  }
}

/** Cierra la sesión actual. */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) return { error: toSpanish(error) };
    return { ok: true };
  } catch {
    return { error: NETWORK_ERROR };
  }
}

/** Devuelve la sesión activa o null (también null si algo falla). */
export async function getSession() {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data?.session ?? null;
  } catch {
    return null;
  }
}

/**
 * Suscribe un callback a los cambios de sesión: cb(session|null).
 * Devuelve una función para cancelar la suscripción.
 */
export function onAuthChange(cb) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session ?? null));
  return () => data.subscription.unsubscribe();
}
