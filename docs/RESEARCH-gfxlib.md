# RESEARCH — Pokémon Graphics Library (Gens 1-3) + Essentials Enhanced v20.1

> Investigación de recursos gráficos para subir el nivel visual de **pokemon-madrid**
> (Phaser, estilo FRLG GBA, tileset 16×16). Fecha: 2026-06-11.
>
> El juego ya usa `TILE = 16` (`src/config.js`) y carga un único spritesheet
> `assets/tilesets/rse-tileset.png` reempaquetado a 127 columnas sin margen
> (`src/scenes/BootScene.js`, `src/world/engine/mapRenderer.js`). Cualquier tile
> nuevo debe terminar en ese mismo formato (16×16, sin gaps) o cargarse como
> spritesheet 16×16 aparte.

---

## 0. TL;DR ejecutivo

| Fuente | Formato real | ¿Directamente usable en Phaser 16×16? | Veredicto |
|--------|--------------|----------------------------------------|-----------|
| **Pokémon Graphics Library — "Normal Sized"** (MediaFire) | **16×16 nativo**, layout RPG Maker MV (A1/A2/B/C/D/E) | **SÍ** (recortando los tiles que necesites; ya están en grid de 16) | **FUENTE PRINCIPAL.** Tiene sección FRLG completa: Outside, Houses, Buildings, Shops, Gyms, Dungeons. |
| **Pokémon Essentials Enhanced v20.1** (GitHub, RPG Maker XP) | **32×32 nativo** (tilesets) / NPCs **32×48** | **NO sin conversión** (hay que reescalar ×0.5 a 16px) | Referencia / alta resolución. Mejor para mirar, peor para integrar tal cual. |

**Recomendación:** usar la sección **FRLG** del pack "Normal Sized" de MediaFire como cantera
de tiles overworld + interiores + NPCs. Es 16×16 nativo y casa con el pipeline actual.
El repo Essentials sirve como referencia visual / fuente de variantes a alta resolución,
pero **requiere downscale ×2** antes de entrar al tileset.

---

## 1. FUENTE A — Pokémon Graphics Library (Gens 1-3), "Normal Sized" (16×16)

### 1.1 Origen y enlaces

- **Thread oficial (PokéCommunity):**
  https://www.pokecommunity.com/threads/pokemon-graphics-library-gens-1-3-formally-rpgm-mv-ultimate-resource.445067/
  *(devuelve 403 a bots; el thread enlaza a dos páginas redirect de `torgadownload.blogspot.com`
  que apuntan a MediaFire).*
- **Autor / compilador:** "PokeTester" (proyecto de 3+ años, completado feb-2021, V1.0).
- **Descarga directa (los 2 enlaces reales tras el redirect):**
  - **Made for RPGM MV (48×48, escalado ×3):**
    `https://www.mediafire.com/file/kyuyt0ff21avv92/Pokemon+Graphics+Library.7z/file`
  - **Original / Normal Size (16×16):** ← **el que se descargó**
    `https://www.mediafire.com/file/tkltjmmilkevoco/Pokemon+Graphics+Library+(Normal+Sized).7z/file`

### 1.2 Lo que se descargó

- Archivo: `Pokemon Graphics Library (Normal Sized).7z` — **25 MB** (23.85 MB según MediaFire).
- Descomprimido en `/tmp/gfxlib/extracted/` con `py7zr` (no había `7z`/`p7zip` en la máquina;
  instalado en un venv `uv` en `/tmp/gfxvenv/`).
- **30.888 PNG** en total. Carpeta raíz: `Pokemon RPGM MV Ultimate Resource Pack V1.0 (Normal Sized)/img/`.

### 1.3 Árbol de carpetas (resumen, layout RPG Maker MV)

