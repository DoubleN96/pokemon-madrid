# PLAN — Mejora drástica de calidad visual (Pokémon Piso / Madrid)

> Plan de integración PRIORIZADO por (impacto visual / esfuerzo). Síntesis de los 12 scopes de
> investigación de la flota. Todos los assets citados están **verificados que existen** en
> `docs/refs/upgrade/<scope>/` (Pillow/ffprobe: dimensiones correctas, no vacíos, RGBA/P, sin antialiasing).
>
> **Este documento NO toca `src/`.** Es la hoja de ruta para que el orquestador (Sisyphus) ejecute la
> integración. Lo más prioritario (lo que Marcelino notará primero) está arriba.

---

## 0. Diagnóstico del estado actual (leído de `src/`, solo lectura)

Hallazgos que condicionan TODA la priorización:

1. **Sprites overworld de los 12 personajes = genéricos.** Hoy cada personaje reutiliza un sprite
   RSE cualquiera del atlas `chars` (`norman`, `gentleman`, `lass`, `hiker`, `psychic`, `pokemaniac`…).
   Ver `src/world/maps.js:318` (`alvaro_rival` → `sprite:'norman'`), `src/world/gyms.js` (líderes →
   `gentleman`/`lass`/`hiker`…). **NINGÚN personaje tiene sprite propio.** Esta es la causa directa de
   "se ven mal / no son ellos". → **Máxima prioridad.**

2. **El combate NO usa los PNG de databox ni de fondo.** `src/scenes/BattleScene.js:104-117` dibuja el
   fondo con `this.add.rectangle(...)` de color plano + elipses de `graphics`, y `src/ui/battle/databoxes.js`
   dibuja las cajas con `drawBox`/`graphics` (procedural). Los PNG `public/assets/ui/battle/healthbox_*.png`
   existen pero **NO se referencian**. → Cambiar fondo plano por PNG FRLG y cajas procedurales por PNG con
   cola es de alto impacto y bajo riesgo (aislado en battle).

3. **El mundo usa UN solo atlas empaquetado** `public/assets/tilesets/rse-tileset.png`
   (verificado **2032×800 RGBA = 127 cols × 50 filas**, índice `frame = fila*127 + col`),
   cargado en `BootScene.js:19` como spritesheet `tiles` (16×16) y consumido por
   `mapRenderer.js` vía `addTilesetImage('tiles','tiles',16,16,0,0)`. Los mapas en `maps.js`/`gyms.js`/
   `interiors.js`/`areaExtra.js` referencian índices de frame sobre ESE atlas concreto (derivado de RSE/gracidea).
   → Cualquier mejora de tileset implica **repackear celdas en ese atlas + remapear índices**. Es el trabajo
   más caro y arriesgado; va en fases medias/bajas, no primero.

4. **Retratos anime ya están en uso** (`BootScene.js:30-31` carga `portraits/anime/<id>.png`, runtime
   prefiere anime). El set actual en `public/portraits/anime/` son los 11 (sin `alex_digital`). El scope
   `portraits-cleanup` entrega esos **mismos 11 ya de-fringed** (sin halo blanco). → Swap 1:1 trivial.

5. **Audio:** `audio_manifest.json` tiene 6 BGM + 7 SFX genéricos CC0 (Juhani Junkala), que **no suenan a
   Pokémon**. Hay claves de música que el juego NO tiene aún: `gym`, `battle_gymleader`.

---

## TABLA RESUMEN DE PRIORIDAD

