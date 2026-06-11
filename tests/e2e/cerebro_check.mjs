// Verifica el fix de UI del Segundo Cerebro: login + búsqueda en viewport móvil,
// captura el desplegable para confirmar que NO se solapa con el menú de pestañas.
import { chromium } from 'playwright';
const URL = 'https://cerebro.stratomai.com';
const PW = process.env.CEREBRO_PW || 'Cerebro-XI7gfxi3';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const sleep = (ms) => p.waitForTimeout(ms);
const errs = [];
p.on('pageerror', (e) => errs.push('ERR ' + e.message));
await p.goto(URL, { waitUntil: 'networkidle' });
await sleep(800);
// login si aparece el campo de password
if (await p.locator('#pw').count() > 0) {
  await p.locator('#pw').fill(PW);
  await p.keyboard.press('Enter');
  await p.waitForLoadState('networkidle');
  await sleep(1500);
}
const hasSearch = await p.locator('#q').count() > 0;
console.log('SPA cargada, #q presente:', hasSearch);
if (hasSearch) {
  await p.locator('#q').click();
  await p.locator('#q').type('and', { delay: 80 });
  await sleep(900);
  const shown = await p.evaluate("(()=>{const r=document.getElementById('results');return r?{show:r.classList.contains('show'),z:getComputedStyle(r).zIndex,bg:getComputedStyle(r).backgroundColor,count:r.children.length}:null})()");
  console.log('results:', JSON.stringify(shown));
  await p.screenshot({ path: 'tests/e2e/shots/cerebro-search.png' });
}
console.log('errores:', errs.slice(0, 5));
await b.close();
