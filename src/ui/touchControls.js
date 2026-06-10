// Controles del juego — ahora viven en la carcasa Game Boy Advance SP.
//
// Antes este módulo creaba un overlay flotante de controles táctiles. Ahora la
// consola GBA SP (src/ui/gbaShell.js) dibuja la carcasa completa y sus botones
// físicos (D-pad, A, B, START, SELECT, L, R) SON los controles, tanto en móvil
// (touch) como en escritorio (clic). Esos botones inyectan los mismos
// KeyboardEvent que el juego ya consume en todas las escenas.
//
// La carcasa se monta desde index.html ANTES de arrancar Phaser (necesita crear
// el #game donde Phaser monta el canvas). main.js sigue llamando a
// initTouchControls() tras crear el juego; aquí solo garantizamos —de forma
// idempotente— que la carcasa esté montada, por si el orden de carga cambiara.
// mountGbaShell() es seguro de llamar varias veces: si ya existe, no hace nada.

import { mountGbaShell } from './gbaShell.js';

export function initTouchControls() {
  mountGbaShell();
}
