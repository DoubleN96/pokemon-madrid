// Escena PC — "EL PC DE FINTIPS": sistema de almacenamiento (cajas de Bill, FRLG)
// tematizado como la "nube de activos" de Iván FinTips, el mentor del juego.
// Overlay sobre World (World queda por debajo con inputLocked, igual que el menú).
//
// Toda la LÓGICA vive en src/core/pcStorage.js (puro, con tests). Esta escena solo
// dibuja y orquesta. Input por EVENTOS keydown (no JustDown) para no romperse tras
// sleep/restart, coherente con WorldScene/MenuScene.
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { sfx } from '../audio/AudioManager.js';
import {
  drawBox, bmText, drawHpBar, BOX_COLORS, TEXT_COLOR_DIM, TEXT_COLOR_LIGHT, STATUS_LABELS,
} from '../ui/theme.js';
import { calcStats } from '../core/formulas.js';
import {
  BOX_SIZE, PARTY_MAX, ensurePc, deposit, withdraw, moveInPc,
} from '../core/pcStorage.js';

const COLS = 6;            // rejilla de la caja: 6 columnas
const ROWS = BOX_SIZE / COLS; // × 5 filas = 30 slots (BOX_SIZE)
const PANEL_FILL = 0x4858a8;  // azul "terminal" del PC (distinto de los paneles del menú)

const MENU_OPTIONS = [
  { id: 'withdraw', label: 'RETIRAR' },
  { id: 'deposit', label: 'DEPOSITAR' },
  { id: 'move', label: 'MOVER' },
  { id: 'exit', label: 'SALIR' },
];

export default class PcScene extends Phaser.Scene {
  constructor() { super('Pc'); }

  create() {
    this.save = this.registry.get('save');
    this.dexData = this.registry.get('pokedex') || [];
    this.busy = false;
    this.view = null;
    this.menuIdx = 0;
    // Estado de navegación en la rejilla.
    this.gridIdx = 0;            // 0..BOX_SIZE-1 dentro de la caja activa
    this.inParty = false;        // cursor sobre la fila de equipo
    this.partyIdx = 0;
    this.holding = null;         // pokémon "en la mano" (modo MOVER): { box, slot }
    if (!this.save) { this.close(); return; }
    this.pc = ensurePc(this.save);
    this.boxIdx = this.pc.activeBox || 0;
    this.bindKeys();
    this.showMenu();
  }

  // ---------- input (eventos, no JustDown) ----------

  bindKeys() {
    const kb = this.input.keyboard;
    const dir = (dx, dy) => (ev) => { if (!(ev && ev.repeat) && !this.busy) this.onDir(dx, dy); };
    const tap = (fn) => (ev) => { if (!(ev && ev.repeat) && !this.busy) fn(); };
    kb.on('keydown-UP', dir(0, -1));
    kb.on('keydown-DOWN', dir(0, 1));
    kb.on('keydown-LEFT', dir(-1, 0));
    kb.on('keydown-RIGHT', dir(1, 0));
    kb.on('keydown-Z', tap(() => this.onA()));
    kb.on('keydown-SPACE', tap(() => this.onA()));
    kb.on('keydown-X', tap(() => this.onB()));
    kb.on('keydown-SHIFT', tap(() => this.onB()));
    kb.on('keydown-ENTER', tap(() => this.onA()));
  }

  onDir(dx, dy) {
    if (this.mode === 'menu') { if (dy) this.moveMenu(dy); return; }
    this.moveGrid(dx, dy);
  }

  onA() {
    if (this.mode === 'menu') this.selectMenu();
    else this.gridConfirm();
  }

  onB() {
    if (this.mode === 'menu') { this.close(); return; }
    if (this.holding) { this.holding = null; this.refreshGrid(); sfx(this, 'select', { volume: 0.4 }); return; }
    this.showMenu();
  }

  // ---------- helpers ----------

  setView() {
    if (this.view) this.view.destroy(true);
    this.view = this.add.container(0, 0);
    return this.view;
  }

  text(c, x, y, str, st = {}) {
    const opts = { small: true };
    if (st.color) opts.color = st.color;
    if (st.wrap) opts.wrap = st.wrap;
    const t = bmText(this, x, y, str, opts);
    c.add(t);
    return t;
  }

  speciesOf(mon) { return this.dexData[mon.species - 1] || {}; }
  displayName(mon) { return String(mon.nickname || this.speciesOf(mon).name || '???').toUpperCase(); }

