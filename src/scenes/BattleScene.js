// Módulo C — Escena de combate salvaje estilo FRLG (240×160).
// TODA la lógica vive en el motor puro (src/core/battle.js); esta escena solo
// pinta el layout GBA y reproduce en orden la cola de eventos del motor.
import Phaser from 'phaser';
import { createBattle } from '../core/battle.js';
import { calcStats, expForLevel } from '../core/formulas.js';
import { evolve, createMonster } from '../core/monster.js';
import { drawBox, bmText, ITEM_NAMES } from '../ui/theme.js';
import { MessageBox } from '../ui/battle/typewriter.js';
import { DataBox } from '../ui/battle/databoxes.js';
import { mainMenu, fightMenu, bagMenu, partyMenu, yesNoMenu } from '../ui/battle/menus.js';
import { STAT_ES, STATUS_MSG_ES, BALL_ESCAPE_ES, monName } from '../ui/battle/names.js';
import { playMusic, sfx } from '../audio/AudioManager.js';
import { waitForButton } from '../ui/battle/keys.js';
import * as fx from '../ui/battle/animations.js';

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const BAG_ITEMS = ['poke-ball', 'potion', 'antidote'];

export default class BattleScene extends Phaser.Scene {
  constructor() { super('Battle'); }

  init(data) {
    this.trainer = data.trainer || null;
    this.isTrainer = !!this.trainer;
    this.trainerPortrait = data.portrait || null;
    // Entorno del fondo FRLG: 'grass' (parques/hierba), 'indoor' (interiores) o
    // 'building' (calle, por defecto — la mayoría de Madrid es ciudad).
    this.terrain = data.terrain || 'building';
    this.leveledIndexes = new Set();
    this.lastBatchHadText = false;
    this.closing = false;
    // `save` defensivo: garantiza flags antes de leerlo en `finishBattle`.
    const save = this.registry.get('save');
    if (save && !save.flags) save.flags = {};
    // Construye el equipo enemigo. Salvaje: un único monstruo `data.wild`.
    // Entrenador: instancia cada miembro de `trainer.party` con createMonster.
    if (this.isTrainer) {
      const pokedex = this.registry.get('pokedex');
      // 'RIVAL_STARTER' se resuelve al inicial que el rival eligió (fuerte vs el del jugador).
      const rivalAce = (save && save.flags && save.flags.rivalStarter) || 4;
      this.enemyParty = (this.trainer.party || []).map((p) => {
        const sp = p.species === 'RIVAL_STARTER' ? rivalAce : p.species;
        return createMonster(pokedex, sp, p.level);
      });
    } else {
      this.enemyParty = [data.wild];
    }
    // El enemigo "activo" es el primer miembro sano (igual criterio que el motor).
    this.enemyIndex = Math.max(0, this.enemyParty.findIndex((m) => m.currentHp > 0));
    this.enemyMon = this.enemyParty[this.enemyIndex];
  }

  // Carga bajo demanda: fronts de TODO el equipo enemigo (entrenador o salvaje),
  // back de todo el equipo y fronts de los candidatos a evolución.
  preload() {
    const pokedex = this.registry.get('pokedex');
    const save = this.registry.get('save');
    for (const foe of this.enemyParty) this.queueFront(foe.species);
    for (const mon of save.party) {
      this.queueBack(mon.species);
      const { evolution } = pokedex[mon.species - 1];
      if (evolution) {
        this.queueFront(mon.species);
        this.queueFront(evolution.to);
      }
    }
  }

  queueFront(id) {
    if (this.textures.exists(`pkmn_front_${id}`)) return;
    this.load.image(`pkmn_front_${id}`, `assets/sprites/pokemon/front/${id}.png`);
  }

  queueBack(id) {
    if (this.textures.exists(`pkmn_back_${id}`)) return;
    this.load.image(`pkmn_back_${id}`, `assets/sprites/pokemon/back/${id}.png`);
  }