```
img/
├── Credits.txt
├── tilesets/            (410 PNG)  ← TILESETS overworld + interiores
│   ├── W-RBYGSC_A1.png  W-RBYGSC_B.png  W-RSEFRLG_A1.png  W-RSEFRLG_B.png   (autotiles "world" combinados)
│   ├── FRLG/                                              ← ★ LO MÁS VALIOSO para Madrid FRLG ★
│   │   ├── FRLG Outside/        (A1A/B/C agua-flores animadas, A2A/B suelo+caminos, A5 muros, B/C/D/E1-4 props)
│   │   ├── FRLG Inside Houses/  (A2/A4/A5 + B/C/D)
│   │   ├── FRLG Inside Buildings/ (A2/A4/A5 + B/C/D/E)
│   │   ├── FRLG Inside Shops-Misc/ (A2/A4/A5 + B/C/D/E)
│   │   ├── FRLG Gyms/           (A2/A4/A5 + B/C/D)
│   │   └── FRLG Dungeons/       (A1/A2/A4/A5 + B)
│   ├── Gen 3/   (RSE Buildings, RS/Emerald Outside, Houses, Dungeons, Gyms, Bases, Frontier, Underwater…)
│   ├── Gen 2/   (GSC Day / Morning / Evening)
│   ├── Gen 2 Beta/ (Space World '97, ~14 paletas)
│   ├── Gen 1/   (RBY varias paletas)
│   └── TCG Overall/ (TCG_A2/A4/A5/B/C/D/E)
├── characters/          (926 PNG)  ← NPCs / overworld sprites
│   ├── FRLG Peds/        (16 hojas, 288×256, 8 personajes c/u)   ← ★ NPCs madrileños ★
│   ├── RSE Peds/         (24 hojas)
│   ├── Gen 1 Colors/ Gen 2 Colors/ Gen 1-2 Night/  (overworld retro, muchas paletas)
│   ├── HGSS Pokemon Overworlds/ (142 hojas — Pokémon caminando, p.ej. seguidor)
│   ├── TCG Peds Original Colors/
│   ├── !FRLG Doors1-5.png   (puertas animadas, 192×128)
│   ├── !!$FRLG Elevators.png (48×192)  !!$FRLG Mewtwo Object.png (72×128)  !!FRLG Snorlax.png
│   └── !GSC PokeChest.png
├── pictures/            (8.291 PNG)  ← UI / interfaz / pokédex pics / retratos
│   ├── Gen 3 FRLG/  (FRLG Bags, Trainer Card, PC Box, Pokédex Pics, Intro, Area Intros, Pikachu…)
│   ├── Gen 3 RSE/  Gen 1/  Gen 2/  Multi Gen/  TCG Cards/
├── system/             (31 PNG)  ← Windowskins (Window Gen 3-01..27 + Gen 1), Balloon
├── faces/              (120 PNG)  ← retratos cara (RMMV faces)
├── battlebacks1/ (24)  battlebacks2/ (25)  ← fondos de combate
├── enemies/      (19.674 PNG) ← sprites front de Pokémon (TODAS las paletas/shiny) — enorme
└── animations/   (1.387 PNG)  ← animaciones de ataques Gen 1-2 / Gen 3
```

### 1.4 Tamaños / formato VERIFICADOS (Pillow)

Todo en **grid de 16×16 px**, sin margen. Nomenclatura de slots RPG Maker MV:

**FRLG Outside** (overworld):
| Fichero | px | tiles | Contenido |
|---------|----|-------|-----------|
| `FRLG Outside A1A/B/C.png` | 256×192 | 16×12 | autotiles animados (agua, flores, olas) |
| `FRLG Outside A2A.png` | 256×192 | 16×12 | **suelo / caminos / hierba** (autotiles base) |
| `FRLG Outside A2B.png` | 256×192 | 16×12 | suelo variante |
| `FRLG Outside A5.png` | 128×256 | 8×16 | muros / bordes |
| `FRLG Outside B.png` | 256×256 | 16×16 | **edificios, tejados, fachadas** |
| `FRLG Outside C.png` | 256×256 | 16×16 | árboles, vallas, señales, props naturales |
| `FRLG Outside D/E1-E4.png` | 256×256 | 16×16 | más props / decoración urbana |

