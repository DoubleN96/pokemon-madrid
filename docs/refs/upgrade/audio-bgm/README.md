# Catálogo BGM — upgrade audio-bgm (Pokémon Piso / Madrid)

Scope del agente: **audio-bgm**. Objetivo: BGM estilo FRLG (pueblo, ruta, combate
salvaje, combate entrenador, gimnasio, victoria) en **MP3** (única opción válida para
headless / iOS Safari) listo para reemplazar/ampliar las pistas actuales.

> Trabajo de SOLO investigación + descarga + conversión. **No se tocó `src/`, ni git, ni deploy.**
> Todos los `.mp3` quedan aquí, en `docs/refs/upgrade/audio-bgm/`.

---

## TL;DR de qué hay ahora en el juego (estado de partida)

`public/assets/audio/` ya trae 6 pistas BGM **CC0 genéricas** (chiptunes de Juhani
Junkala / SubspaceAudio): `title, overworld, town, battle_wild, battle_trainer, victory`.
Son CC0 reales pero **NO suenan a FRLG** — son chiptunes de acción/aventura genéricos.
Marcelino quiere subir calidad y darle sabor Pokémon. Eso es lo que aporta este catálogo.

Claves BGM que el motor usa (ver `src/audio/AudioManager.js` + `audio_manifest.json`):
`title, overworld, town, battle_wild, battle_trainer, victory`.
**No existe pista de gimnasio todavía** (oportunidad: añadir `gym` / `battle_gymleader`).

---

## Conjunto A — "FRLG-feel" (Pokémon Essentials Enhanced) — RECOMENDADO por estilo

Origen: repo `omanoloneto/pokemon-essentials-enhanced-v20.1`, carpeta `Audio/BGM`.
Es el set de BGM por defecto de **Pokémon Essentials** (motor RPG Maker XP de fan-games).
Suena claramente a Pokémon clásico (Gen 3 FRLG/RSE-style). Los `.ogg` venían
pre-renderizados; los temas de pueblo/ruta/gimnasio venían en `.mid` y los **rendericé
yo** con FluidSynth + soundfont `FluidR3_GM.sf2` (148 MB, GM de calidad) → WAV → MP3.

Todas las salidas: **MP3, 44.1 kHz, estéreo, 192 kbps, loudnorm I=-16 LUFS** (volumen
consistente con el resto del juego, ninguna silenciosa — verificado con `volumedetect`).

| Archivo MP3 | Mapea a clave juego | Origen | Render | Dur (s) |
|---|---|---|---|---|
| `frlg_title.mp3` | `title` | `Title.ogg` | OGG→MP3 | 76.0 |
| `frlg_town.mp3` | `town` (pueblo) | `Lappet Town.mid` | MIDI→MP3 | 64.6 |
| `frlg_route.mp3` | `overworld` (ruta) | `Route 1.mid` | MIDI→MP3 | 42.3 |
| `frlg_route_alt.mp3` | `overworld` alt | `Route 2.mid` | MIDI→MP3 | 60.9 |
| `frlg_battle_wild.mp3` | `battle_wild` | `Battle wild.ogg` | OGG→MP3 | 62.5 |
| `frlg_battle_trainer.mp3` | `battle_trainer` | `Battle trainer.ogg` | OGG→MP3 | 102.9 |
| `frlg_victory_wild.mp3` | `victory` | `Battle victory.ogg` | OGG→MP3 | 36.9 |
| `frlg_victory_trainer.mp3` | `victory` (entrenador) | `Battle victory trainer.ogg` | OGG→MP3 | 41.7 |
| `frlg_victory_leader.mp3` | `victory` (líder) | `Battle victory leader.ogg` | OGG→MP3 | 82.8 |
| `frlg_gym.mp3` | **nuevo** `gym` | `Gym.mid` | MIDI→MP3 | 44.1 |
| `frlg_battle_gymleader.mp3` | **nuevo** `battle_gymleader` | `Battle Gym Leader.mid` | MIDI→MP3 | 122.6 |
| `frlg_pokecenter.mp3` | **nuevo** `pokecenter` (curación) | `Poke Center.mid` | MIDI→MP3 | 39.3 |

Cobertura del scope: pueblo ✅ ruta ✅ combate salvaje ✅ combate entrenador ✅
gimnasio ✅ victoria ✅ (+ extras: pokécenter, segundo tema de ruta, victoria de líder).

Fuentes `.mid`/`.ogg` originales conservadas en `_src/mid/` y `_src/ogg/` para trazabilidad
y por si quieres re-renderizar con otro soundfont o ajustar el bucle.

### ⚠️ LICENCIA — leer antes de publicar (importante, honesto)

El BGM por defecto de Pokémon Essentials **NO es CC0** y **no tiene una licencia limpia
documentada** en el repo (el `README.md` solo lista créditos de plugins/scripts, no de
las pistas de audio; el `Gen8 Pack Credits.txt` no contiene créditos de audio). Estas
pistas son composiciones de la comunidad de fan-games, históricamente inspiradas/remixadas
de los juegos oficiales, distribuidas **para uso en fan-games de Pokémon sin ánimo de lucro**.