  openDialog(lines, onClose = null) {
    this.busy = true;
    this.scene.launch('Dialog', {
      lines: Array.isArray(lines) ? lines : [lines],
      onClose: () => { this.busy = false; if (onClose) onClose(); },
    });
  }

  // Carga perezosa de iconos de party (mismo patrón que MenuScene).
  ensureIcons(ids, onReady) {
    const missing = [...new Set(ids)].filter((id) => id && !this.textures.exists(`pkmn_icon_${id}`));
    if (!missing.length) { onReady(); return; }
    for (const id of missing) this.load.image(`pkmn_icon_${id}`, `assets/sprites/pokemon/icons/${id}.png`);
    this.load.once('complete', () => { if (this.scene.isActive()) onReady(); });
    this.load.start();
  }

  close() {
    this.pc.activeBox = this.boxIdx; // recuerda la caja seleccionada para la próxima vez
    if (this.scene.isPaused('World')) this.scene.resume('World');
    else if (this.scene.isSleeping('World')) this.scene.wake('World');
    this.scene.stop();
  }

  // ---------- menú raíz ----------

  showMenu() {
    this.mode = 'menu';
    this.holding = null;
    const c = this.setView();
    c.add(drawBox(this, 0, 0, GAME_W, GAME_H, { fill: PANEL_FILL }));
    this.text(c, 8, 6, 'EL PC DE FINTIPS', { color: TEXT_COLOR_LIGHT });
    this.text(c, GAME_W - 8, 6, 'La nube de activos de Iván', { color: '#c8d0f0' }).setOrigin(1, 0);
    const stored = this.countStored();
    const w = 120; const x = (GAME_W - w) / 2;
    c.add(drawBox(this, x, 40, w, MENU_OPTIONS.length * 15 + 14));
    this.menuTexts = MENU_OPTIONS.map((o, i) => this.text(c, x + 22, 47 + i * 15, o.label));
    this.menuCursor = this.text(c, x + 10, 47, '▶');
    c.add(drawBox(this, x, 130, w, 22));
    this.text(c, x + 8, 136, `Guardados: ${stored}`, { color: TEXT_COLOR_DIM });
    this.moveMenu(0);
  }

  moveMenu(d) {
    const n = MENU_OPTIONS.length;
    this.menuIdx = (this.menuIdx + d + n) % n;
    this.menuCursor.y = this.menuTexts[this.menuIdx].y;
    if (d !== 0) sfx(this, 'select', { volume: 0.35 });
  }

  selectMenu() {
    sfx(this, 'select', { volume: 0.5 });
    const id = MENU_OPTIONS[this.menuIdx].id;
    if (id === 'exit') { this.close(); return; }
    this.action = id; // 'withdraw' | 'deposit' | 'move'
    this.gridIdx = 0;
    this.inParty = (id === 'deposit'); // depositar empieza con el cursor en el equipo
    this.partyIdx = 0;
    this.showGrid();
  }

  countStored() {
    return this.pc.boxes.reduce((acc, box) => acc + box.filter((s) => s != null).length, 0);
  }

  // ---------- rejilla de caja + equipo ----------

  showGrid() {
    this.mode = 'grid';
    const partyIds = (this.save.party || []).map((m) => m.species);
    const boxIds = this.pc.boxes[this.boxIdx].filter(Boolean).map((m) => m.species);
    this.ensureIcons([...partyIds, ...boxIds], () => this.buildGrid());
  }

  // Reconstruye solo cuando cambia el contenido; refreshGrid mueve el cursor.
  refreshGrid() { this.showGrid(); }

