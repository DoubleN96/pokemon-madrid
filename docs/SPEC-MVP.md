# SPEC-MVP — Pokémon Madrid: Edición Castiza (Vertical Slice)

> Spec ejecutable del MVP jugable. Juego web estilo **Pokémon FireRed/Esmeralda (Gen 3)** hecho en **Phaser 3**.
> Fuente de verdad narrativa: `docs/GDD-original.txt`. Referencia de mundo completo: `docs/WORLD-GDD.md`.

## ⚠️ Regla clave (mandato del cliente)

**NO se usan las criaturas inventadas del GDD.** Se usan **Pokémon REALES de Gen 1** (sprites FireRed/LeafGreen y stats/movimientos oficiales — ver `docs/RECURSOS.md`). Del GDD se conserva TODO lo demás: el mundo (Madrid), la historia, los NPCs, los diálogos castizos, la paleta de colores y los nombres de lugares.

---

## 1. Alcance del MVP

### Zonas jugables

| Zona | Contenido |
|---|---|
| **TETUÁN** (distrito inicial) | Casa del jugador (2 plantas, habitación + salón-cocina con madre), Centro Pokémon Tetuán, tienda **Ultramarinos "Don Paco"**, **Bar "El Tetuán"** (interior con NPCs de diálogo), **Plaza Tetuán** con hierba alta (encuentros), calle Bravo Murillo, **bocas de metro decorativas** (letrero "M" rojo, no funcionales), Parque Móvil del Estado (cerrado, cartel interactivo), Farmacia y Peluquería "Manoli" como fachadas decorativas |
| **RUTA 2** (Tetuán → Chamberí) | Avenida urbana 48×16 tiles: hierba alta en jardincillos, 4 entrenadores obligatorios + 1 oculto (tras árbol), objetos en el suelo, quiosco, fuente, bancos, parada de bus |
| **CHAMBERÍ** (segunda zona) | **Centro Pokémon Chamberí** (diseño más elegante, enfermera con cofia antigua), hierba en jardines de **Plaza Olavide** (encuentros), Mercado de Vallehermoso / Café del Modernismo / Estación Fantasma como fachadas decorativas (estación con cartel "CLAUSURADA 1966"), boca de metro decorativa |

> Nota de nomenclatura: el GDD es inconsistente — el mapa de Tetuán llama "Ruta 2" a la conexión sur hacia Chamberí, pero la sección detallada se titula "RUTA 1: BRAVO MURILLO → CHAMBERÍ". El contenido (entrenadores, encuentros, objetos) es el de esa sección. **En el MVP la llamamos RUTA 2**, como pide el cliente.

### Pantallas / flujo

1. **Pantalla de título** (según GDD): skyline pixel art de Madrid al atardecer (Cuatro Torres, Palacio Real, Cibeles), logo "POKÉMON" en arco + "MADRID" dorado + subtítulo "Edición Castiza" rojo/amarillo, legendario rugiendo (→ **Snorlax**, ver mapeo de Orsón Regio), partículas de hojas de madroño, música pasodoble 16-bit.
2. **Login / Registro** (requisito web, no está en el GDD): email+contraseña o usuario+contraseña; el guardado va ligado a la cuenta.
3. **Intro del Profesor Galdós** (PARTE 3 del GDD, ver §3): TV, presentación del mundo, elección de género, nombre (máx. 7 caracteres), presentación de Pablo.
4. **Despertar en casa** (Bravo Murillo 37) → diálogo madre → Zapatillas de Correr.
5. **Laboratorio de Galdós** → **elección de inicial** (Bulbasaur/Charmander/Squirtle, ver §2) → Pokédex/MadriNav como objetos narrativos.
6. **Primera batalla contra Pablo** (rival) al salir del laboratorio.
7. Mundo abierto del MVP: Tetuán ↔ Ruta 2 ↔ Chamberí.

> Decisión de implementación: el GDD sitúa el laboratorio en el Barrio de las Letras (fuera del alcance del MVP). Para el vertical slice, la escena del laboratorio se ejecuta como **escena de intro autocontenida** (interior del laboratorio + exterior mínimo para la batalla con Pablo) y al terminar el jugador aparece en su casa de Tetuán. El distrito de Las Letras NO se construye.

