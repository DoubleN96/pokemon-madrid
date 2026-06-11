# PLAN — HUD de combate con la UI ORIGINAL de FireRed/LeafGreen (FRLG)

> Estado: **PLAN / solo-lectura**. No se ha tocado código ni assets de runtime.
> Objetivo: sustituir las databoxes "dibujadas por código" (`drawBox` + `Graphics`)
> por los **sprites originales FRLG** descargados de `pret/pokefirered`.
>
> Fuente actual: `src/ui/battle/databoxes.js` (clase `DataBox`) + `src/scenes/BattleScene.js`
> (instanciación en `buildBoxes()`).

---

## 0. Qué se ha descargado (`docs/refs/battleui-frlg/`)

Todos los PNG están **verificados con ffprobe** (válidos, `pal8` = indexados GBA 4bpp).
Son ficheros pequeños (100–500 B) porque son tilesheets GBA auténticos; los <500 B
NO son corruptos, es su tamaño real. El único "grande" relevante es
`healthbox_elements.png` (5.4 KB, la sheet maestra).

> ⚠️ **Paleta**: estos PNG vienen con paleta *placeholder* (se ven oscuros). El color
> real está en los `.pal` adjuntos (`healthbox.pal`, `healthbar.pal`, `textbox*.pal`).
> Antes de usarlos en el juego habrá que **recolorearlos** aplicando esos `.pal`
> (script de conversión one-shot, ver §6). No se cargan tal cual.

### Databoxes (de `graphics/battle_interface/`)

| Fichero | Dim (px) | Contenido | Uso |
|---|---|---|---|
| `healthbox_singles_player.png` | **128×64** | Marco de la caja del JUGADOR (incluye hueco barra PS + barra EXP "EXP" abajo) | Caja jugador (abajo-dcha) |
| `healthbox_singles_opponent.png` | **128×32** | Marco de la caja del ENEMIGO (sin EXP) | Caja enemigo (arriba-izda) |
| `healthbox_doubles_player.png` | 128×32 | Caja jugador en dobles (más compacta) | NO usar (juego es 1v1) |
| `healthbox_doubles_opponent.png` | 128×32 | Caja enemigo en dobles | NO usar |
| `healthbox_safari.png` | 64×128 | Caja de Zona Safari | NO usar |
| `enemy_mon_shadow.png` | 32×8 | Sombra elíptica bajo el sprite enemigo | Opcional (mejora field) |

### Elementos de barra / estados / numeritos

| Fichero | Dim (px) | Contenido | Uso |
|---|---|---|---|
| `healthbox_elements.png` | **320×24** | **Sheet maestra**: etiqueta "HP", tiles de barra PS **verde/amarillo/rojo**, tiles barra EXP azul, badges de estado **PSN/PAR/SLP/FRZ/BRN** (varias paletas) y los iconos de bola-capturada | Recortar HP-bar fill + badges de estado |
| `iface_hp_bar_anim.png` | **144×8** | Frames de animación del relleno de la barra PS (segmentos que se vacían) | Animación suave de PS (opcional, fase 2) |
| `iface_hpbar_unused.png` | 96×8 (gray) | Barra PS sin usar (variante) | NO usar |
| `iface_numbers1.png` | 88×8 (gray) | Dígitos pequeños 0-9 (fuente de números PS/Nv) | Opcional: numeritos PS pixel-perfect |
| `iface_numbers2.png` | 96×8 (gray) | Variante de dígitos | Opcional |
| `iface_status_icons.png` | 256×8 | Iconos de estado en tira (variante compacta) | Alternativa a los badges de `healthbox_elements` |
| `level_up_banner.png` | 64×40 | Banner "LEVEL UP" | Opcional (fase 2, evento levelup) |
| `party_summary_bar.png` | 128×8 | Barra resumen de equipo | NO usar aquí |

### Cuadro de texto / menú de combate (de `graphics/interface/` y `graphics/text_window/`)

