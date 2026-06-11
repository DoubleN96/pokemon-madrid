# Madrid Landmarks — Catálogo de Assets (FRLG 16x16)

Scope: representar landmarks de Madrid en pixel-art estilo FireRed/LeafGreen, 16x16, fondo
transparente, sin antialiasing. Solo investigación + extracción + composición. **No se ha
tocado `src/` ni se ha hecho git.**

Todos los PNG verificados con Pillow: no vacíos, RGBA, alineados a rejilla de 16px.
Tiles finales en `tiles/`. Previews/verificaciones visuales en `previews/`.

---

## 1. Fuentes usadas (ya descargadas en el repo)

| Fuente | Ruta | Qué aporta |
|--------|------|------------|
| FRLG "nature-decor" (mal nombrado: son EDIFICIOS) | `docs/refs/gfxlib/mediafire-16px/FRLG_Outside_C_nature-decor.png` | Pokémon Center, Mart, rascacielos de cristal, edificio de piedra con arco, mansión dorada, farolas, barco, vending |
| FRLG "buildings" (mal nombrado: son NATURALEZA/rocas) | `docs/refs/gfxlib/mediafire-16px/FRLG_Outside_B_buildings.png` | árboles, setos, rocas, cueva, statue de rocas |
| FRLG paths/terrain | `docs/refs/gfxlib/mediafire-16px/FRLG_Outside_A2A_paths-terrain.png` | adoquín gris, ladrillo, arena, estanques/agua circular (rim de piedra), parterres |
| FRLG Outside D (decoración) | `/tmp/gfxlib/extracted/.../tilesets/FRLG/FRLG Outside/FRLG Outside D.png` | **fuente redonda**, **monumento de mármol**, setos formales, farolas, urnas |
| FRLG Outside E1/E2 | `…/FRLG Outside E1.png`, `E2.png` | fachadas urbanas variadas (columnas, arcos, miradores) — sin extraer aún, ver Plan |

> NOTA CRÍTICA: los nombres de archivo de la pokecommunity lib están INVERTIDOS.
> `…C_nature-decor.png` contiene los edificios; `…B_buildings.png` contiene la naturaleza.
> Confírmalo con los previews etiquetados antes de extraer más tiles.

---

## 2. Assets game-ready (directos) en `tiles/`

### 2.1 Extracciones limpias de FRLG (recorte directo, sin tocar)

| Archivo | Dim | Landmark | Nota |
|---------|-----|----------|------|
| `frlgD_fountain_round_48.png` | 48x48 | **Cibeles / plaza** | Pila redonda con agua y borde de piedra. Pieza estrella. |
| `frlgD_marble_monument_32x48.png` | 32x48 | **Cibeles / Retiro** | Pedestal+estatua de mármol. Centro de fuente/estanque. |
| `frlgD_hedge_tree_32x64.png` | 32x64 | **Retiro** | Seto/árbol formal frondoso. Vegetación de parque. |
| `frlg_glass_tower_32x80.png` | 32x80 | **Gran Vía** | Rascacielos de cristal azul. Madrid moderno. Limpio. |
| `frlg_gold_mansion_48x64.png` | 48x64 | **Edificio clásico / museo** | Portada de ladrillo dorado con entrada monumental. |
| `frlg_metro_garage_48x64.png` | 48x64 | **Metro / aparcamiento** | Fachada gris con rampa/entrada ancha. Base de boca de metro. |
| `frlg_ornate_lamppost_16x48.png` | 16x48 | **Plaza/calle** | Farola ornamentada (gárgola). Mobiliario urbano. |
| `frlg_stone_arch_bldg_64x80.png` | 64x80 | **Pta. de Alcalá (ref)** | Edificio de piedra azul con gran arco blanco de granito. Usable como edificio; el arco hay que aislarlo (ver 2.3). |
| `frlg_granite_arch_unit_48x32.png` | 48x32 | **Pta. de Alcalá (pieza)** | Unidad de arco de granito (frontón + vano) recortada del edificio anterior. Tiene píxeles de muro azul a los lados → requiere limpieza si se quiere aislar. |

### 2.2 Composiciones montadas (placeholders directos)

| Archivo | Dim | Landmark | Cómo está hecho |
|---------|-----|----------|-----------------|
| `COMPO_cibeles_fountain_48x80.png` | 48x80 | **Cibeles** | `fountain_round_48` + `marble_monument` centrado en el agua. Lee como "estatua en pila redonda". Leve borde blanco donde la base toca el agua (antialias del recorte fuente). |
| `COMPO_retiro_estanque_96x64.png` | 96x64 | **Retiro (estanque)** | Estanque rectangular (agua+borde dibujados) + `marble_monument` al fondo (alusión al monumento a Alfonso XII) + 2 `hedge_tree` flanqueando. |
| `COMPO_metro_sign_16x32.png` | 16x32 | **Metro de Madrid** | Poste + rombo rojo con "M" blanca (logo icónico). Dibujado a mano, paleta limpia. |
| `COMPO_metro_stairs_32x16.png` | 32x16 | **Metro (boca)** | Escalera descendente hacia oscuridad. Combinar con el sign y/o `metro_garage`. Sin alpha (es un hueco a ras de suelo, va flush sobre el terreno). |
| `COMPO_puerta_alcala_sketch_80x64.png` | 80x64 | **Puerta de Alcalá** | Boceto pixel-art original: portón de granito neoclásico, 3 arcos de medio punto + 2 vanos rectos + ático con estatuas. Color granito crema FRLG. Es un BOCETO limpio, no extracción. |
| `COMPO_bernabeu_sketch_96x64.png` | 96x64 | **Bernabéu** | Boceto original: estadio blanco moderno con lamas verticales, videomarcador, entrada, trofeo, césped. BOCETO limpio. |