---

## 2. Tabla de mapeo de criaturas (GDD → Pokémon real Gen 1)

### 2.1 Iniciales

El triángulo de tipos queda fijado por la lógica del GDD: Azulejín es Agua → **Squirtle**; como el rival siempre elige el inicial que vence al tuyo (Gatolegre>Chulapón, Azulejín>Gatolegre, Chulapón>Azulejín), el resto queda forzado para conservar ese triángulo:

| GDD | Tipo GDD | → Pokémon real | Tipo real | Línea evolutiva (niveles oficiales Gen 1) |
|---|---|---|---|---|
| **Chulapón** | Lucha | **Bulbasaur** | Planta/Veneno | → Ivysaur (16) → Venusaur (32) |
| **Gatolegre** (inicial) | Normal/Fantasma | **Charmander** | Fuego | → Charmeleon (16) → Charizard (36) |
| **Azulejín** | Agua/Acero | **Squirtle** | Agua | → Wartortle (16) → Blastoise (36) |

- Elección del rival (idéntica al GDD): si eliges Bulbasaur → Pablo coge Charmander; Charmander → Squirtle; Squirtle → Bulbasaur.
- Se usan los **niveles de evolución oficiales** (16/32, 16/36, 16/36), no los del GDD (16/36, 18/38, 18/36) — stats y learnsets oficiales obligan a ello.
- Movimientos iniciales: los oficiales de FRLG nivel 5 (Placaje+Gruñido / Arañazo+Gruñido / Placaje+Látigo), sustituyendo a los listados en el GDD.

> Nota: **Gatolegre tiene doble mapeo.** Como *inicial* es Charmander (slot del laboratorio). Como *criatura salvaje* (gato callejero de Tetuán/Chamberí) es **Meowth**. Son entidades distintas en el juego.

### 2.2 Criaturas salvajes y de entrenadores del MVP

| GDD | Pistas del GDD (tipo/diseño) | → Pokémon real | Notas |
|---|---|---|---|
| **Ratamad** | Normal; rata urbana con boina | **Rattata** | → Raticate (Nv. 20 oficial) |
| **Pichoneta** | Normal/Volador; paloma urbana | **Pidgey** | → Pidgeotto (18) → Pidgeot (36) |
| **Perrucho** | Normal; perro mestizo leal | **Growlithe** | Mandato del cliente. Ojo: el tipo pasa de Normal a **Fuego**. Evoluciona por Piedra Fuego (sin piedras en MVP → no evoluciona) |
| **Gatolegre** (salvaje) | Normal/Fantasma; gato callejero nocturno | **Meowth** | → Persian (28) |
| **Libracho** | At.Esp. alto (naturaleza Modesta); criatura-libro; encuentro raro 1% | **Abra** | Raro clásico de ruta temprana, perfil especial. → Kadabra (16) |
| **Rosalaño** | Planta (rosales de Chamberí, naturaleza Mansa) | **Oddish** | → Gloom (21) |

### 2.3 Cameos de la intro (solo sprites en la secuencia del profesor)

| GDD | Contexto en la intro | → Pokémon real |
|---|---|---|
| **Orsón Regio** | Sale de la Pokébola del profesor en miniatura; también ruge en la pantalla de título | **Snorlax** (oso Normal, el mejor equivalente Gen 1) |
| **Metroño** | "Algunos viven en el Metro..." | **Gengar** (cameo; el legendario completo es post-MVP, ver WORLD-GDD) |
| **Rosalaño** | "...otros en los parques..." | **Oddish** |
| **Gatolegre** | "...¡y otros en las terrazas tomando el sol!" (estirándose) | **Meowth** |

### 2.4 Tablas de encuentros (niveles y % literales del GDD)

**Plaza Tetuán (hierba):**

| Pokémon | Nivel | % | Horario GDD |
|---|---|---|---|
| Rattata (Ratamad) | 2–4 | 40% | Todo el día |
| Pidgey (Pichoneta) | 2–4 | 35% | Día |
| Growlithe (Perrucho) | 3–5 | 15% | Todo el día |
| Meowth (Gatolegre) | 4–6 | 10% | Noche |

**Ruta 2 (hierba de jardincillos):**

