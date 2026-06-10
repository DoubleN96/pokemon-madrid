# SPEC — POKÉMON PISO / MADRÍRICO

> Extracción de señal del volcado `GDD2-pokemon-piso-original.txt` (5905 líneas, conversación de
> Marcelino con ChatGPT/Gemini). Se ha ignorado todo el ruido (menús de Gemini, DKV Seguros,
> decoración nórdica, cocina/baño, planos, fechas de graduación, la novela de suspense de la
> "habitación cerrada", etc.). Solo se recoge lo relativo al juego **"Pokémon Piso / Madrírico"**
> con Marcelino y sus amigos como personajes.
>
> El documento contiene **DOS conceptos** que el SPEC mantiene separados porque responden a visiones
> distintas:
> 1. **EDICIÓN PISO / LIGA CHAMBERÍ** — la parodia con los amigos reales como entrenadores
>    (Marcelino = jugador, Álvaro = campeón). Es la **visión canónica final** consolidada por el
>    autor al final del documento.
> 2. **POKÉMON MADRID: EDICIÓN CASTIZA** — un GDD técnico completo estilo Game Boy Advance / Esmeralda
>    con NPCs madrileños ficticios (no los amigos) y Fakémon propios. Es la **base de motor/mecánicas**
>    más detallada, reutilizable como esqueleto técnico.

---

## 1. Concepto y trama

**"Pokémon Piso" (título canónico del autor: _Pokémon: Edición Piso — La Liga Chamberí_)** reinterpreta
la vida real de Marcelino y sus amigos (gestión de pisos y habitaciones en Madrid, networking,
rentabilidad, estrés laboral, vida de piso compartido) como una aventura tipo Pokémon.

**La región** (literal del doc): _"una versión distorsionada y caótica de España, centrada
principalmente en Madrid (especialmente el barrio de Chamberí/Tetuán), con rutas que conectan con
Salamanca (la zona histórica y universitaria) y Torrevieja (la costa turbia de Levante)."_ En
versiones previas se llamó **Chamberiana** (fusión Madrid–Salamanca) o **Hispania Nova** (toda España).

**El tono** (literal): _"Es una parodia adulta de Pokémon. El mundo no gira en torno a la amistad y la
aventura inocente, sino en torno al estrés laboral, el precio del alquiler, las relaciones tóxicas de
Tinder, las estafas financieras, el vapeo y la búsqueda desesperada de un hueco para irse de
vacaciones."_ Cómico, castizo, ácido/hiriente, con la vida real exagerada de los protagonistas.

**La premisa** (literal): _"Eres Marcelino. Has decidido salir de tu piso en Bravo Murillo para
conquistar la Liga Pokémon regional, no por gloria, sino porque es la única forma de poner orden en el
caos que te rodea y demostrarle a tu rival y compañero de piso, Álvaro Alonso, que la improvisación
puede vencer a la lógica pura."_

Conflicto central: **improvisación (Marcelino) vs. lógica/eficiencia perfecta (Álvaro, campeón)**, con
**Adrián Barrera** y su **Team Schizo** como amenaza villana que quiere imponer un "Orden Perfecto".

---

## 2. Personajes principales

### MARCELINO — el jugador / protagonista

| Campo | Detalle (literal del doc) |
|---|---|
| Rol en el juego | **EL JUGADOR (TÚ)** — protagonista. En versiones previas también figuró como **Campeón de Liga**. |
| Apodo épico | "el Arquitecto de Vidas" / "Emperador del Rent2Rent & Visionario Inmobiliario" / "Emprendedor Caótico" |
| Arquetipo | El Emprendedor Caótico |
| Lore | "Un genio de la improvisación. Antiguo ligón legendario que se ha 'retirado' del mercado tras empezar con Danna, aunque su naturaleza coqueta sigue ahí. Vive a caballo entre Excels de negocios estrambóticos y el desorden vital." |
| Rasgos | Cubano/hispano-cubano, 28 años, afincado en Chamberí; negocio inmobiliario (rent2rent, alquiler por habitaciones, gestión patrimonial); networking; "Excel Sagrado de Rentabilidad"; no tiene punto medio (meses autistas / meses de fiesta); liga "por las risas"; viaja mucho. |
| Negocios citados | Tripath, Hercadia Real Estate, compramostucasamadrid.com, Rentasy. Socio: Iván (FinTips). |
| Físico | "Joven hispano-cubano de piel morena. Pelo corto estilo afro muy marcado. Complexión normal. Sudaderas con capucha y vaqueros." |
| Pokémon insignia | **Metagross** ("mente estratégica para los negocios, frialdad cuando es necesario, calcular múltiples resultados a la vez"). En la versión "Edición Castiza/Estrambótico": **Metagross (Acero/Dragón)**. |

