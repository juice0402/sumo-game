// 取組の上にのせる墨と筆の演出（2Dのキャンバス）。見た目だけで、物理と勝敗にはさわらない。
// 位置は「描く座標」（土俵の上の面が y=0・z=0 の面）で持ち、毎こま stage.project で画面に写す。
import { COL, rand, setupCanvas } from './ink.js';
import { LOOK } from '../data/look.js';
import { artImage } from './art.js';

const VIS = 0.42;   // トンの筆の線の、土俵のふちより内にかぶせる割合（線の長さに対して）
const TON_IDS = ['fx-ton1', 'fx-ton2', 'fx-ton3', 'fx-ton4', 'fx-ton5', 'fx-ton6'];
let tonImgs = [], tonLoading = false, tonTried = -1e9;
const tonTint = {};
function loadTon() {   // はじめて使うときに読む（読めなかったら次にまたためす）
  const now = performance.now();
  if (tonImgs.length || tonLoading || now - tonTried < 3000) return;
  tonLoading = true; tonTried = now;
  Promise.all(TON_IDS.map((id) => artImage(id).catch(() => null))).then((a) => { tonImgs = a.filter(Boolean); tonLoading = false; }).catch(() => { tonLoading = false; });
}
function tinted(i, color) {   // 白の筆の絵に色をつけたもの（色ごとに1回だけ作る）
  const key = i + color;
  if (tonTint[key]) return tonTint[key];
  const im = tonImgs[i], c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color; g.fillRect(0, 0, c.width, c.height);
  return (tonTint[key] = c);
}

