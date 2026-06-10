// Módulo C — cajas de datos de combate (nombre, nivel, PS, EXP) estilo FRLG.
// La caja enemiga (arriba-izda) no muestra números de PS; la del jugador
// (abajo-dcha) muestra PS en números y barra de EXP.
import { drawBox, hpColor, textStyle, STATUS_LABELS } from '../theme.js';

const STATUS_BG = { par: '#b8a038', psn: '#a040a0', brn: '#f08030', slp: '#705898', frz: '#68a8d8' };
const clamp01 = (v) => Math.min(1, Math.max(0, v));

export class DataBox {
  constructor(scene, { x, y, isPlayer }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.isPlayer = isPlayer;
    this.w = isPlayer ? 106 : 102;
    this.h = isPlayer ? 38 : 28;
    this.barX = x + 38;
    this.barY = y + 16;
    this.barW = 48;
    this.curHp = 1;
    this.maxHp = 1;
    this.expShown = 0;
    this.build();
  }

  build() {
    this.panel = drawBox(this.scene, this.x, this.y, this.w, this.h, { fill: 0xf8f0d8, depth: 5 });
    const barFrame = this.scene.add.graphics().setDepth(6);
    barFrame.fillStyle(0x504848, 1);
    barFrame.fillRoundedRect(this.barX - 16, this.barY - 2, this.barW + 18, 8, 3);
    this.barFrame = barFrame;
    this.nameText = this.scene.add.text(this.x + 5, this.y + 4, '', textStyle()).setDepth(6);
    this.lvText = this.scene.add.text(this.x + this.w - 5, this.y + 4, '', textStyle())
      .setOrigin(1, 0).setDepth(6);
    this.psLabel = this.scene.add
      .text(this.barX - 13, this.barY - 2, 'PS', textStyle({ fontSize: '7px', color: '#f8c838' }))
      .setDepth(7);
    this.statusText = this.scene.add
      .text(this.x + 5, this.barY - 1, '', textStyle({ fontSize: '7px', color: '#f8f8f8' }))
      .setDepth(7);
    this.hpGfx = this.scene.add.graphics().setDepth(7);
    if (!this.isPlayer) return;
    this.hpText = this.scene.add.text(this.x + this.w - 7, this.barY + 7, '', textStyle())
      .setOrigin(1, 0).setDepth(6);
    this.expLabel = this.scene.add
      .text(this.x + 5, this.y + this.h - 9, 'EXP', textStyle({ fontSize: '7px', color: '#5878a0' }))
      .setDepth(6);
    this.expGfx = this.scene.add.graphics().setDepth(6);
  }

  setMonster({ name, level, hp, maxHp, status, expRatio }) {
    this.nameText.setText(name);
    this.setLevel(level);
    this.setStatus(status);
    this.updateHp(hp, maxHp);
    if (this.isPlayer) this.setExp(expRatio || 0);
  }

  setLevel(level) {
    this.lvText.setText(`Nv${level}`);
  }

  setStatus(status) {
    if (!status) {
      this.statusText.setText('').setBackgroundColor(null);
      return;
    }
    this.statusText.setText(STATUS_LABELS[status] || status.toUpperCase());
    this.statusText.setBackgroundColor(STATUS_BG[status] || '#606060');
  }

  updateHp(cur, max) {
    this.curHp = cur;
    this.maxHp = max;
    const ratio = max > 0 ? clamp01(cur / max) : 0;
    const g = this.hpGfx;
    g.clear();
    g.fillStyle(0x282830, 1);
    g.fillRect(this.barX, this.barY, this.barW, 4);
    const fill = Math.round(this.barW * ratio);
    if (fill > 0) {
      g.fillStyle(hpColor(ratio), 1);
      g.fillRect(this.barX, this.barY, fill, 4);
    }
    if (this.isPlayer && this.hpText) {
      this.hpText.setText(`${Math.max(0, Math.round(cur))}/${max}`);
    }
  }

  // Tween de la barra de PS; devuelve una promesa para encadenar animaciones.
  tweenHp(from, to, max) {
    return new Promise((resolve) => {
      const counter = { v: from };
      const duration = Math.min(900, Math.max(220, Math.abs(from - to) * 22));
      this.scene.tweens.add({
        targets: counter,
        v: to,
        duration,
        onUpdate: () => this.updateHp(counter.v, max),
        onComplete: () => {
          this.updateHp(to, max);
          resolve();
        },
      });
    });
  }

  setExp(ratio) {
    this.expShown = clamp01(ratio);
    this.drawExp(this.expShown);
  }

  drawExp(ratio) {
    const g = this.expGfx;
    const x = this.x + 24;
    const y = this.y + this.h - 7;
    const w = this.w - 31;
    g.clear();
    g.fillStyle(0x504848, 1);
    g.fillRect(x - 1, y - 1, w + 2, 4);
    const fill = Math.round(w * clamp01(ratio));
    if (fill > 0) {
      g.fillStyle(0x48a0f8, 1);
      g.fillRect(x, y, fill, 2);
    }
  }

  tweenExp(ratio) {
    return new Promise((resolve) => {
      const target = clamp01(ratio);
      if (Math.abs(target - this.expShown) < 0.005) {
        this.setExp(target);
        resolve();
        return;
      }
      const counter = { v: this.expShown };
      this.scene.tweens.add({
        targets: counter,
        v: target,
        duration: 500,
        onUpdate: () => this.drawExp(counter.v),
        onComplete: () => {
          this.setExp(target);
          resolve();
        },
      });
    });
  }
}