  create() {
    this.pokedex = this.registry.get('pokedex');
    this.movesData = this.registry.get('movesData');
    this.save = this.registry.get('save');
    if (!this.save.flags) this.save.flags = {};
    playMusic(this, this.isTrainer ? 'battle_trainer' : 'battle_wild');
    this.markSeen(this.enemyMon.species);
    this.activeIndex = Math.max(0, this.save.party.findIndex((m) => m.currentHp > 0));
    this.playerMon = this.save.party[this.activeIndex];
    this.battle = createBattle({
      pokedex: this.pokedex,
      movesData: this.movesData,
      party: this.save.party,
      enemyParty: this.enemyParty,
      isTrainer: this.isTrainer,
      bag: this.save.bag,
      // SHIFT (FRLG): ofrecer cambio al debilitar a un rival de entrenador.
      shiftPrompt: this.isTrainer,
    });
    this.buildField();
    this.buildBoxes();
    this.buildHandlers();
    this.runBattle().catch((err) => {
      console.error('[Battle] error en el combate:', err);
      this.closeBattle();
    });
  }

  // ── Construcción del escenario ──────────────────────────────────────────

  buildField() {
    // Posiciones de los Pokémon (pies = setOrigin(0.5,1)). Coinciden con los
    // discos del fondo FRLG `building` (enemigo arriba-dcha, jugador abajo-izda).
    this.enemyHome = { x: 176, y: 76 };
    this.playerHome = { x: 60, y: 112 };
    // Fondo FRLG (256x112) anclado arriba-izda; cubre la zona de combate. El cuadro
    // de diálogo (y=110) tapa la franja inferior. Fallback procedural si no cargó.
    const bgKey = `battlebg_${this.terrain}`;
    const key = this.textures.exists(bgKey) ? bgKey : 'battlebg_building';
    if (this.textures.exists(key)) {
      this.add.image(0, 0, key).setOrigin(0, 0).setDepth(0);
    } else {
      // Campo procedural antiguo (color plano + discos) como red de seguridad.
      this.add.rectangle(120, 80, 240, 160, 0xa8d8b0).setDepth(0);
      this.add.rectangle(120, 22, 240, 44, 0xc8e8dc).setDepth(0);
      const ground = this.add.graphics().setDepth(1);
      ground.fillStyle(0x78b070, 1);
      ground.fillEllipse(this.enemyHome.x, 74, 76, 20);
      ground.fillStyle(0x68a060, 1);
      ground.fillEllipse(this.playerHome.x, 110, 92, 18);
    }
    this.enemySprite = this.add
      .image(this.enemyHome.x, this.enemyHome.y, `pkmn_front_${this.enemyMon.species}`)
      .setOrigin(0.5, 1).setDepth(2);
    this.playerSprite = this.add
      .image(this.playerHome.x, this.playerHome.y, `pkmn_back_${this.playerMon.species}`)
      .setOrigin(0.5, 1).setDepth(2);
  }

  buildBoxes() {
    // Caja enemiga arriba-izda (104x32 con cola), jugador abajo-dcha (112x32).
    // El jugador se ancla en x=126 para que el ancho 112 (con cola) quede dentro
    // del lienzo de 240px (126+112=238). En Y se ancla en y=78 para que su borde
    // inferior (78+32=110) quede JUSTO sobre el borde superior del bocadillo de
    // mensaje (drawBox en y=110), como en FRLG: caja de PS y bocadillo cohesionados
    // sin el hueco antiestético de ~8px que dejaba el valor anterior (y=70 → 102).
    this.enemyBox = new DataBox(this, { x: 4, y: 6, isPlayer: false });
    this.playerBox = new DataBox(this, { x: 126, y: 78, isPlayer: true });
    this.msg = new MessageBox(this);
    this.refreshBox('enemy');
    this.refreshBox('player');
  }

  buildHandlers() {
    this.eventHandlers = {
      text: (ev) => this.onTextEvent(ev),
      move: (ev) => this.onMoveEvent(ev),
      hp: (ev) => this.onHpEvent(ev),
      eff: (ev) => this.onEffEvent(ev),
      crit: () => this.msg.type('¡Golpe crítico!'),
      miss: () => this.msg.type('¡El ataque ha fallado!'),
      status: (ev) => this.onStatusEvent(ev),
      stat: (ev) => this.onStatEvent(ev),
      faint: (ev) => this.onFaintEvent(ev),
      exp: (ev) => this.onExpEvent(ev),
      levelup: (ev) => this.onLevelUpEvent(ev),
      learn: (ev) => this.onLearnEvent(ev),
      ball: (ev) => this.onBallEvent(ev),
      switch: (ev) => this.onSwitchEvent(ev),
      'shift-offer': (ev) => this.onShiftOfferEvent(ev),
      end: () => Promise.resolve(),
    };
  }

