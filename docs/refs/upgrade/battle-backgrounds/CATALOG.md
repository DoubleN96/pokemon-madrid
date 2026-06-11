# Battle Backgrounds — FRLG (pret/pokefirered)

Fondos de combate del juego **Pokémon FireRed/LeafGreen**, extraídos de
`pret/pokefirered` (`graphics/battle_terrain/`) y compuestos a imagen plana
lista para usar en Phaser.

- **Fuente:** https://github.com/pret/pokefirered (rama `master`), licencia abierta de descompilación (uso de assets como referencia/fan-game; FRLG es propiedad de Nintendo/Game Freak — proyecto fan, no comercial).
- **Fecha de extracción:** 2026-06-11
- **Estilo:** pixel-art GBA 4bpp, sin antialiasing. Cada fondo encaja perfecto con el lienzo 240x160 del proyecto (la escena de combate ocupa 256x112 en la parte superior; el cuadro de diálogo va debajo).

---

## Cómo está hecho cada fondo (importante)

En FRLG el fondo de combate **NO** es una sola imagen. Cada terreno ship-ea:

| Archivo | Qué es |
|---------|--------|
| `terrain.png` | Hoja de tiles 8x8 indexada (64px ancho = 8 tiles/fila), 4bpp |
| `terrain.bin` | Tilemap GBA (entradas de 2 bytes: tile idx bits 0-9, hflip bit 10, vflip bit 11, paleta bits 12-15) |
| `terrain.pal` | Paleta JASC-PAL de 48 colores (3 sub-paletas de 16) |
| `anim.png` / `anim.bin` | Tiles animados (agua que se mueve, etc.) — NO incluidos en el compuesto estático |

**Yo ya hice el trabajo:** decodifiqué el tilemap y compuse la escena visible
(256x112) a PNG plano. Los PNG de `backgrounds/` son **directamente usables**:
cargas el PNG como fondo de la BattleScene y listo. No necesitas el motor de
tiles del GBA.

---

## Assets generados (todos verificados con Pillow: dimensiones + no vacíos)

### `backgrounds/` — USAR ESTOS (game-ready, 256x112, plano)
10 PNG, uno por terreno. Resolución nativa GBA. Escala con `NEAREST`/pixelArt en Phaser.

| Fichero | Terreno FRLG | Aspecto | Uso en Pokémon Madrid |
|---------|--------------|---------|------------------------|
| `grass.png` | GRASS | Campo verde claro, 2 bases verdes ovaladas | **Combate en parque/césped** (Retiro, zonas verdes) |
| `longgrass.png` | LONG_GRASS | Verde con hierba alta, bases con matojos | Hierba alta / descampados |
| `building.png` | BUILDING | Suelo pavimento gris, bases redondas claras | **Combate en CIUDAD/CALLE** (ver recomendación) |
| `indoor.png` | INDOOR_1 | Suelo interior liso, bases con rejilla | Combate en interior (metro, edificio) |
| `cave.png` | CAVE | Suelo rocoso marrón, bases de roca | Túneles / metro / aparcamientos |
| `mountain.png` | MOUNTAIN | Tierra clara/montaña, bases pálidas | Zonas de tierra / obras |
| `sand.png` | SAND | Arena amarilla, bases de arena | Arenero / zonas áridas |
| `water.png` | WATER | Agua azul, bases azules onduladas | Combate sobre agua (Manzanares, fuentes) |
| `pond.png` | POND | Charca/orilla, base mixta tierra-agua | Estanque (Casa de Campo) |
| `underwater.png` | UNDERWATER | Fondo submarino azul oscuro | Submarino (raro, opcional) |

### `backgrounds-2x/` — versión 2x (512x224, NEAREST)
Mismos fondos escalados x2 con vecino-más-cercano (sin blur). Útil si tu pipeline
prefiere assets pre-escalados; **recomiendo NO usarlos** y escalar en runtime con
`pixelArt: true` (igual de nítido, menos peso).

### `bases/` — bases de plataforma recortadas (128x56, referencia)
Recorte de cada disco donde se posa el Pokémon (`*_enemy_base.png` arriba-derecha,
`*_player_base.png` abajo-izquierda). **OJO:** incluyen el suelo del campo alrededor
(en FRLG la base está "horneada" en el campo, no es un sprite con transparencia).
Útiles como REFERENCIA de tamaño/forma de la base, NO como sprite transparente
independiente. Si quieres bases flotantes con alpha, hay que recortar el disco a mano.

