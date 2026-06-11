# 🎮 Pokémon Madrid — Edición Castiza

Un **juego completo estilo Pokémon Rojo Fuego (GBA)**, ambientado en Madrid y protagonizado
por un grupo de amigos reales, **construido casi en su totalidad por IA a partir de un prompt**.
Toda la dirección se dio **por Telegram**; el código, el arte, el audio, el despliegue y el
testing los ejecutó una IA orquestando herramientas.

🕹️ **Juégalo ya (sin instalar nada):** https://pokemon-madrid.stratomai.com

![Pantalla de título — Pokémon Madrid, Edición Castiza](docs/screenshots/01-titulo.jpg)

> Este README **es el tutorial completo**: explica el prompt original, TODAS las herramientas
> y el proceso para que cualquiera pueda entender (o replicar) cómo se hace un videojuego
> jugable partiendo de una frase escrita a un modelo de Claude. Hecho por **Stratoma AI**.

---

## 📑 Índice

1. [Qué es](#-qué-es)
2. [El prompt original (PRD)](#-el-prompt-original-prd--cómo-empezó-todo)
3. [Capturas](#-capturas)
4. [Cómo se construyó (en profundidad)](#-cómo-se-construyó-en-profundidad)
5. [Generación de arte GRATIS con Gemini CLI](#-generación-de-arte-gratis-con-gemini-cli)
6. [Pipeline de assets](#-pipeline-de-assets-estilo-frlg-auténtico)
7. [Qué tiene el juego](#-qué-tiene-el-juego)
8. [Stack técnico](#-stack-técnico)
9. [Móntalo tú — paso a paso](#-móntalo-tú--paso-a-paso)
10. [Cómo replicarlo con tus amigos](#-cómo-replicarlo-con-tus-amigos-el-workflow-colaborativo)
11. [Estructura del repo](#-estructura-del-repo)
12. [Créditos y fuentes](#-créditos-y-fuentes-de-assets)
13. [Nota legal](#-nota-legal)

---

## ✨ Qué es

- **Motor**: Phaser 3 + Vite. Lienzo 240×160 estilo GBA, pixel-art, carcasa Game Boy Advance SP
  a pantalla completa con controles táctiles.
- **Contenido**: mapa de Madrid (Tetuán, Chamberí, Gran Vía, El Retiro…), **8 gimnasios + Liga**,
  combate por turnos FRLG (tipos, estados, EXP, evoluciones, captura), diálogos con retrato y
  nombre, tienda, Centro Pokémon, moto, música y efectos.
- **Cuentas**: registro/login con Supabase (self-hosted), guardado en la nube y modo invitado.
- **~8.000 líneas** de JavaScript en 7 escenas + 5 módulos de mundo, más datos (pokédex,
  movimientos, mapas).

---

## 📝 El prompt original (PRD) — cómo empezó todo

Todo arrancó con **un único documento**: un **PRD (Product Requirements Document) completo**
que Marcelino le pidió a la **app de Claude** ("dame un PRD completo de lo que quiero"). Ese
documento describe con detalle la visión: estilo GBA/Esmeralda, paleta de colores de Madrid,
mecánicas, personajes, distritos, tono castizo… y es lo que se le pasó al agente para que
empezara a construir.

📄 **Consulta el prompt/PRD EXACTO usado para desarrollar el juego:**
- **Documento original (Google Docs):** <https://docs.google.com/document/d/1AwDFE1IMSjTm5o2NuZNNi3tST9MO7dXfkd1lwQq45xE/edit>
- **Copia en este repo:** [`docs/PROMPT-PRD.md`](docs/PROMPT-PRD.md)

> 💡 **La clave:** no hace falta saber programar para arrancar algo así. Hace falta saber
> **describir muy bien lo que quieres** (un buen PRD) y dejar que el agente lo construya,
> guiándolo e iterando. El PRD lo generó la propia IA (app de Claude) a partir de la idea.

---

## 📸 Capturas

Corriendo en una carcasa **Game Boy Advance SP** a pantalla completa con controles táctiles
(capturas reales desde el móvil):

| | |
|---|---|
| ![Diálogo con retrato y nombre](docs/screenshots/02-dialogo-alvaro.jpg) | ![Diálogo de Iván](docs/screenshots/03-dialogo-ivan.jpg) |
| *Diálogos con retrato + nombre, texto bitmap nítido* | *Cada amigo tiene su ficha y su voz* |
| ![Combate de entrenador](docs/screenshots/04-combate.jpg) | ![Tienda](docs/screenshots/05-tienda.jpg) |
| *Combate por turnos estilo FRLG con retrato del rival* | *Tienda con compra, cantidad y dinero* |
| ![Quiosco](docs/screenshots/06-quiosco.jpg) | |
| *NPCs y carteles con personalidad castiza* | |

---

## 🧠 Cómo se construyó (en profundidad)

### Dos modelos, dos fases

| Fase | Modelo | Para qué |
|------|--------|----------|
| **Prompt inicial** | **Fable 5.0** | El primer prompt que arrancó TODO el desarrollo (esqueleto, primeras escenas). |
| **Desarrollo continuo** | **Claude Opus 4.8 + ultracode** | Toda la construcción posterior: motor, combate, mapa, arte, audio, gimnasios, despliegue, QA. |

La clave: **no es un único prompt mágico**, sino un **bucle de desarrollo autónomo** donde el
modelo planifica, implementa, prueba, despliega y reporta — y se auto-corrige.

### 1. Claude Code (el orquestador)

La CLI de agente de Claude. Es quien lee la dirección del humano (por Telegram), planifica,
escribe el código, ejecuta comandos en la terminal, lanza subagentes y despliega. Corre con
**Opus 4.8** y **ultracode** (orquestación multi-agente determinista mediante "workflows").

### 2. Bucle de desarrollo autónomo (cron nocturno)

Una tarea programada (cada ~30 min) le dice al agente: *"elige la siguiente mejora pendiente,
impleméntala, build, prueba E2E, despliega y avisa"*. Así el juego **avanza solo durante horas**
mientras Marcelino duerme. Filosofía estilo **"Ralph Wiggum"**: itera, prueba y se auto-corrige
hasta que la verificación (screenshot/log/E2E) pasa.

### 3. Workflows multi-agente (flotas de subagentes)

Para tareas grandes y paralelizables, el orquestador despliega **flotas de subagentes**, cada
uno en una fuente/categoría distinta, sin pisarse. Ejemplos reales de este proyecto:

- Una flota de **13 agentes** minando recursos gráficos (Graphics Library, pret, Godot, fan-art)
  → produjo un plan de mejora visual priorizado.
- Un agente que integró **sprites propios de los 12 personajes** (reskins FRLG en el atlas).
- Un agente que integró la **UI de combate FRLG** (cajas de vida, fondos).
- Agentes de **limpieza de retratos** (de-fringe, chroma-key).

### 4. El loop completo de cada mejora

```
dirección del humano (Telegram: texto / fotos / audios)
        ↓
planificar → implementar (código + assets) → npm run build
        ↓
E2E Playwright (¿sigue jugable? ¿0 errores?)  ──no──> arreglar y repetir
        ↓ sí
commit + push  →  Coolify construye y despliega
        ↓
verificar en vivo (hash del bundle + captura)
        ↓
reportar al humano por Telegram
```

---

## 🎨 Generación de arte GRATIS con Gemini CLI

Los **sprites y retratos de los personajes se generan automáticamente** con **Gemini CLI
conectado en la terminal** (modo *image-to-image*). Como Gemini CLI corre desde la terminal,
**la generación de todas las imágenes sale GRATIS** — no se paga por imagen.

- Modelo: `gemini-2.5-flash-image`, en modo *image-to-image* a partir de una foto de referencia
  del grupo (esa foto **no se incluye en el repo por privacidad**).
- Dos estilos por personaje: **pixel-art** (sprite overworld) y **anime** (retrato de combate).
- Postprocesado en Python (Pillow): recorte por *aspect-ratio* para descartar resultados malos
  y **chroma-key por flood-fill** desde los bordes para fondo transparente sin tocar los blancos
  interiores.

> Resultado: un pipeline de arte de personajes **a coste ~0**, dirigido por prompts desde la
> misma terminal donde vive el agente.

---

## 🧩 Pipeline de assets (estilo FRLG auténtico)

- **Tilesets** estilo Pokémon Rojo Fuego/Verde Hoja reempaquetados a un atlas 16×16 de 127
  columnas (`frame = fila*127 + col`).
- **Sprites overworld** reskineados desde plantillas de [pret/pokefirered](https://github.com/pret/pokefirered),
  con corte/reempaquetado del orden de frames de pret al grid del motor.
- **Fuente BITMAP** (`frlg16` / `frlg10`): la tipografía GBA de FRLG rasterizada a 1-bit sin
  *antialiasing* → texto **pixel-perfect y nítido** en móvil (BitmapText, no canvas Text).
- **Audio**: pistas chiptune **CC0** (dominio público) cargadas de forma síncrona por un
  `AudioManager` propio.

---

## 🕹️ Qué tiene el juego

- Mapa de Madrid (Tetuán, Chamberí, Gran Vía, El Retiro…) con interiores entrables.
- **8 gimnasios** (los amigos como líderes) + sistema de medallas + Liga.
- Combate por turnos estilo FRLG: tipos, estados, EXP, evoluciones, captura.
- Diálogos con **retrato + nombre** del personaje que habla, texto paginado y legible.
- Hierba alta con encuentros, entrenadores con personalidad, tienda, Centro Pokémon, moto.
- Carcasa **Game Boy Advance SP** a pantalla completa con controles táctiles.
- Cuentas (registro/login Supabase), **guardado en la nube** y modo invitado.
- Música y efectos de sonido.

---

## 🛠️ Stack técnico

| Capa | Tecnología |
|------|------------|
| **Motor** | [Phaser 3.90](https://phaser.io) (canvas 240×160, `pixelArt`, escala FIT) |
| **Build** | [Vite](https://vitejs.dev) |
| **Arte** | Gemini CLI (image-to-image, gratis) + Python/Pillow + tilesets pret |
| **Audio** | chiptune CC0 + `AudioManager` propio |
| **Backend** | [Supabase](https://supabase.com) self-hosted (auth + guardado) |
| **Despliegue** | [Coolify](https://coolify.io) → `Dockerfile` que sirve con `nginx:alpine` |
| **Testing** | [Playwright](https://playwright.dev) (E2E de jugabilidad + capturas) |
| **Orquestación** | Claude Code (Opus 4.8 + ultracode) + Gemini CLI, dirigido por Telegram |

---

## 🚀 Móntalo tú — paso a paso

Dos caminos: un **VPS** (recomendado, para tenerlo online 24/7) o **en local** (en tu ordenador).

### Opción A — VPS en Hetzner (online, recomendado)

1. **Crea tu cuenta de Hetzner Cloud con este enlace de referido** (te llevas **€20 de crédito** gratis):
   **👉 https://hetzner.cloud/?ref=lbEMCsnlJ2EP**
2. Crea un servidor (un CX22/CPX11 vale de sobra para empezar; Ubuntu 24.04).
3. Instala **[Coolify](https://coolify.io)** (PaaS self-hosted, un solo comando):
   ```bash
   curl -fsSL https://cdn.coollabs.io/coolify/install.sh | bash
   ```
4. En Coolify: conecta este repositorio → nuevo proyecto → tipo **Dockerfile** → deploy.
   El `Dockerfile` construye con Vite y sirve con `nginx:alpine`.
5. Apunta tu dominio (o usa un `.sslip.io`) y listo: tu juego online.

> Esta misma infraestructura (Hetzner + Coolify + Supabase self-hosted) es la base del stack de
> **Stratoma AI** — la misma sobre la que corre este juego.

### Opción B — En local (tu ordenador)

Requisitos: [Node.js](https://nodejs.org) 18+.

```bash
git clone https://github.com/DoubleN96/pokemon-madrid.git
cd pokemon-madrid
npm install
npm run dev                 # desarrollo (http://localhost:5173)
npm run build               # build de producción a dist/
node tests/e2e/piso.mjs http://localhost:5173   # prueba de jugabilidad (Playwright)
```

(El login/guardado en la nube necesita un Supabase; copia `.env.example` a `.env` y pon tu
`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`. Sin eso, el modo invitado guarda en local.)

---

## 🤝 Cómo replicarlo con tus amigos (el workflow colaborativo)

La forma recomendada de hacer un juego así **no es un único prompt mágico**, sino un
**bucle colaborativo** donde tus amigos aportan contexto y la IA construye:

1. **Crea una sesión de Claude Code** en una carpeta dedicada (p. ej. `juego-pokemon`) y
   láncala con el **canal de Telegram activado** Y en **modo autónomo** (que pueda actuar sin
   pedirte confirmación a cada paso), dentro de un `tmux` para que sobreviva a desconexiones:
   ```bash
   claude --channels plugin:telegram@claude-plugins-official --dangerously-skip-permissions
   ```
2. **Crea un bot con BotFather** y da acceso a todos tus amigos en su `access.json`.
3. **Tus amigos suben al chat** fotos, vídeos, audios y anécdotas — todo el contexto que
   quieran. La terminal lo **lee y transcribe los audios automáticamente**, alimentando cada
   vez más contexto al juego.
4. La IA **propone el elenco de personajes, la historia y las rutas** a partir de ese contexto.
   **Tú lo apruebas** o lo corriges.
5. La IA **desarrolla el juego paso a paso**, guiándote: implementa, despliega y te enseña
   **capturas** para que valides, con los assets y repos de referencia.

Resultado: el contexto —y el juego— crece de forma casi **infinita**, porque cada foto, audio
o anécdota nueva lo enriquece. Así se construyó este: con el grupo de amigos mandando material
por Telegram y el agente integrándolo en tiempo real.

---

## 📂 Estructura del repo

```
src/
  scenes/      Boot, Title, Intro, World, Battle, Menu, Dialog
  world/       maps, gyms, interiors, areaExtra, engine/ (renderer, GridMover, Npc…)
  core/        battle, monster, formulas (motor puro, testeable)
  ui/          theme (estética GBA), battle/ (databoxes, menús, typewriter), shop
  audio/       AudioManager
  data/        pokedex.json, moves.json, portraits.js
public/assets/ tilesets, sprites/chars (atlas), portraits, audio, ui/battle
tests/e2e/     piso.mjs (jugabilidad), world.mjs, capturas
docs/          PROMPT-PRD.md (el prompt original), GDD, specs, planes, research
```

---

## 📚 Créditos y fuentes de assets

Este es un **fan-game** y se apoya en recursos de la comunidad. Gracias a:

| Fuente | Para qué |
|--------|----------|
| [pret/pokefirered](https://github.com/pret/pokefirered) | Decompilación de FRLG: tilesets, sprites overworld, UI de combate, fuente, sprite de bici |
| [PokéAPI](https://pokeapi.co) | Datos de Pokémon (especies, movimientos, tipos) |
| [PokémonDB Sprites](https://pokemondb.net/sprites) | Sprites de Pokémon por generación (Gen 3 = FRLG) |
| [Maruno17/pokemon-essentials](https://github.com/Maruno17/pokemon-essentials) | Referencia de mecánicas y datos |
| [Phaser](https://phaser.io) · [Vite](https://vitejs.dev) | Motor de juego y build |
| [Coolify](https://coolify.io) · [Supabase](https://supabase.com) | Despliegue self-hosted, auth y base de datos |
| Gemini CLI | Generación de sprites/retratos (image-to-image, gratis desde terminal) |

(Los tilesets, sprites y la fuente estilo FRLG derivan de material de **Nintendo / Game Freak**;
los personajes y el lore son originales. Ver nota legal.)

---

## ⚖️ Nota legal

Proyecto **fan-game NO comercial**, con fines personales y de aprendizaje. Los assets de estilo
FRLG son propiedad de **Nintendo / Game Freak**; "Pokémon" es marca de Nintendo. No afiliado ni
respaldado por Nintendo. No redistribuir con fines comerciales. El audio incluido es CC0.

---

*Construido con Claude Code (Opus 4.8 + ultracode), Gemini CLI, Phaser, Vite, Coolify y Playwright.
Dirección humana por Telegram. — [Stratoma AI](https://stratomai.com)*
