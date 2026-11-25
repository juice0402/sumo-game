// 点検（node tools/test.mjs）。だめなときだけ行を出して、最後に1行。
import RAPIER from '@dimforge/rapier2d-deterministic-compat';
import { CPU_SHAPES } from '../src/data/cpu-shapes.js';
import { checkShape } from '../src/geom/check.js';
import { strokeToOutline } from '../src/geom/stroke.js';
import { area } from '../src/geom/poly.js';
import { setRapier, runBout, hashText } from '../src/sim/battle.js';
import { randomShape } from '../src/geom/random.js';
import { BENCH } from '../src/sim/bench.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('NG ' + msg); } };

// CPU の形は点検に通る・分けた形の面積が元と同じ
for (const s of CPU_SHAPES) {
  const r = checkShape(s.pts);
  ok(r.ok, `${s.id} が点検に通らない: ${r.problems.join(',')}`);
  if (r.pieces) {
    const sum = r.pieces.reduce((a, p) => a + area(p), 0);
    ok(Math.abs(sum - area(s.pts)) < 1e-6, `${s.id} を分けた面積がずれる`);
  }
}

// 線 → 輪郭
const circle = (cx, cy, rx, ry, n, turn = 1) => {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2 * turn;
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return pts;
};
const good = strokeToOutline(circle(150, 230, 110, 185, 160));
ok(good.ok && good.pts.length >= 8, '円の線が輪郭にならない');
if (good.ok) ok(good.pts.every((p) => Number.isInteger(p[0]) && Number.isInteger(p[1])), '輪郭が整数でない');
const open = strokeToOutline(circle(150, 230, 110, 185, 160).slice(0, 110));
ok(!open.ok && open.reason === 'open', '閉じていない線を通してしまう');
// 8の字（自己交差）
const eight = [];
for (let i = 0; i <= 200; i++) {
  const t = (i / 200) * Math.PI * 2;
  eight.push([150 + Math.sin(2 * t) * 120, 210 + Math.sin(t) * 190]);
}
const e = strokeToOutline(eight);
ok(e.ok && checkShape(e.pts).problems.includes('cross'), '8の字の交差を見のがす');

// ランダムな形
ok(!!randomShape(1001), 'ランダムな形が作れない');

// 物理：同じ条件なら同じ結果・指紋
await RAPIER.init();
setRapier(RAPIER);
const kane = CPU_SHAPES[0].pts, kusabi = CPU_SHAPES[2].pts;
const r1 = runBout({ a: kane, b: kusabi, seed: 7 });
const r2 = runBout({ a: kane, b: kusabi, seed: 7 });
ok(r1.hash === r2.hash && r1.steps === r2.steps, '同じ取組の結果がちがう');
const many = new Set();
for (let s = 1; s <= 6; s++) many.add(runBout({ a: kane, b: kusabi, seed: s }).hash);
ok(many.size > 1, 'シードを変えても結果が同じ（ゆれが効いていない）');
const fp = BENCH.map((b) => hashText(runBout(b).hash).slice(0, 4)).join(' ');

console.log(fails ? `NG ${fails}件` : `OK（指紋 ${fp}）`);
process.exit(fails ? 1 : 0);