  // El motor anuncia que el rival va a relevar (estilo SHIFT de FRLG). Guardamos
  // a quién sacará y precargamos su sprite para poder mostrarlo en el prompt.
  async onShiftOfferEvent(ev) {
    this.pendingEnemy = ev.monster;
    this.markSeen(ev.monster.species);
    await this.ensureFrontLoaded([ev.monster.species]);
  }

  refreshBox(side) {
    const inst = side === 'player' ? this.playerMon : this.enemyMon;
    const species = this.pokedex[inst.species - 1];
    const stats = calcStats(species, inst);
    const box = side === 'player' ? this.playerBox : this.enemyBox;
    box.setMonster({
      name: monName(inst, this.pokedex),
      level: inst.level,
      hp: inst.currentHp,
      maxHp: stats.hp,
      status: inst.status,
      expRatio: side === 'player' ? this.expRatio(inst, inst.level) : 0,
    });
    if (side === 'player') this.shownLevel = inst.level;
  }

  // Progreso 0..1 de la barra de EXP dentro del nivel mostrado.
  expRatio(inst, level) {
    const species = this.pokedex[inst.species - 1];
    const lo = expForLevel(species.growthRate, level);
    const hi = expForLevel(species.growthRate, level + 1);
    if (hi <= lo) return 1;
    return clamp01((inst.exp - lo) / (hi - lo));
  }

  enemyName() {
    return monName(this.enemyMon, this.pokedex);
  }

  // Coletilla del enemigo según el tipo de combate: "salvaje" o "enemigo".
  enemySuffix() {
    return this.isTrainer ? 'enemigo' : 'salvaje';
  }

  // Frase completa "El RATTATA salvaje" / "El RATTATA enemigo".
  enemyLabel() {
    return `El ${this.enemyName()} ${this.enemySuffix()}`;
  }

  // ── Bucle principal del combate ─────────────────────────────────────────

  async runBattle() {
    this.cameras.main.fadeIn(250, 0, 0, 0);
    if (this.isTrainer) await this.trainerIntro();
    else await this.msg.type(`¡Anda! ¡Te ha salido un ${this.enemyName()} salvaje!`, { confirm: true });
    await this.sendOut();
    await this.mainLoop();
  }

  // Secuencia de apertura de un combate de entrenador: reto, líneas de intro y
  // presentación de su primer Pokémon. El título (si lo trae el NPC) da caché.
  async trainerIntro() {
    // Retrato del entrenador (si lo tiene), presentación tipo "VS".
    let portraitImg = null;
    // Cadena de fallback: anime busto > anime entero > busto pixel > pixel entero.
    // Así, si un personaje no tiene retrato anime (p. ej. Alex), cae a su busto
    // pixel LIMPIO en vez de a la textura "missing" (la caja a-cuadros blanca).
    const p = this.trainerPortrait;
    const pcands = p
      ? [`portrait_${p}_anime_bust`, `portrait_${p}_anime`, `portrait_${p}_bust`, `portrait_${p}`] : [];
    const pkey = pcands.find((k) => this.textures.exists(k));
    if (pkey) {
      const src = this.textures.get(pkey).getSourceImage();
      const cam = this.cameras.main;
      portraitImg = this.add.image(cam.centerX, cam.centerY - 12, pkey).setDepth(60).setAlpha(0);
      const s = Math.min(96 / src.width, 96 / src.height);
      portraitImg.setScale(s);
      this.tweens.add({ targets: portraitImg, alpha: 1, y: cam.centerY - 16, duration: 220 });
    }
    const reto = this.trainer.title
      ? `¡${this.trainer.name} (${this.trainer.title}) te corta el paso!`
      : `¡${this.trainer.name} te corta el paso!`;
    await this.msg.type(reto, { confirm: true });
    for (const line of this.trainer.intro || []) {
      await this.msg.type(line, { confirm: true });
    }
    if (portraitImg) {
      await new Promise((res) => this.tweens.add({
        targets: portraitImg, alpha: 0, x: portraitImg.x - 60, duration: 240, onComplete: res,
      }));
      portraitImg.destroy();
    }
    await this.msg.type(`¡${this.trainer.name} saca a ${this.enemyName()}!`, { holdMs: 500 });
  }

