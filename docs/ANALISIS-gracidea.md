# Análisis: Gracidea como recurso para Pokemon Madrid

## TL;DR

Gracidea **NO sirve como base de juego**: es un visor de mapa sin jugador, sin teclado, sin colisiones por tile, sin diálogos ni guardado, y su build está roto en toolchain actual (Deno ≤1.21, PixiJS v6 EOL). Lo que SÍ aprovechamos: el **tileset overworld Gen 3** (directamente usable en Tiled para dibujar Madrid), las **convenciones de cartografía** (un `.tmx` por zona + `.world` para coser el mundo, capas 1-4, objectgroups `people`/`creatures`) y el **diseño** del streaming por chunks y del movimiento NPC por grid. Riesgo de licencia doble: el código es **AGPL-3.0** (copiar código literal obliga a publicar el fuente de todo el cliente si se sirve por web, sección 13) y los assets son **IP de Nintendo sin licencia alguna** (riesgo estándar de fan-game, tolerado pero revocable). Estrategia: adoptar convenciones y diseño (no copyrightables), reimplementar las ~500 líneas de pipeline si hacen falta, y construir el juego nuevo.

## Qué es gracidea

Gracidea (lowlighter/gracidea, clonado en `/home/n8nstratoma/pokemon-madrid/resources-inbox/gracidea`, último commit feb-2022) es un **mapa web vivo** del mundo Pokémon, explícitamente "NOT A GAME PROJECT" según su propio README. Está escrito en TypeScript sobre Deno (~1.17) con render en PixiJS v6, y consiste en: 136 mapas `.tmx` de Hoenn editados en Tiled 1.7.2, cosidos por `maps/gracidea.world`; un pipeline de build que convierte esos TMX en JSON chunked de 16×16 tiles servido como estáticos sin backend; y un cliente con streaming de mapa por cámara (carga/descarga de secciones según proximidad), tiles animados declarados como propiedades de Tiled, y NPCs/criaturas con movimiento real por grid de 16px alimentado por datos de PokeAPI. La cámara es de paneo libre (drag/wheel): no hay entidad jugador ni mecánica de juego de ningún tipo.

## Qué aprovechamos

| Pieza | Ruta | Cómo se usa en Pokemon Madrid |
|---|---|---|
| Tileset overworld Gen 3 (RSE) | `copyrighted/textures/rse/tileset.png` + `tileset.tsx` (2036×1010 px, 6.328 tiles 16×16) | Copiar la pareja .png/.tsx y referenciarla desde nuestros `.tmx` nuevos en Tiled. Tiene todo lo urbano/exterior: edificios, calles, parques, agua (Manzanares), vegetación (Retiro/Casa de Campo). ⚠️ IP Nintendo: solo viable como fan-project no comercial. |
| Convenciones de cartografía | `CONTRIBUTING.md` + estructura de `maps/hoenn/*.tmx` | Adoptar tal cual (las convenciones no son copyrightables): capas de tiles 1-4 (suelo / suelo secundario / objetos / encima-del-jugador), objectgroup `people` (NPCs con sprite+patrón) y `creatures` (polígonos nombrados por método de encuentro). Un `.tmx` por barrio/zona de Madrid. |
| Formato `.world` para coser el mundo | `maps/gracidea.world` | Crear `madrid.world`: JSON estándar de Tiled con `{fileName, x, y, width, height}` en píxeles por mapa. Tiled lo abre y muestra Madrid como mundo continuo. |
| Diseño del streaming de mapa | `app/client/js/app/maps/camera.ts` (concepto: rects visible 7×5 / loaded 11×9, load/show/hide/destroy por intersección) | Portar como **diseño**, reescrito: jerarquía World→Region→Section con fetch lazy de JSON por sección y descarga real de memoria. Es chunk-streaming probado estilo Google Maps. |
| Lógica de movimiento por grid | `app/client/js/app/maps/npc.ts` (345 líneas: target tile, interpolación 1/16 por tick, 4 direcciones, animación 3 frames con espejado) | Es exactamente la base del movimiento de jugador estilo FireRed. Portar el algoritmo (reimplementado para evitar AGPL si el código va a servirse a terceros). |
| Tiles animados como propiedades de Tiled | `app/build/steps/30_textures.ts` + propiedades `frames`/`speed`/`zindex` en `tileset.tsx` | Adoptar el patrón: declarar agua/flores animadas en el .tsx y que el runtime las convierta en sprites animados. Tiles 658 (agua) y 2374 (flores/cascada) ya vienen configurados en el tileset. |
| Pipeline TMX→JSON (como referencia) | `app/build/steps/20_maps.ts` + `app/build/util.ts` (~500 líneas) | Referencia de diseño para tooling propio: parseo TMX, chunks 16×16, polígonos con shoelace, detección de spawn. Solo necesario si NO usamos un motor que lea Tiled nativo. |
| Formato de spawns | `app/build/steps/10_data.ts` + `app/client/js/app/maps/area.ts` | Referencia de esquema: `{location-id: {encounters: {método: {especie: probabilidad}}}}` ligado a polígonos. Escribiremos un `data.json` propio con ids inventados (`madrid-sol`, `madrid-retiro`) — PokeAPI no tiene Madrid. |
| Atlas de NPCs (referencia de formato) | `copyrighted/textures/rse/npcs.json` (624 frames, 203 animaciones, 4 direcciones × 3 frames) | Referencia del formato spritesheet PIXI/estándar para nuestros propios sprites de personajes. |
| Receta de entorno Tiled | `.devcontainer/Dockerfile` (línea 25: Tiled 1.7.2 AppImage vía NoVNC) | Receta reutilizable para entorno de cartografía reproducible si trabajamos los mapas en contenedor. |

