// Módulo C — animaciones de combate: tweens con promesa, daño, debilitamiento,
// lanzamiento de Poké Ball con sacudidas y escenario de evolución.
//
// Todo es compositor-friendly: solo se animan `x`/`y`/`scale`/`alpha`/`angle`
// (transform + opacidad). Nada de width/height/colores animados por tween.
//
// Convenciones del lienzo (240x160, cámara centrada en 120,80):
//   ground=1 · sprites=2 · poké ball=6 · destellos de ball=7 · efectos FX=8-9
//   evolución cover=20 / sprites=21 · flash de pantalla=22
// Los sprites de combate usan setOrigin(0.5, 1) (anclados a los pies).
import { delay } from './keys.js';

// Dimensiones del lienzo GBA. Se usan para flashes a pantalla completa.
const VIEW_W = 240;
const VIEW_H = 160;
const VIEW_CX = VIEW_W / 2;
const VIEW_CY = VIEW_H / 2;

// Profundidades reservadas para los efectos transitorios de este módulo.
const DEPTH_FX = 9; // chispas/estrellas por encima de los sprites
const DEPTH_FLASH = 22; // flash a pantalla completa (críticos, etc.)

export function tweenPromise(scene, config) {
  return new Promise((resolve) => {
    scene.tweens.add({ ...config, onComplete: resolve });
  });
}

// ── Ataque ────────────────────────────────────────────────────────────────

// Embestida del atacante hacia el rival: avanza rápido, retrocede con rebote
// y suma un micro-recoil para darle "peso" al impacto.
export async function lunge(scene, sprite, dx) {
  const homeX = sprite.x;
  await tweenPromise(scene, {
    targets: sprite,
    x: homeX + dx,
    duration: 70,
    yoyo: true,
    hold: 30,
    ease: 'Quad.out',
  });
  sprite.setX(homeX);
}

// ── Recibir daño ────────────────────────────────────────────────────────────

// Parpadeo del sprite golpeado: alterna opacidad varias veces (efecto "blink"
// de los Pokémon clásicos). Restaura siempre alpha=1 al terminar.
export async function damageFlash(scene, sprite) {
  await tweenPromise(scene, {
    targets: sprite,
    alpha: 0.15,
    duration: 55,
    yoyo: true,
    repeat: 3,
    ease: 'Sine.inOut',
  });
  sprite.setAlpha(1);
}

// Temblor horizontal al recibir daño: sacudida amortiguada (cada golpe pierde
// fuerza) que termina exactamente en la posición original.
export async function shake(scene, sprite) {
  const homeX = sprite.x;
  const offsets = [-4, 4, -3, 3, -2, 2, -1, 1, 0];
  for (const off of offsets) {
    await tweenPromise(scene, { targets: sprite, x: homeX + off, duration: 28, ease: 'Linear' });
  }
  sprite.setX(homeX);
}

// ── Debilitamiento ──────────────────────────────────────────────────────────

// El sprite se "hunde" y se desvanece al debilitarse: cae hacia abajo (los
// sprites están anclados a los pies, así que parece que se desploma) y a la
// vez se encoge ligeramente y baja su opacidad.
export async function faintDrop(scene, sprite) {
  const homeY = sprite.y;
  await tweenPromise(scene, {
    targets: sprite,
    y: homeY + 26,
    scaleY: 0.85,
    alpha: 0,
    duration: 420,
    ease: 'Quad.in',
  });
  // Deja el sprite invisible pero con su transform reseteado por si se reutiliza.
  sprite.setY(homeY).setScale(1).setAlpha(0);
}

// ── Entrada de los sprites ──────────────────────────────────────────────────

// Entrada deslizante de un sprite desde fuera de pantalla hasta su sitio, con
// un pequeño "overshoot" elástico al frenar. `fromDx` es el desplazamiento de
// salida (negativo = entra desde la izquierda; positivo = desde la derecha).
//   slideIn(scene, sprite, { x, y }, -80)
export async function slideIn(scene, sprite, home, fromDx = -90) {
  sprite.setPosition(home.x + fromDx, home.y).setAlpha(1).setScale(1);
  await tweenPromise(scene, {
    targets: sprite,
    x: home.x,
    duration: 360,
    ease: 'Back.out',
  });
  sprite.setPosition(home.x, home.y);
}