### `source-tilesets/` — hojas de tiles originales (64x{80..104})
Las `terrain.png` originales sin componer. Solo si quieres re-componer tú mismo o
usar tiles sueltos. NO son fondos usables tal cual (son tiles desordenados).

### `indoor-variants/` — variantes de paleta indoor (256x112, APROXIMADAS)
FRLG reusa la misma geometría `indoor` con distintas paletas para gym/leader/
champion/etc. Generé `plain`, `gym`, `leader`, `champion`, `1`, `2` remapeando
la paleta por índice. **HONESTIDAD:** es una aproximación — el remapeo real del GBA
es por-tile con 3 sub-paletas, así que las diferencias salen sutiles. Para
producción usa `backgrounds/indoor.png` o `backgrounds/building.png` (esos son fieles).

---

## RECOMENDACIÓN: qué fondo usar (ciudad vs hierba)

Esto está **confirmado leyendo `src/battle_bg.c` del juego** (la tabla
`sBattleTerrainTable` y la función `DrawBattleEntryBackground`):

### Combate en CIUDAD / CALLE (Madrid urbano) → **`building.png`**
En FRLG, cuando combates sobre una metatile de pueblo/ciudad/carretera, el motor
carga `BATTLE_TERRAIN_BUILDING`. Es el fondo urbano por defecto (pavimento).
También es el que usa el juego para combates de gimnasio/líder/campeón y
torre-de-combate. → **Para casi todos los combates de Pokémon Madrid (calles),
este es el correcto.**

### Combate en HIERBA / PARQUE → **`grass.png`**
`BATTLE_TERRAIN_GRASS` se usa en encuentros sobre césped normal. Para combates en
parques verdes (Retiro, zonas ajardinadas). Si la hierba es alta → `longgrass.png`.

### Combate INTERIOR (metro, edificios, locales) → **`indoor.png`**
`BATTLE_TERRAIN_INDOOR_1` — suelo de interior. Para combates dentro de edificios
o el metro.

### Combate en TÚNEL / SUBTERRÁNEO → **`cave.png`**
`BATTLE_TERRAIN_CAVE`. Encaja para túneles del metro, aparcamientos subterráneos.

### Resto (agua, arena, montaña, charca, submarino)
Casos específicos de Madrid (río Manzanares → `water.png`/`pond.png`; obras/tierra
→ `mountain.png`/`sand.png`). Úsalos solo donde el entorno lo pida.

**Regla práctica para empezar YA:** usa `building.png` como fondo de combate por
defecto (la mayoría de Madrid es calle), y `grass.png` cuando el encuentro sea en
zona verde. Con esos dos cubres el 90% del juego.

---

## Layout de la escena (para colocar Pokémon en Phaser)

En el PNG de 256x112 (mapéalo a tu lienzo 240x160 anclado arriba):

- **Base del ENEMIGO**: disco arriba-derecha. Centro aprox. en x≈168, y≈48 (sobre 256x112).
  El Pokémon enemigo se dibuja encima de ese disco.
- **Base del JUGADOR**: disco abajo-izquierda, más grande/cercano. Centro aprox.
  x≈56, y≈96. El Pokémon del jugador (de espaldas) va encima.
- El cuadro de diálogo del combate cubre la franja inferior (no hace falta arte ahí).

(Coordenadas aproximadas medidas sobre el compuesto; ajústalas al ojo en el juego.)

---

## Notas de calidad / lo que NO está

- **Tiles animados (`anim.*`) no aplicados:** el agua/lava animada queda estática en
  el compuesto. Para Madrid no es crítico. Si quieres olas animadas, hay que
  componer los frames de `anim.png` por encima (documentado, no hecho).
- **Bases transparentes independientes:** no existen como tal en FRLG (van horneadas
  en el campo). Las de `bases/` llevan el suelo de fondo. Para discos flotantes con
  alpha habría que recortar/redibujar.
- **Paletas indoor variantes:** aproximadas (ver arriba).
- Todo lo de `backgrounds/` y `backgrounds-2x/` es **fiel y directamente usable**.