### ÁLVARO ALONSO ("de Deloitte") — el Vicepresidente del Humo / rival y campeón

| Campo | Detalle (literal del doc) |
|---|---|
| Rol en el juego | **EL RIVAL / CAMPEÓN** (versión canónica). En otras versiones: líder de gimnasio "Erudito". |
| Apodo épico | "el Vicepresidente del Humo" / "La Lógica Estresada" / "el Planificador Total" |
| Lore | "Vicepresidente en Deloitte, vive enchufado a un cigarro y a un portátil. Su vida está cronometrada en un Excel: trabaja 20 horas, duerme 3, y se baña en exactamente 3 minutos. Cree que todo se puede resolver con datos, eficiencia y minimización de riesgos. Es el Campeón actual porque ha 'optimizado' el juego." |
| Rasgos | Workaholic fumador (paredes amarillas); deja el ordenador encendido para fingir que trabaja; novia **Blanca** (la llama cada noche); placa universitaria a la mejor promoción de notas; madridista "pajiplantillero"; llama a su madre/padre a diario; ama puzzles/crucigramas; afronta todo con lógica; ayuda a todos pero nunca pide ayuda; no sabe ducharse (solo baños de 2–5 min); de Salamanca (Team Salamanca). |
| Físico | "Chico bajito. Pelo castaño liso con corte de tazón/casco que le cubre la frente hasta los ojos. Siempre de traje (chaqueta y corbata floja), cara de estrés y cigarro en la mano." |
| Pokémon insignia | Versión canónica: **Volcarona (Bicho/Fuego)** — "representa el burnout: la mente brillante que, si se sobrecalienta, lo incendia todo". Versiones previas: **Infernape** / **Alakazam Imperial (Psíquico/Fuego)**. |

### ALEX — el Tentado Digital

| Campo | Detalle (literal del doc) |
|---|---|
| Rol en el juego | **Rival amistoso / Alto Mando** (versión canónica). En otras versiones: líder de gimnasio "Digital/Tecnológico". |
| Apodo épico | "el Tentado Digital" / "el Romántico Digital" |
| Lore | "Informático brillante pero emocionalmente maleable. Es incapaz de decir que 'no' a nada. Romántico empedernido adicto a las apps de citas, con una debilidad fatal por las mujeres eslavas. Toca la guitarra." |
| Rasgos | Informático de IA; da clase en un máster (se metió "para ligar", pero su amigo **Ángel** —"el ansiolítico perfeccionista"— no le deja); Erasmus en Eslovenia, obsesión con Europa del Este y chicas eslavas; usa Tinder/Bumble/Instagram y siempre dice que las desinstalará; siempre se apunta a todos los planes; intenta adelgazar sin éxito; predisposición a hacer planes; habla idiomas; de Salamanca (Team Salamanca, grupo de Álvaro Alonso). |
| Físico | "Hombre alto y con sobrepeso marcado (gordo, barriga prominente). Pelo castaño corto, cara de buenazo despistado. Camisetas básicas (frecuentemente rojas)." |
| Pokémon insignia | Versión canónica: **Toxtricity (Forma Grave)** — "dualidad: eléctrico (tecnología, energía para apuntarse a todo) y veneno (relaciones tóxicas y decisiones impulsivas)". Versiones previas: **Rotom (forma Ordenador / Tinderiano)**. |

### Secundarios (lo que dice el doc)

