// Módulo F — Guardado de partida.
// Con sesión: upsert/select en pm_saves (slot 1) Y copia en localStorage
// (cinturón y tirantes). Sin sesión: solo localStorage (clave pm_save_guest).
// Todas las funciones devuelven { ok, where: 'supabase'|'local', state?, error? }.
import { supabase } from './supabase.js';
import { getSession } from './auth.js';
import { SAVE_VERSION } from '../config.js';

const SLOT = 1;
const GUEST_KEY = 'pm_save_guest';

const MSG = {
  noSave: 'No hay ninguna partida guardada.',
  oldVersion: 'La partida guardada es de una versión antigua del juego y no se puede cargar.',
  corrupt: 'La partida guardada está corrupta y no se puede cargar.',
  badState: 'El estado de partida no es válido; no se guarda nada.',
  cloudFail: 'No se ha podido guardar en la nube; la partida queda guardada solo en este navegador.',
  localFail: 'No se ha podido guardar la partida en este dispositivo.',
  offlineNoCopy: 'Sin conexión con el servidor y sin copia local de la partida.',
  deleteFail: 'No se ha podido borrar la partida de la nube.',
};

// --- localStorage con red de seguridad (en Node no existe: se salta sin romper) ---
function localRead(key) {
  try { return globalThis.localStorage?.getItem(key) ?? null; } catch { return null; }
}

function localWrite(key, value) {
  try {
    if (!globalThis.localStorage) return false;
    globalThis.localStorage.setItem(key, value);
    return true;
  } catch { return false; }
}

function localDelete(key) {
  try { globalThis.localStorage?.removeItem(key); } catch { /* sin localStorage no hay nada que borrar */ }
}

function userKey(session) {
  return `pm_save_${session.user.id}`;
}

/** null si el estado es válido; si no, el mensaje de error a mostrar. */
function invalidReason(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return MSG.corrupt;
  if (state.version !== SAVE_VERSION) return MSG.oldVersion;
  return null;
}

/** Lee y valida un guardado local; si está corrupto o es viejo, lo descarta. */
function parseLocal(key) {
  const raw = localRead(key);
  if (raw === null) return { ok: false, where: 'local', error: MSG.noSave };
  let state;
  try {
    state = JSON.parse(raw);
  } catch {
    localDelete(key);
    return { ok: false, where: 'local', error: MSG.corrupt };
  }
  const reason = invalidReason(state);
  if (reason) {
    localDelete(key);
    return { ok: false, where: 'local', error: reason };
  }
  return { ok: true, where: 'local', state };
}

async function saveToCloud(session, state) {
  try {
    const row = {
      user_id: session.user.id,
      slot: SLOT,
      state,
      play_time_s: Math.max(0, Math.floor(state.playTimeS ?? 0)),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('pm_saves').upsert(row, { onConflict: 'user_id,slot' });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/** Guarda la partida. Con sesión escribe en supabase Y en localStorage. */
export async function saveGame(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) {
    return { ok: false, where: 'local', error: MSG.badState };
  }
  const toSave = { ...state, version: state.version ?? SAVE_VERSION };
  const session = await getSession();
  if (!session) {
    const ok = localWrite(GUEST_KEY, JSON.stringify(toSave));
    return ok
      ? { ok: true, where: 'local' }
      : { ok: false, where: 'local', error: MSG.localFail };
  }
  const localOk = localWrite(userKey(session), JSON.stringify(toSave));
  const cloud = await saveToCloud(session, toSave);
  if (cloud.ok) return { ok: true, where: 'supabase' };
  if (localOk) return { ok: true, where: 'local', error: MSG.cloudFail };
  return { ok: false, where: 'local', error: cloud.error || MSG.cloudFail };
}

async function loadFromCloud(session) {
  try {
    const { data, error } = await supabase
      .from('pm_saves')
      .select('state')
      .eq('user_id', session.user.id)
      .eq('slot', SLOT)
      .maybeSingle();
    if (error) return { networkError: true };
    if (!data) return { result: { ok: false, where: 'supabase', error: MSG.noSave } };
    const reason = invalidReason(data.state);
    if (reason) return { result: { ok: false, where: 'supabase', error: reason } };
    return { result: { ok: true, where: 'supabase', state: data.state } };
  } catch {
    return { networkError: true };
  }
}

/** Carga la partida. Con sesión prioriza supabase; si falla la red, copia local. */
export async function loadGame() {
  const session = await getSession();
  if (!session) return parseLocal(GUEST_KEY);
  const cloud = await loadFromCloud(session);
  if (!cloud.networkError) return cloud.result;
  const local = parseLocal(userKey(session));
  if (local.ok) return local;
  return { ok: false, where: 'local', error: MSG.offlineNoCopy };
}

/** Borra la partida (para "Nueva Partida"). */
export async function deleteSave() {
  const session = await getSession();
  if (!session) {
    localDelete(GUEST_KEY);
    return { ok: true, where: 'local' };
  }
  localDelete(userKey(session));
  try {
    const { error } = await supabase
      .from('pm_saves')
      .delete()
      .eq('user_id', session.user.id)
      .eq('slot', SLOT);
    if (error) return { ok: false, where: 'supabase', error: error.message };
    return { ok: true, where: 'supabase' };
  } catch {
    return { ok: false, where: 'supabase', error: MSG.deleteFail };
  }
}
