// Diagnóstico de AUDIO contra una URL: carga, da un gesto REAL (click), entra al
// mundo (dispara playMusic) y reporta estado del AudioContext + si hay sonido sonando.
import { chromium } from 'playwright';
const URL = (process.argv[2] || 'https://pokemon-madrid.stratomai.com') + '/?canvas=1';
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const p = await b.newPage({ viewport: { width: 720, height: 480 } });
const sleep = (ms) => p.waitForTimeout(ms);
const press = async (k, n = 1, d = 200) => { for (let i = 0; i < n; i++) { await p.keyboard.press(k); await sleep(d); } };
const snd = () => p.evaluate(`(()=>{const g=window.game;if(!g||!g.sound)return null;const ctx=g.sound.context;const playing=(g.sound.sounds||[]).filter(s=>s.isPlaying).map(s=>s.key);const loaded=['town','overworld','battle_trainer','select','hit'].filter(k=>g.cache.audio.exists(k));return{ctxState:ctx?ctx.state:'no-ctx',locked:g.sound.locked,usingWebAudio:g.sound.constructor.name,loadedKeys:loaded,playing}})()`);
await p.goto(URL, { waitUntil: 'networkidle' });
await sleep(2500);
console.log('ANTES de gesto:', JSON.stringify(await snd()));
// GESTO REAL: click físico en el centro de la página
await p.mouse.click(360, 240);
await sleep(400);
console.log('TRAS click (en título):', JSON.stringify(await snd()));
// avanzar a nueva partida + intro + mundo para disparar playMusic('town'/'overworld')
await press('z', 1, 700);
try { await p.locator('button', { hasText: 'SIN CUENTA' }).click({ timeout: 4000 }); } catch (e) {}
await sleep(1000);
for (let i = 0; i < 70; i++) { if (await p.locator('input').count() > 0) break; await press('z', 1, 170); }
if (await p.locator('input').count() > 0) { await p.locator('input').press('Enter'); await sleep(900); }
for (let i = 0; i < 30; i++) { if (await p.evaluate("window.game.scene.isActive('World')")) break; await press('z', 1, 260); }
await sleep(1500);
await p.mouse.click(360, 240); // otro gesto real ya en el mundo
await sleep(800);
console.log('EN MUNDO tras gesto:', JSON.stringify(await snd()));
await b.close();