| # | Fase | Item | Impacto | Esfuerzo | Riesgo | Toca src/ |
|---|------|------|---------|----------|--------|-----------|
| 1 | **A** | Sprites overworld propios de los 12 personajes | ★★★★★ | ★★★☆☆ | Bajo | maps.js, gyms.js, BootScene.js, npcs atlas |
| 2 | **A** | Retratos anime de-fringed (swap 1:1) | ★★★☆☆ | ★☆☆☆☆ | Muy bajo | (ninguno, swap de PNG) |
| 3 | **A** | Databoxes FRLG con cola (PNG) | ★★★★☆ | ★★☆☆☆ | Bajo | databoxes.js, BootScene.js |
| 4 | **A** | Fondos de combate FRLG (building/grass/indoor) | ★★★★☆ | ★★☆☆☆ | Bajo | BattleScene.js, BootScene.js |
| 5 | **B** | BGM FRLG-feel + música de gym | ★★★★☆ | ★★☆☆☆ | Bajo | audio_manifest.json, BattleScene.js |
| 6 | **B** | SFX de combate y menús (cursor/hit/faint/heal) | ★★★☆☆ | ★★☆☆☆ | Bajo | audio_manifest.json, varias scenes |
| 7 | **C** | Tileset exterior/interior FRLG (repack + remap) | ★★★★★ | ★★★★★ | **Alto** | rse-tileset.png, maps.js, gyms.js, interiors.js |
| 8 | **C** | Interiores ricos (Centro Pokémon, casas, tiendas, bar) | ★★★★☆ | ★★★★☆ | Medio-Alto | interiors.js, tileset atlas |
| 9 | **D** | Landmarks de Madrid (Cibeles, Gran Vía, Alcalá…) | ★★★★☆ | ★★★★☆ | Medio | maps.js, tileset atlas |
| 10 | **D** | Contenido (puzzles de gym, objetos castizos, eventos) | ★★★☆☆ | ★★★★☆ | Medio | gyms.js, interiors.js, items, dialog |
| 11 | **E** | Mecánicas de mundo (día/noche, encuentros visibles…) | ★★★☆☆ | ★★★★☆ | Medio | WorldScene.js, nuevos módulos |

> Regla de oro: **Fase A entera no requiere tocar el atlas de tiles** y resuelve el 80% de la queja de
> Marcelino ("sprites de los personajes mal cortados / pequeños / se ven mal" + "UI de combate" + "retratos").
> Hacer A completa ANTES de meterse en C (el repack de tileset, que es el bloqueo grande).

---

# FASE A — Lo que Marcelino notará YA (sin tocar el atlas de tiles)

## A1. Sprites overworld propios de los 12 personajes  ★★★★★ / esfuerzo ★★★☆☆ / riesgo BAJO

**El item de mayor impacto del proyecto.** Hoy todos los personajes son sprites RSE genéricos; el scope
`ow-sprite-bases` aporta bases FRLG pret 1:1 que rellenan el lienzo 16×32 con arte nítido (resuelve
"pequeños/mal cortados" porque el personaje útil pasa de ~14×20 a ocupar bien el lienzo).

**Assets a usar** (`docs/refs/upgrade/ow-sprite-bases/bases/`, todos 144×32 P-mode = 9 frames de 16px,
fondo transparente, sin antialias — verificado):

| Personaje | Base 1:1 (mín. edición) | Edición |
|-----------|--------------------------|---------|
| alex_digital | `base_fat_man__alex.png` | solo recolor ropa |
| jesus_la_rata | `base_balding_man__jesus.png` | recolor |
| blanca_notarias | `base_beauty_blonde__blanca.png` | recolor |
| adrian_schizo | `base_hiker_bearded__adrian.png` | recolor |
| angel_perfeccionista | `base_scientist__angel.png` | recolor (bata) |
| alvaro_rival | `base_rival_gary__alvaro.png` | recolor |
| eduardo | `base_man_avg__eduardo_ivan.png` | camiseta marrón, sin gafas |
| ivan_fintips | `base_man_avg__eduardo_ivan.png` | polo verde + gafas 2px |
| mariel | `base_daisy_blonde__mariel.png` + `ref_mom_blonde_ponytail_3f.png` | injertar coleta rubia (caso medio) |
| sergio_guillen | base + `base_youngster.png`/banco | rapar pelo (rápido) |
| jose_antonio_casero | base masculina + banco | rapar/ajustar pelo (rápido) |
| marcelino | `base_youngster.png` (cuerpo) | afro grande + gafas redondas + piel oscura (**el más laborioso**) |