| Pokémon | Nivel | % |
|---|---|---|
| Rattata (Ratamad) | 3–5 | 45% |
| Pidgey (Pichoneta) | 3–5 | 40% |
| Growlithe (Perrucho) | 4–6 | 14% |
| Abra (Libracho) | 5–7 | 1% (raro) |

**Chamberí — jardines de Plaza Olavide (hierba):**

| Pokémon | Nivel | % | Horario GDD |
|---|---|---|---|
| Oddish (Rosalaño) | 6–9 | 30% | — |
| Pidgey (Pichoneta) | 5–8 | 30% | — |
| Abra (Libracho) | 6–9 | 20% | — |
| Growlithe (Perrucho) | 5–8 | 15% | — |
| Meowth (Gatolegre) | 7–10 | 5% | Noche |

> **Decisión MVP (día/noche fuera de alcance):** las entradas marcadas "Día"/"Noche" se incluyen a su % **a todas horas**. Cuando llegue el ciclo día/noche (fase futura) se restaurará la restricción.

---

## 3. Historia / Intro del MVP

Resumen de la PARTE 3 del GDD adaptada al mapeo. Premisa: chico/chica de 11 años que vive con su madre en **Bravo Murillo 37, Tetuán**, frente al **Parque Móvil del Estado**. Su padre, **Arturo** —mecánico jefe del Parque Móvil y subcampeón de la Liga Madrid hace 20 años— **desapareció hace 3 años** en las galerías subterráneas del Madrid de los Austrias buscando a un Pokémon legendario. El **Profesor Benito Galdós** (anciano de boina, laboratorio-biblioteca en el Barrio de las Letras) custodia tres Pokémon que el padre capturó y dejó para su hij@. El rival es **Pablo**, vecino de toda la vida (4º de Bravo Murillo), chulesco pero buen fondo.

### 3.1 Secuencia de intro (textos literales del GDD)

[Pantalla negra → estática de TV → TV pixelada se enciende]

> **PROFESOR GALDÓS (en TV):** "¡Hola! ¡Bienvenido al mundo de los Pokémon de Madrid!
> Mi nombre es Galdós. ¡Pero la gente me llama el Profesor Pokémon!"

[Aparece Pokébola, se abre, sale **Snorlax** en miniatura *(GDD: Orsón Regio)*]

> "Este mundo está habitado por criaturas llamadas Pokémon.
> Algunos viven en el Metro... *(sprite de **Gengar** — GDD: Metroño)*
> ...otros en los parques... *(sprite de **Oddish** — GDD: Rosalaño)*
> ...¡y otros en las terrazas tomando el sol!" *(sprite de **Meowth** estirándose — GDD: Gatolegre)*

> "La gente y los Pokémon conviven en Madrid desde tiempos inmemoriales.
> Yo estudio estas criaturas fascinantes como profesión.
> Pero antes de continuar... ¡Cuéntame sobre ti!"

- **Selección de género** — "¿Eres chico o chica?" (chico: camiseta roja con logo de Metro, mochila azul; chica: camiseta amarilla con girasol, mochila rosa).
- **Entrada de nombre** (máx. 7 caracteres) — "¡Ah, [NOMBRE]! ¡Qué nombre más castizo!"
- **Presentación de Pablo** (pelo engominado, chaqueta de cuero, pose chulesca):

> "Este es Pablo. Es tu vecino de toda la vida.
> Ha sido tu rival y amigo desde que erais pequeños.
> ¡Siempre compitiendo por todo!"

> "[NOMBRE]... Tu aventura está a punto de comenzar.
> Un mundo de sueños, aventuras y Pokémon te espera. ¡Adelante!"

[Fundido a negro → texto letra a letra:]

> *Bravo Murillo 37, Tetuán — Madrid, España*
> *Tres años después de la desaparición de papá...*

[Fundido desde negro → habitación del jugador, vista cenital]

> **MADRE (voz desde fuera):** "¡[NOMBRE]! ¡Baja, cariño! ¡El Profesor Galdós ha llamado!"

### 3.2 Diálogo de la madre (literal)

> **MADRE:** "¡Buenos días, dormilón!
> El Profesor Galdós acaba de llamar. Dice que vayas a su laboratorio.
> Parece que tiene algo importante que darte...
> *(pausa, expresión melancólica)* Algo que... tu padre dejó para ti.
> *(recupera sonrisa)* ¡Venga, desayuna rápido y ve!
> Ah, y llévate esto."

