# RESEARCH — Eric Losti / Lostie Fan Games

> Investigación de referencia (web, junio 2026) sobre los fangames de **Eric Losti** (alias
> `EricLostie` / `Eric_Lostie`), creador del colectivo **Lostie Fangames**
> (blog `lostiefangames.blogspot.com`). Marcelino los admira ("muy buenos y bonitos") y quiere
> ese nivel de calidad para **Pokémon Madrid / Piso**.
>
> **Objetivo de este doc**: entender QUÉ los hace bonitos y pulidos, y traducirlo a mejoras
> concretas aplicables a **nuestro juego** — que es **web (Phaser), overworld estilo GBA
> FireRed/LeafGreen (FRLG)**. Importante: la pila técnica de Losti (RPG Maker XP + Pokémon
> Essentials, resolución Gen 5 / DS) es **distinta** a la nuestra; lo que copiamos es el
> **lenguaje visual, la dirección de arte y el feel**, no el motor.

---

## 0. TL;DR para el equipo

- Losti hace **5 fangames completos** en RPG Maker XP + Pokémon Essentials, con estética
  **Gen 5 (Black/White)**: sprites 96×96, battlers animados, HUD de combate moderno, overworld
  2.5D. **No son ROM hacks**: están hechos desde cero.
- Lo que los hace "bonitos": **consistencia de estilo Gen 5**, **mapas con identidad** (landmarks
  reales reconocibles), **arte custom** (retratos de personajes, logos, posters), **banda sonora
  original**, **UI pulida** (pokédex con info rica, brújula localizadora, transiciones), y
  **densidad de contenido** (16 gimnasios, 100h, modos de juego).
- **Pokémon Iberia** es EL precedente directo de nuestro proyecto: región basada en España con
  **mapa de Madrid**, líderes de gimnasio = figuras españolas famosas, landmarks reales,
  humor castizo. Es prácticamente la "prueba de concepto" de Pokémon Madrid.
- **No podemos clonar su motor** (estamos en Phaser web / GBA), pero SÍ podemos subir nuestro
  nivel copiando: identidad de mapas, arte custom de personajes, HUD de combate cuidado,
  micro-feedback y polish, y densidad/variedad de contenido.

---

## 1. Catálogo de juegos

Los 5 títulos completos (orden cronológico aproximado), todos jugables en PC sin emulador y en
Android vía **Joiplay**:

| # | Juego | Setting / Región | Gimnasios | Estado | Notas clave |
|---|-------|------------------|-----------|--------|-------------|
| 1 | **Pokémon Titán** | 2 regiones nuevas | 16 | Completo | Su **primer** fangame. Largo, desmantelar varios Teams villanos. |
| 2 | **Pokémon Iberia** | **España** (Madrid, Barcelona, Valencia, Sevilla, Ibiza) | 8→16 (2 regiones en remake) | Completo (2019) | **EL más relevante para nosotros.** Humor negro, líderes = figuras españolas, landmarks reales. |
| 3 | **Pokémon Ópalo** | 2 regiones, temática **western** americano | 16 | Completo (v2.05, 2022) | Considerado **su mejor juego completo**. Gráficos revisados estilo B/W, OST custom, +40h, mayor dificultad. Ambientado 50 años post Rojo/Azul, colapso económico/social. |
| 4 | **Pokémon Añil** | **Kanto** modernizado | 8 | Completo (+versión EN) | Remake de Kanto "totalmente modernizado". Opción de jugar con las 9 generaciones o roster clásico. |
| 5 | **Pokémon Z** | **Kalos antiguo** (300 años antes de X/Y) | 12 + postgame | Completo (release final 12-feb-2026) | Su **"juego definitivo"**, "más ambicioso y de mayor calidad". Guerra/Arma Definitiva, rey Aster Zephyr. |

**El que cita Marcelino (Pokémon Z)** es el más pulido y el techo de calidad del autor.
**El que más nos sirve de plantilla (Iberia)** ya resolvió el problema "Pokémon + España + Madrid".

