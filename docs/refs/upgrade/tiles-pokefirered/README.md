# Tiles — pokefirered (FRLG) overworld tilesets

Scope: `tiles-pokefirered`. Fuente: [pret/pokefirered](https://github.com/pret/pokefirered) `data/tilesets/` (master).
Solo investigación + descarga + conversión. NO se tocó `src/`. Todo vive aquí dentro.

## TL;DR — qué usar

Los assets directamente usables son los **`game-ready/*_metatiles_colored.png`**:
hojas de **metatiles 16x16 ya coloreados** (color FRLG real, fondo transparente,
sin antialiasing, sin spacing/margin). Encajan con el formato del juego:
spritesheet 16x16, `index = fila*columnas + col`. Cada hoja tiene **8 columnas** (128 px de ancho).

| Asset | Para qué | Metatiles |
|---|---|---|
| `general_metatiles_colored.png` | **Base overworld exterior** (hierba, caminos, agua, árboles, vallas, carteles, ledges, Centro Pokémon/Mart exterior) | 640 |
| `building_metatiles_colored.png` | **Interiores genéricos** (camas, TV, mesas, estanterías, plantas, escaleras, alfombras, cuadros, PC) — casas de los 12 personajes | 640 |
| `pokemon_center_metatiles_colored.png` | Interior del Centro Pokémon (máquina de curación, PCs, mostrador) | 255 |
| `pallet_town_metatiles_colored.png` | Pueblo pequeño (tejados rojos/azules, vallas, carteles) | 89 |
| `viridian_city_metatiles_colored.png` | Ciudad pequeña | 95 |
| `pewter_city_metatiles_colored.png` | Ciudad (gris/montaña) | 79 |
| `cerulean_city_metatiles_colored.png` | Ciudad (agua/puentes) | 134 |
| `vermilion_city_metatiles_colored.png` | Ciudad portuaria | 168 |
| `celadon_city_metatiles_colored.png` | **Gran ciudad** (grandes almacenes, fuentes, gimnasio) — la más "urbana", ideal para un Madrid grande | 240 |
| `lavender_town_metatiles_colored.png` | Pueblo oscuro/torre | 218 |
| `saffron_city_metatiles_colored.png` | Ciudad grande (edificios altos, Silph-style) | 200 |
| `mart_metatiles_colored.png` | Interior de tienda | 67 |
| `lab_metatiles_colored.png` | Interior de laboratorio | 175 |

Todas son **128 px de ancho**, RGBA, 16x16/tile, sin spacing. Verificadas con Pillow (ver tabla al final).

---

## Formato de origen (importante)

pret/pokefirered NO guarda PNGs de color directos. Cada tileset es:

- **`tiles.png`** — atlas indexado 4bpp de teselas 8x8, **16 teselas de ancho**, con una
  **paleta GRIS placeholder** incrustada (blanco→negro). La geometría es real; el color NO.
- **`palettes/NN.pal`** — 16 ficheros JASC-PAL con los **colores GBA reales**. Reparto de slots:
  el tileset **primary** posee paletas `0..6`, el **secondary** posee `7..12`.
  El color **(255,0,255) magenta = transparente**.
- **`metatiles.bin`** — array de metatiles de 16 bytes. Cada metatile 16x16 = **8 entradas**
  (4 capa inferior + 4 capa superior, teselas 8x8). Cada entrada es un uint16 little-endian:
  - bits 0-9 = índice de tesela (`0..639` primary, `640+` secondary)
  - bit 10 = x-flip · bit 11 = y-flip · bits 12-15 = slot de paleta (0..15)

Por eso **una sola paleta NO colorea bien una hoja**: cada metatile mezcla teselas con
paletas distintas (p.ej. copa de árbol vs hierba). La conversión correcta exige leer
`metatiles.bin` y aplicar la paleta correcta por tesela. Eso es exactamente lo que hace
`render_metatiles.py` y lo que produce los `*_metatiles_colored.png`.

### Composición primary + secondary
Un mapa real carga **primary (paletas 0-6, teselas 0-639) + secondary (paletas 7-12, teselas 640+)**.
- Tilesets de exterior (ciudades/pueblos) → parent primary = `general`.
- Tilesets de interior (centro, mart, lab) → parent primary = `building`.

---

## Estructura de carpetas

```
tiles-pokefirered/
├── README.md                  ← este catálogo
├── render_metatiles.py        ← script reproducible (compone tiles+pal+metatiles → PNG color)
├── raw-tiles/                 ← tiles.png originales (indexados, paleta gris) — NO usables en color directo
├── palettes/<tileset>/NN.pal  ← paletas JASC-PAL reales por tileset
├── meta/<tileset>_metatiles.bin ← definición de metatiles (binario)
├── game-ready/                ← ★ ASSETS USABLES (metatiles 16x16 coloreados)
│   ├── *_metatiles_colored.png   ← los buenos (composición completa, todas las paletas)
│   ├── general_pal00_terrain.png ← variantes single-palette del primary (correctas, biomas)
│   ├── general_pal01.png / pal02.png  (variante roca/nieve, otra)
│   ├── building_pal00.png / pal01.png (madera vs otra)
│   └── secondary-allpal/         ← renders por-paleta de secondaries (diagnóstico/avanzado)
```

### Sobre `game-ready/secondary-allpal/`
Son renders de cada tileset secondary con **cada uno de sus slots de paleta reales** por
separado. NO son finales (cada uno solo colorea bien la fracción de teselas que usa ese slot).
Útiles solo si quieres recolorear/extraer una sub-zona concreta. Para uso normal, ignóralos
y usa los `*_metatiles_colored.png`.

### Variantes single-palette del primary (sí usables)
- `general_pal00_terrain.png` — paleta de terreno base (hierba/camino/agua verdes correctos).
- `general_pal01.png`, `general_pal02.png` — mismas teselas con paleta roca/cueva/nieve, etc.
- `building_pal00.png`, `building_pal01.png` — muebles con tinte distinto (madera vs gris/azul).

Estos son atlas de teselas **8x8** (128xN), no metatiles. Útiles como referencia de paleta
o si tu pipeline reensambla metatiles por su cuenta. Para drop-in directo, prefiere los metatiles.

---

## Cómo integrarlo en el juego (Phaser 16x16)

El juego ya carga un spritesheet `'tiles'` 16x16 sin spacing (`mapRenderer.js`:
`addTilesetImage('tiles','tiles',TILE,TILE,0,0)`, índice = `fila*cols + col`).
Los `*_metatiles_colored.png` siguen exactamente ese formato (8 columnas).

Opciones de integración (decisión del orquestador, NO ejecutada aquí):
1. **Reemplazo directo**: cargar `general_metatiles_colored.png` como nuevo `tiles` exterior y
   `building_metatiles_colored.png` para interiores; remapear los índices de `MAPS` al nuevo
   orden de metatiles (los índices cambian respecto al tileset RSE actual).
2. **Atlas combinado**: pegar general (640) + los secondaries que se usen en un único sheet
   más ancho y ajustar `columns` en el renderer.

> El tileset actual del proyecto es RSE (`public/assets/tilesets/rse-tileset.png`, 2032x800,
> 113 col, spacing/margin 2). Migrar a FRLG cambia el mapeo de índices: hay que reconstruir
> las matrices de `MAPS`/`gyms`/`interiors`. Esto NO es parte de este scope (solo assets).

---

## Verificación (Pillow) — honestidad

Todos los `*_metatiles_colored.png` verificados: 128 px ancho, RGBA, 30-73 colores,
transparencia presente, no vacíos. Ejemplos:

| Asset | size | colores | transp |
|---|---|---|---|
| general_metatiles_colored.png | 128x1280 | 52 | 0% (exterior sólido) |
| building_metatiles_colored.png | 128x1280 | 40 | 3.8% |
| pokemon_center_metatiles_colored.png | 128x512 | 66 | 0.4% |
| celadon_city_metatiles_colored.png | 128x480 | 65 | 0% |
| lavender_town_metatiles_colored.png | 128x448 | 73 | 2.7% |

### Limitaciones honestas
- Los `raw-tiles/*.png` **NO son usables en color** (paleta gris placeholder). Solo input para el script.
- Los `secondary-allpal/*` son parciales (un slot de paleta colorea solo parte de la hoja).
- Algunos slots de paleta secundarios (06/07 en pewter/saffron) son **placeholders azules**
  no usados; el script ya usa el slot real correcto. Documentado, no es bug.
- Migrar el juego de RSE→FRLG requiere remapear índices de mapas (fuera de scope).

## Reproducir
```bash
cd docs/refs/upgrade/tiles-pokefirered
python3 render_metatiles.py   # regenera todo game-ready/*_metatiles_colored.png
```
