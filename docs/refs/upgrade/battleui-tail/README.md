# Battle UI — Healthbox con cola (pestaña diagonal) — FRLG

Scope: `battleui-tail`. Reconstrucción de los databoxes COMPLETOS de combate FRLG
(jugador y enemigo) **incluyendo la cola/pestaña diagonal** que faltaba en la Fase 0.

Fuente: `pret/pokefirered` (`graphics/battle_interface/*` + `src/battle_interface.c`).
Toda la conversión se hizo desde los tilesheets crudos que ya estaban en
`docs/refs/battleui-frlg/` (no se descargó nada nuevo del repo: se usó el material local).

---

## TL;DR — qué usar

| Archivo | Dims | Qué es | Listo para usar |
|---------|------|--------|-----------------|
| `healthbox_opponent_full.png` | 104x32 (contenido 1..101 x 2..31) | Databox del ENEMIGO completo, con cola diagonal abajo-derecha | SÍ |
| `healthbox_player_full.png` | 112x32 (contenido 0..104 x 2..32) | Databox del JUGADOR completo: caja + cola diagonal + barra EXP | SÍ |
| `healthbox_player_boxonly.png` | 112x26 | Databox del jugador SIN la barra EXP (solo la caja, por si se quiere la EXP aparte) | SÍ |
| `_page_player_0..3.png` | 64x32 c/u | Las 4 "páginas" OAM crudas del jugador (documentación / re-ensamblado) | parcial (piezas) |
| `_page_opponent_0..1.png` | 64x32 c/u | Las 2 "páginas" OAM crudas del enemigo | parcial (piezas) |

Paleta: los 16 colores de `docs/refs/battleui-frlg/healthbox.pal`. Índice 0 = transparente.
Verificado: 0 colores fuera de paleta (sin antialiasing), fondo transparente, no vacío.

---

## Por qué faltaba la cola (el problema de la Fase 0)

Los PNG de pret `healthbox_singles_player.png` (128x64) y
`healthbox_singles_opponent.png` (128x32) **NO son imágenes en orden de pantalla**.
Son **tilesheets en orden de VRAM**: una secuencia lineal de tiles de 8x8 que la GBA
carga en sprites OAM de **64x32**. El databox real se ENSAMBLA en runtime colocando
varios sprites 64x32 (sprite "main" + sprite "other" + el healthbar sprite encima).
Por eso la Fase 0, que recortó directamente del PNG, se quedó sin la cola: la cola
vive en una "página" de tiles distinta a la del cuerpo de la caja.

### Arquitectura FRLG (de `src/battle_interface.c`)

- `sOamData_Healthbox` = `SPRITE_SHAPE(64x32)` → cada databox son **dos** sprites 64x32:
  - `healthboxSprite` en la posición base
  - `healthboxOtherSprite` en base **+64px** (`SpriteCB_HealthBoxOther`: `sprite->x = base.x + 64`)
- El healthbar (barra HP animada) es un sprite aparte 32x8 con subsprites
  (`sHealthBar_Subsprites_Player/Opponent`), colocado a +16 (jugador) o +8 (enemigo).
- La cola del enemigo incluye un subsprite extra 8x8 en `x=-32` (la pestaña).

### Orden de tiles (clave de la reconstrucción) — VERIFICADO

El PNG está a 128px de ancho = 16 tiles/fila. Los tiles se numeran 0,1,2,…
left-to-right, top-to-bottom EN EL PNG. Un sprite 64x32 consume 32 tiles y al
dibujarse llena un área 64x32 en **orden row-major**: `tile t → (col=t%8, row=t//8)`.

- **Enemigo** (128x32): página 0 = tiles 0..31 (mitad izquierda de la caja),
  página 1 = tiles 32..63 (mitad derecha + cola).
- **Jugador** (128x64): 4 páginas de 32 tiles:
  - página 0 = mitad IZQUIERDA de la caja (esquina sup-izq + cuerpo)
  - página 1 = tira inferior izquierda: **cola diagonal** + label "EXP" + barra exp (izq)
  - página 2 = mitad DERECHA de la caja ("Lv", separador `/`, esquina inf-der, pestaña `)`)
  - página 3 = continuación derecha de la barra exp

### Ensamblado final aplicado

- **Enemigo**: `page0 @ (0,0)` + `page1 @ (64,0)` → 104x32. La cola ya queda integrada.
- **Jugador**: caja = `page0 @ (0,0)` + `page2 @ (64,0)`; tira EXP = `page1`+`page3`
  recortadas a 8px de alto y pegadas en `y=24`. Resultado 112x32 con caja + cola + EXP.

---

## Cómo integrarlo en el juego (Phaser)

Sustituir los `public/assets/ui/battle/healthbox_player.png` (actual 104x24, sin cola)
y `healthbox_opponent.png` (actual 104x16, sin cola) por estas versiones completas.

Notas de alineación:
- El databox del enemigo va arriba-izquierda; el del jugador abajo-derecha (FRLG).
- La barra HP de color (`hpbar_green/yellow/red.png`, ya en Fase 0) se superpone DENTRO
  de la zona blanca del databox; el origen X de la barra HP cae a ~+8px (enemigo) /
  ~+16px (jugador) del borde izquierdo de la caja, según el OAM original.
- La barra EXP del jugador (verde punteada) ya está incrustada en `healthbox_player_full.png`.
- Mantener `pixelArt: true` y escala entera; NO reescalar con suavizado (rompería los bordes).

## Limitaciones / honestidad

- La reconstrucción es **pixel-perfect respecto a los tiles de pret** (mismos píxeles,
  misma paleta), pero el **offset vertical exacto entre caja y barra EXP** del jugador se
  fijó por inspección visual (y=24), no leyendo coordenadas OAM literales de la barra EXP.
  Se ve correcto y coherente con FRLG; si se quiere el pixel exacto de origen, ajustar ±1–2px
  al integrar mirando un screenshot real del juego.
- Los `_page_*` crudos son piezas, NO usables sueltas: sirven de documentación/re-ensamblado.
- No se generó variante de dobles (doubles) ni Safari; el material fuente está en
  `docs/refs/battleui-frlg/healthbox_doubles_*.png` y `healthbox_safari.png` si se necesitan.