  async sendOut() {
    this.playerSprite.setScale(0);
    await this.msg.type(`¡Adelante, ${monName(this.playerMon, this.pokedex)}!`, { holdMs: 200 });
    await fx.tweenPromise(this, { targets: this.playerSprite, scale: 1, duration: 250, ease: 'Back.out' });
  }

  async mainLoop() {
    for (;;) {
      const action = await this.chooseAction();
      if (!action) continue;
      const result = this.battle.act(action);
      await this.playEvents(result.events || []);
      if (result.over) {
        await this.finishBattle(result.over);
        return;
      }
      // SHIFT (FRLG): el rival va a relevar; ofrecemos cambiar al jugador.
      if (this.battle.state().phase === 'enemy-shift' && await this.handleEnemyShift()) return;
      if (this.playerMon.currentHp <= 0 && await this.forcedSwitch()) return;
    }
  }

  // Flujo SHIFT: muestra "El rival va a sacar a X. ¿Quieres cambiar?", deja elegir
  // SÍ/NO y, si procede, abre el menú de equipo. Devuelve true si el combate acaba.
  async handleEnemyShift() {
    if (typeof window !== 'undefined') window.__shiftPromptShown = (window.__shiftPromptShown || 0) + 1;
    const nextName = this.pendingEnemy
      ? monName(this.pendingEnemy, this.pokedex)
      : (this.battle.state().pendingEnemy ? monName(this.battle.state().pendingEnemy, this.pokedex) : 'su Pokémon');
    const sender = this.trainer ? this.trainer.name : 'El rival';
    await this.msg.type(`${sender} va a sacar a ${nextName}.`, { holdMs: 300 });
    // ¿Quedan reservas sanas distintas del activo? Si no, no tiene sentido preguntar.
    const hasReserve = this.save.party.some((m, i) => i !== this.activeIndex && m.currentHp > 0);
    let decision = { type: 'shift-decision', switch: false };
    if (hasReserve) {
      this.msg.setInstant('¿Quieres cambiar de POKéMON?');
      const wantsSwitch = await yesNoMenu(this);
      if (wantsSwitch) {
        const index = await this.openPartyMenu(false);
        if (index !== null) decision = { type: 'shift-decision', switch: true, index };
      }
    }
    this.pendingEnemy = null;
    const result = this.battle.act(decision);
    await this.playEvents(result.events || []);
    if (result.over) { await this.finishBattle(result.over); return true; }
    if (this.playerMon.currentHp <= 0 && await this.forcedSwitch()) return true;
    return false;
  }

  // Cambio obligatorio cuando el Pokémon activo se debilita y quedan más.
  async forcedSwitch() {
    const index = await this.openPartyMenu(true);
    const result = this.battle.act({ type: 'switch', index });
    await this.playEvents(result.events || []);
    if (result.over) {
      await this.finishBattle(result.over);
      return true;
    }
    if (this.playerMon.currentHp <= 0) return this.forcedSwitch();
    return false;
  }

  // ── Menús ───────────────────────────────────────────────────────────────

  async chooseAction() {
    this.msg.setInstant(`¿Qué hará ${monName(this.playerMon, this.pokedex)}?`);
    const choice = await mainMenu(this);
    if (choice === 'fight') return this.chooseMove();
    if (choice === 'bag') return this.chooseItem();
    if (choice === 'pokemon') return this.chooseSwitch();
    return { type: 'run' };
  }

