# CONTENT — Ideas de contenido para Pokémon Piso (Liga Chamberí)

> **Scope:** `content-ideas`. SOLO investigación + diseño narrativo. NO toca `src/`.
> Este documento propone **contenido nuevo aterrizado** (puzzles, objetos, NPCs, eventos,
> secretos) basado en FRLG/Essentials y adaptado al lore real de Madrid + los amigos de
> Marcelino.
>
> **Fuentes de verdad respetadas:**
> - `docs/SPEC-POKEMON-PISO.md` — roles canónicos (Marcelino = jugador, Álvaro = campeón).
> - `docs/LORE-FROM-WHATSAPP.md` — anécdotas REALES verificadas (alta fiabilidad).
> - `docs/WORLD-GDD.md` — mapa, mecánicas castizas, huecos del GDD.
> - `src/world/gyms.js` — **los 8 gimnasios YA están implementados** con diálogos. Aquí
>   NO se reescriben: se añade el PUZZLE/mecánica que les falta y guiños extra.
>
> **Mapas existentes:** `tetuan`, `ruta2`, `chamberi`, `ruta3` (Gran Vía), `retiro` +
> interiores (`bar_tetuan`, `cafe_modernismo`, `mercado_vallehermoso`, `estacion_fantasma`,
> `peluqueria`, `quiosco`, `ultramarinos`, `farmacia`, centros Pokémon, casa Marcelino).
>
> **Gen 1 real** (17 tipos, sin Hada/Siniestro/Acero salvo Magnemite). Todas las propuestas
> de equipos usan IDs Gen 1. Todo es **opcional y modular**: el orquestador elige qué meter.
>
> **Estado de cada ítem:** `[LISTO]` = texto y datos cerrados, copiable casi tal cual ·
> `[BORRADOR]` = idea sólida, necesita números/coords del orquestador.

---

## 0. Mapa rápido de qué hay y qué propongo

| Bloque | Qué existe ya | Qué añade este doc |
|---|---|---|
| 8 Gimnasios | Salas + líderes + diálogos (`gyms.js`) | **1 puzzle temático por gimnasio** (lo que les falta) |
| Objetos | poke-ball / potion / antidote | **18 objetos castizos** con efecto, lore y dónde se consiguen |
| NPCs | Entrenadores de ruta + tenderos | **14 NPCs nuevos** con personalidad real del grupo |
| Eventos | — | **9 eventos/sidequests** encadenados al lore real |
| Secretos | Estación Fantasma cerrada | **11 secretos** (zonas, encuentros, easter eggs) |
| Post-liga | — | **Álvaro (Campeón) + Team Schizo + post-game** aterrizado |

---

## 1. PUZZLES DE GIMNASIO (uno por líder)

> Patrón FRLG: cada gimnasio tiene un puzzle que **expresa la personalidad del líder** y
> alarga la sala antes del combate. Los gimnasios actuales (`gyms.js`) son salas-caja sin
> puzzle. Aquí se propone el puzzle de cada uno, **reutilizando el motor de tiles + warps +
> NPCs que ya existe** (interruptores = NPCs/signs que abren paso, cintas transportadoras =
> warps encadenados, bloques empujables = colisión condicional). Nada exige motor nuevo.

### GIM 1 · Cashflow (Iván "FinTips") — Tipo: el ROI [LISTO]
**Puzzle "Diversifica la cartera".** Tres pasillos paralelos con un "becario-bolsa" (NPC bloqueante)
en cada uno mostrando un activo: 🟢 LADRILLO, 🔵 CRIPTO, 🟡 RENT2RENT. El cartel de Iván pide
*"no pongas todo en un solo activo"*: hay que derrotar a los 3 becarios **en orden de menor a mayor
riesgo** (ladrillo → rent2rent → cripto). Si combates el de cripto primero, los otros dos dicen
*"Margin call, vuelve al principio"* y te devuelven a la entrada (warp). Reusa el patrón de
"entrenador bloqueante" que ya usa el becario actual.
- **Guiño:** panel de cotización dinámico (sign) que cambia de texto según los becarios vencidos:
  `"Bravo Murillo +0,3% · Vape de Jesús: caída libre · Tu cartera: +1 medalla pendiente"`.