Banco de relleno extra: `docs/refs/upgrade/ow-sprite-bases/frlg-pret-raw/` (50 NPC pret nombrados, mismas
tiras 16×32). Recetas de recolor por personaje y orden de frames en
`docs/refs/upgrade/ow-sprite-bases/CATALOG.md`. Validación visual bust↔base:
`docs/refs/upgrade/ow-sprite-bases/_preview/MATCHING_bust_vs_base.png`.

**Bloqueo a resolver en src/ (no hecho en investigación):** las tiras pret están en orden pret
(9-10 frames: 3 dirs quietas + walk A/B, `right` = espejo de `left`), **NO** en el grid "4 dir × 3 frames"
que usa el atlas `chars`. Hay que **cortar/re-empaquetar** con el mapeo documentado
(`down=[3,0,6], up=[4,1,7], left=[5,2,8], right=espejo`) y meterlos en un atlas — script de corte en
CATALOG.md §1.

**Qué fichero de src/ tocar:**
- Empaquetar los 12 sprites en el atlas de personajes. Dos opciones:
  - **(recomendada)** ampliar `public/assets/sprites/chars/npcs.webp` + `npcs.json` añadiendo claves
    `marcelino_down_0`, `alvaro_rival_down_0`, etc. (el motor ya soporta esto: `Npc.js:16` hace
    `textures.get('chars').has('${def.sprite}_${dir}_0')`).
  - o cargar un spritesheet 16×32 por personaje en `src/scenes/BootScene.js` (~línea 21) y adaptar `Npc.js`.
- Cambiar el campo `sprite:` de cada personaje a su id propio en `src/world/maps.js` (línea 318+),
  `src/world/gyms.js` (líderes, líneas 147-680) y donde aparezca el resto. Marcelino (jugador) se setea en
  `src/scenes/WorldScene.js:64` (`'may_down_0'` → sprite de marcelino).

**Riesgo:** bajo — es additivo (no rompe mapas, solo cambia el sprite del NPC). El único riesgo es el
re-empaquetado del atlas (alinear frames). Empezar por los 6 "1:1 solo recolor" para validar el pipeline
antes de los casos con edición de cabeza (marcelino, mariel).

---

## A2. Retratos anime de-fringed (swap 1:1)  ★★★☆☆ / esfuerzo ★☆☆☆☆ / riesgo MUY BAJO

Quita el halo/fleco blanco que hoy se ve alrededor de los retratos anime sobre el panel de combate.

**Assets:** `docs/refs/upgrade/portraits-cleanup/anime/` (22 PNG = 11 personajes × {full, bust},
mismos nombres y dimensiones que los actuales, verificados). **NO incluye `alex_digital`** (ver A2-nota).

**Qué fichero de src/ tocar:** **ninguno de código.** Es copiar los 22 PNG sobre
`public/assets/portraits/anime/` (mismo nombre → no requiere tocar `anime.json` ni `BootScene.js`).

**Riesgo:** muy bajo (sobrescritura de PNG con mismas dimensiones).

**A2-nota — `alex_digital`:** su retrato anime NO existe en el set limpio. El scope lo marcó como
**a regenerar/upscale con IA** (la queja "se ve mal/pequeño" es de resolución, no de fondo; el PNG actual
tiene alpha correcta). Acción aparte: regenerar `alex_digital.png` + `_bust.png` anime con Stitch/IA y
luego de-fringe con `docs/refs/upgrade/portraits-cleanup/defringe.py`. El pixel-art de alex NO se toca
(está limpio; lo que parecía fondo es su ropa).

---

## A3. Databoxes FRLG con cola/pestaña (PNG)  ★★★★☆ / esfuerzo ★★☆☆☆ / riesgo BAJO

Hoy las cajas de PS se dibujan con `graphics` (`databoxes.js`) — se ven planas/"caseras". Los PNG FRLG
reensamblados ya traen la cola diagonal que Marcelino notaba como "mal cortado".

