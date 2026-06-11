# RESEARCH — Recursos gráficos GBA de Pokémon para subir el nivel visual

> Investigación de assets descargables (tilesets, sprites overworld, edificios, UI de combate)
> para **pokemon-madrid** (Phaser 3, estilo FireRed/Emerald, ambientado en Madrid).
> Fecha: 2026-06-11 · Versión **PRIVADA no comercial** (Marcelino autoriza uso personal de assets de Pokémon).
>
> **No se han descargado archivos grandes.** Este doc solo localiza y documenta. No se ha tocado código.

---

## 0. Contexto técnico del proyecto (lo que ya tenemos)

Confirmado leyendo `docs/CONTRACTS.md`, `public/assets/` y `resources-inbox/gracidea/`:

| Elemento | Estado actual | Formato exacto |
|----------|---------------|----------------|
| **Tileset overworld** | `public/assets/tilesets/rse-tileset.png` (2036×1010) | Spritesheet **16×16**, 127 cols × 63 filas, `frame = fila*127+col` |
| **Atlas NPCs** | `public/assets/sprites/chars/npcs.{webp,json}` | **TexturePacker hash JSON** (`{"frames":{...}}`), frames `<char>_<dir>_<0\|1\|2>`, ~14×20 / 12×20 px |
| **Player** | atlas `chars`, anims `may_walk_<dir>` | mismo formato TexturePacker |
| **Origen real** | `resources-inbox/gracidea/copyrighted/textures/rse/` (AGPL-3.0 código, sprites © TPC) | `tileset.png` + `npcs.json` re-empaquetados |
| **Mapas** | TMX de Hoenn en `resources-inbox/gracidea/maps/hoenn/*.tmx` | Tiled, GIDs = índice+1, mismo tileset |

**Conclusión técnica clave:** el proyecto ya nace del set RSE de gracidea. Para "subir el nivel" hay que reemplazar/ampliar
con un tileset **FRLG real** (más limpio y urbano que RSE, ideal para una ciudad como Madrid) y un set de NPCs FRLG de mayor variedad.

### Dos formatos de fuente que vas a encontrar (importante para integrar)
1. **Sheets pre-compuestos (The Spriters Resource / Eevee Expo / DeviantArt)** → ya vienen como PNG grande con tiles/metatiles alineados a rejilla; se **cortan directamente** a spritesheet 16×16 (lo que el proyecto espera). **Vía más rápida.**
2. **PNGs crudos de decompilación `pret` (GitHub)** → los `tiles.png` son rejillas de **8×8** + un `metatiles.bin` que define cómo se ensamblan los 16×16. Más "limpio legalmente" y versionable, pero requiere un paso de **ensamblado de metatiles** (script o `porytiles`/`porymap`) antes de obtener el spritesheet 16×16. **Vía correcta pero con más trabajo.**

---

## TOP 5 — recursos más prometedores (priorizados)

| # | Recurso | Para qué | Por qué gana | Esfuerzo de integración |
|---|---------|----------|--------------|--------------------------|
| **1** | **pret/pokefirered** (decomp GitHub) | (a) tileset (b) NPCs overworld (d) UI combate | Fuente original organizada en PNGs, `raw.githubusercontent` da **HTTP 200 directo**, versionable, todo FRLG auténtico | Medio (ensamblar metatiles 8×8→16×16; NPCs y UI ya son PNG directos) |
| **2** | **The Spriters Resource — FRLG Tileset 1 & 2** | (a) tileset (c) edificios | Sheets 16×16 **pre-compuestos**, listos para cortar; calidad pixel-perfect | Bajo (cortar a 16×16 y reindexar frames) |
| **3** | **Eevee Expo — Accurate FRLG-style NPC Megapack** (SoulfulLex) | (b) sprites de personajes overworld | Cientos de NPCs/clases en estilo FRLG coherente → ideal para los personajes de Marcelino | Bajo-Medio (recortar OW chars → re-empacar a `npcs.json` con TexturePacker) |
| **4** | **The Spriters Resource — FRLG "Overworld NPCs" + "Player Sprites"** | (b) personajes overworld + protagonista | Set oficial FRLG, mismas dimensiones que ya usamos (14×20-ish), encaja con `may_<dir>_<n>` | Bajo (recortar marcos → atlas) |
| **5** | **Ekat's Public Gen 3 Tilesets** (Eevee Expo) | (a)+(c) tileset urbano + edificios/interiores | 81 sets públicos Gen3, gran cobertura de edificios/interiores para un Madrid grande | Medio (elegir sets, normalizar a 16×16, paleta) |

