// 福箱の箱（11/26 しょーくん「玉手箱みたいな紐で結ばれた金の箱」「紐がしゅるっとほどける」・紐は紫）。
// 絵は Codex（A）の部品（data/fukuart.js）。紐は「まっすぐな紐」を箱の面に沿った線に並べ、箱の形で切る（ふちまでぴったり届く）。
// 動き：ゆれる（太鼓3つ）→ 結び目がゆるむ → 紐が結び目へ引かれてしゅるっと抜け、落ちる → ふたが浮いて抜ける
//   → 中から光の筋・白い煙がふわっと・金箔がひらひら・きらめき（Codex の部品 fx-*）→ 中身（箱はうすれて、煙と金箔だけ少し残る）。
// 演出は段（並〜極）で変えない（開ける前に段を知らせない＝パチンコ・スロットの予告に似せない）。
// 見た目だけ。描くのはこの canvas だけで、ほかの画面にさわらない。
import { FUKU_ART as A } from '../data/fukuart.js';
import { artImages } from './art.js';
import { setupCanvas } from './ink.js';

const clamp01 = (t) => (t < 0 ? 0 : t > 1 ? 1 : t);
const span = (t, a, b) => clamp01((t - a) / (b - a));
const easeOut = (t) => 1 - (1 - t) * (1 - t) * (1 - t);
const easeIn = (t) => t * t;

// ゆれ（前の CSS fkshake と同じ形）：[時間 0〜1, 回転（度）, 上下（240px の箱で px）]
const SHAKE = [[0, 0, 0], [0.06, -2, -4], [0.14, 0, 0], [0.39, 2.5, -6], [0.47, 0, 0], [0.72, -3, -9], [0.82, 0, 2], [1, 0, 0]];
function shakeAt(u) {
  for (let i = 1; i < SHAKE.length; i++) {
    if (u <= SHAKE[i][0]) {
      const [a0, r0, y0] = SHAKE[i - 1], [a1, r1, y1] = SHAKE[i];
      const k = (u - a0) / (a1 - a0);
      return [((r0 + (r1 - r0) * k) * Math.PI) / 180, y0 + (y1 - y0) * k];
    }
  }
  return [0, 0];
}

// 紐の線（絵の上のピクセル）。結び目から4方向へ。はしは箱の外まで引いて、箱の形で切る
const K = A.knot, TP = A.top;
const BANDS = [
  [[K.x, K.y], [(TP.bl + TP.br) / 2, TP.back - 40]],
  [[K.x, K.y], [-40, K.y]],
  [[K.x, K.y], [A.box.w + 40, K.y]],
  [[K.x, K.y], [(TP.fl + TP.fr) / 2, TP.front], [(TP.fl + TP.fr) / 2, A.box.h + 40]],
];
// 線を、結び目から長さ keep（0〜1）のぶんだけ残す
function cutLine(pts, keep) {
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  let left = total * keep;
  const out = [pts[0]];
  for (let i = 1; i < pts.length && left > 0; i++) {
    const [ax, ay] = pts[i - 1], [bx, by] = pts[i];
    const d = Math.hypot(bx - ax, by - ay);
    if (d <= left) { out.push(pts[i]); left -= d; } else { out.push([ax + ((bx - ax) * left) / d, ay + ((by - ay) * left) / d]); left = 0; }
  }
  return out;
}

// end＝中身を出す時間・fxEnd＝煙と金箔が消えて動きが止まる時間
const PERIOD = { short: { sh: 0, k0: 0, k1: 170, p0: 60, p1: 260, f0: 170, f1: 420, l0: 200, l1: 440, end: 560, fxEnd: 1700 },
  full: { sh: 900, k0: 900, k1: 1250, p0: 1040, p1: 1440, f0: 1300, f1: 1760, l0: 1450, l1: 1950, end: 2250, fxEnd: 3900 } };