Fuentes de catálogo: blog oficial, web vercel, wikis Fandom (ver §6).

---

## 2. Stack técnico de Losti (y por qué NO es el nuestro)

| Aspecto | Losti (Eric Losti) | Nuestro proyecto (Pokémon Madrid) |
|---|---|---|
| Motor | **RPG Maker XP** + **Pokémon Essentials** (Ruby/RGSS) | **Phaser** (JS) en **web** |
| Distribución | Ejecutable Windows (`.exe`), Android vía Joiplay, Linux vía MKXP-Z | Navegador (Coolify/Docker), sin instalación |
| Estética sprites | **Gen 5 / Black-White**: battlers **96×96 animados**, overworld 2.5D | **Gen 3 / FRLG**: sprites **64×64**, 2D plano |
| Resolución | DS-like (mayor, ~Gen 5) | GBA-like (menor, FRLG) |
| Assets | Tilesets/recursos de la comunidad Essentials + arte custom | Tilesets FRLG (gracidea/PokémonDB), sprites FRLG |
| Audio | **OST original** (p.ej. compositor Danespinosa, Bandcamp) | Por definir |

**Consecuencia práctica:** no podemos "portar" su motor ni sus assets de Gen 5 a nuestro GBA-web
sin romper la coherencia. Pero su **dirección de arte y su nivel de acabado** son perfectamente
replicables dentro del estilo FRLG. **La calidad no viene del motor: viene del cuidado.**

> Nota de decisión: si en algún momento se quisiera el "look Gen 5" de Losti de verdad, implicaría
> cambiar el estilo base del juego de FRLG (64×64) a BW (96×96) — decisión de producto grande, NO
> recomendada a mitad de proyecto. Recomendación: **quedarnos en FRLG y subir el techo de polish
> DENTRO de ese estilo.**

---

## 3. Análisis de estilo: ¿qué los hace "bonitos" y pulidos?

Desglose de los ingredientes concretos de su calidad percibida, ordenados por impacto/replicabilidad
en nuestro juego web.

### 3.1 Mapas con identidad real (ALTO impacto, ALTA replicabilidad)
- En **Iberia**, cada ciudad española tiene **mapa propio con sus edificios más representativos**
  (Madrid, Barcelona, Valencia, Sevilla, Ibiza). Landmarks reales convertidos en tilesets:
  aeropuerto de Castellón "encantado" (tipo fantasma), Valle de los Caídos como sede final de Liga.
- El jugador **reconoce el sitio**. Esa familiaridad es el 80% del "qué bonito".
- **Para nosotros**: nuestro mapa de Madrid/Chamberí/Tetuán debe tener landmarks RECONOCIBLES
  pixelados en estilo FRLG (Bravo Murillo, Cuatro Torres, Plaza de España, metro, etc.), no calles
  genéricas.

### 3.2 Coherencia de estilo de un extremo a otro (ALTO impacto)
- Todo en sus juegos respira el mismo estilo Gen 5: overworld, battlers, menús, tipografía.
  Nada "desentona" ni parece sacado de otro juego.
- **Para nosotros**: TODO debe ser FRLG coherente. Mezclar un tile FRLG con un sprite Gen 5 o un
  icono moderno rompe la magia. Una sola fuente de verdad de paleta + tileset.

### 3.3 Arte custom de personajes (ALTO impacto)
- Losti encarga/crea **artwork dedicado**: retratos de personajes, logos de juego, posters.
- Ya tenemos esto encaminado: `docs/refs/artworks/` contiene **logo, posters, y retratos custom**
  de personajes (protagonistas, rivales, líderes). **Esto es exactamente lo que hace Losti.**
- **Para nosotros**: usar esos artworks en pantallas de presentación de líder, intro, créditos y
  fichas de personaje. El arte custom es lo que diferencia un fangame "cuidado" de uno genérico.