URLs directas y detalle de cada uno abajo.

---

## (a) MEJOR TILESET OVERWORLD

### A1 ⭐ pret/pokefirered — `data/tilesets/` (RECOMENDADO como base canónica)
- **Qué es:** los tilesets FRLG **originales** de la decompilación oficial (proyecto `pret`). Estructura confirmada vía GitHub API:
  - `data/tilesets/primary/general/tiles.png` (terreno base, hierba, caminos, agua) — 8×8 indexado
  - `data/tilesets/primary/building/tiles.png` (fachadas/edificios genéricos)
  - `data/tilesets/secondary/<lugar>/tiles.png` → **68 sets** incluyendo `celadon_city`, `saffron_city`, `cerulean_city`, `pewter_city`, `vermilion_city`, `department_store`, `restaurant_hotel`, `mart`, `pokemon_center`, etc.
- **Calidad:** máxima (es el arte original del juego, sin recompresión).
- **Formato:** PNG indexado 8×8 + `metatiles.bin` (define los 16×16) + `metatile_attributes.bin` (colisión/capa).
- **Descarga (raw, verificado HTTP 200):**
  - `https://raw.githubusercontent.com/pret/pokefirered/master/data/tilesets/primary/general/tiles.png`
  - `https://raw.githubusercontent.com/pret/pokefirered/master/data/tilesets/primary/building/tiles.png`
  - `https://raw.githubusercontent.com/pret/pokefirered/master/data/tilesets/secondary/celadon_city/tiles.png`
  - (patrón: `.../secondary/<lugar>/tiles.png`)
