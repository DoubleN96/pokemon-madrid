// Módulo G — Pantalla de título: skyline de Madrid al atardecer dibujado por
// código, logo, "PULSA A", panel de cuenta (DOM) y menú CONTINUAR/NUEVA PARTIDA.
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { drawBox } from '../ui/theme.js';
import { showAuthForm } from '../ui/authForm.js';
import { loadGame } from '../services/saves.js';
import { playMusic } from '../audio/AudioManager.js';

const K = Phaser.Input.Keyboard.KeyCodes;
const SKY_TOP = 0x87ceeb;
const SKY_BOTTOM = 0xff7f50;
const HORIZON_Y = 110;
const FAR_COLOR = 0x5a4068;
const NEAR_COLOR = 0x2d2440;
const GROUND_COLOR = 0x1c1830;
const SUN_COLOR = 0xffe066;

// Siluetas cercanas: las Cuatro Torres (4 altas y finas a la izquierda),
// edificios variados y uno con cúpula a la derecha.
const NEAR_BUILDINGS = [
  { x: 8, w: 9, h: 52 }, { x: 20, w: 9, h: 62 }, { x: 32, w: 9, h: 56 },
  { x: 44, w: 9, h: 66 }, // Cuatro Torres
  { x: 62, w: 16, h: 30 }, { x: 80, w: 12, h: 38 }, { x: 95, w: 18, h: 26 },
  { x: 118, w: 14, h: 34 }, { x: 136, w: 16, h: 24 },
  { x: 196, w: 20, h: 30 }, { x: 220, w: 16, h: 40 },
];