---

## 3. Mapa landmark → asset recomendado

| Landmark Madrid | Asset(s) a usar | Estado |
|-----------------|-----------------|--------|
| **Cibeles** | `COMPO_cibeles_fountain_48x80.png` (o `fountain_round_48` + `marble_monument` por separado para flexibilidad de capas/z-index) | LISTO (placeholder fuerte) |
| **Puerta de Alcalá** | `COMPO_puerta_alcala_sketch_80x64.png` (boceto) — refinable con `frlg_granite_arch_unit` limpiado | LISTO (boceto), mejorable |
| **Gran Vía** | `frlg_glass_tower_32x80` + `frlg_gold_mansion_48x64` + `frlg_ornate_lamppost` repetidos en hilera | LISTO (piezas), montar la calle en Plan |
| **Retiro** | `COMPO_retiro_estanque_96x64.png` + `hedge_tree` + `fountain_round` salpicados | LISTO (placeholder) |
| **Bernabéu** | `COMPO_bernabeu_sketch_96x64.png` (boceto) | LISTO (boceto) |
| **Metro** | `COMPO_metro_sign_16x32` + `COMPO_metro_stairs_32x16` + `frlg_metro_garage_48x64` como fachada | LISTO (piezas) |

---

## 4. Plan para lo que falta / refinar (sin tocar src/)

1. **Calle de la Gran Vía (composición de escena, no tile):** montar un strip horizontal
   alternando `glass_tower` (32px) y `gold_mansion` (48px), con `ornate_lamppost` cada 2-3
   tiles y acera de adoquín gris (tile `A2A_paths` col gris). Recomendado hacerlo como capa
   de mapa en Tiled/JSON, no como un PNG gigante.

2. **Puerta de Alcalá fiel:** aislar `frlg_granite_arch_unit_48x32` del muro azul (borrar a
   mano los píxeles de muro a izq/der del arco blanco), recolorear a crema granito, y triplicar
   el arco sobre un bloque de granito. El boceto actual ya da el silueteado correcto; esto sería
   el upgrade "AAA".

3. **Cibeles — pulido:** quitar el borde blanco de antialias de la base del monumento donde
   toca el agua (1-2px). Opcional: añadir los 2 leones/carro tirando del carro con un
   micro-sprite de 16x16 dibujado a mano sobre la base.

4. **Bernabéu — pulido:** el boceto es funcional; para AAA, redibujar el cuenco curvo con
   sombreado real (las lamas verticales actuales son rectas). Considerar usar el rascacielos de
   cristal como base de la fachada curva.

5. **Fuentes adicionales sin explotar:** `FRLG Outside E1/E2` (fachadas con columnas y arcos),
   `godot-tilesets/buildings.png` (1096x1090, 68x68 tiles — banco enorme de edificios sin
   catalogar) y `godot-tilesets/environment.png` (912x832). Escanear con previews etiquetados
   buscando: columnas clásicas (para Alcalá/Cibeles edificio del Banco de España), cúpulas
   (Metrópolis), estatuas ecuestres.

6. **Banco de España / Metrópolis (Gran Vía):** no hay tile directo. Plan: cúpula = recolorear
   una copa de árbol redonda o dibujar a mano un domo de 32x32; cuerpo = `gold_mansion` o
   fachada de E1. Documentado, no construido.

---

## 5. Honestidad — lo que NO es directamente usable

- `frlg_white_well_16.png` y `frlgD_urn_plant_16.png`: **ELIMINADOS**. El "pozo" resultó ser
  fondo púrpura sólido del tileset (al hacer color-key quedaban solo 2 bolardos); la "urna"
  era en realidad un tile de muro crema liso (mal identificado). No aportaban.
- `frlg_granite_arch_unit_48x32.png`: usable como referencia, pero lleva píxeles de muro azul
  pegados al arco → necesita limpieza manual antes de ir a un mapa de Alcalá fiel.
- Los `COMPO_*_sketch_*` (Alcalá, Bernabéu) son **bocetos dibujados**, no extracciones de
  sprite-rip; son consistentes en paleta/estilo FRLG y sirven de placeholder, pero un artista
  o una pasada de Stitch los elevaría.
- Toda escala/recorte se hizo con `Image.NEAREST` (sin antialiasing). Verificado.