// 煙・金箔・きらめきの数と動き（位置と速さは箱の幅を1として・見た目だけなので Math.random でよい）
function makeFx(P) {
  const R = Math.random, smoke = [], leaves = [], glints = [];
  for (let i = 0; i < 8; i++) smoke.push({ t0: P.l0 + 100 + i * 70 + R() * 60, life: 1500 + R() * 700, x: (R() - 0.5) * 0.5, vx: (R() - 0.5) * 0.4,
    vy: -(0.22 + R() * 0.3), s: 0.5 + R() * 0.35, r: R() * 6.28, vr: (R() - 0.5) * 0.5, wisp: i % 4 === 3 });
  for (let i = 0; i < 14; i++) leaves.push({ t0: P.l0 + 160 + R() * 450, life: 1900 + R() * 800, x: (R() - 0.5) * 0.4, vx: (R() - 0.5) * 1.0,
    vy: -(0.9 + R() * 0.8), s: 0.08 + R() * 0.08, r: R() * 6.28, vr: (R() - 0.5) * 6, ph: R() * 6.28, img: R() < 0.55 ? 'fx-leaf1' : 'fx-leaf2' });
  for (let i = 0; i < 8; i++) glints.push({ t0: P.l0 + 250 + R() * 1100, life: 420, x: (R() - 0.5) * 1.1, y: -0.15 - R() * 0.95, s: 0.13 + R() * 0.12 });
  return { smoke, leaves, glints };
}

