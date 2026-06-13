// Escena MAPA (Town Map estilo FRLG) — pantalla informativa de "¿dónde estoy?".
//
// Overlay sobre World (igual que MenuScene/PcScene: World queda por debajo con
// inputLocked). Registro PEREZOSO desde MenuScene para no tocar main.js. Input por
// EVENTOS keydown (no JustDown), coherente con el resto de escenas: así no se rompe
// tras sleep/restart.
//
// Muestra una vista esquemática de España con geografía REAL aproximada:
//   - MADRID en el centro (Tetuán, Ruta 2, Chamberí, Gran Vía, Retiro).
//   - BERCERO al noroeste (Valladolid).
//   - TORREVIEJA al sureste (costa de Alicante).
// Resalta con un marcador "ESTÁS AQUÍ" (rojo parpadeante) la zona donde está el
// jugador. Las flechas mueven un cursor entre puntos para leer su descripción.
// Cierra con B (X/Shift) o Esc.
//
// PREPARADO para VUELO futuro: cada punto sabe si es `flyable` y a dónde volar,
// pero el viaje rápido NO se implementa aquí (solo mapa informativo).
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { sfx } from '../audio/AudioManager.js';
import { drawBox, bmText, TEXT_COLOR_DIM, TEXT_COLOR_LIGHT } from '../ui/theme.js';
import {
  MAP_VIEW, MAP_COLORS, REGIONS, MAP_POINTS,
  pointForMap, toScreen, rectToScreen,
} from '../world/townMap.js';

export default class MapScene extends Phaser.Scene {
  constructor() { super('Map'); }

  create() {
    this.save = this.registry.get('save');
    this.busy = false;
    this.view = null;
    // Punto donde está el jugador (resuelto desde save.player.map).
    const currentMapId = (this.save && this.save.player && this.save.player.map) || 'tetuan';
    this.herePoint = pointForMap(currentMapId);
    // Cursor de selección: empieza sobre el punto actual (o el primero).
    const hereIdx = this.herePoint ? MAP_POINTS.indexOf(this.herePoint) : 0;
    this.cursorIdx = hereIdx >= 0 ? hereIdx : 0;
    this.bindKeys();
    this.build();
    this.startBlink();
  }

  // ---------- input (eventos, no JustDown) ----------

  bindKeys() {
    const kb = this.input.keyboard;
    const dir = (dx, dy) => (ev) => { if (!(ev && ev.repeat) && !this.busy) this.moveCursor(dx, dy); };
    const tap = (fn) => (ev) => { if (!(ev && ev.repeat) && !this.busy) fn(); };
    kb.on('keydown-UP', dir(0, -1));
    kb.on('keydown-DOWN', dir(0, 1));
    kb.on('keydown-LEFT', dir(-1, 0));
    kb.on('keydown-RIGHT', dir(1, 0));
    kb.on('keydown-X', tap(() => this.close()));
    kb.on('keydown-SHIFT', tap(() => this.close()));
    kb.on('keydown-ESC', tap(() => this.close()));
    // A/Enter no hacen viaje (aún): solo recentran la info en el punto seleccionado.
    kb.on('keydown-Z', tap(() => this.confirm()));
    kb.on('keydown-SPACE', tap(() => this.confirm()));
    kb.on('keydown-ENTER', tap(() => this.close()));
  }

