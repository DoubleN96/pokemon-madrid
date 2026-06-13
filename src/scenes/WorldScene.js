import Phaser from 'phaser';
import { TILE, WALK_MS, ENCOUNTER_RATE, SAVE_VERSION, MONEY_START } from '../config.js';
import { MAPS } from '../world/maps.js';
import { createMonster, healFull } from '../core/monster.js';
import { createPc, ensurePc } from '../core/pcStorage.js';
import { ensureWallet, ITEM_NAMES } from '../core/items.js';
import { openShop } from '../ui/shop.js';
import { portraitForNpc } from '../data/portraits.js';
import { playMusic, sfx } from '../audio/AudioManager.js';
import { createMapLayers } from '../world/engine/mapRenderer.js';
import GridMover, { DIRS, tileToX, tileToY } from '../world/engine/GridMover.js';
import Npc from '../world/engine/Npc.js';
import { rollEncounter } from '../world/engine/encounters.js';
import { playGrassRustle } from '../world/grassRustle.js';
import { whiteoutDestination, healPoint } from '../world/respawn.js';
import {
  FIELD_MOVES, OBSTACLE_TO_MOVE, OBSTACLE_TILES,
  ensureFieldState, markVisited, isObstacleCleared, markObstacleCleared,
  obstacleAt, canUseFieldMove, whyCannotUse, firstMonForMove,
} from '../world/fieldMoves.js';
import PcScene from './PcScene.js';
import MapScene from './MapScene.js';

// Tile de AGUA del overworld (mismo GID que usan los constructores de mapa). Sirve
// para detectar al chocar si la casilla bloqueada es MAR/agua (→ ofrecer Surf).
const WATER_TILE = 4183;

