// Módulo INTRO-PISO — Intro tipo FRLG re-tematizada al lore de "Pokémon Piso":
// el jugador ES MARCELINO y su socio Iván "FinTips" hace de mentor, entregándole
// el primer Pokémon como "una inversión de alto riesgo". Pide el nombre (DOM,
// máx. 9 mayúsculas, default MARCELINO) y ofrece los 3 iniciales. Al confirmar
// crea el SaveState inicial, lo guarda (Módulo F) y arranca el mundo.
// IMPORTANTE: solo cambian los textos/lore y el nombre por defecto; la mecánica,
// la API de la escena y el flujo a 'World' son idénticos al original.
import Phaser from 'phaser';
import { GAME_W, GAME_H, STARTERS, MONEY_START, SAVE_VERSION } from '../config.js';
import { drawBox, bmText } from '../ui/theme.js';
import { createMonster } from '../core/monster.js';
import { createPc } from '../core/pcStorage.js';
import { saveGame } from '../services/saves.js';
import { MAPS } from '../world/maps.js';
import { el, ROOT_CSS, PANEL_CSS, TITLE_CSS, INPUT_CSS, BTN_CSS } from '../ui/authForm.js';

const K = Phaser.Input.Keyboard.KeyCodes;

const LINES_BIENVENIDA = [
  '¡Eh, eh, eh! Bienvenido al mundo de los Pokémon de Madrid, bro.',
  'Soy Iván. Iván "FinTips", para los amigos. Tu socio financiero de confianza.',
  'Aquí los Pokémon son como los activos: unos suben en el Metro, otros se desploman en los parques...',
  '...y otros echan la siesta en una terraza al sol. Cada bicho es una posición. Y toda posición tiene su ROI.',
  'Yo lo analizo todo desde la barrera, buscando rentabilidad. Para eso me pagan... bueno, me pagaría yo.',
  'Y tú, majo... tú vives en un piso de Bravo Murillo, en Tetuán, ahogado entre Excels y desorden vital.',
  'Tu compañero de piso es Álvarín, "el Vicepresidente del Humo". Se cree el Campeón porque lo tiene TODO optimizado: lógica pura, cero improvisación.',
  'Pues ha llegado la hora de bajarle los humos. Vas a poner orden en este caos a tu manera y a demostrarle que la improvisación le gana a la lógica.',
  'Pero antes de meter capital... cuéntame, ¿cómo te llamas? Que lo apunto en el Excel.',
];

const STARTER_DESC = {
  1: 'BULBASAUR, tipo Planta. Inversión a largo plazo, bro: crece despacio pero compone como un fondo indexado. ¡No se rinde ni a tiros!',
  4: 'CHARMANDER, tipo Fuego. Volátil y agresivo, puro growth: si lo riegas bien, se revaloriza una barbaridad. Alto riesgo, alta recompensa.',
  7: 'SQUIRTLE, tipo Agua. Activo defensivo, majo: aguanta cualquier corrección de mercado sin pestañear. Caparazón a prueba de hostias.',
};

function linesTrasNombre(name) {
  return [
    `¡Ahí va, ${name}! Nombre con caché. Eso revaloriza la marca personal, bro.`,
    `Mira, ${name}... he echado un ojo a tus números y tienes que diversificar la cartera YA. Necesitas un primer activo.`,
    'Te he traído cinco Poké Balls y unas pociones. Considéralo capital semilla: una inversión de alto riesgo en tu propia aventura.',
    'Te lo presto, pero ojo: esto NO es un regalo, es una posición. Cuando se revalorice, me debes el dividendo en cañas.',
    'Y un consejo de socio: si tu Pokémon flojea en combate, no seas rácano y úsale una poción. Más vale gastar que perder la posición entera.',
    `Venga, ${name}, abre posición. ¡Elige a tu compañero!`,
  ];
}

function linesFinal(name, pkmn) {
  return [
    `¡Así que abres posición con ${pkmn}! Buena entrada, bro. El mercado te lo va a premiar.`,
    `Cuídalo bien, ${name}. Un activo bien gestionado vale más que mil Excels de Álvarín.`,
    `Ahora sí, ${name}... sal de ese piso de Bravo Murillo y pon orden en el caos de Madrid.`,
    'Demuéstrale a Álvarín que la improvisación le gana a la lógica. ¡Y hazte con todos, que diversificar es la clave!',
  ];
}

function buildNamePanel() {
  const root = el('div', ROOT_CSS);
  const panel = el('div', PANEL_CSS);
  const input = el('input', INPUT_CSS);
  input.maxLength = 9;
  input.value = 'MARCELINO';
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
    this.playerName = 'MARCELINO';
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
      const clean = input.value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ0-9]/g, '').slice(0, 9);
      this.playerName = clean || 'MARCELINO';
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
    // Título y etiquetas con FUENTE BITMAP nítida (frlg10 compacta).
    bmText(this, GAME_W / 2, 8, '¡ELIGE TU COMPAÑERO!', { small: true, color: '#FFD700', origin: 0.5 });
    this.starterSprites = STARTERS.map((id, i) => this.add.image(60 + i * 60, 62, `pkmn_front_${id}`));
    this.starterLabels = STARTERS.map((id, i) =>
      bmText(this, 60 + i * 60, 96, pokedex[id - 1].name.toUpperCase(), { small: true, color: '#f8f8f8', origin: 0.5 }));
    this.selCursor = bmText(this, 60, 22, '▼', { small: true, color: '#FFD700', origin: 0.5 });
    // Caja de descripción: texto bitmap compacto (frlg10) — cabe el texto largo del
    // inicial en la caja de 46px de alto y se lee claro/nítido.
    drawBox(this, 2, 112, 236, 46);
    this.descText = bmText(this, 9, 117, '', { small: true, lineSpacing: 2, wrap: 222 });
    this.updateSelect();
  }

  updateSelect() {
    for (let i = 0; i < this.starterSprites.length; i++) {
      const active = i === this.selIndex;
      this.starterSprites[i].setScale(active ? 1 : 0.8);
      if (active) this.starterSprites[i].clearTint();
      else this.starterSprites[i].setTint(0x707080);
      // BitmapText: el color es tinte (setTint), no setColor.
      this.starterLabels[i].setTint(active ? 0xffd700 : 0xb0b0c0);
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
    this.confirmItems = [
      bmText(this, 198, 64, 'SÍ', { small: true }),
      bmText(this, 198, 80, 'NO', { small: true }),
    ];
    this.confirmCursor = bmText(this, 186, 64, '▶', { small: true });
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
    // El rival (Álvaro) recibe el inicial FUERTE contra el del jugador (mecánica clásica
    // de Pokémon), para que el primer combate sea justo y reñido elijas lo que elijas.
    const RIVAL_COUNTER = { 1: 4, 4: 7, 7: 1 }; // Bulbasaur→Charmander, Charmander→Squirtle, Squirtle→Bulbasaur
    return {
      version: SAVE_VERSION,
      player: { name: this.playerName, map: 'tetuan', x: spawn.x, y: spawn.y, dir: 'down', money: MONEY_START },
      party: [starter],
      bag: { 'poke-ball': 5, potion: 3, antidote: 1 },
      pokedex: { seen: [id], caught: [id] },
      flags: { introDone: true, rivalStarter: RIVAL_COUNTER[id] || 4 },
      // Opciones de partida. Reparto de Experiencia arranca DESACTIVADO (clásico).
      options: { expShare: false },
      // PC de almacenamiento "EL PC DE FINTIPS" (cajas de Bill): arranca vacío.
      pc: createPc(),
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
