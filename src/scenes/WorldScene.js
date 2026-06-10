import Phaser from 'phaser';
import { TILE, WALK_MS, ENCOUNTER_RATE, SAVE_VERSION, MONEY_START } from '../config.js';
import { MAPS } from '../world/maps.js';
import { createMonster, healFull } from '../core/monster.js';
import { openShop } from '../ui/shop.js';
import { createMapLayers } from '../world/engine/mapRenderer.js';
import GridMover, { DIRS, tileToX, tileToY } from '../world/engine/GridMover.js';
import Npc from '../world/engine/Npc.js';
import { rollEncounter } from '../world/engine/encounters.js';

const RUN_FACTOR = 0.6;     // correr con B = WALK_MS × 0.6
const TURN_DELAY_MS = 90;   // toque corto = girarse sin andar (estilo GBA)

export default class WorldScene extends Phaser.Scene {
  constructor() { super('World'); }

  init(data) {
    this.startPos = data && data.map ? data : null;
  }

  create() {
    const save = this.ensureSave();
    const pos = this.startPos || save.player || {};
    this.mapId = MAPS[pos.map] ? pos.map : 'tetuan';
    this.mapData = MAPS[this.mapId];
    this.inputLocked = false;
    this.transitioning = false;
    this.turnUntil = 0;

    this.layers = createMapLayers(this, this.mapData);
    this.createPlayer(pos);
    this.npcs = (this.mapData.npcs || []).map((def) => new Npc(this, def));
    this.setupCamera();
    this.setupInput();
    this.persistPlayer();
    this.time.addEvent({
      delay: 1000,
      loop: true,
      callback: () => {
        const sv = this.registry.get('save');
        if (sv) sv.playTimeS = (sv.playTimeS || 0) + 1;
      },
    });

    this.events.off('wake', this.onWake, this);
    this.events.on('wake', this.onWake, this);
    this.events.off('resume', this.onResume, this);
    this.events.on('resume', this.onResume, this);
    this.cameras.main.fadeIn(250, 0, 0, 0);
  }

  createPlayer(pos) {
    const sameMap = pos.map === this.mapId;
    const spawn = this.mapData.playerSpawn || { x: 1, y: 1 };
    const x = sameMap && Number.isInteger(pos.x) ? pos.x : spawn.x;
    const y = sameMap && Number.isInteger(pos.y) ? pos.y : spawn.y;
    const sprite = this.add
      .sprite(tileToX(x), tileToY(y), 'chars', 'may_down_0')
      .setOrigin(0.5, 1);
    this.player = new GridMover(this, sprite, 'may', x, y, pos.dir || 'down');
  }

  setupCamera() {
    const cam = this.cameras.main;
    cam.setBounds(0, 0, this.mapData.width * TILE, this.mapData.height * TILE);
    cam.startFollow(this.player.sprite, true, 1, 1, 0, 8);
    cam.setDeadzone(16, 16);
  }

  setupInput() {
    this.cursors = this.input.keyboard.createCursorKeys();
    this.keys = this.input.keyboard.addKeys('W,A,S,D,Z,X,ENTER');
    // Acciones "tap" por eventos (no por JustDown): JustDown deja de detectar
    // tras dormir/despertar/reiniciar la escena (combate). El orden de escenas
    // (World antes que Menu/Dialog) + la guarda inputLocked evitan el input-bleed:
    // la pulsación que cierra un overlay llega a World con inputLocked aún activo.
    const kb = this.input.keyboard;
    const canAct = (ev) => !(ev && ev.repeat) && !this.transitioning && !this.inputLocked && !this.player.moving;
    kb.on('keydown-ENTER', (ev) => { if (canAct(ev)) this.openMenu(); });
    kb.on('keydown-Z', (ev) => { if (canAct(ev)) this.interact(); });
    kb.on('keydown-SPACE', (ev) => { if (canAct(ev)) this.interact(); });
  }

  update() {
    if (this.transitioning || this.inputLocked || this.player.moving) return;
    const dir = this.heldDir();
    if (!dir) { this.player.idle(); return; }
    this.tryStep(dir);
  }

  heldDir() {
    const c = this.cursors;
    const k = this.keys;
    if (c.left.isDown || k.A.isDown) return 'left';
    if (c.right.isDown || k.D.isDown) return 'right';
    if (c.up.isDown || k.W.isDown) return 'up';
    if (c.down.isDown || k.S.isDown) return 'down';
    return null;
  }

  isRunHeld() {
    return this.keys.X.isDown || this.cursors.shift.isDown;
  }