**[Recibes: ZAPATILLAS DE CORRER]** — "Zapatillas que aumentan la velocidad al caminar. Mantén B para correr." *(en web: mantener Shift)*

> **MADRE:** "Tu padre las usaba para sus expediciones. Ahora son tuyas.
> Estoy muy orgullosa de ti, [NOMBRE].
> Pase lo que pase hoy... recuerda que siempre estaré aquí.
> ¡Ahora ve! ¡El profesor espera!"

### 3.3 Laboratorio: elección de inicial (literal, con sustituciones marcadas)

> **GALDÓS:** "¡[NOMBRE]! ¡Por fin llegas! Llevo esperándote toda la mañana.
> Verás... tu padre vino a verme justo antes de desaparecer. Me confió estas tres Pokébolas.
> Dijo: 'Cuando mi hij@ cumpla 11, dale a elegir uno de estos tres. Son especiales. Los capturé yo en los lugares más importantes de Madrid.'
> *(se emociona)* Arturo era un gran entrenador. Y un mejor amigo.
> Ahora... es tu turno. ¡Adelante! ¡Elige tu compañero!"

Al examinar cada Pokébola (texto del GDD con nombre/tipo sustituidos por el Pokémon real):

> **[Bulbasaur — GDD: Chulapón]** "Ah, ese es BULBASAUR. Tu padre lo capturó en la Pradera de San Isidro, durante la verbena. Es un Pokémon de tipo Planta. ¡Tiene un espíritu combativo que no conoce la rendición! Si buscas fuerza y valor... BULBASAUR es tu compañero."
>
> **[Charmander — GDD: Gatolegre]** "Ese es CHARMANDER. Tu padre lo encontró una noche en los tejados de Malasaña. Es de tipo Fuego. Ágil, misterioso y astuto... CHARMANDER es para entrenadores que valoran la estrategia."
>
> **[Squirtle — GDD: Azulejín]** "Y este pequeño es SQUIRTLE. Tu padre lo rescató de una estación de Metro abandonada. Es de tipo Agua. ¡Su caparazón es increíblemente resistente! Si prefieres defensa y equilibrio, SQUIRTLE no te decepcionará."

Tras elegir:

> **GALDÓS:** "¡Así que eliges [POKÉMON]! ¡Parece que le gustas!
> Cuídalo bien, [NOMBRE]. Tu padre estaría orgulloso.
> Ah, y toma esto también..."

**[Recibes: POKÉDEX]** → "Madrid tiene 151 especies únicas. ¡Tu misión es descubrirlas todas!"
**[Recibes: MADRINAV]** → "Es como un teléfono móvil pero mejor. Tiene mapa, radio, agenda..."

> Decisión MVP: Pokédex y MadriNav se entregan como **objetos narrativos sin funcionalidad** (no hay UI de Pokédex ni MadriNav en el MVP).

> **GALDÓS:** "Ahora sí, [NOMBRE]... ¡Tu aventura por Madrid comienza! ¡Buena suerte, y recuerda...! ¡Hazte con todos!"

### 3.4 Primera batalla: Pablo (rival) — literal

[Al salir del laboratorio, Pablo espera en la puerta]

> **PABLO:** "¡Eh, [NOMBRE]! ¡Por fin sales! ¿Ya tienes tu Pokémon?
> ¿[TU POKÉMON]? No está mal... supongo. ¡Mira el mío!
> ¡[SU POKÉMON]! Es MUCHO mejor que el tuyo. ¡El viejo me dejó elegir primero!
> ¿Sabes qué? Vamos a comprobarlo. ¡Te reto a un combate! ¡Aquí y ahora!"

- **Equipo de Pablo** (Nv. 5, el inicial fuerte contra el tuyo): Bulbasaur tuyo → Charmander; Charmander → Squirtle; Squirtle → Bulbasaur.
- Tutorial integrado (primera batalla): se explica el menú LUCHAR / POKÉMON / MOCHILA / HUIR. Intentar huir: "¡No puedes huir de un combate contra entrenador!". IA básica: usa el ataque más fuerte disponible.