  async chooseMove() {
    this.msg.clear();
    if (!this.playerMon.moves.some((m) => m.pp > 0)) {
      return { type: 'move', index: 0 }; // sin PP en nada: el motor resuelve Forcejeo
    }
    const index = await fightMenu(this, this.playerMon.moves, this.movesData);
    if (index === null) return null;
    return { type: 'move', index };
  }

  async chooseItem() {
    const items = this.bagEntries();
    if (!items.length) {
      await this.msg.type('¡No llevas nada en la mochila!', { confirm: true });
      return null;
    }
    const item = await bagMenu(this, items);
    if (!item) return null;
    if (item === 'poke-ball') return { type: 'item', item };
    return { type: 'item', item, target: this.activeIndex };
  }

  bagEntries() {
    return BAG_ITEMS
      .filter((key) => !(this.isTrainer && key === 'poke-ball'))
      .filter((key) => (this.save.bag[key] || 0) > 0)
      .map((key) => ({ item: key, label: ITEM_NAMES[key] || key.toUpperCase(), qty: this.save.bag[key] }));
  }

  async chooseSwitch() {
    const index = await this.openPartyMenu(false);
    if (index === null) return null;
    return { type: 'switch', index };
  }

  openPartyMenu(forced) {
    return partyMenu(this, this.buildPartyRows(), { forced });
  }

  buildPartyRows() {
    return this.save.party.map((mon, i) => {
      const species = this.pokedex[mon.species - 1];
      const stats = calcStats(species, mon);
      const state = mon.currentHp <= 0 ? 'DEB' : (mon.status || '').toUpperCase();
      const label = `${monName(mon, this.pokedex).padEnd(11)}Nv${String(mon.level).padStart(2)}  ${Math.max(0, mon.currentHp)}/${stats.hp} ${state}`.trimEnd();
      return { index: i, label, disabled: mon.currentHp <= 0 || i === this.activeIndex };
    });
  }

  // ── Reproducción secuencial de la cola de eventos del motor ─────────────

  // Un único texto a silenciar tras el relevo enemigo (lo sustituye nuestra línea).
  onTextEvent(ev) {
    if (this.swallowNextText) {
      this.swallowNextText = false;
      return Promise.resolve();
    }
    return this.msg.type(ev.msg);
  }

  async playEvents(events) {
    this.lastBatchHadText = events.some((ev) => ev.t === 'text');
    for (const ev of events) {
      const handler = this.eventHandlers[ev.t];
      if (handler) await handler(ev);
    }
  }

  async onMoveEvent(ev) {
    const attacker = ev.side === 'player' ? this.playerSprite : this.enemySprite;
    const text = ev.side === 'player'
      ? `¡${monName(this.playerMon, this.pokedex)} usó ${ev.moveName.toUpperCase()}!`
      : `¡${this.enemyLabel()} usó ${ev.moveName.toUpperCase()}!`;
    await this.msg.type(text, { holdMs: 150 });
    await fx.lunge(this, attacker, ev.side === 'player' ? 10 : -10);
  }

  async onHpEvent(ev) {
    const box = ev.side === 'player' ? this.playerBox : this.enemyBox;
    const sprite = ev.side === 'player' ? this.playerSprite : this.enemySprite;
    const anims = [box.tweenHp(ev.from, ev.to, ev.max)];
    if (ev.to < ev.from) {
      sfx(this, 'hit', { volume: 0.6 });
      anims.push(fx.damageFlash(this, sprite), fx.shake(this, sprite));
    }
    await Promise.all(anims);
  }

  onEffEvent(ev) {
    if (ev.mult === 0) return this.msg.type('No tiene ningún efecto...');
    if (ev.mult > 1) return this.msg.type('¡Es muy eficaz!');
    if (ev.mult < 1) return this.msg.type('No es muy eficaz...');
    return Promise.resolve();
  }

  async onStatusEvent(ev) {
    const box = ev.side === 'player' ? this.playerBox : this.enemyBox;
    box.setStatus(ev.status);
    if (!ev.status) return;
    const name = ev.side === 'player'
      ? monName(this.playerMon, this.pokedex)
      : this.enemyLabel();
    const template = STATUS_MSG_ES[ev.status];
    if (template) await this.msg.type(template.replace('{N}', name));
  }

