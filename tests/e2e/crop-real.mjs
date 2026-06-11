// Crop EXACTO de la caja de diálogo usando coordenadas reales del canvas.
import { chromium } from 'playwright';
const URL = process.argv[2] || 'http://localhost:5173';
const TAG = process.argv[3] || 'x';
const browser = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 3 });
const sleep = ms => page.waitForTimeout(ms);
const ev = fn => page.evaluate(fn);
const press = async (k,n=1,d=350)=>{for(let i=0;i<n;i++){await page.keyboard.press(k);await sleep(d);}};
await page.goto(URL, { waitUntil: 'networkidle' });
await ev(() => { try { localStorage.clear(); } catch(e){} });
await page.reload({ waitUntil: 'networkidle' });
await sleep(2500);
await press('z',1,900);
const btn = page.locator('button',{hasText:'SIN CUENTA'});
if (await btn.count()) { await btn.click(); await sleep(1500); }
for (let i=0;i<20;i++){ if (await ev("(()=>window.game&&window.game.scene.isActive('Dialog'))()")) break; await press('z',1,400); }
await sleep(300);
await ev("(()=>{const d=window.game.scene.getScene('Dialog');if(d&&d.writer&&!d.writer.done)d.writer.skip();})()");
await sleep(500);
// Coordenadas reales: el canvas mapea 240x160; la caja está en y=110..158.
const box = await ev(() => {
  const c = document.querySelector('#game canvas'); const r = c.getBoundingClientRect();
  const sx = r.width/240, sy = r.height/160;
  return { x: r.x + 2*sx, y: r.y + 109*sy, w: 236*sx, h: 50*sy };
});
await page.screenshot({ path: `tests/e2e/shots/box-${TAG}.png`, clip: { x: Math.round(box.x), y: Math.round(box.y), width: Math.round(box.w), height: Math.round(box.h) } });
console.log('box-'+TAG+'.png', JSON.stringify(box));
await browser.close();