  // Mueve el cursor al PUNTO más cercano en la dirección pulsada (navegación
  // espacial: respeta la geografía en vez de un índice lineal). Si no hay ninguno
  // en esa dirección, no se mueve.
  moveCursor(dx, dy) {
    const cur = MAP_POINTS[this.cursorIdx];
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < MAP_POINTS.length; i += 1) {
      if (i === this.cursorIdx) continue;
      const p = MAP_POINTS[i];
      const vx = p.pos.x - cur.pos.x;
      const vy = p.pos.y - cur.pos.y;
      // Proyección sobre la dirección (debe ser positiva = está en ese sentido).
      const along = vx * dx + vy * dy;
      if (along <= 0.001) continue;
      // Penaliza la desviación lateral para preferir el punto "más recto".
      const lateral = Math.abs(vx * dy - vy * dx);
      const score = lateral * 3 - along;
      if (score < bestScore) { bestScore = score; best = i; }
    }
    if (best < 0) return;
    this.cursorIdx = best;
    sfx(this, 'select', { volume: 0.35 });
    this.refreshSelection();
  }

  confirm() {
    // VUELO futuro: aquí se lanzaría el viaje rápido a un punto `flyable` visitado.
    // De momento es informativo: un pequeño sfx de confirmación y nada más.
    sfx(this, 'select', { volume: 0.4 });
  }

  close() {
    if (this.scene.isPaused('World')) this.scene.resume('World');
    else if (this.scene.isSleeping('World')) this.scene.wake('World');
    this.scene.stop();
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
    if (st.origin != null) t.setOrigin(Array.isArray(st.origin) ? st.origin[0] : st.origin,
      Array.isArray(st.origin) ? st.origin[1] : st.origin);
    c.add(t);
    return t;
  }

  // ---------- construcción ----------

  build() {
    const c = this.setView();
    // Fondo del mapa (panel azul "atlas") + cabecera.
    c.add(drawBox(this, 0, 0, GAME_W, GAME_H, { fill: 0x2a3a6a }));
    this.text(c, 8, 5, 'MAPA — ESPAÑA', { color: TEXT_COLOR_LIGHT });
    this.text(c, GAME_W - 8, 5, 'B/Esc: salir', { color: '#c8d0f0', origin: [1, 0] });

    // Lienzo del mapa (marco claro).
    c.add(drawBox(this, MAP_VIEW.x - 2, MAP_VIEW.y - 2, MAP_VIEW.w + 4, MAP_VIEW.h + 4, { fill: 0x0f1c3c }));

    this.drawRegions(c);
    this.drawRoutes(c);
    this.drawPoints(c);

    // Pie de información (zona seleccionada + ayuda de navegación).
    c.add(drawBox(this, 4, GAME_H - 22, GAME_W - 8, 20));
    this.infoText = this.text(c, 10, GAME_H - 18, '', { wrap: GAME_W - 24 });

    // Marcador "ESTÁS AQUÍ" (se anima en startBlink). Se crea aparte del cursor
    // de selección para poder parpadear de forma independiente.
    this.hereMarker = this.add.graphics();
    c.add(this.hereMarker);
    this.hereLabel = this.text(c, 0, 0, 'ESTÁS AQUÍ', { color: '#ffe070' }).setOrigin(0.5, 1).setVisible(false);
    this.drawHereMarker();

    // Cursor de selección (recuadro que rodea el punto elegido).
    this.cursor = this.add.graphics();
    c.add(this.cursor);
    this.refreshSelection();
  }

  drawRegions(c) {
    const top = MAP_VIEW.y + MAP_VIEW.h;
    for (const r of REGIONS) {
      const s = rectToScreen(r.rect);
      const g = this.add.graphics();
      g.fillStyle(r.color, 1);
      g.fillRoundedRect(s.x, s.y, s.w, s.h, 3);
      g.lineStyle(1, MAP_COLORS.border, 0.6);
      g.strokeRoundedRect(s.x, s.y, s.w, s.h, 3);
      c.add(g);
      // Etiqueta de región: pegada al borde INFERIOR del rect (los puntos van en
      // la mitad superior/centro), así no se solapa con los nombres de las zonas.
      const lx = Phaser.Math.Clamp(s.x + 3, MAP_VIEW.x + 1, MAP_VIEW.x + MAP_VIEW.w - r.label.length * 5);
      const ly = Phaser.Math.Clamp(s.y + s.h - 9, MAP_VIEW.y + 1, top - 9);
      this.text(c, lx, ly, r.label, { color: r.labelColor });
    }
  }

  // Líneas finas que conectan los puntos de Madrid (rutas) y los enlaces de bus a
  // Bercero/Torrevieja (punteado conceptual: línea simple discreta). Decorativo.
  drawRoutes(c) {
    const g = this.add.graphics();
    g.lineStyle(1, 0xffffff, 0.25);
    const link = (aId, bId) => {
      const a = MAP_POINTS.find((p) => p.id === aId);
      const b = MAP_POINTS.find((p) => p.id === bId);
      if (!a || !b) return;
      const sa = toScreen(a.pos);
      const sb = toScreen(b.pos);
      g.lineBetween(sa.x, sa.y, sb.x, sb.y);
    };
    link('tetuan', 'ruta2');
    link('ruta2', 'chamberi');
    link('chamberi', 'ruta3');
    link('ruta3', 'retiro');
    c.add(g);
    // Enlaces de bus (Tetuán ↔ Bercero / Torrevieja): línea más tenue y discontinua.
    const gb = this.add.graphics();
    gb.lineStyle(1, 0xf8d038, 0.35);
    this.dashedLink(gb, 'tetuan', 'bercero');
    this.dashedLink(gb, 'tetuan', 'torrevieja');
    c.add(gb);
  }

  dashedLink(g, aId, bId) {
    const a = MAP_POINTS.find((p) => p.id === aId);
    const b = MAP_POINTS.find((p) => p.id === bId);
    if (!a || !b) return;
    const sa = toScreen(a.pos);
    const sb = toScreen(b.pos);
    const segs = 10;
    for (let i = 0; i < segs; i += 2) {
      const t0 = i / segs; const t1 = (i + 1) / segs;
      g.lineBetween(
        sa.x + (sb.x - sa.x) * t0, sa.y + (sb.y - sa.y) * t0,
        sa.x + (sb.x - sa.x) * t1, sa.y + (sb.y - sa.y) * t1,
      );
    }
  }

  drawPoints(c) {
    this.pointScreens = [];
    for (let i = 0; i < MAP_POINTS.length; i += 1) {
      const p = MAP_POINTS[i];
      const s = toScreen(p.pos);
      this.pointScreens[i] = s;
      const g = this.add.graphics();
      // Punto: círculo. Amarillo si es centro "volable" (visitable), claro si no.
      const fill = p.flyable ? MAP_COLORS.pointVisited : MAP_COLORS.point;
      g.fillStyle(MAP_COLORS.pointEdge, 1);
      g.fillCircle(s.x, s.y, 4);
      g.fillStyle(fill, 1);
      g.fillCircle(s.x, s.y, 3);
      c.add(g);
      this.drawPointLabel(c, p, s);
    }
  }

  // Coloca el nombre del punto en el lado indicado por `labelAt` (left/right/
  // above/below; por defecto below), con una sombra de 1px para legibilidad y
  // clamp para no salirse del lienzo del mapa.
  drawPointLabel(c, p, s) {
    const at = p.labelAt || 'below';
    let x = s.x; let y = s.y; let origin = [0.5, 0];
    if (at === 'left') { x = s.x - 7; y = s.y; origin = [1, 0.5]; }
    else if (at === 'right') { x = s.x + 7; y = s.y; origin = [0, 0.5]; }
    else if (at === 'above') { x = s.x; y = s.y - 7; origin = [0.5, 1]; }
    else { x = s.x; y = s.y + 6; origin = [0.5, 0]; } // below
    const minX = MAP_VIEW.x + 1; const maxX = MAP_VIEW.x + MAP_VIEW.w - 1;
    const minY = MAP_VIEW.y + 1; const maxY = MAP_VIEW.y + MAP_VIEW.h - 7;
    x = Phaser.Math.Clamp(x, minX, maxX);
    y = Phaser.Math.Clamp(y, minY, maxY);
    // Sombra + texto (dos capas) para contraste sobre cualquier color de región.
    this.text(c, x + 1, y + 1, p.name, { color: '#101010', origin });
    this.text(c, x, y, p.name, { color: TEXT_COLOR_LIGHT, origin });
  }

  drawHereMarker() {
    this.hereMarker.clear();
    if (!this.herePoint) return;
    const idx = MAP_POINTS.indexOf(this.herePoint);
    const s = this.pointScreens[idx];
    if (!s) return;
    // Aro rojo (doble) alrededor del punto actual: bien visible incluso a escala GBA.
    this.hereMarker.lineStyle(2, MAP_COLORS.here, 1);
    this.hereMarker.strokeCircle(s.x, s.y, 7);
    this.hereMarker.lineStyle(1, 0xffffff, 0.9);
    this.hereMarker.strokeCircle(s.x, s.y, 9);
    // Etiqueta "ESTÁS AQUÍ" sobre el punto (clamp para no salir del lienzo).
    const ly = Math.max(s.y - 8, MAP_VIEW.y + 6);
    this.hereLabel.setPosition(s.x, ly).setVisible(true);
  }

  // Cursor de selección: recuadro amarillo + actualiza el pie de info.
  refreshSelection() {
    const s = this.pointScreens[this.cursorIdx];
    this.cursor.clear();
    if (s) {
      this.cursor.lineStyle(1, 0xffffff, 1);
      this.cursor.strokeRect(s.x - 7, s.y - 7, 14, 14);
    }
    const p = MAP_POINTS[this.cursorIdx];
    const hereTag = (p === this.herePoint) ? ' · ESTÁS AQUÍ' : '';
    this.infoText.setText(`${p.name} (${p.region})${hereTag}: ${p.desc}`);
  }

  // Parpadeo del marcador "ESTÁS AQUÍ" (rojo). Timer propio de la escena que se
  // limpia solo al hacer stop (Phaser destruye los timers de la escena).
  startBlink() {
    if (!this.herePoint) return;
    this.blinkOn = true;
    this.blinkEvent = this.time.addEvent({
      delay: 450,
      loop: true,
      callback: () => {
        this.blinkOn = !this.blinkOn;
        if (this.hereMarker) this.hereMarker.setVisible(this.blinkOn);
        if (this.hereLabel) this.hereLabel.setVisible(this.blinkOn);
      },
    });
  }
}
