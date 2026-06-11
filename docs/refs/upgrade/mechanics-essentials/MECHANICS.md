# Mecánicas portables desde Pokémon Essentials → Pokémon Piso (Phaser)

> Scope: **mechanics-essentials**. Análisis de mecánicas y features de
> [Maruno17/pokemon-essentials](https://github.com/Maruno17/pokemon-essentials) (motor base v20+)
> y [omanoloneto/pokemon-essentials-enhanced-v20.1](https://github.com/omanoloneto/pokemon-essentials-enhanced-v20.1)
> (Plugins) para portar a nuestro juego Phaser 3.
>
> **SOLO ANÁLISIS — sin código, sin tocar `src/`.** Las rutas de Essentials son
> de referencia conceptual (Ruby/RMXP); todo se re-implementaría a mano en JS.
>
> Fecha: 2026-06-11

---

## 0. Qué YA tenemos (auditoría del estado actual)

Antes de recomendar nada, mapeo lo que el juego ya implementa (leído de `src/`):

| Sistema | Estado actual | Archivo |
|---|---|---|
| Stats Gen 3 (sin EV/naturaleza) | ✅ | `src/core/formulas.js` |
| IVs 0-31 aleatorios | ✅ | `src/core/monster.js`, `formulas.js` |
| Curvas de experiencia (6 growth rates oficiales) | ✅ | `formulas.js: expForLevel` |
| Daño Gen 3 (STAB, crítico, quemadura, type chart, roll 85-100) | ✅ | `formulas.js: damage` |
| Captura Gen 3 con sacudidas + bonus de estado | ✅ | `formulas.js: captureChance` |
| Estados: par/psn/brn/slp/frz + inmunidades por tipo | ✅ | `battle.js` |
| Stat stages -6..+6 (atk/def/spa/spd/spe + precisión/evasión) | ✅ | `formulas.js`, `battle.js` |
| Combate por turnos: cambiar, objetos, huir, flinch, sleep, drain, recoil | ✅ | `battle.js` (566 líneas) |
| Subir nivel encadenado + aprender movimientos (sin diálogo de olvido) | ✅ | `monster.js: gainExp` |
| Evolución por nivel | ✅ | `monster.js: evolve` |
| Shiny (1/8192) | ✅ | `monster.js` |
| Correr (B) y moto/bici | ✅ | `WorldScene.js` (RUN_FACTOR, BIKE_FACTOR) |
| Encuentros por hierba ponderados | ✅ | `world/engine/encounters.js` |
| 273 movimientos con ailment/class/target/drain/healing/flinch | ✅ | `data/moves.json` |
| 151 especies con learnset/evolución/captureRate/growthRate | ✅ | `data/pokedex.json` |

**Conclusión:** el motor de combate ya es sólido (Gen 3 fiel). Las mecánicas de
mayor valor **NO están en el combate** sino en el **mundo** (atmósfera, descubrimiento,
progresión secundaria) y en pequeños refinamientos de combate. El bloqueo de
Marcelino es visual, pero estas mecánicas suman *profundidad percibida* a bajo coste.

---

## 1. Tier S — Máximo impacto / Bajo-Medio esfuerzo (PORTAR PRIMERO)

### 1.1 Día / Noche (con efecto de tinte horario)
- **Qué hace:** El mundo se tinta según la hora (amanecer cálido, día neutro,
  atardecer naranja, noche azul). Esto cambia la *sensación* del juego radicalmente
  sin tocar arte. Habilita además encuentros y eventos condicionados por hora.
- **Fuente Essentials:** `Data/Scripts/012_Overworld/003_Overworld_Time.rb`
  (`PBDayNight`, tabla `HOURLY_TONES[24]` de `Tone(r,g,b,gray)`, interpolación por minuto).
  Plugin alternativo: `Plugins/Unreal Time System/001_unreal_time_system.rb`
  (tiempo acelerado independiente del reloj real: `TIME_SPEED`, 1 seg real = N seg juego;
  ideal para que el ciclo se vea en una sesión corta).
- **Cómo portar a Phaser:**
  - Reusar la tabla `HOURLY_TONES` casi tal cual (24 entradas r/g/b/gray).
  - Aplicar como un overlay rectángulo a pantalla completa con `blendMode` MULTIPLY/SCREEN,
    o usar `camera.setTint` / un pipeline de post-proceso. El "gray" → desaturación
    (pipeline de saturación) o ignorar en MVP.
  - **Decisión clave:** o reloj real (`new Date().getHours()`) o reloj acelerado
    estilo Unreal Time (recomendado: acelerado, ~1 día de juego = 24 min reales,
    para que se vea el ciclo). Guardar offset de tiempo en el save.
  - Solo en mapas "outdoor" (añadir flag `outdoor: true` a `maps.js`).
- **Diversión:** ★★★★★ — transforma la atmósfera; sinergia con Madrid (Gran Vía de noche).
- **Esfuerzo:** ★★☆☆☆ (Medio-bajo). La tabla de tonos viene hecha; lo único nuevo
  es el overlay Phaser + persistencia del reloj.
- **Dependencias:** ninguna nueva. Sinergiza con 2.1 (encuentros por hora).

### 1.2 Encuentros salvajes VISIBLES en el overworld (estilo Let's Go / SwSh)
- **Qué hace:** Los Pokémon salvajes aparecen como sprites caminando por el mapa.
  Caminas hacia uno para iniciar combate, o lo rodeas para evitarlo. Reproduce el
  cry al aparecer; despawn tras N pasos. **Elimina el RNG ciego** de la hierba y da
  agencia al jugador.
- **Fuente Essentials:** `Plugins/Visible Overworld Wild Encounters - Script/001_*.rb`
  (derFischae). Add-ons: `Aggressive Encounters` (te persiguen si te acercas),
  `Fixed Spawn Probability`, `Ditto Transform`.
- **Cómo portar a Phaser:**
  - Ya tenemos `pickWeighted` + `rollEncounter` (encounters.js) y un sistema de NPCs
    (`world/engine/Npc.js`) con grid movement. Un "encuentro visible" es un NPC
    especial con sprite de Pokémon overworld que: (a) spawnea en tiles válidos cerca
    del jugador, (b) hace wander/roam, (c) al colisionar con el jugador → `BattleScene`,
    (d) despawnea tras X pasos o si sale del rango.
  - Requiere **sprites overworld de Pokémon** (los del pack FRLG/gfxlib del otro scope).
  - Aggressive variant: si el jugador entra en radio R, el sprite persigue (chase AI simple).
- **Diversión:** ★★★★★ — moderno, da control, y luce muchísimo en pantalla.
- **Esfuerzo:** ★★★☆☆ (Medio). La IA de spawn/roam/despawn es trabajo nuevo en JS,
  pero se apoya 100% en el sistema de NPC/grid existente. El cuello de botella es
  **tener sprites overworld de los Pokémon** (depende del scope de assets).
- **Dependencias:** sprites overworld de Pokémon (otro scope). Sinergia con 1.1.

### 1.3 Repelente (Repel)
- **Qué hace:** Item que bloquea encuentros con salvajes de nivel inferior al del
  líder del equipo durante N pasos. QoL enorme para travesía/grinding.
- **Fuente Essentials:** lógica en `001_Settings.rb` (`REPEL_COUNTS_FAINTED_POKEMON`)
  + efecto en `Data/Scripts/013_Items/002_Item_Effects.rb` (item Repel/Super Repel/Max Repel);
  el contador se lee en `002_Battle triggering` antes de tirar encuentro.
- **Cómo portar a Phaser:**
  - Añadir `repelSteps` al estado del jugador. En `maybeEncounter()` de `WorldScene`:
    si `repelSteps > 0`, decrementar y comparar nivel del salvaje vs nivel del líder;
    abortar el encuentro si es menor. Diálogo "El efecto del repelente se ha agotado".
  - Items repel-30/repel-100/repel-200 en la tienda (`ui/shop.js` ya existe).
- **Diversión:** ★★★☆☆ (es QoL, no "fun" directo, pero muy valorado).
- **Esfuerzo:** ★☆☆☆☆ (Trivial). ~20 líneas en el loop de encuentro + 3 items.
- **Dependencias:** ninguna.

### 1.4 Pokémon que te sigue (Following Pokémon)
- **Qué hace:** El primer Pokémon del equipo camina detrás del jugador en el overworld.
  Carisma puro, vínculo emocional, y "vende" el juego en un screenshot.
- **Fuente Essentials:** `Plugins/Following Pokemon EX/` (Main Module, Configuration,
  Script Additions). Maneja sprite, pathing (sigue las últimas posiciones del jugador),
  y interacción al hablarle.
- **Cómo portar a Phaser:**
  - Buffer de las últimas posiciones del jugador (cola de tiles); el sprite del
    follower lee la posición de hace N tiles → movimiento suave detrás.
  - Reusar `GridMover` para animar el follower con el mismo tween.
  - Requiere **sprites overworld de los Pokémon** (mismo asset que 1.2).
- **Diversión:** ★★★★☆ — alto valor de carisma/marketing, encaja con el tono "amigos".
- **Esfuerzo:** ★★☆☆☆ (Medio-bajo). El pathing por buffer de posiciones es sencillo
  con `GridMover`. El bloqueo real son los sprites overworld.
- **Dependencias:** sprites overworld de Pokémon (otro scope). Idealmente hacerlo
  junto con 1.2 (mismo set de assets).

---

## 2. Tier A — Buen impacto / Bajo-Medio esfuerzo

### 2.1 Encuentros condicionados por hora del día
- **Qué hace:** Algunas especies solo aparecen de día, otras de noche/amanecer.
  Aumenta la rejugabilidad y el descubrimiento ("¿qué sale de noche en Malasaña?").
- **Fuente:** En Essentials, `encounters.txt` define `Land`, `LandNight`, `LandMorning`,
  `LandDay`, `Water`, `Cave`, `OldRod`, `GoodRod`, `SuperRod`, etc. El selector
  (`002_Battle triggering`) elige la lista según `PBDayNight.isDay?/isNight?/isMorning?`.
- **Cómo portar:** Extender el formato `encounters` de `maps.js` con un campo `time`
  opcional (`'day'|'night'|'morning'|'any'`) por entrada, y filtrar en `pickWeighted`
  según la hora actual. ~15 líneas.
- **Diversión:** ★★★★☆ (con 1.1 ya hecho).
- **Esfuerzo:** ★★☆☆☆ (Bajo, pero **requiere 1.1** Día/Noche primero).
- **Dependencias:** 1.1.

### 2.2 Pesca (Fishing) con caña + minijuego de reflejos
- **Qué hace:** Con una caña en zonas de agua, animación de espera ("..."), un
  "¡Pica algo!" y el jugador pulsa A a tiempo para enganchar → combate con Pokémon
  de agua. Old/Good/Super Rod cambian `biteChance` (45/70/95%).
- **Fuente Essentials:** `Data/Scripts/012_Overworld/005_Overworld_Fishing.rb`
  (`pbFishing`, `pbWaitForInput` con ventana de reflejo). Listas `OldRod/GoodRod/SuperRod`
  en encounters.
- **Cómo portar a Phaser:**
  - Ya hay tiles de agua (`WATER = 4183` en `maps.js`) y un NPC pescador que lo menciona.
  - Al pulsar A frente a un tile de agua con caña en la bolsa → DialogScene con la
    secuencia de puntos + ventana de input (timer Phaser). Acierto → `rollEncounter`
    con la lista de pesca → BattleScene.
  - Items: old-rod/good-rod/super-rod + listas de encuentro de agua por mapa.
- **Diversión:** ★★★★☆ — minijuego con skill, contenido nuevo de captura.
- **Esfuerzo:** ★★★☆☆ (Medio). La máquina de estados del minijuego + integrar
  con el sistema de encuentros. Lógica clara y bien acotada.
- **Dependencias:** listas de encuentro de agua (datos), sprite de caña/animación (menor).

### 2.3 Pokérus
- **Qué hace:** "Virus" raro (3/65536) que un salvaje puede portar; duplica la
  ganancia de EVs y se contagia en el equipo. Coleccionable/easter-egg que los
  fans reconocen al instante.
- **Fuente:** `001_Settings.rb` (`POKERUS_CHANCE = 3`). En nuestro caso **no hay EVs**,
  así que aquí sería puramente cosmético/coleccionable o un x1.5 a la EXP mientras dure.
- **Cómo portar:** flag `pokerus` en la instancia al crear salvaje (3/65536); icono
  en el resumen; contagio simple al equipo cada noche. Sin EVs → darle como bonus
  un +50% EXP temporal para que tenga efecto real.
- **Diversión:** ★★★☆☆ (nicho, pero los fans lo aman).
- **Esfuerzo:** ★★☆☆☆ (Bajo). Sin EVs el efecto hay que redefinirlo (decisión de diseño).
- **Dependencias:** ninguna técnica; sí una decisión de diseño (qué hace sin EVs).

### 2.4 Diálogo de "olvidar movimiento" al aprender el 5º
- **Qué hace:** Cuando un Pokémon va a aprender un 5º movimiento, te **pregunta**
  cuál olvidar (hoy se descarta el más antiguo en silencio: ver `monster.js:learnMove`
  "MVP: sin diálogo de olvido").
- **Fuente:** comportamiento estándar Essentials (`pbLearnMove`).
- **Cómo portar:** En `gainExp`, cuando `inst.moves.length >= 4`, emitir un evento que
  `BattleScene`/`MenuScene` capture para abrir un submenú de selección (la UI de menú
  ya existe). Si cancela, no aprende.
- **Diversión:** ★★★★☆ — es una mecánica *core* que hoy falta y se nota; da control
  estratégico sobre el moveset.
- **Esfuerzo:** ★★☆☆☆ (Bajo-medio). Lógica trivial; el trabajo es la UI de selección
  (reutilizable de los menús existentes).
- **Dependencias:** ninguna. **Recomendado alto** porque corrige una carencia visible.

### 2.5 Naturalezas (Natures)
- **Qué hace:** 25 naturalezas que dan +10%/-10% a dos stats. Profundidad de
  crianza/colección y variedad entre individuos de la misma especie.
- **Fuente:** Gen 3 estándar; en Essentials `Data/Scripts/014_Pokemon`. Fórmula:
  `stat = floor(base_stat * nature_mult)` tras el cálculo normal.
- **Cómo portar:** asignar `nature` aleatoria al crear, tabla de 25 (stat+/stat-),
  multiplicar en `calcStats` (formulas.js ya es el único punto de cálculo). Mostrar
  en resumen con color (subida roja / bajada azul).
- **Diversión:** ★★★☆☆ (profundidad, pero invisible para casual).
- **Esfuerzo:** ★★☆☆☆ (Bajo). Tabla + un multiplicador en `calcStats`.
- **Dependencias:** ninguna. Sinergia natural con 2.3/IV display.

---

## 3. Tier B — Impacto medio o esfuerzo alto

### 3.1 Sistema de misiones / Quests
- **Qué hace:** Registro de misiones (activas/completadas) con objetivos y recompensas;
  da estructura y dirección al juego. Encaja perfecto con la premisa "amigos de
  Marcelino" como dadores de misiones.
- **Fuente Essentials:** `Plugins/RealQuestSystem/` (000_settings, 001_quest_classes,
  002_quest_system, 003_quest_list_scene, 004_quest_selection_scene).
- **Cómo portar:** modelo de datos de quests (id, estado, pasos, recompensa) + una
  escena/menú nuevos + hooks en eventos (hablar con NPC, capturar X, derrotar líder).
  Se puede empezar minimalista (lista lineal de tareas).
- **Diversión:** ★★★★☆ (da propósito; gran fit narrativo con los personajes).
- **Esfuerzo:** ★★★★☆ (Alto). Escena nueva + sistema de eventos/triggers + persistencia.
  Es una feature de producto, no un parche.
- **Dependencias:** UI/escena nueva. Hacer después de los Tier S/A.

### 3.2 Climatología en combate (Weather)
- **Qué hace:** Sol/lluvia/tormenta de arena/granizo que modifican daño por tipo,
  precisión y dan daño residual. Profundidad táctica.
- **Fuente:** `011_Battle` (battler weather). **No** tenemos nada de weather en
  `battle.js` hoy.
- **Cómo portar:** añadir estado `weather` al combate, multiplicadores en `damage`
  (sol x1.5 fuego / x0.5 agua, etc.), daño de fin de turno (arena/granizo), y overlay
  visual. Movimientos como Danza Lluvia/Día Soleado lo activan.
- **Diversión:** ★★★☆☆ (para quien busca táctica; casual no lo nota mucho).
- **Esfuerzo:** ★★★☆☆ (Medio). El motor de daño está centralizado (fácil de hinchar),
  pero hay que tocar muchas ramas (movimientos, fin de turno, UI).
- **Dependencias:** ninguna dura. Riesgo de regresión en `battle.js` (testear bien).

### 3.3 Bayas / Berry Plants (plantar y recolectar)
- **Qué hace:** Plantas bayas en tierra blanda, crecen con el tiempo real/regado,
  recolectas frutos (curación, bonus). Loop de recurso pasivo.
- **Fuente Essentials:** `Data/Scripts/012_Overworld/006_Overworld_BerryPlants.rb`
  (`BerryPlantData`: growth_stage, time_alive, watering — mecánica Gen 3 con regado).
- **Cómo portar:** estado de macetas por mapa (tile especial), crecimiento por
  hora/pasos, item baya al recolectar. Requiere items de baya y su efecto (ya tenemos
  estructura de items en bolsa/combate).
- **Diversión:** ★★★☆☆ (loop secundario agradable, no esencial).
- **Esfuerzo:** ★★★☆☆ (Medio). Persistencia de estado de plantas + tiles
  interactivos + items nuevos.
- **Dependencias:** items de baya + idealmente el reloj de 1.1.

### 3.4 EVs simplificados
- **Qué hace:** Esfuerzos que suben con cada combate y refinan stats al final.
- **Fuente:** Gen 3 estándar (`DISABLE_IVS_AND_EVS` en Settings lo apaga; hoy estamos
  efectivamente sin EVs).
- **Cómo portar:** acumular EVs por especie derrotada (cap 252/stat, 510 total),
  sumar `floor(ev/4)` en `calcStats`. Invisible salvo para min-maxers.
- **Diversión:** ★★☆☆☆ (poco perceptible; complica el balance).
- **Esfuerzo:** ★★★☆☆ (Medio, sobre todo por re-balancear).
- **Dependencias:** ninguna. **Baja prioridad** (poco ROI de diversión).

---

## 4. Tier C — Descartar para este juego (alto esfuerzo / bajo fit)

| Mecánica | Por qué descartar (por ahora) |
|---|---|
| **Day Care / Cría / Huevos** (`007_Overworld_DayCare.rb`) | Sistema enorme (herencia de IVs/naturaleza/movimientos huevo, método Masuda, contador de pasos para eclosionar). Esfuerzo ★★★★★, fit medio. Solo si el juego crece mucho. |
| **Habilidades (Abilities)** | Cientos de casos especiales tocando todo el motor de combate y overworld. Esfuerzo ★★★★★. Re-implementar es un proyecto en sí. |
| **Pokémon errantes (Roaming)** | Requiere mapa-mundo grande y tracking entre mapas; nuestro mundo (Madrid) es pequeño. Bajo fit. |
| **Bug-Catching Contest / Battle Tower / Minijuegos** (`017_Minigames`, `018_Alternate battle modes`) | Contenido de endgame; prematuro. |
| **Movimientos de campo HM (Cut/Surf/Fly/Strength…) con badges** | Surf/Fly tienen valor, pero implican lógica de campo + sprites + gating por medallas. Medio-alto esfuerzo; valorar Surf aislado más adelante para zonas de agua. |
| **Phone / rematches** (`004_Item_Phone.rb`) | QoL de juego largo; innecesario para el scope actual. |

> **Nota sobre Surf:** de los movimientos de campo, **Surf** es el único con buen
> ROI (abre el agua que ya existe en los mapas como zona explorable + encuentros de
> agua). Si en el futuro se quiere agua jugable, Surf > resto de HMs. Esfuerzo ★★★☆☆.

---

## 5. Roadmap recomendado (por impacto visual/diversión y dependencias)

**Fase 1 — Atmósfera y agencia (lo que más "se ve" y se siente):**
1. **Día/Noche con tinte** (1.1) — transforma el look; base para más cosas.
2. **Repelente** (1.3) — trivial, QoL inmediata.
3. **Diálogo de olvidar movimiento** (2.4) — corrige carencia core visible.

**Fase 2 — Descubrimiento (requiere assets overworld de Pokémon):**
4. **Encuentros visibles en overworld** (1.2) — moderno, lucidísimo.
5. **Pokémon que te sigue** (1.4) — carisma/marketing (mismo asset que 4).
6. **Encuentros por hora** (2.1) — barato una vez hecho 1.1.

**Fase 3 — Contenido y profundidad:**
7. **Pesca** (2.2) — minijuego + capturas de agua.
8. **Naturalezas** (2.5) + **Pokérus** (2.3) — coleccionismo/profundidad barata.
9. **Quests** (3.1) — propósito narrativo con los personajes.

**Más adelante / opcional:** Weather (3.2), Bayas (3.3), Surf, EVs.

---

## 6. Notas de portabilidad (importante para quien implemente)

- **Todo el cálculo de stats pasa por `formulas.js: calcStats`** → naturalezas y EVs
  se inyectan ahí en un solo punto (bajo riesgo).
- **`battle.js` (566 líneas) ya está cerca del límite de 800** de las reglas. Weather
  y efectos nuevos conviene extraerlos a módulos (`battle/weather.js`, etc.) para no
  pasarse.
- **`monster.js: gainExp`** ya emite eventos (`levelup`, `learn`) → el diálogo de
  olvido encaja extendiendo ese flujo de eventos, sin reescribir.
- **Reloj de tiempo:** decidir *real vs acelerado* condiciona 1.1, 2.1, 3.3. Recomendado
  **acelerado** (estilo Unreal Time) para que el ciclo se aprecie en una partida corta;
  persistir el offset en el save (`SAVE_VERSION` ya existe).
- **Los sprites overworld de Pokémon** son el bloqueo común de 1.2 y 1.4 — coordinar
  con el scope de assets (FRLG/gfxlib) antes de programar esas dos.
- Las rutas de Essentials citadas son **Ruby/RMXP**: sirven como *especificación de
  comportamiento y constantes* (p.ej. `HOURLY_TONES`, `biteChance` de pesca,
  `POKERUS_CHANCE`), no como código copiable.

---

## 7. Fuentes consultadas (GitHub, vía `gh api`, sin clonar)

- **Maruno17/pokemon-essentials** (motor base):
  - `Data/Scripts/001_Settings.rb` (feature flags: shiny, pokerus, repel, badges, daycare)
  - `Data/Scripts/012_Overworld/003_Overworld_Time.rb` (día/noche, HOURLY_TONES)
  - `Data/Scripts/012_Overworld/005_Overworld_Fishing.rb` (pesca + minijuego)
  - `Data/Scripts/012_Overworld/006_Overworld_BerryPlants.rb` (bayas Gen 3)
  - `Data/Scripts/012_Overworld/007_Overworld_DayCare.rb` (cría/huevos)
  - Árbol de `Data/Scripts/` (011_Battle, 013_Items, 014_Pokemon) para ubicar mecánicas.
- **omanoloneto/pokemon-essentials-enhanced-v20.1** (Plugins):
  - `Plugins/Visible Overworld Wild Encounters - Script/` (encuentros visibles + add-ons)
  - `Plugins/Aggressive Encounters - Overworld Encounters Add On/` (persecución)
  - `Plugins/Unreal Time System/` (reloj acelerado independiente del real)
  - `Plugins/Following Pokemon EX/` (Pokémon que sigue)
  - `Plugins/RealQuestSystem/` (misiones)
  - `Plugins/Enhanced UI/` (resúmenes/UI de combate mejorados — referencia visual)
