// Módulo D — Tienda (Ultramarinos Don Paco). Comprar y vender objetos.
// Uso desde WorldScene (NPC con shop: true):
//   import { openShop } from '../ui/shop.js';
//   openShop(this, { onClose: () => {...} });           // catálogo por defecto
//   openShop(this, { items: ['poke-ball', { id: 'potion', price: 250 }], onClose });
// La escena que la abre debe ignorar su propio input mientras la tienda esté abierta.
import { GAME_W, GAME_H } from '../config.js';
import {
  drawBox, bmText, typewriterText, formatMoney,
} from './theme.js';
import {
  itemName as catItemName, itemDesc as catItemDesc, itemPrice, DEFAULT_SHOP_STOCK,
  buyItem, sellItem,
} from '../core/items.js';

// Precios de compra (en pesetas) derivados del catálogo central (core/items.js).
// Se mantiene exportado por compatibilidad con quien lo importaba.
export const SHOP_PRICES = Object.fromEntries(
  DEFAULT_SHOP_STOCK.map((id) => [id, itemPrice(id)]),
);

// Catálogo por defecto del tendero (orden de aparición en la lista).
const DEFAULT_STOCK = DEFAULT_SHOP_STOCK;

const DEPTH = 9000;
const SELL_RATIO = 0.5;     // precio de venta = mitad del de compra (suelo)
const VISIBLE_ROWS = 7;     // filas visibles antes de hacer scroll

const ROW_H = 14;
const LIST_X = 106;
const LIST_W = 130;
const LIST_TOP = 12;        // y de la primera fila de la lista
const ROW_TEXT_X = 124;
const ROW_PRICE_X = 228;
const CURSOR_X = 114;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function itemName(id) {
  return catItemName(id);
}

function itemDesc(id) {
  return catItemDesc(id);
}

function buyPrice(id, fallback) {
  if (fallback != null) return fallback;
  return itemPrice(id);
}

function sellPrice(id, price) {
  return Math.max(0, Math.floor((price || 0) * SELL_RATIO));
}