  async onStatEvent(ev) {
    const stat = STAT_ES[ev.stat] || `El ${String(ev.stat).toUpperCase()}`;
    const who = ev.side === 'player'
      ? `de ${monName(this.playerMon, this.pokedex)}`
      : `del ${this.enemyName()} ${this.enemySuffix()}`;
    const verb = ev.change > 0
      ? (ev.change > 1 ? 'ha subido mucho' : 'ha subido')
      : (ev.change < -1 ? 'ha bajado mucho' : 'ha bajado');
    await this.msg.type(`¡${stat} ${who} ${verb}!`);
  }

  async onFaintEvent(ev) {
    const sprite = ev.side === 'player' ? this.playerSprite : this.enemySprite;
    await fx.faintDrop(this, sprite);
    const text = ev.side === 'player'
      ? `¡${monName(this.playerMon, this.pokedex)} se ha debilitado!`
      : `¡${this.enemyLabel()} se ha debilitado!`;
    await this.msg.type(text, { confirm: true });
  }

  async onExpEvent(ev) {
    const name = monName(this.playerMon, this.pokedex);
    await this.msg.type(`¡${name} ha ganado ${ev.amount} puntos de experiencia!`);
    await this.playerBox.tweenExp(this.expRatio(this.playerMon, this.shownLevel));
  }

  async onLevelUpEvent(ev) {
    this.leveledIndexes.add(this.activeIndex);
    this.shownLevel = ev.level;
    sfx(this, 'levelup', { volume: 0.7 });
    this.playerBox.setExp(0);
    this.playerBox.setLevel(ev.level);
    if (ev.newStats) this.playerBox.updateHp(this.playerMon.currentHp, ev.newStats.hp);
    await this.msg.type(`¡${monName(this.playerMon, this.pokedex)} ha subido al nivel ${ev.level}!`, { confirm: true });
    await this.showLevelStats(ev.newStats);
    await this.playerBox.tweenExp(this.expRatio(this.playerMon, ev.level));
  }

  // Cuadro con las estadísticas nuevas tras subir de nivel; se cierra con A.
  async showLevelStats(stats) {
    if (!stats) return;
    const frame = drawBox(this, 148, 26, 88, 80, { depth: 10 });
    const rows = [
      ['PS', stats.hp], ['ATAQUE', stats.atk], ['DEFENSA', stats.def],
      ['AT. ESP.', stats.spa], ['DEF. ESP.', stats.spd], ['VELOCIDAD', stats.spe],
    ];
    const texts = rows.map(([label, value], i) =>
      bmText(this, 154, 32 + i * 12, `${label.padEnd(10)}${String(value).padStart(3)}`, { small: true, depth: 11 }));
    await waitForButton(this, ['a', 'b']);
    texts.forEach((t) => t.destroy());
    frame.destroy();
  }

  async onLearnEvent(ev) {
    const name = monName(this.playerMon, this.pokedex);
    await this.msg.type(`¡${name} ha aprendido ${ev.moveName.toUpperCase()}!`, { confirm: true });
  }

  async onBallEvent(ev) {
    await this.msg.type('¡Allá va la POKÉ BALL!', { holdMs: 200 });
    await fx.ballThrow(this, this.enemySprite, this.enemyHome, ev.shakes, ev.caught);
    if (ev.caught) {
      await this.msg.type(`¡Toma ya! ¡${this.enemyName()} atrapado!`, { confirm: true });
    } else {
      await this.msg.type(BALL_ESCAPE_ES[Math.min(ev.shakes, 3)], { confirm: true });
    }
  }

  async onSwitchEvent(ev) {
    if (ev.side === 'enemy') return this.onEnemySwitch(ev);
    const leaving = monName(this.playerMon, this.pokedex);
    if (this.playerMon.currentHp > 0) {
      await this.msg.type(`¡Vuelve, ${leaving}!`, { holdMs: 200 });
      await fx.tweenPromise(this, { targets: this.playerSprite, scale: 0, duration: 200 });
    }
    this.playerMon = ev.monster;
    const index = this.save.party.indexOf(ev.monster);
    if (index >= 0) this.activeIndex = index;
    this.playerSprite
      .setTexture(`pkmn_back_${ev.monster.species}`)
      .setPosition(this.playerHome.x, this.playerHome.y)
      .setAlpha(1)
      .setScale(0);
    this.refreshBox('player');
    await this.msg.type(`¡Adelante, ${monName(this.playerMon, this.pokedex)}!`, { holdMs: 200 });
    await fx.tweenPromise(this, { targets: this.playerSprite, scale: 1, duration: 250, ease: 'Back.out' });
  }

