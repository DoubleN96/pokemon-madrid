# Overworld Sprite Bases — Catálogo (scope: ow-sprite-bases)

Objetivo: dejar de generar sprites overworld con IA (salen blandos / mal cortados /
pequeños) y pasar a **reskinear plantillas FRLG canónicas, nítidas y game-ready** para
los 12 personajes. Aquí hay 17 plantillas base + 2 refs de cabeza, todas verificadas con
Pillow.

> NOTA: NO he tocado `src/`. Solo investigación + descarga + conversión dentro de
> `docs/refs/upgrade/ow-sprite-bases/`.

---

## 1. Fuente y formato de las plantillas

- **Fuente:** `pret/pokefirered` → `graphics/object_events/pics/people/` (sprites NPC
  oficiales de FireRed/LeafGreen, descompilados). Es el estándar de oro: pixel-art FRLG
  auténtico, sin antialiasing, fondo transparente.
- **Formato de cada PNG base:** tira **horizontal** de frames de **16x32 px**.
  - La mayoría son `160x32` (10 frames) o `144x32` (9 frames).
  - Modo paleta (P), 12-16 colores → recolorear es trivial.
- **Orden de frames (pret FRLG, confirmado comparando píxeles):**

  | idx | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 |
  |-----|---|---|---|---|---|---|---|---|---|---|
  | qué | abajo (quieto) | arriba (quieto) | izq (quieto) | abajo-andar A | arriba-andar A | izq-andar A | abajo-andar B | arriba-andar B | izq-andar B | extra |

  - **Derecha = espejo horizontal de izquierda** (FRLG no guarda right por separado).
  - El frame 9 (cuando existe) suele ser una pose extra; se puede ignorar.

### Conversión al formato del juego ("4 dir x 3 frames", 16x32)

El juego usa 3 frames por dirección. Mapeo recomendado desde la tira pret:

- **down:** [3, 0, 6]  (andarA, quieto, andarB) → da el bob de caminar centrado
- **up:**   [4, 1, 7]
- **left:** [5, 2, 8]
- **right:** espejo horizontal de [5, 2, 8]

Script de corte sugerido (NO ejecutado, para el integrador en `src/` o un build step):
```python
from PIL import Image
im = Image.open("bases/base_man_avg__eduardo_ivan.png").convert("RGBA")
F = lambda i: im.crop((i*16,0,i*16+16,32))
down  = [F(3),F(0),F(6)]
up    = [F(4),F(1),F(7)]
left  = [F(5),F(2),F(8)]
right = [f.transpose(Image.FLIP_LEFT_RIGHT) for f in left]
# luego empaquetar como sheet/atlas igual que npcs.webp/npcs.json
```

> El atlas actual del juego (`public/assets/sprites/chars/npcs.webp` + `npcs.json`) usa
> frames de 14x20 / 12x20 (trim). Estas bases son 16x32 sin trim, lo que **explica por
> qué los sprites IA se ven pequeños**: el lienzo útil del personaje es ~14x20 dentro de
> 16x32. Las plantillas pret rellenan ese mismo lienzo con arte nítido y proporcionado.

---

## 2. Plantillas base curadas (`bases/`)

Todas 16x32/frame, P-mode, hard edges, fondo transparente, verificadas no-vacías.

| Archivo | Frames | Descripción | Para |
|---------|--------|-------------|------|
| `base_fat_man__alex.png` | 9 | Hombre corpulento, camiseta blanca, calvo-parcial | **alex_digital** |
| `base_balding_man__jesus.png` | 10 | Calvo con pelo lateral, camiseta de tirantes | **jesus_la_rata**, **sergio_guillen** |
| `base_scientist__angel.png` | 10 | Gafas + bata/camisa, pelo oscuro peinado | **angel_perfeccionista** |
| `base_hiker_bearded__adrian.png` | 10 | Barba poblada, robusto, gorro | **adrian_schizo** |
| `base_beauty_blonde__blanca.png` | 10 | Mujer pelo rubio largo, vestido | **blanca_notarias** |
| `base_man_avg__eduardo_ivan.png` | 10 | Hombre medio, pelo castaño corto, camiseta | **eduardo**, **ivan_fintips** |
| `base_rival_gary__alvaro.png` | 9 | Rival Gary (pelo castaño/punk, chaqueta) | **alvaro_rival** |
| `base_daisy_blonde__mariel.png` | 9 | Mujer rubia (Daisy), walker completo | **mariel** (cuerpo) |
| `base_pokemaniac_glasses.png` | 10 | Pelo oscuro, camisa blanca, gafas | **jose_antonio_casero** (rapar pelo) |
| `base_youngster.png` | 10 | Chaval joven gorra/pelo, camiseta | **marcelino** (cuerpo) |
| `base_boy_young.png` | 10 | Niño/joven rubio, peto verde | alt joven |
| `base_clerk_office.png` | 9 | Oficinista castaño con corbata | alt **angel**/**ivan** |
| `base_woman1_blonde.png` | 10 | Mujer rubia recogido, walker | alt **mariel**/**blanca** |
| `base_crush_girl_brunette.png` | 10 | Chica castaña casual | alt **mariel** |
| `base_rich_boy.png` | 9 | Chico pelirrojo, chaleco | alt **alvaro** |
| `base_gentleman_hat.png` | 10 | Señor con sombrero de paja | alt mayores |
| `base_worker_m.png` | 10 | Trabajador, gorra/casco | alt |