### GIM 2 · Trading & Casino (Mariel) — La ruleta HFT [LISTO]
**Puzzle "Microsegundos".** Suelo de **casillas de casino** (rojo/negro) que se "encienden" por turnos
rápidos (decorado, no requiere timing real: son tiles que el cartel describe como peligrosos). El
camino seguro es la secuencia que Mariel **suelta atropelladamente** en un diálogo previo, demasiado
rápido para pillarla a la primera (*"rojo-rojo-negro-rojo-pleno-y-ya, ¿lo pillaste? ¡que me voy a
sevillanas!"*). El crupier (NPC) la repite **despacio** si le ganas primero. Mecánica: casillas-warp
incorrectas = vuelta a la entrada.
- **Guiño:** una máquina tragaperras (sign) que al examinarla da un mensaje aleatorio: 9/10 *"NO
  PREMIO. La banca, o sea Mariel, gana."*, 1/10 da **5 monedas de casino** (objeto, ver §2).

### GIM 3 · Fantasma de Luxemburgo (Jesús "la Rata") — Niebla y mugre [LISTO]
**Puzzle "El piso a oscuras".** Sala llena de **vapor** (capa overhead semitransparente, como la
niebla de FRLG): solo ves 2-3 tiles alrededor. Hay que llegar al líder cruzando un suelo sembrado de
**trastos de Jesús** (colisiones invisibles bajo la niebla). Pistas: 3 "notas sucias" (signs) en las
paredes marcan por dónde NO pisar (*"aquí dejé algo en 2019, no mires"*). Atajo opcional: si llevas
el objeto **Ambientador** (§2), la niebla se "disipa" (flag) y ves toda la sala.
- **Guiño:** un NPC "colega vapeador" que deambula y, si chocas con él en la niebla, dice *"¿eres tú,
  Marce? No veo ni mi propio injerto"*.

### GIM 4 · Camión de Lavapiés (Sergio Guillén) — Tetris de palés [LISTO]
**Puzzle "Carga el camión".** La caja del camión está llena de **palés de cerveza empujables**
(bloques tipo roca FRLG). Hay que empujarlos a sus huecos marcados para despejar el pasillo hasta
Sergio. Si te equivocas, un colega forofo (NPC) dice *"así no entra el palé, manazas"* y hay un botón
de reset (sign: *"PALANCA — recolocar carga"*). Tema: Sergio es fuerza bruta, el puzzle es físico.
- **Guiño:** una nevera (sign) que avisa *"NO TOCAR sin pagar — Sergio"*; si la abres igualmente,
  pierdes 50₧ (*"¡eh, esa birra la pagas!"*) — micro-broma de su tacañería cervecera.

### GIM 5 · Notarías Encantadas (Blanca) — Firma en regla [LISTO]
**Puzzle "Expediente sin vicios de forma".** Mesas de firma (3) que hay que visitar **en el orden
correcto del trámite**: 1) compulsar copia, 2) firmar original, 3) sellar. Cada mesa es un sign que
estampa un "sello" (flag); si firmas antes de compulsar, Blanca (o un opositor) dice con dulzura
*"esto tiene un vicio de forma, cielo, vuelve a empezar"*. Tema: orden burocrático impecable.
- **Guiño:** el opositor eterno (ya existe) suelta el **tema 47** si lo examinas 3 veces seguidas →
  pequeño easter egg de texto absurdamente largo que puedes saltar.

### GIM 6 · Todo a Cien (Eduardo + Madre) — La caja registradora [LISTO]
**Puzzle "Pasa por caja".** Recorrido de **torniquetes** (NPCs Sofía-clónicas) que cobran peajes de
texto: *"3€ por entrar, 2€ por respirar"* (no cobran dinero real, es flag; o cobran simbólico 1₧ por
puerta para reforzar la broma). El camino "gratis" está oculto detrás de una estantería movible
(sign: *"OFERTA — empuja para colarte sin pagar"*). Tema: en este gimnasio todo se factura, y el
mérito es **encontrar la forma de no pagar**.
- **Guiño:** un cartel de precios que escala absurdamente si lo relees: 3€ → 5€ → *"por leer dos
  veces: 8€"* → *"deja de leer, esto también se cobra"*.