- ✅ **Encaja con el uso de Marcelino**: "fan-game privado" de Pokémon entre amigos.
- ❌ **NO** es apta para venta/uso comercial ni para reclamar CC0/dominio público.
- 👉 Si el juego algún día se monetiza o se publica como producto, **NO usar el Conjunto A**;
  usar el Conjunto B (CC0) o encargar música original.

---

## Conjunto B — CC0 limpio (alternativa licencia-segura) — "15 Melodic RPG Chiptunes"

Origen: OpenGameArt — "15 Melodic RPG Chiptunes" de **Aureolus_Omicron**,
**CC0 1.0 (dominio público, sin atribución obligatoria)**.
Son chiptunes RPG melódicos (estilo JRPG/aventura, no FRLG literal) pero **100% libres
para cualquier uso, incluido comercial**. Buen plan B si el proyecto deja de ser privado.

| Archivo MP3 | Mapea a | Origen | Dur (s) |
|---|---|---|---|
| `cc0_title.mp3` | `title` | `rpgchip01_title_screen.ogg` | 53.4 |
| `cc0_town.mp3` | `town` | `rpgchip03_town.ogg` | 107.7 |
| `cc0_battle_wild.mp3` | `battle_wild` | `rpgchip13_battle_1.ogg` | 137.2 |
| `cc0_battle_trainer.mp3` | `battle_trainer` | `rpgchip14_battle_2.ogg` | 107.4 |
| `cc0_gym.mp3` | `gym` | `rpgchip04_in_the_royal_court.ogg` | 120.0 |

Mismo procesado: MP3 44.1 kHz estéreo 192 kbps, loudnorm -16 LUFS, todas con audio real.
Licencia: https://opengameart.org/content/15-melodic-rpg-chiptunes (CC0).

Nota honesta de estilo: estas pistas son más "RPG melódico" que "GBA Pokémon".
Cubren town/battle/gym razonablemente, pero **no hay un tema de ruta ni de victoria
que encajen 1:1** en este pack — para victoria CC0 habría que cortar un jingle aparte.

---

## Lo que NO pude hacer / pendiente honesto

- **FRLG real (pret/pokefirered)**: la música original de FireRed/LeafGreen es
  copyright Nintendo/GAME FREAK. **No la descargué ni la rippeé** (no es usable legalmente
  ni siquiera en fan-game; además vive como datos de sonido del motor mGBA, no como MP3).
- **Bucle (loop) perfecto**: las pistas se reproducen en bucle vía Phaser (`loop:true`),
  pero **no recorté puntos de loop limpios** por pista; algunas (sobre todo las OGG largas)
  pueden tener una pequeña costura al reenganchar. Si Marcelino quiere loops perfectos,
  hace falta editar puntos de loop manualmente (fuera de scope de SOLO descarga/conversión).
- **Victoria CC0**: el Conjunto B no trae un jingle de victoria adecuado; quedó sin
  equivalente CC0 (el `rpgchip15_game_over` es "game over", no victoria).

---

## Cómo integrarlo (para Sisyphus / quien toque `src/`, NO yo)

1. Decide conjunto: **A (FRLG-feel)** para el fan-game privado actual / **B (CC0)** si se
   publica o monetiza.
2. Copia los `.mp3` elegidos a `public/assets/audio/` con los nombres de clave del motor
   (`title.mp3`, `town.mp3`, `overworld.mp3`, `battle_wild.mp3`, `battle_trainer.mp3`,
   `victory.mp3`). Renombrar = sustitución directa, no hay que tocar código.
3. Para añadir gimnasio: registrar claves nuevas `gym` / `battle_gymleader` en
   `public/assets/audio/audio_manifest.json` (sección `music`) y llamar
   `playMusic(this, 'battle_gymleader')` en BattleScene cuando el rival sea líder de gym.
4. Actualizar `credits` y el `_comment` del manifest: si se usa el Conjunto A, **quitar la
   afirmación "todo CC0"** del comentario (ahora mismo el manifest dice que todo es CC0;
   eso dejaría de ser cierto con el Conjunto A).

---

## Reproducibilidad (comandos usados)

```bash
# MIDI -> WAV (soundfont GM de calidad)
fluidsynth -ni -g 1.0 -F out.wav /usr/share/sounds/sf2/FluidR3_GM.sf2 "Lappet Town.mid"
# WAV/OGG -> MP3 normalizado, formato del juego
ffmpeg -y -i in.wav -af "loudnorm=I=-16:TP=-1.5:LRA=11" -ar 44100 -ac 2 -c:a libmp3lame -b:a 192k out.mp3
```

Herramientas instaladas para este scope: `fluidsynth 2.3.4` + `fluid-soundfont-gm`
(`/usr/share/sounds/sf2/FluidR3_GM.sf2`). ffmpeg ya estaba.