**FRLG Inside Houses / Buildings / Shops / Gyms** (interiores):
- B/C/D/E = 256×256 (16×16 tiles); A2 = 256×192; A4 = 256×240; A5 = 128×256. Todos 16-grid.

**FRLG Peds (NPCs):** 288×256 = hoja RMMV de **8 personajes** (4×2).
Cada personaje = bloque 72×128 → **frame 24×32 px** (1 tile ancho × 2 alto, estándar GBA overworld:
3 columnas walk-cycle × 4 direcciones). 16 hojas = ~128 NPCs.

### 1.5 Recursos DIRECTAMENTE usables (sin conversión, solo recorte)

Estos ya son 16×16 nativos → se pueden minar tile a tile e inyectar en `rse-tileset.png`
(o cargar como spritesheet 16×16 nuevo):

- **Overworld FRLG:** `tilesets/FRLG/FRLG Outside/` (todos). El núcleo es **A2A** (caminos/suelo)
  + **B** (edificios) + **C** (árboles/props). Ideal para reconstruir calles de Madrid estilo FRLG.
- **Interiores:** `tilesets/FRLG/FRLG Inside Houses/_B`, `Inside Shops-Misc/_A4` y `_B`,
  `Inside Buildings/_B` → suelos, paredes, muebles, mostradores (pisos, bares, tiendas madrileñas).
- **NPCs:** `characters/FRLG Peds/*` (24×32) → vecinos/peatones de Madrid. Mismo estilo GBA que el player.
  Cargar como spritesheet `frameWidth:24, frameHeight:32` (no 16 — el sprite es más alto que el tile,
  coherente con el comentario en `src/world/engine/GridMover.js`).
- **Puertas animadas:** `characters/!FRLG Doors1-5.png` (192×128) → portales de edificios.
- **Windowskins / UI:** `system/Window Gen 3-01..27.png` → marcos de diálogo/menú estilo FRLG.
- **Bags / Trainer Card / PC Box:** `pictures/Gen 3 FRLG/` → assets de interfaz listos.

### 1.6 Recursos que NECESITAN conversión

- **Autotiles A1/A2/A4** (FRLG Outside A1*, A2*, Inside A2/A4): vienen en **formato autotile de
  RPG Maker MV** (plantilla de esquinas/bordes 2×3 por autotile). Para Phaser no se usan tal cual:
  hay que **renderizar el blob/plantilla a tiles planos 16×16** (o minar a mano los 47 tiles del
  blob). Los slots **B/C/D/E** sí son tiles planos directos.
- **Hojas de personaje RMMV** (`FRLG Peds`, layout 4×2 con `$`/`!` prefijos): el prefijo importa
  — `$` = 1 personaje por hoja, sin prefijo = 8 por hoja. Hay que respetar el slicing 24×32.

---

## 2. FUENTE B — Pokémon Essentials Enhanced v20.1 (RPG Maker XP, GitHub)

- **Repo:** https://github.com/omanoloneto/pokemon-essentials-enhanced-v20.1 (branch `master`)
- **NO se clonó** (repo enorme). Se navegó vía `gh api` y se bajaron solo muestras a `refs/`.

### 2.1 `Graphics/Tilesets/` (20 ficheros)

Tilesets monolíticos **RPG Maker XP = 256 px de ancho, tiras verticales altísimas**:

| Fichero | px | Nota |
|---------|----|------|
| `Outside.png` | **256×16064** | atlas maestro overworld (mega-tira) |
| `Interior general.png` | 256×8032 | interiores genéricos |
| `Gyms interior.png` | 256×4608 | gimnasios |
| `Caves.png` | (131 KB) | cuevas |
| `Department store interior.png` | 256×1568 | grandes almacenes (¡útil para "El Corte Inglés" madrileño!) |
| `Poke Centre interior.png` | 256×1280 | centro Pokémon |
| `Mart interior.png` | 256×576 | tienda |
| + Boat, Factory, Game Corner, Graveyard tower, Harbour, Mansion, Museum, Multiplayer rooms, Ruins, Trainer Tower, Underground path, Underwater | | variados |

