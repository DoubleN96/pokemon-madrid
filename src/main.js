import Phaser from 'phaser';
import { GAME_W, GAME_H, ZOOM } from './config.js';
import BootScene from './scenes/BootScene.js';
import TitleScene from './scenes/TitleScene.js';
import IntroScene from './scenes/IntroScene.js';
import WorldScene from './scenes/WorldScene.js';
import BattleScene from './scenes/BattleScene.js';
import MenuScene from './scenes/MenuScene.js';
import DialogScene from './scenes/DialogScene.js';

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