**Assets** (`docs/refs/upgrade/battleui-tail/`, verificados RGBA transparentes, paleta de 16, sin antialias):
- `healthbox_opponent_full.png` (104×32, con cola)
- `healthbox_player_full.png` (112×32, caja + cola + barra EXP incrustada)
- (`healthbox_player_boxonly.png` como variante sin EXP)

Superponer encima las barras de color existentes `public/assets/ui/battle/hpbar_{green,yellow,red}.png`
dentro de la zona crema, origen X ~+8px (enemigo) / ~+16px (jugador). Arquitectura y orden de tiles en
`docs/refs/upgrade/battleui-tail/README.md`.

**Qué fichero de src/ tocar:**
- `src/scenes/BootScene.js`: cargar `this.load.image('healthbox_opponent', ...full)` y
  `'healthbox_player'` (o copiar los `_full.png` sobre los `public/assets/ui/battle/healthbox_*.png` que ya
  existen pero están truncados sin cola).
- `src/ui/battle/databoxes.js`: reemplazar el `drawBox`/`graphics` del marco por `scene.add.image(...)` del
  PNG; mantener el texto (nombre/Nv/PS) y la barra HP de color superpuesta. **No** tocar la lógica de
  `updateHp`/`setExp`, solo el fondo visual.

**Riesgo:** bajo — cambio aislado en `databoxes.js` (149 líneas). Mantener `pixelArt:true` + escala entera
(no reescalar con suavizado o se rompen los bordes de 1px).

---

## A4. Fondos de combate FRLG (building / grass / indoor)  ★★★★☆ / esfuerzo ★★☆☆☆ / riesgo BAJO

Hoy `BattleScene.buildField()` (`BattleScene.js:104`) pinta un rectángulo verde plano + elipses. Sustituir
por los fondos pixel-perfect oficiales FRLG sube enormemente la calidad percibida del combate.

**Assets** (`docs/refs/upgrade/battle-backgrounds/backgrounds/`, todos 256×112 RGBA verificados):
- `building.png` → fondo **por defecto** (la mayoría de Madrid es calle). Confirmado en `src/battle_bg.c` de pret.
- `grass.png` → encuentros en zona verde (Retiro/parques).
- `indoor.png` → interiores/gimnasios; `cave.png` → túneles/metro.
- (resto: water/pond/sand/mountain/longgrass/underwater para casos futuros).

Escena 256×112 anclada arriba; el cuadro de diálogo cubre la franja inferior (encaja con lienzo 240×160).
Pokémon: enemigo ~(x176,y76), jugador ~(x60,y112) — coinciden con `enemyHome`/`playerHome` actuales.
No usar los `@2x` (escalar en runtime con NEAREST es igual de nítido y pesa menos). Tabla entorno→fondo y
coords en `docs/refs/upgrade/battle-backgrounds/CATALOG.md`.

**Qué fichero de src/ tocar:**
- `src/scenes/BootScene.js`: `this.load.image('battlebg_building', 'assets/.../building.png')` (+grass/indoor/cave).
  (Copiar primero los PNG a `public/assets/ui/battle/` o una carpeta `battle/bg/`.)
- `src/scenes/BattleScene.js:104` (`buildField`): reemplazar los `add.rectangle` por
  `this.add.image(0,0,'battlebg_<tipo>').setOrigin(0)`, eligiendo el tipo según el entorno del encuentro.
  Quitar las elipses `graphics` (los discos ya van horneados en el fondo) o mantenerlas si se prefiere disco
  flotante (las bases con alpha NO existen — ver bloqueo).

**Riesgo:** bajo. **Bloqueo menor:** las bases de plataforma (`bases/*.png`) **no** son sprites
transparentes (van horneadas, llevan suelo alrededor); sirven de referencia de tamaño, no de disco flotante.
Para empezar, usar el fondo completo tal cual (ya incluye los discos).

---

