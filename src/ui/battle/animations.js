// Módulo C — animaciones de combate: tweens con promesa, daño, debilitamiento,
// lanzamiento de Poké Ball con sacudidas y escenario de evolución.
import { delay } from './keys.js';

export function tweenPromise(scene, config) {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, onComplete: resolve });
  });
}

// Embestida corta del atacante hacia el rival.
export function lunge(scene, sprite, dx) {
  return tweenPromise(scene, { targets: sprite, x: sprite.x + dx, duration: 90, yoyo: true, ease: 'Quad.out' });
}

// Parpadeo del sprite al recibir daño.
export async function damageFlash(scene, sprite) {
  await tweenPromise(scene, { targets: sprite, alpha: 0.2, duration: 60, yoyo: true, repeat: 2 });
  sprite.setAlpha(1);
}

// Temblor horizontal al recibir daño.
export function shake(scene, sprite) {
  return tweenPromise(scene, { targets: sprite, x: sprite.x - 3, duration: 45, yoyo: true, repeat: 3 });
}

// El sprite cae y se desvanece al debilitarse.
export function faintDrop(scene, sprite) {
  return tweenPromise(scene, { targets: sprite, y: sprite.y + 20, alpha: 0, duration: 380, ease: 'Quad.in' });
}

function ensureBallTexture(scene) {
  if (scene.textures.exists('battle_ball')) return;
  const g = scene.make.graphics({ add: false });
  g.fillStyle(0xe83838, 1);
  g.slice(6, 6, 5, Math.PI, Math.PI * 2, false);
  g.fillPath();
  g.fillStyle(0xf8f8f8, 1);
  g.slice(6, 6, 5, 0, Math.PI, false);
  g.fillPath();
  g.fillStyle(0x303030, 1);
  g.fillRect(1, 5, 10, 2);
  g.fillStyle(0xf8f8f8, 1);
  g.fillCircle(6, 6, 1.5);
  g.generateTexture('battle_ball', 12, 12);
  g.destroy();
}

function arcTo(scene, obj, x, y) {
  return Promise.all([
    tweenPromise(scene, { targets: obj, x, duration: 420, ease: 'Linear' }),
    tweenPromise(scene, { targets: obj, y, duration: 420, ease: 'Quad.out' }),
  ]);
}

async function absorb(scene, sprite) {
  sprite.setTintFill(0xf8e858);
  await tweenPromise(scene, { targets: sprite, scaleX: 0.05, scaleY: 0.05, duration: 280, ease: 'Quad.in' });
  sprite.setVisible(false).clearTint().setScale(1);
}

async function shakeBall(scene, ball, shakes) {
  await delay(scene, 300);
  for (let i = 0; i < shakes; i += 1) {
    await tweenPromise(scene, { targets: ball, angle: -22, duration: 80, yoyo: true });
    await tweenPromise(scene, { targets: ball, angle: 22, duration: 80, yoyo: true });
    ball.setAngle(0);
    await delay(scene, 320);
  }
}

async function releaseFromBall(scene, ball, sprite, home) {
  const flash = scene.add.circle(ball.x, ball.y, 6, 0xffffff).setDepth(7);
  ball.destroy();
  sprite.setPosition(home.x, home.y).setScale(0.05).setVisible(true).setAlpha(1);
  await Promise.all([
    tweenPromise(scene, { targets: flash, scale: 3, alpha: 0, duration: 260 }),
    tweenPromise(scene, { targets: sprite, scaleX: 1, scaleY: 1, duration: 220, ease: 'Quad.out' }),
  ]);
  flash.destroy();
}

// Animación completa de captura: lanzar, absorber, caer, sacudidas y resultado.
export async function ballThrow(scene, enemySprite, home, shakes, caught) {
  ensureBallTexture(scene);
  const ball = scene.add.image(70, 92, 'battle_ball').setDepth(6);
  await arcTo(scene, ball, home.x, home.y - 44);
  await absorb(scene, enemySprite);
  await tweenPromise(scene, { targets: ball, y: home.y - 6, duration: 280, ease: 'Bounce.out' });
  await shakeBall(scene, ball, shakes);
  if (caught) {
    ball.setTint(0xb0b0b0);
    await delay(scene, 400);
    return;
  }
  await releaseFromBall(scene, ball, enemySprite, home);
}

function swapScales(scene, shrink, grow, duration) {
  return Promise.all([
    tweenPromise(scene, { targets: shrink, scale: 0, duration }),
    tweenPromise(scene, { targets: grow, scale: 1, duration }),
  ]);
}

async function whiteFlash(scene) {
  const flash = scene.add.rectangle(120, 80, 240, 160, 0xffffff).setDepth(22).setAlpha(0);
  await tweenPromise(scene, { targets: flash, alpha: 1, duration: 140 });
  await tweenPromise(scene, { targets: flash, alpha: 0, duration: 320 });
  flash.destroy();
}

// Escenario de evolución: tapa el campo (deja visible la caja de mensajes),
// alterna siluetas entre la forma vieja y la nueva y termina con un destello.
export function createEvolutionStage(scene, oldKey, newKey) {
  const cover = scene.add.rectangle(120, 56, 240, 112, 0x181828).setDepth(20);
  const oldSprite = scene.add.image(120, 58, oldKey).setDepth(21);
  const newSprite = scene.add.image(120, 58, newKey).setDepth(21).setScale(0);
  return {
    async morph() {
      oldSprite.setTintFill(0xf8f8f8);
      newSprite.setTintFill(0xf8f8f8);
      for (let i = 0; i < 5; i += 1) {
        const duration = 240 - i * 30;
        await swapScales(scene, oldSprite, newSprite, duration);
        if (i < 4) await swapScales(scene, newSprite, oldSprite, duration);
      }
      await whiteFlash(scene);
      newSprite.clearTint();
      oldSprite.setVisible(false);
    },
    destroy() {
      cover.destroy();
      oldSprite.destroy();
      newSprite.destroy();
    },
  };
}