export function createFx(cv) {
  let lay = null;
  let drops = [], bursts = [];
  let tonPick = 0, tonPrev = 0;

  function resize() { lay = setupCanvas(cv, LOOK.maxDpr); }   // 3D と同じ細かさまで（それより細かくても見えず、毎こま重い）

  // 墨のしぶき（x・y は描く座標）
  function splash(x, y, power, dir = 0) {
    const n = 10 + Math.round(power * 12);
    for (let i = 0; i < n; i++) {
      const a = Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6 + dir * 0.35;
      const sp = (0.6 + Math.random() * 1.6) * (0.8 + power);
      drops.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.012 + Math.random() * 0.032, life: 1 });
    }
  }

  // 筆の集中線（ぶつかった所から外へ）
  function burst(x, y, power) {
    bursts.push({ x, y, t: 0, power, seed: 1 + Math.floor(Math.random() * 9999) });
  }

  function step(dt) {
    for (const p of drops) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy -= 6 * dt; p.life -= dt * 1.5; }
    drops = drops.filter((p) => p.life > 0);
    for (const b of bursts) b.t += dt;
    bursts = bursts.filter((b) => b.t < LOOK.burstSec);
  }

  function clear() { drops = []; bursts = []; }
  const busy = () => drops.length > 0 || bursts.length > 0;

  // はじまり：和紙の画面を、大きな墨の筆が左から右へ横切る（通ったあとに土俵が見える）。p は 0〜1
  function inkSweep(ctx, W, H, p) {
    const slant = H * 0.14;
    const head = -0.25 * W + p * 1.5 * W; // 筆の先の位置
    const band = W * 0.34;
    const r = rand(17);
    // まだ通っていない所＝和紙
    ctx.fillStyle = COL.washi;
    ctx.beginPath();
    ctx.moveTo(head + slant, 0); ctx.lineTo(W + 2, 0); ctx.lineTo(W + 2, H); ctx.lineTo(head - slant, H);
    ctx.closePath();
    ctx.fill();
    // 筆の帯：毛の1本ずつのすじ（長さと濃さをばらつかせて、かすれを出す）
    ctx.save();
    ctx.lineCap = 'butt';
    ctx.strokeStyle = COL.sumi;
    const rows = 90;
    for (let i = 0; i < rows; i++) {
      const v = i / (rows - 1), y = v * H;
      const edge = head + slant * (1 - 2 * v);
      const dry = r() < 0.18; // ところどころ、かすれて切れる
      const len = band * (0.35 + r() * 0.75);
      ctx.globalAlpha = dry ? 0.35 + r() * 0.3 : 0.8 + r() * 0.2;
      ctx.lineWidth = (H / rows) * (dry ? 0.6 : 1.3 + r() * 0.8);
      ctx.beginPath(); ctx.moveTo(edge - len, y); ctx.lineTo(edge + (r() - 0.3) * 14, y); ctx.stroke();
    }
    ctx.restore();
  }

  // トンの合図：土俵の両わきの短い線（カメラは土俵についているので、ゆれのかわりに見せる）
  // トンの線：Codex の筆の払い（fx-ton1〜6・白の絵＝明るさがすけ具合）に色をつけて、土俵の両わきに出す（左は反転）。
  // 絵がない・読む前は、下のコードの3本線
  function tonMarks(ctx, stage, P, k, color) {
    loadTon();
    const up = k > 0.05 && tonPrev <= 0.05;
    tonPrev = k;
    if (k <= 0.05) return;
    if (tonImgs.length) {
      if (up) tonPick = (tonPick + 1) % tonImgs.length;   // トンのたびに形をかえる
      const s = lay.dpr;
      for (const [x, dir, j] of [[-P.ringHalf, -1, (tonPick + 3) % tonImgs.length], [P.ringHalf, 1, tonPick]]) {
        const a = stage.project(x, -P.ringDepth * 0.08, P.ringHalf), b = stage.project(x, -P.ringDepth * 0.8, P.ringHalf);
        const im = tinted(j, color), h = Math.abs(b[1] - a[1]) * s * (0.8 + 0.35 * k), w = (h * im.width) / im.height;
        ctx.save();
        ctx.globalAlpha = Math.min(1, 0.95 * k);
        ctx.translate(a[0] * s - dir * w * VIS, ((a[1] + b[1]) / 2) * s);   // 筆の入りを土俵のふちにかぶせる（縦長の画面では土俵が横いっぱいなので、外だけだと見えない）
        ctx.scale(dir, 1);
        ctx.drawImage(im, 0, -h / 2, w, h);
        ctx.restore();
      }
      return;
    }
    const s = lay.dpr;
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.5 * k;
    ctx.lineWidth = 2 * s;
    ctx.beginPath();
    for (const [x, dir] of [[-P.ringHalf, -1], [P.ringHalf, 1]]) {
      for (const yy of [0.15, 0.4, 0.65]) {
        const q = stage.project(x, -P.ringDepth * yy, P.ringHalf);
        const L = (10 + 10 * k) * s;
        ctx.moveTo(q[0] * s + dir * 6 * s, q[1] * s); ctx.lineTo(q[0] * s + dir * (6 * s + L), q[1] * s);
      }
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // 朱の筆で描いた丸：左上から時計まわりに少しはみ出して閉じる。はじめ太く、終わりは細く、かすれる。
  // k＝描けた割合（0〜1）。見た目だけなので Math.sin でよい
  function brushRing(ctx, x, y, r, k, dpr) {
    if (k <= 0) return;
    const R = rand(5), n = 60, a0 = -2.3, sweep = Math.PI * 2.16;
    const pt = (u) => {
      const a = a0 + sweep * u, w = 1 + 0.06 * Math.sin(u * 9.2 + 0.7) - 0.05 * u;
      return [x + Math.cos(a) * r * 1.1 * w, y + Math.sin(a) * r * 0.9 * w];
    };
    const m = Math.max(2, Math.round(n * k));
    ctx.save();
    ctx.lineCap = 'round';
    ctx.strokeStyle = COL.shu;
    // 本体：1こまずつ太さを変える。後半はところどころとぎれる（かすれ）
    let p = pt(0);
    for (let i = 1; i < m; i++) {
      const u = i / (n - 1), q = pt(u), gap = u > 0.72 && R() < (u - 0.72) * 1.4;
      if (!gap) {
        ctx.lineWidth = Math.max(0.8, (5.6 - 4.6 * u + (R() - 0.5) * 0.6) * dpr);
        ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(q[0], q[1]); ctx.stroke();
      }
      p = q;
    }
    // 筆の毛のすじ（後半だけ・細い線2本）
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 0.8 * dpr;
    for (const off of [-1.8, 1.6]) {
      ctx.beginPath();
      for (let i = Math.round(n * 0.45); i < m; i++) {
        const q = pt(i / (n - 1)), cx = q[0] - x, cy = q[1] - y, d = Math.hypot(cx, cy) || 1;
        const sx = q[0] + (cx / d) * off * dpr, sy = q[1] + (cy / d) * off * dpr;
        if (i === Math.round(n * 0.45)) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
      }
      ctx.stroke();
    }
    ctx.restore();
  }

  // 1こま描く。o = { stage, P, sweep（0〜1 か null）, ton（0〜1）, mark（{x,y,t} か null）}
  function draw(o) {
    if (!lay) resize();
    const { ctx, W, H, dpr } = lay;
    ctx.clearRect(0, 0, W, H);
    const st = o.stage;
    tonMarks(ctx, st, o.P, o.ton, st.look().tonMark);
    if (o.auras) {   // 気（見た目だけ・うしろの粒は、ふたりの力士の形でかくす＝相手の近くに落ちた稲妻も相手のうしろ）
      const polys = (o.auras[0] && o.auras[0].polys || []).map((pl) => pl.map((q) => [q[0] * dpr, q[1] * dpr]));
      for (const a of o.auras) a.a.draw(ctx, a.x * dpr, a.y * dpr, a.h * dpr, 1, polys.length ? { polys } : null);
    }
    // 集中線
    for (const b of bursts) {
      const q = st.project(b.x, b.y);
      const u = b.t / LOOK.burstSec, r = rand(b.seed);
      ctx.save();
      ctx.lineCap = 'round';
      ctx.strokeStyle = COL.washi;
      ctx.globalAlpha = (1 - u) * 0.75;
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + r() * 0.3;
        const r0 = (34 + u * 70 + r() * 20) * dpr * (0.7 + b.power * 0.5), r1 = r0 + (26 + r() * 46) * dpr * (1 - u * 0.5);
        ctx.lineWidth = (1.5 + r() * 3) * dpr * (1 - u * 0.6);
        ctx.beginPath();
        ctx.moveTo(q[0] * dpr + Math.cos(a) * r0, q[1] * dpr + Math.sin(a) * r0);
        ctx.lineTo(q[0] * dpr + Math.cos(a) * r1, q[1] * dpr + Math.sin(a) * r1);
        ctx.stroke();
      }
      ctx.restore();
    }
    // 墨のしぶき（画面に写した大きさ：1m あたりの画素は、土俵の幅から求める）
    if (drops.length) {
      const a = st.project(-1, 0), b = st.project(1, 0), ppm = (Math.abs(b[0] - a[0]) / 2) * dpr;
      ctx.fillStyle = COL.sumi;
      for (const p of drops) {
        const q = st.project(p.x, p.y);
        ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
        ctx.beginPath();
        ctx.ellipse(q[0] * dpr, q[1] * dpr, p.r * ppm * 1.4, p.r * ppm, Math.atan2(-p.vy, p.vx), 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    // 体がついた所（朱の筆で描く丸）
    if (o.mark) {
      const q = st.project(o.mark.x, o.mark.y);
      brushRing(ctx, q[0] * dpr, q[1] * dpr, 15 * dpr, Math.min(1, (o.mark.t || 0) / LOOK.ringSec), dpr);
    }
    if (o.sweep !== null && o.sweep < 1) inkSweep(ctx, W, H, o.sweep);
  }

  return { resize, splash, burst, step, clear, draw, busy };
}