# FASE B — Audio (sabor FRLG inmediato, sin gameplay nuevo)

## B1. BGM FRLG-feel + música de gimnasio  ★★★★☆ / esfuerzo ★★☆☆☆ / riesgo BAJO

El audio actual (Juhani Junkala) no suena a Pokémon. El conjunto A del scope sí (Gen 3 FRLG/RSE).

**Assets** (`docs/refs/upgrade/audio-bgm/`, MP3 44.1kHz 192kbps loudnorm -16 LUFS, verificados con ffprobe;
durations sanas: `frlg_town` 64s, `frlg_gym` 44s, `frlg_battle_gymleader` 122s):
- Swap directo (renombrar al copiar): `frlg_town→town.mp3`, `frlg_route→overworld.mp3`,
  `frlg_battle_wild→battle_wild.mp3`, `frlg_battle_trainer→battle_trainer.mp3`,
  `frlg_victory_trainer→victory.mp3`, `frlg_title→title.mp3`.
- **Claves NUEVAS** (el juego hoy no tiene música de gym): `frlg_gym.mp3` + `frlg_battle_gymleader.mp3`.
- Extra: `frlg_pokecenter`, `frlg_route_alt`, 3 variantes de victoria.

**Qué fichero de src/ tocar:**
- Copiar MP3 a `public/assets/audio/`.
- `public/assets/audio/audio_manifest.json`: para swaps no hace falta tocar código si se renombra; para gym
  añadir claves `"gym"` y `"battle_gymleader"` en `music`.
- `src/scenes/BattleScene.js:82` (`playMusic(this, this.isTrainer ? 'battle_trainer' : 'battle_wild')`):
  añadir rama `playMusic(this,'battle_gymleader')` cuando el rival sea líder de gym.

**Riesgo / BLOQUEO de LICENCIA (decisión de Marcelino):** el conjunto A (`frlg_*`) **NO es CC0** — es BGM de
fan-game (Pokémon Essentials), inspirado/remixado de los juegos oficiales. **OK solo para fan-game privado
sin ánimo de lucro.** Si el juego se publica/monetiza → usar el **conjunto B** (`cc0_*`, CC0 1.0 real, en el
mismo dir; nota: el set CC0 no trae jingle de victoria adecuado). **Además:** corregir `audio_manifest.json`,
cuyo `_comment` afirma "todo CC0" — dejaría de ser cierto al meter el conjunto A.

---

## B2. SFX de combate y menús  ★★★☆☆ / esfuerzo ★★☆☆☆ / riesgo BAJO

Da feedback que hoy falta (navegar menús, acción ilegal, golpe por eficacia, debilitar, curar).

**Assets** (`docs/refs/upgrade/audio-se-me/`, 23 MP3 verificados con ffprobe):
- Alto impacto sin gameplay: `me_healing.mp3` (jingle 2.46s) para curar en Centro Pokémon (reemplaza `heal`),
  `me_badge_get.mp3` al ganar a un jefe/rival.
- Feedback de menús: `se_cursor.mp3` (mover cursor), `se_buzzer.mp3` (acción bloqueada).
- Profundidad de combate: `se_hit_weak/normal/super.mp3` por eficacia de tipo, `se_faint.mp3` al debilitar,
  `se_exp_gain.mp3` al subir la barra.
- Captura (si existe): `se_ball_throw → se_ball_shake → se_ball_click → me_pkmn_get`.

**Qué fichero de src/ tocar:** copiar MP3 a `public/assets/audio/`; registrar keys en
`audio_manifest.json` (`sfx` para SE; `music`+`{loop:false}` para ME); cablear con `sfx()`/`playMusic()` en
`src/scenes/BattleScene.js`, `src/scenes/MenuScene.js`, `src/ui/battle/menus.js`, `src/ui/shop.js`.
Tabla de uso y secuencias en `docs/refs/upgrade/audio-se-me/CATALOGO.md`.

**Riesgo / LICENCIA:** mismos avisos de B1 — varios SE/ME provienen de fan-game (no CC0). Bajo riesgo para
juego privado; decisión de Marcelino antes de publicar.