  tryStep(dir) {
    if (dir !== this.player.dir) {
      this.player.faceDir(dir);
      this.persistPlayer();
      this.turnUntil = this.time.now + TURN_DELAY_MS;
      return;
    }
    if (this.time.now < this.turnUntil) return;
    const d = DIRS[dir];
    const nx = this.player.tileX + d.dx;
    const ny = this.player.tileY + d.dy;
    if (this.isBlocked(nx, ny, this.player)) { this.player.idle(); return; }
    const duration = this.isRunHeld() ? WALK_MS * RUN_FACTOR : WALK_MS;
    this.player.step(dir, duration, () => this.onStepDone());
  }

  // Colisión contra bordes, capa `collision`, jugador y NPCs. `ignore` = mover que pregunta.
  isBlocked(x, y, ignore = null) {
    const m = this.mapData;
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return true;
    if (m.collision && m.collision[y] && m.collision[y][x] === 1) return true;
    if (this.player !== ignore && this.player.tileX === x && this.player.tileY === y) return true;
    return this.npcs.some((n) => n.mover !== ignore && n.mover.tileX === x && n.mover.tileY === y);
  }

  onStepDone() {
    this.persistPlayer();
    const x = this.player.tileX;
    const y = this.player.tileY;
    const warp = (this.mapData.warps || []).find((w) => w.x === x && w.y === y);
    if (warp) { this.useWarp(warp); return; }
    if (this.isTallGrass(x, y)) this.maybeEncounter();
  }

  isTallGrass(x, y) {
    const g = this.mapData.tallGrass;
    return !!(g && g[y] && g[y][x] === 1);
  }

  maybeEncounter() {
    const save = this.registry.get('save');
    if (!save || !Array.isArray(save.party) || save.party.length === 0) return;
    const enc = rollEncounter(this.mapData.encounters, ENCOUNTER_RATE);
    if (enc) this.startWildBattle(enc);
  }

  startWildBattle(enc) {
    this.inputLocked = true;
    this.player.idle();
    const wild = createMonster(this.registry.get('pokedex'), enc.species, enc.level);
    const cam = this.cameras.main;
    cam.flash(140, 248, 248, 248);
    cam.once('cameraflashcomplete', () => {
      this.scene.sleep('World');
      this.scene.launch('Battle', { wild });
    });
  }