  // Relevo del entrenador rival: el motor saca al siguiente Pokémon sano.
  // Animamos la entrada del nuevo front y mostramos "¡{name} ha enviado a {especie}!".
  async onEnemySwitch(ev) {
    this.enemyMon = ev.monster;
    const index = this.enemyParty.indexOf(ev.monster);
    if (index >= 0) this.enemyIndex = index;
    this.markSeen(ev.monster.species);
    // El motor empuja un "¡El rival saca a X!" justo después; lo silenciamos
    // para no duplicar con nuestra línea de entrenador.
    this.swallowNextText = true;
    await this.ensureFrontLoaded([ev.monster.species]);
    this.enemySprite
      .setTexture(`pkmn_front_${ev.monster.species}`)
      .setPosition(this.enemyHome.x, this.enemyHome.y)
      .setAlpha(1)
      .setScale(0);
    this.refreshBox('enemy');
    const sender = this.trainer ? this.trainer.name : 'El rival';
    await this.msg.type(`¡${sender} ha enviado a ${this.enemyName()}!`, { holdMs: 250 });
    await fx.tweenPromise(this, { targets: this.enemySprite, scale: 1, duration: 250, ease: 'Back.out' });
  }

  // ── Final del combate ───────────────────────────────────────────────────

  async finishBattle(over) {
    if (over.result === 'caught') await this.handleCaught(over.caughtMonster || this.enemyMon);
    if (over.result === 'win' && this.isTrainer) await this.handleTrainerWin();
    if (over.result === 'lose' && this.isTrainer) await this.handleTrainerDefeat();
    if (over.result === 'lose') await this.handleWhiteout();
    if (over.result === 'ran' && !this.lastBatchHadText) {
      await this.msg.type('¡Has escapado por los pelos!', { confirm: true });
    }
    if (over.result === 'win' || over.result === 'caught') await this.handleEvolutions();
    this.closeBattle();
  }

  async handleCaught(mon) {
    this.markSeen(mon.species);
    this.markCaught(mon.species);
    const name = monName(mon, this.pokedex);
    await this.msg.type(`Los datos de ${name} se han registrado en la POKéDEX.`, { confirm: true });
    if (this.save.party.length < 6) {
      this.save.party.push(mon);
      await this.msg.type(`¡${name} se une a tu equipo!`, { confirm: true });
    } else {
      await this.msg.type(`Tu equipo está completo. ${name} ha sido liberado... ¡Hasta otra, majo!`, { confirm: true });
    }
  }

  // Victoria contra entrenador: anuncio de victoria, diálogo de derrota del
  // rival, premio en dinero (su "parte"), marca de bandera y, si es líder, medalla.
  async handleTrainerWin() {
    const t = this.trainer;
    playMusic(this, 'victory', { loop: false });
    await this.msg.type(`¡Le has ganado a ${t.name}!`, { confirm: true });
    for (const line of t.win || []) {
      await this.msg.type(line, { confirm: true });
    }
    const prize = Math.max(0, Math.floor(t.prize || 0));
    if (prize > 0) {
      this.save.player.money = (this.save.player.money || 0) + prize;
      await this.msg.type(`Como premio, ${t.name} te suelta ${prize}₧.`, { confirm: true });
    }
    if (!this.save.flags) this.save.flags = {};
    if (t.flag) this.save.flags[t.flag] = true;
    if (t.badge) {
      if (!Array.isArray(this.save.flags.badges)) this.save.flags.badges = [];
      if (!this.save.flags.badges.includes(t.badge)) this.save.flags.badges.push(t.badge);
      await this.msg.type(`¡Te has llevado la Medalla ${t.badge}!`, { confirm: true });
    }
    // Campeón de la Liga Chamberí: corona al jugador e inscribe su equipo en el
    // Salón de la Fama (parodia castiza). Cambio mínimo y aislado: solo se dispara
    // cuando el entrenador trae la marca `champion` (Álvaro, el Campeón).
    if (t.champion) {
      this.save.flags.champion = true;
      await this.msg.type('¡Has vencido al Campeón Álvaro y te coronas CAMPEÓN de la Liga Chamberí!', { confirm: true });
      await this.msg.type('Tu equipo entra en el SALÓN DE LA FAMA, para que el barrio entero lo recuerde:', { confirm: true });
      for (const mon of this.save.party || []) {
        if (!mon) continue;
        await this.msg.type(`★ ${monName(mon, this.pokedex)}  ·  Nv. ${mon.level}`, { confirm: true });
      }
      await this.msg.type('El caos, por una vez, ha vencido a la lógica perfecta. ¡Enhorabuena, Marcelino!', { confirm: true });
    }
  }