---

# FASE C — Tilesets de mundo (alto impacto, ALTO esfuerzo — el bloqueo grande)

> **Atención:** todo lo de Fase C choca con el atlas único `rse-tileset.png` (127 cols, índices
> `fila*127+col`). Cambiar tiles obliga a **repackear celdas en el atlas + reconstruir las matrices de
> índices** en `maps.js`/`gyms.js`/`interiors.js`/`areaExtra.js`. Es trabajo de src/ caro y arriesgado.
> **No empezar Fase C hasta tener Fase A entera estable.** Planificar el remapeo como tarea propia.

## C1. Tileset exterior + interior FRLG (mejor calidad base)  ★★★★★ / esfuerzo ★★★★★ / riesgo ALTO

Cubre ~80% del mundo con calidad FRLG oficial (terreno, edificios, casas) — ataca directo la queja de
"tiles que se ven mal".

**Assets recomendados** (`docs/refs/upgrade/tiles-pokefirered/game-ready/`, 128px ancho = 8 cols, RGBA,
transparentes, sin antialias, formato idéntico al spritesheet 16×16; verificados 128×1280):
- `general_metatiles_colored.png` → tileset exterior (terreno + edificios genéricos).
- `building_metatiles_colored.png` → tileset interior.
- Para identidad de gran ciudad: `celadon_city_*`, `saffron_city_*` (urbano alto), `pallet_town_*`,
  `viridian_city_*` (barrios). Otros: `mart`, `pokemon_center`, `lab`, `lavender_town`, etc.
- Reproducible: `render_metatiles.py` regenera cualquier tileset FRLG (hay 21 `raw-tiles/*.png` ya
  descargados: museum, department_store, game_corner, restaurant_hotel, school, condominiums…).

**NO usar:** `raw-tiles/*.png` (paleta gris placeholder — saldrían en escala de grises) ni
`secondary-allpal/*.png` (parciales, diagnóstico). Detalles y formato `metatiles.bin` en
`docs/refs/upgrade/tiles-pokefirered/README.md`.

**Alternativa / fuente complementaria** (`docs/refs/upgrade/tiles-gfxlib/`, 16×16 GBA puro, grid plano):
`outside-city/frlg_outside_C_city-buildings.png` (Centro Pokémon/Mart/Gym con carteles),
`outside-city/frlg_environment_fullset.png` (naturaleza/parques), suelos `*_A5_*` (grid plano usable directo).
**Ojo:** los `A1/A2/A4` de `tiles-gfxlib/_autotiles-need-conversion/` son **autotiles RPGM** — necesitan
conversión a blob 47-tiles antes de usar. Catálogo en `docs/refs/upgrade/tiles-gfxlib/README.md`.

**Qué fichero de src/ tocar:**
- Repackear las celdas elegidas dentro de `public/assets/tilesets/rse-tileset.png` en un rango de frames libre
  (mantener 127 cols), o construir un atlas combinado y ajustar `columns` en `mapRenderer.js`.
- **Reconstruir índices** en `src/world/maps.js`, `src/world/gyms.js`, `src/world/interiors.js`,
  `src/world/areaExtra.js` (cualquier cambio de tileset invalida los índices actuales).

**Riesgo:** ALTO — cambiar el PNG sin remapear rompe TODOS los mapas. Hacerlo **incremental** (un mapa/zona
a la vez), validando con screenshot (técnica Ralph-loop). Estilo: estos tiles son Kanto canónico; para
tematizar Madrid harán falta recolores/ediciones (ver Fase D).

## C2. Interiores ricos (Centro Pokémon, casas, tiendas, bar)  ★★★★☆ / esfuerzo ★★★★☆ / riesgo MEDIO-ALTO

Muebles FRLG transparentes vs interiores pobres actuales.

