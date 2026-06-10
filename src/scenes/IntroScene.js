// Módulo G — Intro tipo FRLG: el Profesor Galdós da la bienvenida, pide el
// nombre (DOM, máx. 7 mayúsculas) y ofrece los 3 iniciales. Al confirmar crea
// el SaveState inicial, lo guarda (Módulo F) y arranca el mundo.
import Phaser from 'phaser';
import { GAME_W, GAME_H, STARTERS, MONEY_START, SAVE_VERSION } from '../config.js';
import { drawBox } from '../ui/theme.js';
import { createMonster } from '../core/monster.js';
import { saveGame } from '../services/saves.js';
import { MAPS } from '../world/maps.js';
import { el, ROOT_CSS, PANEL_CSS, TITLE_CSS, INPUT_CSS, BTN_CSS } from '../ui/authForm.js';

const K = Phaser.Input.Keyboard.KeyCodes;

const LINES_BIENVENIDA = [
  '¡Hola! ¡Bienvenido al mundo de los Pokémon de Madrid!',
  'Mi nombre es Galdós. ¡Pero la gente me llama el Profesor Pokémon!',
  'Este mundo está habitado por criaturas llamadas Pokémon.',
  'Algunos viven en el Metro... otros en los parques... ¡y otros en las terrazas tomando el sol!',
  'La gente y los Pokémon conviven en Madrid desde tiempos inmemoriales.',
  'Yo estudio estas criaturas fascinantes como profesión.',
  'Pero antes de continuar... ¡Cuéntame sobre ti! ¿Cómo te llamas?',
];

const STARTER_DESC = {
  1: 'BULBASAUR, tipo Planta. Tu padre lo capturó en la Pradera de San Isidro, en plena verbena. ¡Tiene un espíritu que no se rinde!',
  4: 'CHARMANDER, tipo Fuego. Tu padre lo encontró una noche en los tejados de Malasaña. Ágil, misterioso y astuto.',
  7: 'SQUIRTLE, tipo Agua. Tu padre lo rescató de una estación de Metro abandonada. ¡Su caparazón aguanta lo que le echen!',
};

function linesTrasNombre(name) {
  return [
    `¡Ah, ${name}! ¡Qué nombre más castizo!`,
    'Verás... tu padre vino a verme justo antes de desaparecer. Me confió estas tres Pokébolas.',
    'Dijo: "Cuando cumpla los 11, dale a elegir uno de estos tres. Son especiales."',
    'Arturo era un gran entrenador. Y un mejor amigo.',
    'Ahora... es tu turno. ¡Adelante! ¡Elige tu compañero!',
  ];
}

function linesFinal(name, pkmn) {
  return [
    `¡Así que eliges a ${pkmn}! ¡Parece que le gustas!`,
    `Cuídalo bien, ${name}. Tu padre estaría orgulloso.`,
    `Ahora sí, ${name}... ¡Tu aventura por Madrid comienza!`,
    '¡Buena suerte, y recuerda...! ¡Hazte con todos!',
  ];
}

function buildNamePanel() {
  const root = el('div', ROOT_CSS);
  const panel = el('div', PANEL_CSS);
  const input = el('input', INPUT_CSS);
  input.maxLength = 7;
  input.value = 'ROJO';
  input.style.textTransform = 'uppercase';
  input.style.textAlign = 'center';
  const button = el('button', BTN_CSS, '¡ESE SOY YO!');
  panel.append(el('div', TITLE_CSS, '¿CÓMO TE LLAMAS?'), input, button);
  root.appendChild(panel);
  return { root, input, button };
}

export default class IntroScene extends Phaser.Scene {
  constructor() { super('Intro'); }

  preload() {
    for (const id of STARTERS) {
      const key = `pkmn_front_${id}`;
      if (!this.textures.exists(key)) this.load.image(key, `assets/sprites/pokemon/front/${id}.png`);
    }
  }

