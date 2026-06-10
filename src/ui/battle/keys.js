// Módulo C — mapeo de botones GBA para la UI de combate.
// Flechas/WASD mueven, Z/Espacio/Enter = A (confirmar), X/Shift = B (cancelar).

const BUTTON_BY_CODE = {
  ArrowUp: 'up',
  KeyW: 'up',
  ArrowDown: 'down',
  KeyS: 'down',
  ArrowLeft: 'left',
  KeyA: 'left',
  ArrowRight: 'right',
  KeyD: 'right',
  KeyZ: 'a',
  Space: 'a',
  Enter: 'a',
  KeyX: 'b',
  ShiftLeft: 'b',
  ShiftRight: 'b',
};

export function buttonFromEvent(event) {
  return BUTTON_BY_CODE[event.code] || null;
}

// Espera a que el jugador pulse uno de los botones aceptados.
export function waitForButton(scene, accepted = null) {
  return new Promise((resolve) => {
    const handler = (event) => {
      const button = buttonFromEvent(event);
      if (!button || (accepted && !accepted.includes(button))) return;
      scene.input.keyboard.off('keydown', handler);
      resolve(button);
    };
    scene.input.keyboard.on('keydown', handler);
  });
}

export function delay(scene, ms) {
  return new Promise((resolve) => scene.time.delayedCall(ms, resolve));
}
