# Recursos del proyecto

Registro de recursos que pasa Marcelino + cómo se usan.

## 1. PokémonDB — Sprites (2026-06-10)

- **URL**: https://pokemondb.net/sprites
- **Qué hay**: sprites oficiales de todos los Pokémon por generación y juego. Para estilo Rojo Fuego interesan los de **Gen 3 — FireRed/LeafGreen** (battlers frontal/trasero, normal y shiny) y los iconos de menú.
- **Cómo usarlo**: las URLs de sprite siguen el patrón
  `https://img.pokemondb.net/sprites/firered-leafgreen/normal/<nombre>.png`
  (también `/back/`, `/shiny/`). Script de descarga batch pendiente en `scripts/fetch_sprites.py`.
- **Ojo licencia**: assets de Nintendo/Game Freak → proyecto fan no comercial, repo privado.

## 2. Gracidea — mapa-mundo Pokémon 2D (2026-06-10)

- **URL**: https://github.com/lowlighter/gracidea
- **Clonado en**: `resources-inbox/gracidea/` (shallow, 13 MB)
- **Qué es**: proyecto artístico open-source (AGPL-3.0) que mapea el mundo Pokémon en un mapa web vivo. NO es un juego (rechazan mecánicas de juego explícitamente) — es un visor/renderer de mapas.
- **Qué nos interesa a priori**:
  - `copyrighted/textures/` → tilesets estilo GBA para construir los mapas de Madrid.
  - `maps/` → mapas en formato **Tiled** (`gracidea.world`, región Hoenn) = pipeline de mapeado probado.
  - `app/` → renderer web de tiles (referencia de arquitectura, no necesariamente base del juego).
- **Licencia**: código AGPL-3.0 (si reutilizamos código y servimos por red, obligación de publicar fuente); sprites = copyright The Pokémon Company (mismo caso que PokémonDB).
- **Análisis completo**: ver `ANALISIS-gracidea.md`.