  buildGrid() {
    if (this.mode !== 'grid') return;
    const c = this.setView();
    c.add(drawBox(this, 0, 0, GAME_W, GAME_H, { fill: PANEL_FILL }));
    // Cabecera con la acción y la caja activa (con flechas de cambio de caja).
    const actLabel = MENU_OPTIONS.find((o) => o.id === this.action)?.label || '';
    this.text(c, 8, 4, actLabel, { color: TEXT_COLOR_LIGHT });
    this.text(c, GAME_W / 2, 4, `◀ ${this.pc.names[this.boxIdx]} ▶`, { color: '#ffe070' }).setOrigin(0.5, 0);
    // Caja: rejilla 6×5 de iconos.
    this.boxLeft = 10; this.boxTop = 18; this.cell = 22;
    c.add(drawBox(this, this.boxLeft - 4, this.boxTop - 4, COLS * this.cell + 8, ROWS * this.cell + 8));
    this.slotIcons = [];
    const box = this.pc.boxes[this.boxIdx];
    for (let i = 0; i < BOX_SIZE; i += 1) {
      const { x, y } = this.cellCenter(i);
      const mon = box[i];
      if (mon) {
        const icon = this.add.image(x, y, `pkmn_icon_${mon.species}`).setScale(0.62);
        c.add(icon);
        this.slotIcons[i] = icon;
      }
    }
    // Fila de equipo (debajo de la caja).
    const py = this.boxTop + ROWS * this.cell + 8;
    this.partyTop = py;
    c.add(drawBox(this, 6, py - 2, GAME_W - 12, 18));
    this.text(c, 10, py + 1, 'EQUIPO', { color: TEXT_COLOR_DIM });
    this.partyIcons = [];
    (this.save.party || []).forEach((mon, i) => {
      const x = 64 + i * 22;
      const icon = this.add.image(x, py + 8, `pkmn_icon_${mon.species}`).setScale(0.55);
      c.add(icon);
      this.partyIcons[i] = icon;
    });
    // Caja de info (nombre/nivel/PS del señalado).
    c.add(drawBox(this, 6, GAME_H - 22, GAME_W - 12, 20));
    this.infoText = this.text(c, 12, GAME_H - 18, '');
    this.infoHp = this.add.graphics(); c.add(this.infoHp);
    // Cursor (recuadro amarillo).
    this.cursor = this.add.graphics(); c.add(this.cursor);
    // "En la mano" (modo MOVER): icono que sigue al cursor.
    this.heldIcon = null;
    this.syncHeldIcon();
    this.placeCursor();
  }

  cellCenter(i) {
    const col = i % COLS; const row = Math.floor(i / COLS);
    return { x: this.boxLeft + col * this.cell + this.cell / 2, y: this.boxTop + row * this.cell + this.cell / 2 };
  }

  // Recoloca el recuadro del cursor y refresca la info del Pokémon señalado.
  placeCursor() {
    this.cursor.clear();
    this.cursor.lineStyle(2, 0xf8d038, 1);
    if (this.inParty) {
      const x = 64 + this.partyIdx * 22;
      this.cursor.strokeRoundedRect(x - 10, this.partyTop - 2, 20, 20, 3);
    } else {
      const { x, y } = this.cellCenter(this.gridIdx);
      this.cursor.strokeRoundedRect(x - 11, y - 11, 22, 22, 3);
    }
    if (this.heldIcon) this.syncHeldIcon();
    this.refreshInfo();
  }

  // Pokémon actualmente señalado por el cursor (o null si hueco vacío).
  pointed() {
    if (this.inParty) return (this.save.party || [])[this.partyIdx] || null;
    return this.pc.boxes[this.boxIdx][this.gridIdx] || null;
  }

  refreshInfo() {
    this.infoHp.clear();
    const mon = this.heldMon() || this.pointed();
    if (!mon) {
      const hint = this.holding ? 'Elige dónde colocarlo (B suelta).' : 'Hueco vacío.';
      this.infoText.setText(hint).setTint(0x707070);
      return;
    }
    const sp = this.speciesOf(mon);
    const max = calcStats(sp, mon).hp;
    const st = mon.currentHp <= 0 ? 'DEB' : (STATUS_LABELS[mon.status] || '');
    this.infoText.setText(`${this.displayName(mon)}  Nv.${mon.level}  PS ${mon.currentHp}/${max}${st ? '  ' + st : ''}`)
      .setTint(0x181818);
    this.infoHp.fillStyle(0x000000, 0); // (sin barra grande aquí: el texto ya da los PS)
  }

  heldMon() {
    if (!this.holding) return null;
    return this.pc.boxes[this.holding.box][this.holding.slot] || null;
  }

  syncHeldIcon() {
    if (this.heldIcon) { this.heldIcon.destroy(); this.heldIcon = null; }
    const mon = this.heldMon();
    if (!mon) return;
    const { x, y } = this.inParty
      ? { x: 64 + this.partyIdx * 22, y: this.partyTop + 8 }
      : this.cellCenter(this.gridIdx);
    this.heldIcon = this.add.image(x, y - 10, `pkmn_icon_${mon.species}`).setScale(0.6).setAlpha(0.85);
    this.view.add(this.heldIcon);
  }

