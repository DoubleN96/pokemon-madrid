# Portraits Cleanup — Catálogo (scope: portraits-cleanup)

Auditoría de los retratos de combate en:
- `public/assets/portraits/` (pixel-art, 12 personajes: full + bust + overworld)
- `public/assets/portraits/anime/` (ilustraciones IA estilo anime, 12 personajes: full + bust)

> REGLA: NO se tocó nada en `src/` ni en `public/`. Las versiones LIMPIAS están en
> `docs/refs/upgrade/portraits-cleanup/anime/` con el MISMO nombre de fichero.
> Pruebas visuales en `_proof/`. Script reproducible en `defringe.py`.

---

## TL;DR (honesto)

1. **NINGÚN retrato pixel-art tiene fondo a-cuadros/blanco sin quitar.** Todos tienen alpha
   correcto (0..255) y al componerlos sobre magenta/verde/blanco el fondo es transparente.
2. **Los busts pixel `adrian_schizo_bust.png` y `alex_digital_bust.png` PARECÍAN tener un
   "rectángulo gris/azul de fondo" sobre fondo a-cuadros, pero es FALSO.** Al componer sobre
   magenta/verde se ve que ese "rectángulo" es la ROPA del personaje (la americana gris-azul de
   Adrián, el cuerpo/camiseta roja de Álex). El fondo a-cuadros (190,190,190) coincidía casi
   exactamente con el tono de la americana de Adrián, lo que engañaba a la vista. **No requieren
   arreglo de chroma-key.** Ver `_proof/proof_pixel-busts-are-clean.png`.
3. **El problema REAL está en los retratos ANIME (IA): tienen un halo/fleco blanco fino** alrededor
   de la silueta (residuo de un recorte de fondo imperfecto). Se nota sobre fondos no-blancos.
   **Lo arreglé** con de-fringe (eliminar solo los píxeles casi-blancos pegados a la transparencia,
   sin tocar interiores como la camiseta blanca de Jesús). Ver `_proof/proof_anime-before-after.png`
   y `_proof/proof_anime-defringe-jesus.png`.
4. **Lo que SÍ necesita IA / regeneración:** la calidad/tamaño percibido (queja de Marcelino sobre
   `alex_digital` "se ve mal/pequeño") es un tema de RESOLUCIÓN y ESTILO, no de fondo. No se puede
   resolver con limpieza; requiere regenerar o upscalear (ver sección final).

---

## Método de verificación

- `Pillow 12.2.0` para abrir/inspeccionar; `ffprobe` disponible.
- Para cada PNG: modo, canal alpha (extrema), color de bordes, flood-fill desde bordes,
  composición sobre **magenta / verde / blanco** (el test fiable; el fondo a-cuadros gris
  engaña con personajes de ropa clara), y mapa ASCII de alpha.
- Detección de fleco: píxel opaco + casi-blanco (max>222, saturación<28) + adyacente a píxel
  transparente. Eso aísla el halo de borde sin tocar blancos interiores.

---

## Estado por fichero — PIXEL-ART (`public/assets/portraits/`)

| Fichero | Dim | Alpha | Veredicto |
|---|---|---|---|
| marcelino.png / _bust.png | 228x656 / 228x302 | OK | Limpio |
| alvaro_rival.png / _bust.png | 281x530 / 217x244 | OK | Limpio |
| alex_digital.png | 380x673 | OK | Limpio (ver nota tamaño) |
| **alex_digital_bust.png** | 372x310 | OK | **Limpio** (el "bloque" = cuerpo/camiseta roja, NO fondo) |
| ivan_fintips.png / _bust.png | 242x424 / 227x195 | OK | Limpio |
| jesus_la_rata.png / _bust.png | 282x643 / 271x296 | OK | Limpio |
| sergio_guillen.png / _bust.png | 229x652 / 216x300 | OK | Limpio |
| eduardo.png / _bust.png | 148x422 / 135x194 | OK | Limpio |
| blanca_notarias.png / _bust.png | 174x565 / 151x260 | OK | Limpio |
| jose_antonio_casero.png / _bust.png | 195x573 / 195x264 | OK | Limpio |
| angel_perfeccionista.png / _bust.png | 249x681 / 222x313 | OK | Limpio |
| **adrian_schizo_bust.png** | 240x301 | OK | **Limpio** (el "rectángulo gris" = americana gris-azul, NO fondo) |
| mariel.png / _bust.png | 332x680 / 332x313 | OK | Limpio |
| overworld (*_down/up/left/right/ow.png) | ~10-19x27-32 | OK | Limpios (sprites OW, fuera de scope retratos) |

