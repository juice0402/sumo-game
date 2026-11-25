// 1番の取組を、こま割りの絵（SVG）にする。物理の調整で「何が起きたか」を見る用。
//   node tools/bout-sheet.mjs <左の形id> <右の形id> [シード] [出力.svg] [--set key=value ...]
import RAPIER from '@dimforge/rapier2d-deterministic-compat';
import { writeFileSync } from 'node:fs';
import { setRapier, createBout, toLocal, hashText } from '../src/sim/battle.js';
import { CPU_SHAPES } from '../src/data/cpu-shapes.js';
import { PHYS } from '../src/data/config.js';

const args = process.argv.slice(2);
const phys = {};
args.forEach((a, i) => {
  if (a === '--set') { const [k, v] = args[i + 1].split('='); phys[k] = isNaN(Number(v)) ? v : Number(v); }
});
const pos = args.filter((a, i) => !a.startsWith('--') && args[i - 1] !== '--set');
const [ia = 'kane', ib = 'kusabi', seedS = '1', out = 'bout.svg'] = pos;
const find = (id) => CPU_SHAPES.find((s) => s.id === id);
await RAPIER.init();
setRapier(RAPIER);
const A = find(ia), B = find(ib);
const bout = createBout({ a: A.pts, b: B.pts, seed: Number(seedS), phys, record: true });
while (!bout.stepOnce()) { /* */ }
const P = bout.phys, rec = bout.rec, res = bout.result;
const la = toLocal(A.pts, 1, P).outline, lb = toLocal(B.pts, -1, P).outline;
const frames = 10, W = 420, H = 220, sc = 60;
const total = rec.n - 1;
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W * 2}" height="${H * 5 + 30}" style="background:#EEE9DE;font-family:sans-serif">`;
svg += `<text x="8" y="20" font-size="14">${A.name} vs ${B.name} seed ${seedS}  →  ${res.winner || '引き分け'} ${res.kind} ${res.time.toFixed(2)}s  #${hashText(res.hash)}</text>`;
for (let k = 0; k < frames; k++) {
  const n = Math.round(total * k / (frames - 1));
  const o = n * 8, f = rec.f;
  const gx = (k % 2) * W, gy = 30 + Math.floor(k / 2) * H;
  const X = (x) => gx + W / 2 + x * sc, Y = (y) => gy + H - 50 - y * sc;
  const ringY = f[o + 6];
  svg += `<rect x="${X(-P.ringHalf)}" y="${Y(ringY)}" width="${P.ringHalf * 2 * sc}" height="${P.ringDepth * sc}" fill="#c9b99a"/>`;
  const poly = (ol, x, y, a, col) => {
    const c = Math.cos(a), s = Math.sin(a);
    return `<polygon fill="${col}" stroke="#201E1B" stroke-width="1" points="` +
      ol.map((p) => `${X(x + p[0] * c - p[1] * s).toFixed(1)},${Y(y + p[0] * s + p[1] * c).toFixed(1)}`).join(' ') + '"/>';
  };
  svg += poly(la, f[o], f[o + 1], f[o + 2], '#fff8');
  svg += poly(lb, f[o + 3], f[o + 4], f[o + 5], '#AB392F88');
  const t = (n - rec.settleSteps) * rec.dt;
  svg += `<text x="${gx + 6}" y="${gy + 16}" font-size="12">${t.toFixed(2)}s${f[o + 7] ? ' 接触' : ''}</text>`;
}
svg += '</svg>';
writeFileSync(out, svg);
console.log(`${A.name} vs ${B.name}: ${res.winner || '-'} ${res.kind} ${res.time.toFixed(2)}s`);
