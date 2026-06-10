// Módulo C — caja de mensajes de combate con texto letra a letra (estilo FRLG).
import { drawBox, textStyle, typewriterText } from '../theme.js';
import { buttonFromEvent, waitForButton, delay } from './keys.js';

export class MessageBox {
  constructor(scene) {
    this.scene = scene;
    this.frame = drawBox(scene, 2, 112, 236, 46, { depth: 8 });
    this.text = scene.add
      .text(10, 121, '', textStyle({ wordWrap: { width: 216 }, lineSpacing: 4 }))
      .setDepth(9);
    this.cursor = scene.add
      .text(224, 146, '▼', textStyle({ color: '#d04040' }))
      .setDepth(9)
      .setVisible(false);
  }

  // Texto instantáneo (p. ej. "¿Qué hará X?" bajo el menú principal).
  setInstant(content) {
    this.cursor.setVisible(false);
    this.text.setText(content);
  }

  clear() {
    this.setInstant('');
  }

  // Escribe letra a letra. confirm=true espera al botón A con ▼ parpadeante;
  // si no, hace una pausa corta y sigue solo.
  async type(content, { confirm = false, holdMs = 650 } = {}) {
    await this.reveal(content);
    if (confirm) await this.waitConfirm();
    else await delay(this.scene, holdMs);
  }

  reveal(content) {
    return new Promise((resolve) => {
      this.cursor.setVisible(false);
      const done = () => {
        this.scene.input.keyboard.off('keydown', skip);
        resolve();
      };
      const skip = (event) => {
        if (buttonFromEvent(event) === 'a') control.skip();
      };
      this.scene.input.keyboard.on('keydown', skip);
      const control = typewriterText(this.scene, this.text, content, 24, done);
    });
  }

  async waitConfirm() {
    this.cursor.setVisible(true).setAlpha(1);
    const blink = this.scene.tweens.add({
      targets: this.cursor,
      alpha: 0.15,
      duration: 280,
      yoyo: true,
      repeat: -1,
    });
    await waitForButton(this.scene, ['a', 'b']);
    blink.stop();
    this.cursor.setAlpha(1).setVisible(false);
  }
}