### 3.4 HUD de combate moderno y legible (MEDIO-ALTO impacto)
- Sus combates usan un HUD estilo Gen 5: databoxes con barra de HP animada, indicadores de tipo,
  iconos de estado, transiciones de entrada/salida del databox durante animaciones de ataque.
- **Para nosotros (Phaser/FRLG)**: aunque el estilo base sea FRLG, podemos pulir el HUD:
  barra de HP que **anima** (no salta), número de HP, iconos de estado, animación de entrada de
  databoxes, sombreado de la plataforma de combate. Pequeños detalles = sensación "pro".

### 3.5 Banda sonora (MEDIO impacto)
- Cada juego tiene **música custom/original** (Ópalo y Z destacan OST propia).
- **Para nosotros**: aunque empecemos con música chiptune FRLG, tener temas con identidad
  (tema de Madrid, tema de rival Álvaro, tema de Team Schizo) sube mucho el nivel percibido.

### 3.6 UI rica fuera del combate (MEDIO impacto)
- Pokédex con **método de evolución** mostrado, **brújula localizadora** de Pokémon por ruta,
  menú de pausa pulido, guías integradas.
- **Para nosotros**: una Pokédex/menú cuidado con info útil y bien maquetado (no listas crudas).

### 3.7 Densidad y variedad de contenido (MEDIO impacto, ALTO coste)
- 16 gimnasios, 2 regiones, 40-100h, **modos de juego** (Nuzlocke integrado con ayudas, Random,
  Monotype, Radical/dificultad), crafteo, reconstrucción de aldea, following Pokémon.
- **Para nosotros (MVP web)**: NO necesitamos todo esto para el MVP. Pero los **modos de juego** y
  **following Pokémon** son "wow" baratos de comunicar. Priorizar 1-2 detalles de densidad.

### 3.8 Polish de micro-feedback (BAJO coste, ALTO retorno percibido)
- Transiciones de pantalla, animaciones de menú, "juice" en cada acción.
- **Para nosotros**: lo más rentable. Cada interacción debe tener feedback (sonido, animación,
  transición). Es lo que separa "prototipo" de "juego".

---

## 4. Lista concreta de mejoras aplicables a NUESTRO juego (Phaser / FRLG web)

Priorizadas por **ratio impacto/esfuerzo**. Marca lo que ya tengamos.

### Prioridad 1 — máximo retorno, bajo coste
1. **Landmarks de Madrid reconocibles en el mapa.** Pixel-art FRLG de edificios reales de
   Chamberí/Tetuán/Bravo Murillo (no calles genéricas). Es el ingrediente nº1 del "qué bonito"
   de Iberia. → `src/world/` + tilesets.
2. **Usar los artworks custom que YA tenemos** (`docs/refs/artworks/`: logo, posters, retratos de
   protagonistas, rivales, líderes) en: pantalla de título, intro, presentación de líder antes del
   combate, fichas de personaje, créditos. Es lo que hace Losti y ya lo tenemos a mano.
3. **HUD de combate pulido**: barra de HP **animada** (interpolación, no salto), número de HP,
   iconos de estado/tipo, animación de entrada del databox. → `src/ui/battle/`.
4. **Micro-feedback / "juice"**: transición de pantalla al entrar en combate (fundido/flash estilo
   FRLG), sonidos en menús, animación de selección. Bajo coste, gran salto de calidad percibida.
5. **Coherencia de estilo estricta**: una sola paleta + tileset FRLG como fuente de verdad. Auditar
   que ningún asset desentone (nada de mezclar Gen 5 con Gen 3).

### Prioridad 2 — alto impacto, coste medio
6. **Pantalla de presentación de líder de gimnasio** con su artwork custom + nombre + frase
   (estilo Iberia: "Álvaro Alonso, el Vicepresidente del Humo"). Convierte cada combate en un
   evento.
