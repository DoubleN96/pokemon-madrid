// Módulo D — Tienda (Ultramarinos Don Paco). Solo comprar en el MVP, vender no.
// Uso desde WorldScene (NPC con shop: true):
//   import { openShop } from '../ui/shop.js';
//   openShop(this, { onClose: () => {...} });
// La escena que la abre debe ignorar su propio input mientras la tienda esté abierta.
import { GAME_W, GAME_H } from '../config.js';
import {
  drawBox, textStyle, typewriterText, formatMoney, ITEM_NAMES, ITEM_DESCS,
} from './theme.js';

export const SHOP_PRICES = { 'poke-ball': 200, potion: 300, antidote: 100 };

const DEPTH = 9000;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function normalizeItems(items) {
  const list = (items && items.length) ? items : ['poke-ball', 'potion', 'antidote'];
  return list.map((it) => (typeof it === 'string'
    ? { id: it, price: SHOP_PRICES[it] || 0 }
    : { id: it.id, price: it.price != null ? it.price : (SHOP_PRICES[it.id] || 0) }));
}

export function openShop(scene, opts = {}) {
  if (scene._shopUi) return scene._shopUi;
  const save = scene.registry.get('save');
  if (!save) return null;
  const shop = new ShopUI(scene, save, opts);
  scene._shopUi = shop;
  return shop;
}

class ShopUI {
  constructor(scene, save, opts) {
    this.scene = scene;
    this.save = save;
    this.onClose = opts.onClose || null;
    this.items = normalizeItems(opts.items);
    this.state = 'list'; // 'list' | 'qty'
    this.idx = 0;
    this.qty = 1;
    this.sel = null;
    this.writer = null;
    this.listeners = [];
    this.build();
    this.bindKeys();
    this.say('¡Hombre! ¿Qué te pongo?');
  }

  // ---------- Construcción ----------

  build() {
    const s = this.scene;
    this.root = s.add.container(0, 0).setDepth(DEPTH).setScrollFactor(0);
    const dim = s.add.graphics();
    dim.fillStyle(0x000000, 0.35);
    dim.fillRect(0, 0, GAME_W, GAME_H);
    this.root.add(dim);
    this.buildMoneyBox();
    this.buildList();
    this.buildQtyBox();
    this.buildMsgBox();
  }

  buildMoneyBox() {
    this.root.add(drawBox(this.scene, 4, 4, 98, 30));
    this.text(10, 9, 'DINERO');
    this.moneyText = this.text(96, 19, formatMoney(this.save.player.money)).setOrigin(1, 0);
  }

  buildList() {
    const n = this.items.length + 1; // + SALIR
    this.root.add(drawBox(this.scene, 106, 4, 130, n * 14 + 16));
    this.items.forEach((it, i) => {
      this.text(124, 12 + i * 14, ITEM_NAMES[it.id] || it.id.toUpperCase());
      this.text(228, 12 + i * 14, formatMoney(it.price)).setOrigin(1, 0);
    });
    this.text(124, 12 + this.items.length * 14, 'SALIR');
    this.cursorTxt = this.text(114, 12, '▶');
  }

  buildQtyBox() {
    this.qtyBox = this.scene.add.container(0, 0).setVisible(false);
    this.qtyBox.add(drawBox(this.scene, 4, 100, 98, 30));
    this.qtyText = this.scene.add.text(10, 105, '', textStyle());
    this.qtyHint = this.scene.add.text(10, 115, '↑↓ ±1 · ←→ ±10', textStyle({ color: '#787878' }));
    this.qtyBox.add(this.qtyText);
    this.qtyBox.add(this.qtyHint);
    this.root.add(this.qtyBox);
  }

  buildMsgBox() {
    this.root.add(drawBox(this.scene, 2, 134, 236, 24));
    this.msgText = this.scene.add.text(10, 141, '', textStyle({ wordWrap: { width: 220 } }));
    this.root.add(this.msgText);
  }