| Fichero | Dim (px) | Contenido | Uso |
|---|---|---|---|
| `textbox.png` | 128×128 | Tileset del cuadro de mensaje de combate FRLG | Mejorar `MessageBox` (typewriter.js) — fase 2 |
| `win_menu_message.png` | 48×24 | Marco "menu message" (borde del cuadro inferior) | Borde del cuadro de diálogo — fase 2 |
| `win_std.png` / `win_type1.png` / `win_type2.png` | 24×24 | Marcos de ventana estándar FRLG (9-slice) | Bordes de menús (FIGHT/BAG/POKéMON/RUN) — fase 2 |
| `iface_menu_info.png` | 128×128 | Tileset de menús/info | Opcional |
| `iface_red_arrow.png` | 16×16 | Flecha-cursor roja de selección | Cursor de menú — fase 2 |
| `iface_select_button.png` | 24×16 | Botón de selección | Opcional |
| `iface_selector_outline.png` | 24×24 | Recuadro de selección | Opcional |
| `iface_ball_open.png` | 16×16 | Poké Ball abriéndose | FX de captura/sacar mon — opcional |

### Paletas (necesarias para recolorear los PNG indexados)

`healthbox.pal`, `healthbar.pal`, `textbox1.pal`, `textbox2.pal`,
`win_stdpal_0.pal`, `win_stdpal_1.pal`, `iface_text_pp.pal`, `iface_std_menu.pal`,
`iface_pokemon_types.pal`.
Formato JASC-PAL (texto). Se aplican con un script Python (Pillow) o ImageMagick.

---

## 1. Cómo se posicionan HOY las databoxes (lectura de código)

### `BattleScene.buildBoxes()` (líneas 123-129)
```js
this.enemyBox  = new DataBox(this, { x: 4,   y: 6,  isPlayer: false }); // arriba-izda
this.playerBox = new DataBox(this, { x: 132, y: 72, isPlayer: true  }); // abajo-dcha
```
Lienzo del juego: **240×160** (resolución GBA, ver comentario cabecera de BattleScene).

### `DataBox` (databoxes.js) — geometría actual (dibujada con `Graphics`)
| Propiedad | Enemigo (`isPlayer=false`) | Jugador (`isPlayer=true`) |
|---|---|---|
| `w` (ancho caja) | 102 | 106 |
| `h` (alto caja) | 28 | 38 |
| Origen `(x,y)` | (4, 6) | (132, 72) |
| `barX` = x+38 | 42 | 170 |
| `barY` = y+16 | 22 | 88 |
| `barW` (ancho barra PS) | 48 | 48 |
| Barra PS (relleno) | `fillRect(barX, barY, barW*ratio, 4)` | igual |
| Texto nombre | (x+5, y+4) | (x+5, y+4) |
| Texto nivel "NvNN" | (x+w-5, y+4) origen(1,0) | igual |
| Texto PS "cur/max" | — (enemigo no muestra) | (x+w-7, barY+7) origen(1,0) |
| Barra EXP | — | x=x+24, y=y+h-7, w=w-31, alto 2 |
| Badge estado | (x+5, barY-1) | igual |

**Elementos gráficos creados hoy** (todos `scene.add.graphics()` / `.text()`):
`panel` (drawBox), `barFrame` (roundedRect oscuro), `nameText`, `lvText`, `psLabel`
("PS"), `statusText`, `hpGfx` (relleno PS), y solo-jugador: `hpText`, `expLabel`
("EXP"), `expGfx` (relleno EXP).

**Animaciones que deben seguir funcionando** (las llama BattleScene):
- `box.tweenHp(from, to, max)` → tween numérico que llama `updateHp()` en cada frame.
- `box.tweenExp(ratio)` → tween de la barra EXP.
- `box.setMonster(...)`, `setLevel`, `setStatus`, `updateHp`, `setExp`.
La **API pública de `DataBox` NO debe cambiar** → BattleScene la usa en muchos sitios
(`refreshBox`, `onHpEvent`, `onExpEvent`, `onLevelUpEvent`, `onStatusEvent`).

---

## 2. Estrategia de reemplazo (mínimo cambio, máxima fidelidad)

