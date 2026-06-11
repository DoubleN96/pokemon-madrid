# Catálogo audio SE/ME — scope `audio-se-me`

Efectos (SE) y jingles (ME) descargados de **omanoloneto/pokemon-essentials-enhanced-v20.1**
(`Audio/SE` y `Audio/ME`), convertidos de **OGG → MP3** con `ffmpeg` (libmp3lame).

> **Por qué MP3:** OGG no decodifica en headless / iOS Safari. Regla dura del proyecto:
> SOLO MP3. Todos los ficheros aquí ya son MP3 44.1 kHz estéreo, verificados con `ffprobe`.

- **SE** (efectos cortos): codificados a **128 kbps**.
- **ME** (jingles musicales): codificados a **160 kbps** (más headroom para la música).
- Origen: gráficos/audio de Pokémon Essentials (motor fangame). **Ojo a licencia**, ver
  sección final — NO confirmados como CC0; revisar antes de publicar comercialmente.

Estos sonidos **rellenan huecos** del juego: ya existen en `public/assets/audio/`
las keys `title, overworld, town, battle_wild, battle_trainer, victory` (música) y
`select, cancel, bump, door, heal, levelup, hit` (SFX). Lo de abajo es lo que el juego
NO tiene o donde la versión actual es pobre (p.ej. `heal` es un SFX de 0.78 s vs el
jingle completo `me_healing` de 2.45 s del Centro Pokémon).

---

## Efectos de sonido (SE) — 128 kbps

| Fichero | Dur (s) | Uso sugerido | ¿Hueco nuevo? |
|---|---|---|---|
| `se_cursor.mp3` | 0.50 | **Mover cursor en menú** (flechas arriba/abajo en menús, lista de Pokémon, mochila). El juego hoy NO tiene sonido de "navegar"; solo de confirmar. | Sí |
| `se_decision.mp3` | 0.44 | **Confirmar opción (A)** — alternativa más "Pokémon-auténtica" al actual `select`. Para confirmar selecciones de menú/combate. | Mejora de `select` |
| `se_cancel.mp3` | 0.44 | **Cancelar / volver (B)** — variante de cancelación de Essentials. Sustituto opcional del actual `cancel`. | Mejora de `cancel` |
| `se_buzzer.mp3` | 0.39 | **Acción inválida / "fallo"** — opción no permitida, intento bloqueado, item agotado, ataque sin PP. El "fallo" que pidió Marcelino. | Sí |
| `se_menu_open.mp3` | 0.57 | **Abrir menú / abrir la bolsa (mochila)**. El "abrir bolsa" pedido. También para abrir el menú principal. | Sí |
| `se_menu_close.mp3` | 0.57 | **Cerrar menú / cerrar bolsa**. Par natural de `se_menu_open`. | Sí |
| `se_save_choice.mp3` | 1.10 | **Confirmar guardar partida** (al elegir "Sí" en el diálogo de guardado). Combina con el jingle `me_save_game`. | Sí |
| `se_hit_normal.mp3` | 1.25 | **Golpe de daño NORMAL** en combate (eficacia normal). Mejora del `hit` actual (un solo golpe genérico). | Mejora de `hit` |
| `se_hit_super.mp3` | 1.83 | **Golpe SUPER EFICAZ** ("¡Es muy eficaz!"). Da feedback de tipo. | Sí |
| `se_hit_weak.mp3` | 0.57 | **Golpe POCO EFICAZ** ("No es muy eficaz..."). | Sí |
| `se_faint.mp3` | 0.84 | **Pokémon debilitado** (cae a 0 PS). Pitido descendente clásico al debilitarse. | Sí |
| `se_exp_gain.mp3` | 2.72 | **Ganar EXP** — sonido de la barra de experiencia subiendo tras ganar combate. Hacer `loop`/cortar según dure el llenado de barra. | Sí |
| `se_ball_throw.mp3` | 1.12 | **Lanzar Poké Ball** (inicio de captura). | Sí |
| `se_ball_shake.mp3` | 0.21 | **Tambaleo de la ball** (cada uno de los 3 "clicks" de captura). Reproducir 1–3 veces. | Sí |
| `se_ball_click.mp3` | 0.47 | **Click de captura confirmada** (la ball se cierra: ¡capturado!). Encadenar con `me_pkmn_get`. | Sí |
| `se_jump.mp3` | 0.29 | **Saltar bordillo/ledge** en el overworld (si se implementa ese movimiento). | Sí (opcional) |