Más `Graphics/Autotiles/` (**42** autotiles RMXP: Dirt, Brick path, Flowers1/2, Fountain1/2,
cave floors, Water, Sand shore, etc.).

### 2.2 `Graphics/Characters/` (213 ficheros)

- **NPC 01..29.png** + Boy/Girl player (run/bike/surf/fish), Followers, Objects (tree/rock/boulder/ball).
- Tamaño verificado: **128×192 → grid 4×4 → frame 32×48 px** (estándar RMXP).

### 2.3 ⚠️ Formato y conversión (CLAVE)

**Essentials Enhanced es 32 px nativo, NO 16 px.** Verificado:
- Tilesets: ancho 256 = **8 columnas × 32 px** → tiles **32×32** (RMXP estándar).
- NPCs: **32×48** por frame (el doble que los 24×32 de FRLG Peds del pack MediaFire).

→ **NO son directamente usables** en el tileset 16×16 de pokemon-madrid. Para integrarlos hay que:
1. **Downscale ×0.5** (32→16) con resampling *nearest-neighbor* (preservar pixel-art).
2. Re-cortar la tira RMXP (256-ancho, 8 col @32) a grid 16 y reempaquetar a las 127 columnas
   del `rse-tileset.png` actual.
3. Para NPCs, reescalar 32×48 → 16×24 y re-slicar el walk-cycle.

El downscale ×2 de pixel-art a menudo introduce artefactos → **preferir la fuente MediaFire (16×16
nativa)** salvo que un tile concreto de Essentials sea visualmente superior y merezca el reescalado.

**Cuándo SÍ vale Essentials:** como **referencia de composición** (su `Outside.png` y
`Interior general.png` son atlas muy completos y bien organizados) y para tiles/edificios que el
pack FRLG no tenga (grandes almacenes, fábricas, museos → buenos para un Madrid urbano).

---

## 3. Ficheros copiados a `docs/refs/gfxlib/`

### `mediafire-16px/` (★ usables tal cual, 16×16) — los 6 más prometedores
| Fichero local | Origen en el pack | Para qué |
|---------------|-------------------|----------|
| `FRLG_Outside_A2A_paths-terrain.png` | FRLG Outside A2A | suelo, caminos, hierba (base del overworld) |
| `FRLG_Outside_B_buildings.png` | FRLG Outside B | edificios / fachadas / tejados |
| `FRLG_Outside_C_nature-decor.png` | FRLG Outside C | árboles, vallas, señales, props urbanos |
| `FRLG_Inside_B_Houses.png` | FRLG Inside_B Houses | interior de pisos (paredes/suelos/muebles) |
| `FRLG_Inside_A4_Shops-Misc.png` | FRLG Inside_A4 Shops-Misc | mostradores/tiendas (bares, comercios) |
| `FRLG_Peds1_NPCs.png` | FRLG Peds1 | hoja de 8 NPCs (24×32) — vecinos de Madrid |

### `essentials-32px/` (referencia, requieren downscale ×2)
| Fichero local | Origen | Nota |
|---------------|--------|------|
| `Essentials_Outside_32px_master-atlas.png` | Tilesets/Outside.png | atlas overworld maestro (256×16064) |
| `Essentials_Interior-general_32px.png` | Tilesets/Interior general.png | interiores genéricos |
| `Essentials_NPC01_32x48.png` | Characters/NPC 01.png | NPC ejemplo (32×48) |
| `Essentials_NPC05_32x48.png` | Characters/NPC 05.png | NPC ejemplo (32×48) |

> El pack MediaFire completo descomprimido queda en `/tmp/gfxlib/extracted/` (no se commitea;
> 30.888 PNG / ~25 MB comprimido). Si se quiere algo más, copiar desde ahí.

---

## 3-bis. AUDIO — catálogo del repo Essentials Enhanced (NO descargado, solo inventario)