### GIM 7 · Máster de Másters (Ángel) — Revisión milimétrica [LISTO]
**Puzzle "Corrige el examen".** Pupitres alineados al milímetro: en uno hay un **examen con un fallo**
(sign destacado). Hay que examinar los pupitres hasta encontrar la "errata" y "corregirla" (flag);
solo entonces Ángel deja pasar (*"correcto. Aceptable. Lo anoto"*). Falsos positivos: 2-3 pupitres que
parecen tener el fallo pero no (*"esto está bien, sigue buscando, sin prisa"*). Tema: TOC perfeccionista.
- **Guiño:** Alex (NPC) aparece al fondo intentando escaquearse al móvil; Ángel lo regaña por sign:
  *"Alex, suelta el Tinder y revisa la sección 3"*.

### GIM 8 · Cuartel Team Schizo (Adrián Barrera) — El Orden por decreto [LISTO]
**Puzzle "El Orden Perfecto".** Sala dividida en zonas por **decretos** (signs numerados): cada decreto
fuerza una dirección de paso (DECRETO Nº1: *"aquí solo se anda hacia el norte"*). Avanzas obedeciendo
los decretos hasta llegar a Adrián. Un decreto está **mal numerado** (el caos): si lo "ignoras" (pisas
contra la regla) abres un atajo, reforzando que **el caos vence al orden**. Tema central del juego.
- **Guiño:** propaganda en bucle (signs): *"Vacaciones por decreto · Risas cuando lo diga Adrián ·
  Aprobado por mi tía"*. El comandante (ya existe) sabotea con náuseas (guiño a Cortina descartado).

> **Coste de integración:** todos reusan tiles + signs + warps + NPCs bloqueantes que el motor YA
> soporta (ver `CONTRACTS.md`). El único que pide una capa nueva es la **niebla del GIM 3** (overhead
> semitransparente), que ya existe conceptualmente en la Estación Fantasma.

---

## 2. OBJETOS CASTIZOS (mochila / tienda / regalos)

> El motor MVP tiene `poke-ball / potion / antidote`. Estos 18 objetos extienden la mochila con
> sabor local. Cada uno indica **efecto mecánico** (mapeable a items Gen 1 estándar para no inventar
> sistemas) + **lore** + **dónde se consigue**. Muchos son re-skins de items clásicos (lo barato y
> efectivo). Precios en ₧ (pesetas, como ya usa el juego).

### Curativos (re-skin de Potion / Status heals) [LISTO]
| Objeto | Efecto (= item base) | Precio | Dónde | Lore |
|---|---|---|---|---|
| **Caña con bravas** | +20 PS (= Potion) | 300 | Bar El Tetuán, camión de Sergio | "Una cañita y unas bravas curan casi todo." |
| **Bocata de calamares** | +50 PS (= Super Potion) | 700 | Quiosco de Sol (futuro), Ultramarinos | El de la Plaza Mayor, icónico de Madrid. |
| **Cocido madrileño** | +PS completos + cura estado (= Full Restore, caro/raro) | 2.000 | Mercado de Vallehermoso | "Tres vuelcos: sopa, garbanzos y carne. Resucita." |
| **Manzana madrileña** | +50 PS (ya en GDD: Mercado Vallehermoso) | 350 | Mercado Vallehermoso | Ya nombrado en WORLD-GDD §3.3. |
| **Queso manchego** | Cura confusión (= persim berry-like) | 200 | Mercado Vallehermoso | Ya en GDD. |
| **Jamón ibérico** | Cura todos los estados (= Full Heal) | 800 | Mercado Vallehermoso | Ya en GDD. "Peaje de ron del padre de Marcelino" como variante. |
| **Coca-Cola de la madre de Eduardo** | +60 PS (= Soda Pop FRLG) **pero te cuesta 150₧ extra** al usarla | 150 (+cobro) | Gimnasio 6 / vending | Guiño REAL: la madre de Eduardo le cobró una Coca-Cola a Álvaro. |
| **Ambientador** | Disipa la niebla del GIM 3 (objeto-llave de puzzle) | — | Regalo de un NPC del CPoke | Hace usable el atajo del gimnasio fantasma. |