**Principio**: mantener INTACTA la API de `DataBox` y BattleScene; solo cambiar el
*render interno* de `build()` / `updateHp()` / `drawExp()` para usar sprites en lugar
de `Graphics`. Así NO se toca `BattleScene.js` (salvo, opcionalmente, cargar las
texturas en `preload`).

### 2.1 Carga de texturas (en `BattleScene.preload()` o `BootScene`)
Recomendado: cargar en `BootScene.preload()` (carga global de UI) los recolorados:
```
assets/ui/battle/healthbox_player.png      (128×64, recoloreado)
assets/ui/battle/healthbox_opponent.png    (128×32, recoloreado)
assets/ui/battle/hpbar_fill.png            (tira verde/amarillo/rojo recortada de elements)
assets/ui/battle/status_badges.png         (atlas PSN/PAR/SLP/FRZ/BRN recortado de elements)
```
> `assets/ui/` está hoy VACÍO → crear subcarpeta `assets/ui/battle/`.
> Las texturas recoloreadas se generan con el script de §6 (one-shot, fuera de runtime).

### 2.2 Mapeo de cada sprite → su sitio

| Elemento de hoy (Graphics) | Sustituto FRLG | Posición |
|---|---|---|
| `panel` (caja enemigo, drawBox) | `healthbox_opponent.png` como `image` | en `(x, y)` origen(0,0); el marco de 128×32 escala 1:1 |
| `panel` (caja jugador) | `healthbox_player.png` | en `(x, y)`; 128×64 — OJO, hoy `h=38`; ver §3 ajuste de coords |
| `barFrame` (rounded oscuro) | YA viene dibujado dentro del PNG del marco | eliminar el Graphics, el hueco está en el sprite |
| `psLabel` "PS" + `expLabel` "EXP" | YA vienen en el PNG del marco | eliminar los `.text()` |
| `hpGfx` (relleno PS) | recorte de `hpbar_fill` (verde/amarillo/rojo) por `crop` | dentro del hueco del marco |
| `expGfx` (relleno EXP) | barra azul (tile de `healthbox_elements`) o seguir con Graphics fino | dentro del hueco EXP |
| `statusText` badge | `status_badges` atlas (frame por estado) | sobre la posición del nombre |
| `nameText`, `lvText`, `hpText` | **SE MANTIENEN** como `.text()` (la fuente PixelMadrid ya es FRLG) | reposicionar a los huecos del PNG |

---

## 3. Coordenadas exactas tras el cambio

El marco del jugador FRLG mide **128×64**, pero el juego es de 240×160, así que el
marco a tamaño real ocuparía media pantalla → **demasiado grande**. FRLG nativo es
240×160 y la caja real ocupa ~104×30 (jugador con EXP ~104×38). Conclusión:

> Las dimensiones del PNG (128×64) son la SHEET; la caja *dibujada* en pantalla real
> usa solo una porción + el marco está pensado para verse a 1:1 en GBA. **Hay que
> recortar el PNG a la región útil** (el marco real, sin el padding transparente de
> la sheet) y/o escalar.

### Opción A (recomendada): recortar el marco útil y colocar 1:1
- Recortar `healthbox_player.png` a la caja real (~104×38) y `healthbox_opponent.png`
  a (~104×30) con el script de §6 (analizar bounding-box no-transparente).
- Colocar:
  - Enemigo: `this.add.image(4, 6, 'healthbox_opponent').setOrigin(0,0).setDepth(5)`
  - Jugador: `this.add.image(130, 70, 'healthbox_player').setOrigin(0,0).setDepth(5)`
    (ajustar 130/70 para que quede pegado a la esquina inferior-derecha; el actual
    es 132,72 con w=106 → cabe).
- Mantener los textos sobre el sprite con offsets equivalentes a los actuales
  (nombre x+5/y+4, nivel esquina-dcha, PS cur/max alineado a la barra).

### Opción B: escalar el marco completo
Cargar el PNG entero y `setScale(0.8)` para encajar. Menos fiel (bordes borrosos al
escalar no-entero). **No recomendado** en pixel-art.

