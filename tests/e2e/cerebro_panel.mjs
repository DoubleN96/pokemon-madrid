import { chromium } from 'playwright';
const URL = 'https://cerebro.stratomai.com';
const PW = process.env.CEREBRO_PW || 'Cerebro-XI7gfxi3';
const b = await chromium.launch({ args: ['--no-sandbox'] });
const p = await b.newPage({ viewport: { width: 412, height: 915 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const sleep = (ms) => p.waitForTimeout(ms);
await p.goto(URL, { waitUntil: 'networkidle' });
await sleep(800);
if (await p.locator('#pw').count() > 0) { await p.locator('#pw').fill(PW); await p.keyboard.press('Enter'); await p.waitForLoadState('networkidle'); await sleep(1500); }
await p.locator('#q').click();
await p.locator('#q').type('gonzalo', { delay: 70 });
await sleep(900);
// click primer resultado
const first = p.locator('#results div').first();
if (await first.count() > 0) { await first.click(); await sleep(1800); }
const panel = await p.evaluate("(()=>{const b=document.getElementById('pbody');if(!b)return null;const notion=[...b.querySelectorAll('a')].find(a=>/Tareas en Notion/i.test(a.textContent));const tasksSec=[...b.querySelectorAll('.lbl')].some(l=>/Tareas/i.test(l.textContent));return{hasNotionBtn:!!notion,notionHref:notion?notion.href:null,inAppTasks:tasksSec,title:(b.querySelector('h2')||{}).textContent}})()");
console.log('PANEL:', JSON.stringify(panel));
await p.screenshot({ path: 'tests/e2e/shots/cerebro-panel.png' });
await b.close();
