import { TILE, WALK_MS } from '../../config.js';

// Direcciones de movimiento por grid.
export const DIRS = {
  up: { dx: 0, dy: -1 },
  down: { dx: 0, dy: 1 },
  left: { dx: -1, dy: 0 },
  right: { dx: 1, dy: 0 },
};

export const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

// Conversión tile → píxel para sprites anclados bottom-center
// (los frames del atlas son más altos que 16px; los pies pisan el tile).
export function tileToX(tx) { return tx * TILE + TILE / 2; }
export function tileToY(ty) { return ty * TILE + TILE; }

// Depth contractual: jugador/NPCs = 10 + y (tile).
export function depthForTileY(ty) { return 10 + ty; }
function depthForPixelY(py) { return 10 + py / TILE - 1; }

// Movimiento tile a tile reutilizable (jugador y NPCs).
export default class GridMover {
  constructor(scene, sprite, charKey, tileX, tileY, dir = 'down') {
    this.scene = scene;
    this.sprite = sprite;
    this.charKey = charKey;
    this.tileX = tileX;
    this.tileY = tileY;
    this.dir = dir;
    this.moving = false;
    sprite.setDepth(depthForTileY(tileY));
    this.setIdleFrame();
  }

  setIdleFrame() {
    const frame = `${this.charKey}_${this.dir}_0`;
    if (this.sprite.frame.name !== frame && this.sprite.texture.has(frame)) {
      this.sprite.setFrame(frame);
    }
  }

  faceDir(dir) {
    this.dir = dir;
    if (!this.moving) this.idle();
  }

  idle() {
    if (this.sprite.anims.isPlaying) this.sprite.anims.stop();
    this.setIdleFrame();
  }

  playWalkAnim(timeScale) {
    const key = `${this.charKey}_walk_${this.dir}`;
    if (!this.scene.anims.exists(key)) return;
    this.sprite.anims.play(key, true);
    this.sprite.anims.timeScale = timeScale;
  }

  // Da un paso de un tile en `dir`. NO comprueba colisiones: eso es del llamador.
  step(dir, duration, onComplete) {
    if (this.moving) return false;
    this.dir = dir;
    this.moving = true;
    const d = DIRS[dir];
    this.tileX += d.dx;
    this.tileY += d.dy;
    this.playWalkAnim(WALK_MS / duration);
    this.scene.tweens.add({
      targets: this.sprite,
      x: tileToX(this.tileX),
      y: tileToY(this.tileY),
      duration,
      onUpdate: () => this.sprite.setDepth(depthForPixelY(this.sprite.y)),
      onComplete: () => {
        this.moving = false;
        this.sprite.setDepth(depthForTileY(this.tileY));
        if (onComplete) onComplete();
      },
    });
    return true;
  }
}
