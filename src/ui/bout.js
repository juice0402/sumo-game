// 取組の画面（真横の2D）。物理は記録してから再生するだけ＝演出（スロー・ヒットストップ・揺れ）は勝敗にさわらない。
import { T } from '../data/text.js';
import { createBout, toLocal } from '../sim/battle.js';
import { COL, setupCanvas, paperPiece, makeSplash } from './ink.js';

export function initBout({ getDrive, onFoe, onRecut }) {
  const cv = document.getElementById('bout-cv');
  const cutin = document.getElementById('cutin');
  const resEl = document.getElementById('result');
  const big = document.getElementById('r-big');
  const kindEl = document.getElementById('r-kind');
  let st = null, raf = 0, lay = null;

  function layout() {
    const c = setupCanvas(cv);
    lay = c;
  }

  function stop() {
    cancelAnimationFrame(raf);
    if (st && st.bout) st.bout.free();
    st = null;
    cutin.classList.remove('go');
  }

  function start(me, foe, seed) {
    stop();
    resEl.hidden = true;
    document.getElementById('n-a').textContent = T.you;
    document.getElementById('n-b').textContent = foe.name;
    const bout = createBout({ a: me, b: foe.pts, seed, phys: { drive: getDrive() }, record: true });
    st = {
      me, foe, seed, bout, phys: bout.phys, rec: bout.rec,
      la: toLocal(me, 1, bout.phys).outline, lb: toLocal(foe.pts, -1, bout.phys).outline,
      t: 0, last: performance.now(), play: -1, idx: 0, hold: 0, endHold: 0, firstHit: true,
      shake: 0, splash: [], prevTouch: 0, shown: false,
    };
    layout();
    raf = requestAnimationFrame(frame);
  }

  function frame(now) {
    if (!st) return;
    const s = st;
    const fdt = Math.min(0.05, (now - s.last) / 1000);
    s.last = now;
    s.t += fdt;
    // 物理を先に進めておく（1こま 7ms まで）
    const t0 = performance.now();
    const ahead = Math.max(s.idx, s.bout.settleSteps) + 240;
    while (!s.bout.result.kind && s.bout.step < ahead && performance.now() - t0 < 7) {
      for (let i = 0; i < 20 && !s.bout.result.kind; i++) s.bout.stepOnce();
    }
    const done = !!s.bout.result.kind;
    const lastIdx = s.rec.n - 1;
    // 立ち合いの演出
    if (s.play < 0) {
      if (s.t > 0.3 && !cutin.classList.contains('go')) cutin.classList.add('go');
      if (s.t > 1.0 && lastIdx > s.bout.settleSteps) { s.play = 0; s.idx = s.bout.settleSteps; }
    } else if (s.hold > 0) {
      s.hold -= fdt;
    } else {
      let rate = 1;
      if (done && s.idx > lastIdx - 0.7 / s.phys.dt) rate = 0.3;
      s.idx = Math.min(lastIdx, s.idx + (fdt / s.phys.dt) * rate);
      if (done && s.idx >= lastIdx) {
        s.endHold += fdt;
        if (s.endHold > 0.5 && !s.shown) showResult();
      }
    }
    if (s.t > 1.3) cutin.classList.remove('go');
    // ぶつかった瞬間
    const f = s.rec.f, o = Math.floor(s.idx) * 8;
    const touch = f[o + 7];
    if (touch && !s.prevTouch && s.play >= 0) {
      const mx = (f[o] + f[o + 3]) / 2, my = (f[o + 1] + f[o + 4]) / 2 + 0.45;
      s.splash.push(...makeSplash(mx, my, s.firstHit ? 1 : 0.3));
      if (s.firstHit) { s.hold = 0.09; s.shake = 1; }
      s.firstHit = false;
    }
    s.prevTouch = touch;
    for (const p of s.splash) { p.x += p.vx * fdt; p.y += p.vy * fdt; p.vy -= 6 * fdt; p.life -= fdt * 1.6; }
    s.splash = s.splash.filter((p) => p.life > 0);
    s.shake = Math.max(0, s.shake - fdt * 6);
    draw(o);
    raf = requestAnimationFrame(frame);
  }

  function draw(o) {
    const s = st, { ctx, W, H, dpr } = lay, P = s.phys, f = s.rec.f;
    const sc = Math.min(W / (2 * P.ringHalf + 0.4), H / 3.4);
    const cx = W / 2 + (Math.random() - 0.5) * s.shake * 8 * dpr;
    const gy = H * 0.62 + (Math.random() - 0.5) * s.shake * 6 * dpr;
    const X = (x) => cx + x * sc, Y = (y) => gy - y * sc;
    ctx.fillStyle = COL.sumi;
    ctx.fillRect(0, 0, W, H);
    // うしろの朱の円
    ctx.fillStyle = 'rgba(171,57,47,0.13)';
    ctx.beginPath(); ctx.arc(X(0), Y(1.05), 1.25 * sc, 0, Math.PI * 2); ctx.fill();
    // 土俵
    const ry = f[o + 6], top = Y(ry), L = X(-P.ringHalf), R = X(P.ringHalf), d = 0.1 * sc;
    ctx.fillStyle = COL.clayFace;
    ctx.fillRect(L, top, R - L, P.ringDepth * sc);
    ctx.fillStyle = COL.clayDark;
    ctx.fillRect(L, top + P.ringDepth * sc * 0.72, R - L, P.ringDepth * sc * 0.28);
    ctx.fillStyle = COL.clay;
    ctx.beginPath(); ctx.moveTo(L, top); ctx.lineTo(R, top); ctx.lineTo(R - d * 1.4, top - d); ctx.lineTo(L + d * 1.4, top - d); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = COL.kin;
    ctx.lineWidth = 2 * dpr;
    ctx.beginPath(); ctx.moveTo(L, top); ctx.lineTo(R, top); ctx.stroke();
    ctx.fillStyle = COL.kin;
    for (const ex of [L + d * 0.6, R - d * 0.6]) { ctx.beginPath(); ctx.ellipse(ex, top - d * 0.35, d * 0.7, d * 0.45, 0, 0, Math.PI * 2); ctx.fill(); }
    ctx.strokeStyle = 'rgba(238,233,222,0.12)';
    ctx.beginPath(); ctx.moveTo(0, Y(-P.ringDepth)); ctx.lineTo(W, Y(-P.ringDepth)); ctx.stroke();
    // 影と力士
    const fighters = [
      { x: f[o], y: f[o + 1], a: f[o + 2], ol: s.la, dark: false },
      { x: f[o + 3], y: f[o + 4], a: f[o + 5], ol: s.lb, dark: true },
    ];
    for (const g of fighters) {
      if (g.y < -0.05) continue;
      const lift = Math.max(0, g.y - ry);
      ctx.fillStyle = `rgba(0,0,0,${Math.max(0.05, 0.28 - lift * 0.6)})`;
      ctx.beginPath(); ctx.ellipse(X(g.x), top - d * 0.4, 0.36 * sc, d * 0.35, 0, 0, Math.PI * 2); ctx.fill();
    }
    for (const g of fighters) {
      const c = Math.cos(g.a), sn = Math.sin(g.a);
      const tx = (p) => [X(g.x + p[0] * c - p[1] * sn), Y(g.y + p[0] * sn + p[1] * c)];
      paperPiece(ctx, g.ol, tx, { line: Math.max(2, 0.024 * sc), shade: 0.025 * sc, dark: g.dark });
    }
    // 墨のしぶき
    ctx.fillStyle = COL.sumi;
    for (const p of s.splash) {
      ctx.globalAlpha = Math.max(0, Math.min(1, p.life));
      ctx.beginPath(); ctx.ellipse(X(p.x), Y(p.y), p.r * sc * 1.4, p.r * sc, Math.atan2(-p.vy, p.vx), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function showResult() {
    const s = st;
    s.shown = true;
    const r = s.bout.result;
    const name = (side) => (side === 'a' ? T.you : s.foe.name);
    big.className = 'big brush ' + (r.winner === 'a' ? 'win' : r.winner === 'b' ? 'lose' : '');
    big.textContent = r.winner === 'a' ? T.win : r.winner === 'b' ? T.lose : T.draw;
    kindEl.textContent = T.kind[r.kind](r.loser ? name(r.loser) : '');
    resEl.hidden = false;
  }

  document.getElementById('b-again').addEventListener('click', () => { if (st) start(st.me, st.foe, st.seed + 1); });
  document.getElementById('b-replay').addEventListener('click', () => { if (st) start(st.me, st.foe, st.seed); });
  document.getElementById('b-foe').addEventListener('click', () => { stop(); onFoe(); });
  document.getElementById('b-recut').addEventListener('click', () => { stop(); onRecut(); });
  window.addEventListener('resize', () => { if (st) layout(); });

  return { start, stop };
}
