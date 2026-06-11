/**
 * AudioManager.js — Gestor de audio standalone para Pokémon Madrid (Phaser 3.90, ESM).
 *
 * Carga música y SFX desde `public/assets/audio/audio_manifest.json` (todo CC0,
 * ver créditos en ese manifest). Expone una API mínima e idempotente:
 *
 *   preloadAudio(scene)                  -> encola TODO el audio del manifest en scene.load
 *   playMusic(scene, key, opts)          -> reproduce música con crossfade; no reinicia si ya suena
 *   stopMusic(scene, opts)               -> para la música actual (con fade opcional)
 *   sfx(scene, key, opts)                -> reproduce un efecto corto (respeta mute/volumen)
 *   setMute(scene, muted) / toggleMute() -> mute global persistido en localStorage
 *   setMasterVolume(value)               -> volumen maestro global persistido en localStorage
 *   getState()                           -> { muted, masterVolume, currentMusicKey }
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * CÓMO LO CABLEA EL ORQUESTADOR (no hace falta tocar este archivo):
 *
 *  1) En BootScene.preload(), tras encolar tus assets normales:
 *         import { preloadAudio } from '../audio/AudioManager.js';
 *         preloadAudio(this);   // encola música+SFX; Phaser los descarga con el resto
 *
 *     El manifest se carga con fetch SÍNCRONO-vía-callback: preloadAudio dispara un
 *     fetch y, cuando llega, mete cada pista en this.load.audio(...). Para que esto
 *     funcione SIEMPRE (incluso si el fetch tarda), preloadAudio pausa el loader y lo
 *     reanuda al tener el manifest. Si prefieres no depender de eso, puedes llamar a
 *     `await AudioManager.fetchManifest()` en un preload async y luego preloadAudio.
 *
 *  2) En cada escena, en create(), arranca su tema:
 *         import { playMusic } from '../audio/AudioManager.js';
 *         playMusic(this, 'town');           // WorldScene en pueblo
 *         playMusic(this, 'overworld');       // WorldScene en ruta
 *         playMusic(this, 'battle_wild');     // BattleScene (encuentro salvaje)
 *         playMusic(this, 'battle_trainer');  // BattleScene (entrenador)
 *         playMusic(this, 'title');           // TitleScene
 *     Como playMusic NO reinicia si ya suena esa key, es seguro llamarlo en cada
 *     create() aunque vuelvas a la misma escena.
 *
 *  3) SFX en inputs / eventos:
 *         import { sfx } from '../audio/AudioManager.js';
 *         sfx(this, 'select');    // confirmar opción de menú (A)
 *         sfx(this, 'cancel');    // volver / B
 *         sfx(this, 'bump');      // chocar contra colisión
 *         sfx(this, 'door');      // entrar/salir de edificio
 *         sfx(this, 'heal');      // curar en Centro Pokémon
 *         sfx(this, 'levelup');   // subir de nivel
 *         sfx(this, 'hit');       // golpe de ataque en combate
 *
 *  4) Victoria de combate: para la música de batalla y suena 'victory' como jingle:
 *         playMusic(this, 'victory', { loop: false });
 *     Cuando vuelvas al overworld, playMusic(this, 'town'/'overworld') retoma el loop.
 *
 *  5) (Opcional) Botón de mute en un menú de opciones:
 *         import { toggleMute, getState } from '../audio/AudioManager.js';
 *         toggleMute(this);  // alterna y persiste en localStorage
 * ──────────────────────────────────────────────────────────────────────────────
 */

// Ruta del manifest, relativa a la base pública (Vite sirve public/ en la raíz).
// import.meta.env.BASE_URL respeta `base: './'` de vite.config.js.
const MANIFEST_URL = `${import.meta.env.BASE_URL || './'}assets/audio/audio_manifest.json`;

// Claves de localStorage para persistencia de preferencias.
const LS_MUTE = 'pkmadrid.audio.muted';
const LS_VOL = 'pkmadrid.audio.masterVolume';

// Crossfade por defecto entre pistas de música (ms).
const DEFAULT_FADE_MS = 600;

/**
 * Estado global del módulo (singleton). Vive fuera de cualquier escena para que
 * la música persista entre transiciones de escena (Phaser conserva el sound manager
 * a nivel de juego, pero el seguimiento de "qué suena" lo llevamos aquí).
 */
const state = {
  manifest: null, // { music:{}, sfx:{}, credits:[] }
  currentMusic: null, // instancia Phaser.Sound actual
  currentMusicKey: null, // string key del manifest
  muted: readBool(LS_MUTE, false),
  masterVolume: readFloat(LS_VOL, 0.95), // volumen maestro 0..1
  _manifestPromise: null, // promesa de fetch en curso (evita fetches duplicados)
};

