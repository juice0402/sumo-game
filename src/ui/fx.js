// 取組の上にのせる墨と筆の演出（2Dのキャンバス）。見た目だけで、物理と勝敗にはさわらない。
// 位置は「描く座標」（土俵の上の面が y=0・z=0 の面）で持ち、毎こま stage.project で画面に写す。
import { COL, rand, setupCanvas } from './ink.js';
import { LOOK } from '../data/look.js';

export function createFx(cv) {
  let lay = null;
  let drops = [], bursts = [];

  function resize() { lay = setupCanvas(cv); }

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
  function tonMarks(ctx, stage, P, k, color) {
    if (k <= 0.05) return;
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

  // 1こま描く。o = { stage, P, sweep（0〜1 か null）, ton（0〜1）, mark（{x,y} か null）}
  function draw(o) {
    if (!lay) resize();
    const { ctx, W, H, dpr } = lay;
    ctx.clearRect(0, 0, W, H);
    const st = o.stage;
    tonMarks(ctx, st, o.P, o.ton, st.look().tonMark);
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
    // 体がついた所（朱の輪）
    if (o.mark) {
      const q = st.project(o.mark.x, o.mark.y);
      ctx.strokeStyle = COL.shu;
      ctx.lineWidth = 3 * dpr;
      ctx.beginPath(); ctx.arc(q[0] * dpr, q[1] * dpr, 11 * dpr, 0, Math.PI * 2); ctx.stroke();
    }
    if (o.sweep !== null && o.sweep < 1) inkSweep(ctx, W, H, o.sweep);
  }

  return { resize, splash, burst, step, clear, draw };
}
