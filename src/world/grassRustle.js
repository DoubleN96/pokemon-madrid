// Efecto "rustle" de hierba alta: un pequeño penacho de hojas que se agita a los
// pies del jugador cada vez que pisa/cruza un tile de hierba alta.
//
// No depende de ningún tile concreto del tileset (que no tiene un sprite de
// rustle fiable): genera UNA textura procedural de hoja con Phaser.Graphics la
// primera vez y luego anima varias copias con tweens (escala + fade + deriva).
// Compositor-friendly: solo anima scale/alpha/position. Respeta prefers-reduced-motion.

import Phaser from 'phaser';
import { TILE } from '../config.js';

const TEX_KEY = 'fx_grass_leaf';
const LEAF_COLORS = [0x4a8a2a, 0x6cba3a, 0x3c7a22]; // verdes de hierba (claro→oscuro)

// Crea (una sola vez) una textura redonda tipo hoja para reutilizarla.
function ensureLeafTexture(scene) {
  if (scene.textures.exists(TEX_KEY)) return;
  const g = scene.make.graphics({ x: 0, y: 0, add: false });
  // Hoja: óvalo verde claro con nervio más oscuro.
  g.fillStyle(0x7cce46, 1);
  g.fillEllipse(4, 4, 8, 6);
  g.fillStyle(0x3c7a22, 1);
  g.fillRect(3, 1, 2, 6);
  g.generateTexture(TEX_KEY, 8, 8);
  g.destroy();
}

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// Reproduce el efecto en el tile (tileX, tileY). `depth` lo deja por encima del
// suelo/hierba y a la altura de los pies del jugador.
export function playGrassRustle(scene, tileX, tileY, depth = 9) {
  ensureLeafTexture(scene);
  const cx = tileX * TILE + TILE / 2;
  const cy = tileY * TILE + TILE - 3; // a los pies (parte baja del tile)

  if (prefersReducedMotion()) {
    // Versión sin movimiento: un destello breve de un único penacho.
    const leaf = scene.add.image(cx, cy, TEX_KEY).setDepth(depth).setAlpha(0.9);
    scene.tweens.add({ targets: leaf, alpha: 0, duration: 180, onComplete: () => leaf.destroy() });
    return;
  }

  const count = 4;
  for (let i = 0; i < count; i++) {
    const leaf = scene.add.image(cx, cy, TEX_KEY).setDepth(depth);
    const tint = Phaser.Utils.Array.GetRandom(LEAF_COLORS);
    leaf.setTint(tint);
    leaf.setScale(0.5);
    leaf.setAngle(Phaser.Math.Between(0, 360));
    // Cada hoja salta hacia un lado/arriba y cae mientras se desvanece.
    const dir = i % 2 === 0 ? -1 : 1;
    const dx = dir * Phaser.Math.Between(3, 7);
    const lift = Phaser.Math.Between(4, 9);
    scene.tweens.add({
      targets: leaf,
      x: cx + dx,
      y: cy - lift,
      scale: { from: 0.5, to: 1 },
      angle: leaf.angle + dir * Phaser.Math.Between(40, 90),
      duration: 130,
      ease: 'Quad.Out',
      onComplete: () => {
        scene.tweens.add({
          targets: leaf,
          y: cy + 2,
          alpha: 0,
          scale: 0.4,
          duration: 150,
          ease: 'Quad.In',
          onComplete: () => leaf.destroy(),
        });
      },
    });
  }
}
