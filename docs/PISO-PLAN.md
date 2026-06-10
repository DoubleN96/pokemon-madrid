# PLAN DE INTEGRACIÓN — Pokémon Piso (sobre el juego actual)

Fuente: `SPEC-POKEMON-PISO.md`. Objetivo: re-tematizar la trama y el reparto del juego existente
con el universo "Pokémon Piso" (Marcelino y sus amigos), manteniendo el motor Pokémon (Gen 1 real,
combate por turnos) y el mundo de Madrid (Tetuán / Ruta 2 / Chamberí).

## Decisiones firmes (tomadas por el dev, comunicadas a Marcelino)
1. **Marcelino = JUGADOR/protagonista.** Álvaro Alonso = rival y campeón.
2. **Pokémon Gen 1 reales** (el motor ya los usa). Aces remapeados a Gen 1.
3. **Solo Madrid** por ahora (3 mapas actuales). Salamanca/Torrevieja y la Liga completa = fase futura.
4. **Tono:** parodia castiza con cariño (fiel a las personalidades; cómico, no cruel).
5. **Cortina descartado** (el doc lo declara inexistente). Su gimnasio Veneno → Jesús "la Rata".

## Esquema de NPC (extiende el actual en `src/world/maps.js`)

```js
{ id, sprite, x, y, dir, roam?: false,
  dialog?: [ "..." ],            // NPC de charla
  heal?: true,                   // cura el equipo + texto
  shop?: true,                   // abre tienda
  sign?: false,                  // (carteles ya soportados aparte)
  trainer?: {                    // ENTRENADOR / LÍDER DE GIMNASIO
    name: "ÁLVARO ALONSO",
    title?: "Compañero de piso",        // subtítulo opcional (p.ej. "Líder · Medalla Humo")
    party: [ { species: 6, level: 8 }, ... ],   // ids Gen 1 reales
    intro:  [ "..." ],           // diálogo ANTES del combate
    win:    [ "..." ],           // lo que dice al PERDER (jugador gana)
    defeat: [ "..." ],           // lo que dice si el jugador pierde
    prize?: 500,                 // dinero al ganarle
    flag: "alvaro_tetuan",       // clave única; no se repite si save.flags[flag]===true
    badge?: "Humo",              // si es líder de gimnasio, nombre de la medalla
  } }
```

## Contrato técnico (qué módulo toca qué archivo — disjuntos)

### Módulo ENGINE-TRAINER  → `src/scenes/BattleScene.js`, `src/scenes/WorldScene.js`
El motor `src/core/battle.js` YA soporta `isTrainer`/`enemyParty` multi. Cablear la UI:
- **BattleScene.init** acepta `data.trainer = { name, title, party, intro, win, defeat, prize, flag, badge }`
  además de `data.wild`. En modo trainer:
  - `createBattle({ ..., enemyParty: trainer.party.map(p => createMonster(pokedex, p.species, p.level)), isTrainer: true })`.
  - Secuencia: texto `¡{name} quiere combatir!` → diálogo `intro` (vía MessageBox) → saca su primer Pokémon
    (`¡{name} ha enviado a {especie}!`) → bucle de combate. El motor releva sus Pokémon automáticamente;
    BattleScene anima cada `{t:'switch', side:'enemy'}` mostrando el nuevo front.
  - **Sin captura ni huida** (el menú ya respeta `canRun=false`; ocultar/!MOCHILA-ball y RUN da
    "¡No puedes huir de un combate de entrenador!" o desactivado).
  - Al ganar (result `win`): diálogo `win`, sumar `prize` a `save.player.money` con texto
    `¡Has ganado {prize}₧!`, marcar `save.flags[trainer.flag] = true`, si `badge` añadir a
    `save.flags.badges` (array) con texto `¡Has conseguido la Medalla {badge}!`.
  - Al perder (result `lose`): diálogo `defeat`, whiteout normal (curar + recolocar Tetuán) — reutiliza
    el flujo existente; NO marcar flag (se puede reintentar).
  - Enemigo front sprite por id (cargar bajo demanda como ya se hace).
- **WorldScene.interact**: si `npc.def.trainer` y NO `save.flags[trainer.flag]` → `startTrainerBattle(npc)`
  en vez de diálogo: `scene.sleep('World'); scene.launch('Battle', { trainer: npc.def.trainer })`.
  Si ya derrotado → muestra `npc.def.trainer.win` (o un diálogo corto post-derrota) como charla normal.
- Mantener intactos los flujos wild/heal/shop/sign actuales. **E2E**: añadir a `tests/e2e/` un test que
  fuerce un combate de entrenador y verifique que termina, da premio y marca flag.

### Módulo INTRO-PISO  → `src/scenes/IntroScene.js`
Reescribir SOLO los textos/lore (no la mecánica): premisa del doc — el jugador **es Marcelino**, sale de
su piso en **Bravo Murillo (Tetuán)** a "poner orden en el caos" y vencer a su compañero de piso y campeón
**Álvaro Alonso**. El "profesor" pasa a ser un mentor del lore (p.ej. **Iván "FinTips"**, el socio
financiero, que te da el primer Pokémon "como inversión"). Nombre del jugador por defecto: **MARCELINO**.
Mantener la elección de inicial (Bulbasaur/Charmander/Squirtle) con flavor castizo. Tono parodia con cariño.