### Pokébolas temáticas (re-skin de Ball) [LISTO]
| Objeto | Efecto | Precio | Lore |
|---|---|---|---|
| **Boina-bola** | = Poké Ball (ratio 1×) | 200 | Pokébola con boina; la "de toda la vida". |
| **Tupper-bola** | = Great Ball (1.5×) | 600 | "El tupper de mamá: cabe todo." |
| **Cubata-bola** | = Ultra Ball (2×) | 1.200 | La del peaje de ron del pueblo. |
| **Casino-bola** | Captura aleatoria: 50% como Ultra, 50% falla seguro (ludopatía) | 800 | Solo en el Gimnasio 2 (Mariel). "La banca gana." |

### Objetos clave / coleccionables (lore real) [LISTO]
| Objeto | Función | Dónde | Lore (verificado en WhatsApp) |
|---|---|---|---|
| **Llave Antigua** | Abre la Estación Fantasma de Chamberí (ya en GDD §3.3) | Evento Abuelo Ramón | Estación clausurada 1966. |
| **Pase de Metro** | Viaje rápido entre estaciones (ya en GDD §8) | Tras 1ª medalla | Transporte de Madrid. |
| **Tricount de Bercero** | Objeto-evento: desbloquea la zona "El Pueblo" (post-liga) | Marcelino lo recibe del grupo | REAL: tricount "BERCERO 2026" de las fiestas del pueblo. |
| **Excel de Rentabilidad de Álvaro** | Objeto-trofeo del post-liga; al examinarlo da una pista de ROI inútil | Botín del Campeón | REAL: Álvaro "no combate sin ROI calculado". |
| **Vape de Jesús** | Objeto-broma: lo encuentras tirado por el mapa; si lo "usas", -1 PS de tu líder y texto tonto | Suelos varios (4 unidades escondidas) | REAL: Jesús vapea compulsivamente. |
| **Maserati de Álvaro (llavero)** | Cosmético; el guardia del piso lo menciona | Secreto en Chamberí | REAL: "compañero de piso con un Maserati". |
| **Moneda de casino** | Se canjea por premios en el Gimnasio 2 / casino | Tragaperras, eventos | Plan recurrente real de la peña. |

---

## 3. NPCs CON PERSONALIDAD (de relleno del mundo)

> NPCs **charlatanes** (no entrenadores) que dan vida a las calles con el humor del grupo. Cada uno
> trae líneas listas en la voz del personaje. Sprite = atlas existente (`gentleman`, `lass`, `hiker`,
> `pokemaniac`, `scientist`, `psychic`, `guitarist`, `elder_m`, etc.). Pensados para colocar en
> tetuan/chamberi/ruta3/retiro.

### 3.1 NPCs derivados de personajes REALES (alta fiabilidad)

**El Churches — NPC del caos viajero** (sprite `pokemaniac` o `guitarist`) [LISTO]
> No estaba en la lista de 12, pero el lore lo marca como pilar real. NPC opcional, ideal en una zona
> "aeropuerto/viajes" o en el bar.
- *"Tokyo, plan underground, llego de noche y empezamos. Tú trae el flow."*
- *"Si no me voy a Japón, os dejo la casa de Jerez. Pero avisad con tiempo, guarros."*
- *"En el tricount conmigo no falla ni un euro. Lo de Cancún… eso ya es otra historia."*

**Maura — la celestina de la salsa** (sprite `lass`) [LISTO]
> NPC de un bar/sala de baile. Une a NPCs en pareja, controla "el ritmo de la noche".
- *"¿Bailas? Yo controlo el ritmo de la noche. Tú déjate llevar y luego me lo agradeces."*
- *"A esos dos los junté yo. Salsa, dos vueltas y un cubata. Infalible."*

**Danna — la hustler que bloquea ruta** (sprite `lass`) [LISTO]
> Novia de Marcelino. NPC de bloqueo amable (mientras no tengas X medalla): *"Para por aquí no se
> pasa todavía, mi amor, primero demuéstrame que vas en serio. Yo trabajo en cuatro sitios, no tengo
> tiempo para flojos."*

**Juan Carlos "el Guapo" — narrador** (sprite `gentleman` con tupé) [LISTO]
> Aparece en momentos clave dando "narración épica" de tus logros, estilo Julio Iglesias.
- *"Y así, nuestro héroe entró en la plaza… *carraspea, intenta cantar* …y nadie aplaudió. Pero yo lo
  cuento con pasión."*
