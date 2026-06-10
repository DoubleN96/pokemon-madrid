# CONTRATOS ENTRE MÓDULOS — Pokemon Madrid MVP

Documento normativo. Cada módulo tiene UN dueño. Nadie toca archivos de otro módulo.
Stack: **Phaser 3.90** + Vite + vanilla JS (ESM, sin TypeScript). Resolución nativa 240×160, zoom 3, `pixelArt: true`.

## Escenas y flujo

```
Boot → Title (login/registro/invitado + Continuar/Nueva partida)
     → Intro (solo nueva partida: profesor + elección de inicial) → World
     → World ⇄ Battle (overlay, World duerme)
     World + tecla MENU → Menu (overlay: Equipo, Mochila, Pokédex, Guardar, Salir)
     Diálogos: DialogScene (overlay reutilizable, lanzada por cualquier escena)
```

Claves de escena: `Boot`, `Title`, `Intro`, `World`, `Battle`, `Menu`, `Dialog` (ya registradas en `src/main.js` — NO tocar main.js).

## Input (global, ya decidido)

- Flechas / WASD: movimiento
- `Z` o `Espacio` = botón A (interactuar / confirmar)
- `X` o `Shift` = botón B (cancelar / correr manteniendo)
- `Enter` = abrir Menu en World; en menús = confirmar

## Registry global (this.registry)

- `pokedex`: array 151 especies (ya cargado en Boot)
- `movesData`: objeto {slug → move} (ya cargado en Boot)
- `save`: SaveState actual en memoria (lo crea Title/Intro, lo muta World/Battle/Menu)
- `session`: sesión supabase o null (invitado)

## Formas de datos (YA GENERADAS, no cambiar)

### Especie (src/data/pokedex.json, array índice = id-1)
```js
{ id: 1, name: "Bulbasaur", slug: "bulbasaur", types: ["grass","poison"],
  stats: { hp, atk, def, spa, spd, spe }, baseExp, captureRate, growthRate,
  genus, flavor, learnset: [{ move: "tackle", level: 1 }...],  // ordenado por nivel
  evolution: { to: 2, level: 16 } | null }
```

### Movimiento (src/data/moves.json, clave = slug inglés)
```js
{ name: "Placaje" /* español */, type: "normal", power: 35|null, accuracy: 95|null,
  pp: 35, priority: 0, class: "physical"|"special"|"status",
  ailment: "paralysis"|null, ailmentChance: 0, statChanges: [{stat:"attack",change:-1}],
  statChance: 0, target: "selected-pokemon"|"user"|..., drain: 0, healing: 0,
  flinchChance: 0, effectChance: null, desc: "..." }
```
Gen 3: físico/especial viene por el campo `class` (no por tipo). Tipos sin hada (Gen 3, 17 tipos).

### Instancia de monstruo (equipo / salvaje)
```js
{ species: 25, level: 7, exp: 343, ivs: {hp,atk,def,spa,spd,spe}, // 0-31
  currentHp: 22, status: null|"par"|"psn"|"brn"|"slp"|"frz", sleepTurns: 0,
  moves: [{ id: "thunder-shock", pp: 30, maxPp: 30 }], // máx 4
  nickname: null, shiny: false }
```
Stats reales se calculan con `calcStats(speciesData, instance)` de core (fórmula Gen 3 sin naturalezas, EVs=0 en MVP).

### SaveState
```js
{ version: 1, player: { name: "ROJO", map: "tetuan", x: 14, y: 20, dir: "down", money: 3000 },
  party: [MonsterInstance...], bag: { "poke-ball": 5, "potion": 3, "antidote": 0 },
  pokedex: { seen: [ids], caught: [ids] }, flags: { introDone: true, ... }, playTimeS: 0 }
```

## Módulo A — Núcleo de combate (PURO, sin Phaser) — `src/core/`

