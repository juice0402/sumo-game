// オーラ（気）を描く（11/26 福箱）。取組・編集・福箱の見本で使う。見た目だけ＝物理にさわらない。
// 粒は力士の高さ h を1とした「力士のまわりの位置」で持つ（力士が動いてもついていく）。光る輪やグラデーションは使わない。
// 粒の絵は Codex の部品（A・assets/art/ki-*・福箱の fx-wisp・fx-leaf・fx-glint）。読みこむ前は、コードの線と四角（C）で描く。
import { AURAS } from '../data/auras.js';
import { artImages } from './art.js';

// 気の粒の絵（はじめて気を描くときに読む）
const KI_IDS = ['ki-petal1', 'ki-petal2', 'ki-petal3', 'ki-conf-shu', 'ki-conf-ai', 'ki-conf-kin', 'ki-conf-midori', 'ki-conf-kinari',
  'ki-ember1', 'ki-ember2', 'ki-bolt1', 'ki-bolt2', 'ki-wind1', 'ki-wind2', 'ki-gold', 'ki-steam', 'fx-wisp', 'fx-leaf1', 'fx-leaf2', 'fx-glint'];
const CONF = ['ki-conf-shu', 'ki-conf-ai', 'ki-conf-kin', 'ki-conf-midori', 'ki-conf-kinari'];   // data/auras.js の紙吹雪の colors と同じ順
let KI = null, kiLoad = null;
function loadKi() { if (!kiLoad) kiLoad = artImages(KI_IDS).then((m) => { KI = m; }).catch(() => { kiLoad = null; }); }
// 白い絵を、ひとつの色にそめる（墨のけむり）。色ごとに1回だけ作る
const tinted = {};
function tint(id, color) {
  const key = id + color;
  if (tinted[key]) return tinted[key];
  const im = KI[id], c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return (tinted[key] = c);
}
// 絵を、まん中 (x, y)・高さ hh（px）・回転 rot で描く
function sprite(ctx, im, x, y, hh, rot = 0, sx = 1) {
  const w = (hh * im.width) / im.height;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sx !== 1) ctx.scale(sx, 1);
  ctx.drawImage(im, -w / 2, -hh / 2, w, hh);
  ctx.restore();
}

const MAX = 90;
const R = Math.random;   // 見た目だけなので Math.random でよい

export function createAura(id) {
  const A = AURAS[id];
  if (!A || !A.kind) return null;
  loadKi();
  const parts = [];
  let acc = 0, boltIn = 0.3;
  const rate = { wisp: 14, petal: 10, confetti: 12, spark: 22, wind: 6, gold: 18, bolt: 10 }[A.kind] || 12;

  function spawn() {
    const k = A.kind, p = { t: 0, ph: R() * 6.28, pick: R() };   // pick：どの絵を使うか（見た目だけ）
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
    const s = R() < 0.5 ? -1 : 1, pts = [], su = s * (0.25 + R() * 0.15);
    let u = su, v = -0.55;
    pts.push([u, v]);
    for (let i = 0; i < 5; i++) { u += s * (0.02 + R() * 0.05) * (i % 2 ? -1 : 1.6); v += 0.16 + R() * 0.05; pts.push([u, v]); }
    parts.push({ boltPts: pts, su, s, t: 0, life: 0.22 });
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
        if (KI && drawKi(ctx, p, age, fade, cx, cy, h, alpha)) continue;
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

  // Codex の粒の絵で描く。描いたら true
  function drawKi(ctx, p, age, fade, cx, cy, h, alpha) {
    const k = A.kind;
    if (p.boltPts) {   // 筆の稲妻：上から下へ一筆（重ねて明るく）
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * (1 - age);
      sprite(ctx, KI['ki-bolt1'], cx + (p.su + p.s * 0.04) * h, cy + 0.0 * h, h * 0.95, p.s * 0.08, p.s);
      ctx.globalCompositeOperation = 'source-over';
      return true;
    }
    const x = cx + (p.u || 0) * h, y = cy + (p.v || 0) * h;
    if (k === 'wisp') {
      const white = A.color === '#EEE9DE';
      const id = p.pick < 0.55 ? 'fx-wisp' : 'ki-steam';
      const im = white ? KI[id] : tint(id, A.color);
      ctx.globalAlpha = alpha * fade * (white ? 0.55 : 0.7);
      sprite(ctx, im, x, y - h * 0.06, h * (id === 'fx-wisp' ? 0.26 : 0.13) * (0.8 + age * 0.5), Math.sin(p.ph) * 0.3);
    } else if (k === 'petal') {
      sprite(ctx, KI['ki-petal' + (1 + Math.floor(p.pick * 3))], x, y, h * 0.075, p.a + p.t * 2, Math.cos(p.t * 4 + p.ph));
    } else if (k === 'confetti') {
      const ci = Math.max(0, (A.colors || []).indexOf(p.c));
      sprite(ctx, KI[CONF[ci] || CONF[0]], x, y, h * 0.055, p.a + p.t * 1.5, Math.cos(p.t * 8 + p.ph));
    } else if (k === 'spark' || k === 'bolt') {
      ctx.globalCompositeOperation = 'lighter';
      if (k === 'bolt') sprite(ctx, KI['ki-bolt2'], x, y, h * 0.12, p.ph, p.pick < 0.5 ? -1 : 1);
      else sprite(ctx, KI[p.pick < 0.35 ? 'ki-ember1' : 'ki-ember2'], x, y, h * (p.pick < 0.35 ? 0.07 : 0.035), Math.atan2(p.vv, p.vu) + Math.PI / 2);
      ctx.globalCompositeOperation = 'source-over';
    } else if (k === 'wind') {   // 力士のまわりをまわる筆の風の筋
      const a = p.a0 + p.dir * age * 1.6;
      ctx.globalAlpha = alpha * Math.sin(age * Math.PI) * 0.7;
      sprite(ctx, KI[p.pick < 0.5 ? 'ki-wind1' : 'ki-wind2'], cx + Math.cos(a) * p.r * h * 0.85, cy + Math.sin(a) * p.r * h, h * 0.2, a + (p.dir * Math.PI) / 2, p.dir);
    } else if (k === 'gold') {
      if (p.leaf) sprite(ctx, KI[p.pick < 0.6 ? 'fx-leaf1' : 'fx-leaf2'], x, y, h * 0.08, p.a + p.t * 1.5, Math.cos(p.t * 5 + p.ph));
      else {
        ctx.globalCompositeOperation = 'lighter';
        if (p.star) { ctx.globalAlpha = alpha * Math.sin(age * Math.PI); sprite(ctx, KI['fx-glint'], x, y, h * 0.14 * Math.sin(age * Math.PI)); }
        else { ctx.globalAlpha = alpha * fade * 0.8; sprite(ctx, KI['ki-gold'], x, y, h * 0.07, p.ph); }
        ctx.globalCompositeOperation = 'source-over';
      }
    } else return false;
    return true;
  }
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
