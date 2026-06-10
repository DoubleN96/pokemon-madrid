# Pokémon Madrid

Juego estilo **Pokémon Rojo Fuego (GBA)** — RPG top-down 2D con combates por turnos, ambientado en Madrid.

> Proyecto Stratoma AI · Repo privado · Estado: **bootstrap** (esperando recursos)

## Visión

- Look & feel fiel a FireRed/LeafGreen: tiles 16×16, resolución base 240×160 (GBA), paleta y UI clásicas.
- Mundo propio: Madrid como región (barrios = pueblos/ciudades, Metro = cuevas/rutas subterráneas, Retiro = bosque...).
- Mecánicas núcleo: exploración con grid-movement, encuentros, combate por turnos, equipo de 6, captura, inventario, NPCs y diálogos.

## Estructura

```
pokemon-madrid/
├── docs/              # PRD, diseño de región, mecánicas, decisiones
├── assets/
│   ├── sprites/       # Personajes, overworld, battlers
│   ├── tilesets/      # Tiles de mapas estilo GBA
│   ├── maps/          # Mapas (Tiled .tmx o JSON)
│   ├── audio/         # Música y SFX
│   └── ui/            # Cajas de diálogo, menús, fuentes
├── src/               # Código del juego
├── scripts/           # Tooling (descarga de sprites, conversores, etc.)
└── resources-inbox/   # Recursos sin procesar que va pasando Marcelino
```

## Controles

**Teclado** (escritorio): flechas/WASD mover · `Z`/Espacio = A (confirmar/interactuar) · `X`/Shift = B (cancelar/correr) · `Enter` = menú.

**Táctil** (móvil): aparecen automáticamente en pantalla — D-pad (mantener para andar), botón **A**, botón **B** y **START** (menú). Se ocultan al escribir en los formularios de login/nombre.

## Recursos

| Recurso | URL | Uso |
|---------|-----|-----|
| PokémonDB Sprites | https://pokemondb.net/sprites | Sprites oficiales por generación (FireRed/LeafGreen = Gen 3) |

## Motor

Pendiente de decidir según recursos (candidatos: HTML5/Canvas puro, Phaser 3, o decomp ROM hack `pokefirered`). Se documentará en `docs/ADR-001-motor.md`.