### Refs de cabeza (solo 3 frames, sin animación de andar)
| Archivo | Uso |
|---------|-----|
| `ref_mom_blonde_ponytail_3f.png` | Cabeza coleta rubia alta → injertar en cuerpo de `base_daisy`/`base_woman1` para **mariel** |
| `ref_misty_sideponytail_3f.png` | Cabeza coleta lateral pelirroja (ref de estilo) |

---

## 3. Mapeo final base → personaje (recolor recipe)

Verifica visualmente con `_preview/MATCHING_bust_vs_base.png` (bust IA vs base FRLG).

| Personaje | Aspecto (del bust IA) | Base recomendada | Recolor / edición |
|-----------|----------------------|------------------|-------------------|
| **marcelino** | Piel oscura, afro grande, gafas redondas, sudadera gris | `base_youngster.png` | Piel→marrón oscuro; pelo→negro afro (ensanchar masa de pelo); añadir 2px gafas; ropa→gris sudadera. **Afro = edición de cabeza custom** (lo más laborioso). |
| **alvaro_rival** | Castaño peinado, chaqueta, joven rival | `base_rival_gary__alvaro.png` | Pelo→castaño liso; chaqueta→gris/oscuro. Ya es el rival, encaja de serie. |
| **alex_digital** | Corpulento, pelo corto oscuro, camiseta roja | `base_fat_man__alex.png` | Camiseta→roja; pelo→oscuro corto. Silueta gorda ya correcta. |
| **ivan_fintips** | Castaño corto, gafas, polo verde, medio | `base_man_avg__eduardo_ivan.png` | Camiseta→verde polo; añadir gafas 2px. |
| **jesus_la_rata** | Calvo-parcial, cara cansada, camiseta tirantes | `base_balding_man__jesus.png` | Casi directo. Tono camiseta→blanco roto. |
| **sergio_guillen** | Calvo/rapado, camiseta amarilla, amable | `base_balding_man__jesus.png` | Camiseta→amarilla; rapar más el pelo lateral. (Distinto de jesus por color de ropa.) |
| **eduardo** | Castaño corto, camiseta marrón, neutro | `base_man_avg__eduardo_ivan.png` | Camiseta→marrón. (Comparte base con ivan; diferenciar por ropa + sin gafas.) |
| **blanca_notarias** | Mujer, melena rubia larga, top blanco | `base_beauty_blonde__blanca.png` | Casi directo. Top→blanco. |
| **jose_antonio_casero** | Totalmente calvo, camiseta oscura | `base_pokemaniac_glasses.png` | **Rapar pelo a calvo total**; camiseta→gris/negra; quitar gafas. (Alt: `base_balding_man` borrando todo el pelo.) |
| **angel_perfeccionista** | Pelo oscuro peinado, gafas, camisa azul | `base_scientist__angel.png` | Camisa→azul claro; mantener gafas. Encaja muy bien. |
| **adrian_schizo** | Calvo arriba + barba/bigote grandes, mirada intensa | `base_hiker_bearded__adrian.png` | Quitar gorro del hiker (dejar calva); barba ya presente. Camisa→gris. |
| **mariel** | Mujer joven, coleta rubia alta, sonriente | `base_daisy_blonde__mariel.png` (cuerpo) + `ref_mom_blonde_ponytail_3f.png` (cabeza) | Injertar cabeza de coleta rubia (mom) sobre walker de daisy para tener coleta + andar. |

---

## 4. Banco extra disponible (`frlg-pret-raw/`)

50 sprites NPC pret sin renombrar, por si hace falta otra plantilla (NPCs de relleno de
Madrid, líderes de gimnasio, etc.). Incluye named: `policeman`, `nurse`, `sailor`,
`old_man_1/2`, `old_woman`, `cooltrainer_m/f`, `rocker`, `lass`, `little_boy/girl`,
`gym_guy`, `bug_catcher`, `fisher`, líderes (`misty`,`erika`,`sabrina`,`agatha`,`lorelei`,
`daisy`,`mom`), etc. Mismo formato 16x32/frame.

---

## 5. Previews para revisión visual (`_preview/`)

| Archivo | Qué muestra |
|---------|-------------|
| `MATCHING_bust_vs_base.png` | **El más útil:** bust IA de cada personaje al lado de su base recomendada. |
| `PRET_bases_down.png` | Frame "abajo" de las 37 plantillas pret, etiquetadas por nombre. |
| `PRET_fullstrips.png` | Tiras completas (todas las dirs) de los picks principales. |
| `PRET_extra_strips.png` | Tiras de candidatas femeninas/calvas extra. |
| `CHARACTERS_busts.png` | Montaje de los 12 busts IA del juego (referencia de aspecto). |
| `FRLG_chars_downfacing.png` | 128 NPCs del pack RPGMaker MV (gfxlib) etiquetados S{hoja}-{idx}. |
| `CANDIDATE_bases.png` | Bloques 3x4 de candidatas del pack MV. |
| `ALL_FRLG_Peds_contact.png` | Contact sheet de las 16 hojas FRLG Peds. |

---

## 6. Alternativa: pack RPGMaker MV (`/tmp/gfxlib/extracted/.../FRLG Peds`)

16 hojas de **288x256** = 8 personajes/hoja (128 NPCs FRLG). Formato MV: bloque de
personaje 72x128 = **3 frames (24px) x 4 dirs (32px)**, sprite real ~14x19 px centrado.
Útiles para NPCs de relleno, pero las tiras pret 16x32 son mejores para los 12 principales
(más limpias y ya en el lienzo exacto del juego). Ver `_preview/FRLG_chars_downfacing.png`
para el índice. Bases humanas claras: S1-0 (Red), S1-3 (entrenadora), S6-0 (anciano barba),
S11-2 (cocinero), S8-1 (pelirrojo).