const FAR_BUILDINGS = [
  { x: 0, w: 14, h: 24 }, { x: 54, w: 12, h: 40 }, { x: 76, w: 10, h: 46 },
  { x: 108, w: 12, h: 42 }, { x: 130, w: 10, h: 38 }, { x: 152, w: 14, h: 30 },
  { x: 186, w: 12, h: 44 }, { x: 214, w: 12, h: 34 }, { x: 230, w: 10, h: 46 },
];

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.phase = 'title';
    this.phaseAt = 0;
    this.menuIndex = 0;
    this.pendingState = null;
    playMusic(this, 'title');
    this.drawSky();
    this.drawSkyline();
    this.drawLogo();
    this.cameras.main.fadeIn(400);
    this.input.keyboard.on('keydown', this.onKey, this);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onKey, this));
  }

  drawSky() {
    const g = this.add.graphics();
    g.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_BOTTOM, SKY_BOTTOM, 1);
    g.fillRect(0, 0, GAME_W, HORIZON_Y);
    g.fillStyle(SUN_COLOR, 0.35);
    g.fillCircle(176, 98, 18); // halo del sol poniente
    g.fillStyle(SUN_COLOR, 1);
    g.fillCircle(176, 98, 13);
  }

  drawSkyline() {
    const g = this.add.graphics();
    g.fillStyle(FAR_COLOR, 0.85);
    for (const b of FAR_BUILDINGS) g.fillRect(b.x, HORIZON_Y - b.h, b.w, b.h);
    g.fillStyle(NEAR_COLOR, 1);
    for (const b of NEAR_BUILDINGS) g.fillRect(b.x, HORIZON_Y - b.h, b.w, b.h);
    // Remate inclinado de una de las Cuatro Torres
    g.fillTriangle(44, HORIZON_Y - 66, 53, HORIZON_Y - 66, 53, HORIZON_Y - 74);
    // Edificio con cúpula (tipo Metrópolis)
    g.fillRect(160, HORIZON_Y - 26, 28, 26);
    g.fillCircle(174, HORIZON_Y - 28, 9);
    g.fillRect(173, HORIZON_Y - 42, 2, 6); // aguja
    this.drawWindows(g);
    g.fillStyle(GROUND_COLOR, 1);
    g.fillRect(0, HORIZON_Y, GAME_W, GAME_H - HORIZON_Y);
  }

  drawWindows(g) {
    g.fillStyle(SUN_COLOR, 0.9);
    for (const b of NEAR_BUILDINGS) {
      for (let i = 0; i < Math.floor(b.h / 14); i++) {
        g.fillRect(b.x + 2, HORIZON_Y - b.h + 4 + i * 14, 2, 3);
        if (b.w > 10) g.fillRect(b.x + b.w - 4, HORIZON_Y - b.h + 8 + i * 14, 2, 3);
      }
    }
  }

  drawLogo() {
    const gold = { fontFamily: 'monospace', fontSize: '28px', fontStyle: 'bold', color: '#FFD700', resolution: 2 };
    const t1 = this.add.text(GAME_W / 2, 32, 'POKÉMON', gold).setOrigin(0.5);
    const t2 = this.add.text(GAME_W / 2, 60, 'MADRID', gold).setOrigin(0.5);
    t1.setShadow(2, 2, '#5a3a00', 0, true, true);
    t2.setShadow(2, 2, '#5a3a00', 0, true, true);
    const sub = this.add.text(GAME_W / 2, 82, 'Edición Castiza',
      { fontFamily: 'monospace', fontSize: '11px', fontStyle: 'bold', color: '#e03028', resolution: 2 }).setOrigin(0.5);
    sub.setShadow(1, 1, '#5a1010', 0, true, true);
    this.blink = this.add.text(GAME_W / 2, 134, 'PULSA A',
      { fontFamily: 'monospace', fontSize: '10px', color: '#f8f8f8', resolution: 2 }).setOrigin(0.5);
    this.time.addEvent({
      delay: 450, loop: true,
      callback: () => { if (this.phase === 'title') this.blink.setVisible(!this.blink.visible); },
    });
  }

  setPhase(phase) {
    this.phase = phase;
    this.phaseAt = this.time.now;
  }

  isA(code) { return code === K.Z || code === K.SPACE || code === K.ENTER; }

  onKey(event) {
    if (this.time.now - this.phaseAt < 150) return;
    if (this.phase === 'title' && this.isA(event.keyCode)) this.openAuth();
    else if (this.phase === 'menu') this.menuKey(event.keyCode);
  }

  openAuth() {
    this.setPhase('auth');
    this.blink.setVisible(false);
    this.input.keyboard.enabled = false;
    this.input.keyboard.disableGlobalCapture();
    showAuthForm((session) => this.onAuthDone(session));
  }

  async onAuthDone(session) {
    this.registry.set('session', session);
    this.input.keyboard.enabled = true;
    this.input.keyboard.enableGlobalCapture();
    const res = await loadGame();
    if (res.ok && res.state) this.showContinueMenu(res.state);
    else this.scene.start('Intro');
  }

  showContinueMenu(state) {
    this.pendingState = state;
    this.menuIndex = 0;
    this.setPhase('menu');
    drawBox(this, 58, 96, 124, 42);
    const style = { fontFamily: 'monospace', fontSize: '10px', color: '#383838', resolution: 2 };
    this.menuItems = [
      this.add.text(80, 104, 'CONTINUAR', style),
      this.add.text(80, 120, 'NUEVA PARTIDA', style),
    ];
    this.cursor = this.add.text(68, 104, '▶', style);
  }

  menuKey(code) {
    const move = code === K.UP || code === K.W || code === K.DOWN || code === K.S;
    if (move) {
      this.menuIndex = this.menuIndex === 0 ? 1 : 0;
      this.cursor.y = this.menuItems[this.menuIndex].y;
    } else if (this.isA(code)) {
      this.confirmMenu();
    }
  }

  confirmMenu() {
    this.setPhase('done');
    if (this.menuIndex === 0) {
      this.registry.set('save', this.pendingState);
      this.scene.start('World');
    } else {
      this.scene.start('Intro');
    }
  }
}