// ──────────────────────────────────────────────────────────────────────────────
// Persistencia (localStorage) — defensiva: si no hay localStorage (SSR/privado), no peta.
// ──────────────────────────────────────────────────────────────────────────────
function readBool(key, fallback) {
  try {
    const v = window.localStorage.getItem(key);
    return v === null ? fallback : v === 'true';
  } catch {
    return fallback;
  }
}
function readFloat(key, fallback) {
  try {
    const v = window.localStorage.getItem(key);
    if (v === null) return fallback;
    const n = parseFloat(v);
    return Number.isFinite(n) ? clamp01(n) : fallback;
  } catch {
    return fallback;
  }
}
function writeLS(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    /* almacenamiento no disponible: ignorar silenciosamente */
  }
}
function clamp01(n) {
  return Math.max(0, Math.min(1, n));
}

// ──────────────────────────────────────────────────────────────────────────────
// Manifest
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Descarga (una sola vez) y cachea el manifest de audio.
 * @returns {Promise<object>} el objeto manifest.
 */
export function fetchManifest() {
  if (state.manifest) return Promise.resolve(state.manifest);
  if (state._manifestPromise) return state._manifestPromise;

  state._manifestPromise = fetch(MANIFEST_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`audio_manifest.json HTTP ${res.status}`);
      return res.json();
    })
    .then((json) => {
      state.manifest = normalizeManifest(json);
      return state.manifest;
    })
    .catch((err) => {
      // No bloqueamos el juego si falla el audio: log y manifest vacío.
      console.warn('[AudioManager] No se pudo cargar el manifest de audio:', err);
      state.manifest = { music: {}, sfx: {}, credits: [] };
      return state.manifest;
    });

  return state._manifestPromise;
}

