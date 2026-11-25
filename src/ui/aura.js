// オーラ（気）を描く（11/26 福箱・コードで描く絵＝C）。取組・編集・福箱の見本で使う。見た目だけ＝物理にさわらない。
// 粒は力士の高さ h を1とした「力士のまわりの位置」で持つ（力士が動いてもついていく）。光る輪やグラデーションは使わない。
import { AURAS } from '../data/auras.js';

const MAX = 90;
const R = Math.random;   // 見た目だけなので Math.random でよい

export function createAura(id) {
  const A = AURAS[id];
  if (!A || !A.kind) return null;
  const parts = [];
  let acc = 0, boltIn = 0.3;
  const rate = { wisp: 14, petal: 10, confetti: 12, spark: 22, wind: 6, gold: 18, bolt: 10 }[A.kind] || 12;

  function spawn() {
    const k = A.kind, p = { t: 0, ph: R() * 6.28 };
    if (k === 'wisp') Object.assign(p, { u: (R() - 0.5) * 0.7, v: 0.3 + R() * 0.2, vu: 0, vv: -0.32 - R() * 0.12, life: 1.3 + R() * 0.4 });
    else if (k === 'petal') Object.assign(p, { u: (R() - 0.5) * 1.3, v: -0.7 + R() * 0.3, vu: 0.06, vv: 0.22 + R() * 0.1, life: 2, a: R() * 6.28 });
    else if (k === 'confetti') Object.assign(p, { u: (R() - 0.5) * 1.3, v: -0.75 + R() * 0.2, vu: (R() - 0.5) * 0.1, vv: 0.3 + R() * 0.12, life: 2, a: R() * 6.28, c: A.colors[Math.floor(R() * A.colors.length)] });
    else if (k === 'spark') Object.assign(p, { u: (R() - 0.5) * 0.6, v: 0.3 + R() * 0.2, vu: (R() - 0.5) * 0.2, vv: -0.6 - R() * 0.5, life: 0.6 + R() * 0.4, c: R() < 0.3 ? '#F2B36B' : A.color });
    else if (k === 'wind') Object.assign(p, { r: 0.48 + R() * 0.16, a0: R() * 6.28, life: 0.9, dir: R() < 0.5 ? 1 : -1 });
    else if (k === 'gold') {
      if (R() < 0.18) Object.assign(p, { leaf: true, u: (R() - 0.5) * 1.1, v: -0.6 + R() * 0.3, vu: 0.04, vv: 0.16, life: 2.2, a: R() * 6.28 });
      else if (R() < 0.12) Object.assign(p, { star: true, u: (R() - 0.5) * 0.9, v: (R() - 0.5) * 0.9, vu: 0, vv: 0, life: 0.35 });
      else Object.assign(p, { u: (R() - 0.5) * 0.8, v: 0.2 + R() * 0.3, vu: 0, vv: -0.18 - R() * 0.1, life: 1.6, c: ['#D9B95E', '#C9A445', '#F0D98C'][Math.floor(R() * 3)] });
    } else if (k === 'bolt') {   // 火の粉のような小さな粒（稲妻のあいだを埋める）
      Object.assign(p, { u: (R() - 0.5) * 0.7, v: (R() - 0.5) * 0.8, vu: 0, vv: -0.1, life: 0.4, c: A.color });
    }
    parts.push(p);
  }
  function bolt() {   // 筆の稲妻：上から横へ、ぎざぎざの線（0.14秒）
    const s = R() < 0.5 ? -1 : 1, pts = [];
    let u = s * (0.25 + R() * 0.15), v = -0.55;
    pts.push([u, v]);
    for (let i = 0; i < 5; i++) { u += s * (0.02 + R() * 0.05) * (i % 2 ? -1 : 1.6); v += 0.16 + R() * 0.05; pts.push([u, v]); }
    parts.push({ boltPts: pts, t: 0, life: 0.22 });
  }

  return {
    step(dt) {
      dt = Math.min(dt, 0.05);
      acc += dt * rate;
      while (acc >= 1) { acc -= 1; if (parts.length < MAX) spawn(); }
      if (A.kind === 'bolt') { boltIn -= dt; if (boltIn <= 0) { bolt(); boltIn = 0.3 + R() * 0.45; } }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt;
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        if (p.u !== undefined) { p.u += (p.vu + Math.sin(p.t * 3 + p.ph) * 0.05) * dt; p.v += p.vv * dt; }
      }
    },
    // cx, cy：力士のまん中（px）・h：力士の高さ（px）・alpha：全体のこさ
    draw(ctx, cx, cy, h, alpha = 1) {
      ctx.save();
      ctx.lineCap = 'round';
      for (const p of parts) {
        const age = p.t / p.life, fade = Math.min(1, p.t / 0.15) * (1 - age * age);
        ctx.globalAlpha = alpha * fade;
        if (p.boltPts) {
          ctx.strokeStyle = A.color;
          ctx.lineJoin = 'miter';
          for (const [w, a] of [[0.06, 0.3], [0.024, 1]]) {
            ctx.globalAlpha = alpha * a * (1 - age);
            ctx.lineWidth = w * h;
            ctx.beginPath();
            p.boltPts.forEach(([u, v], i) => { const x = cx + u * h, y = cy + v * h; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
            ctx.stroke();
          }
          continue;
        }
        const k = A.kind, x = cx + (p.u || 0) * h, y = cy + (p.v || 0) * h;
        if (k === 'wisp') {
          ctx.strokeStyle = A.color;
          ctx.globalAlpha = alpha * fade * 0.55;
          ctx.lineWidth = h * 0.06 * (1 - age * 0.5);
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.quadraticCurveTo(x + Math.sin(p.t * 4 + p.ph) * h * 0.05, y - h * 0.06, x + Math.sin(p.t * 3 + p.ph) * h * 0.02, y - h * 0.12);
          ctx.stroke();
        } else if (k === 'petal') {
          ctx.fillStyle = A.color;
          ctx.save(); ctx.translate(x, y); ctx.rotate(p.a + p.t * 2);
          ctx.beginPath(); ctx.ellipse(0, 0, h * 0.045, h * 0.026, 0, 0, Math.PI * 2); ctx.fill();
          ctx.restore();
        } else if (k === 'confetti') {
          ctx.fillStyle = p.c;
          ctx.save(); ctx.translate(x, y); ctx.rotate(p.a); ctx.scale(1, Math.cos(p.t * 8 + p.ph));
          ctx.fillRect(-h * 0.024, -h * 0.015, h * 0.048, h * 0.03);
          ctx.restore();
        } else if (k === 'spark' || k === 'bolt') {
          ctx.fillStyle = p.c;
          const s = h * 0.022;
          ctx.fillRect(x - s / 2, y - s / 2, s, s);
        } else if (k === 'wind') {
          ctx.strokeStyle = A.color;
          ctx.globalAlpha = alpha * Math.sin(age * Math.PI) * 0.55;
          ctx.lineWidth = h * 0.018;
          const a = p.a0 + p.dir * age * 1.6;
          ctx.beginPath(); ctx.ellipse(cx, cy, p.r * h * 0.85, p.r * h, 0, a, a + p.dir * 0.9, p.dir < 0); ctx.stroke();
        } else if (k === 'gold') {
          if (p.leaf) {
            ctx.fillStyle = '#D4B256';
            ctx.save(); ctx.translate(x, y); ctx.rotate(p.a + p.t * 1.5); ctx.scale(1, Math.cos(p.t * 5 + p.ph));
            ctx.fillRect(-h * 0.03, -h * 0.03, h * 0.06, h * 0.06);
            ctx.restore();
          } else if (p.star) {   // きらっ（4本の短い線）
            ctx.strokeStyle = '#F0D98C';
            ctx.lineWidth = h * 0.012;
            const s = h * 0.06 * Math.sin(age * Math.PI);
            ctx.beginPath(); ctx.moveTo(x - s, y); ctx.lineTo(x + s, y); ctx.moveTo(x, y - s); ctx.lineTo(x, y + s); ctx.stroke();
          } else {
            ctx.fillStyle = p.c;
            const s = h * 0.018;
            ctx.fillRect(x - s / 2, y - s / 2, s, s);
          }
        }
      }
      ctx.restore();
    },
  };
}

// 画面の上の小さな見本（編集・福箱）：canvas に、まん中の力士のまわりの気をまわしつづける。stop() で止める
export function auraPreview(cv, id, box) {
  const a = createAura(id);
  if (!a) { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); return { stop() {} }; }
  let raf = 0, last = performance.now(), on = true;
  const loop = (now) => {
    if (!on) return;
    if (!cv.isConnected || cv.closest('[hidden]')) { on = false; return; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    a.step((now - last) / 1000);
    last = now;
    const b = box();   // { x, y, h }：力士のまん中と高さ（canvas の中の px）
    if (b) a.draw(g, b.x, b.y, b.h);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return { stop() { on = false; cancelAnimationFrame(raf); const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); } };
}