> Marcelino quiere catalogar el audio de `omanoloneto/pokemon-essentials-enhanced-v20.1`
> (`Audio/BGM`, `Audio/SE`, `Audio/ME`) **sin descargarlo todavía** — él decide la integración.
> **Audio actual del juego:** `assets/audio/` está vacío; `src/audio/AudioManager.js` carga desde
> un manifest (hoy referencia `audio/xxx.ogg`). **Formato final exigido = MP3** (OGG no decodifica
> en headless / iOS Safari) → **todo lo de abajo necesita conversión a MP3** (los `.ogg`), y los
> `.mid` necesitan **renderizado a audio** (MIDI→WAV→MP3, p.ej. con un soundfont GBA) antes de usar.

**Raw base:** `https://raw.githubusercontent.com/omanoloneto/pokemon-essentials-enhanced-v20.1/master/Audio/<carpeta>/<fichero>`
(los nombres llevan espacios → URL-encodear, p.ej. `%20`).

### 3-bis.1 `Audio/BGM/` (41 pistas — música) ⚠️ mezcla MIDI + OGG

| Categoría | Pistas valiosas | Formato | Acción |
|-----------|-----------------|---------|--------|
| **Combate** | `Battle wild.ogg` (1.1 MB), `Battle trainer.ogg` (1.85 MB), `Battle Gym Leader.mid`, `Battle Elite.mid`, `Battle Champion.mid`, `Battle Frontier.mid`, `Battle roaming.mid` | ogg/mid | `.ogg`→MP3; `.mid`→render+MP3 |
| **Victoria** | `Battle victory.ogg`, `Battle victory wild.ogg`, `Battle victory trainer.ogg`, `Battle victory leader.ogg` | ogg | →MP3 |
| **Pueblos/Ciudad** | `Lappet Town.mid`, `Lerucean Town.mid`, `Cedolan City.mid`, `Tiall.mid`, `New Start.mid` | mid | render+MP3. *Útiles para "barrios" de Madrid* |
| **Rutas** | `Route 1.mid`, `Route 2.mid`, `Route 3.mid`, `Natural Park.mid`, `Islands.mid` | mid | render+MP3 |
| **Interiores** | `Poke Center.mid`, `Poke Mart.mid`, `Lab.mid`, `Gym.mid`, `Cave.mid`, `Game Corner.mid` | mid | render+MP3 |
| **Especiales** | `Title.ogg` (1.45 MB), `Surfing.ogg`, `Bicycle.ogg`, `Evolution.ogg`, `Hall of Fame.mid`, `Credits.mid`, `Indigo Plateau.mid` | ogg/mid | según uso |

> ⚠️ La mayoría de la BGM "de mapa" (pueblos, rutas, interiores) es **MIDI** → requiere paso extra
> de renderizado. Solo combate, victoria, Title, Surf, Bike y Evolution están en OGG. Si se busca
> música de calle/pueblo lista-para-MP3, esta fuente NO la trae en audio renderizado.

### 3-bis.2 `Audio/SE/` (69 efectos — todos `.ogg`) ★ lo más aprovechable

Pequeños, limpios, estilo Gen 3. Los más valiosos para pokemon-madrid:

| Grupo | SE recomendados (todos `.ogg` → MP3) |
|-------|--------------------------------------|
| **Menú/UI** | `GUI sel cursor`, `GUI sel decision`, `GUI sel cancel`, `GUI sel buzzer`, `GUI menu open`, `GUI menu close`, `GUI save choice` |
| **Combate** | `Battle throw`, `Battle ball drop/hit/shake`, `Battle catch click`, `Battle damage normal/super/weak`, `Battle recall`, `Battle flee` |
| **Pokémon** | `Pkmn faint`, `Pkmn move learnt`, `Pkmn exp gain`, `Pkmn exp full` |
| **Mundo** | `Door enter`, `Door exit`, `Player bump`, `Player jump`, `Exclaim` |
| **PC/Mart** | `PC open`, `PC access`, `PC close`, `Mart buy item` |
| (omitir) | toda la familia `Mining *`, `Voltorb Flip *`, `Slots *`, `Tile Game *` — minijuegos que el juego no tiene |

*(Subcarpetas `SE/Anim` y `SE/Cries` existen pero vacías en el listado superior — cries de Pokémon
probablemente dentro de `Cries/`; revisar si se quiere audio de Pokémon.)*

