# Tilesets FRLG 16×16 — catálogo `tiles-gfxlib`

Selección de los **mejores tilesets Fire Red / Leaf Green 16×16** de la Pokémon
Graphics Library, listos para subir la calidad visual de Pokémon Piso (exteriores
de ciudad + interiores de casas, tiendas/bares, gimnasios, centros).

**Fuente:** `Pokemon RPGM MV Ultimate Resource Pack V1.0 (Normal Sized)` (en
`/tmp/gfxlib/extracted/...`), subcarpeta `img/tilesets/FRLG/`. Es el mismo material
16×16 que la carpeta `docs/refs/gfxlib/mediafire-16px` pero **completo y mejor
organizado** (el mediafire solo trae 6 láminas sueltas y con nombres confusos —
p. ej. `FRLG_Outside_B_buildings.png` en realidad son árboles/naturaleza, no
edificios). Aquí están todas las láminas de cada categoría.

Todo el material es **pixel-art puro 16×16, fondo transparente real (alpha=0),
SIN antialiasing** (44–268 colores únicos por lámina, paleta indexada GBA).
Verificado con Pillow (dimensiones, grid, transparencia, no-vacío) — ver tabla abajo.

---

## ⚠️ Cómo encaja en nuestro sistema (LEER ANTES DE INTEGRAR)

El juego NO usa estas láminas tal cual. Carga **una sola spritesheet empaquetada**:

```
assets/tilesets/rse-tileset.png   →  2032×800 px  =  127 columnas × 50 filas  =  6350 frames
frame (índice de tile) = fila*127 + col     (mapRenderer.js / BootScene.js)
```

Los mapas en `src/world/maps.js` referencian tiles por ese **índice de frame** sobre
ese atlas concreto (derivado de gracidea RSE). Por tanto, para USAR estas láminas FRLG
hay que **repackearlas dentro del mismo atlas de 127 columnas** (o crear un atlas nuevo
de 127-col y reescribir los índices de los mapas). Eso es trabajo de `src/` que NO
hago aquí. Este catálogo deja el material **game-ready a nivel de píxel** (16×16,
transparente, sin AA) y documenta qué contiene cada lámina.

### Las láminas se dividen en 2 tipos

| Tipo | Carpetas | ¿Directamente usable? |
|------|----------|------------------------|
| **Flat (B/C/D/E + A5)** | `outside-city/`, `inside-*`, `gyms/` | ✅ SÍ. Grid plano 16×16. Cada celda = 1 tile. Se cortan y se reinyectan en el atlas 127-col tal cual. |
| **Autotiles (A1/A2/A4)** | `_autotiles-need-conversion/` | ⚠️ NO directo. Formato autotile RPGM (mini-tiles 8×8 comprimidos para bordes/esquinas). Hay que **expandirlos** a tiles 16×16 (blob 47-tiles) antes de usar. Documentado, no convertido. |

- **B/C/D/E** = tiles de objeto (edificios, muebles, decoración) → grid plano, usar directo.
- **A5** = tiles "normales" (suelos/floors) → grid plano 8 col × 16 filas, usar directo.
- **A1** = autotiles animados (agua, fuente) → conversión.
- **A2** = autotiles de suelo/terreno (césped, camino, arena) → conversión.
- **A4** = autotiles de pared (wall tops + lados) → conversión.

---

## Inventario verificado (Pillow)

Todas: grid 16×16 ✅, no-vacías ✅, sin antialiasing ✅, fondo transparente ✅
(salvo los A5 de suelo que son opacos a propósito).