| Personaje | Lore clave (literal/condensado) | Pokémon asociado |
|---|---|---|
| **Blanca** | Novia de Álvaro Alonso, hermana de Rafael Robledo, de Salamanca. Estudia notarías; dulce, sensata; único punto de cordura; ayuda con la burocracia de la Liga. Rubia, pelo largo liso, ojos azules. | **Gardevoir** |
| **Ángel** ("el ansiolítico perfeccionista") | Amigo de Alex; NPC controlador que "lo devuelve al buen camino"; no le deja ligar en el máster. | (no especificado en el doc) |
| **Adrián Barrera** | **Villano principal**, líder del **Team Schizo**. Intelectual autoritario/esquizofrénico; tres pilares: música, risas, intelectualidad; perfeccionista que se enfada como niño si no se hace lo que él dice; del Atlético, malcriado (madre que le decía a todo que sí; "le quemó el brazo con agua caliente"); depende de la aprobación de su tía. Objetivo: imponer "Orden Perfecto" (vacaciones planificadas por decreto, debates ganados por decreto). Calvicie incipiente, bigote espeso, business casual, ceño fruncido. | **Mr. Mime (forma Galar/Tirano), Psíquico/Siniestro** |
| **Iván de Ramón "FinTips"** | Socio/mentor financiero de Marcelino; consultor financiero y cripto-bro; analiza el caos desde la barrera buscando rentabilidad. Bajito, gordo, gafas, polo "cuñado informático". | **Porygon-Z** (usa Maquinación) / Persian Chamberiano |
| **Jesús "la Rata"** | Ente del caos; vapea compulsivamente; el más desordenado de España; estado capilar variable (calvo / injerto); se fue a Luxemburgo y vuelve "con pelo, flow y venganza"; sobrevive a base de comida ajena. Aspecto demacrado, calvo a parches. | **Weezing (de Galar)** |
| **Rafael Robledo** | Hermano de Blanca; "encantador de serpientes" que vende productos financieros de dudosa legalidad; estafador con traje y sonrisa; divertido para salir de fiesta. Bajito, mentón muy prominente. | **Gholdengo** (lanza dinero, "Día de Pago") / Perrserker |
| **Sergio Guillén** | Hermano de David; camionero de Lavapiés; fan de la Bundesliga, la cerveza y _La que se avecina_; 7 días de vacaciones al año; intenta ligar con ucranianas "vulnerables"; mediocre; fuerza bruta. (Antes llamado por error "Consejo Guillén".) | **Coalossal** / Slaking Cervecero |
| **David Guillén** | Hermano de Sergio; profesor de historia; "bienqueda" patológico, cambia de opinión 3 veces para no quedar mal. | **Castform** (cambia según el clima/opinión) |
| **Álvaro Benito** | Historiador, interino, "cenizo profesional"; de derechas, espanta citas convirtiéndolas en debate político; hernia de espalda; mala suerte; del Real Madrid; quiere "torturar" amigos llevándolos a monumentos. Rubio, despeinado, encorvado. | **Bastiodon** (muro defensivo, aburrido, testarudo) / Bronzong Salmantino |
| **Eduardo** | De Salamanca; ególatra obsesionado con el dinero pese a cobrar poco; postureo en redes; casado con **Sofía** (omnipresente). Entradas pronunciadas, cara de tacaño. | **Greedent** (acumula y no comparte) |
| **Madre de Eduardo** | "Mente maestra de la tacañería"; cobra "hasta el aire". Caso real: cobró una Coca-Cola a Álvaro. Mujer mayor, gafas gruesas, severa. | **Sableye** (duende que roba joyas) |
| **Sofía** | Novia/esposa absorbente y omnipresente de Eduardo; coprotagonista de su "boda pública" eterna. | (no especificado en el doc) |
| **Cortina** | **OJO — retconeado**: el doc indica explícitamente _"no existe"_ (es personaje de la novela de suspense, **Julio/Hilario Cortina, el portero**). En el lore previo del juego figuraba como ex-analista de M&A con estómago de cristal (vomita en estrés, hasta en cortinas), muy delgado pero con un brazo fuerte. Tratar como **opcional / no canónico**. | **Swalot / Garbodor / Muk Cortiniano** |
| **José Antonio, el casero** | Calvo total ("bola de billar"); única función: aparecer el día 1 de cada mes para bloquearte hasta que pagues el alquiler. | **Probopass** (nariz gigante con bigote, atrae dinero magnéticamente) |
| **Juan Carlos "el Guapo"** | Aspirante a Julio Iglesias, modelo/cantante "pringado que no se come una rosca"; narrador de la historia con pasión. Galán clásico, tupé. (En la novela de suspense era un estafador ficticio de 1986; en el juego es **narrador**.) | **Jigglypuff** (canta pero duerme/avergüenza al público) |
| **Danna / Dana** | **Novia de Marcelino**. "Hustler" ecuatoriana criada en Madrid; trabajó 1 año en Australia; hasta 4 empleos simultáneos (Mapfre administrativa, camarera en El Rincón de Jaén, etc.); muy trabajadora; la presentó la amiga cubana **Maura**. Bajita, curvas pronunciadas. | **Kangaskhan** (madre trabajadora que carga con todo) |
| **Maura** | Amiga cubana de Marcelino; "celestina" que une parejas vía salsa y reparto; controla el ritmo de la noche. Latina, complexión de bailarina, auriculares grandes. | **Oricorio (estilo Apasionado/Baile)** |
| **El Tío de la Autoescuela** | "Ser mítico de Salamanca", tío de Alex, ~150kg (obesidad mórbida); guardián del transporte (Bici/Vuelo) pero obliga a exámenes teóricos absurdos. Chaleco reflectante. | **Drampa** (dragón anciano sabio con aspecto de abuelo) |
| **Pablo Gallo** | (Añadido al final, sin rol claro) "Argentino guasón, ingeniero de software, le gusta quedar con muchas mujeres; gym, anime y tatuajes." | (no especificado en el doc) |