### 3-bis.3 `Audio/ME/` (19 jingles — todos `.ogg`) ★ muy útil

Jingles cortos de "evento". Recomendados (→MP3):

| ME | Uso |
|----|-----|
| `Item get`, `Key item get`, `Berry get`, `Egg get` | recoger objetos |
| `Pkmn get`, `Battle capture success` | capturar Pokémon |
| `Pkmn healing` | curación (centro Pokémon) |
| `Badge get` | medalla de gimnasio |
| `Evolution start`, `Evolution success` | evolución |
| `GUI save game` | guardar partida |
| (omitir) | `Slots *`, `Voltorb Flip *`, `Bug catching *` — minijuegos no presentes |

### 3-bis.4 Veredicto audio

- **SE + ME (`.ogg`):** **la parte más aprovechable** — set completo y coherente de efectos/jingles
  Gen 3 que el juego aún no tiene. Único trabajo: **convertir OGG→MP3** (lote `ffmpeg`).
- **BGM:** valor parcial. Combate/victoria/título están en OGG (→MP3 directo); la música de
  pueblo/ruta/interior es **MIDI** y exige renderizado con soundfont antes de servir. Evaluar si
  compensa frente a fuentes que ya entreguen MP3.
- **NO descargado** (según instrucción). Para bajar luego: `gh api` o `curl` al raw base de §3-bis,
  filtrar por `.ogg`, y pasar `ffmpeg -i in.ogg out.mp3`.
- **Licencia:** misma que el resto — rip Nintendo/Game Freak, **solo fan-game no comercial**.

---

## 4. Licencia / créditos (IMPORTANTE)

### Pack MediaFire — `img/Credits.txt` (verbatim, lo esencial):

> "I do NOT own any of these assets. They belong to **Game Freak and Nintendo**. About 90% of these
> were ripped by other people. I only converted them for use into RPG Maker MV. If you are stupid
> enough to use these in a **commercial product instead of Fan Games** like they are intended, you
> deserve whatever happens afterwards."

Créditos de los rippers (parcial): Game Freak (sprites/música originales); HeartlessDragoon
(*Gen 3 Interior & Exterior Tiles*); 4th Gen Matt (DPP tilesets, ½ RSE chars); Waudby, Redzagoon,
Casquall (FRLG Interface); SuperJustinBros (Gold Beta maps); y otros (lista completa en
`img/Credits.txt`, copiada arriba la fuente).

### Essentials Enhanced v20.1
Mismo marco legal: assets propiedad de **Nintendo / Game Freak / Creatures**, recopilados por la
comunidad de Pokémon Essentials. Uso permitido en **fan games no comerciales**.

### ⚠️ Implicación para pokemon-madrid
- Estos gráficos son **rip de Nintendo/Game Freak** → **uso solo para fan-game NO comercial**.
- **NO** combinar con el `Branding Overlay` de "Comprar Plantilla (100€)" del protocolo Stratoma,
  ni vender/monetizar el juego con estos assets. Si el juego se va a comercializar, hay que
  sustituirlos por assets originales o de licencia libre (p.ej. estilo GBA hecho a medida).
- Mantener `docs/refs/gfxlib/` fuera de cualquier build pública/comercial.

---

## 5. Próximos pasos sugeridos (no ejecutados — fuera del scope de esta investigación)

1. Comparar visualmente `FRLG_Outside_A2A/B/C` contra el `rse-tileset.png` actual; decidir si se
   migra el overworld de RSE → FRLG (más coherente con "estilo FRLG" del brief).
2. Escribir un pequeño script (Pillow) que mine tiles de los slots **B/C/D/E** de FRLG y los
   reempaquete a las **127 columnas** del `tiles` actual (formato que ya espera `mapRenderer.js`).
3. Para autotiles A1/A2 → renderizar la plantilla de blob a tiles planos antes de empaquetar.
4. Cargar `FRLG Peds` como spritesheet `24×32` para NPCs madrileños; mapear walk-cycle 3×4.