→ **Decisión: Opción A.**

### Barra de PS — geometría dentro del marco FRLG
En FRLG la barra PS interna mide **48×3 px** (6 tiles de 8px de la sheet, pero el área
de relleno son 48 px de ancho). Coincide con el `barW=48` actual. El relleno se hace
recortando el sprite de relleno al ancho `48*ratio`.

---

## 4. Mapeo de la barra de PS → verde / amarillo / rojo

El sheet `healthbox_elements.png` (320×24) contiene, en su fila superior, las tres
variantes de relleno de la barra PS apiladas/contiguas:
- **Verde** (HP > 50%)
- **Amarillo** (HP 20–50%)
- **Rojo** (HP ≤ 20%)

Cada variante es una tira horizontal de ~6 tiles. Tras recolorear con `healthbar.pal`,
se recortan a tres texturas/frames:
```
hpbar_green  (recorte fila verde)
hpbar_yellow (recorte fila amarillo)
hpbar_red    (recorte fila rojo)
```

### Lógica de selección de color (ya existe en theme.js)
`hpColor(ratio)` ya devuelve verde/amarillo/rojo en los mismos umbrales que FRLG:
```js
ratio > 0.5  → verde   (0x30c850)
ratio > 0.2  → amarillo (0xf8d048)
else         → rojo    (0xf85848)
```
→ En `updateHp()`, en vez de `g.fillStyle(hpColor(ratio))`, seleccionar el **frame**:
```js
const key = ratio > 0.5 ? 'hpbar_green' : ratio > 0.2 ? 'hpbar_yellow' : 'hpbar_red';
this.hpFill.setTexture(key);
this.hpFill.setCrop(0, 0, Math.round(48 * ratio), barH); // recorte = relleno
```
- `this.hpFill` = un `Image`/`Sprite` colocado en `(barX, barY)` con origen (0,0).
- `setCrop(0,0, 48*ratio, h)` hace de "fill" sin redibujar — barato y fiel.
- El tween de `tweenHp` sigue igual: en cada `onUpdate` llama `updateHp(v, max)` que
  ahora ajusta el `crop` y el `texture` en lugar de `fillRect`. **Cero cambios de API.**

> Alternativa fase 2: usar `iface_hp_bar_anim.png` (144×8) como spritesheet de 18 frames
> (144/8) para una depleción animada tile-a-tile como el original. Más fiel pero más
> trabajo; dejar para después.

---

## 5. Cambios mínimos en `databoxes.js` (resumen)

Solo el método `build()` y los render `updateHp()` / `drawExp()` cambian. La API
externa (`setMonster/setLevel/setStatus/updateHp/setExp/tweenHp/tweenExp`) se conserva.

1. **`build()`**:
   - Quitar `drawBox(...)` y el `barFrame` (rounded). En su lugar:
     `this.panel = scene.add.image(x, y, isPlayer ? 'healthbox_player' : 'healthbox_opponent').setOrigin(0,0).setDepth(5)`.
   - Quitar `psLabel` y `expLabel` (ya están pintados en el sprite).
   - `nameText`, `lvText` se mantienen, reposicionados a los huecos del marco FRLG.
   - Crear `this.hpFill = scene.add.image(barX, barY, 'hpbar_green').setOrigin(0,0).setDepth(7)`.
   - `statusText` → sustituir por `this.statusIcon = scene.add.image(...).setVisible(false)`
     usando atlas `status_badges` (frames `psn/par/slp/brn/frz`), o conservar el `.text()`
     actual si se quiere menos riesgo (es válido, FRLG-like).
   - Solo jugador: `hpText` se mantiene; barra EXP → `this.expFill` (Image recortada) o
     mantener `expGfx` (Graphics fino azul, ya es correcto).

2. **`updateHp(cur, max)`**:
   - Calcular `ratio`. Elegir textura por umbral (verde/amarillo/rojo).
   - `this.hpFill.setTexture(key).setCrop(0, 0, Math.round(this.barW * ratio), barH)`.
   - Mantener `hpText.setText(...)` para el jugador (sin cambios).

