import Phaser from 'phaser';
import { WALK_MS } from '../../config.js';
import GridMover, { DIRS, OPPOSITE, tileToX, tileToY } from './GridMover.js';

const FALLBACK_SPRITE = 'generic_m1';
const ROAM_DIRS = ['up', 'down', 'left', 'right'];

// NPC del mundo: estático o con paseo aleatorio de 1 tile alrededor de su casa.
export default class Npc {
  constructor(scene, def) {
    this.scene = scene;
    this.def = def;
    this.home = { x: def.x, y: def.y };
    this.paused = false;
    const dir = def.dir || 'down';
    const charKey = scene.textures.get('chars').has(`${def.sprite}_${dir}_0`)
      ? def.sprite
      : FALLBACK_SPRITE;
    const sprite = scene.add
      .sprite(tileToX(def.x), tileToY(def.y), 'chars', `${charKey}_${dir}_0`)
      .setOrigin(0.5, 1);
    this.mover = new GridMover(scene, sprite, charKey, def.x, def.y, dir);
    if (def.roam) this.scheduleRoam();
  }

  scheduleRoam() {
    this.scene.time.addEvent({
      delay: Phaser.Math.Between(1800, 4200),
      callback: () => {
        this.tryRoam();
        this.scheduleRoam();
      },
    });
  }

  tryRoam() {
    if (this.paused || this.mover.moving) return;
    const dir = Phaser.Utils.Array.GetRandom(ROAM_DIRS);
    if (Math.random() < 0.35) {
      this.mover.faceDir(dir);
      return;
    }
    const d = DIRS[dir];
    const nx = this.mover.tileX + d.dx;
    const ny = this.mover.tileY + d.dy;
    const tooFar = Math.abs(nx - this.home.x) + Math.abs(ny - this.home.y) > 1;
    if (tooFar || this.scene.isBlocked(nx, ny, this.mover)) {
      this.mover.faceDir(dir);
      return;
    }
    this.mover.step(dir, WALK_MS * 1.5, () => this.mover.idle());
  }

  facePlayer(playerDir) {
    this.mover.faceDir(OPPOSITE[playerDir]);
  }

  isAt(x, y) {
    return !this.mover.moving && this.mover.tileX === x && this.mover.tileY === y;
  }
}