export function createFukuBox(cv) {
  let imgs = null, lay = null, raf = 0, off = null, idleSt = null, ready = null, fxp = null;
  // 絵は、はじめて福箱の画面を開いたときに読む（起動を軽く・読みこみの前は lib-art がまだない）
  const load = () => ready || (ready = artImages(A.ids).then((m) => { imgs = m; if (idleSt && !raf) draw(idleSt); }).catch(() => { ready = null; }));

  function layout() {
    const { ctx, W, H } = setupCanvas(cv);
    const bw = Math.min(W * 0.8, ((H * 0.52) * A.box.w) / A.box.h);
    const bh = (bw * A.box.h) / A.box.w;
    const L = { ctx, W, H, bw, bh, x0: (W - bw) / 2, yb: H * 0.55 + bh * 0.5, s: bw / A.box.w };
    off = document.createElement('canvas');
    off.width = Math.ceil(bw); off.height = Math.ceil(bh);
    return L;
  }

  function cords(L, pull) {
    const o = off.getContext('2d'), s = L.s, tile = imgs['fuku-cord'];
    const t = tile.height * A.cordScale * s;
    o.setTransform(1, 0, 0, 1, 0, 0);
    o.clearRect(0, 0, off.width, off.height);
    o.globalCompositeOperation = 'source-over';
    const lines = BANDS.map((b) => cutLine(b, 1 - pull).map(([x, y]) => [x * s, y * s]));
    // 紐の影（箱の面に少し落ちる）
    o.strokeStyle = 'rgba(32,18,6,0.38)';
    o.lineWidth = t * 0.8; o.lineJoin = 'round'; o.lineCap = 'butt';
    for (const ln of lines) {
      o.beginPath();
      ln.forEach(([x, y], i) => (i ? o.lineTo(x + t * 0.14, y + t * 0.26) : o.moveTo(x + t * 0.14, y + t * 0.26)));
      o.stroke();
    }
    // 紐：まっすぐな紐の絵を、線の向きにくり返して並べる
    const pat = o.createPattern(tile, 'repeat-x');
    const k = t / tile.height;
    for (const ln of lines) {
      for (let i = 1; i < ln.length; i++) {
        const [ax, ay] = ln[i - 1], [bx, by] = ln[i];
        const len = Math.hypot(bx - ax, by - ay);
        if (len < 0.5) continue;
        o.save();
        o.translate(ax, ay);
        o.rotate(Math.atan2(by - ay, bx - ax));
        pat.setTransform(new DOMMatrix().translate(0, -t / 2).scale(k));
        o.fillStyle = pat;
        o.fillRect(i > 1 ? -t / 2 : 0, -t / 2, len + (i > 1 ? t / 2 : 0), t);
        o.restore();
      }
    }
    // 箱の形で切る（はしがふちまで届き、外へははみ出さない）
    o.globalCompositeOperation = 'destination-in';
    o.drawImage(imgs['fuku-box'], 0, 0, L.bw, L.bh);
    o.globalCompositeOperation = 'source-over';
    L.ctx.drawImage(off, 0, 0);
  }

  function knot(ctx, s, phase, sway, alpha) {
    // 房2本（結び目の下にさがってゆれる）
    const ts = imgs['fuku-tassel'], tw = ts.width * A.tasselScale * s, th = ts.height * A.tasselScale * s;
    for (const [dx, k] of [[-16, 1], [16, -0.8]]) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate((K.x + dx) * s, (K.y + 14) * s);
      ctx.rotate(sway * k);
      ctx.drawImage(ts, -tw / 2, -th * 0.03, tw, th);
      ctx.restore();
    }
    // 結び目：結んだ → ゆるんだ → ほどけた をかさねてつなぐ
    const pairs = phase < 1 ? [['fuku-knot1', 1 - phase], ['fuku-knot2', phase]] : [['fuku-knot2', 2 - phase], ['fuku-knot3', phase - 1]];
    for (const [id, a] of pairs) {
      if (a <= 0.01) continue;
      const im = imgs[id], an = A.knotAnchor[id];
      const w = im.width * A.cordScale * s, h = im.height * A.cordScale * s;
      ctx.globalAlpha = alpha * a;
      ctx.drawImage(im, K.x * s - an[0] * w, K.y * s - an[1] * h, w, h);
    }
    ctx.globalAlpha = 1;
  }

  // st：{ rot, dy, knot 0〜2, pull 0〜1, fall 0〜1, lid 0〜1, sway }
  function draw(st) {
    idleSt = st;
    if (!imgs || !cv.clientWidth) return;
    const L = lay || (lay = layout());
    const { ctx, W, H, bw, bh, s } = L;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.save();
    ctx.translate(L.x0 + bw / 2, L.yb);
    ctx.rotate(st.rot);
    ctx.translate(-bw / 2, -bh + (st.dy * bw) / 240);
    if (st.lid <= 0) ctx.drawImage(imgs['fuku-box'], 0, 0, bw, bh);
    else {
      const bd = imgs['fuku-body'], ld = imgs['fuku-lid'];
      ctx.globalAlpha = st.boxA == null ? 1 : st.boxA;
      ctx.drawImage(bd, ((A.box.w - bd.width) / 2) * s, A.bodyTop * s, bd.width * s, bd.height * s);
      ctx.globalAlpha = 1;
      if (st.fx) ray(ctx, L, st);
      const u = easeOut(st.lid), lw = ld.width * s, lh = ld.height * s;
      ctx.save();
      ctx.globalAlpha = 1 - span(st.lid, 0.45, 1);
      ctx.translate(((A.box.w - ld.width) / 2) * s + lw / 2 + u * bw * 0.1, A.lidTop * s + lh / 2 - u * bh * 0.6);
      ctx.rotate(u * 0.22);
      ctx.drawImage(ld, -lw / 2, -lh / 2, lw, lh);
      ctx.restore();
    }
    if (st.pull < 1) cords(L, st.pull);
    if (st.fall < 1) {
      const f = st.fall;
      ctx.save();
      ctx.translate(K.x * s, K.y * s + easeIn(f) * bh * 0.95);
      ctx.rotate(f * 0.5);
      ctx.translate(-K.x * s, -K.y * s);
      knot(ctx, s, st.knot, st.sway, 1 - span(f, 0.45, 1));
      ctx.restore();
    }
    if (st.fx) particles(ctx, L, st);
    ctx.restore();
  }

  // 箱の口（中から光と煙が出る所）：箱の中の上のほう
  const mouth = (L) => [L.bw / 2, (A.bodyTop + 150) * L.s];

  // 光の筋（箱の中から立ちのぼる・重ねると明るくなる）
  function ray(ctx, L, st) {
    const P = st.P, t = st.t, a = span(t, P.l0 + 60, P.l0 + 380) * (1 - span(t, P.end + 80, P.end + 700));
    if (a <= 0) return;
    const im = imgs['fx-ray'], [mx, my] = mouth(L);
    const h = L.bh * 1.3, w = ((h * im.width) / im.height) * (1 + 0.04 * Math.sin(t / 85));
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.drawImage(im, mx - w / 2, my - h * 0.9, w, h);
    ctx.restore();
  }

  // 煙・金箔・きらめき
  function particles(ctx, L, st) {
    const t = st.t, bw = L.bw, [mx, my] = mouth(L);
    ctx.save();
    for (const p of fxp.smoke) {
      const u = (t - p.t0) / p.life;
      if (u <= 0 || u >= 1) continue;
      const tau = (t - p.t0) / 1000, im = imgs[p.wisp ? 'fx-wisp' : 'fx-smoke'];
      const sz = bw * p.s * (0.35 + 0.85 * easeOut(Math.min(1, u * 1.4)));
      const w = sz, h = (sz * im.height) / im.width;
      // 中身が出たら、字が読めるように煙をうすく
      ctx.globalAlpha = 0.72 * (u < 0.18 ? u / 0.18 : (1 - u) / 0.82) * (1 - 0.6 * span(t, st.P.end, st.P.end + 350));
      ctx.save();
      ctx.translate(mx + (p.x + p.vx * tau) * bw, my + p.vy * tau * (1 - 0.18 * tau) * bw);
      ctx.rotate(p.r + p.vr * tau);
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    for (const p of fxp.leaves) {
      const u = (t - p.t0) / p.life;
      if (u <= 0 || u >= 1) continue;
      const tau = (t - p.t0) / 1000, im = imgs[p.img];
      const fy = p.vy * tau + 0.5 * 1.15 * tau * tau, drift = 0.06 * Math.sin(p.ph + tau * 5);
      const w = bw * p.s, h = (w * im.height) / im.width;
      ctx.globalAlpha = Math.min(1, u * 8) * (1 - span(u, 0.7, 1));
      ctx.save();
      ctx.translate(mx + (p.x + p.vx * tau * (1 - 0.25 * tau) + drift) * bw, my + Math.max(fy, -2) * bw);
      ctx.rotate(p.r + p.vr * tau);
      ctx.scale(Math.cos(p.ph + tau * 7), 1);   // ひらひら（裏返る）
      ctx.drawImage(im, -w / 2, -h / 2, w, h);
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const p of fxp.glints) {
      const u = (t - p.t0) / p.life;
      if (u <= 0 || u >= 1) continue;
      const im = imgs['fx-glint'], k = Math.sin(Math.PI * u), w = bw * p.s * k, h = (w * im.height) / im.width;
      ctx.globalAlpha = k;
      ctx.drawImage(im, mx + p.x * bw - w / 2, my + p.y * bw - h / 2, w, h);
    }
    ctx.restore();
  }

  const IDLE = { rot: 0, dy: 0, knot: 0, pull: 0, fall: 0, lid: 0, sway: 0 };
  function stop() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  function L0clear() { const L = lay; if (L) { L.ctx.setTransform(1, 0, 0, 1, 0, 0); L.ctx.clearRect(0, 0, L.W, L.H); } idleSt = null; }
  // 画面が開いて大きさが決まったとき・変わったときに描きなおす（開く前は大きさが0）
  new ResizeObserver(() => { lay = null; if (!raf && idleSt) draw(idleSt); }).observe(cv);

  return {
    idle() { stop(); lay = null; load(); draw(IDLE); },
    stop,
    // 開ける。short＝演出を短く。もどり値の P は時間の目安（音を合わせる）、done は中身を出す時
    play(short) {
      stop();
      const P = short ? PERIOD.short : PERIOD.full;
      fxp = makeFx(P);
      const done = load().then(() => new Promise((ok) => {
        const t0 = performance.now();
        let told = false;
        const step = (now) => {
          const t = now - t0;
          const st = { rot: 0, dy: 0, knot: 2 * easeOut(span(t, P.k0, P.k1)), pull: easeIn(span(t, P.p0, P.p1)),
            fall: span(t, P.f0, P.f1), lid: span(t, P.l0, P.l1), sway: 0, t, P, fx: true, boxA: 1 - span(t, P.end - 60, P.end + 260) };
          if (P.sh && t < P.sh) {
            [st.rot, st.dy] = shakeAt(t / P.sh);
            st.sway = -st.rot * 2.2;
          }
          if (st.fall > 0) st.sway = st.fall * 0.9;
          draw(st);
          if (!told && t >= P.end) { told = true; ok(); }   // 中身を出す（煙と金箔はそのまま少し続く）
          if (t < P.fxEnd) raf = requestAnimationFrame(step);
          else { raf = 0; L0clear(); }
        };
        raf = requestAnimationFrame(step);
      }));
      return { P, done };
    },
  };
}