// Normaliza el catálogo de compra: acepta strings o { id, price }.
function normalizeItems(items) {
  const list = (items && items.length) ? items : DEFAULT_STOCK;
  return list.map((it) => (typeof it === 'string'
    ? { id: it, price: buyPrice(it) }
    : { id: it.id, price: buyPrice(it.id, it.price) }));
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
    this.buyItems = normalizeItems(opts.items);
    this.mode = 'menu';   // 'menu' | 'list' | 'qty' | 'confirm'
    this.action = null;   // 'buy' | 'sell' (cuando estamos dentro de una lista)
    this.rows = [];       // filas de la lista actual (objetos)
    this.idx = 0;         // índice seleccionado dentro de this.rows
    this.scroll = 0;      // primera fila visible (scroll)
    this.qty = 1;
    this.sel = null;      // objeto seleccionado para comprar/vender
    this.writer = null;
    this.listeners = [];
    this.rowTexts = [];   // controles de texto reutilizados por fila visible
    if (!this.save.bag) this.save.bag = {};
    this.build();
    this.bindKeys();
    this.enterMenu();
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
    this.buildMenu();
    this.buildList();
    this.buildQtyBox();
    this.buildConfirmBox();
    this.buildMsgBox();
  }

  buildMoneyBox() {
    this.root.add(drawBox(this.scene, 4, 4, 98, 30));
    this.text(10, 9, 'DINERO');
    this.moneyText = this.text(96, 19, formatMoney(this.save.player.money)).setOrigin(1, 0);
  }

  // Menú raíz COMPRAR / VENDER / SALIR.
  buildMenu() {
    this.menuBox = this.scene.add.container(0, 0);
    this.menuBox.add(drawBox(this.scene, LIST_X, 4, LIST_W, 3 * ROW_H + 16));
    this.menuOptions = ['COMPRAR', 'VENDER', 'SALIR'];
    this.menuOptions.forEach((label, i) => {
      const t = bmText(this.scene, ROW_TEXT_X, LIST_TOP + i * ROW_H, label, { small: true });
      this.menuBox.add(t);
    });
    this.menuCursor = bmText(this.scene, CURSOR_X, LIST_TOP, '▶', { small: true });
    this.menuBox.add(this.menuCursor);
    this.root.add(this.menuBox);
  }

  // Caja de lista de objetos (compra o venta) con soporte de scroll.
  buildList() {
    this.listBox = this.scene.add.container(0, 0).setVisible(false);
    const h = VISIBLE_ROWS * ROW_H + 16;
    this.listBg = drawBox(this.scene, LIST_X, 4, LIST_W, h);
    this.listBox.add(this.listBg);
    for (let i = 0; i < VISIBLE_ROWS; i += 1) {
      const y = LIST_TOP + i * ROW_H;
      const name = bmText(this.scene, ROW_TEXT_X, y, '', { small: true });
      const price = bmText(this.scene, ROW_PRICE_X, y, '', { small: true, origin: [1, 0] });
      this.listBox.add(name);
      this.listBox.add(price);
      this.rowTexts.push({ name, price });
    }
    this.listCursor = bmText(this.scene, CURSOR_X, LIST_TOP, '▶', { small: true });
    this.listBox.add(this.listCursor);
    // Flechas de scroll (se muestran solo cuando hace falta).
    this.arrowUp = bmText(this.scene, ROW_PRICE_X, 6, '▲', { small: true, color: '#787878', origin: [1, 0] })
      .setVisible(false);
    this.arrowDown = bmText(this.scene, ROW_PRICE_X, 4 + h - 10, '▼', { small: true, color: '#787878', origin: [1, 0] })
      .setVisible(false);
    this.listBox.add(this.arrowUp);
    this.listBox.add(this.arrowDown);
    this.root.add(this.listBox);
  }

  buildQtyBox() {
    this.qtyBox = this.scene.add.container(0, 0).setVisible(false);
    this.qtyBox.add(drawBox(this.scene, 4, 100, 98, 30));
    this.qtyText = bmText(this.scene, 10, 105, '', { small: true });
    this.qtyHint = bmText(this.scene, 10, 115, '↑↓ ±1 · ←→ ±10', { small: true, color: '#787878' });
    this.qtyBox.add(this.qtyText);
    this.qtyBox.add(this.qtyHint);
    this.root.add(this.qtyBox);
  }

  // Caja de confirmación SÍ / NO.
  buildConfirmBox() {
    this.confirmBox = this.scene.add.container(0, 0).setVisible(false);
    this.confirmBox.add(drawBox(this.scene, 188, 96, 48, 34));
    this.confirmYes = bmText(this.scene, 206, 102, 'SÍ', { small: true });
    this.confirmNo = bmText(this.scene, 206, 114, 'NO', { small: true });
    this.confirmCursor = bmText(this.scene, 196, 102, '▶', { small: true });
    this.confirmBox.add(this.confirmYes);
    this.confirmBox.add(this.confirmNo);
    this.confirmBox.add(this.confirmCursor);
    this.confirmIdx = 0; // 0 = SÍ, 1 = NO
    this.root.add(this.confirmBox);
  }

  buildMsgBox() {
    this.root.add(drawBox(this.scene, 2, 134, 236, 24));
    this.msgText = bmText(this.scene, 10, 141, '', { small: true, wrap: 220 });
    this.root.add(this.msgText);
  }

  text(x, y, str, st = {}) {
    const t = bmText(this.scene, x, y, str, { small: true, ...st });
    this.root.add(t);
    return t;
  }

  refreshMoney() {
    this.moneyText.setText(formatMoney(this.save.player.money));
  }

  // ---------- Mensajes ----------

  say(str) {
    if (this.writer && !this.writer.done) this.writer.skip();
    this.writer = typewriterText(this.scene, this.msgText, str, 24);
  }

  hint(str) {
    if (this.writer && !this.writer.done) this.writer.skip();
    this.msgText.setText(str || '');
  }

  // ---------- Menú raíz ----------

  enterMenu() {
    this.mode = 'menu';
    this.action = null;
    this.sel = null;
    this.menuIdx = 0;
    this.menuBox.setVisible(true);
    this.listBox.setVisible(false);
    this.qtyBox.setVisible(false);
    this.confirmBox.setVisible(false);
    this.menuCursor.y = LIST_TOP;
    this.say('¡Hombre! ¿Compras o vendes?');
  }

  moveMenu(d) {
    const n = this.menuOptions.length;
    this.menuIdx = (this.menuIdx + d + n) % n;
    this.menuCursor.y = LIST_TOP + this.menuIdx * ROW_H;
  }

  chooseMenu() {
    if (this.menuIdx === 0) this.enterList('buy');
    else if (this.menuIdx === 1) this.enterList('sell');
    else this.close();
  }

  // ---------- Lista (compra/venta) ----------

  buildBuyRows() {
    return this.buyItems.map((it) => ({
      id: it.id,
      price: it.price,
      name: itemName(it.id),
      priceText: formatMoney(it.price),
    }));
  }

  buildSellRows() {
    const bag = this.save.bag || {};
    return Object.keys(bag)
      .filter((id) => (bag[id] || 0) > 0)
      .map((id) => {
        const price = sellPrice(id, buyPrice(id));
        return {
          id,
          price,
          owned: bag[id],
          name: itemName(id),
          priceText: `${formatMoney(price)} ×${bag[id]}`,
        };
      });
  }

  enterList(action) {
    this.action = action;
    this.rows = action === 'buy' ? this.buildBuyRows() : this.buildSellRows();
    if (action === 'sell' && this.rows.length === 0) {
      this.say('No llevas nada que yo quiera comprar, majo.');
      return;
    }
    this.mode = 'list';
    this.idx = 0;
    this.scroll = 0;
    this.menuBox.setVisible(false);
    this.listBox.setVisible(true);
    this.renderList();
    this.say(action === 'buy' ? '¿Qué te pongo?' : '¿Qué me vendes?');
    this.describeCurrent();
  }

  // Filas mostradas = ventana visible + opción SALIR al final.
  totalListEntries() {
    return this.rows.length + 1; // + SALIR
  }

  renderList() {
    const total = this.totalListEntries();
    const maxScroll = Math.max(0, total - VISIBLE_ROWS);
    this.scroll = clamp(this.scroll, 0, maxScroll);

    for (let i = 0; i < VISIBLE_ROWS; i += 1) {
      const entry = this.scroll + i;
      const { name, price } = this.rowTexts[i];
      if (entry >= total) { name.setText(''); price.setText(''); continue; }
      if (entry === this.rows.length) {
        name.setText('SALIR');
        price.setText('');
      } else {
        const row = this.rows[entry];
        name.setText(row.name);
        price.setText(row.priceText);
      }
    }
    this.listCursor.y = LIST_TOP + (this.idx - this.scroll) * ROW_H;
    this.arrowUp.setVisible(this.scroll > 0);
    this.arrowDown.setVisible(this.scroll + VISIBLE_ROWS < total);
  }

  moveList(d) {
    const total = this.totalListEntries();
    this.idx = (this.idx + d + total) % total;
    // Ajustar scroll para mantener el cursor visible.
    if (this.idx < this.scroll) this.scroll = this.idx;
    else if (this.idx >= this.scroll + VISIBLE_ROWS) this.scroll = this.idx - VISIBLE_ROWS + 1;
    this.renderList();
    this.describeCurrent();
  }

  describeCurrent() {
    if (this.idx >= this.rows.length) {
      this.hint(this.action === 'buy' ? '¿Eso es todo, majete?' : 'Cuando quieras, lo dejamos.');
      return;
    }
    this.hint(itemDesc(this.rows[this.idx].id));
  }

  chooseListEntry() {
    if (this.idx >= this.rows.length) { this.enterMenu(); return; }
    this.sel = this.rows[this.idx];
    this.enterQty();
  }

  // ---------- Cantidad ----------

  enterQty() {
    this.mode = 'qty';
    this.qty = 1;
    this.qtyBox.setVisible(true);
    this.refreshQty();
    const verb = this.action === 'buy' ? 'quieres' : 'vendes';
    this.say(`${this.sel.name}, ¿cuánto ${verb}?`);
  }

  // Tope de cantidad: 99 al comprar, lo que lleves en la mochila al vender.
  qtyMax() {
    if (this.action === 'sell') return Math.max(1, this.sel.owned || 1);
    return 99;
  }

  changeQty(n) {
    this.qty = clamp(this.qty + n, 1, this.qtyMax());
    this.refreshQty();
  }

  refreshQty() {
    const total = this.qty * this.sel.price;
    this.qtyText.setText(`×${String(this.qty).padStart(2, '0')} = ${formatMoney(total)}`);
  }

  exitQty() {
    this.mode = 'list';
    this.qtyBox.setVisible(false);
    this.renderList();
  }

  // ---------- Confirmación ----------

  enterConfirm() {
    this.mode = 'confirm';
    this.confirmIdx = 0;
    this.confirmCursor.y = 102;
    this.confirmBox.setVisible(true);
    const total = this.qty * this.sel.price;
    if (this.action === 'buy') {
      this.say(`${this.sel.name} ×${this.qty}. Serían ${formatMoney(total)}. ¿De acuerdo?`);
    } else {
      this.say(`Te doy ${formatMoney(total)} por ${this.sel.name} ×${this.qty}. ¿Trato?`);
    }
  }

  moveConfirm(d) {
    this.confirmIdx = (this.confirmIdx + d + 2) % 2;
    this.confirmCursor.y = this.confirmIdx === 0 ? 102 : 114;
  }

  resolveConfirm() {
    this.confirmBox.setVisible(false);
    if (this.confirmIdx === 1) { // NO
      this.exitQty();
      this.say(this.action === 'buy' ? '¿Algo más?' : '¿Qué me vendes?');
      return;
    }
    if (this.action === 'buy') this.commitBuy();
    else this.commitSell();
  }

  // ---------- Operaciones ----------

  commitBuy() {
    // Lógica de compra COMPARTIDA con los tests (core/items.js#buyItem): valida
    // saldo, descuenta dinero y añade a la bolsa de forma pura; aquí se aplica.
    const wallet = { money: this.save.player.money, bag: this.save.bag };
    const res = buyItem(wallet, this.sel.id, this.qty, this.sel.price);
    if (!res.ok) {
      this.exitQty();
      this.say('¡Que no te llega el parné, chaval!');
      return;
    }
    this.save.player.money = res.money;
    this.save.bag = res.bag;
    this.refreshMoney();
    this.exitQty();
    this.say('¡Aquí tienes! ¡Gracias, majo!');
  }

  commitSell() {
    // Lógica de venta COMPARTIDA con los tests (core/items.js#sellItem).
    const wallet = { money: this.save.player.money, bag: this.save.bag };
    const res = sellItem(wallet, this.sel.id, this.qty, this.sel.price);
    if (!res.ok) {
      this.exitQty();
      this.say('Si no llevas nada, poco puedo comprarte.');
      return;
    }
    const gain = res.gain;
    this.save.player.money = res.money;
    this.save.bag = res.bag;
    this.refreshMoney();
    // Reconstruir la lista de venta (cambió la mochila) y volver a ella.
    this.qtyBox.setVisible(false);
    this.rows = this.buildSellRows();
    if (this.rows.length === 0) {
      this.enterMenu();
      this.say(`¡Toma ${formatMoney(gain)}! Y ya no te queda nada que venderme.`);
      return;
    }
    this.mode = 'list';
    this.idx = clamp(this.idx, 0, this.rows.length); // permitir caer en SALIR
    this.scroll = clamp(this.scroll, 0, Math.max(0, this.totalListEntries() - VISIBLE_ROWS));
    this.renderList();
    this.describeCurrent();
    this.say(`¡Aquí tienes ${formatMoney(gain)}! ¿Algo más?`);
  }

  // ---------- Input ----------

  bindKeys() {
    const kb = this.scene.input.keyboard;
    const reg = (ev, fn) => { kb.on(ev, fn); this.listeners.push([ev, fn]); };
    reg('keydown-UP', () => this.onDir(-1));
    reg('keydown-DOWN', () => this.onDir(1));
    reg('keydown-LEFT', () => this.onSide(-1));
    reg('keydown-RIGHT', () => this.onSide(1));
    reg('keydown-Z', (e) => { if (!(e && e.repeat)) this.onA(); });
    reg('keydown-SPACE', (e) => { if (!(e && e.repeat)) this.onA(); });
    reg('keydown-ENTER', (e) => { if (!(e && e.repeat)) this.onA(); });
    reg('keydown-X', (e) => { if (!(e && e.repeat)) this.onB(); });
    reg('keydown-SHIFT', (e) => { if (!(e && e.repeat)) this.onB(); });
  }

  onDir(d) {
    if (this.mode === 'qty') { this.changeQty(-d); return; }
    if (this.mode === 'confirm') { this.moveConfirm(d); return; }
    if (this.mode === 'list') { this.moveList(d); return; }
    if (this.mode === 'menu') { this.moveMenu(d); return; }
  }

  onSide(d) {
    if (this.mode === 'qty') this.changeQty(d * 10);
  }

  onA() {
    if (this.mode === 'menu') { this.chooseMenu(); return; }
    if (this.mode === 'list') { this.chooseListEntry(); return; }
    if (this.mode === 'qty') { this.enterConfirm(); return; }
    if (this.mode === 'confirm') { this.resolveConfirm(); return; }
  }

  onB() {
    if (this.mode === 'confirm') {
      this.confirmBox.setVisible(false);
      this.exitQty();
      this.say(this.action === 'buy' ? '¿Algo más?' : '¿Qué me vendes?');
      return;
    }
    if (this.mode === 'qty') {
      this.exitQty();
      this.say(this.action === 'buy' ? '¿Qué te pongo?' : '¿Qué me vendes?');
      return;
    }
    if (this.mode === 'list') { this.enterMenu(); return; }
    this.close(); // mode === 'menu'
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