- **Repo:** https://github.com/pret/pokefirered
- **Cómo encaja:** NO es un drop-in directo. Estos PNG son 8×8 + metatiles; hay que **ensamblar** los metatiles 16×16 (con `porytiles` https://github.com/grunt-lucas/porytiles o `porymap` para exportar, o un script propio que lea `metatiles.bin`). El resultado: un spritesheet 16×16 limpio reindexable a `fila*N+col`, sustituyendo `rse-tileset.png`. **Es la base "correcta" para un Madrid de aspecto FRLG urbano.**

### A2 ⭐ The Spriters Resource — FRLG Tileset 1 & 2 (RECOMENDADO como vía rápida)
- **Qué es:** sheets de tileset FRLG ya **compuestos** (terreno + estructuras alineadas a rejilla).
- **Calidad:** alta, pixel-perfect, rejilla regular.
- **Formato:** PNG grande, tiles alineados a 16×16.
- **Páginas (descarga vía botón "Download Sheet" en cada página):**
  - Tileset 1: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3862/
  - Tileset 2: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3863/
  - Tileset (extra): https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3870/
  - Índice FRLG: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/
- ⚠️ **Nota descarga:** spriters-resource bloquea fetch automático (HTTP 403 a bots). Hay que descargar con navegador real o `playwright` MCP (UA de navegador). El botón "Download Sheet" sirve el PNG desde `https://www.spriters-resource.com/resources/sheets/.../<id>.png`.
- **Cómo encaja:** vía más rápida → cortar el PNG a celdas 16×16, generar un spritesheet con el mismo esquema `frame = fila*cols+col` y actualizar el índice de paleta. Compatible directo con el render de 3 capas del proyecto.

### A3 — Gracidea RSE (lo que YA tenemos)
- `resources-inbox/gracidea/copyrighted/textures/rse/tileset.png` — es el origen del actual `rse-tileset.png`. Sirve de fallback / referencia de mapeo de GIDs. RSE es más "campestre"; FRLG (A1/A2) viste mejor una ciudad como Madrid.

**Veredicto (a):** usar **A2 (Spriters FRLG)** para entregar rápido un upgrade visible, y migrar a **A1 (pret)** como base canónica cuando haya tiempo para montar el pipeline de metatiles.

---

## (b) SPRITES DE PERSONAJES OVERWORLD (caminar en el mapa) — para los personajes de Marcelino

### B1 ⭐ Eevee Expo — "Accurate FRLG-style NPC Megapack" (SoulfulLex)
- **URL:** https://eeveeexpo.com/resources/823/  · descarga: https://eeveeexpo.com/resources/823/download (MediaFire)
- **Qué es:** megapack de **NPCs overworld + battle sprites + iconos** convertidos a estilo FRLG coherente. Cientos de clases (Lass, Psychic, Cue Ball, Aroma Lady, etc.) de Gen 1–5 unificadas en estética FRLG.
- **Calidad:** alta y, sobre todo, **consistente** (mismo estilo) — clave para que los personajes de Marcelino no desentonen.
- **Formato:** estructura Pokémon Essentials (RMXP): `Graphics/Characters` = OW NPCs (charsets multi-frame), `Graphics/Trainers`, `Graphics/Pictures`. PNGs.
- **Licencia:** "99.9% hechos por otros", créditos extensos incluidos, sin licencia formal → uso fan no comercial OK para este proyecto privado; conservar el `credits.txt`.
- **Cómo encaja:** los charsets de Essentials son rejillas de poses direccionales. Recortar las 3 frames × 4 direcciones de cada personaje y **re-empacar con TexturePacker** al mismo `npcs.json` (frames `<char>_<dir>_<0|1|2>`). Drop-in para el atlas `chars`/`npcs` actual.

### B2 ⭐ The Spriters Resource — FRLG "Overworld NPCs" + "Player Sprites"
- **Overworld NPCs:** https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3698/
- **Player Sprites (protagonista Red/Leaf):** https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/52432/
- **Pokémon overworld (followers/encuentros):** https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3711/
- **Qué es:** los OW oficiales FRLG. Dimensiones ~16×16/16×24 por frame, mismas proporciones (14–16×20–24) que el atlas actual.
- **Formato:** PNG sheet. ⚠️ descarga con navegador/`playwright` (403 a bots).
- **Cómo encaja:** ideal para el **protagonista** y NPCs base; recortar frames → re-empacar al `npcs.json`. Mismas dimensiones que `may_<dir>_<n>` → mínima fricción.

### B3 — spherical-ice "Accurate FireRed Overworld Sprite Resource" (DeviantArt / PokéCommunity)
- DeviantArt: https://www.deviantart.com/spherical-ice/art/The-Accurate-FireRed-Overworld-Sprite-Resource-584543479
- Hilo: https://www.pokecommunity.com/threads/the-accurate-firered-overworld-sprite-resource.361337/
- **Qué es:** OW de NPCs hechos para coincidir con los battle sprites por clase de entrenador. Útil si quieres que cada personaje de Marcelino tenga un OW + un retrato/battler a juego.
- **Cómo encaja:** complementa B1/B2 para variedad de clases específicas.

**Veredicto (b):** **B1 (Megapack)** como banco principal de personajes (volumen + consistencia) + **B2 (Player Sprites FRLG)** para el protagonista. Pipeline: recortar → TexturePacker → `npcs.json`.

---

## (c) EDIFICIOS MADRILEÑOS (fachadas/estructuras)

> No existen "tiles de Madrid" prefabricados. La estrategia es **componer fachadas estilo FRLG urbano** (que ya son edificios altos de ciudad, mucho más "europeos/urbanos" que RSE) y customizar detalles (toldos, ladrillo, balcones) para evocar Madrid.

### C1 ⭐ pret/pokefirered — tilesets de ciudad grande
- `data/tilesets/secondary/celadon_city/tiles.png` (Celadon = la ciudad más grande/urbana de Kanto → mejor base para "Gran Vía / Madrid")
- también: `saffron_city`, `cerulean_city`, `department_store`, `restaurant_hotel`, `condominiums`, `museum`, `game_corner`, `pokemon_center`, `mart`
- Raw: `https://raw.githubusercontent.com/pret/pokefirered/master/data/tilesets/secondary/celadon_city/tiles.png` (y patrón análogo).
- **Cómo encaja:** fachadas multi-tile urbanas; ensamblar metatiles → componer bloques de edificio (igual que el GDD describe para Centro Pokémon/tienda).

### C2 ⭐ Ekat's Public Gen 3 Tilesets (Eevee Expo)
- **URL:** https://eeveeexpo.com/resources/621/ (MediaFire, 15k+ descargas, 5.0★)
- **Qué es:** **81 sets** públicos Gen3 (tiles, autotiles, tilesets) — outdoor, towns e **interiores**. Gran banco de edificios/props para un Madrid amplio con muchos interiores (bares, pisos, tiendas).
- **Formato:** PNG a **1×** (la doc avisa: "resize a 2× para Essentials"). Para Phaser a 16×16 nativo, el 1× puede servir tal cual o escalar nearest-neighbor.
- **Licencia:** distribución pública + `credits.txt` con 24+ autores → respetar atribución.
- **Cómo encaja:** seleccionar sets de edificios/interiores, normalizar a rejilla 16×16, fusionar paleta con el tileset base.

### C3 — Eevee Expo · Graphics (categoría completa) y DeviantArt PokemonFanGames
- Categoría tiles Eevee Expo: https://eeveeexpo.com/resources/categories/6/
- DeviantArt (359 works, interiores incl.): https://www.deviantart.com/pokemonfangames/gallery/28808269/tiles-and-tilesets
- Hilo tilesets públicos: https://www.pokecommunity.com/threads/public-free-available-tilesets-to-use-for-my-game.438452/
- **Cómo encaja:** cantera de props/edificios extra (farolas, kioscos, fuentes → muy "Madrid") para customizar.

**Veredicto (c):** base = **C1 celadon_city (pret)** para fachadas urbanas FRLG + **C2 Ekat** para volumen de edificios/interiores + customización manual de detalles madrileños (toldos rojos, ladrillo, fuente de Cibeles estilizada como landmark).

---

## (d) UI DE COMBATE (HUD de batalla)

### D1 ⭐ pret/pokefirered — `graphics/battle_interface/` (RECOMENDADO)
- **Qué es:** la UI de batalla FRLG **original** como PNGs sueltos. Confirmado vía API:
  - `healthbox_singles_player.png`, `healthbox_singles_opponent.png`, `healthbox_doubles_*`, `healthbox_elements.png`
  - `healthbar.pal`, `healthbox.pal` (paletas)
  - `level_up_banner.png`, `party_summary_bar.png`
  - `textbox.png` (caja de diálogo/combate)
- **Descarga (raw directo):**
  - `https://raw.githubusercontent.com/pret/pokefirered/master/graphics/battle_interface/healthbox_singles_player.png`
  - `https://raw.githubusercontent.com/pret/pokefirered/master/graphics/battle_interface/healthbox_elements.png`
  - `https://raw.githubusercontent.com/pret/pokefirered/master/graphics/battle_interface/textbox.png`
  - (patrón: `.../graphics/battle_interface/<archivo>.png`)
- **Formato:** PNG indexado pequeño (cada archivo < 5 KB) + `.pal`.
- **Cómo encaja:** drop-in casi directo → cargar como imágenes/spritesheets en la BattleScene; las barras de HP/XP se animan recortando `healthbox_elements`. Sin pipeline de metatiles. **El recurso de UI de combate más limpio que existe.**

### D2 — The Spriters Resource — FRLG Battle Backgrounds + Emerald
- Battle Backgrounds FRLG: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3866/
- Índice Emerald (HUD/animaciones alternativas): https://www.spriters-resource.com/game_boy_advance/pokemonemerald/
- **Qué es:** fondos de combate + (en Emerald) HUD y animaciones. Complementa D1 con escenarios de batalla.
- ⚠️ descarga con navegador/`playwright` (403 a bots).
- **Cómo encaja:** fondos de batalla (suelo + plataformas) detrás del HUD de D1.

**Veredicto (d):** **D1 (pret battle_interface)** para el HUD (limpio, raw, drop-in) + **D2 (Spriters)** para fondos de combate.

---

## Comparativa fuentes de descarga

| Fuente | Acceso programático | Formato | Limpieza legal | Notas |
|--------|---------------------|---------|----------------|-------|
| **pret/pokefirered (GitHub raw)** | ✅ HTTP 200 directo (`raw.githubusercontent`) | PNG 8×8+metatiles (tiles) / PNG directo (NPC/UI) | Decompilación, arte © TPC; uso fan privado | Mejor para versionar; tiles requieren ensamblado |
| **The Spriters Resource** | ⚠️ 403 a bots → usar `playwright` MCP / navegador | PNG sheet pre-compuesto 16×16 | Rip de assets © TPC; uso fan | Vía rápida para tiles ya alineados |
| **Eevee Expo (Megapack / Ekat)** | ⚠️ enlaces MediaFire (descarga manual/navegador) | PNG (Essentials / 1×) | Packs comunitarios, créditos incl. | Volumen y consistencia FRLG |
| **DeviantArt** | ⚠️ descarga manual | PNG | Mixto, respetar autores | Cantera de props extra |
| **gracidea (ya clonado)** | ✅ local | PNG/WebP + TPS | AGPL código / © TPC sprites | Origen del set actual |

---

## Plan de integración sugerido (sin tocar código aún)

1. **Quick win visual (1 sesión):** descargar **A2 Spriters FRLG Tileset 1+2** (vía `playwright` MCP con UA de navegador) → cortar a 16×16 → reemplazar `rse-tileset.png` manteniendo el esquema `fila*cols+col`. Cambio visual inmediato y grande (RSE→FRLG urbano).
2. **Personajes (1 sesión):** **B1 Megapack** + **B2 Player Sprites** → recortar OW de cada personaje de Marcelino → TexturePacker → regenerar `npcs.json` (mismos nombres `<char>_<dir>_<n>`).
3. **UI combate (rápido):** **D1 pret battle_interface** → `curl` directo de los PNG raw → cargar en BattleScene. Sin pipeline.
4. **Base canónica (cuando haya tiempo):** montar pipeline `pret` → `porytiles`/script `metatiles.bin` → spritesheet 16×16 con tilesets de ciudad (`celadon_city` para Madrid) y edificios → migrar desde A2 a A1.
5. **Edificios madrileños:** componer fachadas FRLG (C1) + props de **C2 Ekat** + retoques manuales (toldos, ladrillo, landmark tipo Cibeles).

### Caveats a documentar en el repo
- **Legal:** todos los assets de Pokémon son © Nintendo/Game Freak/TPC. Uso fan **privado no comercial** autorizado por Marcelino; **repo privado**, sin distribución pública, conservar `credits.txt` de packs comunitarios. El branding "Comprar Plantilla 100€" del CLAUDE.md **NO** aplica a este proyecto (no es vendible con assets de Pokémon).
- **Técnico:** los `tiles.png` de pret son 8×8 + metatiles, NO spritesheets 16×16 listos. Spriters/Eevee SÍ son cortables directo.
- **AGPL gracidea:** si se reutiliza **código** de gracidea sirviéndolo por red, obliga a publicar fuente. Reutilizar solo **assets** (que de todos modos son © TPC) no arrastra AGPL del código.

---

## Apéndice — todas las URLs

**pret (GitHub, raw directo):**
- Repo: https://github.com/pret/pokefirered
- Tileset general: `https://raw.githubusercontent.com/pret/pokefirered/master/data/tilesets/primary/general/tiles.png`
- Tileset building: `https://raw.githubusercontent.com/pret/pokefirered/master/data/tilesets/primary/building/tiles.png`
- Ciudad (Celadon): `https://raw.githubusercontent.com/pret/pokefirered/master/data/tilesets/secondary/celadon_city/tiles.png`
- NPCs OW (carpeta): `https://github.com/pret/pokefirered/tree/master/graphics/object_events/pics/people`
- UI combate (carpeta): `https://github.com/pret/pokefirered/tree/master/graphics/battle_interface`
- Tooling metatiles: https://github.com/grunt-lucas/porytiles · https://huderlem.github.io/porymap/

**The Spriters Resource (descargar con navegador/playwright):**
- Índice FRLG: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/
- Tileset 1: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3862/
- Tileset 2: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3863/
- Tileset extra: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3870/
- Overworld NPCs: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3698/
- Player Sprites: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/52432/
- Pokémon overworld: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3711/
- Battle backgrounds: https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/asset/3866/
- Índice Emerald: https://www.spriters-resource.com/game_boy_advance/pokemonemerald/

**Eevee Expo (MediaFire):**
- Accurate FRLG-style NPC Megapack: https://eeveeexpo.com/resources/823/
- Ekat's Public Gen 3 Tilesets: https://eeveeexpo.com/resources/621/
- Categoría Graphics: https://eeveeexpo.com/resources/categories/6/

**DeviantArt / PokéCommunity:**
- spherical-ice OW resource: https://www.deviantart.com/spherical-ice/art/The-Accurate-FireRed-Overworld-Sprite-Resource-584543479
- PokemonFanGames tiles (interiores): https://www.deviantart.com/pokemonfangames/gallery/28808269/tiles-and-tilesets
- Tilesets públicos (hilo): https://www.pokecommunity.com/threads/public-free-available-tilesets-to-use-for-my-game.438452/
</content>
</invoke>