  // Movimiento del cursor: dentro de la rejilla, salto a/desde el equipo, y cambio
  // de caja al pasar de los bordes laterales (solo cuando NO llevas nada en la mano).
  moveGrid(dx, dy) {
    if (this.inParty) { this.moveParty(dx, dy); return; }
    const col = this.gridIdx % COLS; const row = Math.floor(this.gridIdx / COLS);
    if (dy > 0 && row === ROWS - 1) { this.enterParty(); return; }
    if (dx < 0 && col === 0) { this.changeBox(-1); return; }
    if (dx > 0 && col === COLS - 1) { this.changeBox(1); return; }
    const nc = Phaser.Math.Clamp(col + dx, 0, COLS - 1);
    const nr = Phaser.Math.Clamp(row + dy, 0, ROWS - 1);
    this.gridIdx = nr * COLS + nc;
    sfx(this, 'select', { volume: 0.3 });
    this.placeCursor();
  }

  moveParty(dx, dy) {
    if (dy < 0) { // volver a la rejilla (última fila)
      this.inParty = false;
      this.gridIdx = (ROWS - 1) * COLS + Math.min(this.partyIdx, COLS - 1);
      sfx(this, 'select', { volume: 0.3 });
      this.placeCursor();
      return;
    }
    const n = Math.max((this.save.party || []).length, 1);
    if (dx) {
      this.partyIdx = Phaser.Math.Clamp(this.partyIdx + dx, 0, n - 1);
      sfx(this, 'select', { volume: 0.3 });
      this.placeCursor();
    }
  }

  enterParty() {
    if (!(this.save.party || []).length) return; // sin equipo no hay fila a la que bajar
    this.inParty = true;
    this.partyIdx = Math.min(this.partyIdx, (this.save.party.length) - 1);
    sfx(this, 'select', { volume: 0.3 });
    this.placeCursor();
  }

  // Cambia de caja (no permitido mientras llevas un Pokémon "en la mano").
  changeBox(d) {
    if (this.holding) return;
    const n = this.pc.boxes.length;
    this.boxIdx = (this.boxIdx + d + n) % n;
    sfx(this, 'select', { volume: 0.45 });
    this.showGrid();
  }

  // ---------- acciones sobre el cursor (A) ----------

  gridConfirm() {
    if (this.action === 'withdraw') return this.doWithdraw();
    if (this.action === 'deposit') return this.doDeposit();
    if (this.action === 'move') return this.doMove();
    return undefined;
  }

  doWithdraw() {
    if (this.inParty) { this.openDialog(['Para retirar, elige un Pokémon de la CAJA.']); return; }
    const res = withdraw(this.save.party, this.pc, this.boxIdx, this.gridIdx);
    if (!res.ok) { this.openDialog([res.error]); return; }
    sfx(this, 'select', { volume: 0.6 });
    this.openDialog([`Has retirado a ${this.displayName(res.mon)}. ¡A la cartera activa!`], () => this.refreshGrid());
  }

  doDeposit() {
    if (!this.inParty) { this.openDialog(['Para depositar, elige un Pokémon del EQUIPO.']); return; }
    const mon = (this.save.party || [])[this.partyIdx];
    if (!mon) { this.openDialog(['Ahí no hay nadie a quien guardar.']); return; }
    const res = deposit(this.save.party, this.pc, this.partyIdx, this.boxIdx);
    if (!res.ok) { this.openDialog([res.error]); return; }
    sfx(this, 'select', { volume: 0.6 });
    if (this.partyIdx >= (this.save.party || []).length) this.partyIdx = Math.max(0, this.save.party.length - 1);
    this.openDialog([`${this.displayName(res.mon)} queda guardado en ${this.pc.names[this.boxIdx]}.`], () => this.refreshGrid());
  }

  // MOVER: primer A "coge" de la caja; segundo A "coloca"/intercambia. El equipo no
  // participa en MOVER (eso es DEPOSITAR/RETIRAR), para no confundir las reglas.
  doMove() {
    if (this.inParty) { this.openDialog(['MOVER es solo entre cajas. Usa DEPOSITAR/RETIRAR con el equipo.']); return; }
    if (!this.holding) {
      const mon = this.pc.boxes[this.boxIdx][this.gridIdx];
      if (!mon) { this.openDialog(['Ahí no hay ningún Pokémon que mover.']); return; }
      this.holding = { box: this.boxIdx, slot: this.gridIdx };
      sfx(this, 'select', { volume: 0.5 });
      this.placeCursor();
      return;
    }
    const res = moveInPc(this.pc, this.holding.box, this.holding.slot, this.boxIdx, this.gridIdx);
    if (!res.ok) { this.openDialog([res.error]); return; }
    this.holding = null;
    sfx(this, 'select', { volume: 0.6 });
    this.refreshGrid();
  }
}