Si ganas:

> **PABLO:** "¡¿QUÉ?! ¡No puede ser! Bah... solo ha sido suerte. ¡La próxima vez te machaco!
> Vale, lo admito. No lo has hecho mal. Pero esto no acaba aquí, [NOMBRE].
> Voy a conseguir las 8 medallas de Madrid antes que tú. ¡Y luego seré el Campeón!
> ¡Ya veremos quién es mejor!" *(se va corriendo)*

Si pierdes:

> **PABLO:** "¡JA! ¡Lo sabía! ¡Soy demasiado bueno para ti!
> Bah, no tiene gracia ganar así. Ve al Centro Pokémon a curar a tu bicho y entrena un poco.
> ¡La próxima vez quiero una victoria de verdad!"

[Si pierdes, reapareces en el Centro Pokémon de Tetuán con el equipo curado.]

### 3.5 NPCs de Tetuán (diálogos literales)

> **Señora con bata:** "¡Anda, el hijo de Arturo! ¿Cómo está tu madre, buen@? Tu padre era un hombre muy majo. Siempre me ayudaba con la compra. Ojalá aparezca pronto..."
>
> **Hombre del periódico (boina, Marca):** "¿Tú eres el chaval que va a ver al profesor ese de los bichos? En mis tiempos no había esas cosas. ¡Solo teníamos cromos de fútbol! Aunque debo admitir que esos Pokémon del Metro molan bastante."
>
> **Niño con balón (camiseta del Atleti):** "¡Eh, [NOMBRE]! ¿Vas a ser entrenador Pokémon? ¡Yo también quiero! Pero mi madre dice que primero acabe el cole. ¡Cuando tenga mi Pokémon, te reto!"
>
> **Cartel del Parque Móvil:** "[PARQUE MÓVIL DEL ESTADO] 'Ministerio de la Presidencia' — 'Acceso restringido al personal' ... Tu padre trabajaba aquí. Ahora está cerrado al público."
>
> **Don Paco (tendero):** "¡Hombre, el chavalín de Arturo! Tu padre era buen cliente. Siempre compraba Repelentes antes de sus expediciones. ¿Qué te pongo?" *(abre tienda)*
>
> **Madre (curación en casa):** "¡Bienvenido a casa, [NOMBRE]! ¿Quieres que cure a tus Pokémon? [SÍ/NO] → Tus Pokémon están perfectamente sanos ahora. ¡Ten cuidado ahí fuera!"

### 3.6 Entrenadores de la Ruta 2 (literal + equipos mapeados)

| Entrenador | Diálogo | Equipo (real) | Premio |
|---|---|---|---|
| **Niño Óscar** | "¡Mi Ratamad es el más fuerte del barrio! ¡Te lo demuestro!" *(sustituir Ratamad→Rattata en runtime)* | Rattata ♂ Nv.4 | 64₧ |
| **Niña Lucía** | "¿Tú también vas a ser entrenador? ¡Yo empecé ayer! ¡Vamos a ver quién ha aprendido más!" | Pidgey ♀ Nv.4, Pidgey ♀ Nv.3 | 48₧ |
| **Joven Marcos** | "Los Pokémon de ciudad son más listos que los del campo. ¡Déjame demostrártelo!" | Rattata ♂ Nv.5, Growlithe ♂ Nv.5 | 100₧ |
| **Señora Carmen** | "Oh, qué entrenador tan joven. ¿No deberías estar en el colegio? ...¿Vacaciones? Bueno, entonces ¡vamos a combatir un poco!" | Pidgey ♀ Nv.6 | 120₧ |
| **Punk Dani** (oculto tras árbol, solo si te acercas) | "Eh, ¿qué miras? ¿Buscas pelea? ¡Pues la vas a encontrar!" | Growlithe ♂ Nv.7, Rattata ♂ Nv.6 | 140₧ *(el TM41 del GDD se omite: MTs fuera de alcance)* |

**Objetos en la Ruta 2:** Poción (escondida tras quiosco), Pokébola ×3 (en el suelo cerca de la fuente), Antídoto (en papelera, al interactuar).

---

## 4. Mecánicas del MVP

### 4.1 Movimiento y mundo

