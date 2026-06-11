// Módulo C — caja de mensajes de combate con texto letra a letra (estilo FRLG).
import { drawBox, bmText, bmWrap, typewriterText } from '../theme.js';
import { buttonFromEvent, waitForButton, delay } from './keys.js';

export class MessageBox {
  constructor(scene) {
    this.scene = scene;
    // Segunda superficie de MÁS texto del juego: ahora con FUENTE BITMAP nítida
    // (frlg16, 16px nativo SIN antialiasing) para texto crujiente en móvil. Caja al
    // fondo (y=110, justo bajo el databox del jugador) de 48px. El texto se PAGINA a
    // 2 renglones (ver reveal) para que nunca se corte una 3ª línea.
    this.frame = drawBox(scene, 2, 110, 236, 48, { depth: 8 });
    this.text = bmText(scene, 10, 116, '', { wrap: 214, lineSpacing: 2, depth: 9 });
    this.cursor = bmText(scene, 224, 142, '▼', { small: true, color: '#d04040', depth: 9 })
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

  // Revela el texto paginado en bloques de 2 renglones. Si una frase ocupa más
  // de 2 líneas, se trocea en páginas: cada página se escribe letra a letra y,
  // si quedan más, parpadea ▼ y espera A para continuar. Así nunca desborda la
  // caja (antes una 3ª línea se cortaba por el borde inferior).
  reveal(content) {
    return new Promise((resolve) => {
      this.cursor.setVisible(false);
      const wrapped = bmWrap(this.text, String(content == null ? '' : content));
      const pages = [];
      for (let i = 0; i < wrapped.length; i += 2) pages.push(wrapped.slice(i, i + 2).join('\n'));
      if (!pages.length) pages.push('');
      const keyboard = this.scene.input.keyboard;
      let pageIdx = 0;
      let control = null;
      const stopBlink = () => { if (this._blink) { this._blink.stop(); this._blink = null; } };
      const cleanup = () => {
        keyboard.off('keydown', onKey);
        stopBlink();
        this.cursor.setVisible(false);
      };
      const typePage = () => {
        const isLast = pageIdx === pages.length - 1;
        this.cursor.setVisible(false);
        control = typewriterText(this.scene, this.text, pages[pageIdx], 24, () => {
          if (isLast) { cleanup(); resolve(); return; }
          // Hay más páginas: cursor parpadeante esperando A.
          this.cursor.setVisible(true).setAlpha(1);
          this._blink = this.scene.tweens.add({
            targets: this.cursor, alpha: 0.15, duration: 280, yoyo: true, repeat: -1,
          });
        });
      };
      const onKey = (event) => {
        if (buttonFromEvent(event) !== 'a') return;
        if (control && !control.done) { control.skip(); return; } // 1º completa el tecleo
        if (pageIdx < pages.length - 1) { stopBlink(); pageIdx += 1; typePage(); } // 2º pasa de página
      };
      keyboard.on('keydown', onKey);
      typePage();
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
