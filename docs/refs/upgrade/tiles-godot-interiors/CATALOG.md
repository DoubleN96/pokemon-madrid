# Catálogo — Tilesets de INTERIOR 16x16 (scope: tiles-godot-interiors)

Investigación + descarga + conversión de tilesets de interior (casa, centro pokémon, tienda, bar) a PNG 16x16 pixel-art con fondo transparente, listos para Phaser (`frameWidth: 16, frameHeight: 16`).

**Regla cumplida:** no se tocó `src/`, no hay git/commit. Todo está SOLO en esta carpeta.

---

## TL;DR — qué integrar primero

1. **`frlg_house_objects_B_16x16.png`** y **`frlg_house_objects_C_16x16.png`** → muebles de CASA (camas, TV, estanterías, mesas, sofás, plantas, escaleras, PC). Calidad alta, transparente, alineado perfecto a 16px. **Directo a Phaser.**
2. **`frlg_shop_objects_B_16x16.png`** / **`C`** / **`D`** → mostradores de TIENDA (mart), mesa de enfermera + máquina curativa del CENTRO POKÉMON, neveras, vending, lab. **Directo a Phaser.**
3. Suelos y paredes (`*_A2_*`, `*_A4_*`) → necesitan tratamiento de **autotile RMMV** (ver sección "Necesita conversión").
4. Los `godot_*_interior_16x16.png` son **habitaciones pre-renderizadas** (suelo horneado), útiles como fondo de mapa entero, no como objetos sueltos.

---

## Assets DIRECTAMENTE usables (PNG 16x16, transparente, alineado)

Todos verificados con Pillow: `16grid=True`, `alpha=(0,255)` (transparencia real), no vacíos.
Fuente: *Pokémon RPGM MV Ultimate Resource Pack V1.0 (Normal Sized)* → carpeta `tilesets/FRLG/` (son los tiles GBA nativos a 16px, NO la versión 3x). Misma fuente que `docs/refs/gfxlib/mediafire-16px/` (subconjunto idéntico verificado).

| Archivo | Dim | Grid | Contenido | Sala destino |
|---|---|---|---|---|
| `frlg_house_objects_B_16x16.png` | 256x256 | 16x16 | Camas, TV/monitores, estanterías con libros, mesas, sillas, PC de casa, macetas/plantas, fregadero, escaleras, pizarra, cuadros, máquina curativa base | **Casa** |
| `frlg_house_objects_C_16x16.png` | 256x256 | 16x16 | Sofás, sillones, armarios, alfombras, vallas/barras, mostradores de madera, mesa octogonal, lámparas, comida en mesa | **Casa / Bar** |
| `frlg_house_objects_D_16x16.png` | 256x256 | 16x16 | Interiores de cabaña/madera, vigas, camas, esteras, paredes de madera, decoración rústica | **Casa rústica / Bar** |
| `frlg_shop_objects_B_16x16.png` | 256x256 | 16x16 | Estanterías de tienda (mart), mostrador del dependiente, mesa frontal del Centro Pokémon, gimnasio, escaleras | **Tienda / Centro** |
| `frlg_shop_objects_C_16x16.png` | 256x256 | 16x16 | PC/máquina curativa central, neveras, vending, equipo de laboratorio, ascensores, cartel "1F/2F" | **Centro / Tienda / Lab** |
| `frlg_shop_objects_D_16x16.png` | 256x256 | 16x16 | Mostrador de enfermera + máquina de curar, plataformas de gimnasio, bancos de museo, sofás de sala de espera, plantas | **Centro Pokémon / Gimnasio** |
| `frlg_shop_objects_E_16x16.png` | 256x256 | 16x16 | Escalera mecánica/ascensor, máquinas especiales (sparse) | Extra |

> **Cómo usar en Phaser:** `this.load.spritesheet('houseB', 'frlg_house_objects_B_16x16.png', { frameWidth: 16, frameHeight: 16 })`. Cada celda 16x16 es un tile. Objetos multi-tile (cama = 2x2, estantería = 1x2, máquina curativa = 2x2/2x3) se componen colocando varios frames contiguos — ver `_preview_house_objects_B_grid3x.png` para localizar índices.

### Preview de alineación
- `_preview_house_objects_B_grid3x.png` — el sheet de muebles de casa a 3x con rejilla cyan de 16px y fondo a cuadros. Confirma alineación pixel-perfect y transparencia. (Solo referencia visual, no es asset de juego.)

---

## Assets usables como FONDO DE HABITACIÓN (no objetos sueltos)

Origen: repo `joeythelantern/pokemon-godot-csharp`, `assets/levels/`. Recortados a rejilla limpia 16px usando los `margins` declarados en `resources/tilesets/level.tres`.