- **Movimiento por grid** de 16×16 px (tile a tile, 4 direcciones), estilo GBA. Correr manteniendo Shift/B (tras recibir Zapatillas).
- Cámara que sigue al jugador; transiciones de mapa con fundido.
- Colisiones por capa de tiles (Tiled); puertas/portales entre interiores y exteriores.
- Interacción con NPCs/carteles/objetos con tecla de acción (Z/Enter/A).
- Resolución lógica 240×160 escalada (aspect 3:2), 60 FPS.

### 4.2 Encuentros en hierba

- Al entrar en un tile de hierba alta: tirada de encuentro (ratio estándar Gen 3 ≈ 10% por paso en hierba; ajustable).
- Especie y nivel según la tabla de la zona (§2.4). Transición de batalla con cortinilla.

### 4.3 Combate por turnos (singles)

- **Fórmula de daño Gen 3**:
  `Daño = ((((2·Nivel/5 + 2) · Poder · Atk/Def) / 50) + 2) · STAB · Efectividad · Crítico · Aleatorio(0.85–1.00)`
  - Atk/Def físicos o especiales según la **categoría del tipo** (split físico/especial por tipo, como en Gen 3: Fuego/Agua/Planta/Eléctrico/Psíquico/Hielo/Dragón/Siniestro = especial; resto = físico).
- **Tabla de tipos Gen 3** (17 tipos, sin Hada).
- **STAB**: ×1.5.
- **Críticos**: ratio base 1/16, daño ×2 (etapas de crítico para movimientos como Cuchillada).
- **Estados básicos**: Parálisis (Velocidad ×0.25, 25% de no actuar), Quemadura (Ataque ×0.5, 1/8 PS por turno), Veneno (1/8 PS), Sueño (1–4 turnos), Congelación (20% de descongelar por turno). Confusión como estado volátil (50%, se golpea a sí mismo, 2–5 turnos).
- **Stat stages**: −6…+6 con multiplicadores estándar (2/8…8/2; precisión/evasión 3/9…9/3).
- Orden de turno por Velocidad (con prioridad de movimientos); PP por movimiento.
- IA enemiga simple: entrenadores usan el movimiento de más daño esperado; los salvajes, aleatorio.
- Contra salvajes se puede **huir** (fórmula Gen 3 de escape); contra entrenadores no.

### 4.4 Captura (fórmula Gen 3)

```
a = ((3·HPmax − 2·HPactual) · ratioCaptura · bonusBall / (3·HPmax)) · bonusEstado
b = 1048560 / √(√(16711680 / a))
4 comprobaciones de sacudida: éxito si rand(0..65535) < b en las 4
```
- `bonusBall`: Pokébola ×1 (única ball del MVP). `bonusEstado`: Sueño/Congelación ×2; Parálisis/Veneno/Quemadura ×1.5.
- Ratios de captura oficiales de cada especie Gen 1.
- Solo se puede capturar Pokémon salvajes. **Sin PC en el MVP**: con el equipo lleno (6) no se permite lanzar la ball → mensaje "¡Tu equipo está lleno!".

### 4.5 Experiencia, niveles, movimientos y evolución

- **EXP Gen 3**: `EXP = (EXPbase · NivelDerrotado) / 7` (×1.5 si es de entrenador); reparto solo al participante activo (sin Repartir Exp en MVP).
- **Curvas de crecimiento oficiales** por especie (Medium-Slow para iniciales, etc.).
- **Aprender movimientos**: learnsets oficiales de **FireRed/LeafGreen** por nivel; si ya tiene 4, diálogo de olvidar/sustituir.
- **Evolución por nivel** con animación clásica (cancelable con B). Evoluciones por piedra/intercambio/amistad: no disponibles en MVP (no hay piedras → Growlithe/Meowth capturados evolucionan solo si su método es por nivel; Meowth→Persian 28 sí; Growlithe no).
- **IVs aleatorios (0–31)** por stat al generar; **EVs internos simplificados** (se acumulan al derrotar, sin UI ni ítems asociados). Sin naturalezas ni habilidades en MVP (modificador neutro).

### 4.6 Equipo, objetos y tienda

- **Equipo de 6** Pokémon. Menú de equipo: ver stats, reordenar, usar objetos, ver movimientos.
- **Mochila** con objetos: Poción (cura 20 PS), Antídoto (cura veneno), Pokébola.
- **Tienda Ultramarinos Don Paco** (precios literales del GDD):

