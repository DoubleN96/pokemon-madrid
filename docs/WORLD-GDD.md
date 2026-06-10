# WORLD-GDD — Referencia completa del mundo (Pokémon Madrid: Edición Castiza)

> Destilado de `docs/GDD-original.txt` para fases posteriores al MVP (ver `docs/SPEC-MVP.md`).
> Regla de mapeo: las criaturas del GDD se sustituyen por **Pokémon reales de Gen 1**. Donde el GDD da pistas claras (tipo/diseño) se propone el equivalente; donde no, se marca **TBD**. Lo que el GDD no especifica también se marca **TBD** — este documento no inventa contenido.

---

## 1. Visión general

- **Título**: Pokémon Madrid: Edición Castiza (versión complementaria: Edición Moderna). Slogan: *"¡Hazte con todos en la capital!"*
- **Ambientación**: Madrid atemporal que fusiona principios del s. XX (tranvías, farolas de gas, modernismo) con el Madrid contemporáneo (metro, rascacielos, cultura urbana). Chulapos con hipsters, verbenas con festivales.
- **Base mecánica**: Pokémon Esmeralda (Gen 3) completa — naturalezas, habilidades, EVs/IVs, dobles, concursos, Pokémon siguiéndote, día/noche.
- **Historia**: protagonista de 11 años de Bravo Murillo 37 (Tetuán); padre (Arturo) desaparecido hace 3 años buscando al legendario Ursabón en las galerías subterráneas; profesor Benito Galdós; rival Pablo (acaba siendo Campeón); villanos: **Equipo Vandalia** (líder: **Doña Constanza**).
- **Estructura**: 21 distritos + rutas, 8 gimnasios, Alto Mando de 4 + Campeón en el Palacio Real, 6 legendarios, 151 especies, misión principal + 15 secundarias, post-juego amplio.
- **Duración estimada**: historia 25–35 h; Pokédex completa 60–80 h; 100% 100+ h.

---

## 2. Paleta de colores de Madrid (PARTE 1, tabla completa)

| Elemento | Color principal | Hex | Uso |
|---|---|---|---|
| Cielo día | Azul madrileño | `#87CEEB` | Fondos exteriores |
| Cielo atardecer | Naranja cálido | `#FF7F50` | Ciclo día/noche |
| Cielo noche | Azul oscuro | `#191970` | Noche |
| Ladrillo Madrid | Terracota | `#CD5C5C` | Edificios |
| Piedra caliza | Beige claro | `#F5F5DC` | Monumentos |
| Azulejo Metro | Azul cobalto | `#0047AB` | Estaciones |
| Azulejo blanco | Marfil | `#FFFFF0` | Metro, fuentes |
| Vegetación Retiro | Verde esmeralda | `#50C878` | Parques |
| Asfalto | Gris urbano | `#696969` | Calles |
| Hierba encuentros | Verde vivo | `#228B22` | Zonas salvajes |
| Agua estanques | Azul turquesa | `#40E0D0` | Retiro, fuentes |
| Oro detalles | Dorado | `#FFD700` | Decoraciones |
| Metal Metro | Plateado | `#C0C0C0` | Vagones, raíles |

Paletas secundarias por barrio (donde el GDD las da): Tetuán — ladrillos `#CD5C5C`→`#8B4513`, aceras `#D3D3D3`; Chamberí — caliza `#F5F5DC` con art nouveau verde `#228B22` y dorado `#FFD700`, adoquines `#D3D3D3`; Las Letras — fachadas blancas `#FFFAFA` y ocre `#D2691E`.

Especificación técnica de referencia (GBA): 240×160 px, 15-bit, 60 FPS, 4 capas de fondo con parallax, sprites hasta 64×64.

---

## 3. Distritos y conexiones (grafo)

El GDD declara **21 distritos jugables** pero solo detalla/nombra los siguientes. Conexiones acreditadas por los mapas ASCII y textos del GDD:

```
                 [Chamartín] (solo nombrado, TBD)
                      |
                 (Ruta 1 — según mapa de Tetuán)
                      |
  D1 TETUÁN ——(Ruta Tetuán↔Chamberí*)—— D2 CHAMBERÍ
                                            |
                                       (Ruta 2 — según mapa de Chamberí)
                                            |
                                   D3 BARRIO DE LAS LETRAS
                                            |
                                        (Ruta 3)
                                            |
                                       D4 SOL / PUERTA DEL SOL —— acceso GIMNASIO 1 (Plaza Mayor)
```

\* Inconsistencia del GDD: el mapa de Tetuán llama "Ruta 2" a esta conexión; la sección detallada la titula "RUTA 1: Bravo Murillo → Chamberí"; el mapa de Chamberí la llama "Ruta 1". El MVP la fija como **Ruta 2**.

Distritos numerados restantes que el GDD sitúa pero sin conexiones explícitas (**conexiones TBD**):

| # | Distrito | Punto clave |
|---|---|---|
| D5 | Gran Vía | Gimnasio 2 (Eléctrico), Edificio Metrópolis |
| D6 | Palacio Real / Plaza de Oriente | Gimnasio 3 (Lucha) + sede del Alto Mando |
| D7 | Parque del Retiro | Gimnasio 4 (Planta), Palacio de Cristal |
| D8 | Las Ventas | Gimnasio 5 (Fuego), plaza de toros; Certámenes de San Isidro |
| D9 | Malasaña | Gimnasio 6 (Veneno), Plaza del Dos de Mayo |
| D10 | Cuatro Torres | Gimnasio 7 (Psíquico), Battle area Azca cercana |
| D11 | Plaza de Cibeles | Gimnasio 8 (Agua), Fuente de Cibeles |