function normalizeManifest(json) {
  return {
    music: json && json.music ? json.music : {},
    sfx: json && json.sfx ? json.sfx : {},
    credits: json && Array.isArray(json.credits) ? json.credits : [],
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// Preload
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Encola TODO el audio del manifest en el loader de la escena dada.
 * Llamar en BootScene.preload(). Pausa el loader hasta tener el manifest y lo
 * reanuda al terminar, de modo que las pistas entran en la misma cola de carga.
 *
 * @param {Phaser.Scene} scene
 * @returns {Promise<void>} resuelve cuando las pistas han sido encoladas.
 */
export function preloadAudio(scene) {
  // Phaser permite pausar/reanudar el LoaderPlugin para inyectar assets async.
  const loader = scene.load;
  loader.pause?.();

  const queueAll = (manifest) => {
    const base = import.meta.env.BASE_URL || './';
    const entries = [
      ...Object.entries(manifest.music || {}),
      ...Object.entries(manifest.sfx || {}),
    ];
    for (const [key, relPath] of entries) {
      if (!relPath) continue;
      if (scene.cache.audio.exists(key)) continue; // idempotente entre escenas
      // relPath en el manifest es "audio/xxx.ogg" -> prefijamos la base pública.
      loader.audio(key, `${base}${relPath.replace(/^\/+/, '')}`);
    }
    loader.resume?.();
  };

  return fetchManifest()
    .then(queueAll)
    .catch((err) => {
      console.warn('[AudioManager] preloadAudio falló:', err);
      loader.resume?.();
    });
}

// ──────────────────────────────────────────────────────────────────────────────
// Música
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Reproduce una pista de música por su key del manifest.
 * - Si ya está sonando esa misma key (y no está parada), NO reinicia: no hace nada.
 * - Si suena otra pista, hace crossfade (fade-out de la anterior + fade-in de la nueva).
 * - Respeta mute y volumen maestro globales.
 *
 * @param {Phaser.Scene} scene
 * @param {string} key            key dentro de manifest.music (ej. 'town')
 * @param {object} [opts]
 * @param {boolean} [opts.loop=true]
 * @param {number}  [opts.volume=0.5]   volumen base de la pista (se multiplica por masterVolume)
 * @param {number}  [opts.fade=600]     duración del crossfade en ms (0 = corte seco)
 * @returns {Phaser.Sound.BaseSound|null}
 */
export function playMusic(scene, key, opts = {}) {
  const { loop = true, volume = 0.9, fade = DEFAULT_FADE_MS } = opts;

  // No reiniciar si ya suena la misma pista.
  if (
    state.currentMusicKey === key &&
    state.currentMusic &&
    state.currentMusic.isPlaying
  ) {
    return state.currentMusic;
  }

  // Si el audio aún no se ha cargado (manifest tardío), no rompemos nada.
  if (!scene.cache.audio.exists(key)) {
    console.warn(`[AudioManager] Música '${key}' no está cargada todavía.`);
    return null;
  }

  const targetVol = clamp01(volume) * state.masterVolume;
  const prev = state.currentMusic;

  // Crear la nueva instancia. La añadimos al sound manager del juego (no de la escena)
  // para que sobreviva cambios de escena.
  const next = scene.sound.add(key, {
    loop,
    volume: fade > 0 ? 0 : (state.muted ? 0 : targetVol),
    mute: state.muted,
  });
  next.play();

  if (fade > 0) {
    // Fade-in de la nueva.
    scene.tweens.add({
      targets: next,
      volume: state.muted ? 0 : targetVol,
      duration: fade,
      ease: 'Linear',
    });
    // Fade-out + destrucción de la anterior.
    if (prev && prev.isPlaying) {
      scene.tweens.add({
        targets: prev,
        volume: 0,
        duration: fade,
        ease: 'Linear',
        onComplete: () => {
          prev.stop();
          prev.destroy();
        },
      });
    } else if (prev) {
      prev.destroy();
    }
  } else if (prev) {
    prev.stop();
    prev.destroy();
  }

  state.currentMusic = next;
  state.currentMusicKey = key;
  // Guardamos el volumen base pedido para poder reaplicar tras cambios de mute/volumen.
  next._baseVolume = clamp01(volume);
  return next;
}

/**
 * Para la música actual.
 * @param {Phaser.Scene} scene
 * @param {object} [opts]
 * @param {number} [opts.fade=600]  fade-out en ms (0 = corte seco)
 */
export function stopMusic(scene, opts = {}) {
  const { fade = DEFAULT_FADE_MS } = opts;
  const cur = state.currentMusic;
  if (!cur) return;

  if (fade > 0 && cur.isPlaying && scene && scene.tweens) {
    scene.tweens.add({
      targets: cur,
      volume: 0,
      duration: fade,
      ease: 'Linear',
      onComplete: () => {
        cur.stop();
        cur.destroy();
      },
    });
  } else {
    cur.stop();
    cur.destroy();
  }
  state.currentMusic = null;
  state.currentMusicKey = null;
}

// ──────────────────────────────────────────────────────────────────────────────
// SFX
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Reproduce un efecto de sonido corto por su key del manifest.
 * Usa scene.sound.play (fire-and-forget): Phaser gestiona la limpieza al terminar.
 *
 * @param {Phaser.Scene} scene
 * @param {string} key           key dentro de manifest.sfx (ej. 'select')
 * @param {object} [opts]
 * @param {number} [opts.volume=0.7]  volumen base (se multiplica por masterVolume)
 * @param {number} [opts.rate=1]      velocidad/tono de reproducción
 * @returns {boolean} true si se reprodujo
 */
export function sfx(scene, key, opts = {}) {
  const { volume = 0.7, rate = 1 } = opts;
  if (state.muted) return false;
  if (!scene.cache.audio.exists(key)) {
    console.warn(`[AudioManager] SFX '${key}' no está cargado.`);
    return false;
  }
  scene.sound.play(key, {
    volume: clamp01(volume) * state.masterVolume,
    rate,
  });
  return true;
}

// ──────────────────────────────────────────────────────────────────────────────
// Mute / volumen global (persistido)
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Activa/desactiva el mute global. Persiste en localStorage y aplica al instante
 * a la música en curso (los SFX simplemente se silencian al estar muteado).
 * @param {Phaser.Scene} scene
 * @param {boolean} muted
 */
export function setMute(scene, muted) {
  state.muted = !!muted;
  writeLS(LS_MUTE, state.muted);
  applyMusicVolume();
  return state.muted;
}

/**
 * Alterna el mute global.
 * @param {Phaser.Scene} scene
 */
export function toggleMute(scene) {
  return setMute(scene, !state.muted);
}

/**
 * Ajusta el volumen maestro global (0..1). Persiste y reaplica a la música actual.
 * @param {number} value
 */
export function setMasterVolume(value) {
  state.masterVolume = clamp01(value);
  writeLS(LS_VOL, state.masterVolume);
  applyMusicVolume();
  return state.masterVolume;
}

/** Reaplica volumen efectivo a la música en curso según mute + masterVolume. */
function applyMusicVolume() {
  const cur = state.currentMusic;
  if (!cur) return;
  const base = typeof cur._baseVolume === 'number' ? cur._baseVolume : 0.5;
  if (typeof cur.setMute === 'function') cur.setMute(state.muted);
  if (typeof cur.setVolume === 'function') {
    cur.setVolume(state.muted ? 0 : base * state.masterVolume);
  }
}

/**
 * Estado actual del audio (útil para UI de opciones).
 * @returns {{muted:boolean, masterVolume:number, currentMusicKey:string|null}}
 */
export function getState() {
  return {
    muted: state.muted,
    masterVolume: state.masterVolume,
    currentMusicKey: state.currentMusicKey,
  };
}

/** Lista de créditos del manifest (para una pantalla de "Créditos"). */
export function getCredits() {
  return state.manifest ? state.manifest.credits : [];
}

// Export por defecto agrupado, por si el orquestador prefiere `import AudioManager from ...`.
export default {
  fetchManifest,
  preloadAudio,
  playMusic,
  stopMusic,
  sfx,
  setMute,
  toggleMute,
  setMasterVolume,
  getState,
  getCredits,
};
