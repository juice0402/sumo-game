// 相性表の道具（描画なし）。使い方：
//   node tools/sim-table.mjs [--seeds 6] [--drive push|hop] [--random 5] [--write] [--set key=value ...] [--stage id] [--stages [3]]
// --write で docs/balance.md に書く。--set で PHYS の数字をその場で変えて試せる（例 --set pushForce=2）
// --stage id：その土俵（data/stages.js）の phys を重ねる。--stages：土俵ぜんぶを 3シード×左右で取って、土俵ごとの表を足す（--write では標準の表の下に）
import RAPIER from '@dimforge/rapier2d-deterministic-compat';
import { writeFileSync } from 'node:fs';
import { setRapier } from '../src/sim/battle.js';
import { makeTableRunner, scoreOf } from '../src/sim/table.js';
import { CPU_SHAPES } from '../src/data/cpu-shapes.js';
import { randomShape } from '../src/geom/random.js';
import { PHYS, TABLE, CONFIG_VERSION } from '../src/data/config.js';
import { STAGES, JUNGYO } from '../src/data/stages.js';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const seeds = Number(opt('seeds', TABLE.seeds));
const phys = Object.assign({}, opt('stage') ? STAGES[opt('stage')].phys : {});
if (opt('drive')) phys.drive = opt('drive');
args.forEach((a, i) => {
  if (a === '--set') { const [k, v] = args[i + 1].split('='); phys[k] = isNaN(Number(v)) ? v : Number(v); }
});

await RAPIER.init();
setRapier(RAPIER);

const shapes = CPU_SHAPES.slice();
const nr = Number(opt('random', 0));
for (let i = 0; i < nr; i++) {
  const pts = randomShape(1000 + i);
  if (pts) shapes.push({ id: 'r' + i, name: 'ランダム' + (i + 1), pts });
}

const t0 = Date.now();
const run = makeTableRunner(shapes, { seeds, phys });
while (!run.next(1e9)) { /* 全部 */ }
const res = run.result();
const ms = Date.now() - t0;

const P = Object.assign({}, PHYS, phys);
const pct = (x) => Math.round(x * 100) + '%';
const lines = [];
lines.push(`# 相性表（設定 v${CONFIG_VERSION}・突進 ${P.drive}・シード ${seeds}×左右）`);
lines.push('');
lines.push(`${run.total} 番・${(ms / 1000).toFixed(1)} 秒（1番 ${(ms / run.total).toFixed(0)}ms）`);
lines.push('');
lines.push('行の形から見た勝ち点（勝ち1・引き分け0.5）');
lines.push('');
lines.push('| | ' + res.shapes.map((s) => s.name).join(' | ') + ' | 合計 |');
lines.push('|' + '---|'.repeat(res.shapes.length + 2));
res.grid.forEach((row, i) => {
  const p = res.per[i];
  lines.push(`| ${res.shapes[i].name} | ` + row.map((c) => pct(scoreOf(c))).join(' | ') + ` | ${pct((p.w + p.d * 0.5) / p.n)} |`);
});
lines.push('');
lines.push('| 形 | 勝 | 負 | 分 | 負け：体がついた | 負け：転倒 | 負け：場外 | 時間切れ | 平均の時間 |');
lines.push('|---|---|---|---|---|---|---|---|---|');
res.per.forEach((p, i) => {
  lines.push(`| ${res.shapes[i].name} | ${p.w} | ${p.l} | ${p.d} | ${p.touch} | ${p.fall} | ${p.out} | ${p.time} | ${(p.t / p.n).toFixed(1)}秒 |`);
});
const all = res.per.reduce((a, p) => ({ n: a.n + p.n, d: a.d + p.d, t: a.t + p.t }), { n: 0, d: 0, t: 0 });
lines.push('');
lines.push(`引き分け率 ${pct(all.d / all.n)}・平均の決着 ${(all.t / all.n).toFixed(1)}秒`);

// 土俵ごと（3シード×左右）：引き分け・平均の決着・形ごとの勝ち点。標準（同じ 3シード）とくらべて、強くなる形・弱くなる形
if (args.includes('--stages')) {
  const i = args.indexOf('--stages'), ns = Number(args[i + 1]) > 0 ? Number(args[i + 1]) : 3;
  const runOf = (p) => { const r = makeTableRunner(shapes, { seeds: ns, phys: Object.assign({}, p, phys) }); while (!r.next(1e9)) { /* 全部 */ } return r.result(); };
  const sum = (res) => {
    const all = res.per.reduce((a, p) => ({ n: a.n + p.n, d: a.d + p.d, t: a.t + p.t }), { n: 0, d: 0, t: 0 });
    return { draw: all.d / all.n, sec: all.t / all.n, pts: res.per.map((p) => (p.w + p.d * 0.5) / p.n) };
  };
  const base = sum(runOf({}));
  lines.push('');
  lines.push(`## 土俵ごと（${ns}シード×左右・巡業に出る土俵 ${JUNGYO.pool.length}）`);
  lines.push('');
  lines.push('形の勝ち点は、その土俵での合計（標準とのちがい）');
  lines.push('');
  lines.push('| 土俵 | 引き分け | 平均の決着 | ' + shapes.map((s) => s.name).join(' | ') + ' | 強くなる・弱くなる |');
  lines.push('|' + '---|'.repeat(shapes.length + 4));
  for (const id in STAGES) {
    const r = id === 'hyojun' ? base : sum(runOf(STAGES[id].phys));
    const diff = r.pts.map((v, k) => Math.round((v - base.pts[k]) * 100));
    const sgn = (d) => (d > 0 ? '+' : d < 0 ? '−' : '±') + Math.abs(d);
    let hi = 0, lo = 0;
    diff.forEach((d, k) => { if (d > diff[hi]) hi = k; if (d < diff[lo]) lo = k; });
    const say = id === 'hyojun' ? 'くらべる元' : diff[hi] - diff[lo] < 6 ? '標準とほぼ同じ' : `${shapes[hi].name}が強くなる（${sgn(diff[hi])}）・${shapes[lo].name}が弱くなる（${sgn(diff[lo])}）`;
    const cells = r.pts.map((v, k) => (id === 'hyojun' ? pct(v) : `${pct(v)}（${sgn(diff[k])}）`));
    lines.push(`| ${STAGES[id].name} | ${pct(r.draw)} | ${r.sec.toFixed(1)}秒 | ${cells.join(' | ')} | ${say} |`);
  }
}
const out = lines.join('\n');
console.log(out);
if (args.includes('--write')) writeFileSync(new URL('../docs/balance.md', import.meta.url), out + '\n');