  // Derrota frente a un entrenador: solo su diálogo; el whiteout (curar +
  // recolocar) lo gestiona handleWhiteout. NO se marca la bandera (se reintenta).
  async handleTrainerDefeat() {
    for (const line of this.trainer.defeat || []) {
      await this.msg.type(line, { confirm: true });
    }
  }

  async handleWhiteout() {
    const lost = Math.floor((this.save.player.money || 0) / 2);
    this.save.player.money -= lost;
    await this.msg.type('¡No te quedan Pokémon en condiciones de luchar!', { confirm: true });
    if (lost > 0) await this.msg.type(`Con las prisas has perdido ${lost}₧ por el camino...`, { confirm: true });
    await this.msg.type('Todo se ha vuelto negro...', { confirm: true });
    this.registry.set('whiteout', true);
  }

  // Evoluciona a los miembros del equipo que han subido de nivel en este
  // combate y cumplen el nivel de evolución de su especie.
  async handleEvolutions() {
    for (const mon of this.save.party) {
      if (mon) await this.maybeEvolve(mon);
    }
  }

  async maybeEvolve(mon) {
    const species = this.pokedex[mon.species - 1];
    const { evolution } = species;
    if (!evolution || mon.level < evolution.level) return;
    await this.ensureFrontLoaded([mon.species, evolution.to]);
    const oldName = monName(mon, this.pokedex);
    const stage = fx.createEvolutionStage(this, `pkmn_front_${mon.species}`, `pkmn_front_${evolution.to}`);
    await this.msg.type(`¿Eh? ¡Anda! ¡${oldName} está evolucionando!`, { confirm: true });
    await stage.morph();
    evolve(mon);
    this.markSeen(mon.species);
    this.markCaught(mon.species);
    const newName = this.pokedex[mon.species - 1].name.toUpperCase();
    await this.msg.type(`¡Enhorabuena! ¡Tu ${oldName} ha evolucionado en ${newName}!`, { confirm: true });
    stage.destroy();
  }

  // Carga en caliente (create-time) de fronts que falten: load.image + load.start.
  ensureFrontLoaded(ids) {
    const missing = ids.filter((id) => !this.textures.exists(`pkmn_front_${id}`));
    if (!missing.length) return Promise.resolve();
    return new Promise((resolve) => {
      missing.forEach((id) => this.load.image(`pkmn_front_${id}`, `assets/sprites/pokemon/front/${id}.png`));
      this.load.once('complete', resolve);
      this.load.start();
    });
  }

  // ── Registro y salida ───────────────────────────────────────────────────

  markSeen(id) {
    const { seen } = this.save.pokedex;
    if (!seen.includes(id)) seen.push(id);
  }

  markCaught(id) {
    const { caught } = this.save.pokedex;
    if (!caught.includes(id)) caught.push(id);
  }

  closeBattle() {
    if (this.closing) return;
    this.closing = true;
    this.registry.set('save', this.save);
    this.cameras.main.fadeOut(250, 0, 0, 0);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      this.scene.wake('World');
      this.scene.stop();
    });
  }
}
