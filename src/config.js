// Constantes globales del juego
export const TILE = 16;            // tamaño de tile GBA
export const GAME_W = 240;         // resolución nativa GBA
export const GAME_H = 160;
export const ZOOM = 3;             // escalado entero por defecto

export const WALK_MS = 220;        // duración de un paso (tile a tile)
export const ENCOUNTER_RATE = 0.12; // probabilidad de encuentro por paso en hierba alta

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || 'https://supabasekong-wckks4gsg8owkososoo8sosg.128.140.44.162.sslip.io';
export const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
  || 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTc2ODkwNjQ0MCwiZXhwIjo0OTI0NTgwMDQwLCJyb2xlIjoiYW5vbiJ9.aePQztzDdhmgXjPlJ9zxh4_Qf5ex7Au7UyEiF_jzXK0';

export const SAVE_VERSION = 1;
export const STARTERS = [1, 4, 7]; // Bulbasaur, Charmander, Squirtle
export const MONEY_START = 3000;