## Qué NO aprovechamos y por qué

- **El cliente/renderer como base de código viva** (`app/client/js/app/rendering/render.ts`, `renderable.ts`, `maps/*.ts`): bit-rotted (PixiJS v6 EOL sin pin — hoy `npm pack pixi.js` traería v8 incompatible), acoplado a singletons estáticos (`App`, `Render`, `Controller.instance`), tipado `any` en todas las fronteras (`types.ts` define global/event/friend/rw como `any`), bugs latentes (semántica invertida en `Renderable.dirty`, monkey-patch de `PIXI.Rectangle.prototype.intersects`). Y le falta **todo** lo que convierte un visor en juego: input, jugador, colisión por tile, cámara que siga a una entidad, warps, diálogos, eventos, guardado, audio. Convertirlo en juego = reescribir ~70% del cliente. Además, incorporar su código contamina el proyecto con AGPL.
- **El build pipeline tal cual**: usa `Deno.emit` (eliminado en Deno 1.22, 2022) y `Deno.run` (eliminado en Deno 2), más Velociraptor (runner abandonado). No corre en toolchain actual sin pinear Deno ≤1.21. La lógica es trivial de reimplementar (~500 líneas).
- **Los `.tmx` de Hoenn** (`maps/hoenn/`): son mapas de Hoenn, no de Madrid, y arrastran doble capa de derechos (AGPL de los cartógrafos + derivados del arte de Nintendo). Nuestros mapas serán propios.
- **Los spawns de PokeAPI**: no están commiteados (se generan en build clonando PokeAPI/api-data) y las localizaciones de Hoenn no nos sirven; escribiremos datos propios.
- **El worldmap de 8px** (`copyrighted/textures/all/worldmap.png` + `maps/all/worldmap.tmx`): es solo el minimapa de Hoenn, irrelevante.
- **El paso de TexturePacker** (`app/build/steps/31_textures_packer.ts`, proyectos `.tps`): requiere licencia comercial. Alternativas libres (free-tex-packer, spritesheet-js) emiten el mismo formato JSON que consume PIXI/Phaser.
- **Limitación funcional importante**: el tileset RSE **no incluye interiores** (gracidea solo mapea exteriores, los edificios no son enterables). Las escenas dentro de edificios — imprescindibles en un FireRed-like — necesitarán otro tileset Gen 3 externo.

## Licencia

Hay **dos regímenes legales distintos** y conviene no mezclarlos:

1. **AGPL-3.0 (el código)**. `LICENSE` es AGPL-3.0 verbatim sin cláusulas adicionales. Cubre el código de `app/` y, como obra de los contribuidores, la disposición de tiles en `maps/*.tmx`. Implicaciones reales para nosotros:
   - **Copiar código literal** (parser de `20_maps.ts`, `util.ts`, renderer, `npc.ts`) convierte TODO el cliente combinado de Pokemon Madrid en obra AGPL si se distribuye o se sirve por red. "No comercial" es irrelevante: la AGPL no distingue.
   - **Sección 13 (uso por red)**: si el juego servido por web contiene código AGPL, cada usuario remoto tiene derecho al código fuente completo. Mientras el acceso sea estrictamente privado (solo el equipo) no hay obligación práctica externa; en cuanto un tercero acceda, nace su derecho al fuente. Esto **choca con el repo privado** `DoubleN96/pokemon-madrid` en cuanto el juego se enseñe a alguien.
   - **Salida limpia**: las convenciones y la arquitectura no son copyrightables. Reimplementación clean-room del diseño (son ~500 líneas de pipeline + el algoritmo de grid) = cero contaminación AGPL.