Otras zonas nombradas: **Casa de Campo** (Ruta Victoria → Palacio Real), **Azca** (Battle Tower, post-liga), **Atocha** (estación de Cercanías, post-liga), **Faunia** (Safari Zone, este de Madrid), **Cerro de los Ángeles** (legendarios, post-liga), **Parque Móvil del Estado** (Tetuán, post-liga → Galerías del Viaje del Agua). Los distritos restantes hasta 21: **TBD** (no nombrados en el GDD).

### 3.1 D1 — TETUÁN (ciudad inicial)

Barrio obrero, edificios años 30–60, comercios familiares. Mapa 32×32 tiles.
Puntos de interés: casa del jugador (Bravo Murillo 37; guardar, madre cura; post-liga: el padre aparece aquí), Centro Pokémon (2º piso: Club de Fans, da objetos con racha de victorias), **Ultramarinos Don Paco** (Poción 300₧, Antídoto 100₧, Pokébola 200₧, Poké Muñeco 1.000₧, Carta 50₧), **Bar El Tetuán** (sistema de tapeo → felicidad; pistas de Pokémon raros; TV con noticias), **Parque Móvil del Estado** (cerrado hasta post-liga), estación de Metro.
Salvajes (Plaza Tetuán): Ratamad→**Rattata** 2–4 40%; Pichoneta→**Pidgey** 2–4 35% (día); Perrucho→**Growlithe** 3–5 15%; Gatolegre→**Meowth** 4–6 10% (noche).

### 3.2 Ruta Tetuán↔Chamberí

48×16 tiles. 4 entrenadores obligatorios (Niño Óscar, Niña Lucía, Joven Marcos, Señora Carmen) + 1 oculto (Punk Dani, premio 140₧ + TM41 Placaje). Salvajes: Rattata 45%, Pidgey 40%, Growlithe 14%, Libracho→**Abra** 1% (Nv. 3–7). Objetos: Poción, Pokébola ×3, Antídoto. (Detalle completo en SPEC-MVP §3.6.)

### 3.3 D2 — CHAMBERÍ

Barrio señorial modernista. Mapa 24×24 tiles.
- **Estación Fantasma de Chamberí**: cerrada ("CLAUSURADA 1966"); se abre con **Llave Antigua**. Interior: Espectrillo→**Gastly** 15–18 40%; Metroño forma menor→TBD 18–22 5%; Ratamad→**Rattata** 14–17 35%; Rautín→TBD 16–19 20%. Post-liga: encuentro con el legendario **Metroño**.
- **Evento "La Llave de la Estación"**: anciano del Café del Modernismo (ex-trabajador, cuenta que la cerraron en 1966 y que los obreros "veían cosas") te reta — **Abuelo Ramón**: Ferrovía ♂ Nv.25 (TBD), Rautón ♂ Nv.25 (TBD), Metroño ♂ Nv.28 (TBD). Premio: 2.800₧ + LLAVE ANTIGUA.
- **Mercado de Vallehermoso** (curativos únicos): Manzana Madrileña (cura 50 PS) 350₧; Queso Manchego (cura confusión) 200₧; Jamón Ibérico (cura todos los estados) 800₧.
- **Café del Modernismo**: minijuego de **Tertulia** (preguntas culturales) → MTs raras y objetos.
- Centro Pokémon (enfermera con cofia antigua), boca de Metro activa.
Salvajes (Plaza Olavide): Rosalaño→**Oddish** 6–9 30%; Pidgey 5–8 30%; Abra 6–9 20%; Growlithe 5–8 15%; Meowth 7–10 5% (noche).

### 3.4 D3 — BARRIO DE LAS LETRAS

Calles empedradas con citas literarias, farolas de gas. Mapa 28×28 tiles.
Puntos de interés: **Laboratorio del Profesor Galdós** (elección de inicial; evaluación de Pokédex; mejoras post-liga), **Casa-Museo de Lope de Vega** (Teatrín→**Mr. Mime** sugerido, aparece de noche), **Teatro del Barrio** (post-liga: minijuego de actuar), **Plaza de Santa Ana** (misiones secundarias), Centro Pokémon, Poké Mart ampliado tras 1ª medalla (Poción 300, Superpoción 700, Pokébola 200, Superball 600, Antídoto 100, Antiparalizador 200, Despertar 250, Repelente 350).
Salvajes (jardines): Libracho→**Abra** 8–12 35%; Pidgey 7–10 25%; Teatrín→**Mr. Mime** (sugerido) 8–12 15% (noche); Notaní→TBD 8–11 15%; Pincelit→TBD 9–12 10%.

---

## 4. Gimnasios (los 8)

Tipos por orden: Normal, Eléctrico, Lucha, Planta, Fuego, Veneno, Psíquico, Agua.

### Gimnasio 1 — PLAZA MAYOR (Normal) · Líder: MAYOR MATILDE

- Acceso desde Puerta del Sol (D4). Interior: plaza de toros en miniatura / corral de comedias, arena dorada, sin puzzle.
- Entrenadores: Castiza María (Perrucho→Growlithe 9, Ratamad→Rattata 9), Castizo Antonio (Pidgey 10 ×2), Churrero José (Churrito→TBD 11).
- Matilde: 55 años, moño con peineta, vestido de lunares, abanico. Conoció a Arturo ("También me ganó. Con un Azulejín, si no recuerdo mal" → adaptar a Squirtle).

| Pokémon GDD | Nv. | Movimientos GDD | → Real |
|---|---|---|---|
| Ratamad ♀ | 10 | Placaje, Malicioso, Ataque Rápido | **Rattata** |
| Perrucho ♂ | 11 | Placaje, Aullido, Mordisco | **Growlithe** *(nota: rompe el mono-tipo Normal; alternativa fiel: Eevee)* |
| Castañón ♂ | 13 | Placaje, Látigo, Pisotón, Síntesis | TBD *(criatura-castaña con Síntesis; sugerencia: Exeggcute)* |