**Facción Torrevieja (la ciudad de origen de Marcelino — "Team Torrevieja", los turbios de Levante):**

| Personaje | Lore (literal/condensado) | Pokémon |
|---|---|---|
| **Ramiro** | Jugador de póker profesional; padrastro que "juega la partida guardada de otro" (entró en una familia ya formada); turbio, siempre con un as en la manga. Alto, pelo hacia atrás, ojos azules, gafas de sol. | **Honchkrow** (jefe mafioso, habilidad "Afortunado") |
| **Gustavo** | Doctorando en Fisioterapia (Univ. Murcia), número 1 de su promoción; cerebrito con cuerpo de gimnasio, septum y pendientes; obsesionado con chicas pálidas/blanquitas. | **Kommo-o / Lucario** (dragón luchador con escamas como piercings) |
| **Tatián** | Camionero rumano criado en Torrevieja, 110kg / 1.70m; aspecto temible pero voz aguda de "osito amoroso"; fiesta dura y sustancias. Barba frondosa, estética motera. | **Bewear** (oso de peluche que puede partirte en dos) |

**Otros mencionados (lore previo, menor relevancia):** Jesús Castellanos (comercial Madrid), Gonzalo Trigueros (comercial Alicante), Diego Muro (CFO de Tripath), David (inquilino) — son contexto de negocio real, no roles de juego definidos. Adrián también aparece como cabeza del **"Team Piso"** original (Marcelino, Álvaro, Jesús, Adrián), siendo Alex del grupo de Salamanca de Álvaro.

---

## 3. Versiones "Gym Leader / Pokémon" (recogidas textualmente)

El doc generó varias iteraciones de la liga. Se recogen las tres más completas.

### 3.A — "Liga Chamberí" (versión rápida, todos como líderes/altos mandos)

| # | Personaje | Gimnasio / Sala | Tipo | Pokémon insignia | Medalla | Frase de entrada |
|---|---|---|---|---|---|---|
| 1 | Marcelino | Gimnasio Cashflow Central / "Rentabilidad Total" | Acero/Normal | Metagross | (Cashflow) | "Antes de enfrentarme… ¿me puedes enseñar tu Excel de rentabilidad? No acepto combates sin ROI." |
| 2 | Álvaro | Gimnasio de la Llama Intelectual / "Fuego Lógico" | Fuego/Psíquico | Infernape | (Humo y Honor) | "Tendrás que resolver este puzzle mientras te fumo el combate. Y sí, mi madre ya lo sabe." |
| 3 | Alex | Gimnasio Erasmus Digital / "Código y Corazón" | Eléctrico/Psíquico | Rotom (forma Ordenador) | Debug | "Este combate lo programé ayer… mientras stalkeaba a una eslava en Instagram. Multitasking, bro." |
| 4 | Blanca | Academia de Notarías Encantadas | Hada/Psíquico | Gardevoir | Contrato | "Te voy a ganar con cariño y jurisprudencia. ¿Firmas el consentimiento para perder?" |
| 5 | Jesús "la Rata" (Alto Mando) | Gimnasio Fantasma de Luxemburgo | Veneno/Fantasma | Weezing (forma Galar) | — | "Te abandoné en el piso... pero vuelvo con pelo, flow y venganza." |
| 6 | Rafael Robledo (Alto Mando) | Oficina de Productos Tóxicos S.L. | Siniestro/Normal | Perrserker | — | "Yo no estafé… ofrecí rentabilidad ilusoria. Ahora págame con tu equipo Pokémon." |
| 7 | José Antonio el Casero (Alto Mando) | La Azotea Calva | Roca/Acero | Probopass | — | "La calvicie es poder. El alquiler sube. Tu moral baja." |
| 8 | Ángel el Ansiolítico | Máster de Másters | Psíquico/Hielo | Porygon2 | — | "Nada sale de aquí sin pasar por mi revisión. Ni tú. Ni tu estrategia." |
| — | Sergio Guillén (NPC/Líder móvil) | con su camión | Lucha/Normal | Slaking (con casco de camionero) | Media de Cerveza | "¿Una cañita y unas bravas antes de tu combate con la Liga? No hay huevos." |

### 3.B — "Pokémon Iberia Legends / Legends of Chamberiana" (8 gimnasios + Alto Mando + Campeón + villano)

