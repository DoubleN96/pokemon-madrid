// Módulo D — Tienda (Ultramarinos Don Paco). Comprar y vender objetos.
// Uso desde WorldScene (NPC con shop: true):
//   import { openShop } from '../ui/shop.js';
//   openShop(this, { onClose: () => {...} });           // catálogo por defecto
//   openShop(this, { items: ['poke-ball', { id: 'potion', price: 250 }], onClose });
// La escena que la abre debe ignorar su propio input mientras la tienda esté abierta.
import { GAME_W, GAME_H } from '../config.js';
import {
  drawBox, textStyle, typewriterText, formatMoney, ITEM_NAMES, ITEM_DESCS,
} from './theme.js';

// Precios de compra (en pesetas). Coherentes con la economía estilo FRLG.
export const SHOP_PRICES = {
  'poke-ball': 200,
  'super-ball': 600,
  potion: 300,
  superpotion: 700,
  antidote: 100,
  repel: 350,
  'poke-doll': 1000,
};

// Catálogo por defecto del tendero (orden de aparición en la lista).
const DEFAULT_STOCK = ['poke-ball', 'super-ball', 'potion', 'superpotion', 'antidote', 'repel'];

// Nombres locales para objetos que aún no están en theme.js (ITEM_NAMES tiene prioridad).
const LOCAL_NAMES = {
  'super-ball': 'SUPER BALL',
  superpotion: 'SUPERPOCIÓN',
  repel: 'REPELENTE',
};

// Descripciones locales (ITEM_DESCS de theme.js tiene prioridad).
const LOCAL_DESCS = {
  'super-ball': 'Más eficaz que la Poké Ball para capturar.',
  superpotion: 'Restaura 50 PS de un Pokémon.',
  repel: 'Aleja a los Pokémon salvajes un rato.',
};

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
  return ITEM_NAMES[id] || LOCAL_NAMES[id] || String(id).toUpperCase();
}

function itemDesc(id) {
  return ITEM_DESCS[id] || LOCAL_DESCS[id] || '';
}

function buyPrice(id, fallback) {
  if (fallback != null) return fallback;
  return SHOP_PRICES[id] != null ? SHOP_PRICES[id] : 0;
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
      const t = this.scene.add.text(ROW_TEXT_X, LIST_TOP + i * ROW_H, label, textStyle());
      this.menuBox.add(t);
    });
    this.menuCursor = this.scene.add.text(CURSOR_X, LIST_TOP, '▶', textStyle());
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
      const name = this.scene.add.text(ROW_TEXT_X, y, '', textStyle());
      const price = this.scene.add.text(ROW_PRICE_X, y, '', textStyle()).setOrigin(1, 0);
      this.listBox.add(name);
      this.listBox.add(price);
      this.rowTexts.push({ name, price });
    }
    this.listCursor = this.scene.add.text(CURSOR_X, LIST_TOP, '▶', textStyle());
    this.listBox.add(this.listCursor);
    // Flechas de scroll (se muestran solo cuando hace falta).
    this.arrowUp = this.scene.add.text(ROW_PRICE_X, 6, '▲', textStyle({ color: '#787878' }))
      .setOrigin(1, 0).setVisible(false);
    this.arrowDown = this.scene.add.text(ROW_PRICE_X, 4 + h - 10, '▼', textStyle({ color: '#787878' }))
      .setOrigin(1, 0).setVisible(false);
    this.listBox.add(this.arrowUp);
    this.listBox.add(this.arrowDown);
    this.root.add(this.listBox);
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

  // Caja de confirmación SÍ / NO.
  buildConfirmBox() {
    this.confirmBox = this.scene.add.container(0, 0).setVisible(false);
    this.confirmBox.add(drawBox(this.scene, 188, 96, 48, 34));
    this.confirmYes = this.scene.add.text(206, 102, 'SÍ', textStyle());
    this.confirmNo = this.scene.add.text(206, 114, 'NO', textStyle());
    this.confirmCursor = this.scene.add.text(196, 102, '▶', textStyle());
    this.confirmBox.add(this.confirmYes);
    this.confirmBox.add(this.confirmNo);
    this.confirmBox.add(this.confirmCursor);
    this.confirmIdx = 0; // 0 = SÍ, 1 = NO
    this.root.add(this.confirmBox);
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
    const cost = this.sel.price * this.qty;
    const player = this.save.player;
    if (player.money < cost) {
      this.exitQty();
      this.say('¡Que no te llega el parné, chaval!');
      return;
    }
    player.money -= cost;
    this.save.bag[this.sel.id] = (this.save.bag[this.sel.id] || 0) + this.qty;
    this.refreshMoney();
    this.exitQty();
    this.say('¡Aquí tienes! ¡Gracias, majo!');
  }

  commitSell() {
    const bag = this.save.bag || {};
    const owned = bag[this.sel.id] || 0;
    const qty = Math.min(this.qty, owned);
    if (qty <= 0) {
      this.exitQty();
      this.say('Si no llevas nada, poco puedo comprarte.');
      return;
    }
    const gain = this.sel.price * qty;
    bag[this.sel.id] = owned - qty;
    if (bag[this.sel.id] <= 0) delete bag[this.sel.id];
    this.save.player.money += gain;
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