| Carpeta / archivo | px | tiles | uso |
|---|---|---|---|
| **outside-city/** | | | **exteriores de ciudad** |
| frlg_outside_C_city-buildings.png | 256×256 | 256 | ⭐ PC, Mart, Gym, Game Corner, S.S.Anne |
| frlg_outside_D_city-extra.png | 256×256 | 256 | edificios extra, fachadas, tejados |
| frlg_outside_B_nature-trees.png | 256×256 | 256 | árboles, arbustos, rocas, cuevas (parques) |
| frlg_outside_E1..E4_decor.png | 256×256 | 256 c/u | letreros, farolas, vallas, detalles urbanos |
| frlg_outside_A5_ground-flat.png | 128×256 | 128 | suelos planos (acera/pavimento/césped base) |
| frlg_environment_fullset.png | 912×832 | 2964 | ⭐ lámina FRLG grande on-grid: árboles, flores, rocas, agua, caminos, vallas, ledges, señales (de godot-tilesets, ripped) |
| **inside-houses/** | | | **casas** |
| frlg_houses_B_furniture.png | 256×256 | 256 | ⭐ camas, mesas, TV, plantas, estanterías, cocina, escaleras |
| frlg_houses_C/D_furniture2/3.png | 256×256 | 256 c/u | más mobiliario doméstico |
| frlg_houses_A5_floors-flat.png | 128×256 | 128 | suelos de casa (madera, baldosa, alfombra) |
| **inside-shops-bars/** | | | **tiendas, bares, café, PC counters** |
| frlg_shops_B_furniture.png | 256×256 | 256 | ⭐ mostradores, estanterías Mart, máquinas, ordenadores, máquina de curar |
| frlg_shops_C/D/E_furniture.png | 256×256 | 256 c/u | barras, neveras, vitrinas, mobiliario de local |
| frlg_shops_A5_floors-flat.png | 128×256 | 128 | suelos de local (azul PC, madera Mart, moqueta) |
| **inside-buildings/** | | | **interiores de PC / Mart (planta completa)** |
| frlg_buildings_B_pc-mart.png | 256×256 | 256 | ⭐ máquina de curar PC, PC-box, sofás, mostrador, plantas |
| frlg_buildings_C/D/E.png | 256×256 | 256 c/u | variantes de mobiliario PC/Mart |
| frlg_buildings_A5_floors-flat.png | 128×256 | 128 | suelos PC/Mart |
| **gyms/** | | | **gimnasios** |
| frlg_gyms_B_arena.png | 256×256 | 256 | ⭐ suelos de arena, estatuas, tiles de puzzle, decoración |
| frlg_gyms_C/D.png | 256×256 | 256 c/u | más decoración de gimnasio |
| frlg_gyms_A5_floors-flat.png | 128×256 | 128 | suelos de gimnasio |
| **_autotiles-need-conversion/** | | | ⚠️ requieren expansión a blob 16×16 |
| frlg_outside_A1A/A1B_animated.png | 256×192 | — | agua/fuente animada (autotile) |
| frlg_outside_A2A/A2B_ground.png | 256×192 | — | césped/camino/arena (autotile de suelo) |
| frlg_houses_A2_floors-auto.png | 256×192 | — | suelos de casa (autotile) |
| frlg_houses_A4_walls.png | 256×240 | — | paredes (autotile de muro) |
| **_stamps-reference/** | | | ⚠️ NO es atlas de tiles |
| frlg_buildings_fabnt_STAMPS.png | 1096×1090 | — | sheet de edificios FRLG completos (PC, Mart, Gym, Game Corner, rascacielos, grandes almacenes, bloques de pisos) colocados con huecos. NO está en grid 16 limpio (1090 no es múltiplo de 16). Úsalo como **referencia/recortar edificios individuales a mano**, ideal para una ciudad tipo Madrid (torres modernas + bloques de pisos). |

⭐ = arrancar por aquí (máximo impacto visual).

---

## Recomendación de integración (orden por impacto)

1. **outside-city/frlg_outside_C_city-buildings.png** — da identidad de ciudad
   FRLG real (PC, Mart, Gym con sus carteles). Reemplaza fachadas pobres del atlas
   actual. Cortar las 256 celdas y asignarlas a un rango de frames libre del atlas
   127-col.
2. **inside-buildings/frlg_buildings_B_pc-mart.png** + **inside-shops-bars/frlg_shops_B**
   — interiores de Centro Pokémon y tiendas creíbles (mostradores, máquina de curar).
3. **inside-houses/frlg_houses_B** — mobiliario doméstico para las casas de los amigos.
4. **gyms/frlg_gyms_B** — arenas de gimnasio.
5. **Suelos A5** de cada categoría — bases planas (no autotile), usables directo.
6. **Autotiles A2 (suelos/terreno)** — SOLO si se quiere césped/camino con bordes
   bonitos; requiere script de expansión autotile→blob. Mientras tanto, seguir usando
   los suelos del atlas actual o los A5 planos.

## Notas / blockers

- **No es plug-and-play en `tiles`**: hay que repackear al atlas de 127 columnas y
  asignar/escribir índices de frame (trabajo en `src/`, fuera de mi alcance).
- **Autotiles** (`_autotiles-need-conversion/`): NO son grid plano. Necesitan un
  conversor RPGM-autotile → 47-blob 16×16 (existe lógica estándar; documentar como tarea).
- Los suelos **A5** SÍ son grid plano (8×16) aunque empiecen por "A": son los
  "normal tiles", no autotiles. Usar directo.
- Las láminas `docs/refs/godot-tilesets/pokemoncenter.png` y `house.png` son
  **maquetas de habitación ya montadas** (capturas de mapa), NO atlas de tiles → no
  usar como fuente de tiles; sirven solo de referencia de layout.
- `docs/refs/godot-tilesets/buildings.png` (copiada a `_stamps-reference/`) NO es un
  atlas de tiles 16×16 (no está en grid, edificios separados por huecos). Es la mejor
  fuente de **edificios urbanos modernos** (rascacielos, grandes almacenes, bloques de
  pisos) para un Madrid creíble, pero hay que recortar cada edificio a mano.
- `frlg_environment_fullset.png` SÍ está en grid 16×16 y es una excelente fuente única
  de naturaleza/terreno FRLG (más completa que `frlg_outside_B`); 658 colores es normal
  por ser una lámina grande consolidada, NO es antialiasing.
