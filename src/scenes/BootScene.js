import Phaser from 'phaser';
import pokedex from '../data/pokedex.json';
import movesData from '../data/moves.json';

// Carga global de assets. Los sprites de batalla se cargan bajo demanda en BattleScene
// (front/back por id), pero los iconos y atlas de personajes se cargan aquí.
export default class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  preload() {
    const bar = this.add.rectangle(120, 84, 0, 6, 0xffcb05).setOrigin(0, 0.5);
    this.add.text(120, 64, 'POKÉMON MADRID', { fontSize: '12px', color: '#ffffff' }).setOrigin(0.5);
    bar.x = 60;
    this.load.on('progress', (v) => { bar.width = 120 * v; });

    // Tileset overworld Gen 3 (16x16)
    this.load.spritesheet('tiles', 'assets/tilesets/rse-tileset.png', { frameWidth: 16, frameHeight: 16 });
    this.load.image('tilesetimg', 'assets/tilesets/rse-tileset.png');
    // Atlas de personajes (jugador + NPCs, formato TexturePacker)
    this.load.atlas('chars', 'assets/sprites/chars/npcs.webp', 'assets/sprites/chars/npcs.json');
  }

  create() {
    // Datos al registry global
    this.registry.set('pokedex', pokedex);
    this.registry.set('movesData', movesData);

    // Animaciones de andar del jugador y NPCs usados (3 frames por dirección, ping-pong)
    const walkChars = ['may', 'mom', 'youngster', 'lass', 'shopkeeper_m', 'scientist', 'aroma', 'gentleman', 'generic_m1', 'generic_f1', 'elder_m', 'fisher'];
    for (const c of walkChars) {
      for (const dir of ['down', 'up', 'left', 'right']) {
        const key = `${c}_walk_${dir}`;
        if (this.anims.exists(key)) continue;
        this.anims.create({
          key,
          frames: [
            { key: 'chars', frame: `${c}_${dir}_1` },
            { key: 'chars', frame: `${c}_${dir}_0` },
            { key: 'chars', frame: `${c}_${dir}_2` },
            { key: 'chars', frame: `${c}_${dir}_0` },
          ],
          frameRate: 8,
          repeat: -1,
        });
      }
    }

    this.scene.start('Title');
  }
}