**Assets** (`docs/refs/upgrade/tiles-godot-interiors/` + `docs/refs/upgrade/tiles-gfxlib/inside-*`),
spritesheets 16×16 verificados:
- **Casa:** `frlg_house_objects_B/C/D_16x16.png`.
- **Centro Pokémon:** `frlg_shop_objects_B` (mesa) + `frlg_shop_objects_D` (mostrador enfermera + máquina
  curar) + `frlg_shop_objects_C` (PC). También `tiles-gfxlib/inside-buildings/frlg_buildings_B_pc-mart.png`.
- **Tienda/Mart:** `frlg_shop_objects_B` (estanterías) + `frlg_shop_objects_C` (neveras/vending).
- **Gimnasios:** `tiles-gfxlib/gyms/frlg_gyms_B/C/D_arena*.png`.
- **Bar (NO existe tileset de bar en Gen3):** componer con barras de `house_objects_C` + mostradores de
  `shop_objects_B` + mesas con comida de `house_objects_B`. Documentado en
  `docs/refs/upgrade/tiles-godot-interiors/CATALOG.md`.

**NO usar como paleta:** los `*_A2_*`/`*_A4_*` (suelos/paredes) son autotiles RMMV (atajo: recortar 1 celda
maciza). Los `godot_*_interior_16x16.png` son **habitaciones pre-renderizadas** (suelo horneado, alpha=255) —
solo referencia de layout, no atlas de objetos. Mismo aviso para
`docs/refs/godot-tilesets/pokemoncenter.png`/`house.png`.

**Qué fichero de src/ tocar:** `src/world/interiors.js` (matrices de índices de interiores) + el atlas de
tiles (repack). Preview de muebles por frame: `docs/refs/upgrade/tiles-godot-interiors/_preview_house_objects_B_grid3x.png`.

**Riesgo:** medio-alto (mismo problema de remapeo que C1, pero acotado a interiores).

---

# FASE D — Identidad Madrid + contenido (después de tener la base FRLG)

## D1. Landmarks de Madrid  ★★★★☆ / esfuerzo ★★★★☆ / riesgo MEDIO

Da el "no es Kanto, es Madrid" que pide el concepto.

**Assets** (`docs/refs/upgrade/madrid-landmarks/tiles/`, RGBA alineados 16px, NEAREST sin antialias, verificados):
- **Integrar primero (más limpios):** `COMPO_cibeles_fountain_48x80.png` (drop directo 48×80) y Gran Vía =
  `frlg_glass_tower_32x80.png` + `frlg_gold_mansion_48x64.png` + `frlg_ornate_lamppost_16x48.png` en hilera.
- Retiro: `COMPO_retiro_estanque_96x64.png` (+ piezas sueltas `frlgD_fountain_round_48` y
  `frlgD_marble_monument_32x48` para z-index correcto si el jugador pasa por detrás).
- Metro: `COMPO_metro_sign_16x32.png`, `COMPO_metro_stairs_32x16.png`, `frlg_metro_garage_48x64.png`.
- Bocetos placeholder (dibujos originales, no rip): `COMPO_puerta_alcala_sketch_80x64.png`,
  `COMPO_bernabeu_sketch_96x64.png` (mejorables con Stitch a calidad AAA).

**Qué fichero de src/ tocar:** colocar como piezas/capas en los mapas urbanos de `src/world/maps.js`
(montar Gran Vía como capa de mapa, no como un PNG gigante). Requiere meter las celdas en el atlas (Fase C).

**Riesgo:** medio. **Avisos** (`docs/refs/upgrade/madrid-landmarks/CATALOG.md`): nombres de la lib
pokecommunity están INVERTIDOS (fiarse de los previews, no de los nombres);
`frlg_granite_arch_unit_48x32.png` lleva píxeles de muro azul pegados (limpieza manual para Alcalá fiel);
faltan tiles directos de Banco de España/Metrópolis/oso-y-madroño (documentados, no construidos).

## D2. Contenido (puzzles de gym, objetos castizos, eventos, NPCs)  ★★★☆☆ / esfuerzo ★★★★☆ / riesgo MEDIO

