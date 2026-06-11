import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import {
  drawBox, textStyle, drawHpBar, formatMoney, BOX_COLORS,
  TEXT_COLOR_LIGHT, TEXT_COLOR_DIM, TYPE_NAMES, TYPE_COLORS,
  STATUS_LABELS, ITEM_NAMES, ITEM_DESCS,
} from '../ui/theme.js';
import { calcStats } from '../core/formulas.js';
import { saveGame } from '../services/saves.js';

const OPTIONS = [
  { id: 'team', label: 'EQUIPO' },
  { id: 'bag', label: 'MOCHILA' },
  { id: 'moto', label: 'MOTO' },
  { id: 'dex', label: 'POKÉDEX' },
  { id: 'save', label: 'GUARDAR' },
  { id: 'exit', label: 'SALIR' },
];
const ROOT_W = 80;
const ROOT_X = GAME_W - ROOT_W - 2;
const DEX_ROWS = 9;
const TOTAL_SPECIES = 151;

// Overlay de menú de pausa sobre World (World se pausa al lanzarlo).
// Navegación: flechas + A (Z/Espacio) confirma, B (X/Shift) atrás.
// Enter: en el menú raíz cierra (toggle); en submenús confirma.
export default class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    this.save = this.registry.get('save');
    this.dexData = this.registry.get('pokedex') || [];
    this.movesData = this.registry.get('movesData') || {};
    this.busy = false;
    this.pendingItem = null;
    this.view = null;
    this.rootIdx = 0;
    this.teamIdx = 0;
    this.bagIdx = 0;
    this.dexCursor = 0;
    this.dexTop = 0;
    if (!this.save) { this.closeMenu(); return; }
    this.bindKeys();
    this.showRoot();
  }

  // ---------- Input ----------

  bindKeys() {
    const kb = this.input.keyboard;
    const dir = (dx, dy) => () => { if (!this.busy) this.onDir(dx, dy); };
    const tap = (fn) => (ev) => { if (!(ev && ev.repeat) && !this.busy) fn(); };
    kb.on('keydown-UP', dir(0, -1));
    kb.on('keydown-DOWN', dir(0, 1));
    kb.on('keydown-LEFT', dir(-1, 0));
    kb.on('keydown-RIGHT', dir(1, 0));
    kb.on('keydown-Z', tap(() => this.onA()));
    kb.on('keydown-SPACE', tap(() => this.onA()));
    kb.on('keydown-X', tap(() => this.onB()));
    kb.on('keydown-SHIFT', tap(() => this.onB()));
    kb.on('keydown-ENTER', tap(() => this.onEnter()));
  }

  onDir(dx, dy) {
    if (this.mode === 'root' && dy) this.moveRoot(dy);
    else if (this.mode === 'team' && dy) this.moveTeam(dy);
    else if (this.mode === 'detail' && dy) this.detailMove(dy);
    else if (this.mode === 'bag' && dy) this.moveBag(dy);
    else if (this.mode === 'dex') this.moveDex(dy, dx);
  }

  onA() {
    if (this.mode === 'root') this.selectRoot();
    else if (this.mode === 'team') this.selectTeamSlot();
    else if (this.mode === 'bag') this.selectBagItem();
  }

  onB() {
    if (this.mode === 'root') this.closeMenu();
    else if (this.mode === 'team' && this.pendingItem) { this.pendingItem = null; this.showBag(); }
    else if (this.mode === 'team') this.showRoot();
    else if (this.mode === 'detail') this.showTeam();
    else this.showRoot();
  }

  onEnter() {
    if (this.mode === 'root') this.closeMenu();
    else this.onA();
  }

  // ---------- Helpers ----------

  setView() {
    if (this.view) this.view.destroy(true);
    this.view = this.add.container(0, 0);
    return this.view;
  }

  addText(c, x, y, str, st = {}) {
    const t = this.add.text(x, y, str, textStyle(st));
    c.add(t);
    return t;
  }

  speciesOf(mon) { return this.dexData[mon.species - 1] || {}; }

  displayName(mon) {
    return String(mon.nickname || this.speciesOf(mon).name || '???').toUpperCase();
  }

  openDialog(lines, onClose = null) {
    this.busy = true;
    this.scene.launch('Dialog', {
      lines,
      onClose: () => { this.busy = false; if (onClose) onClose(); },
    });
  }

  closeMenu() {
    if (this.scene.isPaused('World')) this.scene.resume('World');
    else if (this.scene.isSleeping('World')) this.scene.wake('World');
    this.scene.stop();
  }

  // Carga bajo demanda de iconos de party (assets/sprites/pokemon/icons/<id>.png).
  ensureIcons(ids, onReady) {
    const missing = [...new Set(ids)].filter((id) => !this.textures.exists(`pkmn_icon_${id}`));
    if (!missing.length) { onReady(); return; }
    for (const id of missing) {
      this.load.image(`pkmn_icon_${id}`, `assets/sprites/pokemon/icons/${id}.png`);
    }
    this.load.once('complete', () => { if (this.scene.isActive()) onReady(); });
    this.load.start();
  }

  // ---------- Menú raíz ----------

  showRoot() {
    this.mode = 'root';
    this.pendingItem = null;
    const c = this.setView();
    c.add(drawBox(this, ROOT_X, 2, ROOT_W, OPTIONS.length * 14 + 12));
    this.rootTexts = OPTIONS.map((o, i) => this.addText(c, ROOT_X + 17, 9 + i * 14, o.label));
    this.rootCursor = this.addText(c, ROOT_X + 8, 9, '▶');
    this.moveRoot(0);
  }

  moveRoot(d) {
    const n = OPTIONS.length;
    this.rootIdx = (this.rootIdx + d + n) % n;
    this.rootCursor.y = this.rootTexts[this.rootIdx].y;
  }

  selectRoot() {
    const id = OPTIONS[this.rootIdx].id;
    if (id === 'team') this.showTeam();
    else if (id === 'bag') this.showBag();
    else if (id === 'moto') this.toggleMoto();
    else if (id === 'dex') this.showDex();
    else if (id === 'save') this.doSave();
    else this.closeMenu();
  }

  // Sube/baja de la moto: movimiento mucho más rápido por el overworld.
  toggleMoto() {
    if (!this.save.flags) this.save.flags = {};
    this.save.flags.riding = !this.save.flags.riding;
    this.closeMenu();
  }

  // ---------- Equipo ----------

  showTeam() {
    this.mode = 'team';
    const ids = (this.save.party || []).map((m) => m.species);
    this.ensureIcons(ids, () => this.buildTeam());
  }

  buildTeam() {
    if (this.mode !== 'team') return;
    const c = this.setView();
    c.add(drawBox(this, 0, 0, GAME_W, GAME_H, { fill: BOX_COLORS.panelTeam }));
    const title = this.pendingItem
      ? `¿A quién le das: ${ITEM_NAMES[this.pendingItem] || this.pendingItem}?`
      : 'EQUIPO POKÉMON';
    this.addText(c, 8, 5, title);
    for (let i = 0; i < 6; i += 1) this.buildTeamRow(c, (this.save.party || [])[i], i);
    this.teamSel = this.add.graphics();
    c.add(this.teamSel);
    this.moveTeam(0);
  }

  buildTeamRow(c, mon, i) {
    const y = 17 + i * 23;
    c.add(drawBox(this, 4, y, 232, 22));
    if (!mon) {
      this.addText(c, 112, y + 7, '----', { color: TEXT_COLOR_DIM });
      return;
    }
    const max = calcStats(this.speciesOf(mon), mon).hp;
    const icon = this.add.image(19, y + 11, `pkmn_icon_${mon.species}`).setScale(0.6);
    c.add(icon);
    this.addText(c, 36, y + 3, this.displayName(mon));
    this.addText(c, 124, y + 3, `Nv.${mon.level}`);
    const st = mon.currentHp <= 0 ? 'DEB' : (STATUS_LABELS[mon.status] || '');
    if (st) this.addText(c, 164, y + 3, st, { color: '#c03028' });
    this.addText(c, 36, y + 12, 'PS');
    c.add(drawHpBar(this, 50, y + 14, 64, 5, max ? mon.currentHp / max : 0));
    this.addText(c, 124, y + 12, `${mon.currentHp}/${max}`);
  }

  moveTeam(d) {
    this.teamIdx = (this.teamIdx + d + 6) % 6;
    const y = 17 + this.teamIdx * 23;
    this.teamSel.clear();
    this.teamSel.lineStyle(2, 0xf8b800, 1);
    this.teamSel.strokeRoundedRect(4, y, 232, 22, 3);
  }

  selectTeamSlot() {
    const mon = (this.save.party || [])[this.teamIdx];
    if (!mon) return;
    if (this.pendingItem) this.useItemOnSlot(mon);
    else this.showDetail(this.teamIdx);
  }

  useItemOnSlot(mon) {
    const item = this.pendingItem;
    const res = this.applyItem(item, mon);
    if (res.used) this.save.bag[item] = Math.max((this.save.bag[item] || 1) - 1, 0);
    this.openDialog([res.msg], () => {
      if (!res.used) return;
      if ((this.save.bag[item] || 0) <= 0) { this.pendingItem = null; this.showBag(); } else this.buildTeam();
    });
  }

  // Curación fuera de combate (la curación completa en Centros la hace el core healFull).
  applyItem(item, mon) {
    const name = this.displayName(mon);
    if (item === 'potion') {
      if (mon.currentHp <= 0) return { used: false, msg: `${name} está debilitado. Así no le hace nada.` };
      const max = calcStats(this.speciesOf(mon), mon).hp;
      if (mon.currentHp >= max) return { used: false, msg: `${name} ya tiene los PS al máximo.` };
      const healed = Math.min(20, max - mon.currentHp);
      mon.currentHp += healed;
      return { used: true, msg: `¡${name} ha recuperado ${healed} PS!` };
    }
    if (item === 'antidote') {
      if (mon.status !== 'psn') return { used: false, msg: 'No tendría ningún efecto.' };
      mon.status = null;
      return { used: true, msg: `¡${name} se ha curado del veneno!` };
    }
    return { used: false, msg: 'Eso no se puede usar ahora.' };
  }

  // ---------- Detalle de Pokémon ----------

  showDetail(idx) {
    this.mode = 'detail';
    this.detailIdx = idx;
    this.buildDetail();
  }

  buildDetail() {
    const mon = (this.save.party || [])[this.detailIdx];
    if (!mon) { this.showTeam(); return; }
    const c = this.setView();
    c.add(drawBox(this, 0, 0, GAME_W, GAME_H, { fill: BOX_COLORS.panelDetail }));
    this.buildDetailHeader(c, mon);
    this.buildDetailStats(c, mon);
    this.buildDetailMoves(c, mon);
    this.addText(c, 8, 149, '↑↓ cambiar · B volver', { color: TEXT_COLOR_DIM });
  }

  buildDetailHeader(c, mon) {
    const sp = this.speciesOf(mon);
    c.add(drawBox(this, 4, 4, 232, 30));
    const icon = this.add.image(20, 19, `pkmn_icon_${mon.species}`).setScale(0.7);
    c.add(icon);
    this.addText(c, 40, 8, this.displayName(mon));
    this.addText(c, 132, 8, `Nv.${mon.level}`);
    this.addText(c, 230, 8, `N.º${String(sp.id || 0).padStart(3, '0')}`, { color: TEXT_COLOR_DIM }).setOrigin(1, 0);
    let x = 40;
    for (const t of sp.types || []) x = this.addTypeBadge(c, x, 19, t) + 4;
  }

  addTypeBadge(c, x, y, type) {
    const label = TYPE_NAMES[type] || String(type).toUpperCase();
    const w = label.length * 5 + 8;
    const g = this.add.graphics();
    g.fillStyle(TYPE_COLORS[type] != null ? TYPE_COLORS[type] : 0x888888, 1);
    g.fillRoundedRect(x, y, w, 11, 2);
    c.add(g);
    this.addText(c, x + 4, y + 2, label, { color: TEXT_COLOR_LIGHT });
    return x + w;
  }

  buildDetailStats(c, mon) {
    const st = calcStats(this.speciesOf(mon), mon);
    c.add(drawBox(this, 4, 38, 110, 108));
    const rows = [
      ['PS', `${mon.currentHp}/${st.hp}`],
      ['ATAQUE', String(st.atk)],
      ['DEFENSA', String(st.def)],
      ['AT. ESP.', String(st.spa)],
      ['DEF. ESP.', String(st.spd)],
      ['VELOCIDAD', String(st.spe)],
      ['EXP.', String(mon.exp)],
      ['ESTADO', mon.currentHp <= 0 ? 'DEB' : (STATUS_LABELS[mon.status] || 'OK')],
    ];
    rows.forEach(([k, v], i) => {
      this.addText(c, 10, 44 + i * 12, k);
      this.addText(c, 108, 44 + i * 12, v).setOrigin(1, 0);
    });
  }

  buildDetailMoves(c, mon) {
    c.add(drawBox(this, 118, 38, 118, 108));
    this.addText(c, 124, 42, 'MOVIMIENTOS', { color: TEXT_COLOR_DIM });
    (mon.moves || []).slice(0, 4).forEach((mv, i) => {
      const data = this.movesData[mv.id] || {};
      const y = 54 + i * 23;
      this.addText(c, 124, y, String(data.name || mv.id).toUpperCase());
      this.addText(c, 124, y + 9, TYPE_NAMES[data.type] || '', { color: TEXT_COLOR_DIM });
      this.addText(c, 230, y + 9, `PP ${mv.pp}/${mv.maxPp}`).setOrigin(1, 0);
    });
  }

  detailMove(d) {
    const party = this.save.party || [];
    if (!party.length) return;
    let i = this.detailIdx;
    for (let k = 0; k < party.length; k += 1) {
      i = (i + d + party.length) % party.length;
      if (party[i]) {
        this.detailIdx = i;
        this.teamIdx = i;
        this.buildDetail();
        return;
      }
    }
  }

  // ---------- Mochila ----------

  showBag() {
    this.mode = 'bag';
    this.pendingItem = null;
    const c = this.setView();
    c.add(drawBox(this, 0, 0, GAME_W, GAME_H, { fill: BOX_COLORS.panelBag }));
    this.addText(c, 8, 5, 'MOCHILA');
    this.addText(c, 232, 5, formatMoney((this.save.player || {}).money)).setOrigin(1, 0);
    c.add(drawBox(this, 4, 17, 232, 110));
    this.bagItems = Object.entries(this.save.bag || {})
      .filter(([, q]) => q > 0)
      .slice(0, 8)
      .map(([id, q]) => ({ id, q }));
    if (!this.bagItems.length) this.addText(c, 14, 26, 'No llevas nada de nada.', { color: TEXT_COLOR_DIM });
    this.bagItems.forEach((it, i) => {
      this.addText(c, 24, 24 + i * 13, ITEM_NAMES[it.id] || it.id.toUpperCase());
      this.addText(c, 226, 24 + i * 13, `×${it.q}`).setOrigin(1, 0);
    });
    c.add(drawBox(this, 4, 131, 232, 25));
    this.bagDesc = this.addText(c, 10, 137, '', { wordWrap: { width: 218 } });
    this.bagCursor = this.addText(c, 13, 24, '▶').setVisible(this.bagItems.length > 0);
    this.bagIdx = Math.min(this.bagIdx, Math.max(this.bagItems.length - 1, 0));
    if (this.bagItems.length) this.moveBag(0);
  }

  moveBag(d) {
    if (!this.bagItems.length) return;
    const n = this.bagItems.length;
    this.bagIdx = (this.bagIdx + d + n) % n;
    this.bagCursor.y = 24 + this.bagIdx * 13;
    this.bagDesc.setText(ITEM_DESCS[this.bagItems[this.bagIdx].id] || '');
  }

  selectBagItem() {
    if (!this.bagItems.length) return;
    const { id } = this.bagItems[this.bagIdx];
    if (id === 'potion' || id === 'antidote') {
      this.pendingItem = id;
      this.showTeam();
      return;
    }
    this.openDialog(['Mejor guárdalo para el momento oportuno.']);
  }

  // ---------- Pokédex ----------

  showDex() {
    this.mode = 'dex';
    const c = this.setView();
    c.add(drawBox(this, 0, 0, GAME_W, GAME_H, { fill: BOX_COLORS.panelDex }));
    const pdx = this.save.pokedex || {};
    const seen = pdx.seen || [];
    const caught = pdx.caught || [];
    this.addText(c, 8, 5, 'POKÉDEX', { color: TEXT_COLOR_LIGHT });
    this.addText(c, 232, 5, `VISTOS ${seen.length} · CAPTURADOS ${caught.length}`, { color: TEXT_COLOR_LIGHT })
      .setOrigin(1, 0);
    c.add(drawBox(this, 4, 17, 232, 139));
    this.dexSeen = new Set(seen);
    this.dexCaught = new Set(caught);
    this.dexRowTexts = [];
    for (let r = 0; r < DEX_ROWS; r += 1) this.dexRowTexts.push(this.addText(c, 26, 24 + r * 14, ''));
    this.dexCursorTxt = this.addText(c, 14, 24, '▶');
    this.refreshDex();
  }

  refreshDex() {
    for (let r = 0; r < DEX_ROWS; r += 1) {
      const i = this.dexTop + r;
      const t = this.dexRowTexts[r];
      if (i >= TOTAL_SPECIES) { t.setText(''); continue; }
      const sp = this.dexData[i] || { id: i + 1, name: '?' };
      const num = String(sp.id).padStart(3, '0');
      const ball = this.dexCaught.has(sp.id) ? '●' : ' ';
      const name = this.dexSeen.has(sp.id) ? String(sp.name).toUpperCase() : '----------';
      t.setText(`N.º${num} ${ball} ${name}`);
    }
    this.dexCursorTxt.y = 24 + (this.dexCursor - this.dexTop) * 14;
  }

  moveDex(dy, dx) {
    const step = dy + dx * 10;
    if (!step) return;
    this.dexCursor = Phaser.Math.Clamp(this.dexCursor + step, 0, TOTAL_SPECIES - 1);
    if (this.dexCursor < this.dexTop) this.dexTop = this.dexCursor;
    if (this.dexCursor > this.dexTop + DEX_ROWS - 1) this.dexTop = this.dexCursor - DEX_ROWS + 1;
    this.dexTop = Phaser.Math.Clamp(this.dexTop, 0, TOTAL_SPECIES - DEX_ROWS);
    this.refreshDex();
  }

  // ---------- Guardar ----------

  doSave() {
    this.busy = true;
    Promise.resolve()
      .then(() => saveGame(this.save))
      .then((res) => this.afterSave(res))
      .catch(() => this.afterSave(null));
  }

  afterSave(res) {
    this.busy = false;
    let msg = 'No se ha podido guardar la partida. Inténtalo de nuevo.';
    if (res && res.ok) {
      msg = res.where === 'local'
        ? '¡Partida guardada! (copia local, sin conexión)'
        : '¡Partida guardada!';
    }
    this.openDialog([msg]);
  }
}