  create() {
    this.phase = 'dialog';
    this.phaseAt = 0;
    this.selIndex = 0;
    this.playerName = 'ROJO';
    this.drawBackdrop();
    this.prof = this.add.image(GAME_W / 2, 62, 'chars', 'scientist_down_0').setScale(2);
    this.cameras.main.fadeIn(400);
    this.input.keyboard.on('keydown', this.onKey, this);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onKey, this));
    this.say(LINES_BIENVENIDA, () => this.askName());
  }

  drawBackdrop() {
    const g = this.add.graphics();
    g.fillGradientStyle(0x404888, 0x404888, 0x181c34, 0x181c34, 1);
    g.fillRect(0, 0, GAME_W, GAME_H);
    g.fillStyle(0xffffff, 0.05);
    for (let y = 8; y < GAME_H; y += 16) g.fillRect(0, y, GAME_W, 1);
  }

  setPhase(phase) {
    this.phase = phase;
    this.phaseAt = this.time.now;
  }

  say(lines, next) {
    this.setPhase('dialog');
    this.scene.launch('Dialog', { lines, onClose: () => next() });
  }

  // --- Nombre del jugador (panel DOM) ---

  askName() {
    this.setPhase('name');
    this.input.keyboard.enabled = false;
    this.input.keyboard.disableGlobalCapture();
    const { root, input, button } = buildNamePanel();
    const listeners = [];
    const on = (node, type, fn) => { node.addEventListener(type, fn); listeners.push([node, type, fn]); };
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      for (const [node, type, fn] of listeners) node.removeEventListener(type, fn);
      root.remove();
      this.input.keyboard.enabled = true;
      this.input.keyboard.enableGlobalCapture();
      const clean = input.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, '').slice(0, 7);
      this.playerName = clean || 'ROJO';
      this.say(linesTrasNombre(this.playerName), () => this.showStarterSelect());
    };
    on(button, 'click', finish);
    on(root, 'keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') finish(); });
    document.body.appendChild(root);
    input.focus();
    input.select();
  }

  // --- Elección de inicial ---

  showStarterSelect() {
    this.setPhase('select');
    this.prof.setVisible(false);
    const pokedex = this.registry.get('pokedex');
    const white = { fontFamily: 'monospace', fontSize: '8px', color: '#f8f8f8', resolution: 2 };
    this.add.text(GAME_W / 2, 10, '¡ELIGE TU COMPAÑERO!',
      { fontFamily: 'monospace', fontSize: '10px', fontStyle: 'bold', color: '#FFD700', resolution: 2 }).setOrigin(0.5);
    this.starterSprites = STARTERS.map((id, i) => this.add.image(60 + i * 60, 62, `pkmn_front_${id}`));
    this.starterLabels = STARTERS.map((id, i) =>
      this.add.text(60 + i * 60, 96, pokedex[id - 1].name.toUpperCase(), white).setOrigin(0.5));
    this.selCursor = this.add.text(60, 22, '▼',
      { fontFamily: 'monospace', fontSize: '10px', color: '#FFD700', resolution: 2 }).setOrigin(0.5);
    drawBox(this, 2, 112, 236, 46);
    this.descText = this.add.text(10, 119, '',
      { fontFamily: 'monospace', fontSize: '8px', color: '#383838', resolution: 2, wordWrap: { width: 220 } });
    this.updateSelect();
  }

  updateSelect() {
    for (let i = 0; i < this.starterSprites.length; i++) {
      const active = i === this.selIndex;
      this.starterSprites[i].setScale(active ? 1 : 0.8);
      if (active) this.starterSprites[i].clearTint();
      else this.starterSprites[i].setTint(0x707080);
      this.starterLabels[i].setColor(active ? '#FFD700' : '#b0b0c0');
    }
    this.selCursor.x = 60 + this.selIndex * 60;
    this.descText.setText(STARTER_DESC[STARTERS[this.selIndex]]);
  }

  selectKey(code) {
    if (code === K.LEFT || code === K.A) {
      this.selIndex = (this.selIndex + STARTERS.length - 1) % STARTERS.length;
      this.updateSelect();
    } else if (code === K.RIGHT || code === K.D) {
      this.selIndex = (this.selIndex + 1) % STARTERS.length;
      this.updateSelect();
    } else if (this.isA(code)) {
      this.showConfirm();
    }
  }

  // --- Confirmación SÍ/NO ---

  showConfirm() {
    this.setPhase('confirm');
    this.confirmIndex = 0;
    const pokedex = this.registry.get('pokedex');
    const name = pokedex[STARTERS[this.selIndex] - 1].name.toUpperCase();
    this.descText.setText(`¿Te quedas con ${name}?`);
    this.confirmBox = drawBox(this, 178, 58, 52, 40);
    const style = { fontFamily: 'monospace', fontSize: '10px', color: '#383838', resolution: 2 };
    this.confirmItems = [
      this.add.text(198, 65, 'SÍ', style),
      this.add.text(198, 81, 'NO', style),
    ];
    this.confirmCursor = this.add.text(187, 65, '▶', style);
  }

  closeConfirm() {
    if (this.confirmBox && this.confirmBox.destroy) this.confirmBox.destroy();
    this.confirmItems.forEach((t) => t.destroy());
    this.confirmCursor.destroy();
    this.setPhase('select');
    this.updateSelect();
  }

  confirmKey(code) {
    const move = code === K.UP || code === K.W || code === K.DOWN || code === K.S;
    if (move) {
      this.confirmIndex = this.confirmIndex === 0 ? 1 : 0;
      this.confirmCursor.y = this.confirmItems[this.confirmIndex].y;
    } else if (code === K.X || code === K.SHIFT) {
      this.closeConfirm();
    } else if (this.isA(code)) {
      if (this.confirmIndex === 0) this.finishIntro();
      else this.closeConfirm();
    }
  }

  // --- Creación de la partida ---

  finishIntro() {
    this.setPhase('done');
    const id = STARTERS[this.selIndex];
    const pokedex = this.registry.get('pokedex');
    const starter = createMonster(pokedex, id, 5);
    const state = this.buildSaveState(id, starter);
    this.registry.set('save', state);
    this.say(linesFinal(this.playerName, pokedex[id - 1].name.toUpperCase()),
      () => this.departToWorld(state));
  }

  buildSaveState(id, starter) {
    const spawn = (MAPS.tetuan && MAPS.tetuan.playerSpawn) || { x: 14, y: 20 };
    return {
      version: SAVE_VERSION,
      player: { name: this.playerName, map: 'tetuan', x: spawn.x, y: spawn.y, dir: 'down', money: MONEY_START },
      party: [starter],
      bag: { 'poke-ball': 5, potion: 3, antidote: 1 },
      pokedex: { seen: [id], caught: [id] },
      flags: { introDone: true },
      playTimeS: 0,
    };
  }

  async departToWorld(state) {
    await saveGame(state);
    this.cameras.main.fadeOut(400);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('World'));
  }

  // --- Input ---

  isA(code) { return code === K.Z || code === K.SPACE || code === K.ENTER; }

  onKey(event) {
    if (this.time.now - this.phaseAt < 150) return;
    if (this.phase === 'select') this.selectKey(event.keyCode);
    else if (this.phase === 'confirm') this.confirmKey(event.keyCode);
  }
}