Región: **Chamberiana** (fusión Madrid–Salamanca). Ciudad inicial: **Chamberí Pueblo**. Ciudad de la Liga: **Plaza Mayor (Salamanca)**. Todos los insignia son **variantes regionales** ("X de otro tipo").

**8 Gimnasios:**

| Gimnasio | Líder | Tipo entrenador | Medalla | Pokémon regional insignia | Frase |
|---|---|---|---|---|---|
| Cashflow / Financiero | Iván (FinTips) | Financiero | Liquidez | Persian Chamberiano (Acero/Normal) | "Si no inviertes, ¿cómo esperas vencer?" |
| Erudito | Álvaro Alonso | Estratega | Intelecto | Alakazam Chamberiano (Psíquico/Fuego) | "Tu jugada fue interesante, pero la mía es superior." |
| Digital | Alex | Tecnológico | Swipe | Rotom Tinderiano (Eléctrico/Hada) | "Hoy hago match... con tu derrota." |
| Notarial | Blanca | Jurista Encantadora | Contrato | Gardevoir Chamberiana (Hada/Psíquico) | "Firma aquí, y luego discutiremos tu derrota." |
| Histórico | Álvaro Benito | Cenizo Debatidor | Monumental | Bronzong Salmantino (Acero/Roca) | "España se hunde, como tu equipo frente a mí." |
| Ego | Eduardo | Postureador | Narciso | Greedent Salmantino (Normal/Siniestro) | "Me encantaría ser humilde, pero sería mentirte." |
| Caos Gástrico | Cortina | Caótico | Náusea | Muk Cortiniano (Veneno/Agua) | "Prepárate para un combate que revuelve estómagos." |
| Calvicie | José Antonio (Casero) | Tacaño | Hipoteca | Probopass Calvo (Roca/Acero) | "Me debes ya tres meses de respeto." |

**Alto Mando:** Jesús "la Rata" (Fantasma/Veneno — Weezing Vapeador) · Rafael Robledo (Siniestro/Acero — Perrserker Financiero) · Madre de Eduardo (Veneno/Normal — Sableye Avaricioso) · Sergio Guillén (Lucha/Normal — Slaking Cervecero).

**Campeón:** **Marcelino** (Acero/Dragón — **Metagross Estrambótico**; equipo: Metagross, Dragonite, Salamence, Duraludon, Lucario, Garchomp). Frase: "Te esperaba. Ahora verás mi verdadera fuerza."

**Villano — Team Schizo:** Líder **Adrián** (Psíquico/Siniestro — **Mr. Mime Tyrant**; equipo: Mr. Mime, Malamar, Zoroark, Hypno, Gothitelle). Comandantes: Cortina (sabotaje gástrico), Álvaro Benito (baja la moral social), Eduardo (postureo mediático). Objetivo: imponer la visión "perfecta" de Adrián (música, risas forzadas, dominación intelectual).

**Legendarios:** del Caos — **Zoroark Schiziano** (Psíquico/Fantasma); del Orden — **Lucario Chamberiano** (Acero/Hada).

### 3.C — "Pokémon: La Caída del Imperio" (región **Hispania Nova**, gimnasios progresivos, tono más hiriente)

Región basada en la historia/decadencia de España. Villano: **Movimiento Barrera / Movimiento Schizo** (Adrián), con su "Reforma Perfecta". Gimnasios progresivos (1º–2º fáciles → campeón muy potente). Misma plantilla de personajes, con **debilidad personal** explícita por líder (ej. Eduardo: "necesidad patológica de validación"; Cortina: "vomita más que debate"; Iván: "tiene razón casi siempre, y lo sabe, pero está solo entre excels"). Alto Mando = Team Piso + Alex; **Campeón = Marcelino** (Acero/Dragón); **Jesús reaparece como subcampeón** "con injerto" (Gengar Capilar, Fantasma/Siniestro).

### 3.D — Estructura canónica final ("Edición Piso") — roles consolidados

> Esta es la asignación de roles **definitiva** del autor (sección final del doc). Difiere de 3.B en que
> **Marcelino es el JUGADOR** (no el campeón) y **Álvaro Alonso es el CAMPEÓN/rival**.