const RUN_FACTOR = 0.6;     // correr con B = WALK_MS × 0.6
const BIKE_FACTOR = 0.35;   // moto = WALK_MS × 0.35 (mucho más rápido)
const TURN_DELAY_MS = 90;   // toque corto = girarse sin andar (estilo GBA)
const PLAYER_FOOT = 'marcelino'; // sprite del jugador a pie
// Sprite del jugador montado en moto/bici. Ahora es 'marcelino_bike': el sprite
// PROPIO de Marcelino montado en una bici, generado por composición sobre su
// torso real del atlas + una bici dibujada en pixel-art con su misma paleta
// (scripts/gen_marcelino_bike.py + pack_marcelino_bike.py). 4 direcciones, 3
// frames/dir con pedaleo, recortado a la celda 16x24 sin cortes ni fondo sucio.
// Sustituye a los antiguos frames `bike_*` que estaban rotos (sprite genérico
// "Red", mal recortado). Robusto: si el atlas no tuviera estos frames,
// GridMover.setCharKey ignora el cambio y se sigue jugando a pie.
const PLAYER_BIKE = 'marcelino_bike';

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
    // Música: rutas = overworld; pueblos/interiores = town.
    playMusic(this, /ruta|route|ruta_/i.test(this.mapId) ? 'overworld' : 'town');
    this.inputLocked = false;
    this.transitioning = false;
    this.turnUntil = 0;

    this.layers = createMapLayers(this, this.mapData);
    // MOs: normaliza el estado de campo del save (obstáculos retirados, zonas
    // visitadas), registra esta zona como VISITADA (para el Vuelo) y refleja en el
    // render los obstáculos ya retirados en partidas anteriores. NO altera la
    // navegación: solo limpia tiles que el jugador ya había despejado.
    ensureFieldState(save);
    if (this.mapData.healSpawn || (this.mapData.warps || []).length) markVisited(save, this.mapId);
    this.applyClearedObstacles(save);
    this.surfing = false;
    this.createPlayer(pos);
    this.syncPlayerMount();
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
      .sprite(tileToX(x), tileToY(y), 'chars', 'marcelino_down_0')
      .setOrigin(0.5, 1);
    this.player = new GridMover(this, sprite, PLAYER_FOOT, x, y, pos.dir || 'down');
  }

  // Refleja en el sprite del jugador si va montado en moto/bici (save.flags.riding):
  // montado → frames `bike_*`, a pie → `marcelino_*`. Idempotente y seguro: si el
  // atlas no tuviera los frames de bici, GridMover.setCharKey ignora el cambio y el
  // jugador sigue jugable a pie. Se llama al crear la escena y al volver de overlays
  // (menú) o de combate, para que el estado se vea reflejado al instante.
  syncPlayerMount() {
    if (!this.player) return;
    const save = this.registry.get('save');
    const riding = !!(save && save.flags && save.flags.riding);
    this.player.setCharKey(riding ? PLAYER_BIKE : PLAYER_FOOT);
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
    if (this.isBlocked(nx, ny, this.player)) {
      this.player.idle();
      // MO contextual: si la casilla bloqueada es un obstáculo de campo (arbusto,
      // roca) o agua de mar, ofrecer usar la MO correspondiente (estilo FRLG). Solo
      // se ofrece una vez por choque (debounce con _bumpAt) para no spamear.
      if (this.maybeFieldMovePrompt(nx, ny)) return;
      if (this.time.now > (this._bumpAt || 0)) { sfx(this, 'bump', { volume: 0.5 }); this._bumpAt = this.time.now + 320; }
      return;
    }
    const save = this.registry.get('save');
    const riding = !!(save && save.flags && save.flags.riding);
    const factor = riding ? BIKE_FACTOR : (this.isRunHeld() ? RUN_FACTOR : 1);
    const duration = WALK_MS * factor;
    this.player.step(dir, duration, () => this.onStepDone());
  }

  // Colisión contra bordes, capa `collision`, jugador y NPCs. `ignore` = mover que pregunta.
  isBlocked(x, y, ignore = null) {
    const m = this.mapData;
    if (x < 0 || y < 0 || x >= m.width || y >= m.height) return true;
    // SURF: mientras se surfea, el AGUA de mar deja de bloquear (se navega sobre
    // ella). El resto de colisiones (bordes, edificios, NPCs) siguen vigentes.
    if (ignore === this.player && this.surfing && this.isWaterTile(x, y)) {
      if (this.player !== ignore && this.player.tileX === x && this.player.tileY === y) return true;
      return this.npcs.some((n) => n.mover !== ignore && n.mover.tileX === x && n.mover.tileY === y);
    }
    if (m.collision && m.collision[y] && m.collision[y][x] === 1) return true;
    if (this.player !== ignore && this.player.tileX === x && this.player.tileY === y) return true;
    return this.npcs.some((n) => n.mover !== ignore && n.mover.tileX === x && n.mover.tileY === y);
  }

  onStepDone() {
    this.persistPlayer();
    const x = this.player.tileX;
    const y = this.player.tileY;
    // SURF: al pisar TIERRA firme (no agua) tras estar surfeando, se desembarca.
    if (this.surfing && !this.isWaterTile(x, y)) this.surfing = false;
    const warp = (this.mapData.warps || []).find((w) => w.x === x && w.y === y);
    if (warp) { this.useWarp(warp); return; }
    if (this.isTallGrass(x, y)) {
      // Animación de hojas a los pies (justo por debajo del jugador en depth).
      playGrassRustle(this, x, y, this.player.sprite.depth - 0.5);
      this.maybeEncounter();
    }
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
      // Los encuentros salvajes ocurren en hierba alta → fondo FRLG 'grass'.
      this.scene.launch('Battle', { wild, terrain: 'grass' });
    });
  }

  // ¿Cumple el jugador el requisito de un warp con puerta (warp.require)?
  // Hoy solo se usa `require.badges` (nº de medallas para la Liga Chamberí), pero
  // queda abierto a otros gates futuros. Si NO se cumple, el warp no se usa.
  meetsWarpRequire(req) {
    if (!req) return true;
    const save = this.registry.get('save');
    if (typeof req.badges === 'number') {
      const badges = (save && save.flags && Array.isArray(save.flags.badges)) ? save.flags.badges : [];
      if (badges.length < req.badges) return false;
    }
    return true;
  }

  useWarp(warp) {
    // Puerta condicionada (Liga Chamberí, etc.): si el jugador no cumple el
    // requisito, se muestra el aviso y NO se teletransporta. El jugador queda
    // sobre la baldosa (caminable) y puede retroceder con normalidad.
    if (warp.require && !this.meetsWarpRequire(warp.require)) {
      this.inputLocked = true;
      this.player.idle();
      const lines = (warp.require.lines && warp.require.lines.length)
        ? warp.require.lines
        : ['La puerta está cerrada.'];
      this.talk(lines, () => { this.inputLocked = false; });
      return;
    }
    this.transitioning = true;
    this.inputLocked = true;
    this.player.idle();
    sfx(this, 'door', { volume: 0.6 });
    const dest = { map: warp.toMap, x: warp.toX, y: warp.toY, dir: warp.dir || this.player.dir };
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.persistPlayer(dest);
      this.scene.restart(dest);
    });
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MOVIMIENTOS DE CAMPO (MOs) — uso contextual al chocar y desde el menú.
  // ─────────────────────────────────────────────────────────────────────────

  // Al CREAR la escena: limpia del render los obstáculos que el jugador ya retiró
  // en una partida anterior (persistidos en save.flags.fieldObstacles). Borra el
  // tile de deco y libera la colisión, sin tocar el resto del mapa.
  applyClearedObstacles(save) {
    const obstacles = (this.mapData && this.mapData.fieldObstacles) || [];
    for (const o of obstacles) {
      if (isObstacleCleared(save, this.mapId, o.x, o.y)) this.removeObstacleTile(o.x, o.y);
    }
  }

  // Borra el tile de un obstáculo del render (capa deco) y libera su colisión EN
  // VIVO (no muta MAPS: la colisión vive en this.mapData, compartido por la escena).
  removeObstacleTile(x, y) {
    if (this.mapData.collision[y]) this.mapData.collision[y][x] = 0;
    if (this.mapData.layers.deco[y]) this.mapData.layers.deco[y][x] = -1;
    const layer = this.layers && this.layers.deco;
    if (layer && layer.removeTileAt) layer.removeTileAt(x, y, true);
  }

  // ¿Es la casilla (x,y) agua de mar? (tile WATER en la capa ground). Sirve para
  // ofrecer Surf al chocar contra el mar.
  isWaterTile(x, y) {
    const g = this.mapData.layers && this.mapData.layers.ground;
    return !!(g && g[y] && g[y][x] === WATER_TILE);
  }

  // Si la casilla bloqueada (x,y) es un obstáculo de MO (arbusto/roca) o agua de
  // mar, ofrece usar la MO. Devuelve true si se mostró un prompt (para no sonar el
  // bump). Si no se puede usar la MO (sin objeto/medalla/Pokémon), explica por qué.
  maybeFieldMovePrompt(x, y) {
    if (this.time.now <= (this._bumpAt || 0)) return false;
    const ob = obstacleAt(this.mapData, x, y);
    let moveId = null;
    if (ob) moveId = OBSTACLE_TO_MOVE[ob.kind];
    else if (this.isWaterTile(x, y)) moveId = OBSTACLE_TO_MOVE.water;
    if (!moveId) return false;
    this._bumpAt = this.time.now + 600;
    const save = this.registry.get('save');
    const def = FIELD_MOVES[moveId];
    // Surf: solo si NO estamos ya surfeando hacia esa misma agua (evita re-prompt).
    if (moveId === 'surf' && this.surfing) return false;
    if (!canUseFieldMove(this.registry.get('pokedex'), save, moveId)) {
      // Descripción del obstáculo + por qué no puedes (mensaje claro estilo FRLG).
      this.inputLocked = true;
      const what = this.obstacleFlavor(moveId);
      const why = whyCannotUse(this.registry.get('pokedex'), save, moveId);
      this.talk([what, why], () => { this.inputLocked = false; });
      return true;
    }
    // Sí puede: pregunta SÍ/NO antes de usar (estilo FRLG).
    this.inputLocked = true;
    const what = this.obstacleFlavor(moveId);
    this.scene.launch('Dialog', {
      lines: [what, `¿Quieres usar ${def.name}?`],
      prompt: {
        options: ['SÍ', 'NO'],
        defaultIndex: 1,
        onSelect: (i) => { if (i === 0) this._pendingFieldUse = { moveId, x, y }; },
      },
      onClose: () => {
        this.inputLocked = false;
        const p = this._pendingFieldUse;
        this._pendingFieldUse = null;
        if (p) this.useFieldMove(p.moveId, p.x, p.y);
      },
    });
    return true;
  }

  // Texto descriptivo del obstáculo (lo que el jugador "ve") por tipo de MO.
  obstacleFlavor(moveId) {
    if (moveId === 'cut') return '¡Es un arbusto fino que corta el paso!';
    if (moveId === 'strength') return '¡Una roca enorme bloquea el camino!';
    if (moveId === 'rocksmash') return '¡Una roca pequeña y quebradiza estorba!';
    if (moveId === 'surf') return '¡El mar se extiende ante ti! El agua es de un azul intenso.';
    return '¡Algo bloquea el paso!';
  }

  // Aplica una MO sobre el obstáculo (o agua) de (x,y). Reutilizable desde el menú
  // (uso desde el detalle de un Pokémon) y desde el prompt contextual del choque.
  // Devuelve true si la MO se aplicó. Valida de nuevo el gate por seguridad.
  useFieldMove(moveId, x, y) {
    const save = this.registry.get('save');
    const pokedex = this.registry.get('pokedex');
    if (!canUseFieldMove(pokedex, save, moveId)) {
      this.inputLocked = true;
      const why = whyCannotUse(pokedex, save, moveId);
      this.talk([why], () => { this.inputLocked = false; });
      return false;
    }
    const def = FIELD_MOVES[moveId];
    const mon = firstMonForMove(pokedex, save.party, moveId);
    const sp = mon ? (pokedex[mon.species - 1] || {}) : {};
    const monName = (mon && (mon.nickname || sp.name)) ? String(mon.nickname || sp.name).toUpperCase() : 'TU POKÉMON';
    // Vuelo: no actúa sobre un tile, abre el mapa de Vuelo.
    if (moveId === 'fly') { this.openFlyMap(); return true; }
    if (moveId === 'surf') return this.startSurf(x, y, monName, def);
    // Corte / Fuerza / Golpe Roca: retiran el obstáculo de (x,y).
    return this.clearObstacle(moveId, x, y, monName, def);
  }

  // Retira un obstáculo de tierra (arbusto/roca): anima el aviso, borra tile +
  // colisión y PERSISTE en el save (no reaparece). Idempotente.
  clearObstacle(moveId, x, y, monName, def) {
    const ob = obstacleAt(this.mapData, x, y);
    if (!ob || OBSTACLE_TO_MOVE[ob.kind] !== moveId) {
      this.inputLocked = true;
      this.talk(['No hay nada que hacer aquí.'], () => { this.inputLocked = false; });
      return false;
    }
    this.inputLocked = true;
    sfx(this, 'hit', { volume: 0.6 });
    this.removeObstacleTile(x, y);
    const save = this.registry.get('save');
    markObstacleCleared(save, this.mapId, x, y);
    this.talk([`¡${monName} usó ${def.name}!`, `${monName} ${def.verb}.`], () => {
      this.inputLocked = false;
    });
    return true;
  }

  // Surf: el jugador entra al agua. Implementación SEGURA y simple: marca el estado
  // `surfing` y da el primer paso hacia el agua, despejando la colisión SOLO de la
  // casilla destino para poder entrar (las demás aguas se despejan al avanzar). Para
  // no rehacer el motor de colisión, surfeamos liberando colisión de agua adyacente
  // al moverse. Al pisar tierra firme de nuevo, se desactiva el surf.
  startSurf(x, y, monName, def) {
    this.inputLocked = true;
    sfx(this, 'heal', { volume: 0.4 });
    this.talk([`¡${monName} usó ${def.name}!`, `${monName} ${def.verb}. ¡A navegar!`], () => {
      this.inputLocked = false;
      this.surfing = true;
      // Libera la colisión de la casilla de agua de entrada para poder pisarla.
      if (this.mapData.collision[y]) this.mapData.collision[y][x] = 0;
    });
    return true;
  }

  // Abre el MAPA en modo VUELO (overlay). Registro perezoso de la escena 'Map'.
  // Marca que el mapa debe permitir confirmar un destino volable; al elegirlo, la
  // escena Map cierra y nos pasa el destino (this._flyDest) para teletransportar.
  openFlyMap() {
    if (!this.scene.get('Map')) this.scene.add('Map', MapScene, false);
    this.inputLocked = true;
    this.player.idle();
    sfx(this, 'door', { volume: 0.45 });
    this._flyDest = null;
    this.scene.launch('Map', { flyMode: true, onFly: (dest) => { this._flyDest = dest; } });
    const map = this.scene.get('Map');
    const onClose = () => {
      map.events.off('shutdown', onClose);
      map.events.off('sleep', onClose);
      const dest = this._flyDest;
      this._flyDest = null;
      if (dest) this.doFlyTo(dest);
      else this.inputLocked = false;
    };
    map.events.once('shutdown', onClose);
    map.events.once('sleep', onClose);
  }

  // Teletransporta al jugador a un destino de Vuelo { map, x, y } con fundido.
  doFlyTo(dest) {
    this.transitioning = true;
    this.inputLocked = true;
    this.player.idle();
    sfx(this, 'door', { volume: 0.5 });
    const target = { map: dest.map, x: dest.x, y: dest.y, dir: 'down' };
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.persistPlayer(target);
      this.scene.restart(target);
    });
  }

  interact() {
    const d = DIRS[this.player.dir];
    const tx = this.player.tileX + d.dx;
    const ty = this.player.tileY + d.dy;
    let npc = this.npcs.find((n) => n.isAt(tx, ty));
    // Hablar POR ENCIMA de un mostrador/barra: si justo enfrente hay un bloque
    // sólido (la barra del bar, el mostrador de la tienda) y no hay NPC ahí,
    // se mira una casilla más allá en la misma dirección. Así el camarero al
    // otro lado de la barra es alcanzable aunque no haya hueco libre.
    if (!npc && this.isBlocked(tx, ty)) {
      npc = this.npcs.find((n) => n.isAt(tx + d.dx, ty + d.dy));
    }
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
    const por = portraitForNpc(npc.def);
    if (npc.def.trainer && !this.isTrainerBeaten(npc.def.trainer)) this.startTrainerBattle(npc);
    else if (npc.def.heal) this.healInteraction(npc);
    else if (npc.def.pcAccess) this.pcInteraction(npc);
    else if (npc.def.shop) this.shopInteraction(npc);
    else if (npc.def.gift) this.giftInteraction(npc);
    else if (npc.def.trainer) this.talk(npc.def.trainer.win, () => this.endInteraction(npc), por);
    else this.talk(npc.def.dialog, () => this.endInteraction(npc), por);
  }

  // NPC que REGALA un objeto (p.ej. una MO) la PRIMERA vez que hablas. El regalo se
  // marca con un flag único en save.flags para no repetirse. Tras el regalo (o si ya
  // se entregó) se muestra el diálogo correspondiente. Estructura:
  //   def.gift = { item, qty?, flag, lines:[...], doneLines?:[...] }
  giftInteraction(npc) {
    const por = portraitForNpc(npc.def);
    const g = npc.def.gift;
    const save = this.registry.get('save');
    if (!save.flags) save.flags = {};
    const already = !!(g.flag && save.flags[g.flag] === true);
    if (already) {
      const lines = (g.doneLines && g.doneLines.length) ? g.doneLines : (npc.def.dialog || ['...']);
      this.talk(lines, () => this.endInteraction(npc), por);
      return;
    }
    this.talk(g.lines || ['¡Toma esto!'], () => {
      // Entrega el objeto (suma a la bolsa) y marca el flag. Idempotente.
      if (!save.bag || typeof save.bag !== 'object') save.bag = {};
      const qty = Math.max(1, g.qty || 1);
      save.bag[g.item] = (save.bag[g.item] || 0) + qty;
      if (g.flag) save.flags[g.flag] = true;
      sfx(this, 'heal', { volume: 0.6 });
      const itemName = (ITEM_NAMES[g.item] || g.item);
      this.chainTalk([`¡Has recibido ${itemName}!`], () => this.endInteraction(npc), por);
    }, por);
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
    const portrait = (npcOrTrainer && npcOrTrainer.def)
      ? portraitForNpc(npcOrTrainer.def) : (trainer.portrait || null);
    cam.once('cameraflashcomplete', () => {
      this.scene.sleep('World');
      this.scene.launch('Battle', { trainer, portrait });
    });
  }

  talk(lines, onClose, portrait) {
    const text = Array.isArray(lines) && lines.length ? lines : ['...'];
    this.scene.launch('Dialog', { lines: text, onClose, portrait: portrait || null });
  }

  // Encadena un segundo diálogo dejando que el anterior termine de cerrarse.
  chainTalk(lines, onClose, portrait) {
    this.time.delayedCall(60, () => this.talk(lines, onClose, portrait));
  }

  endInteraction(npc) {
    if (npc) npc.paused = false;
    this.inputLocked = false;
  }

  healInteraction(npc) {
    const por = portraitForNpc(npc.def);
    this.talk(npc.def.dialog, () => {
      const save = this.registry.get('save');
      ((save && save.party) || []).forEach(healFull);
      // Registra este punto como el último lugar de curación para el respawn tras
      // un whiteout (estilo FRLG: revives en el último Centro Pokémon visitado).
      this.recordHealPoint(save);
      sfx(this, 'heal', { volume: 0.7 });
      this.chainTalk(
        ['¡Tus Pokémon están como nuevos!', '¡Que te vaya bien, y mucho ojo por ahí!'],
        () => this.endInteraction(npc),
        por,
      );
    }, por);
  }

  // Guarda en save.flags.lastCenter el mapa y la posición donde reaparecer tras un
  // whiteout. Usa el healSpawn del mapa actual (delante del mostrador del Centro).
  recordHealPoint(save) {
    if (!save) return;
    if (!save.flags) save.flags = {};
    save.flags.lastCenter = healPoint(this.mapId, this.mapData);
  }

  shopInteraction(npc) {
    const por = portraitForNpc(npc.def);
    this.talk(npc.def.dialog, () => {
      this.time.delayedCall(60, () => {
        openShop(this, { onClose: () => this.endInteraction(npc) });
      });
    }, por);
  }

  // PC DE FINTIPS: tras el diálogo del NPC, abre la escena overlay del PC (cajas
  // de almacenamiento). Al cerrarla, se restaura el input del mundo.
  pcInteraction(npc) {
    const por = portraitForNpc(npc.def);
    this.talk(npc.def.dialog, () => {
      this.time.delayedCall(60, () => this.openPc(() => this.endInteraction(npc)));
    }, por);
  }

  // Lanza la escena 'Pc' como overlay sobre World (mismo patrón que el menú: World
  // sigue por debajo pero con inputLocked, así NO se dispara el onWake de combate).
  // La escena se registra perezosamente para no tocar main.js (contrato del proyecto).
  openPc(onClose) {
    if (!this.scene.get('Pc')) this.scene.add('Pc', PcScene, false);
    this.inputLocked = true;
    this.player.idle();
    sfx(this, 'door', { volume: 0.45 });
    this.scene.launch('Pc');
    const pc = this.scene.get('Pc');
    const resume = () => {
      pc.events.off('shutdown', resume);
      pc.events.off('sleep', resume);
      this.inputLocked = false;
      if (onClose) onClose();
    };
    pc.events.once('shutdown', resume);
    pc.events.once('sleep', resume);
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
      // El menú pudo alternar la moto (toggleMoto → save.flags.riding): refleja el
      // estado montado/a pie en el sprite del jugador al cerrar el menú.
      this.syncPlayerMount();
    };
    menu.events.once('shutdown', unlock);
    menu.events.once('sleep', unlock);
    // Handoff de MOs: el consumo de acciones (VUELO / MO de campo) SOLO debe ocurrir
    // cuando el menú se CIERRA del todo ('shutdown' por closeMenu), NO cuando se
    // DUERME ('sleep') al abrir el mapa por encima — si no, se consumiría antes de
    // que el mapa devuelva el destino. Por eso va en su propio listener de shutdown.
    const afterClosed = () => {
      menu.events.off('shutdown', afterClosed);
      this.consumeMenuFieldActions();
    };
    menu.events.once('shutdown', afterClosed);
  }

  // Aplica las acciones de MO que el menú dejó pendientes en el registry:
  //   - pendingFly: { map, x, y } → viaje rápido de Vuelo.
  //   - pendingFieldMove: id de MO elegida en el detalle de un Pokémon → se aplica
  //     a la casilla de enfrente (o, para Vuelo, abre el mapa de Vuelo).
  consumeMenuFieldActions() {
    const fly = this.registry.get('pendingFly');
    if (fly) {
      this.registry.set('pendingFly', null);
      this.doFlyTo(fly);
      return;
    }
    const moveId = this.registry.get('pendingFieldMove');
    if (moveId) {
      this.registry.set('pendingFieldMove', null);
      if (moveId === 'fly') { this.openFlyMap(); return; }
      const d = DIRS[this.player.dir];
      const tx = this.player.tileX + d.dx;
      const ty = this.player.tileY + d.dy;
      this.useFieldMove(moveId, tx, ty);
    }
  }

  // Vuelta desde Battle (sleep/wake): registry.save ya viene actualizado por Battle.
  onWake(sys, data) {
    this.whiteout = this.registry.get('whiteout') === true;
    this.registry.set('whiteout', false);
    this.transitioning = false;
    this.inputLocked = false;
    this.syncPlayerMount();
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
    // El menú (overlay que pausa World) puede haber alternado la moto: refleja el
    // estado montado/a pie en el sprite del jugador al volver al mundo.
    this.syncPlayerMount();
  }

  // Derrota total (whiteout): curar y recolocar en el ÚLTIMO Centro Pokémon
  // visitado (estilo FRLG). Si el jugador no ha curado en ningún sitio aún, cae a
  // la ciudad inicial (Tetuán). Red de seguridad por si Battle solo dejó el equipo
  // a 0 sin recolocar.
  handleDefeat(save, data) {
    const party = save.party || [];
    const flagged = !!(data && (data.defeat || data.result === 'lose')) || this.whiteout === true;
    const wiped = party.length > 0 && party.every((m) => m.currentHp <= 0);
    if (!flagged && !wiped) return;
    party.forEach(healFull);
    const dest = whiteoutDestination(save, MAPS, 'tetuan');
    Object.assign(save.player, { map: dest.map, x: dest.x, y: dest.y, dir: dest.dir || 'down' });
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
    if (save) {
      // Saves antiguos (cargados de la nube/local) no traen `pc` ni cartera
      // (`money`/`bag`): los añadimos bien formados sin subir versión (retrocompatible).
      ensurePc(save);
      ensureWallet(save, MONEY_START);
      return save;
    }
    const spawn = (MAPS.tetuan && MAPS.tetuan.playerSpawn) || { x: 1, y: 1 };
    save = {
      version: SAVE_VERSION,
      player: { name: 'ROJO', map: 'tetuan', x: spawn.x, y: spawn.y, dir: 'down', money: MONEY_START },
      party: [],
      bag: {},
      pokedex: { seen: [], caught: [] },
      flags: {},
      options: { expShare: false },
      pc: createPc(),
      playTimeS: 0,
    };
    this.registry.set('save', save);
    return save;
  }
}