7. **Música con identidad**: al menos tema de mapa Madrid, tema de combate normal, tema de líder/
   rival. Chiptune FRLG está bien; lo importante es que tengan carácter.
8. **Pokédex/menú rico**: maquetado cuidado, info útil (tipo, descripción, dónde encontrar). No
   listas crudas. Inspiración directa: la Pokédex con método de evolución de Pokémon Z.
9. **Diálogos con personalidad** (el humor castizo que ya tenemos en el lore — ver
   `SPEC-POKEMON-PISO.md`): el tono de Iberia (paródico, referencial) es justo nuestro registro.
   El texto bien escrito sube tanto el nivel como el arte.

### Prioridad 3 — densidad de contenido (post-MVP)
10. **Following Pokémon** (el Pokémon te sigue por el overworld). Muy "wow", presente en Z. En
    Phaser es factible con un sprite que sigue el path del jugador.
11. **Un modo de juego extra** (p.ej. Nuzlocke/Random) como gancho de rejugabilidad. Losti los usa
    como sello de calidad.
12. **Landmarks "set-piece"** memorables (el equivalente a "Valle de los Caídos = Liga" o
    "aeropuerto encantado" de Iberia): p.ej. un gimnasio/Liga en un sitio icónico de Madrid.

### Lo que NO debemos copiar (trampas)
- **No cambiar a motor RPG Maker / estilo Gen 5** a mitad de proyecto: rompería nuestra base FRLG
  y el target web. La calidad de Losti se consigue con cuidado, no con su motor.
- **No perseguir 16 gimnasios / 100h** en el MVP: su densidad es fruto de años. Mejor 4-8
  gimnasios MUY pulidos que 16 mediocres.
- **No copiar el humor más hiriente/polémico** de Iberia (Losti tuvo que moderar chistes
  post-lanzamiento; referencias a escándalos reales). Nuestro tono castizo/ácido sí, pero medido.

---

## 5. Mapeo Iberia → Pokémon Madrid (precedente directo)

Pokémon Iberia ya resolvió nuestro mismo problema. Comparación útil:

| Elemento Iberia | Equivalente Pokémon Madrid |
|---|---|
| Región = España, ciudades reales | Región = Madrid distorsionado (Chamberí/Tetuán + Salamanca + Torrevieja) |
| Mapa de **Madrid** con landmarks | Nuestro mapa Chamberí/Bravo Murillo con landmarks |
| Líderes = figuras españolas famosas | Líderes = amigos reales de Marcelino (Álvaro, Alex, Adrián…) |
| Profesor Oak = Félix Rodríguez de la Fuente | Mentor = Iván "FinTips" (ya en lore) |
| Pokéball = "Hacendado Ball" | Oportunidad de gag castizo equivalente (Mercadona/Día/Carrefour Ball, etc.) |
| Españolización de Pokémon (Ludicolo con paella) | Equivalentes castizos madrileños |
| Humor negro / parodia de tópicos | Parodia adulta del estrés laboral/alquiler/Tinder (ya en SPEC) |
| Sede de Liga = Valle de los Caídos | Sede de Liga = landmark icónico de Madrid por definir |

**Conclusión**: nuestro concepto NO es arriesgado — Iberia demostró que "Pokémon + España + humor"
funciona y gusta. Tenemos ventaja: lore más personal (amigos reales) + arte custom ya producido.

---

## 6. Recursos y enlaces

### Oficiales Eric Losti / Lostie Fangames
- Blog principal: https://lostiefangames.blogspot.com/
- Web portfolio: https://ericlostie.vercel.app/
- Pokémon Z (página): https://lostiefangames.blogspot.com/p/pokemon-z.html
- Pokémon Z (web dedicada): https://pokemonzfangame.com/
- Pokémon Añil: https://lostiefangames.blogspot.com/p/pokemon-anil.html
- Pokémon Ópalo: https://lostiefangames.blogspot.com/p/pokemon-opalo.html
- Pokémon Titán: https://lostiefangames.blogspot.com/p/completo-descarga-httpswww.html
- YouTube EricLostie: https://www.youtube.com/channel/UCJirVLggnKmNw2IuZUuD4Rg
- X / Twitter: https://x.com/Eric_Lostie