  useWarp(warp) {
    this.transitioning = true;
    this.inputLocked = true;
    this.player.idle();
    const dest = { map: warp.toMap, x: warp.toX, y: warp.toY, dir: warp.dir || this.player.dir };
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.persistPlayer(dest);
      this.scene.restart(dest);
    });
  }

  interact() {
    const d = DIRS[this.player.dir];
    const tx = this.player.tileX + d.dx;
    const ty = this.player.tileY + d.dy;
    const npc = this.npcs.find((n) => n.isAt(tx, ty));
    if (!npc) {
      const sign = (this.mapData.signs || []).find((g) => g.x === tx && g.y === ty);
      if (!sign) return;
      this.inputLocked = true;
      this.talk(sign.lines, () => { this.inputLocked = false; });
      return;
    }
    this.inputLocked = true;
    npc.paused = true;
    npc.facePlayer(this.player.dir);
    if (npc.def.trainer && !this.isTrainerBeaten(npc.def.trainer)) this.startTrainerBattle(npc);
    else if (npc.def.heal) this.healInteraction(npc);
    else if (npc.def.shop) this.shopInteraction(npc);
    else if (npc.def.trainer) this.talk(npc.def.trainer.win, () => this.endInteraction(npc));
    else this.talk(npc.def.dialog, () => this.endInteraction(npc));
  }

  // ¿Ya derrotado este entrenador? (bandera única en save.flags).
  isTrainerBeaten(trainer) {
    const save = this.registry.get('save');
    return !!(save && save.flags && trainer.flag && save.flags[trainer.flag] === true);
  }

  // Lanza un combate de entrenador: persiste posición, bloquea input y duerme
  // World mientras Battle corre en overlay. Reutilizable desde NPC o desde tests.
  startTrainerBattle(npcOrTrainer) {
    const trainer = npcOrTrainer && npcOrTrainer.def
      ? npcOrTrainer.def.trainer
      : npcOrTrainer;
    if (!trainer) return;
    const save = this.registry.get('save');
    if (!save || !Array.isArray(save.party) || save.party.length === 0) {
      // Sin equipo no se puede combatir: restaurar estado para no dejar soft-lock.
      this.inputLocked = false;
      if (npcOrTrainer && npcOrTrainer.def) npcOrTrainer.paused = false;
      return;
    }
    if (!save.flags) save.flags = {};
    this.inputLocked = true;
    this.transitioning = true;
    if (this.player) this.player.idle();
    this.persistPlayer();
    const cam = this.cameras.main;
    cam.flash(140, 248, 248, 248);
    cam.once('cameraflashcomplete', () => {
      this.scene.sleep('World');
      this.scene.launch('Battle', { trainer });
    });
  }

  talk(lines, onClose) {
    const text = Array.isArray(lines) && lines.length ? lines : ['...'];
    this.scene.launch('Dialog', { lines: text, onClose });
  }

  // Encadena un segundo diálogo dejando que el anterior termine de cerrarse.
  chainTalk(lines, onClose) {
    this.time.delayedCall(60, () => this.talk(lines, onClose));
  }

  endInteraction(npc) {
    if (npc) npc.paused = false;
    this.inputLocked = false;
  }

  healInteraction(npc) {
    this.talk(npc.def.dialog, () => {
      const save = this.registry.get('save');
      ((save && save.party) || []).forEach(healFull);
      this.chainTalk(
        ['¡Tus Pokémon están como nuevos!', '¡Que te vaya bien, y mucho ojo por ahí!'],
        () => this.endInteraction(npc),
      );
    });
  }

  shopInteraction(npc) {
    this.talk(npc.def.dialog, () => {
      this.time.delayedCall(60, () => {
        openShop(this, { onClose: () => this.endInteraction(npc) });
      });
    });
  }

  openMenu() {
    this.inputLocked = true;
    this.player.idle();
    this.scene.launch('Menu');
    const menu = this.scene.get('Menu');
    const unlock = () => {
      menu.events.off('shutdown', unlock);
      menu.events.off('sleep', unlock);
      this.inputLocked = false;
    };
    menu.events.once('shutdown', unlock);
    menu.events.once('sleep', unlock);
  }

  // Vuelta desde Battle (sleep/wake): registry.save ya viene actualizado por Battle.
  onWake(sys, data) {
    this.whiteout = this.registry.get('whiteout') === true;
    this.registry.set('whiteout', false);
    this.transitioning = false;
    this.inputLocked = false;
    this.player.idle();
    // Reanuda NPCs que quedaron pausados al iniciar un combate de entrenador.
    (this.npcs || []).forEach((n) => { n.paused = false; });
    this.cameras.main.fadeIn(250, 0, 0, 0);
    const save = this.registry.get('save');
    if (!save || !save.player) return;
    this.handleDefeat(save, data);
    this.syncToSavedPosition(save);
  }

  onResume() {
    this.inputLocked = false;
  }

  // Derrota total: curar y recolocar en el healSpawn de Tetuán (red de seguridad
  // por si Battle solo dejó el equipo a 0 sin recolocar).
  handleDefeat(save, data) {
    const party = save.party || [];
    const flagged = !!(data && (data.defeat || data.result === 'lose')) || this.whiteout === true;
    const wiped = party.length > 0 && party.every((m) => m.currentHp <= 0);
    if (!flagged && !wiped) return;
    party.forEach(healFull);
    const home = MAPS.tetuan;
    const spawn = home.healSpawn || home.playerSpawn || { x: 1, y: 1 };
    Object.assign(save.player, { map: 'tetuan', x: spawn.x, y: spawn.y, dir: 'down' });
  }

  syncToSavedPosition(save) {
    const p = save.player;
    const moved = p.map !== this.mapId
      || p.x !== this.player.tileX
      || p.y !== this.player.tileY;
    if (!moved) return;
    this.transitioning = true;
    this.scene.restart({ map: p.map, x: p.x, y: p.y, dir: p.dir || 'down' });
  }

  // Persiste posición en registry.save.player en cada cambio de tile/dirección.
  persistPlayer(override) {
    const save = this.registry.get('save');
    if (!save || !save.player) return;
    const next = override || {
      map: this.mapId,
      x: this.player.tileX,
      y: this.player.tileY,
      dir: this.player.dir,
    };
    Object.assign(save.player, next);
  }

  // Red de seguridad para desarrollo en paralelo: Title/Intro son quienes crean el save.
  ensureSave() {
    let save = this.registry.get('save');
    if (save) return save;
    const spawn = (MAPS.tetuan && MAPS.tetuan.playerSpawn) || { x: 1, y: 1 };
    save = {
      version: SAVE_VERSION,
      player: { name: 'ROJO', map: 'tetuan', x: spawn.x, y: spawn.y, dir: 'down', money: MONEY_START },
      party: [],
      bag: {},
      pokedex: { seen: [], caught: [] },
      flags: {},
      playTimeS: 0,
    };
    this.registry.set('save', save);
    return save;
  }
}
