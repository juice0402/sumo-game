// 点検（node tools/test.mjs）。だめなときだけ行を出して、最後に1行。
import RAPIER from '@dimforge/rapier2d-deterministic-compat';
import { CPU_SHAPES, OTEHON } from '../src/data/cpu-shapes.js';
import { checkShape } from '../src/geom/check.js';
import { strokeToOutline } from '../src/geom/stroke.js';
import { area } from '../src/geom/poly.js';
import { setRapier, runBout, hashText, createBout, toLocal } from '../src/sim/battle.js';
import { randomShape } from '../src/geom/random.js';
import { decideKimarite } from '../src/data/kimarite.js';
import { T } from '../src/data/text.js';
import { BENCH } from '../src/sim/bench.js';
import { SHIKONA, SHIKONA_START, SHIKONA_FOE_SKIP } from '../src/data/shikona.js';
import { TITLES } from '../src/data/titles.js';
import { STAGES, JUNGYO, HONBASHO_STAGE } from '../src/data/stages.js';
import { DOHYO } from '../src/data/dohyo.js';
import { BANZUKE } from '../src/data/banzuke.js';
import { randomShikona, validShikona, shikonaText, ownedWords, isWord } from '../src/game/names.js';
import { rankOf, eloDelta } from '../src/game/rating.js';
import { schedule, stagesOf } from '../src/game/jungyo.js';
import { makeRng } from '../src/sim/rng.js';

let fails = 0;
const ok = (cond, msg) => { if (!cond) { fails++; console.log('NG ' + msg); } };