- `src/core/typechart.js`: export `effectiveness(moveType, defTypes) → 0|0.25|0.5|1|2|4` (tabla Gen 3).
- `src/core/formulas.js`: `calcStats(species, inst)`, `expForLevel(growthRate, level)`, `expGain(enemySpecies, enemyLevel, participants=1)`, `damage({attacker, defender, attackerSpecies, defenderSpecies, move, crit}) → {dmg, effectiveness, crit}` (Gen 3: STAB 1.5, random 0.85-1, crítico 1/16 ×2, quemado mitad atk físico, pantallas no), `captureChance(species, inst, ballBonus, statusBonus)` (fórmula Gen 3, devuelve {caught, shakes}).
- `src/core/monster.js`: `createMonster(pokedex, speciesId, level)` (IVs aleatorios, moves = últimos 4 del learnset ≤ level, exp = expForLevel), `gainExp(inst, amount) → eventos de subida` (level-up, movimientos nuevos [reemplazo automático del más antiguo si >4 en MVP], evolución pendiente), `evolve(inst)`, `healFull(inst)`.
- `src/core/battle.js`: máquina de turnos para combate salvaje Y contra entrenador:
```js
createBattle({ pokedex, movesData, party, enemyParty, isTrainer, bag })
battle.state() → { phase, active, enemy, party, canRun... }
battle.act({ type: "move", index } | { type: "switch", index } | { type: "item", item: "poke-ball"|"potion"|"antidote", target? } | { type: "run" })
  → { events: [...], over: false|{ result: "win"|"lose"|"caught"|"ran", expReports?, caughtMonster? } }
```
Eventos (para que la UI los anime en orden):
`{t:"text",msg}`, `{t:"move",side:"player"|"enemy",moveName}`, `{t:"hp",side,from,to,max}`,
`{t:"eff",mult}`, `{t:"crit"}`, `{t:"miss"}`, `{t:"status",side,status}`, `{t:"stat",side,stat,change}`,
`{t:"faint",side}`, `{t:"exp",amount}`, `{t:"levelup",level,newStats}`, `{t:"learn",moveName}`,
`{t:"ball",shakes,caught}`, `{t:"switch",side,monster}`, `{t:"end",result}`
IA enemiga: pondera daño estimado, 20% aleatorio. Estados: par (25% no actúa, spe×0.25), psn/brn (1/8 y 1/16 al final de turno, brn atk físico ×0.5), slp (1-4 turnos), frz (20% descongela). Stat stages -6..+6 multiplicadores Gen 3.

## Módulo B — WorldScene — `src/scenes/WorldScene.js` + `src/world/engine/`

- Consume mapas del formato del Módulo E vía `import { MAPS } from '../world/maps.js'`.
- Render: 3 capas tile (ground, deco, overhead) con `this.make.tilemap({data, ...})` o `putTileAt`; overhead con depth > jugador. Tileset = spritesheet key `tiles` (frames 16×16, índice = fila*127+col, la imagen reempaquetada es 2032×800 → **127 columnas × 50 filas** (el original de gracidea traía margin/spacing y se reempaquetó)).
- Jugador: sprite atlas `chars` frames `may_<dir>_<0|1|2>`, anims `may_walk_<dir>` (ya creadas en Boot). Movimiento por grid (tile a tile, WALK_MS de config, correr con B = ×0.6). Colisión contra `collision[y][x]`, NPCs y bordes.
- Hierba alta (`tallGrass[y][x]`): cada paso tira `ENCOUNTER_RATE`; si toca → elegir especie por pesos de `encounters` → `this.scene.sleep('World'); this.scene.launch('Battle', {wild: inst, ...})`.
- Warps: al pisar → transición fade → cambia de mapa/posición.
- NPCs: sprites del atlas, estáticos o paseo aleatorio 1 tile; interactuar con A de frente → DialogScene con sus líneas; `npc.heal` → cura equipo + texto; `npc.shop` → abre UI tienda del Módulo D.
- Eventos de Battle al volver: `this.events.on('resume')` / registry `save` ya actualizado por Battle.
- Cámara: follow jugador, bounds del mapa, deadzone pequeña.

## Módulo C — BattleScene — `src/scenes/BattleScene.js`

- Recibe `{ wild: MonsterInstance }` (o `{ trainer: {...} }` futuro). Usa Módulo A para TODA la lógica; la escena solo anima y pinta.
- Sprites: front enemigo `assets/sprites/pokemon/front/<id>.png`, back jugador `assets/sprites/pokemon/back/<id>.png` — cargar bajo demanda en `preload`/`load.once` con keys `pkmn_front_<id>`/`pkmn_back_<id>`.
- Layout GBA: enemigo arriba-dcha con caja nombre/nivel/HP arriba-izda; jugador abajo-izda con caja HP+EXP abajo-dcha; caja de texto inferior; menú FIGHT/BAG/PKMN/RUN (LUCHA/MOCHILA/POKÉMON/HUIR); submenú de 4 movimientos con PP y tipo.
- Anima la cola de eventos del motor secuencialmente (texto por letras, barras HP con tween, flash al recibir daño, animación pokéball con sacudidas).
- Al terminar: actualiza `registry.save` (party hp/exp/capturas, bag, pokedex seen/caught) y `this.scene.stop(); this.scene.wake('World')`.
- Captura: añade al equipo si <6 (si no, descarta con aviso en MVP). Derrota total → texto clásico, curar equipo y warp a spawn de Tetuán + mitad del dinero.

## Módulo D — UI/Menús — `src/scenes/MenuScene.js`, `src/scenes/DialogScene.js`, `src/ui/`

