# 🎮 Pokémon Madrid — Edición Castiza

Un **juego completo estilo Pokémon Rojo Fuego (GBA)**, ambientado en Madrid y protagonizado
por un grupo de amigos reales, **construido casi en su totalidad por IA a partir de un prompt**
(Claude Code · Opus 4.8 + ultracode, con Gemini para el arte). Dirección humana por Telegram.

🕹️ **Juégalo:** https://pokemon-madrid.stratomai.com

![Pantalla de título — Pokémon Madrid, Edición Castiza](docs/screenshots/01-titulo.jpg)

> Hecho por **Stratoma AI**. Abajo tienes el paso a paso para montar tu propia infraestructura
> y crear cosas así (incluido un VPS de Hetzner con enlace de referido).

---

## ✨ Qué es

- **Motor**: Phaser 3 + Vite. Lienzo 240×160 estilo GBA, pixel-art, carcasa Game Boy Advance SP
  a pantalla completa con controles táctiles.
- **Contenido**: mapa de Madrid (Tetuán, Chamberí, Gran Vía, El Retiro…), **8 gimnasios + Liga**,
  combate por turnos FRLG (tipos, estados, EXP, evoluciones, captura), diálogos con retrato y
  nombre, tienda, Centro Pokémon, moto, música y efectos.
- **Cuentas**: registro/login con Supabase (self-hosted), guardado en la nube y modo invitado.

## 📸 Capturas

| | |
|---|---|
| ![Diálogo con retrato y nombre](docs/screenshots/02-dialogo-alvaro.jpg) | ![Combate de entrenador](docs/screenshots/04-combate.jpg) |
| *Diálogos con retrato + nombre, texto bitmap nítido* | *Combate por turnos estilo FRLG* |
| ![Tienda](docs/screenshots/05-tienda.jpg) | ![Quiosco](docs/screenshots/06-quiosco.jpg) |
| *Tienda con compra, cantidad y dinero* | *NPCs y carteles con personalidad castiza* |

---

## 🚀 Móntalo tú — paso a paso

Dos caminos: un **VPS** (recomendado, para tenerlo online 24/7) o **en local** (en tu ordenador).

### Opción A — VPS en Hetzner (online, recomendado)

1. **Crea tu cuenta de Hetzner Cloud con este enlace de referido** (te llevas **€20 de crédito** gratis):
   **👉 https://console.hetzner.com/refer?pk_content=lbEMCsnlJ2EP**
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

## 🛠️ Cómo se construyó (desde un prompt)

Todo el desarrollo —código, arte, audio, despliegue, testing— lo llevó a cabo una IA orquestando
herramientas, con dirección humana por Telegram. El detalle completo (herramientas, flujo,
flotas multi-agente, generación de arte con Gemini, pipeline de assets, testing E2E) está en
**[TUTORIAL.md](TUTORIAL.md)** — incluida la sección *"Cómo replicarlo con tus amigos"*.

Resumen: primer prompt con **Fable 5.0** (arranque) → desarrollo continuo con **Claude Opus 4.8 +
ultracode**, despliegue en **Coolify**, verificación con **Playwright**.

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

(Los tilesets, sprites y la fuente estilo FRLG derivan de material de **Nintendo / Game Freak**;
los personajes y el lore son originales. Ver nota legal.)

---

## ⚖️ Nota legal

Proyecto **fan-game NO comercial**, con fines personales y de aprendizaje. Los assets de estilo
FRLG son propiedad de **Nintendo / Game Freak**; "Pokémon" es marca de Nintendo. No afiliado ni
respaldado por Nintendo. No redistribuir con fines comerciales. El audio incluido es CC0.

---

*Construido con Claude Code (Opus 4.8 + ultracode), Gemini, Phaser, Vite, Coolify y Playwright.
— [Stratoma AI](https://stratomai.com)*
