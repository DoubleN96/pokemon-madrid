// Descarga sprites de batalla FireRed/LeafGreen (front/back) + iconos de menú para los 151 de Gen 1
import { writeFileSync, mkdirSync, existsSync } from 'fs';

const RAW = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon';
const OUT = 'public/assets/sprites/pokemon';
const GEN1 = 151;

const TARGETS = (id) => [
  { urls: [`${RAW}/versions/generation-iii/firered-leafgreen/${id}.png`, `${RAW}/versions/generation-iii/emerald/${id}.png`, `${RAW}/${id}.png`], out: `${OUT}/front/${id}.png` },
  { urls: [`${RAW}/versions/generation-iii/firered-leafgreen/back/${id}.png`, `${RAW}/versions/generation-iii/ruby-sapphire/back/${id}.png`, `${RAW}/back/${id}.png`], out: `${OUT}/back/${id}.png` },
  { urls: [`${RAW}/versions/generation-vii/icons/${id}.png`, `${RAW}/versions/generation-viii/icons/${id}.png`], out: `${OUT}/icons/${id}.png` },
];

async function download(urls, out) {
  if (existsSync(out)) return 'skip';
  for (const url of urls) {
    try {
      const r = await fetch(url);
      if (!r.ok) continue;
      const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length < 100) continue;
      writeFileSync(out, buf);
      return 'ok';
    } catch (e) { /* siguiente fallback */ }
  }
  return 'FAIL';
}

for (const d of ['front', 'back', 'icons']) mkdirSync(`${OUT}/${d}`, { recursive: true });

const jobs = [];
for (let id = 1; id <= GEN1; id++) jobs.push(...TARGETS(id));

let idx = 0, ok = 0, fail = 0, failures = [];
await Promise.all(Array.from({ length: 10 }, async () => {
  while (idx < jobs.length) {
    const j = jobs[idx++];
    const res = await download(j.urls, j.out);
    if (res === 'FAIL') { fail++; failures.push(j.out); } else ok++;
    if ((ok + fail) % 50 === 0) console.log(`${ok + fail}/${jobs.length}`);
  }
}));

console.log(`DONE ok=${ok} fail=${fail}`);
if (failures.length) console.log('FALLOS:\n' + failures.join('\n'));