- (Tras una medalla) *"¡Otra medalla para la leyenda! Lo narraré en mi próximo disco. Que no saldrá."*

**El Tío de la Autoescuela — guardián del transporte** (sprite `hiker`/`gentleman` grande) [LISTO]
> Bloquea el Metro/Vuelo hasta que pasas un "examen teórico" absurdo (minijuego de 3 preguntas).
- *"¿Quieres el Pase de Metro? Primero: ¿qué línea es la gris? Mal. Otra vez. El teórico es sagrado."*

**El casero José Antonio — cobro del día 1** (ya tiene sprite `elder_m`/`probopass`) [LISTO]
> NPC recurrente que aparece "el día 1 de cada mes" (cada N pasos/eventos) y te bloquea hasta pagar
> un alquiler simbólico (50-100₧). REAL: casero del piso de Marcelino y Álvaro.
- *"Día 1, ya sabes. No pasas hasta que pagues. La calvicie es poder, chaval."*

### 3.2 NPCs de ambiente castizo (sin nombre real, color local)

| NPC | Sprite | Línea |
|---|---|---|
| Chulapo de verbena | `gentleman` | *"¡Mira qué bien bailo el chotis sin moverme del sitio! Es arte madrileño."* |
| Señora del Rastro | `lass`/`elder_f` | *"Aquí tengo de todo: una boina-bola, un vape de no sé quién y un Excel manchado. ¿Compra algo?"* |
| Hipster de Malasaña | `guitarist` | *"Esto antes era una mercería, ahora es un bar de cervezas artesanas. El barrio ha muerto. Mola."* |
| Turista perdido | `pokemaniac` | *"Excuse me… ¿Plaza Mayor? Llevo tres horas dando vueltas en Sol."* |
| Camarero del Tetuán | `gentleman` | *"¿Lo de siempre? Caña y bravas. Aquí se sube la felicidad a tapeo."* (engancha con sistema Tapeo) |
| Yayo del banco | `elder_m` | *"En mis tiempos no había Pokémon, había gripe. Y se curaba con caldo. Anda, vete a jugar."* |
| Niña del Retiro | `lass` | *"Mi Pokémon es más feliz aquí, en el parque. ¿El tuyo también sonríe?"* (guiño a Pokémon siguiéndote) |
| Ejecutivo de Cuatro Torres | `scientist` | *"El futuro es vertical, amigo. Como mi hipoteca."* |

---

## 4. EVENTOS Y SIDEQUESTS (encadenados al lore real)

> Pequeñas misiones que usan flags + NPCs + diálogos (sin motor nuevo). Ordenadas de pronto-juego
> a post-liga. Cada una está **anclada a una anécdota REAL** del grupo para que tenga alma.

### E1 · "La Llave de la Estación" [LISTO — ya semillado en GDD §3.3]
- **Dónde:** Café del Modernismo (Chamberí). **Gatillo:** hablar con el **Abuelo Ramón** (ex-trabajador
  del Metro). Cuenta que la estación se clausuró en 1966 y que los obreros "veían cosas".
- **Reto:** te reta a combate (equipo fantasma). Premio: **Llave Antigua** + 2.800₧.
- **Recompensa:** abre la **Estación Fantasma de Chamberí** (encuentros de Gastly/Haunter; post-liga,
  el legendario fantasma). Ya está medio implementado: solo falta cablear el reto del abuelo.

### E2 · "El alquiler de día 1" [LISTO]
- **Dónde:** salida del piso de Marcelino (Tetuán). **Gatillo:** intentar salir el primer día de juego.
- **Reto:** José Antonio (casero) te bloquea: paga 100₧ o "convéncele" (combate simbólico opcional).
- **Lore REAL:** discusión de gastos del piso ("¿el agua la pagamos nosotros o José Antonio?").
- **Recompensa:** desbloquea la salida; José Antonio reaparece periódicamente (NPC recurrente §3.1).

### E3 · "El Excel contra el caos" (mini-evento del rival) [LISTO]
- **Dónde:** varias rutas. **Gatillo:** Álvaro (rival/campeón) te intercepta 2-3 veces antes de la Liga.
- **Mecánica:** combates cortos donde Álvaro va "optimizando" su equipo (más fuerte cada vez). Habla en
  telegrama: *"Mejor. Yo lo habría planteado distinto."*, *"Para esto no hace falta casi IA, Marcelino."*
