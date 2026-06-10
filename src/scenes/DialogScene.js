import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { drawBox, textStyle, typewriterText } from '../ui/theme.js';

const BOX_W = 236;
const BOX_H = 48;
const BOX_X = (GAME_W - BOX_W) / 2;
const BOX_Y = GAME_H - BOX_H - 2;
const WRAP_W = BOX_W - 22;

// Overlay de diálogo GBA reutilizable. Uso desde cualquier escena:
//   this.scene.launch('Dialog', { lines: ['...'], onClose })
// Modo pregunta (cursor ▶, A confirma, B elige la opción por defecto):
//   this.scene.launch('Dialog', {
//     lines: ['¿Quieres que cure a tus Pokémon?'],
//     prompt: { options: ['SÍ', 'NO'], defaultIndex: 1, onSelect: (i, label) => {} },
//     onClose,
//   })
// Las escenas que la lanzan deben ignorar su propio input mientras
// `scene.isActive('Dialog')` sea true.
export default class DialogScene extends Phaser.Scene {
  constructor() { super('Dialog'); }

  create(data = {}) {
    this.lines = Array.isArray(data.lines) ? data.lines.slice() : [];
    this.prompt = data.prompt || null;
    this.onClose = data.onClose || null;
    this.speed = data.speed || 28;
    this.closed = false;
    this.promptOpen = false;
    this.writer = null;
    this.arrowOn = false;

    this.buildBox();
    this.pages = this.buildPages();
    this.bindKeys();
    if (!this.pages.length) {
      if (this.prompt) this.openPrompt();
      else this.close();
      return;
    }
    this.pageIdx = -1;
    this.nextPage();
  }

  buildBox() {
    drawBox(this, BOX_X, BOX_Y, BOX_W, BOX_H);
    this.textObj = this.add.text(BOX_X + 8, BOX_Y + 7, '', textStyle({
      wordWrap: { width: WRAP_W },
      lineSpacing: 6,
    }));
    this.arrow = this.add.text(BOX_X + BOX_W - 13, BOX_Y + BOX_H - 13, '▼', textStyle()).setVisible(false);
    this.time.addEvent({
      delay: 400,
      loop: true,
      callback: () => { if (this.arrowOn) this.arrow.setVisible(!this.arrow.visible); },
    });
  }

  // Trocea cada línea en páginas de máximo 2 renglones envueltos.
  buildPages() {
    const pages = [];
    for (const line of this.lines) {
      const wrapped = this.textObj.getWrappedText(String(line));
      for (let i = 0; i < wrapped.length; i += 2) {
        pages.push(wrapped.slice(i, i + 2).join('\n'));
      }
    }
    return pages;
  }

  bindKeys() {
    const kb = this.input.keyboard;
    const tap = (fn) => (ev) => { if (!(ev && ev.repeat)) fn(); };
    kb.on('keydown-Z', tap(() => this.handleA()));
    kb.on('keydown-SPACE', tap(() => this.handleA()));
    kb.on('keydown-ENTER', tap(() => this.handleA()));
    kb.on('keydown-X', tap(() => this.handleB()));
    kb.on('keydown-SHIFT', tap(() => this.handleB()));
    kb.on('keydown-UP', tap(() => this.moveCursor(-1)));
    kb.on('keydown-DOWN', tap(() => this.moveCursor(1)));
  }

  setArrow(on) {
    this.arrowOn = on;
    this.arrow.setVisible(on);
  }

  nextPage() {
    this.pageIdx += 1;
    if (this.pageIdx >= this.pages.length) {
      if (this.prompt && !this.promptOpen) this.openPrompt();
      else this.close();
      return;
    }
    this.setArrow(false);
    const last = this.pageIdx === this.pages.length - 1;
    this.writer = typewriterText(this, this.textObj, this.pages[this.pageIdx], this.speed, () => {
      if (last && this.prompt) this.openPrompt();
      else this.setArrow(true);
    });
  }

  handleA() {
    if (this.closed) return;
    if (this.promptOpen) { this.choose(this.promptIdx); return; }
    if (this.writer && !this.writer.done) { this.writer.skip(); return; }
    this.nextPage();
  }

  // B: en pregunta elige la opción por defecto; en texto avanza igual que A.
  handleB() {
    if (this.closed) return;
    if (this.promptOpen) { this.choose(this.promptDefault); return; }
    this.handleA();
  }

  openPrompt() {
    if (this.promptOpen || this.closed) return;
    this.promptOpen = true;
    this.setArrow(false);
    const options = (this.prompt.options && this.prompt.options.length)
      ? this.prompt.options : ['SÍ', 'NO'];
    this.promptOptions = options;
    this.promptDefault = this.prompt.defaultIndex != null
      ? this.prompt.defaultIndex : options.length - 1;
    this.promptIdx = 0;
    const w = Math.max(...options.map((o) => String(o).length)) * 6 + 24;
    const h = options.length * 12 + 12;
    const x = GAME_W - w - 4;
    const y = BOX_Y - h - 2;
    drawBox(this, x, y, w, h);
    this.optionTexts = options.map((o, i) => this.add.text(x + 15, y + 7 + i * 12, String(o), textStyle()));
    this.cursor = this.add.text(x + 7, y + 7, '▶', textStyle());
  }

  moveCursor(d) {
    if (!this.promptOpen || this.closed) return;
    const n = this.promptOptions.length;
    this.promptIdx = (this.promptIdx + d + n) % n;
    this.cursor.y = this.optionTexts[this.promptIdx].y;
  }

  choose(i) {
    const onSelect = this.prompt && this.prompt.onSelect;
    const label = this.promptOptions ? this.promptOptions[i] : null;
    this.close(() => { if (onSelect) onSelect(i, label); });
  }

  close(beforeClose = null) {
    if (this.closed) return;
    this.closed = true;
    const done = this.onClose;
    this.scene.stop();
    if (beforeClose) beforeClose();
    if (done) done();
  }
}