  text(x, y, str, st = {}) {
    const t = this.scene.add.text(x, y, str, textStyle(st));
    this.root.add(t);
    return t;
  }

  // ---------- Mensajes ----------

  say(str) {
    if (this.writer && !this.writer.done) this.writer.skip();
    this.writer = typewriterText(this.scene, this.msgText, str, 24);
  }

  hint(str) {
    if (this.writer && !this.writer.done) this.writer.skip();
    this.msgText.setText(str);
  }

  // ---------- Input ----------

  bindKeys() {
    const kb = this.scene.input.keyboard;
    const reg = (ev, fn) => { kb.on(ev, fn); this.listeners.push([ev, fn]); };
    reg('keydown-UP', () => this.onDir(-1));
    reg('keydown-DOWN', () => this.onDir(1));
    reg('keydown-LEFT', (e) => this.onSide(-1, e));
    reg('keydown-RIGHT', (e) => this.onSide(1, e));
    reg('keydown-Z', (e) => { if (!(e && e.repeat)) this.onA(); });
    reg('keydown-SPACE', (e) => { if (!(e && e.repeat)) this.onA(); });
    reg('keydown-ENTER', (e) => { if (!(e && e.repeat)) this.onA(); });
    reg('keydown-X', (e) => { if (!(e && e.repeat)) this.onB(); });
    reg('keydown-SHIFT', (e) => { if (!(e && e.repeat)) this.onB(); });
  }

  onDir(d) {
    if (this.state === 'qty') { this.changeQty(-d); return; }
    const n = this.items.length + 1;
    this.idx = (this.idx + d + n) % n;
    this.cursorTxt.y = 12 + this.idx * 14;
    if (this.idx >= this.items.length) this.hint('¿Eso es todo, majete?');
    else this.hint(ITEM_DESCS[this.items[this.idx].id] || '');
  }

  onSide(d) {
    if (this.state === 'qty') this.changeQty(d * 10);
  }

  onA() {
    if (this.state === 'qty') { this.confirmBuy(); return; }
    if (this.idx >= this.items.length) { this.close(); return; }
    this.enterQty(this.items[this.idx]);
  }

  onB() {
    if (this.state === 'qty') {
      this.exitQty();
      this.say('¿Qué te pongo?');
      return;
    }
    this.close();
  }

  // ---------- Compra ----------

  enterQty(item) {
    this.state = 'qty';
    this.sel = item;
    this.qty = 1;
    this.qtyBox.setVisible(true);
    this.refreshQty();
    this.say(`${ITEM_NAMES[item.id] || item.id}, ¿qué cantidad quieres?`);
  }

  changeQty(n) {
    this.qty = clamp(this.qty + n, 1, 99);
    this.refreshQty();
  }

  refreshQty() {
    const total = this.qty * this.sel.price;
    this.qtyText.setText(`×${String(this.qty).padStart(2, '0')} = ${formatMoney(total)}`);
  }

  confirmBuy() {
    const cost = this.sel.price * this.qty;
    const player = this.save.player;
    if (player.money < cost) {
      this.exitQty();
      this.say('¡Que no te llega el parné, chaval!');
      return;
    }
    player.money -= cost;
    if (!this.save.bag) this.save.bag = {};
    this.save.bag[this.sel.id] = (this.save.bag[this.sel.id] || 0) + this.qty;
    this.moneyText.setText(formatMoney(player.money));
    this.exitQty();
    this.say('¡Aquí tienes! ¡Gracias, majo!');
  }

  exitQty() {
    this.state = 'list';
    this.qtyBox.setVisible(false);
  }

  // ---------- Cierre ----------

  close() {
    for (const [ev, fn] of this.listeners) this.scene.input.keyboard.off(ev, fn);
    this.listeners = [];
    if (this.writer && !this.writer.done) this.writer.skip();
    this.root.destroy(true);
    this.scene._shopUi = null;
    if (this.onClose) this.onClose();
  }
}
