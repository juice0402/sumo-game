// 墨・和紙の描きかた（見た目だけ。勝敗の計算にはさわらない）
export const COL = {
  sumi: '#201E1B', sumi2: '#2b2824', washi: '#EEE9DE', washi2: '#cfc8b8', washiShade: '#b9b1a0',
  shu: '#AB392F', kin: '#B79A53', clay: '#d8ccb0', clayFace: '#8f7d5d', clayDark: '#6e5f45',
};

// 見た目用の乱数（毎回同じ紙のふちになるように）
export function rand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

export function setupCanvas(cv, maxDpr = 2.5) {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const r = cv.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const ctx = cv.getContext('2d');
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return { ctx, W: w, H: h, dpr };
}

// ちぎった和紙のふち（四角の各辺を細かくゆらす）
export function tornRect(ctx, x, y, w, h, seed = 7, amp = 2.2) {
  const r = rand(seed);
  const step = 9;
  ctx.beginPath();
  const edge = (x0, y0, x1, y1, first) => {
    const len = Math.hypot(x1 - x0, y1 - y0), n = Math.max(2, Math.round(len / step));
    const nx = -(y1 - y0) / len, ny = (x1 - x0) / len;
    for (let i = 0; i < n; i++) {
      const t = i / n, j = (r() - 0.5) * 2 * amp;
      const px = x0 + (x1 - x0) * t + nx * j, py = y0 + (y1 - y0) * t + ny * j;
      if (first && i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
  };
  edge(x, y, x + w, y, true);
  edge(x + w, y, x + w, y + h);
  edge(x + w, y + h, x, y + h);
  edge(x, y + h, x, y);
  ctx.closePath();
}

// 和紙のすじ（うすく）。一度作って使い回す
let fiber = null;
export function fiberPattern(ctx) {
  if (fiber) return ctx.createPattern(fiber, 'repeat');
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  const r = rand(11);
  g.strokeStyle = 'rgba(120,105,80,0.10)';
  g.lineWidth = 0.8;
  for (let i = 0; i < 70; i++) {
    const x = r() * 160, y = r() * 160, a = r() * Math.PI, l = 6 + r() * 22;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (r() - 0.5) * 6, y + Math.sin(a) * l * 0.5 + (r() - 0.5) * 6, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  g.fillStyle = 'rgba(90,80,60,0.06)';
  for (let i = 0; i < 260; i++) g.fillRect(r() * 160, r() * 160, 1.2, 1.2);
  fiber = c;
  return ctx.createPattern(fiber, 'repeat');
}

export function polyPath(ctx, pts, tx) {
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = tx(p);
    if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]);
  });
  ctx.closePath();
}

// 紙の力士：うすい影（紙の厚み）→ 和紙 → すじ → 太い墨のふち
export function paperPiece(ctx, pts, tx, { fill = COL.washi, line = 3, shade = 3, dark = false } = {}) {
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.translate(shade, shade);
  polyPath(ctx, pts, tx);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.restore();
  polyPath(ctx, pts, tx);
  ctx.fillStyle = dark ? COL.washi2 : fill;
  ctx.fill();
  ctx.save();
  ctx.clip();
  ctx.fillStyle = fiberPattern(ctx);
  ctx.fillRect(-1e4, -1e4, 2e4, 2e4);
  ctx.restore();
  polyPath(ctx, pts, tx);
  ctx.lineJoin = 'round';
  ctx.strokeStyle = COL.sumi;
  ctx.lineWidth = line;
  ctx.stroke();
}

// 筆のかすれ風の線：太い半とうめい → 細い本線
export function inkStroke(ctx, pts, tx, width) {
  if (pts.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const path = () => {
    ctx.beginPath();
    pts.forEach((p, i) => { const q = tx(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
  };
  path();
  ctx.strokeStyle = 'rgba(32,30,27,0.25)';
  ctx.lineWidth = width * 2.2;
  ctx.stroke();
  path();
  ctx.strokeStyle = COL.sumi;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

// 墨のしぶき（見た目だけなので Math.random でよい）
export function makeSplash(x, y, power, dir = 0) {
  const out = [];
  const n = 10 + Math.round(power * 10);
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.6 + dir * 0.3;
    const sp = (0.6 + Math.random() * 1.6) * (0.8 + power);
    out.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: 0.012 + Math.random() * 0.03, life: 1 });
  }
  return out;
}