- **Medalla Castiza** (sol de la Casa de la Panadería, dorado/rojo): obedecen hasta Nv. 20, Corte fuera de combate. Premio: TM45 Atracción + 1.300₧.
- Diálogos pre/post-batalla completos en GDD líneas 1489–1604 (literales, listos para usar).

### Gimnasio 2 — GRAN VÍA (Eléctrico) · Líder: VOLTEO

- Edificio Metrópolis; interior discoteca años 80, suelo que se ilumina. Puzzle de interruptores: orden ROJO → VERDE → AZUL (fallo = suelo electrificado, vuelves al inicio). Combate final del líder es **doble** (según PARTE 2).
- Volteo: 35 años, estilo Billy Idol, chaqueta de cuero roja, air guitar.

| Pokémon GDD | Nv. | Movimientos | → Real |
|---|---|---|---|
| Farola-K ♀ | 18 | Impactrueno, Onda Trueno, Destello | **Magnemite** (farola metálica eléctrica) |
| Voltaploma ♂ | 19 | Impactrueno, Ataque Ala, Agilidad | TBD *(ave eléctrica; Gen 1 solo tiene Zapdos, legendario)* |
| Neoniko ♂ | 21 | Rayo, Doble Equipo, Rapidez, Onda Trueno | **Electabuzz** (sugerido) |

- **Medalla Neón** (rayo, amarillo/azul): obedecen hasta Nv. 30, Destello fuera de combate. Premio: TM34 Onda de Choque.

### Gimnasio 3 — PALACIO REAL (Lucha) · Líder: DON FÉLIX DE AUSTRIA

- Salón de armas/academia de esgrima. Puzzle: derrotar guardias por rango (Soldado → Cabo → Sargento → Capitán).
- Don Félix: 50 años, armadura ceremonial, capa roja, bigote imperial.

