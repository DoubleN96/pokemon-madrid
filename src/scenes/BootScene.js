import Phaser from 'phaser';
import pokedex from '../data/pokedex.json';
import movesData from '../data/moves.json';
import { PORTRAIT_IDS } from '../data/portraits.js';

// Cache-bust para texturas de public/ que se han cambiado/añadido y que el
// navegador (sobre todo móvil) podría estar sirviendo en versión cacheada vieja:
// el atlas de personajes `chars` (npcs.webp) y la UI de combate FRLG (databoxes,
// barras, fondos). Subir este número fuerza una recarga limpia en clientes.
const ASSET_VER = '2';
const v = (url) => `${url}?v=${ASSET_VER}`;

// Carga global de assets. Los sprites de batalla se cargan bajo demanda en BattleScene
// (front/back por id), pero los iconos y atlas de personajes se cargan aquí.
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = this.add.rectangle(120, 84, 0, 6, 0xffcb05).setOrigin(0, 0.5);
    this.add.text(120, 64, 'POKÉMON MADRID', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    bar.x = 60;
    this.load.on('progress', (v) => { bar.width = 120 * v; });

    // Tileset overworld Gen 3 (16x16, reempaquetado a 127 columnas sin margen)
    this.load.spritesheet('tiles', 'assets/tilesets/rse-tileset.png', { frameWidth: 16, frameHeight: 16 });
    // Atlas de personajes (jugador + NPCs, formato TexturePacker). Cache-bust ?v=
    // en ambas URLs para que el móvil no sirva el npcs.webp viejo cacheado.
    this.load.atlas('chars', v('assets/sprites/chars/npcs.webp'), v('assets/sprites/chars/npcs.json'));

    // UI de combate FRLG en PNG (FASE A3/A4). Databoxes con cola, barras de PS por
    // color y fondos de combate pixel-perfect. Marcos (cream + borde verde + cola)
    // ya recortados a su tamaño real; el relleno de PS y la barra EXP se superponen.
    this.load.image('battle_box_player', v('assets/ui/battle/healthbox_player.png'));     // 112x32
    this.load.image('battle_box_enemy', v('assets/ui/battle/healthbox_opponent.png'));    // 104x32
    this.load.image('hpbar_green', v('assets/ui/battle/hpbar_green.png'));                // 48x8
    this.load.image('hpbar_yellow', v('assets/ui/battle/hpbar_yellow.png'));              // 48x8
    this.load.image('hpbar_red', v('assets/ui/battle/hpbar_red.png'));                    // 48x8
    // Fondos de combate FRLG (256x112). building = calle (por defecto), grass = parque.
    this.load.image('battlebg_building', v('assets/ui/battle/battlebg_building.png'));
    this.load.image('battlebg_grass', v('assets/ui/battle/battlebg_grass.png'));
    this.load.image('battlebg_indoor', v('assets/ui/battle/battlebg_indoor.png'));

    // Retratos de los personajes de Pokémon Piso (IA, fondo transparente), para diálogos/combates.
    // Hay 2 estilos: pixel (base) y ANIME (alta calidad, prioritario si existe). Los misses
    // de carga son inofensivos (loaderror silencioso); se prefiere anime en runtime si cargó.
    this.load.on('loaderror', () => {}); // silencia retratos anime aún no generados
    for (const id of PORTRAIT_IDS) {
      this.load.image(`portrait_${id}`, `assets/portraits/${id}.png`);          // cuerpo entero pixel
      this.load.image(`portrait_${id}_bust`, `assets/portraits/${id}_bust.png`); // cara+pecho pixel
      this.load.image(`portrait_${id}_anime`, `assets/portraits/anime/${id}.png`);          // anime cuerpo
      this.load.image(`portrait_${id}_anime_bust`, `assets/portraits/anime/${id}_bust.png`); // anime busto
    }

    // Audio (música chiptune CC0 + SFX). Carga SÍNCRONA aquí en preload con las
    // rutas CORRECTAS (assets/audio/<key>.mp3). El método anterior (manifest async
    // vía preloadAudio) NO funcionaba por DOS motivos: (1) Phaser 3 no tiene
    // loader.pause/resume, así que el audio se encolaba DESPUÉS de que el loader
    // completara y nunca llegaba a la caché; (2) el manifest apuntaba a 'audio/X.mp3'
    // pero los ficheros están en 'assets/audio/X.mp3' y el fallback SPA servía
    // index.html con 200 → Phaser no podía decodificarlo. Resultado: no sonaba NADA.
    // Lista fija de claves = carga fiable y sincrónica con el resto de assets.
    const AUDIO_KEYS = [
      'title', 'overworld', 'town', 'battle_wild', 'battle_trainer', 'victory',
      'select', 'cancel', 'bump', 'door', 'heal', 'levelup', 'hit',
    ];
    for (const k of AUDIO_KEYS) this.load.audio(k, `assets/audio/${k}.mp3`);
  }

  create() {
    // Datos al registry global
    this.registry.set('pokedex', pokedex);
    this.registry.set('movesData', movesData);

    // Animaciones de andar del jugador y NPCs usados (3 frames por dirección, ping-pong).
    // Incluye los 12 personajes de Pokémon Piso con sprite overworld propio (FASE A1).
    const walkChars = [
      // personajes propios (Piso) — sprites reskineados FRLG en el atlas chars
      'marcelino', 'alvaro_rival', 'alex_digital', 'ivan_fintips', 'jesus_la_rata',
      'sergio_guillen', 'eduardo', 'blanca_notarias', 'jose_antonio_casero',
      'angel_perfeccionista', 'adrian_schizo', 'mariel',
      // NPCs de ambiente genéricos (siguen en uso)
      'may', 'mom', 'youngster', 'lass', 'shopkeeper_m', 'scientist', 'aroma',
      'gentleman', 'generic_m1', 'generic_f1', 'elder_m', 'fisher',
    ];
    const tex = this.textures.get('chars');
    for (const c of walkChars) {
      for (const dir of ['down', 'up', 'left', 'right']) {
        const key = `${c}_walk_${dir}`;
        if (this.anims.exists(key)) continue;
        // Solo frames que existan en el atlas (algunos personajes son solo-idle)
        const frames = [1, 0, 2, 0]
          .map((n) => ({ key: 'chars', frame: `${c}_${dir}_${n}` }))
          .filter((f) => tex.has(f.frame));
        if (frames.length > 1) {
          this.anims.create({ key, frames, frameRate: 8, repeat: -1 });
        }
      }
    }

    this.scene.start('Title');
  }
}