### Módulo WORLD-CAST  → `src/world/maps.js`
Poblar Tetuán / Ruta 2 / Chamberí con el elenco. Sprites del atlas `chars` (elige el que mejor rime con la
descripción física del SPEC; lista disponible abajo). Reparto objetivo (NPC o TRAINER):

**TETUÁN (ciudad inicial — Bravo Murillo):**
- **Danna** (novia de Marcelino) → en CASA, `heal` + consejos ("¡A ordenar ese caos, mi amor!"). sprite tipo `aroma`/`may`.
- **Iván "FinTips"** → cerca de casa o laboratorio; NPC mentor (da contexto; si INTRO ya lo usa, aquí charla).
- **Álvaro Alonso** → RIVAL: `trainer` (te reta nada más empezar la aventura). Equipo bajo al principio
  (p.ej. Charmander/Growlithe/Abra niveles 5-7). flag `alvaro_tetuan`. Diálogos fieles (cigarro, Excel, Blanca).
- **José Antonio el casero** → NPC de **bloqueo**: junto a una salida, diálogo "El alquiler, majo" (bloqueo
  temático ligero; en MVP solo charla cómica, no bloqueo real para no frustrar). sprite `elder_m`/`gentleman`.
- **Eduardo** (el tacaño) → tendero (`shop`) con diálogos de tacañería.
- **Alex** → NPC charla (Tinder/IA) o `trainer` menor (Pikachu/Magnemite niveles 4-6).

**RUTA 2 (hacia Chamberí):**
- **Sergio Guillén** (camionero) → `trainer` (Snorlax dormido nivel bajo + Machop). Diálogo cerveza/Bundesliga.
- **Jesús "la Rata"** → `trainer` fantasma/veneno (Koffing/Gastly niveles 6-8). "Vuelvo con pelo y venganza".
- 1-2 NPCs de charla del lore.

**CHAMBERÍ:**
- **Blanca** (notarías) → NPC de ayuda (papeles/burocracia) o `trainer` hada-simulada con Clefairy/Mr. Mime.
- **Ángel** (perfeccionista) → NPC controlador / `trainer` psíquico (Drowzee/Kadabra).
- **Adrián Barrera** (villano, Team Schizo) → aparición/cameo NPC que amenaza con el "Orden Perfecto"
  (combate completo = fase futura). sprite `psychic`.
- Enfermera del Centro Pokémon → renombrar con guiño.

### Mapeo de aces a Gen 1 (referencia para equipos)
Metagross→**Alakazam** · Volcarona/Infernape→**Charizard**/**Arcanine** · Toxtricity/Rotom→**Electabuzz**/**Magneton** ·
Gardevoir→**Clefable**/**Mr. Mime** · Weezing→**Weezing** (existe) · Gengar→**Gengar** (existe) · Porygon→**Porygon** ·
Slaking/Coalossal→**Snorlax**/**Golem** · Greedent→**Persian** · Sableye→**Gengar** · Probopass→**Golem**/**Onix** ·
Mr. Mime Tirano (Adrián)→**Hypno**/**Mr. Mime** (existen).

### Sprites de personaje disponibles (atlas `chars`)
ace_trainer, aroma, black_belt, brawly, bug_catcher, elder_f, elder_m, expert_f, fisher, gentleman,
guitarist, hiker, lass, may, mom, norman, psychic, pokefan, pokemaniac, ranger, rich_boy, roxanne,
sailor, scientist, schoolkid_f, schoolkid_m, swimmer_f, swimmer_m, twin, wally, youngster, shopkeeper_m,
shopkeeper_f, gentleman, generic_m1..5, generic_f1..5. (Para NPC estático basta `<sprite>_<dir>_0`.)
Sugerencias: Álvaro→`norman` (traje/autoridad) · Alex→`guitarist` (toca guitarra) · Blanca→`lass`/`aroma` ·
Ángel→`scientist` · Iván→`gentleman` · Jesús→`pokemaniac` · José Antonio→`elder_m` · Sergio→`hiker` ·
Eduardo→`rich_boy` · Adrián→`psychic` · Danna→`aroma` · Marcelino(jugador)→`youngster`.

## Orden de ejecución
1. ENGINE-TRAINER (con E2E) + INTRO-PISO en paralelo.
2. WORLD-CAST (usa el esquema de arriba).
3. Verificación adversarial + E2E completo (incl. combate de entrenador) + deploy.

## Fuera de alcance de esta fase (futuro)
Liga completa 8 gimnasios + Alto Mando + Campeón, regiones Salamanca/Torrevieja, mecánicas castizas
(Tapeo/Pisos Secretos/Certámenes), Team Schizo jugable, sprites-retrato reales de los amigos.