### Secuencia de captura recomendada
`se_ball_throw` → `se_ball_shake` ×3 → `se_ball_click` → (jingle) `me_pkmn_get`.

### Secuencia de combate recomendada
golpe según eficacia (`se_hit_weak` / `se_hit_normal` / `se_hit_super`) → si el rival cae,
`se_faint` → `se_exp_gain` mientras sube la barra → al ganar, `victory` (ya existe) o
`me_badge_get` si es combate de medalla.

---

## Jingles musicales (ME) — 160 kbps

> ME = "Music Effect": jingles cortos que se reproducen **una vez** (`loop: false`),
> normalmente **pausando la música de fondo** y retomándola al acabar. El AudioManager
> ya soporta esto con `playMusic(scene, key, { loop: false })` (ver el patrón de `victory`).

| Fichero | Dur (s) | Uso sugerido | ¿Hueco nuevo? |
|---|---|---|---|
| `me_badge_get.mp3` | 5.28 | **Jingle de VICTORIA / MEDALLA** — fanfarria larga al ganar a un líder/jefe (Álvaro rival, jefes finales). El "jingle de victoria/medalla" pedido. Más épico que el `victory` actual de 21 s (que es más un loop). | Sí |
| `me_healing.mp3` | 2.46 | **Curación en Centro Pokémon** — jingle completo de sanación. MUCHO mejor que el `heal` SFX actual (0.78 s). Usar al curar el equipo. | Mejora de `heal` |
| `me_item_get.mp3` | 2.35 | **Obtener objeto** (recoger item del suelo, comprar, recompensa). | Sí |
| `me_key_item_get.mp3` | 2.46 | **Obtener objeto CLAVE** (item importante de historia). Variante "premium" de `me_item_get`. | Sí |
| `me_pkmn_get.mp3` | 4.08 | **¡Pokémon capturado!** — jingle tras cerrar la captura. Encadena con la secuencia de ball. | Sí |
| `me_evolution_success.mp3` | 4.08 | **Evolución completada** (si se implementa evolución). | Sí (opcional) |
| `me_save_game.mp3` | 1.33 | **Partida guardada** — jingle corto de confirmación de guardado. Combina con `se_save_choice`. | Sí |

---

## Verificación (honestidad técnica)

- **23/23 ficheros** verificados con `ffprobe`: `codec=mp3`, `channels=2`, `dur` coincide con
  el OGG origen (+~30 ms de padding del encoder MP3, normal). Ninguno vacío (todos >1 KB).
- Todos a **44100 Hz**. SE a 128 kbps, ME a 160 kbps.
- Convertidos con: `ffmpeg -i in.ogg -codec:a libmp3lame -b:a {128k|160k} -ar 44100 out.mp3`.
- Los OGG intermedios se borraron (`_src_ogg/`), solo quedan los MP3 game-ready.

## ⚠️ Licencia (BLOQUEADOR a revisar antes de publicar)

Estos audios vienen del repo de un **fangame de Pokémon** (Pokémon Essentials enhanced).
El manifest actual del juego (`audio_manifest.json`) usa SOLO audio **CC0 de Juhani Junkala**
precisamente para evitar copyright de Nintendo. **Muchos SE/ME de Pokémon Essentials NO son
CC0**: algunos son sonidos originales de los juegos de Pokémon (copyright Nintendo/Game Freak)
o reproducciones cercanas.

- **Para uso interno / juego privado entre amigos**: bajo riesgo.
- **Para venta / distribución pública**: NO mezclar con la nota "todo CC0" del manifest sin
  verificar la licencia real de cada fichero. Posibles alternativas 100% CC0 equivalentes:
  OpenGameart (la misma fuente del audio actual del juego). Marcar como pendiente de
  decisión de Marcelino.

## Cómo integrarlo (para el orquestador, NO hecho aquí)

1. Copiar los `.mp3` deseados a `public/assets/audio/`.
2. Añadir cada key en `public/assets/audio/audio_manifest.json` (sección `sfx` para SE,
   `music` para ME que se reproducen con `playMusic(..., {loop:false})`).
3. Cablear en escenas: `sfx(scene, 'cursor')`, `playMusic(scene, 'badge_get', {loop:false})`, etc.
4. Actualizar `credits` del manifest y RESOLVER la licencia (ver aviso arriba).