- **Lore REAL:** Álvaro responde con frialdad lacónica a todo lo de Marcelino.
- **Recompensa:** sube la tensión narrativa; al final desbloquea la **Torre Deloitte** (azotea, Campeón).

### E4 · "FinTips y el Churches la liaron en Cancún" [LISTO]
- **Dónde:** zona "Casino" o bar. **Gatillo:** Iván te cuenta la batallita y propone "un fondo conjunto".
- **Mecánica:** minijuego de casino/tragaperras (ya semillado en GIM 2). Ganas **monedas de casino**.
- **Lore REAL:** hashtag literal del grupo **#FinTipsYElChurchesLaLianEnRiuCancun**.
- **Recompensa:** monedas → canjeables por **Cubata-bola / Casino-bola** y un objeto raro.

### E5 · "La quedada de Bercero" (evento de El Pueblo) [BORRADOR — post-liga]
- **Dónde:** zona nueva post-liga "El Pueblo" (Bercero, Valladolid). **Gatillo:** Marcelino recibe el
  **Tricount de Bercero**; el grupo le pide que organice la quedada (8 habitaciones, jamón asado,
  caldereta, fiesta de disfraces de gánsters).
- **Mecánica:** reclutar a 4-5 NPCs amigos por el mapa (confirmar asistencia, "necesito que me
  confirméis HOY") → desbloquea una **batalla múltiple festiva** y un combate doble disfrazado.
- **Lore REAL:** las fiestas anuales del pueblo de Marcelino, verificadas en WhatsApp.
- **Recompensa:** acceso a entrenadores fuertes post-liga + objeto "peaje de ron".

### E6 · "Mariel propone Colombia en octubre" [LISTO]
- **Dónde:** Gimnasio 2 / casino, tras vencer a Mariel. **Gatillo:** Mariel, hablando sin parar,
  propone un viaje en grupo.
- **Mecánica:** evento de texto + revancha periódica más fuerte (Match Call castizo: "Mariel quiere la
  revancha del spread de hoy").
- **Lore REAL:** "Mariel nos dijo de ir a Colombia en octubre".

### E7 · "Jesús vuelve de Luxemburgo" [LISTO]
- **Dónde:** antes de abrir el Gimnasio 3. **Gatillo:** un NPC dice que la Rata "se fue y volvió".
- **Mecánica:** encuentras 4 **vapes de Jesús** escondidos por el mapa (coleccionable §2) → al juntarlos,
  Jesús te da un objeto y abre su gimnasio "con pelo, flow y venganza".
- **Lore:** alineado con SPEC (se fue a Luxemburgo, vuelve con injerto).

### E8 · "La boda pública de Eduardo y Sofía" [LISTO]
- **Dónde:** Gimnasio 6 / centro comercial. **Gatillo:** Sofía organiza "la boda pública desde 2019".
- **Mecánica:** evento de recados de tacañería: te piden cosas pero "todo se cobra"; el reto es
  conseguir los items SIN pagar (encontrar gratis). Refuerza el puzzle del GIM 6.
- **Lore:** Eduardo casado con Sofía omnipresente; madre que cobra hasta el aire.

### E9 · "El cocido de la abuela" (sidequest curativa) [LISTO]
- **Dónde:** Mercado de Vallehermoso. **Gatillo:** una señora pide ingredientes (garbanzos, chorizo,
  morcillo) repartidos por 3 tenderos.
- **Mecánica:** fetch-quest cortita de 3 items → recompensa: **Cocido madrileño** (Full Restore casero)
  + receta (puedes comprarlo a partir de ahí).
- **Lore:** gastronomía castiza, encaja con el sistema de Tapeo/felicidad.

---

## 5. SECRETOS Y EASTER EGGS

> Recompensas para el jugador curioso. Bajo coste (signs, encuentros raros, flags). Mezcla guiños
> reales del grupo con secretos castizos.

### 5.1 Zonas y encuentros secretos [LISTO]
1. **Estación Fantasma de Chamberí** — ya cerrada; con Llave Antigua, encuentros de Gastly/Haunter y,
   post-liga, el legendario fantasma (Gengar de cameo). *(Ya en GDD.)*
2. **El Maserati de Álvaro** — aparcado en una esquina oculta de Chamberí; al examinarlo: *"Un
   compañero de piso tiene un Maserati. No es tuyo. Sigue soñando."* Da el llavero cosmético. **REAL.**
3. **El sofá de Jesús** — en una callejuela; si lo examinas tras vencerle, *"Jesús durmió aquí tres
   meses sin pagar. La mancha sigue ahí."* Encuentro raro de Grimer/Koffing.
4. **El casino oculto** — tras el Gimnasio 2, una puerta lateral lleva a una sala de tragaperras
   (monedas de casino). *"18:30, de vuelta para el casino" — plan recurrente real.*
5. **Pisos en alquiler ("SE ALQUILA")** — bases secretas castizas (WORLD-GDD §10.3): alquilas un piso
   vacío, lo decoras con muebles (mesa camilla, póster del Atleti/Real Madrid). Identidad pura.

### 5.2 Easter eggs de texto (signs / NPCs ocultos) [LISTO]
6. **El tema 47** — el opositor del GIM 5, examinado 3 veces, recita un párrafo absurdamente largo
   (saltable). Trofeo de paciencia.
7. **El panel de cotización** — en el GIM 1, cambia de chiste cada vez que ganas una medalla nueva
   (texto dinámico por flag).
8. **El "peaje de ron"** — un NPC en El Pueblo pide alcohol duro para el padre de Marcelino antes de
   dejarte pasar. **REAL** (peaje de ron al padre).
9. **Free diving / tortugas** — un NPC buceador en una zona de agua menciona que Marcelino "aprendió a
   bucear con tortugas y caballitos de mar". **REAL.** Da una pista de un encuentro acuático.
10. **El bot madre de Iván** — un terminal en el GIM 1: *"PROYECTO: bot madre. Estado: pique sano con
    Marcelino sobre quién tiene mejor montaje."* Guiño meta (Iván es otro emprendedor de IA). **REAL.**
11. **La meta-broma del juego** — un NPC en casa de Marcelino: *"Oye, ¿es verdad que estás metiendo a
    todos tus amigos en un videojuego con una IA?" — "Sí." — "Qué fuerte. Mételos a todos."* **REAL**
    (Marcelino literalmente construye esto con Claude).

---

## 6. POST-LIGA: CAMPEÓN Y VILLANO (aterrizaje canónico)

> El SPEC marca a **Álvaro Alonso como Campeón** (no como gimnasio) y al **Team Schizo (Adrián)** como
> amenaza villana. Los gimnasios actuales colocan a Adrián como GIM 8; este bloque propone cómo cerrar
> la historia por encima de las 8 medallas, manteniéndolo modular.

### 6.1 ÁLVARO ALONSO — Campeón (Torre Deloitte, azotea) [LISTO]
- **Dónde:** azotea de la Torre Deloitte (zona nueva, accesible con 8 medallas). Despacho lleno de humo,
  ordenador encendido "para fingir que trabaja", paredes amarillas de tabaco.
- **Tema:** **improvisación (tú) vs. lógica/eficiencia perfecta (Álvaro)** — el conflicto central del juego.
- **Equipo Gen 1 sugerido** (fuego = "burnout", la mente brillante que se incendia; Volcarona no es Gen 1):
  | # | Especie (id) | Lvl | Por qué |
  |---|---|---|---|
  | 1 | Magneton (82) | 50 | "Todo cronometrado en un Excel." |
  | 2 | Alakazam (65) | 52 | La lógica pura, calcula todo. |
  | 3 | Hypno (97) | 52 | Control, minimización de riesgos. |
  | 4 | Snorlax (143) | 53 | "Duerme 3 horas" — irónico. |
  | 5 | Arcanine (59) | 54 | El fuego del burnout. |
  | 6 | **Charizard (6)** | 56 | **AS** — la mente que si se sobrecalienta lo incendia todo. |
- **Voz (seca, telegrama, real):**
  - intro: *"Has llegado. Estadísticamente improbable. Mi madre ya lo sabe. Siéntate… no, de pie, esto
    será rápido. Yo he optimizado el juego. Tú lo has improvisado. Veamos qué gana."*
  - win (pierde): *"…Mejor. No estaba en mi modelo. El caos tiene una varianza que no supe ponderar.
    Felicidades, compañero de piso. Invitas tú a las bravas. Una vez."*
  - defeat: *"Previsible. La improvisación no escala. Vuelve con un plan. Y cierra la puerta, que se
    escapa el humo."*

### 6.2 TEAM SCHIZO — Adrián Barrera (arco villano recurrente) [LISTO]
- **Rol:** equivalente a Team Rocket — aparece varias veces saboteando con su "Orden Perfecto" antes
  del enfrentamiento final. (El GIM 8 actual ya es su cuartel; esto añade apariciones de ruta.)
- **Comandantes** (NPCs de ruta, guiños del lore): **sabotaje gástrico** (guiño a Cortina descartado),
  **chapa política** (Álvaro Benito: *"España se hunde como tu equipo"*), **postureo mediático** (Eduardo).
- **Objetivo:** imponer vacaciones por decreto, debates ganados por decreto, "risas cuando lo diga Adrián".
- **Cierre:** tras la Liga, el Team Schizo intenta "decretar" el orden sobre Madrid → mazmorra final +
  combate definitivo con Adrián (equipo de control mental: Hypno/Drowzee/Arbok/Gengar, ya en GIM 8).
- **Lore REAL/SPEC:** malcriado, depende de la aprobación de su tía, se enfada como un niño.

### 6.3 Post-game castizo (de WORLD-GDD, aterrizado) [BORRADOR]
- **El Pueblo (Bercero)** — zona social post-liga (evento E5). **REAL.**
- **Battle Tower de AZCA** — combates seguidos por puntos. *(GDD.)*
- **Safari "Faunia"** — zona de captura este de Madrid. *(GDD.)*
- **Match Call / revanchas** — los líderes (amigos) te llaman para revancha con frases nuevas, cada
  uno en su voz. Barato y muy "del grupo".

---

## 7. RESUMEN DE PRIORIDADES (qué meter primero, por impacto)

| Prioridad | Bloque | Por qué | Coste |
|---|---|---|---|
| 1 | **Puzzles de gimnasio §1** | Los 8 gimnasios existen pero son cajas vacías; el puzzle les da identidad y duración. | Bajo (tiles+signs+warps) |
| 2 | **Objetos castizos §2** (curativos + bolas re-skin) | Re-skins baratos que llenan la tienda de sabor local sin sistemas nuevos. | Muy bajo (re-skin de items base) |
| 3 | **Eventos E1/E2/E3 §4** | E1 ya está medio implementado; E2/E3 anclan la trama (casero real + rival real). | Bajo (flags+diálogos) |
| 4 | **NPCs de ambiente §3** | Llenan calles vacías con el humor real del grupo. | Muy bajo (diálogos) |
| 5 | **Secretos §5** | Recompensan curiosidad; muchos son guiños REALES de alto valor emocional. | Bajo |
| 6 | **Campeón Álvaro §6.1** | Cierre narrativo canónico; el rival real como jefe final. | Medio (zona nueva) |
| 7 | **Post-game §6.3 / E5** | Contenido de larga duración; para después del MVP. | Alto (zonas nuevas) |

---

## Notas de honestidad / dependencias

- **Nada de esto toca `src/`** — son especificaciones de contenido para que el orquestador las
  implemente con el motor existente.
- Los **8 gimnasios y sus diálogos YA existen** en `gyms.js`; aquí NO se reescriben, solo se añade el
  **puzzle** que les falta y guiños extra.
- Todo el contenido respeta **Gen 1 real** (IDs reales en los equipos propuestos; sin Hada/Siniestro/
  Acero salvo la línea Magnemite).
- Las anécdotas marcadas **REAL** vienen de `LORE-FROM-WHATSAPP.md` (fiabilidad alta). Las marcadas
  por SPEC son creativas alineadas con la personalidad canónica.
- **Coords y números concretos** (tiles de puzzle, posiciones de NPC, balance de niveles/precios) los
  fija el orquestador contra los mapas reales: aquí se da el diseño, no el cableado.
- **El Pueblo (Bercero)**, **Torre Deloitte (azotea)**, **casino oculto** y **Faunia** requieren
  **mapas nuevos** → son los ítems de mayor coste (post-MVP).