2. **Copyright Nintendo/TPC (los assets)**. La carpeta se llama literalmente `copyrighted/` y su README declara "© Pokémon / Nintendo / Creatures / GAME FREAK". La AGPL **no cubre ni puede cubrir** estos assets — los mantenedores de gracidea no pueden sublicenciar IP ajena, y su README lo reconoce. Usar el tileset RSE tiene exactamente el mismo riesgo legal que cualquier fan-game: tolerado en la práctica, jamás "licenciado", revocable por Nintendo en cualquier momento, e incompatible con cualquier monetización. **Importante**: cumplir la AGPL no nos blinda en nada frente a Nintendo; son riesgos independientes.

**Posición recomendada**: asumimos conscientemente el riesgo fan-game por los assets (inherente al proyecto entero), pero NO añadimos encima la capa AGPL — reimplementamos en vez de copiar código, así el día que queramos abrir o cerrar el repo decidimos nosotros.

## Recomendación de motor

El análisis de gracidea **sí afecta a la decisión**, y la inclina claramente hacia **Phaser 3**:

- **ROM-hack pokefirered: descartar para este proyecto.** Todo el valor encontrado en gracidea (tileset Tiled, `.world`, pipeline web, streaming JSON) es inútil en un ROM-hack, que además no es web-nativo (requeriría emulador embebido), tiene una curva de tooling (decomp, porymap) ortogonal a nuestro stack, y agrava el riesgo legal (distribuir una ROM derivada es mucho más agresivo que un fan-game web con sprites).
- **Canvas puro: descartar.** Gracidea demuestra precisamente cuánto cuesta el "fontanería" de un motor casero: su autor invirtió el esfuerzo en streaming, atlas, tiles animados y aun así nunca llegó a tener input, colisiones, cámara de juego ni audio. Nosotros tendríamos que construir todo eso MÁS lo que a gracidea le falta. Es el camino lento.
- **Phaser 3: recomendado.** Razones concretas a la luz de este análisis: (1) **lee `.tmx`/JSON de Tiled de forma nativa** — el 80% del pipeline de gracidea (TMX→JSON custom) se vuelve innecesario; exportamos de Tiled y cargamos directo; (2) trae de serie exactamente lo que a gracidea le falta: input de teclado, física/colisiones por tile (metatiles bloqueados, propiedades de colisión en el tileset), cámara con follow, audio, escenas (= warps/interiores), tilemap batching (vs. el 1-Sprite-por-tile de gracidea que no escala); (3) heredamos lo mejor de gracidea sin su código: el tileset RSE + convenciones de capas + `madrid.world`, todo compatible con el flujo Tiled→Phaser; (4) cero AGPL: no necesitamos copiar ni una línea; (5) encaja con el stack Stratoma (web estática, TS + Vite, deploy nginx en Coolify, sin backend en runtime — igual que el modelo de serving de gracidea, que sí validó que un mundo grande funciona como estáticos chunked). Del diseño de gracidea portamos dos ideas a Phaser: el **streaming por secciones** si el mapa de Madrid crece más allá de lo que conviene cargar de golpe, y el **movimiento por grid** de `npc.ts` (Phaser no lo trae nativo; se implementa encima, o con un plugin tipo grid-movement).

## Próximos pasos

1. **Decisión de motor**: cerrar Phaser 3 + TypeScript + Vite como stack del runtime (este informe como input).
2. **Extraer el tileset**: copiar `copyrighted/textures/rse/tileset.png` + `tileset.tsx` a `pokemon-madrid/assets/tilesets/` (fuera de `resources-inbox/`), documentando origen y riesgo IP en un `ASSETS.md`.
3. **Spike de validación (1 mapa)**: crear `madrid-sol.tmx` en Tiled 1.7.2 con las convenciones de gracidea (capas 1-4, objectgroups `people`/`creatures`) y cargarlo en Phaser 3 con un jugador moviéndose por grid y colisiones por tile. Esto valida motor + tileset + convenciones de una vez.
4. **Crear `madrid.world`** con el primer puñado de zonas (Sol, Retiro, Malasaña...) siguiendo el formato de `maps/gracidea.world`.
5. **Buscar tileset de interiores Gen 3** (gracidea no lo tiene) — necesario para Centros Pokémon, casas y gimnasios.
6. **Definir `data/spawns.json` propio** con el esquema `{location: {método: {especie: chance}}}` y localizaciones de Madrid inventadas.
7. **Política de licencia del repo**: registrar en docs la decisión "diseño sí, código literal no" respecto a gracidea (AGPL) y la naturaleza fan-game no comercial del proyecto.
8. **Portar (reimplementando) el algoritmo de movimiento por grid** de `npc.ts` como módulo propio del jugador/NPCs en Phaser.