| Rol | Personaje(s) | Tipo (gimnasio/sala) |
|---|---|---|
| **Jugador** | Marcelino | — (insignia: Metagross) |
| **Rival / Campeón (Torre Deloitte, azotea)** | Álvaro Alonso | insignia: Volcarona (Bicho/Fuego) |
| **Villano** | Adrián Barrera (Team Schizo) | insignia: Mr. Mime Galar/Tirano |
| **Gimnasio 1 (Veneno)** | Cortina | "gimnasio que huele a vómito" |
| **Gimnasio 2 (Psíquico/Tech)** | Iván FinTips | distrito financiero |
| **Gimnasio 3 (Roca/Camión)** | Sergio Guillén | duerme en su camión |
| **Gimnasio 4 (Normal/Avaricia, doble)** | Eduardo + su madre | centro comercial (te cobran por usar pociones) |
| **Gimnasio 5 (Fantasma)** | Jesús "La Rata" | reaparece con pelo nuevo, lleno de vapor |
| **Gimnasio 6 (Acero/Cenizo)** | Álvaro Benito | "el combate más aburrido de la historia" + chapa política |
| **Gimnasio 7 (Clima/Variable)** | David Guillén | universidad; cambia de estrategia constantemente |
| **Gimnasio 8 (Lucha/Dragón)** | Gustavo | gimnasio de playa en Torrevieja |
| **Alto Mando 1 (Siniestro)** | Ramiro | "el padrino del póker" |
| **Alto Mando 2 (Hada/Lucha)** | Tatián | "el oso amoroso pero letal" |
| **Alto Mando 3 (Acero/Oro)** | Rafael Robledo | "el estafador final" |
| **Alto Mando 4 (Eléctrico/Tóxico)** | Alex | "lucha mientras mira Tinder" |
| **NPCs de bloqueo/ayuda** | Danna (bloquea ruta), Maura (baile/salsa), Blanca (papeles/pase final), José Antonio (cobra alquiler día 1), Juan Carlos "el Guapo" (narrador), Tío de la Autoescuela (transporte) | — |

---

## 4. Lugares reales mencionados (posibles localizaciones del mapa)

**Pisos / zonas de gestión real de Marcelino:** Don Quijote, General Margallo, Moratalaz, Concepción
Jerónima, Chamberí.

**Madrid (juego):** Bravo Murillo 37 (Tetuán, casa inicial), Parque Móvil del Estado, Plaza de Olavide,
Puerta del Sol, Plaza Mayor (Casa de la Panadería), Gran Vía, Palacio Real / Plaza de Oriente, Parque
del Retiro (Palacio de Cristal), Plaza de Toros de Las Ventas, Malasaña (Plaza del Dos de Mayo), Cuatro
Torres Business Area, Plaza de Cibeles (Palacio de Comunicaciones), Barrio de las Letras (laboratorio
del profesor), Estación Fantasma de Chamberí, Casa de Campo, Galerías del Viaje del Agua, Cerro de los
Ángeles, AZCA, Faunia (Safari), Barrio de Salamanca, distrito financiero.

**Comunidad de Madrid (post-juego, vía Cercanías):** Alcalá de Henares, Aranjuez, El Escorial, Sierra de
Guadarrama.

**Otras regiones del lore:** Salamanca (zona histórica/universitaria; Plaza Mayor de Salamanca como sede
de Liga en una versión), Torrevieja (costa "turbia" de Levante, origen de Marcelino).

---

## 5. Mecánicas e ideas de juego

### Juegos analógicos / sociales propuestos
- **MADRÍRICO** — juego de mesa tipo "trivial local / Connections" para madrileños: secciones de
  Conexiones (agrupar palabras: barrios, transporte, iconos culturales), "¿Quién es este madrileñ@?"
  (caras fusionadas de famosos), motes madrileños, fachadas por barrio, aeropuertos por continente desde
  Barajas, famosos por iniciales, "Googlea esto y ríete" (autocompletados absurdos).
- **Team Piso Trivia** — banco de ~20 preguntas (4 niveles: warm-up, matices, frikis del lore, bonus
  insider) sobre el universo. Propuesto como web / Kahoot / ruleta / cartas imprimibles.
- **Cartas coleccionables tipo TCG / "líder de gimnasio"** — cada personaje con stats, poderes y frase
  mítica; fondos de ciudad (Chamberí, Deloitte Tower, Lavapiés Digital), logos de medalla.
- **"UNO de Piso"** — cartas con poderes únicos (José Antonio +2 Calvicie, Rafael Robledo estafa doble,
  Jesús la Rata "desaparece y vuelve con pelo").

### Mecánicas del videojuego (de la "Edición Castiza", reutilizables)
- Motor de referencia: **Pokémon Esmeralda / Generación 3** (GBA, 240×160, 32.768 colores).
- **Naturalezas (25), Habilidades + 7 exclusivas de Madrid, EVs/IVs, Combates Dobles.**
- **Habilidades exclusivas:** Espíritu Castizo (+30% Lucha si HP<50%), Eco del Túnel (sonido x1.5 en
  interiores), Piel de Azulejo (−25% Fuego/Agua), Aura Capitalina (+10% a todo si es el último),
  Siesta Madrileña (cura 1/16 HP entre 14:00–17:00), Leyenda Urbana (inmune a Normal), Verbena (estado
  "Festivo" al entrar, sube Velocidad).