// CPU の形とお手本は点検に通る・分けた形の面積が元と同じ
for (const s of [...CPU_SHAPES, OTEHON]) {
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

// 決まり手：CPU 5体の総当たり（5×5・シード 1 と 2）
const kcount = {};
for (const sa of CPU_SHAPES) for (const sb of CPU_SHAPES) for (const seed of [1, 2]) {
  const bout = createBout({ a: sa.pts, b: sb.pts, seed, record: true });
  while (!bout.stepOnce()) { /* 進める */ }
  const k = decideKimarite(bout, toLocal(sa.pts, 1, bout.phys), toLocal(sb.pts, -1, bout.phys));
  ok(!!T.kimarite[k], `決まり手が不正: ${k}（${sa.id} 対 ${sb.id} シード ${seed}）`);
  kcount[k] = (kcount[k] || 0) + 1;
  bout.free();
}
console.log('決まり手：' + Object.entries(kcount).sort((x, y) => y[1] - x[1]).map(([k, n]) => `${T.kimarite[k] || k} ${n}`).join('・'));

// 四股名：id がかぶらない・ランダムな名前が正しい・実在の有名な四股名や、まずい組み合わせにならない（要件 10）
const ids = new Set();
for (const g of ['kami', 'tsunagi', 'shimo']) for (const w of SHIKONA[g]) { ok(!ids.has(w.id), `四股名の id がかぶる: ${w.id}`); ids.add(w.id); }
for (const t of TITLES) { ok(!ids.has(t.id), `称号の id がかぶる: ${t.id}`); ids.add(t.id); }
const nrng = makeRng(7);
for (let i = 0; i < 200; i++) ok(validShikona(randomShikona(nrng)), 'ランダムな四股名が正しくない');
// はじめから持っている語：上の句5・下の句5・つなぎ全部。さずかる名前はその中だけ・相手はかけだしの上の句を使わない
for (const id of SHIKONA_START) ok(isWord(id), `はじめの語がない: ${id}`);
ok(SHIKONA_START.filter((id) => id.startsWith('k_')).length === 5 && SHIKONA_START.filter((id) => id.startsWith('s_')).length === 5, 'はじめの語が上5・下5でない');
{
  const has = ownedWords();
  const foeSkip = new Set(SHIKONA.kami.filter((w) => SHIKONA_FOE_SKIP.includes(w.cat)).map((w) => w.id));
  for (let i = 0; i < 300; i++) {
    const n = randomShikona(nrng, has);
    ok(validShikona(n) && n.every((id) => has.has(id)), `さずかる名前が、はじめの語の外: ${n}`);
    ok(!foeSkip.has(randomShikona(nrng)[0]), '相手の名前に、かけだしの上の句');
  }
}
const NG = ['若乃花', '貴乃花', '千代の富士', '栃錦', '照ノ富士', '霧島', '大鵬', '北の湖', '朝青龍', '白鵬', '鶴竜', '雷電', '双葉山', '大の里', '稀勢の里', '武蔵丸', '曙', '鬼太郎', '猫侍', '死', '殺'];
let names = 0;
for (const k of SHIKONA.kami) for (const t of SHIKONA.tsunagi) for (const s2 of SHIKONA.shimo) {
  const n = shikonaText([k.id, t.id, s2.id]);
  names++;
  for (const w of NG) if (n.includes(w)) ok(false, `四股名がまずい: ${n}（${w}）`);
}
// 土俵：見た目がある・本場所は標準・巡業の予定は同じ時刻なら同じ並び
for (const id in STAGES) ok(!!DOHYO[STAGES[id].look], `土俵の見た目がない: ${id}`);
ok(Object.keys(STAGES[HONBASHO_STAGE].phys).length === 0, '本場所の土俵に物理の上書きがある');
for (const id of JUNGYO.pool) ok(!!STAGES[id], `巡業の土俵がない: ${id}`);
const sch = schedule(Date.UTC(2026, 10, 25, 7));
ok(sch.length === JUNGYO.ahead && sch.every((x) => x.stages.length === 2 && x.stages[0] !== x.stages[1]), '巡業の予定が2つずつでない');
ok(JSON.stringify(stagesOf(123456)) === JSON.stringify(stagesOf(123456)), '巡業の予定が同じ時刻でちがう');
// 特殊土俵でも取組が最後まで進み、同じ結果になる
for (const id in STAGES) {
  const o = { a: CPU_SHAPES[0].pts, b: CPU_SHAPES[1].pts, seed: 5, phys: STAGES[id].phys };
  const x = runBout(o), y = runBout(o);
  ok(x.hash === y.hash && !!x.kind, `特殊土俵の取組がおかしい: ${id}`);
}
// 番付：はじめは序ノ口・勝つと上がる・同じ強さの引き分けは動かない
ok(rankOf(1500).id === BANZUKE[0].id && rankOf(2400).id === 'yokozuna', '番付の帯がずれている');
ok(eloDelta(1500, 1500, 1) > 0 && eloDelta(1500, 1500, 0) < 0 && eloDelta(1500, 1500, 0.5) === 0, 'レートの増減がおかしい');
console.log(`四股名 ${names}通り・称号 ${TITLES.length}・土俵 ${Object.keys(STAGES).length}`);

// gzip をほどく（古いブラウザ用の unpack.js の gunzip）が Node の zlib と同じになる
{
  const { gzipSync } = await import('node:zlib');
  const { gunzip } = await import('../src/ui/unpack.js');
  const samples = [Buffer.alloc(0), Buffer.from('a'), Buffer.from('紙相撲'.repeat(3000)),
    Buffer.from(Array.from({ length: 50000 }, (_, k) => (k * 2654435761 >>> 24) & 255))];
  for (const lvl of [0, 1, 9]) for (const buf of samples) {
    const out = Buffer.from(gunzip(new Uint8Array(gzipSync(buf, { level: lvl }))));
    if (Buffer.compare(out, buf) !== 0) { fails++; console.log(`NG gunzip（level ${lvl}・${buf.length}バイト）`); }
  }
}
console.log(fails ? `NG ${fails}件` : `OK（指紋 ${fp}）`);
process.exit(fails ? 1 : 0);