| Objeto | Precio |
|---|---|
| Poción | 300₧ |
| Antídoto | 100₧ |
| Pokébola | 200₧ |
| Poké Muñeco | 1.000₧ *(opcional: permite huir de salvajes; si no se implementa, no aparece)* |
| Carta | 50₧ *(objeto coleccionable sin efecto; opcional)* |

- Dinero inicial: **3.000₧** (estándar Gen 3; el GDD no lo especifica — decisión).
- Dinero al ganar a entrenadores según tabla §3.6; al perder un combate se pierde la mitad (estándar) y se reaparece en el último punto de curación.

### 4.7 Curación

- **Centro Pokémon** (Tetuán y Chamberí): enfermera cura todo el equipo, jingle clásico. Marca punto de reaparición.
- **En casa**: la madre cura gratis (diálogo §3.5).

### 4.8 Guardado

- Guardado del estado completo (posición, equipo, mochila, dinero, flags de historia, entrenadores vencidos, objetos recogidos) **ligado a la cuenta** del login/registro (backend remoto; el stack del proyecto usa Supabase self-hosted).
- Guardado manual desde menú + autoguardado en eventos clave (curación, cambio de mapa, victoria de rival).

### 4.9 Assets

- Sprites de Pokémon: **FireRed/LeafGreen** desde PokémonDB (frontal/trasero batalla + iconos), ver `docs/RECURSOS.md`.
- Tilesets estilo GBA: referencia `resources-inbox/gracidea/` (formato Tiled probado).
- Paleta de entorno Madrid: tabla hex de la PARTE 1 del GDD (copiada en `WORLD-GDD.md` §2). Claves para el MVP: ladrillo `#CD5C5C`, cielo `#87CEEB`, hierba de encuentros `#228B22`, aceras `#D3D3D3`, azulejo metro `#0047AB`/`#FFFFF0`.

---

## 5. Fuera de alcance del MVP (lista explícita)

- ❌ **Metro funcional** (viaje rápido): las bocas de metro son decorativas.
- ❌ **Concursos / Certámenes de San Isidro**.
- ❌ **EVs/IVs visibles** (se usan IVs aleatorios + EVs internos simplificados, sin UI).
- ❌ **Ciclo día/noche** (los encuentros con horario se aplanan, ver §2.4).
- ❌ **Combates dobles**.
- ❌ **Gimnasios** (los 8) y medallas.
- ❌ **Liga / Alto Mando / Campeón**.
- ❌ **Post-juego** (Parque Móvil interior, Galerías, legendarios, Battle Tower, Safari Faunia, Comunidad de Madrid).
- ❌ Naturalezas y habilidades (modificadores neutros en MVP).
- ❌ MTs/MOs (el TM41 de Punk Dani se omite), piedras evolutivas, objetos equipados, bayas.
- ❌ PC / cajas de almacenamiento.
- ❌ Pokémon siguiéndote, Pisos Secretos, MadriNav funcional, Pokédex funcional, Radio, Match Call.
- ❌ Sistema de tapeo del Bar (el bar es visitable con NPCs de diálogo), Club de Fans del Centro Pokémon, Estación Fantasma de Chamberí (cerrada con cartel), Mercado de Vallehermoso como tienda.
- ❌ Equipo Vandalia (villanos), misiones secundarias, ruta norte a Chamartín (bloqueada con NPC u obstáculo).

---

## 6. Criterios de aceptación del vertical slice

1. Título → registro/login → intro completa con diálogos del GDD → elección de inicial → victoria o derrota contra Pablo, sin errores.
2. Recorrido Tetuán → Ruta 2 → Chamberí con colisiones, hierba con encuentros según tablas, y los 5 entrenadores de ruta funcionales.
3. Capturar un Pokémon salvaje con la fórmula Gen 3 y verlo en el equipo.
4. Subir de nivel, aprender un movimiento nuevo y evolucionar (p. ej. inicial a Nv. 16).
5. Comprar en Don Paco, curar en ambos Centros Pokémon y con la madre.
6. Cerrar sesión, volver a entrar y continuar la partida exactamente donde estaba.