// Aparición "pop" típica de cuando un entrenador saca a su Pokémon: crece desde
// cero con rebote elástico (equivale a los scale-tweens sueltos de la escena,
// pero centralizado y reutilizable).
export async function popIn(scene, sprite) {
  sprite.setScale(0);
  await tweenPromise(scene, { targets: sprite, scale: 1, duration: 260, ease: 'Back.out' });
  sprite.setScale(1);
}

// Salida "pop": se encoge a cero (para retirar al Pokémon del jugador, etc.).
export async function popOut(scene, sprite) {
  await tweenPromise(scene, { targets: sprite, scale: 0, duration: 200, ease: 'Quad.in' });
  sprite.setScale(0);
}

// ── Flashes de pantalla ─────────────────────────────────────────────────────

// Flash blanco a pantalla completa para golpes críticos: subida brusca y
// caída suave. Devuelve cuando el flash se ha disuelto del todo.
export async function critFlash(scene) {
  const flash = scene.add
    .rectangle(VIEW_CX, VIEW_CY, VIEW_W, VIEW_H, 0xffffff)
    .setDepth(DEPTH_FLASH)
    .setAlpha(0);
  await tweenPromise(scene, { targets: flash, alpha: 0.9, duration: 60, ease: 'Quad.out' });
  await tweenPromise(scene, { targets: flash, alpha: 0, duration: 260, ease: 'Quad.in' });
  flash.destroy();
}

// Doble destello rápido (rojo tenue) para "súper eficaz" o impactos fuertes.
// `color` permite reutilizarlo para otros estados (veneno, etc.).
export async function screenFlash(scene, color = 0xffffff, peak = 0.6) {
  const flash = scene.add
    .rectangle(VIEW_CX, VIEW_CY, VIEW_W, VIEW_H, color)
    .setDepth(DEPTH_FLASH)
    .setAlpha(0);
  await tweenPromise(scene, { targets: flash, alpha: peak, duration: 50, yoyo: true, repeat: 1 });
  flash.destroy();
}

// ── Chispas / partículas ligeras ────────────────────────────────────────────

// Estrellitas que salen disparadas desde un punto (impacto, captura, etc.).
// Cada chispa es un pequeño rectángulo que se aleja en un ángulo y se desvanece.
export async function sparkle(scene, x, y, { count = 6, color = 0xfff4a0, spread = 18 } = {}) {
  const parts = [];
  const anims = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
    const dist = spread + Math.random() * spread;
    const dot = scene.add.rectangle(x, y, 2, 2, color).setDepth(DEPTH_FX);
    parts.push(dot);
    anims.push(
      tweenPromise(scene, {
        targets: dot,
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        scale: 0.2,
        duration: 320 + Math.random() * 120,
        ease: 'Quad.out',
      }),
    );
  }
  await Promise.all(anims);
  parts.forEach((p) => p.destroy());
}

// ── Poké Ball ────────────────────────────────────────────────────────────────

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

// Arco de lanzamiento: la x avanza lineal mientras la y sube y baja con dos
// tramos (subida rápida con desaceleración, "cima" del arco), y la ball gira
// sobre sí misma durante el vuelo para dar sensación de giro real.
function arcTo(scene, obj, x, y) {
  const apexY = Math.min(obj.y, y) - 24;
  return Promise.all([
    tweenPromise(scene, { targets: obj, x, duration: 440, ease: 'Linear' }),
    tweenPromise(scene, { targets: obj, angle: 540, duration: 440, ease: 'Linear' }),
    (async () => {
      await tweenPromise(scene, { targets: obj, y: apexY, duration: 200, ease: 'Quad.out' });
      await tweenPromise(scene, { targets: obj, y, duration: 240, ease: 'Quad.in' });
    })(),
  ]);
}

