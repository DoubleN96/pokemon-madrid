// Módulo G — Pantalla de título: skyline de Madrid al atardecer dibujado por
// código (Cibeles, Metrópolis, Cuatro Torres, Torres KIO), logo animado,
// "PULSA A" parpadeante, panel de cuenta (DOM) y menú CONTINUAR/NUEVA PARTIDA.
import Phaser from 'phaser';
import { GAME_W, GAME_H } from '../config.js';
import { drawBox, GAME_FONT } from '../ui/theme.js';
import { showAuthForm } from '../ui/authForm.js';
import { loadGame } from '../services/saves.js';
import { playMusic } from '../audio/AudioManager.js';

const K = Phaser.Input.Keyboard.KeyCodes;

// Paleta de atardecer castizo (de cenit a horizonte).
const SKY_TOP = 0x2a1a4a;     // violeta profundo de la noche que cae
const SKY_MID = 0x6e3a78;     // malva
const SKY_GLOW = 0xff8c5a;    // naranja cálido junto al horizonte
const SKY_HORIZON = 0xffd27a; // dorado del sol poniente
const HORIZON_Y = 116;
const SUN_X = 176;
const SUN_Y = 100;

const FAR_COLOR = 0x7a4f86;   // siluetas lejanas (teñidas de malva)
const MID_COLOR = 0x4a2f5e;   // capa intermedia
const NEAR_COLOR = 0x241a30;  // siluetas cercanas (casi negras)
const GROUND_TOP = 0x1a1226;
const GROUND_BOTTOM = 0x0d0814;
const WINDOW_COLOR = 0xffd86a; // ventanas encendidas
const ACCENT = 0xff9e3d;       // bordes iluminados por el sol

// Capa lejana: rascacielos difusos al fondo (parallax de atmósfera).
const FAR_BUILDINGS = [
  { x: 4, w: 12, h: 30 }, { x: 22, w: 10, h: 44 }, { x: 38, w: 12, h: 36 },
  { x: 58, w: 10, h: 50 }, { x: 74, w: 12, h: 40 }, { x: 96, w: 10, h: 48 },
  { x: 112, w: 12, h: 38 }, { x: 132, w: 10, h: 46 }, { x: 150, w: 12, h: 34 },
  { x: 168, w: 10, h: 44 }, { x: 190, w: 12, h: 36 }, { x: 210, w: 10, h: 48 },
  { x: 226, w: 12, h: 38 },
];

// Capa intermedia: bloques de ciudad de altura media.
const MID_BUILDINGS = [
  { x: 0, w: 18, h: 26 }, { x: 30, w: 20, h: 34 }, { x: 86, w: 18, h: 30 },
  { x: 140, w: 22, h: 28 }, { x: 200, w: 20, h: 34 }, { x: 224, w: 16, h: 26 },
];

