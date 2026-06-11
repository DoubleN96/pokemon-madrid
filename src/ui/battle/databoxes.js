// Módulo C — cajas de datos de combate (nombre, nivel, PS, EXP) estilo FRLG.
// La caja enemiga (arriba-izda) muestra nombre/Nv/barra de PS; la del jugador
// (abajo-dcha) añade además la barra de EXP. El nivel de PS se lee por la barra
// de color (verde/amarillo/rojo), sin número (el databox de 32px no deja sitio).
//
// FASE A3: el MARCO se dibuja con el PNG FRLG con cola (battle_box_player /
// battle_box_enemy, ya recortados a su tamaño real con el "Lv" y la pista EXP
// horneados). El relleno de PS pasa de fillRect a un sprite de barra de color
// (hpbar_green/yellow/red 48x8) recortado por ratio. El nombre/Nv/PS/HP siguen
// como texto con la fuente del juego. La API pública (setMonster/tweenHp/
// tweenExp/setStatus/setLevel/setExp/updateHp) NO cambia.
import { bmText, STATUS_LABELS } from '../theme.js';

const STATUS_BG = { par: 0xb8a038, psn: 0xa040a0, brn: 0xf08030, slp: 0x705898, frz: 0x68a8d8 };
const clamp01 = (v) => Math.min(1, Math.max(0, v));

// Anchura real (en px) de la barra de PS de color dentro del PNG (48x8).
const HP_BAR_W = 48;
const HP_BAR_H = 8;

// Texturas de barra de PS por umbral de color FRLG (>0.5 verde, >0.2 amarillo, resto rojo).
function hpBarTexture(ratio) {
  if (ratio > 0.5) return 'hpbar_green';
  if (ratio > 0.2) return 'hpbar_yellow';
  return 'hpbar_red';
}

// Layout interno de cada caja, relativo al origen (x,y) del PNG. Medido sobre los
// marcos FRLG: enemigo 104x32 (cream x4..89, y5..24); jugador 112x32 (cream
// x12..97, y5..24 + pista EXP horneada abajo). barX/barY sitúan la barra de PS de
// color sobre la zona cream; expX/expW caen sobre la pista de puntos horneada.
const LAYOUT = {
  enemy: {
    boxKey: 'battle_box_enemy',
    nameX: 8, nameY: 6,
    lvRightX: 90, lvY: 6,        // "NvNN" alineado a la derecha de la zona cream
    psLabelX: 10, barX: 28, barY: 17, // "PS" + barra de color
    statusX: 8, statusY: 17,
  },
  player: {
    boxKey: 'battle_box_player',
    nameX: 16, nameY: 3,
    lvRightX: 95, lvY: 3,
    psLabelX: 18, barX: 34, barY: 15,
    statusX: 16, statusY: 15,
    expX: 31, expY: 27, expW: 73, // relleno EXP sobre la pista de puntos horneada
  },
};

export class DataBox {
  constructor(scene, { x, y, isPlayer }) {
    this.scene = scene;
    this.x = x;
    this.y = y;
    this.isPlayer = isPlayer;
    this.cfg = isPlayer ? LAYOUT.player : LAYOUT.enemy;
    this.curHp = 1;
    this.maxHp = 1;
    this.expShown = 0;
    this.build();
  }

  build() {
    const { cfg } = this;
    // Marco PNG FRLG (cream + borde verde + cola). Fallback defensivo: si la textura
    // no cargó, no rompemos el combate (la barra/textos siguen visibles encima).
    if (this.scene.textures.exists(cfg.boxKey)) {
      this.panel = this.scene.add.image(this.x, this.y, cfg.boxKey).setOrigin(0, 0).setDepth(5);
    }
    this.nameText = bmText(this.scene, this.x + cfg.nameX, this.y + cfg.nameY, '', { small: true, depth: 7 });
    this.lvText = bmText(this.scene, this.x + cfg.lvRightX, this.y + cfg.lvY, '', { small: true, origin: [1, 0], depth: 7 });
    this.psLabel = bmText(this.scene, this.x + cfg.psLabelX, cfg.barY + this.y - 1, 'PS', { small: true, color: '#f8c838', depth: 7 });
    // Badge de estado: fondo de color (graphics) + texto bitmap encima (BitmapText
    // no tiene setBackgroundColor). El graphics se redimensiona en setStatus.
    this.statusBg = this.scene.add.graphics().setDepth(7);
    this.statusText = bmText(this.scene, this.x + cfg.statusX, this.y + cfg.statusY, '', { small: true, color: '#f8f8f8', depth: 8 });
    // Barra de PS: sprite de color recortado por ratio. setCrop(0,0,w*ratio,h).
    this.hpBar = this.scene.add
      .image(this.x + cfg.barX, this.y + cfg.barY, hpBarTexture(1)).setOrigin(0, 0).setDepth(6);
    if (!this.isPlayer) return;
    // El databox FRLG de 32px con la pista EXP horneada no deja sitio limpio para
    // el número de PS; la barra de color (verde/amarillo/rojo) ya indica el PS de
    // forma legible, igual que la caja enemiga. Relleno EXP dinámico (verde) sobre
    // la pista de puntos horneada en el PNG.
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
    this.statusBg.clear();
    if (!status) {
      this.statusText.setText('');
      return;
    }
    this.statusText.setText(STATUS_LABELS[status] || status.toUpperCase());
    // Fondo de color del badge, ajustado al tamaño del texto bitmap.
    const tw = this.statusText.width;
    const th = this.statusText.height;
    this.statusBg.fillStyle(STATUS_BG[status] != null ? STATUS_BG[status] : 0x606060, 1);
    this.statusBg.fillRect(this.statusText.x - 1, this.statusText.y - 1, tw + 2, th + 2);
  }

  updateHp(cur, max) {
    this.curHp = cur;
    this.maxHp = max;
    const ratio = max > 0 ? clamp01(cur / max) : 0;
    // Cambia la textura según el umbral de color y recorta el sprite por ratio.
    this.hpBar.setTexture(hpBarTexture(ratio));
    const w = Math.max(0, Math.round(HP_BAR_W * ratio));
    if (w <= 0) {
      this.hpBar.setVisible(false);
    } else {
      this.hpBar.setVisible(true).setCrop(0, 0, w, HP_BAR_H);
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
    if (!this.expGfx) return;
    const { cfg } = this;
    const x = this.x + cfg.expX;
    const y = this.y + cfg.expY;
    const g = this.expGfx;
    g.clear();
    const fill = Math.round(cfg.expW * clamp01(ratio));
    if (fill > 0) {
      // Azul EXP FRLG sobre la pista de puntos horneada del PNG.
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