### Wikis y prensa (estilo, mecánicas, recepción)
- Wiki Pokémon Z (Fandom): https://pokemon-z-the-fangame.fandom.com/wiki/Pokemon_Z:_The_Fangame_Wiki
- Wiki Pokémon Ópalo (Fandom, incl. mapas): https://pokemon-opalo.fandom.com/es/wiki/Wiki_Pokemon_Opalo_Principal
- Wiki Pokémon Iberia (Fandom): https://pokemon-iberia.fandom.com/es/wiki/
- Xataka — Pokémon Iberia (análisis cultural/estilo): https://www.xataka.com/literatura-comics-y-juegos/ash-puigdemont-rivera-iniesta-pokemon-iberia-fangame-hecho-rpg-maker-que-parodia-todos-topicos-espana
- MENzig — Pokémon Iberia (características): https://www.menzig.tech/a/pokemon-iberia-espana-juego/
- Xataka Android — Ópalo "mejor fangame español": https://www.xatakandroid.com/tutoriales/pokemon-opalo-como-jugar-android-al-mejor-fangame-espanol-pokemon

### Assets / técnica (para subir el polish DENTRO de FRLG)
> OJO licencia: todo asset de Pokémon = copyright The Pokémon Company / Game Freak / Nintendo.
> Uso solo en proyecto **fan no comercial, repo privado** (coherente con `RECURSOS.md`).
- Sprites FRLG (Gen 3) — PokémonDB: https://pokemondb.net/sprites (ya en `RECURSOS.md`)
- Tilesets estilo GBA — gracidea: https://github.com/lowlighter/gracidea (ya clonado en repo)
- The Spriters Resource — HUD/backgrounds FRLG:
  https://www.spriters-resource.com/game_boy_advance/pokemonfireredleafgreen/
- Eevee Expo — recursos de UI/gráficos (referencia de "look", aunque son para Essentials):
  - FRLG Battle UI: https://eeveeexpo.com/resources/1294/
  - Graphics category: https://eeveeexpo.com/resources/categories/6/
- PokéCommunity — tilesets / interface: https://www.pokecommunity.com/tags/tilesets/
- (Contexto técnico FRLG vs BW — por qué seguimos en FRLG) sprites 64×64 vs 96×96:
  https://pokemondb.net/pokebase/339724/

### Recursos internos relacionados (ya en el repo)
- `docs/RECURSOS.md` — registro de PokémonDB + gracidea
- `docs/refs/artworks/` — **artwork custom ya producido** (logos, posters, retratos de personajes)
- `docs/SPEC-POKEMON-PISO.md` — lore, personajes, tono (alinea con el humor tipo Iberia)
- `docs/ANALISIS-gracidea.md` — análisis de tilesets/pipeline de mapas

---

## 7. Veredicto

Eric Losti demuestra que un fangame "bonito" no depende de un motor caro, sino de **cuidado
sistemático**: estilo coherente, mapas con identidad real, arte custom de personajes, HUD pulido,
música con carácter y micro-feedback en todo. **Pokémon Iberia es nuestra prueba de concepto** (ya
hizo Madrid y España con éxito), y **Pokémon Z es el techo de acabado** a imitar dentro de lo posible.

Nosotros NO copiamos su motor (somos Phaser/web/FRLG, ellos RPG Maker/Gen 5), sino su **disciplina
de polish**. Con los artworks que ya tenemos, el lore ya escrito y un mapa de Madrid reconocible,
estamos en buena posición para alcanzar ese "muy bueno y bonito" — siempre que prioricemos
profundidad de acabado sobre cantidad de contenido.