No hay assets binarios — es diseño narrativo aterrizado al lore real (`docs/refs/upgrade/content-ideas/CONTENT.md`).
Los 8 gimnasios ya existen como salas-caja sin reto (`src/world/gyms.js`). Prioridad interna:
1. **Puzzles de gimnasio** (§1): reusan tiles/signs/warps/NPCs que el motor ya soporta. 7/8 son [LISTO].
2. **Objetos castizos** (§2): re-skins baratos de items Gen 1 (caña con bravas=Potion, cocido=Full Restore,
   cubata-bola=Ultra Ball) → llenan la tienda de sabor local sin sistemas nuevos.
3. **Eventos E1/E2/E3** (§4): flags + diálogos anclados a anécdotas reales (Llave de la Estación, casero
   José Antonio bloquea día 1, Álvaro rival intercepta).
4. **NPCs de ambiente + secretos** (§3, §5): diálogos + signs, coste casi nulo.

**Qué fichero de src/ tocar:** `src/world/gyms.js`, `src/world/interiors.js`, sistema de items, `DialogScene.js`.
**Bloqueo:** zonas nuevas (Pueblo de Bercero, Torre Deloitte, casino, Faunia) requieren MAPAS NUEVOS — coste
alto, post-MVP. Coords/balance no fijados (ajustar contra colisión real).

---

# FASE E — Mecánicas de mundo (atmósfera y agencia)

No hay assets (`docs/refs/upgrade/mechanics-essentials/MECHANICS.md`). El combate ya es fiel a Gen 3; el ROI
está en el MUNDO:
- **Día/Noche** con tinte horario (tabla `HOURLY_TONES[24]` como overlay MULTIPLY a pantalla completa,
  reloj acelerado): impacto visual ★★★★★, esfuerzo ★★☆☆☆. → `src/scenes/WorldScene.js` + módulo nuevo.
- **Repelente** (~20 líneas en `maybeEncounter()` de WorldScene + 3 items): QoL trivial.
- **Diálogo de "olvidar movimiento"** al aprender el 5º (hoy `monster.js:learnMove` lo descarta en silencio).
- **Encuentros visibles** + **Pokémon que te sigue** (Tier S): **BLOQUEADOS por falta de sprites overworld de
  Pokémon** (no están en ningún scope descargado) — dependen de conseguir esos sprites primero.

**Riesgo:** medio. **Nota de código:** `battle.js` ya tiene 566 líneas (límite 800 de las reglas) — extraer
weather/efectos nuevos a submódulos.

---

## Orden de ejecución recomendado (1 línea)

**A1 → A2 → A3 → A4** (resuelven la queja de Marcelino sin tocar el atlas) → **B1 → B2** (audio, decisión de
licencia) → **C1 → C2** (el bloqueo grande: repack de atlas + remapeo, incremental con screenshots) →
**D1 → D2** (Madrid + contenido) → **E** (atmósfera/mecánicas).

## Notas transversales de render (config, no asset)
- Mantener `pixelArt:true` + **escala entera** del lienzo 240×160. La escala FIT actual puede interpolar y
  "ensuciar" los bordes de 1px; preferir zoom entero. Esto, combinado con A1+A3+A4, es lo que hace que todo
  "se vea grande y nítido" como pide Marcelino.
- Nunca reescalar UI/sprites con suavizado (rompe la paleta FRLG de 16 colores).

## Licencias (revisar antes de cualquier publicación/monetización)
Tiles FRLG (pret/gfxlib), sprites overworld, fondos de combate, databoxes y BGM/SFX del conjunto A son
**rips/fan-content de FireRed/LeafGreen (Game Freak/Nintendo)**: OK para juego interno fan privado, **NO** para
uso comercial. Para audio existe alternativa CC0 real (conjunto B). Para gráficos comerciales habría que
reemplazar por arte original (Stitch/IA). Corregir el `_comment` "todo CC0" de `audio_manifest.json` si se
integra el conjunto A.
