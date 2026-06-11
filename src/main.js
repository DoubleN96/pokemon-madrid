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
import { resumeAudio } from './audio/AudioManager.js';

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

// Desbloqueo de audio (robusto para móvil): los botones de la carcasa GBA mandan
// KeyboardEvents SINTÉTICOS, que NO cuentan como gesto de usuario para la política de
// autoplay. Hay que reanudar el AudioContext desde un toque/clic/tecla REAL (capture=true
// para pillarlo antes que la carcasa). Además, la música se lanza en scene.create() (fuera
// de gesto): si el contexto estaba suspendido, la pista queda ENCOLADA y no suena, así que
// resumeAudio() la RE-LANZA. Mantenemos los listeners permanentemente (la llamada es barata
// e idempotente) para cubrir el caso de que el primer toque ocurra antes de que el juego
// haya pedido música, y para sobrevivir a re-suspensiones del contexto en segundo plano.
function unlockAudio() {
  if (window.game) resumeAudio(window.game);
}
['pointerdown', 'touchstart', 'mousedown', 'click', 'keydown'].forEach((ev) =>
  window.addEventListener(ev, unlockAudio, true));