**No se modificó ningún pixel-art.** El flood-fill automático marcó falsos positivos (eduardo 33%,
angel 28%, jose_bust 31%, sergio_bust 24%…) porque el pelo/ropa oscura toca el borde inferior del
frame y la semilla de color se metía dentro del personaje. La inspección visual sobre magenta lo
desmiente uno a uno (`_proof/proof_all-pixel-magenta.png`).

---

## Estado por fichero — ANIME IA (`public/assets/portraits/anime/`) → ARREGLADOS

De-fringe aplicado. Salida limpia en `./anime/` (mismas dimensiones, no vacías, validadas con Pillow).

| Fichero | Dim | Píxeles de fleco eliminados | Fleco residual | Estado |
|---|---|---|---|---|
| adrian_schizo.png | 414x697 | 1467 (4 pasadas) | 11 | Arreglado |
| adrian_schizo_bust.png | 397x362 | 1318 (4 pasadas) | 11 | Arreglado |
| alvaro_rival.png | 540x1111 | 0 | 0 | Ya limpio |
| alvaro_rival_bust.png | 540x577 | 0 | 0 | Ya limpio |
| angel_perfeccionista.png | 218x685 | 198 | 0 | Arreglado |
| angel_perfeccionista_bust.png | 218x356 | 91 | 0 | Arreglado |
| blanca_notarias.png | 304x648 | 223 | 0 | Arreglado |
| blanca_notarias_bust.png | 299x336 | 96 | 0 | Arreglado |
| eduardo.png | 223x663 | 196 | 0 | Arreglado |
| eduardo_bust.png | 183x344 | 72 | 0 | Arreglado |
| ivan_fintips.png | 409x662 | 228 | 0 | Arreglado |
| ivan_fintips_bust.png | 409x344 | 87 | 0 | Arreglado |
| jesus_la_rata.png | 377x685 | 342 | 0 | Arreglado (camiseta blanca intacta) |
| jesus_la_rata_bust.png | 351x356 | 195 | 0 | Arreglado (camiseta blanca intacta) |
| jose_antonio_casero.png | 231x692 | 208 | 0 | Arreglado |
| jose_antonio_casero_bust.png | 221x359 | 83 | 0 | Arreglado |
| marcelino.png | 220x701 | 217 | 0 | Arreglado |
| marcelino_bust.png | 204x364 | 100 | 0 | Arreglado |
| mariel.png | 512x1174 | 0 | 0 | Ya limpio |
| mariel_bust.png | 478x610 | 0 | 0 | Ya limpio |
| sergio_guillen.png | 299x682 | 256 | 0 | Arreglado |
| sergio_guillen_bust.png | 299x354 | 126 | 0 | Arreglado |

Notas:
- `alvaro_rival` y `mariel` (generados a las 06:09) ya venían sin fleco → se copiaron idénticos.
- Safety check: la camiseta blanca de Jesús, la camisa clara de Eduardo/José y el pelo cano de
  José se conservan intactos (solo se retira el halo de borde adyacente a transparencia). Pruebas:
  `_proof/proof_anime-defringe-jesus.png`, `_proof/proof_anime-before-after.png`.

---

## Cómo integrar (para el orquestador, NO lo hago yo)

Las versiones limpias del set ANIME están listas para sustituir 1:1:

```
docs/refs/upgrade/portraits-cleanup/anime/<archivo>.png
   → public/assets/portraits/anime/<archivo>.png   (mismo nombre)
```

No tocan `anime.json` (mismas dimensiones y nombres). Los pixel-art NO se sustituyen (ya limpios).

Para reproducir el de-fringe sobre nuevos retratos IA:
```
python3 docs/refs/upgrade/portraits-cleanup/defringe.py
```

---

## Lo que necesita IA / regeneración (NO lo hago yo)

Esto NO es problema de fondo, es de **calidad/resolución/estilo**:

1. **`alex_digital` (pixel-art)** — queja explícita de Marcelino ("se ve mal/pequeño"). El PNG es
   380x673 pero el arte se renderiza pequeño y el corte/proporción no convence. Recomendado:
   regenerar el bust pixel con más detalle facial, o usar el retrato ANIME `anime/alex_digital.png`
   (más resolución y mejor lectura) como retrato de combate.
2. **Decisión de estilo retrato de combate** — hay DOS sets (pixel-art y anime IA). El anime IA
   tiene mucha más calidad/detalle (lo que pide Marcelino) pero el pixel-art encaja con el tileset
   16x16. Recomendación: usar el set **anime (ya de-fringed)** para el panel de retrato grande en
   combate, y reservar el pixel-art para el overworld/diálogo pequeño.
3. **Halo residual mínimo en `adrian_schizo` anime (11 px)** junto al orbe del bastón mágico:
   irrelevante visualmente; si se quiere perfección absoluta, retocar a mano esos 11 px o
   regenerar el recorte del bastón.

Ningún retrato requiere regeneración por "fondo sin quitar" — ese problema no existe tras esta
limpieza.