| Pokémon GDD | Nv. | Movimientos | → Real |
|---|---|---|---|
| Espadachín ♂ | 26 | Tajo Cruzado, Danza Espada, Ataque Rápido | **Hitmonlee** (sugerido; alternativa temática: Farfetch'd) |
| Piquerico ♂ | 27 | Lanza Umbría, Fortaleza, Golpe Cabeza | TBD |
| Alabardón ♂ | 29 | Tajo Cruzado, Inversión, Corpulencia, Venganza | **Machamp**/Machoke (sugerido) |

- **Medalla Imperial** (escudo con águila bicéfala, plata/rojo): obedecen hasta Nv. 40, Surf fuera de combate.

### Gimnasio 4 — PARQUE DEL RETIRO (Planta) · Líder: FLORA DEL RETIRO

- Palacio de Cristal; invernadero gigante. Puzzle: laberinto de setos que cambian si cortas mal.
- Flora: 28 años, hippie-ecologista, corona de flores, descalza.

| Pokémon GDD | Nv. | Movimientos | → Real |
|---|---|---|---|
| Rosalaño ♀ | 33 | Gigadrenado, Dulce Aroma, Síntesis | **Gloom** (línea de Oddish) |
| Cipresal ♂ | 34 | Rayo Solar, Maldición, Drenadoras | **Exeggutor** (sugerido; árbol) |
| Estanquera ♀ | 36 | Gigadrenado, Surf, Danza Lluvia, Tóxico | TBD *(Agua/Planta no existe en Gen 1)* |

- **Medalla Verde** (hoja de roble, esmeralda/dorado). Efecto de obediencia/MO: TBD (el GDD no lo da).

### Gimnasio 5 — LAS VENTAS (Fuego) · Líder: EL TORERO BRASCÓN

- Ruedo de plaza de toros con público. Puzzle: esquivar cargas de Taurines (timing).
- Brascón: 40 años, traje de luces rosa y dorado, capote.

| Pokémon GDD | Nv. | Movimientos | → Real |
|---|---|---|---|
| Capotero ♂ | 39 | Llamarada, Giro Fuego, Danza Ígnea | **Magmar** (sugerido) |
| Taurín ♂ | 40 | Nitrocarga, Cornada, Buena Baza | **Tauros** (obvio por diseño: toro) |
| Taurón Bravo ♂ | 42 | Envite Ígneo, Terremoto, Descanso, Ronquido | TBD *(toro Fuego/Lucha no existe en Gen 1; sugerencia: Arcanine)* |

- **Medalla Flamígera** (sol con cuernos de toro, rojo fuego/dorado).

### Gimnasio 6 — MALASAÑA (Veneno) · Líder: REBECA LA REBELDE

- Local de conciertos underground, luces estroboscópicas, grafitis animados. Puzzle: interruptores ocultos tras pósters.
- Rebeca: 30 años, punk, cresta morada, tachuelas.

| Pokémon GDD | Nv. | Movimientos | → Real |
|---|---|---|---|
| Grafitón ♂ | 45 | Bomba Lodo, Tóxico, Protección | **Grimer/Muk** (lodo-grafiti, obvio) |
| Viniloz ♀ | 46 | Onda Tóxica, Alarido, Vuelo | **Golbat** (Veneno/Volador) |
| Moviderón ♂ | 48 | Lanza Mugre, Tinieblas, Vendetta, Descanso | **Weezing** (sugerido) |

- **Medalla Underground** (calavera punk con cresta, negro/morado).

### Gimnasio 7 — CUATRO TORRES (Psíquico) · Líder: DOCTORA VISIÓN

- Oficina futurista, suelo de cristal, hologramas. Puzzle: teletransportadores entre las 4 torres.
- Doctora Visión: 45 años, ejecutiva futurista, gafas AR, aura psíquica.

| Pokémon GDD | Nv. | Movimientos | → Real |
|---|---|---|---|
| Teleportín ♂ | 51 | Psíquico, Teletransporte, Descanso | **Kadabra** (sugerido; ojo: colisiona con Libracho→Abra, misma línea) |
| Torrezka ♀ | 52 | Psicocarga, Defensa Férrea, Foco Resplandor | TBD |
| Cerebrium ♂ | 55 | Psíquico, Paz Mental, Bola Sombra, Recuperación | **Alakazam** o **Hypno** (sugeridos) |

- **Medalla Futuro** (circuito/ojo, blanco/azul eléctrico).

### Gimnasio 8 — FUENTE DE CIBELES (Agua) · Líder: LA DIOSA CIBELIA

- Templo acuático grecorromano bajo la fuente; todos los combates del gimnasio son **dobles** (según PARTE 2). Puzzle: plataformas flotantes y corrientes.
- Cibelia: aspecto divino, túnica griega, corona de torres, tridente, dos leones. Diálogos pre/post completos en GDD líneas 1885–1989 (menciona al padre: "Fue el único que me había vencido... hasta hoy").

| Pokémon GDD | Nv. | Movimientos | → Real |
|---|---|---|---|
| Leoncibeles ♂ | 56 | Surf, Mordisco, Agilidad | TBD *(león acuático)* |
| Cibeleona ♀ | 56 | Hidrobomba, Rugido, Protección | **Vaporeon** (sugerido) |
| Carriagón ♂ | 58 | Surf, Defensa Férrea, Descanso | TBD *(carro acuático; sugerencia: Slowbro)* |
| Torrencial ♀ | 60 | Hidrobomba, Rayo Hielo, Paz Mental, Recuperación | **Lapras** (sugerido; learnset compatible) |

- **Medalla Divina** (gota con corona, zafiro/dorado): TODOS obedecen, Cascada fuera de combate. Premio: TM03 Hidropulso.

### Tabla de medallas

| # | Medalla | Gimnasio | Obediencia | MO desbloqueada |
|---|---|---|---|---|
| 1 | Castiza | Plaza Mayor | ≤ Nv. 20 | Corte |
| 2 | Neón | Gran Vía | ≤ Nv. 30 | Destello |
| 3 | Imperial | Palacio Real | ≤ Nv. 40 | Surf |
| 4 | Verde | Retiro | TBD | TBD |
| 5 | Flamígera | Las Ventas | TBD | TBD |
| 6 | Underground | Malasaña | TBD | TBD |
| 7 | Futuro | Cuatro Torres | TBD | TBD |
| 8 | Divina | Cibeles | Todos | Cascada |

---

## 5. Ruta Victoria y Alto Mando (Palacio Real)

### Ruta Victoria: CASA DE CAMPO

Parque forestal 64×64 tiles, multinivel, cuevas y agua. Requisito: 8 medallas. 10 entrenadores veteranos, puzzles de Fuerza/Surf/Cascada, Pablo aparece 2 veces + 1 entrenador élite.
Salvajes Nv. 43–55: Orsón Regio forma menor→TBD 48–52 (bosque profundo 5%), Taurín→**Tauros** 45–50, Ardillona→TBD 43–48, Cipresal→**Exeggutor** (sug.) 45–50, Perrucho evolucionado (Perrote)→**Arcanine** (sug.) 48–52.

### Alto Mando #1 — CARMENCITA (Planta) · Nv. 58–63

Bailaora de flamenco, vestido verde de lunares, mantón de Manila. Sala: jardín interior.

| GDD | Nv. | Tipo GDD | → Real |
|---|---|---|---|
| Rosalaño evolucionada | 58 | Planta/Hada | **Vileplume** (sugerido) |
| Madroñero | 60 | Planta/Tierra | TBD *(árbol-madroño legendario)* |
| Oliverio | 60 | Planta | TBD *(olivo; sugerencia: Tangela)* |
| Cipresal evolucionado | 61 | Planta/Fantasma | TBD *(no existe Planta/Fantasma en Gen 1)* |
| Jazmínica | 63 | Planta/Hada | **Victreebel** (sugerido) |

### Alto Mando #2 — DON ARTURO EL HERRERO (Acero) · Nv. 59–64

Herrero de 60 años, delantal de cuero, martillo. Sala: forja medieval.
*(Nota: Gen 1 apenas tiene Acero — solo la línea Magnemite. Equipo mayormente TBD.)*

| GDD | Nv. | Tipo GDD | → Real |
|---|---|---|---|
| Rautón evolucionado | 59 | Acero | **Magneton** (sugerido) |
| Espaderio | 61 | Acero/Lucha | TBD |
| Metroño | 62 | Acero/Fantasma | TBD (ver legendarios) |
| Forjator | 62 | Acero/Fuego | TBD |
| Escudón | 64 | Acero | **Cloyster** (sugerido por rol defensivo) / TBD |

### Alto Mando #3 — SEÑORITA DOLORES (Fantasma) · Nv. 60–65

Dama de época semi-transparente, mantilla negra. Sala: salón victoriano con niebla.
*(Nota: Gen 1 solo tiene la línea Gastly/Haunter/Gengar como Fantasma — habrá repeticiones o TBD.)*

| GDD | Nv. | Tipo GDD | → Real |
|---|---|---|---|
| Espectrillo evolucionado | 60 | Fantasma | **Haunter** |
| Doñantasma | 62 | Fantasma | **Gengar** (sugerido) |
| Sombrión | 62 | Fantasma/Siniestro | TBD *(no hay Siniestro en Gen 1)* |
| Felínoir | 63 | Normal/Fantasma | **Persian** (línea salvaje de Gatolegre→Meowth) |
| Teatralis evolucionado | 65 | Fantasma/Psíquico | **Mr. Mime** (sugerido, línea de Teatrín) |

### Alto Mando #4 — MAESTRO SANTIAGO (Dragón) · Nv. 61–66

Peregrino sabio del Camino, concha de vieira, bastón. Sala: catedral gótica.
*(Nota: Gen 1 solo tiene la línea Dratini — sugerencias con repetición o TBD.)*

| GDD | Nv. | Tipo GDD | → Real |
|---|---|---|---|
| Peregrynos | 61 | Dragón/Volador | **Dragonair** (sugerido) |
| Caminathor | 63 | Dragón | TBD |
| Dracoñol | 64 | Dragón | **Dragonite** (sugerido) |
| Compostelon | 64 | Dragón/Hada | TBD |
| Almudenauro | 66 | Dragón/Hada | TBD (ver legendarios) |

### CAMPEÓN: PABLO · Nv. 63–68

Sala del Trono del Palacio Real. Sprite con capa roja de campeón y laurel dorado. Diálogo completo (pre-batalla, derrota, victoria, Salón de la Fama) en GDD líneas 2153–2443 — literal y muy emotivo ("Del chaval del 4º de Bravo Murillo... que en el fondo te consideraba su mejor amigo").

| GDD | Nv. | Tipo GDD | Movimientos GDD | → Real |
|---|---|---|---|---|
| Su inicial evolucionado | 68 | variable | firma + 3 cobertura | **Venusaur / Charizard / Blastoise** según tu elección (ver abajo) |
| Taurón Bravo | 63 | Fuego/Lucha | Envite Ígneo, Terremoto, Corpulencia, Descanso | TBD (sug.: Arcanine) |
| Orsón Regio | 64 | Normal/Tierra | Hiperrayo, Terremoto, Triturar, Protección | **Snorlax** |
| Madroñero | 64 | Planta/Tierra | Rayo Solar, Terremoto, Síntesis, Maldición | TBD (sug.: Exeggutor) |
| Cibeleón | 65 | Agua/Acero | Hidrobomba, Garra Metal, Rayo Hielo, Agilidad | TBD |
| Coletón | 66 | Psíquico/Hada | Psíquico, Fuerza Lunar, Deslumbrar, Paz Mental | **Mr. Mime** (sugerido; Psíquico/Hada en gens posteriores) |

Inicial de Pablo según tu elección (GDD → mapeo de iniciales del SPEC):
- Elegiste Chulapón (Bulbasaur) → Pablo lleva Felínoir (final de Gatolegre) → **Charizard**.
- Elegiste Gatolegre (Charmander) → Pablo lleva Mayólicon (final de Azulejín) → **Blastoise**.
- Elegiste Azulejín (Squirtle) → Pablo lleva Castizón (final de Chulapón) → **Venusaur**.

IA del campeón: muy agresiva, cambia ante desventaja de tipo, usa 2 Restaurar Todo, guarda su inicial para el final.

Tras vencer: **Salón de la Fama** (sala circular con cúpula, pedestales de mármol, registro de equipo, créditos) → post-juego desbloqueado.

---

## 6. Equipo Vandalia (villanos)

- Líder: **Doña Constanza**. Última resistencia en las **Galerías del Viaje del Agua** (mazmorra final post-liga); boss final: Doña Constanza + **Ursabón**.
- El GDD los nombra en el checklist y el post-juego pero **no detalla** miembros, gruñones, equipos ni tramas intermedias → **TBD**.

---

## 7. Legendarios (6 + 1 evento)

| GDD | Tipo GDD | Nv. | Ubicación / requisito | → Real (sugerencia por rol) |
|---|---|---|---|---|
| **Metroño** | Acero/Fantasma | 50 | Estación Fantasma de Chamberí, de noche, post-liga + Llave Antigua. Movimiento exclusivo: Eco del Metro | TBD *(tren fantasma; cameo de intro: Gengar)* |
| **Orsón Regio** | Normal/Tierra | 55 | Cueva oculta de Casa de Campo; Campeón + Fuerza + Flash | **Snorlax** |
| **Cibeleona** | Agua/Hada | 60 | Fuente de Cibeles a medianoche; Campeón + haber vencido a Cibelia | TBD (sug.: Vaporeon / rol Articuno) |
| **Ursabón** | Siniestro/Tierra | 70 | Nivel más profundo de las Galerías; completar misión del padre; batalla tras vencer a Doña Constanza; reaparece si lo derrotas | TBD *(oso siniestro; rol equivalente a Mewtwo como boss post-liga)* |
| **Capitolium** | Psíquico/Volador | 70 | Cima del Cerro de los Ángeles; Pokédex 140/151 | TBD *(rol Mewtwo/Mew de completista)* |
| **Almudenauro** | Dragón/Hada | 75 | Torre de la Catedral de la Almudena; Pokédex 150/151 + domingo en el juego | TBD (sug.: Dragonite / rol de evento) |
| **Madroñero** | Planta/Tierra | — | Listado como legendario #147; sin evento de captura detallado en el GDD | TBD |

---

## 8. Sistema de transporte

1. **Caminando** — rutas y calles.
2. **Metro** — viaje instantáneo entre estaciones desbloqueadas; requiere **Pase de Metro**. Estaciones con azulejos blancos/azules y bancos de madera. (Estación Fantasma de Chamberí: cerrada, ver §3.3.)
3. **Vuelo** — tras obtener MO02, a cualquier Centro Pokémon visitado.
4. **Cercanías** — post-liga, desde Atocha a la Comunidad de Madrid (Alcalá de Henares, Aranjuez, El Escorial, Sierra de Guadarrama).

---

## 9. Pokédex (PARTE 8) — 151 especies con mapeo GDD → Gen 1

El GDD detalla los #001–#018 y los legendarios #146–#151; el resto figura como "..." (**TBD: #019–#145 no detallados en el GDD**, salvo las especies sueltas nombradas en gimnasios/zonas, listadas en §9.3).

### 9.1 Numeradas y detalladas

| # | GDD | Tipo GDD | Evolución GDD | → Real | Nota |
|---|---|---|---|---|---|
| 001 | Chulapón | Lucha | →002 (Nv.16) | **Bulbasaur** | Inicial (triángulo, ver SPEC §2.1) |
| 002 | Chulapón-Plus | Lucha | →003 (Nv.36) | **Ivysaur** | |
| 003 | Castizón | Lucha | final; mov. firma "Mantón Madrileño" | **Venusaur** | |
| 004 | Gatolegre | Normal/Fantasma | →005 (Nv.18) | **Charmander** (inicial) / **Meowth** (salvaje) | Doble mapeo, ver SPEC §2.1 |
| 005 | Miaupintura | Normal/Fantasma | →006 (Nv.38) | **Charmeleon** / **Persian** | |
| 006 | Felínoir | Normal/Fantasma | final; firma "Noche Malasañera" | **Charizard** / **Persian** | |
| 007 | Azulejín | Agua/Acero | →008 (Nv.18) | **Squirtle** | Inicial |
| 008 | Azulejón | Agua/Acero | →009 (Nv.36) | **Wartortle** | |
| 009 | Mayólicon | Agua/Acero | final; firma "Fuente de Cibeles" | **Blastoise** | |
| 010 | Ratamad | Normal | →011 (Nv.12) | **Rattata** | Rata urbana con boina |
| 011 | Ratucio | Normal | →012 (Nv.24) | **Raticate** | |
| 012 | Rotícano | Normal/Siniestro | final | TBD | Línea GDD de 3 etapas vs 2 reales — decisión: colapsar a 2 (Rattata→Raticate) |
| 013 | Pichoneta | Normal/Volador | →014 (Nv.14) | **Pidgey** | Paloma urbana |
| 014 | Palometa | Normal/Volador | →015 (Nv.28) | **Pidgeotto** | |
| 015 | Palomón | Normal/Volador | final | **Pidgeot** | |
| 016 | Perrucho | Normal | →017 (amistad) | **Growlithe** | Mandato cliente; tipo pasa a Fuego; alt. fiel: Eevee |
| 017 | Perrote | Normal/Lucha | →018 (amistad + Nv.32) | **Arcanine** (sug.) | Evolución real: Piedra Fuego |
| 018 | Perrón Leal | Normal/Lucha | final; habilidad "Lealtad" | TBD | 3ª etapa sin equivalente |
| 146 | Metroño | Acero/Fantasma | Legendario | TBD | |
| 147 | Madroñero | Planta/Tierra | Legendario | TBD | |
| 148 | Orsón Regio | Normal/Tierra | Legendario | **Snorlax** | |
| 149 | Cibeleona | Agua/Hada | Legendario | TBD | |
| 150 | Ursabón | Siniestro/Tierra | Legendario | TBD | |
| 151 | Capitolium | Psíquico/Volador | Legendario | TBD | |

### 9.2 Stats que da el GDD (referencia; con Pokémon reales se usan los oficiales)

| GDD | Stats Nv.100 (HP/Atk/Def/SpA/SpD/Spe) | Total |
|---|---|---|
| Chulapón | 70/95/70/45/65/85 | 430 |
| Gatolegre | 60/75/60/85/70/100 | 450 |
| Azulejín | 75/65/100/85/90/55 | 470 |
| Castizón | 80/115/85/65/70/95 | 510 |
| Felínoir | 65/85/60/105/70/115 | 500 |
| Mayólicon | 90/75/120/95/90/50 | 520 |
| Ratamad | 30/35/25/25/25/50 | 190 |
| Rotícano | 65/85/50/55/50/100 | 405 |
| Pichoneta | 35/30/30/35/35/50 | 215 |
| Palomón | 75/70/70/65/75/95 | 450 |
| Perrucho | 45/45/35/30/35/45 | 235 |
| Perrón Leal | 85/95/75/50/70/80 | 455 |

### 9.3 Especies nombradas sin número de dex (con pistas → mapeo)

| GDD | Pistas (tipo/diseño/contexto) | → Real |
|---|---|---|
| Libracho | At.Esp alto, criatura-libro, raro en rutas, Letras 35% | **Abra** (línea →Kadabra→Alakazam) |
| Rosalaño | Planta (rosal), jardines de Chamberí; evol. Planta/Hada en Alto Mando | **Oddish** (→Gloom→Vileplume) |
| Espectrillo | Fantasma, Estación Fantasma | **Gastly** (→Haunter) |
| Teatrín / Teatralis | Fantasma/Psíquico, teatro, nocturno | **Mr. Mime** (sugerido) |
| Notaní | Letras 15% (¿criatura musical/notas?) | TBD |
| Pincelit | Letras 10% (pincel/pintura) | TBD *(Smeargle es Gen 2)* |
| Churrito | Pokémon del Churrero José (churro) | TBD |
| Castañón | Normal con Síntesis (castaña/castañero); habilidad Siesta Madrileña | TBD (sug.: Exeggcute) |
| Farola-K | Eléctrico, farola metálica | **Magnemite** |
| Voltaploma | Eléctrico/Volador | TBD |
| Neoniko | Eléctrico (neón) | **Electabuzz** (sug.) |
| Espadachín / Espaderio | Lucha/Acero, espadas | **Hitmonlee** (sug.) / TBD |
| Piquerico | Lanza (pica) | TBD |
| Alabardón | Alabarda, Lucha | **Machamp** (sug.) |
| Cipresal | Planta (ciprés), evol. Planta/Fantasma | **Exeggutor** (sug.) / evol. TBD |
| Estanquera | Agua/Planta (estanque del Retiro) | TBD |
| Capotero | Fuego (capote, danza ígnea) | **Magmar** (sug.) |
| Taurín | Toro joven, Fuego físico | **Tauros** |
| Taurón Bravo | Fuego/Lucha, toro bravo | TBD (sug.: Arcanine) |
| Grafitón | Veneno (grafiti/lodo) | **Grimer→Muk** |
| Viniloz | Veneno/Volador (vinilo) | **Golbat** |
| Moviderón | Veneno (La Movida) | **Weezing** (sug.) |
| Teleportín | Psíquico, Teletransporte | **Abra/Kadabra** (colisión con Libracho — resolver al diseñar) |
| Torrezka | Psíquico (torre) | TBD |
| Cerebrium | Psíquico (cerebro) | **Alakazam/Hypno** (sug.) |
| Leoncibeles | Agua (león de Cibeles) | TBD |
| Carriagón | Agua (carro de Cibeles) | TBD (sug.: Slowbro) |
| Torrencial | Agua, tanque defensivo con Rayo Hielo | **Lapras** (sug.) |
| Rautín / Rautón / Ferrovía | Acero (raíl/ferroviario), Estación Fantasma | TBD (sug. línea Magnemite/Magneton; Onix) |
| Forjator | Acero/Fuego (forja) | TBD |
| Escudón | Acero (escudo) | TBD (sug.: Cloyster) |
| Oliverio | Planta (olivo) | TBD (sug.: Tangela) |
| Jazmínica | Planta/Hada (jazmín) | TBD (sug.: Victreebel) |
| Doñantasma | Fantasma (dama de mantilla) | **Gengar** (sug.) |
| Sombrión | Fantasma/Siniestro | TBD |
| Peregrynos / Caminathor / Dracoñol / Compostelon | Dragones del Camino de Santiago | Línea **Dratini/Dragonair/Dragonite** (sugerencias; Gen 1 solo tiene una línea dragón) |
| Cibeleón | Agua/Acero (equipo del Campeón; distinto de Cibeleona) | TBD |
| Coletón | Psíquico/Hada | **Mr. Mime** (sug.) |
| Ardillona | Ruta Victoria, árboles (ardilla) | TBD |
| Monumentón | Naturaleza Firme (monumento) | TBD (sug.: Golem) |
| Taxicar | Naturaleza Alegre (taxi) | TBD |
| Vagoneta | Habilidad Eco del Túnel (vagón de metro) | TBD |
| Flamencor | Habilidad Verbena (flamenco) | TBD |
| Ursabón | Legendario oso Siniestro/Tierra | TBD |

> Criterio de resolución de colisiones (varias criaturas GDD → un mismo Pokémon real): en fases futuras decidir por zona — el mapeo de la criatura más temprana/protagonista gana y la otra pasa a TBD o a otro Gen 1 cercano.

---

## 10. Mecánicas de mundo (fases futuras)

### 10.1 Naturalezas (25, Gen 3 — tabla parcial del GDD)

| Naturaleza | +10% | −10% | Criatura GDD que la favorece |
|---|---|---|---|
| Audaz (Adamant) | Ataque | At.Esp | Chulapón, Taurón Bravo |
| Modesta (Modest) | At.Esp | Ataque | Cibeleona, Libracho |
| Jovial (Jolly) | Velocidad | At.Esp | Gatolegre, Ratamad |
| Mansa (Calm) | Def.Esp | Ataque | Azulejín, Rosalaño |
| Firme (Bold) | Defensa | Ataque | Metroño, Monumentón |
| Osada (Brave) | Ataque | Velocidad | Orsón Regio, Ursabón |
| Alegre (Hasty) | Velocidad | Defensa | Pichoneta, Taxicar |
| *(las 18 restantes: estándar Gen 3, el GDD las omite con "...")* | | | |

### 10.2 Habilidades exclusivas de Madrid (7)

| Habilidad | Efecto | Portadores GDD |
|---|---|---|
| Espíritu Castizo | +30% poder mov. Lucha si PS < 50% | Chulapón, Castizón |
| Eco del Túnel | Movimientos de sonido ×1.5 en interiores | Metroño, Vagoneta |
| Piel de Azulejo | −25% daño Fuego/Agua | Azulejín, Mayólicon |
| Aura Capitalina | +10% todas las stats si es el último Pokémon | Capitolium |
| Siesta Madrileña | Cura 1/16 PS por turno entre 14:00–17:00 | Perrucho, Castañón |
| Leyenda Urbana | Inmune a movimientos tipo Normal | Ursabón, Metroño |
| Verbena | Estado "Festivo" al entrar (sube Velocidad) | Flamencor, Chulapón |

### 10.3 Sistemas adaptados de Esmeralda

- **Combates dobles**: gimnasio Gran Vía (combate final), gimnasio Cibeles (todos), Battle Tower de Azca, entrenadores especiales en rutas.
- **Pokémon siguiéndote** (estilo HGSS): primer miembro del equipo en overworld (32×32), reacciones contextuales (felices en el Retiro, incómodos en zonas industriales).
- **Pisos Secretos** (= Bases Secretas): carteles "SE ALQUILA", movimiento "Llave Maestra", piso de 12×8 tiles, muebles castizos (mesa camilla, póster del Atleti/Real Madrid…), visitas de NPCs y de otros jugadores.
- **Certámenes de San Isidro** (= Concursos), en Las Ventas, post 4ª medalla. Categorías: Solera (Belleza), Salero (Gracia), Temple (Dureza), Brío (Carisma), Arte (Ingenio). Fases: Pasarela + Exhibición. Premios: cintas, objetos raros, áreas.
- **MadriNav** (= PokéNav): Mapa, Pokédex, Match Call (revanchas), Pokémon Check (stats/EVs), Agenda Verbenas (eventos), Radio Madrid (música y pistas).
- **Sistema de tapeo** (Bar El Tetuán): tapas → felicidad. **Tertulia** (Café del Modernismo): preguntas culturales → MTs raras.

---

## 11. Post-juego (PARTE 7)

1. **Parque Móvil del Estado** (Tetuán): misión del padre — diario de Arturo, LLAVE DE LAS GALERÍAS.
2. **Galerías del Viaje del Agua**: mazmorra final, 5 niveles, salvajes Nv. 60–70, puzzles de agua, Equipo Vandalia, boss Doña Constanza + Ursabón.
3. **Cerro de los Ángeles**: Capitolium (70) y Almudenauro (75, solo domingos). Acceso por Cercanías desde Atocha.
4. **Comunidad de Madrid** (Cercanías): Alcalá de Henares (Pokémon literarios), Aranjuez (jardín), El Escorial (históricos), Sierra de Guadarrama (montaña/nieve).
5. **Battle Tower de Azca**: 7 combates seguidos, Nv. 50 ajustado, sin curación; Puntos de Batalla → MTs y objetos.
6. **Safari Zone: Faunia**: 500₧, 30 Safari Balls, 500 pasos; zonas Polar/Jungla/Sabana/Nocturna; especies exclusivas (TBD — no listadas en el GDD).

---

## 12. Audio (PARTE 9, resumen)

Especificación GBA de referencia: 6 canales (2 PCM 8-bit 22.050 Hz + 4 PSG). Para web: pistas estilo chiptune 16-bit que respeten estos briefs.

### Temas de zona y sistema

| Tema | Estilo | Tempo | Apuntes de instrumentación |
|---|---|---|---|
| Título | Pasodoble orquestal épico + electrónica | 120 BPM | Trompetas, guitarra española, castañuelas; loop 1:30 (intro→tema A→puente guitarra→clímax) |
| Tetuán | Acogedor, nostálgico ("tarde de domingo") | 95 | Acordeón, guitarra acústica, palmas sutiles |
| Barrio de las Letras | Jazz suave de café literario | 85 | Piano, contrabajo walking, escobillas, clarinete |
| Gran Vía | Synthwave años 80 (La Movida) | 128 | Sintes en capas, bajo pulsante, batería electrónica |
| Palacio Real | Barroco marcial | 100 | Órgano, trompetas barrocas, timbales |
| Retiro | Pastoral relajante | 70 | Flauta, arpa, cuerdas, pájaros |
| Las Ventas | Pasodoble taurino intenso | 140 | Fanfarria, caja redoblante, rasgueo flamenco |
| Malasaña | Punk rock | 160 | Powerchords, bajo punk, coros gritados |
| Cuatro Torres | Electrónica ambiental futurista | 100 | Pads etéreos, arpegiadores, bajo profundo |
| Cibeles | Épico divino | 90 | Coro sintetizado, cuerdas, arpa, samples de agua |
| Batalla (entrenador) | Energético | 150 | Intro 4 compases de tensión, verso 8, estribillo 8, loop |
| Batalla (líder) | Épico, motivo propio por líder | 145 | Intro dramático, cambios de ritmo |
| Batalla (Pablo rival) | Competitivo-amistoso | 155 | Dos melodías entrelazadas, citas al tema de Tetuán |
| Batalla (Alto Mando) | Grandioso, intimidante | 140 | Orquestación completa + coro |
| Batalla (Campeón Pablo) | Épico definitivo, emocional | 165 | Cita todos los temas; silencio dramático antes del clímax; coro triunfal |

### Fanfarrias y jingles

Victoria salvaje 3 s · victoria entrenador 5 s · captura 4 s (melodía ascendente + pokébola) · evolución 10 s (crescendo) · movimiento aprendido 2 s · objeto importante 5 s · medalla 8 s (con eco) · curación 3 s.

### Cries de ejemplo (especificados por el GDD)

| Criatura | Base | Carácter | Duración |
|---|---|---|---|
| Chulapón | G3 (196 Hz) | Subida rápida, "¡OLE!" comprimido | 0,5 s |
| Gatolegre | A4 (440 Hz) | Vibrato descendente, maullido fantasmal | 0,7 s |
| Azulejín | C4 (262 Hz) | Eco/reverb, gota + cerámica | 0,6 s |
| Metroño | F3 (175 Hz) | Eco metálico, tren en túnel + campana | 1,0 s |
| Ursabón | C2 (65 Hz) | Rugido profundo, terremoto + oso | 1,5 s |

> Con Pokémon reales se usan los **cries oficiales de Gen 1/3**; esta tabla queda como referencia de diseño sonoro ambiente.

---

## 13. Inconsistencias y huecos detectados en el GDD (registro)

1. **Numeración de rutas** contradictoria (Ruta 1 vs Ruta 2 Tetuán↔Chamberí) — resuelto en SPEC-MVP: Ruta 2.
2. **Cibeleona vs Cibeleón**: la líder Cibelia usa una "Cibeleona" Nv. 56 que también figura como legendario #149 (Nv. 60 en evento), y el Campeón usa un "Cibeleón" Agua/Acero distinto. Sin aclarar → TBD.
3. **Metroño** aparece como legendario #146, como "forma menor" salvaje (Estación Fantasma 5%) y en equipos de Abuelo Ramón y Don Arturo (Alto Mando). El GDD lo admite ("¡sí, tiene un Metroño!") pero no explica las formas → TBD.
4. **Madroñero**: legendario #147 sin evento de captura, pero presente en equipos de Carmencita y Pablo.
5. Medallas 4–7 sin efecto de obediencia/MO especificado.
6. Pokédex #019–#145 sin detallar (el propio GDD lo corta con "...").
7. Equipo Vandalia sin tramas ni miembros intermedios definidos.
8. Distritos 12–21 sin nombrar.