- `DialogScene`: overlay caja de diálogo GBA inferior (borde, texto por letras, ▼ para continuar, A avanza). API: `this.scene.launch('Dialog', { lines: [...], onClose })`. También `prompt` con opciones (sí/no, lista) → callback con elección.
- `MenuScene`: overlay menú lateral (EQUIPO, MOCHILA, POKÉDEX, GUARDAR, SALIR). Equipo: lista 6 con icono `assets/sprites/pokemon/icons/<id>.png` (cargar bajo demanda), HP, nivel; ver detalles. Mochila: usar poción/antídoto fuera de combate. Guardar: llama a Módulo F y muestra confirmación. Pokédex: vistos/capturados contador + lista simple.
- Tienda (`src/ui/shop.js`): UI comprar/vender usada desde NPC tendero (precios: poke-ball 200, potion 300, antidote 100).
- Estética compartida en `src/ui/theme.js`: colores cajas GBA (#f8f8f8 fondo, borde #585858/#a0a0a0...), helper `drawBox(scene,x,y,w,h)` estilo FRLG, fuente: `fontFamily: 'monospace'` con `resolution: 2` (no cargar fuentes externas en MVP).

## Módulo E — Mapas de Madrid — `src/world/maps.js` (+ `scripts/` de apoyo)

- Export `MAPS = { tetuan: {...}, ruta2: {...}, chamberi: {...} }` con formato:
```js
{ id, name: "TETUÁN", width, height,
  layers: { ground: number[][], deco: number[][], overhead: number[][] }, // índice frame del tileset, -1 = vacío
  collision: (0|1)[][], tallGrass: (0|1)[][],
  encounters: [{ species: 19, min: 2, max: 4, weight: 40 }...],
  warps: [{ x, y, toMap: "ruta2", toX, toY, dir: "down" }],
  npcs: [{ id, sprite: "mom", x, y, dir: "down", roam: false, dialog: ["..."], heal?: true, shop?: true }],
  playerSpawn: { x, y }, healSpawn: { x, y } }
```
- Los índices de tile salen del tileset `rse-tileset.png` (2036×1010, 127 cols × 63 filas, frame = fila*127+col). **Minar tiles correctos de los TMX reales de gracidea** (`resources-inbox/gracidea/maps/hoenn/*.tmx`, mismo tileset, GIDs = índice+1): coger de pueblos pequeños (littleroot, oldale) los IDs de: hierba/suelo, hierba alta, caminos, árboles, flores, agua, vallas, edificios (Centro Pokémon, tienda, casas, con sus bloques multi-tile), farolas. Construir paleta con nombres y componer los mapas según el GDD (layout ASCII del distrito Tetuán en docs/SPEC-MVP.md o docs/GDD-original.txt líneas 1061-1140).
- Encuentros MVP (Pokémon reales): Tetuán plaza: Rattata(19) 40% lv2-4, Pidgey(16) 35% lv2-4, Growlithe(58) 15% lv3-5, Meowth(52) 10% lv4-6. Ruta 2: añadir Caterpie(10)/Weedle(13)/Oddish(43).
- Generar con helpers JS legibles (constantes de paleta + funciones stamp para edificios), NO matrices gigantes a mano sin estructura.

## Módulo F — Supabase + guardado — `src/services/supabase.js`, `src/services/saves.js`

- Cliente con `createClient(SUPABASE_URL, SUPABASE_ANON_KEY)` de config.js.
- `auth.js`: `signUp(email, pass)`, `signIn(email, pass)`, `signOut()`, `getSession()`. Autoconfirm activado en el server (sin verificación email).
- `saves.js`: `saveGame(state)` → upsert a `pm_saves` (user_id de sesión, slot 1, state jsonb, play_time_s); sin sesión → localStorage `pm_save_guest`. `loadGame()` → de supabase si hay sesión, si no localStorage. Manejo de errores: red caída → fallback localStorage SIEMPRE (guardar en ambos), devolver `{ok, where}`.
- Tabla ya creada: `pm_saves(user_id uuid, slot int2, state jsonb, play_time_s int4, updated_at)` PK (user_id, slot), RLS dueño-solo activa.

## Módulo G — Title + Intro — `src/scenes/TitleScene.js`, `src/scenes/IntroScene.js`

- Title: fondo skyline pixel-art dibujado con gráficos Phaser (rectángulos/gradiente, sin assets externos), logo texto "POKÉMON MADRID — Edición Castiza", música no (MVP). UI login: overlay DOM (`this.add.dom` con `dom: { createContainer: true }`... NO — usar HTML plano sobre el canvas: div #auth en index.html ya existente NO existe; crear elementos DOM con JS vanilla append a body, quitar al entrar). Botones: INICIAR SESIÓN / REGISTRARSE / JUGAR SIN CUENTA. Tras auth: si hay partida (loadGame) → "CONTINUAR" / "NUEVA PARTIDA"; si no → Intro.
- Intro: secuencia profesor (sprite `scientist` grande no necesario; usar diálogo) con textos del GDD (docs/SPEC-MVP.md), nombre del jugador (prompt DOM, máx 7 chars, default "ROJO"), elección de inicial entre los 3 (front sprites 1/4/7 seleccionables con flechas), rival no en MVP. Crea SaveState inicial (party = [inicial lv5], bag inicial 5 pokeballs 3 pociones, money 3000, map tetuan spawn) → registry → World.

## Reglas comunes

- ESM imports relativos con extensión `.js`. Sin dependencias nuevas sin permiso (solo phaser y @supabase/supabase-js).
- Español castizo en TODOS los textos de UI/diálogos.
- Nada de `console.log` en código final (usar sparingly para errores).
- Cada módulo debe poder importarse sin efectos secundarios (excepto escenas que registra main.js).