- **Bases secretas → "Pisos Secretos":** alquilas pisos vacíos (carteles "SE ALQUILA"), MO "Llave
  Maestra", decoras con muebles castizos (sofá, mesa camilla, póster del Atleti/Real Madrid), invitas a
  otros jugadores y recibes retos de NPCs.
- **Concursos → "Certámenes de San Isidro"** en Las Ventas: categorías Solera, Salero, Temple, Brío,
  Arte (pasarela + exhibición).
- **PokéNav → MadriNav:** Mapa de Madrid (con metro), Pokédex, Match Call, Pokémon Check, Agenda
  Verbenas, Radio Madrid.
- **Pokémon siguiéndote** (estilo HGSS) con reacciones contextuales por zona.
- **Mecánicas castizas extra (checklist):** Metro, Verbenas, **Tapeo** (compras tapas para subir
  felicidad), **Tertulia**, Pisos Secretos. **Battle Tower de AZCA**, **Safari Zone "Faunia"**.
- **Fakémon propios (151):** Chulapón (Lucha), Gatolegre (Normal/Fantasma), Azulejín (Agua/Acero), y
  legendarios Metroño (Acero/Fantasma), Madroñero, Orsón Regio (Normal/Tierra), Cibeleona/Cibeleón
  (Agua/Hada), Ursabón (Siniestro/Tierra), Capitolium, Almudenauro (Dragón/Hada). Profesor **Benito
  Galdós**; rival **Pablo**; villano final **Equipo Vandalia** (líder **Doña Constanza**).
- Duración estimada: historia 25–35h; Pokédex 60–80h; 100% en 100h+.

---

## 6. Elementos de imagen / diseño descritos

- **Pantalla de título (Edición Castiza):** skyline pixel art de Madrid al atardecer (Cuatro Torres,
  Palacio Real, Cibeles), logo "POKÉMON" en arco Gen 3, "MADRID" en letras doradas metálicas,
  "Edición Castiza" en rojo y amarillo (bandera), legendario **Orsón Regio** rugiendo, partículas de
  hojas de madroño, música pasodoble 16-bit.
- **Paleta de Madrid (estilo Esmeralda):** cielo día #87CEEB, atardecer #FF7F50, noche #191970, ladrillo
  terracota #CD5C5C, piedra caliza #F5F5DC, azulejo Metro #0047AB, vegetación Retiro #50C878, oro
  detalles #FFD700, metal Metro #C0C0C0.
- **Sprites detallados** con paletas hex por Pokémon/líder (ej. Chulapón con chaleco de pana, gorra,
  pañuelo rojo; Gatolegre con bufanda fantasmal púrpura translúcida), animaciones idle/ataque/back,
  tamaños 64×64 (batalla), 32×32 (overworld), 40×40 (menú).
- **Carteles propuestos:** póster estilo Netflix de la sitcom "Team Piso" (Álvaro izquierda, Marcelino
  centro, Alex derecha) usando las caras reales; carteles tipo "Los 3 Fantásticos de Chamberí" / "La
  leyenda de Álvaro"; imagen detallada del juego MADRÍRICO.
- **Descripciones físicas reales** de cada personaje (sección "Descripción física: Edición Piso") ya
  recogidas en las fichas — útiles como referencia de sprite/retrato fiel a los amigos reales.

---

## Notas de integración

> Análisis para encajar este SPEC con el juego que YA existe (motor Pokémon FireRed en Phaser, Madrid
> castizo como mundo, Pokémon REALES de Gen 1, combate por turnos).

### Qué encaja directamente (bajo coste)
- **El mundo ya es Madrid castizo** → coincide al 100% con la ambientación del doc. Las localizaciones
  del SPEC (Sol, Plaza Mayor, Gran Vía, Retiro, Las Ventas, Malasaña, Cuatro Torres, Cibeles, Estación
  Fantasma de Chamberí) son un mapa de ciudades/gimnasios listo para portar.
- **Combate por turnos + Gen 1 real** → compatible con la idea de "líder de gimnasio + equipo temático".
  No hace falta crear Fakémon: cada personaje puede recibir un **equipo de Pokémon Gen 1 reales** que
  rime con su lore (ver mapeo abajo).

### Cambios recomendados respecto al juego actual
1. **Intro / premisa.** Sustituir la intro genérica por la canónica del doc: el jugador **es Marcelino**,
   sale de su piso en **Bravo Murillo (Tetuán)**, y su objetivo es "poner orden en el caos" y vencer a su
   compañero de piso **Álvaro Alonso (campeón)**. Tono: parodia adulta castiza.