export default class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.phase = 'title';
    this.phaseAt = 0;
    this.menuIndex = 0;
    this.pendingState = null;
    this.skyTime = 0;
    playMusic(this, 'title');

    this.drawSky();
    this.skyline = this.drawSkyline();
    this.stars = this.drawStars();
    this.drawLogo();
    this.drawPrompt();

    this.cameras.main.fadeIn(500);
    this.input.keyboard.on('keydown', this.onKey, this);
    this.events.once('shutdown', () => this.input.keyboard.off('keydown', this.onKey, this));
  }

  // ---- Cielo: degradado de atardecer en dos tramos + halo del sol ----
  drawSky() {
    const g = this.add.graphics();
    // Tramo superior: violeta nocturno a malva.
    g.fillGradientStyle(SKY_TOP, SKY_TOP, SKY_MID, SKY_MID, 1);
    g.fillRect(0, 0, GAME_W, Math.floor(HORIZON_Y * 0.55));
    // Tramo inferior: malva a dorado en el horizonte.
    g.fillGradientStyle(SKY_MID, SKY_MID, SKY_HORIZON, SKY_HORIZON, 1);
    g.fillRect(0, Math.floor(HORIZON_Y * 0.55), GAME_W, HORIZON_Y - Math.floor(HORIZON_Y * 0.55));

    // Resplandor cálido concentrado sobre el horizonte (varias bandas suaves).
    g.fillStyle(SKY_GLOW, 0.18);
    g.fillRect(0, HORIZON_Y - 38, GAME_W, 38);
    g.fillStyle(SKY_GLOW, 0.22);
    g.fillRect(0, HORIZON_Y - 22, GAME_W, 22);

    // Halo y disco del sol poniente.
    const sun = this.add.graphics();
    sun.fillStyle(SKY_HORIZON, 0.20); sun.fillCircle(SUN_X, SUN_Y, 30);
    sun.fillStyle(SKY_HORIZON, 0.30); sun.fillCircle(SUN_X, SUN_Y, 22);
    sun.fillStyle(0xfff0b0, 0.55); sun.fillCircle(SUN_X, SUN_Y, 16);
    sun.fillStyle(0xfff8d8, 1);    sun.fillCircle(SUN_X, SUN_Y, 12);
    this.sun = sun;

    // Nubes finas teñidas de naranja, en parallax muy lento.
    const clouds = this.add.graphics();
    clouds.fillStyle(0xffcf8a, 0.30);
    clouds.fillRoundedRect(20, 36, 46, 5, 2);
    clouds.fillRoundedRect(132, 24, 60, 5, 2);
    clouds.fillStyle(0xffb870, 0.22);
    clouds.fillRoundedRect(70, 52, 38, 4, 2);
    clouds.fillRoundedRect(8, 64, 30, 4, 2);
    this.clouds = clouds;
  }

  // ---- Estrellas tenues en la parte alta, con un parpadeo sutil ----
  drawStars() {
    const g = this.add.graphics();
    const pts = [
      [18, 8], [44, 16], [70, 6], [92, 20], [116, 10], [150, 6],
      [174, 18], [198, 8], [220, 14], [232, 4], [58, 28], [128, 26],
    ];
    g.fillStyle(0xfff4d8, 0.9);
    for (const [x, y] of pts) g.fillRect(x, y, 1, 1);
    g.setAlpha(0.55);
    return g;
  }

  // ---- Skyline en tres capas + monumentos reconocibles de Madrid ----
  drawSkyline() {
    const g = this.add.graphics();

    // Capa lejana (parallax sutil).
    g.fillStyle(FAR_COLOR, 0.55);
    for (const b of FAR_BUILDINGS) g.fillRect(b.x, HORIZON_Y - b.h, b.w, b.h);

    // Capa intermedia.
    g.fillStyle(MID_COLOR, 0.85);
    for (const b of MID_BUILDINGS) g.fillRect(b.x, HORIZON_Y - b.h, b.w, b.h);

    // Capa cercana: monumentos en silueta sobre la anterior.
    g.fillStyle(NEAR_COLOR, 1);
    this.drawCuatroTorres(g);   // izquierda: las 4 + KIO inclinadas
    this.drawMetropolis(g);     // centro-derecha: cúpula y aguja
    this.drawCibeles(g);        // derecha: fuente y portada
    this.drawRooftops(g);       // tejados castizos a ras de suelo

    // Borde superior iluminado por el sol (perfil cálido en lo cercano).
    this.drawSunEdge(g);

    // Reflejos en ventanas.
    this.drawWindows(g);

    // Suelo con degradado.
    const ground = this.add.graphics();
    ground.fillGradientStyle(GROUND_TOP, GROUND_TOP, GROUND_BOTTOM, GROUND_BOTTOM, 1);
    ground.fillRect(0, HORIZON_Y, GAME_W, GAME_H - HORIZON_Y);
    // Línea de acera iluminada.
    ground.fillStyle(ACCENT, 0.25);
    ground.fillRect(0, HORIZON_Y, GAME_W, 1);

    return g;
  }

  // Cuatro Torres Business Area + un par de torres KIO inclinadas a su lado.
  drawCuatroTorres(g) {
    const base = HORIZON_Y;
    // Cuatro Torres: altas, finas, alturas escalonadas.
    const towers = [
      { x: 6, w: 8, h: 70 }, { x: 17, w: 8, h: 82 },
      { x: 28, w: 8, h: 74 }, { x: 39, w: 8, h: 88 },
    ];
    g.fillStyle(NEAR_COLOR, 1);
    for (const t of towers) g.fillRect(t.x, base - t.h, t.w, t.h);
    // Remates característicos (corona inclinada / antena).
    g.fillTriangle(39, base - 88, 47, base - 88, 47, base - 96); // cresta diagonal
    g.fillRect(20, base - 90, 1, 8);   // antena
    g.fillRect(31, base - 80, 1, 6);

    // Torres KIO (Puerta de Europa): dos torres inclinadas una hacia la otra.
    const lean = 7;
    // KIO izquierda (inclinada a la derecha).
    g.fillTriangle(52, base, 64, base, 60, base - 60);
    g.fillTriangle(52, base, 60, base - 60, 56 + lean, base - 60);
    g.fillRect(52, base - 6, 12, 6);
    // KIO derecha (inclinada a la izquierda).
    g.fillTriangle(80, base, 92, base, 84, base - 60);
    g.fillTriangle(80, base, 84, base - 60, 88 - lean, base - 60);
    g.fillRect(80, base - 6, 12, 6);
  }

  // Edificio Metrópolis: cuerpo, cúpula coronada y aguja con estatua.
  drawMetropolis(g) {
    const base = HORIZON_Y;
    const cx = 130;
    g.fillStyle(NEAR_COLOR, 1);
    g.fillRect(cx - 14, base - 40, 28, 40);   // cuerpo
    g.fillRect(cx - 10, base - 50, 20, 12);   // tambor de la cúpula
    g.fillCircle(cx, base - 50, 11);          // cúpula
    g.fillRect(cx - 1, base - 66, 2, 8);      // aguja
    g.fillCircle(cx, base - 68, 2);           // estatua alada (Niké)
    // Cornisa con borde cálido del sol.
    g.fillStyle(ACCENT, 0.5);
    g.fillRect(cx - 14, base - 40, 28, 1);
    g.fillStyle(NEAR_COLOR, 1);
  }

  // Cibeles: la fuente con su pedestal y, detrás, la portada del Palacio.
  drawCibeles(g) {
    const base = HORIZON_Y;
    // Palacio de Cibeles (al fondo, a la derecha): cuerpo con torres y aguja.
    g.fillStyle(NEAR_COLOR, 1);
    g.fillRect(196, base - 36, 40, 36);       // cuerpo central
    g.fillRect(198, base - 50, 8, 14);        // torre izquierda
    g.fillRect(228, base - 50, 8, 14);        // torre derecha
    g.fillTriangle(196, base - 36, 216, base - 54, 236, base - 36); // frontón
    g.fillRect(215, base - 60, 2, 6);         // aguja central
    g.fillStyle(ACCENT, 0.4);                 // remate iluminado
    g.fillRect(215, base - 60, 2, 1);

    // Fuente de Cibeles en primer plano (pedestal + carro y leones esbozados).
    g.fillStyle(NEAR_COLOR, 1);
    g.fillRect(206, base - 14, 24, 14);       // pilón
    g.fillRect(214, base - 22, 8, 8);         // pedestal de la diosa
    g.fillRect(216, base - 28, 4, 6);         // figura sentada
    g.fillStyle(ACCENT, 0.35);                // brillo del agua
    g.fillRect(206, base - 14, 24, 1);
    g.fillStyle(NEAR_COLOR, 1);
  }

  // Tejados castizos (buhardillas) que rellenan los huecos a ras de horizonte.
  drawRooftops(g) {
    const base = HORIZON_Y;
    g.fillStyle(NEAR_COLOR, 1);
    const roofs = [
      { x: 96, w: 14, h: 18 }, { x: 112, w: 12, h: 22 },
      { x: 146, w: 16, h: 16 }, { x: 164, w: 14, h: 20 }, { x: 180, w: 14, h: 16 },
    ];
    for (const r of roofs) {
      g.fillRect(r.x, base - r.h, r.w, r.h);
      // Mansarda triangular típica.
      g.fillTriangle(r.x, base - r.h, r.x + r.w / 2, base - r.h - 5, r.x + r.w, base - r.h);
    }
  }

  // Perfil superior del skyline cercano resaltado con el color del sol.
  drawSunEdge(g) {
    g.fillStyle(ACCENT, 0.35);
    for (const b of MID_BUILDINGS) g.fillRect(b.x, HORIZON_Y - b.h, b.w, 1);
  }

  // Ventanas encendidas distribuidas por monumentos y bloques cercanos.
  drawWindows(g) {
    g.fillStyle(WINDOW_COLOR, 0.85);
    const base = HORIZON_Y;
    // Cuatro Torres.
    const tx = [6, 17, 28, 39];
    const th = [70, 82, 74, 88];
    for (let c = 0; c < tx.length; c++) {
      for (let i = 0; i < Math.floor(th[c] / 10); i++) {
        if ((i + c) % 2 === 0) g.fillRect(tx[c] + 2, base - th[c] + 6 + i * 10, 1, 2);
        else g.fillRect(tx[c] + 4, base - th[c] + 6 + i * 10, 1, 2);
      }
    }
    // Cuerpo de Metrópolis.
    for (let i = 0; i < 3; i++) {
      g.fillRect(120, base - 34 + i * 10, 1, 2);
      g.fillRect(138, base - 30 + i * 10, 1, 2);
    }
    // Palacio de Cibeles.
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) g.fillRect(200 + j * 9, base - 30 + i * 9, 1, 2);
    }
    // Capa intermedia: leve siembra de luces.
    g.fillStyle(WINDOW_COLOR, 0.5);
    for (const b of MID_BUILDINGS) {
      for (let i = 0; i < Math.floor(b.h / 12); i++) {
        g.fillRect(b.x + 3, HORIZON_Y - b.h + 6 + i * 12, 1, 1);
      }
    }
  }

  // ---- Logo con animación de entrada ----
  drawLogo() {
    const cx = GAME_W / 2;
    const goldStyle = {
      fontFamily: GAME_FONT, fontSize: '30px', fontStyle: 'bold',
      color: '#FFD23F', resolution: 2,
    };

    // Banda de fondo translúcida tras el logo para legibilidad sobre el cielo.
    const band = this.add.graphics();
    band.fillStyle(0x140a24, 0.32);
    band.fillRoundedRect(cx - 84, 12, 168, 52, 6);
    band.setAlpha(0);

    const t1 = this.add.text(cx, 28, 'POKÉMON', goldStyle).setOrigin(0.5);
    const t2 = this.add.text(cx, 56, 'MADRID', goldStyle).setOrigin(0.5);
    // Sombra dorada/marrón para volumen tipo emblema.
    t1.setShadow(0, 3, '#7a4a00', 2, false, true);
    t2.setShadow(0, 3, '#7a4a00', 2, false, true);
    // Contorno granate sutil con un segundo trazo simulado por sombra.
    t1.setStroke('#8a1d10', 3);
    t2.setStroke('#8a1d10', 3);

    const sub = this.add.text(cx, 80, '★ EDICIÓN CASTIZA ★', {
      fontFamily: GAME_FONT, fontSize: '10px', fontStyle: 'bold',
      color: '#ffe9c2', resolution: 2,
    }).setOrigin(0.5);
    sub.setShadow(1, 1, '#7a1010', 0, true, true);

    // Estado inicial para la animación de entrada.
    t1.setScale(0.6).setAlpha(0).setY(t1.y - 8);
    t2.setScale(0.6).setAlpha(0).setY(t2.y + 8);
    sub.setAlpha(0);

    // Entrada del logo: aparece la banda, baja "POKÉMON", sube "MADRID",
    // y por último el subtítulo, con un pequeño rebote.
    this.tweens.add({ targets: band, alpha: 1, duration: 350, ease: 'Sine.out' });
    this.tweens.add({
      targets: t1, alpha: 1, scale: 1, y: 28,
      duration: 450, delay: 120, ease: 'Back.out',
    });
    this.tweens.add({
      targets: t2, alpha: 1, scale: 1, y: 56,
      duration: 450, delay: 240, ease: 'Back.out',
    });
    this.tweens.add({
      targets: sub, alpha: 1, duration: 400, delay: 520, ease: 'Sine.out',
      onComplete: () => {
        // Flotación perpetua muy leve del subtítulo para darle vida.
        this.tweens.add({
          targets: sub, y: sub.y - 1.5, duration: 1400,
          yoyo: true, repeat: -1, ease: 'Sine.inOut',
        });
      },
    });

    // Latido sutil de "POKÉMON" para que el emblema respire.
    this.tweens.add({
      targets: t1, scale: 1.035, duration: 1800, delay: 700,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  // ---- "PULSA A" parpadeante con caja sutil ----
  drawPrompt() {
    const cx = GAME_W / 2;
    this.blink = this.add.text(cx, 138, 'PULSA  A', {
      fontFamily: GAME_FONT, fontSize: '11px', fontStyle: 'bold',
      color: '#ffffff', resolution: 2,
    }).setOrigin(0.5);
    this.blink.setShadow(0, 1, '#000000', 2, false, true);
    this.blink.setStroke('#3a1d00', 3);
    this.blink.setAlpha(0);

    this.promptSub = this.add.text(cx, 150, 'PRESS  START', {
      fontFamily: GAME_FONT, fontSize: '7px', color: '#ffcf8a', resolution: 2,
    }).setOrigin(0.5).setAlpha(0);

    // Aparecen tras la animación del logo.
    this.tweens.add({ targets: [this.blink, this.promptSub], alpha: 1, duration: 300, delay: 900 });

    // Parpadeo del "PULSA A" (sólo durante la pantalla de título).
    this.time.addEvent({
      delay: 480, loop: true,
      callback: () => {
        if (this.phase === 'title') this.blink.setVisible(!this.blink.visible);
      },
    });
  }

  // ---- Animación continua: parallax muy leve y titileo de estrellas ----
  update(_, dt) {
    if (this.phase !== 'title') return;
    this.skyTime += dt;
    if (this.clouds) this.clouds.x = Math.sin(this.skyTime * 0.0003) * 4;
    if (this.stars) this.stars.setAlpha(0.45 + 0.25 * (0.5 + 0.5 * Math.sin(this.skyTime * 0.002)));
  }

  setPhase(phase) {
    this.phase = phase;
    this.phaseAt = this.time.now;
  }

  isA(code) { return code === K.Z || code === K.SPACE || code === K.ENTER; }

  onKey(event) {
    if (this.time.now - this.phaseAt < 150) return;
    if (this.phase === 'title' && this.isA(event.keyCode)) this.openAuth();
    else if (this.phase === 'menu') this.menuKey(event.keyCode);
  }

  openAuth() {
    this.setPhase('auth');
    this.blink.setVisible(false);
    if (this.promptSub) this.promptSub.setVisible(false);
    this.input.keyboard.enabled = false;
    this.input.keyboard.disableGlobalCapture();
    showAuthForm((session) => this.onAuthDone(session));
  }

  async onAuthDone(session) {
    this.registry.set('session', session);
    this.input.keyboard.enabled = true;
    this.input.keyboard.enableGlobalCapture();
    const res = await loadGame();
    if (res.ok && res.state) this.showContinueMenu(res.state);
    else this.scene.start('Intro');
  }

  showContinueMenu(state) {
    this.pendingState = state;
    this.menuIndex = 0;
    this.setPhase('menu');

    const boxX = 54;
    const boxY = 92;
    const boxW = 132;
    const boxH = 48;
    drawBox(this, boxX, boxY, boxW, boxH);

    // Entrada del panel con un breve deslizamiento desde abajo.
    const style = { fontFamily: GAME_FONT, fontSize: '10px', color: '#181818', resolution: 4 };
    this.menuItems = [
      this.add.text(boxX + 22, boxY + 10, 'CONTINUAR', style),
      this.add.text(boxX + 22, boxY + 26, 'NUEVA PARTIDA', style),
    ];
    this.cursor = this.add.text(boxX + 10, boxY + 10, '▶', { ...style, color: '#c03028' });

    // Animación de entrada del menú (fade + ligero ascenso).
    const items = [...this.menuItems, this.cursor];
    for (const it of items) { it.setAlpha(0); it.y += 4; }
    this.tweens.add({
      targets: items, alpha: 1, y: '-=4', duration: 220, ease: 'Sine.out',
    });

    // Parpadeo suave del cursor para guiar la mirada.
    this.tweens.add({
      targets: this.cursor, alpha: 0.4, duration: 420,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
  }

  menuKey(code) {
    const move = code === K.UP || code === K.W || code === K.DOWN || code === K.S;
    if (move) {
      this.menuIndex = this.menuIndex === 0 ? 1 : 0;
      this.cursor.y = this.menuItems[this.menuIndex].y;
    } else if (this.isA(code)) {
      this.confirmMenu();
    }
  }

  confirmMenu() {
    this.setPhase('done');
    // Pequeño destello de confirmación antes de cambiar de escena.
    if (this.cursor) {
      this.tweens.killTweensOf(this.cursor);
      this.cursor.setAlpha(1);
    }
    const target = this.menuItems[this.menuIndex];
    this.tweens.add({
      targets: target, scale: 1.08, duration: 90, yoyo: true, repeat: 1, ease: 'Sine.inOut',
    });
    this.cameras.main.fadeOut(220);
    this.cameras.main.once('camerafadeoutcomplete', () => {
      if (this.menuIndex === 0) {
        this.registry.set('save', this.pendingState);
        this.scene.start('World');
      } else {
        this.scene.start('Intro');
      }
    });
  }
}