3. **`drawExp(ratio)`**:
   - Opción simple: dejar el `Graphics` azul actual (ya funciona, es discreto).
   - Opción fiel: recortar tile EXP azul de `healthbox_elements`.

4. **`setStatus(status)`**:
   - Si se usa atlas: `this.statusIcon.setFrame(STATUS_FRAME[status]).setVisible(!!status)`.
   - Si se mantiene texto: SIN cambios.

5. **Constructor — geometría**: ajustar `barX/barY` a los huecos reales del marco FRLG
   recortado (medir tras el recorte del §6). Probable: barra a ~38px del borde izq,
   ~16px desde arriba (coincide casi con lo actual).

**`BattleScene.js`**: idealmente **0 cambios**. Como mucho, mover la carga de las 4
texturas UI a `BootScene.preload()` (1-2 líneas) si no se cargan ya. Las coords de
`buildBoxes()` (4,6 y 132,72) pueden quedarse o afinarse ±2px.

---

## 6. Pre-proceso necesario antes de integrar (one-shot, NO runtime)

Los PNG de pret están indexados con paleta placeholder. Script (Pillow) a ejecutar una
vez para generar los assets de runtime en `assets/ui/battle/`:

```
Para cada (png, pal) relevante:
  1. Cargar png indexado.
  2. Parsear el .pal JASC-PAL → lista de RGB.
  3. Reasignar la paleta del png a esos RGB (putpalette).
  4. Convertir índice 0 (o el color de fondo) a transparente (RGBA).
  5. Recortar al bounding-box no-transparente (para el marco real).
  6. Guardar PNG RGBA en assets/ui/battle/.

Sub-recortes de healthbox_elements.png (320×24) con coords de tile (8px):
  - hpbar_green/yellow/red  → 3 tiras horizontales de la fila 0.
  - status_badges atlas     → recortes de PSN/PAR/SLP/FRZ/BRN (fila 0, dcha).
```
Herramientas disponibles en el entorno: `ffmpeg`/`ffprobe` (ya usados para verificar),
y Python con Pillow si está instalado (verificar `python3 -c "import PIL"`). Si no,
usar ImageMagick (`convert`) o instalar Pillow vía `uv`/`pip`.

---

## 7. Orden de implementación sugerido (cuando se autorice tocar código)

1. **Fase 0 (assets)**: script de recoloreado/recorte → `assets/ui/battle/*.png`. Verificar visualmente.
2. **Fase 1 (marcos + barra PS)**: editar `databoxes.js` `build()`+`updateHp()` para
   usar `healthbox_player/opponent` y `hpbar_{green,yellow,red}` con `setCrop`.
   Cargar texturas en BootScene. Probar combate (tween PS verde→amarillo→rojo).
3. **Fase 2 (estados + EXP)**: badges de estado por atlas; barra EXP por sprite.
4. **Fase 3 (cuadro de texto / menús)**: `textbox.png` + `win_menu_message.png` +
   cursor `iface_red_arrow.png` en `typewriter.js` / `menus.js`.
5. **Fase 4 (pulido)**: animación tile-a-tile de PS (`hp_bar_anim`), banner level-up,
   sombra enemiga (`enemy_mon_shadow`).

## 8. Riesgos / notas

- **Escala**: la sheet 128×64 NO se coloca tal cual; hay que recortar al marco real
  (§3 opción A) o se verá gigante. Es el punto que más cuidado requiere.
- **Paleta**: sin aplicar los `.pal` los sprites salen casi negros. Paso obligatorio.
- **No romper la API de DataBox**: BattleScene depende de `tweenHp/tweenExp/setMonster/
  setStatus/setLevel`. Cualquier cambio debe ser interno al render.
- **Fuente**: los textos (nombre/Nv/PS) se quedan con `PixelMadrid` (ya es la fuente
  FRLG del juego). No hace falta sprite de números salvo que se quiera pixel-perfect.
- **Doubles/Safari**: descargados por completitud, NO se usan (juego es 1v1 salvaje/entrenador).