2. **Protagonista = Marcelino** (sprite hispano-cubano, afro corto, sudadera). Insignia narrativa:
   Metagross — pero como solo hay Gen 1, traducir a un ace Gen 1 (ver nota de diseño abierta).
3. **NPCs principales = los amigos:** Álvaro Alonso (rival/campeón), Alex (rival amistoso/Alto Mando),
   Blanca (NPC de ayuda/burocracia), Ángel, Danna y Maura (NPCs de bloqueo de ruta), José Antonio (casero
   que bloquea hasta pagar alquiler), Juan Carlos "el Guapo" (narrador).
4. **Gimnasios = personajes del lore.** Recomendado adoptar la **estructura canónica 3.D** (Cortina/Veneno,
   Iván/Psíquico, Sergio/Roca, Eduardo+madre/Normal-doble, Jesús/Fantasma, Álvaro Benito/Acero,
   David/Variable, Gustavo/Lucha). **Atención al límite de tipos Gen 1**: Hada/Siniestro/Acero no existen
   en Gen 1 — habrá que remapear esos tipos (ver decisiones abiertas).
5. **Villano:** introducir a **Adrián Barrera / Team Schizo** como antagonista recurrente (equivalente a
   Team Rocket) con objetivo "Orden Perfecto".
6. **Mecánicas castizas opcionales** que el motor podría adoptar barato y dan identidad: **Tapeo** (subir
   felicidad), **Pisos Secretos** (bases), **Certámenes de San Isidro** (concursos), eventos de día/noche
   y verbenas.

### Mapeo sugerido de equipos a Pokémon Gen 1 reales (propuesta, a confirmar)
- Marcelino → ace **Kangaskhan/Alakazam** (estratega) — el doc usa Metagross (Gen 3); en Gen 1 falta.
- Álvaro Alonso (campeón) → **Charizard/Arcanine** (fuego = "burnout"; Volcarona no existe en Gen 1).
- Alex → **Magneton/Electabuzz** (eléctrico = tech); el doc pide Toxtricity/Rotom (no-Gen 1).
- Jesús "la Rata" → **Weezing** y **Gengar** (sí existen en Gen 1; encaja perfecto).
- Iván FinTips → **Porygon** (sí Gen 1).
- Sergio Guillén → **Snorlax/Machamp** (Slaking/Coalossal no-Gen 1).
- Eduardo → **Persian/Meowth** (avaricia; Greedent no-Gen 1). Madre → **Gengar/Haunter** (Sableye no-Gen 1).
- José Antonio → **Golem/Onix** (Probopass no-Gen 1).
- Blanca → **Clefable/Mr. Mime** (Gardevoir no-Gen 1). Adrián → **Mr. Mime/Hypno** (sí Gen 1; encaja).

### Preguntas de diseño abiertas (confirmar con Marcelino)
1. **¿Marcelino es el JUGADOR o el CAMPEÓN?** El doc tiene ambas versiones; la **final canónica** lo hace
   JUGADOR y a Álvaro Alonso CAMPEÓN. ¿Confirmamos esto o prefiere jugar "como el jefe final"?
2. **Generación de Pokémon:** el juego actual usa **Gen 1 real**, pero el lore pide insignias de Gen 3+ y
   variantes regionales/Fakémon. ¿Nos quedamos en Gen 1 (remapeando aces como arriba), ampliamos a Gen 3,
   o creamos Fakémon castizos (Chulapón, etc.)? Esto condiciona tipos (Hada/Siniestro/Acero no existen en
   Gen 1) y arte.
3. **Alcance de personajes:** ¿solo el trío del piso + villano para un MVP, o el elenco completo
   (Salamanca + Torrevieja + secundarios, ~25 personajes)?
4. **Tono:** ¿mantenemos el registro "parodia adulta hiriente" (vapeo, Tinder, estafas, política) o se
   suaviza para que sea compartible/regalable a los amigos?
5. **¿Personaje "Cortina"?** El doc lo declara explícitamente "no existe" (era de la novela). ¿Se
   descarta del gimnasio Veneno y se reasigna ese gimnasio a otro personaje?
6. **Región:** ¿solo Madrid (como el juego actual), o mapa multi-región Madrid→Salamanca→Torrevieja como
   pide la versión canónica? Afecta enormemente al alcance del mapa.
7. **Fidelidad de sprites:** el doc incluye descripciones físicas reales de cada amigo — ¿queremos
   retratos/sprites reconocibles de las personas reales o versiones estilizadas?
