import Phaser from 'phaser';
import { GAME_W, GAME_H, ZOOM } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import IntroScene from './scenes/IntroScene.js';
import WorldScene from './scenes/WorldScene.js';
import BattleScene from './scenes/BattleScene.js';
import MenuScene from './scenes/MenuScene.js';
import DialogScene from './scenes/DialogScene.js';
import { initTouchControls } from './ui/touchControls.js';

const forceCanvas = new URLSearchParams(location.search).has('canvas');

const config = {
  type: forceCanvas ? Phaser.CANVAS : Phaser.AUTO,
  parent: 'game',
  width: GAME_W,
  height: GAME_H,
  zoom: ZOOM,
  pixelArt: true,
  roundPixels: true,
  backgroundColor: '#181820',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_W,
    height: GAME_H,
  },
  scene: [BootScene, TitleScene, IntroScene, WorldScene, BattleScene, MenuScene, DialogScene],
};

window.game = new Phaser.Game(config);

// Controles táctiles (solo en dispositivos con pantalla táctil)
initTouchControls();

// Desbloqueo de audio: los botones de la carcasa GBA mandan KeyboardEvents SINTÉTICOS,
// que NO cuentan como gesto de usuario para la política de autoplay del navegador. Hay
// que reanudar el AudioContext desde un toque/clic/tecla REAL (capture=true para pillarlo
// antes que la carcasa). Tras el primer desbloqueo, se quitan los listeners.
function unlockAudio() {
  const snd = window.game && window.game.sound;
  const ctx = snd && snd.context;
  if (ctx && ctx.state === 'suspended') ctx.resume();
  if (snd && snd.locked && typeof snd.unlock === 'function') snd.unlock();
  if (ctx && ctx.state === 'running') {
    ['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((ev) =>
      window.removeEventListener(ev, unlockAudio, true));
  }
}
['pointerdown', 'touchstart', 'mousedown', 'keydown'].forEach((ev) =>
  window.addEventListener(ev, unlockAudio, true));