async function absorb(scene, sprite) {
  sprite.setTintFill(0xf8e858);
  await tweenPromise(scene, { targets: sprite, scaleX: 0.05, scaleY: 0.05, duration: 280, ease: 'Quad.in' });
  sprite.setVisible(false).clearTint().setScale(1);
}

async function shakeBall(scene, ball, shakes) {
  await delay(scene, 320);
  for (let i = 0; i < shakes; i += 1) {
    // Inclina a un lado y al otro con un pequeño "asentamiento" al volver.
    await tweenPromise(scene, { targets: ball, angle: -24, duration: 90, ease: 'Sine.inOut' });
    await tweenPromise(scene, { targets: ball, angle: 24, duration: 140, ease: 'Sine.inOut' });
    await tweenPromise(scene, { targets: ball, angle: 0, duration: 90, ease: 'Sine.inOut' });
    // Chispa tenue al asentar, como el "click" de la ball.
    sparkle(scene, ball.x, ball.y - 2, { count: 3, color: 0xfff4a0, spread: 8 });
    await delay(scene, 340);
  }
}

async function releaseFromBall(scene, ball, sprite, home) {
  const flash = scene.add.circle(ball.x, ball.y, 6, 0xffffff).setDepth(7);
  ball.destroy();
  sprite.setPosition(home.x, home.y).setScale(0.05).setVisible(true).setAlpha(1);
  await Promise.all([
    tweenPromise(scene, { targets: flash, scale: 3.2, alpha: 0, duration: 280, ease: 'Quad.out' }),
    tweenPromise(scene, { targets: sprite, scaleX: 1, scaleY: 1, duration: 240, ease: 'Back.out' }),
  ]);
  sprite.setScale(1);
  flash.destroy();
}

// Estallido de estrellas de captura confirmada (el clásico destello de las
// tres estrellitas alrededor de la ball).
async function captureSparkle(scene, ball) {
  ball.setTint(0xb0b0b0);
  await Promise.all([
    sparkle(scene, ball.x, ball.y, { count: 8, color: 0xfffbe0, spread: 22 }),
    tweenPromise(scene, { targets: ball, y: ball.y - 3, duration: 120, yoyo: true, ease: 'Sine.inOut' }),
  ]);
}

// Animación completa de captura: lanzar (con arco y giro), absorber, caer con
// rebote, sacudidas y resultado (captura con estrellas o ruptura/liberación).
export async function ballThrow(scene, enemySprite, home, shakes, caught) {
  ensureBallTexture(scene);
  const ball = scene.add.image(70, 92, 'battle_ball').setDepth(6);
  await arcTo(scene, ball, home.x, home.y - 44);
  ball.setAngle(0);
  await absorb(scene, enemySprite);
  // Caída con rebote y una chispita al tocar "suelo".
  await tweenPromise(scene, { targets: ball, y: home.y - 6, duration: 300, ease: 'Bounce.out' });
  sparkle(scene, ball.x, ball.y + 2, { count: 4, color: 0xffffff, spread: 10 });
  await shakeBall(scene, ball, shakes);
  if (caught) {
    await delay(scene, 200);
    await captureSparkle(scene, ball);
    await delay(scene, 300);
    return;
  }
  await releaseFromBall(scene, ball, enemySprite, home);
}

// ── Evolución ───────────────────────────────────────────────────────────────

function swapScales(scene, shrink, grow, duration) {
  return Promise.all([
    tweenPromise(scene, { targets: shrink, scale: 0, duration }),
    tweenPromise(scene, { targets: grow, scale: 1, duration }),
  ]);
}

async function whiteFlash(scene) {
  const flash = scene.add.rectangle(VIEW_CX, 80, VIEW_W, VIEW_H, 0xffffff).setDepth(DEPTH_FLASH).setAlpha(0);
  await tweenPromise(scene, { targets: flash, alpha: 1, duration: 140 });
  await tweenPromise(scene, { targets: flash, alpha: 0, duration: 320 });
  flash.destroy();
}

// Escenario de evolución: tapa el campo (deja visible la caja de mensajes),
// alterna siluetas entre la forma vieja y la nueva (cada vez más rápido) y
// termina con un destello blanco.
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