| Archivo | Dim | Grid | Qué es | Nota honesta |
|---|---|---|---|---|
| `godot_house_interior_16x16.png` | 208x160 | 13x10 | Salón de casa FRLG ya amueblado (alfombra central, mesa, plantas, TV, estanterías) | **Suelo horneado** (alpha=255 todo opaco). Es una habitación montada, NO una paleta. Sirve como mapa-fondo entero o para extraer tiles a mano, pero los objetos no se pueden separar limpio del suelo. |
| `godot_pokemoncenter_interior_16x16.png` | 240x176 | 15x11 | Centro Pokémon 1F ya montado (mostrador, PCs, máquina curativa, sofás) | Igual: opaco/horneado. Fondo de escena, no paleta. |

> Estos dos eran `house.png` (215x166) y `pokemoncenter.png` (257x195) con margen de import. `level.tres` declara `house margins=(4,1)`, `pokemoncenter margins=(8,8)`, region 16x16, sin separación → recorté a 208x160 y 240x176 (16-alineado). Los originales sin tocar siguen en `docs/refs/godot-tilesets/`.

---

## Necesita CONVERSIÓN antes de usar (autotiles RMMV)

Copiados con sufijo `_AUTOTILE` para que NO se usen tal cual. Son sheets de **suelo (A2)** y **pared (A4)** en formato autotile de RPG Maker MV: cada "tile lógico" es un bloque de 2x3 (A2) o tira vertical (A4) de piezas de esquina/borde que el motor RMMV ensambla. Phaser NO los interpreta directo.

| Archivo | Dim | Contenido | Conversión necesaria |
|---|---|---|---|
| `frlg_house_floors_A2_16x16_AUTOTILE.png` | 256x192 | ~8 estilos de suelo de casa (madera, baldosa, alfombra) en bloques autotile A2 | Extraer el tile "lleno" central de cada bloque 2x3, o usar un conversor RMMV→tileset plano (ej. tiled `Autotile to Tiled`), o documentar a mano qué celda usar como suelo macizo. |
| `frlg_house_walls_A4_16x16_AUTOTILE.png` | 256x240 | Papeles de pared / zócalos de casa (tira: cap superior + medio repetible) | Igual: cada pared es columna A4; tomar fila top + fila middle para construir muro de N de alto. |
| `frlg_shop_floors_A2_16x16_AUTOTILE.png` | 256x192 | Suelos de tienda/centro (baldosa clínica, parquet, etc.) | idem A2. |
| `frlg_shop_walls_A4_16x16_AUTOTILE.png` | 256x240 | Paredes de tienda/centro | idem A4. |

> **Alternativa más rápida:** para suelos macizos no hace falta el sistema autotile completo — basta extraer **1 celda 16x16** del centro de cada bloque (la pieza "interior" sin bordes) y repetirla. Recomiendo que el integrador (o un segundo pase) recorte esas celdas concretas; dejarlo documentado evita asumir índices erróneos.

---

## Descartados / fuera de scope (documentado para honestidad)

| Asset | Por qué no |
|---|---|
| `docs/refs/godot-tilesets/buildings.png` (1096x1090) | Fachadas EXTERIORES de edificios FRLG. No es interior. (Sí 16px+separación 1px, margins (0,7) según level.tres — para otro scope de exteriores.) |
| `docs/refs/godot-tilesets/environment.png` (912x832) | Terreno EXTERIOR (árboles, agua, caminos, rocas). No interior. |
| `essentials-32px/Essentials_Interior-general_32px.png` (256x8032) | Tileset de interior moderno de Essentials a **32px/tile** y enorme (vertical). Necesitaría downscale 2x→16px (Pillow NEAREST) y revisión. Baja prioridad: las hojas FRLG 16px nativas ya cubren casa/tienda/centro con mejor encaje GBA. Si se quiere look "moderno HD", convertir esta. |
| Hojas A1/A3/A5 (animaciones agua, techos, ground) | No críticas para casa/tienda/centro básicos; A5 es ground plano (podría servir, no copiado para no saturar). |

---

## Bar / restaurante — estado real

No hay un tileset FRLG dedicado a "bar/cafetería" en estos packs (Gen 3 no tenía bares). **Composición recomendada** a partir de lo que SÍ hay:
- Barra/mostrador: usar mostradores de `frlg_shop_objects_B` (mart) o las barras de madera de `frlg_house_objects_C`.
- Mesas + comida: `frlg_house_objects_B` (mesa con comida) y `frlg_house_objects_C`.
- Taburetes/sillas: `frlg_house_objects_B/C`.
- Suelo/pared: A2/A4 de shops (parquet/baldosa).

Es decir: el bar se MONTA combinando tiles de casa+tienda, no existe sheet único. Documentado para no prometer un asset que no hay.

---

## Procedencia / licencias

- **FRLG interiors**: rips de Pokémon FireRed/LeafGreen (Game Freak/Nintendo) recopilados en el "RPGM MV Ultimate Resource Pack" y en la "Pokémon Graphics Library Gens 1-3" (PokeCommunity). Uso fan-game/no comercial. El sheet de buildings dice literal "Ripped by fabnt. No credit needed."
- **Godot house/pokemoncenter**: del repo MIT `joeythelantern/pokemon-godot-csharp`, que a su vez usa rips FRLG.
- Para un proyecto comercial habría que sustituir por arte original; para el juego interno de Marcelino (amigos como personajes) es uso fan estándar.
