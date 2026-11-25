// 取組の画面（2.5D）。物理は記録してから再生するだけ＝演出（旋回・スロー・ヒットストップ・墨）は勝敗にさわらない。
// 流れ：墨が横切る → 土俵を1周 → 少し上からの真横で止まる → 静寂 → 拍子木と「勝負」→ そのまま取組 → 決まり手
import { T } from '../data/text.js';
import { LOOK } from '../data/look.js';
import { createBout, toLocal } from '../sim/battle.js';
import { decideKimarite } from '../data/kimarite.js';
import { createStage } from './stage3d.js';
import { createFx } from './fx.js';
import { playSfx } from './sound.js';

const TAU = Math.PI * 2;
// 一定の速さでまわり、最後だけゆっくり止まる（0〜1 → 0〜1）
function orbitEase(u) {
  const a = LOOK.orbitSlowFrom, norm = a + (1 - a) / 2;
  if (u <= a) return u / norm;
  const v = u - a;
  return (a + v - (v * v) / (2 * (1 - a))) / norm;
}
const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const mix = (a, b, t) => a + (b - a) * t;

export function initBout({ getDrive, getShort, onFoe, onRecut }) {
  const gl = document.getElementById('bout-gl');
  const cv = document.getElementById('bout-cv');
  const names = document.getElementById('names');
  const cutin = document.getElementById('cutin');
  const resEl = document.getElementById('result');
  const stamp = document.getElementById('r-big');
  const kimaEl = document.getElementById('r-kima');
  const kindEl = document.getElementById('r-kind');
  const fx = createFx(cv);
  let stage = null, st = null, raf = 0;

  function stop() {
    cancelAnimationFrame(raf);
    if (st && st.bout) st.bout.free();
    st = null;
    cutin.classList.remove('go');
    names.classList.remove('in');
    fx.clear();
  }

  function layout() {
    if (stage) stage.resize();
    fx.resize();
  }

  function start(me, foe, seed) {
    stop();
    resEl.hidden = true;
    const bout = createBout({ a: me, b: foe.pts, seed, phys: { drive: getDrive() }, record: true });
    if (!stage) stage = createStage(gl, bout.phys);
    if (!stage) {
      bout.free();
      const el = document.getElementById('err');
      el.textContent = T.noGL;
      el.hidden = false;
      return;
    }
    document.getElementById('n-a').textContent = T.you;
    document.getElementById('n-b').textContent = foe.name;
    const la = toLocal(me, 1, bout.phys), lb = toLocal(foe.pts, -1, bout.phys);
    stage.setFighters(la, lb);
    const short = !!getShort();
    const orbitStart = LOOK.inkSec + LOOK.orbitDelay;
    const orbitEnd = orbitStart + (short ? 0 : LOOK.orbitSec);
    const goAt = orbitEnd + (short ? 0.1 : LOOK.hush);
    st = {
      me, foe, seed, bout, phys: bout.phys, rec: bout.rec, la, lb, short,
      orbitStart, orbitEnd, goAt, playAt: goAt + LOOK.goLead,
      t: 0, last: performance.now(), play: false, idx: 0, hold: 0, endHold: 0,
      firstHit: true, prevTouch: 0, prevTon: 0, ended: false, shown: false, went: false, kima: null,
    };
    layout();
    stage.setFrame(st.rec.f, 0);
    raf = requestAnimationFrame(frame);
  }

  // 旋回中にタップしたら飛ばす
  function skip() {
    if (!st || st.play || st.t >= st.orbitEnd) return;
    st.t = st.orbitEnd;
  }

  function camera(s) {
    if (s.t < s.orbitEnd) {
      const u = Math.max(0, (s.t - s.orbitStart) / LOOK.orbitSec);
      const d = smooth(0.5, 1, u);
      stage.view(-TAU * (1 - orbitEase(Math.min(1, u))), mix(LOOK.orbitElev, LOOK.elev, d), mix(LOOK.orbitFar, 1, d));
    } else {
      stage.view(0, LOOK.elev, 1);
    }
  }

  function frame(now) {
    if (!st) return;
    const s = st, P = s.phys;
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
    // 立ち合いまで
    if (!s.went && s.t >= s.orbitStart) names.classList.add('in');
    if (!s.went && s.t >= s.goAt) {
      s.went = true;
      cutin.classList.add('go');
      playSfx('hyoshigi', { vol: 0.8 });
    }
    if (s.went && s.t > s.goAt + 1.0) cutin.classList.remove('go');
    if (!s.play) {
      if (s.t >= s.playAt && lastIdx > s.bout.settleSteps) { s.play = true; s.idx = s.bout.settleSteps; }
    } else if (s.hold > 0) {
      s.hold -= fdt;
    } else {
      let rate = 1;
      if (done && s.idx > lastIdx - LOOK.slowFrom / P.dt) rate = LOOK.slowRate;
      s.idx = Math.min(lastIdx, s.idx + (fdt / P.dt) * rate);
      if (done && s.idx >= lastIdx) {
        if (!s.ended) ending();
        s.endHold += fdt;
        if (s.endHold > (s.short ? LOOK.shortEndHold : LOOK.endHold) && !s.shown) showResult();
      }
    }
    const f = s.rec.f, o = Math.floor(s.idx) * 8;
    stage.setFrame(f, o);
    const ry = f[o + 6];
    // ぶつかった瞬間：墨のしぶき・集中線・太鼓・ヒットストップ（最初の1回だけ強く）
    const touch = f[o + 7];
    if (touch && !s.prevTouch && s.play) {
      const mx = (f[o] + f[o + 3]) / 2, my = (f[o + 1] + f[o + 4]) / 2 - ry + 0.45;
      fx.splash(mx, my, s.firstHit ? 1 : 0.3);
      if (s.firstHit) { fx.burst(mx, my, 1); s.hold = LOOK.hitStop; playSfx('taiko', { vol: 0.85 }); }
      s.firstHit = false;
    }
    s.prevTouch = touch;
    // トン：土俵が上がりはじめたら小さく鳴らす
    const ton = Math.min(1, ry / (P.tapAmp * 0.6));
    if (s.play && !s.ended && ton > 0.3 && s.prevTon <= 0.3) playSfx('ton', { vol: 0.22 });
    s.prevTon = ton;
    camera(s);
    fx.step(fdt);
    stage.render();
    const r = s.bout.result;
    const mark = s.ended && r.kind === 'touch' && r.at ? { x: r.at.x, y: r.at.y - ry } : null;
    fx.draw({ stage, P, ton: s.play ? ton : 0, mark, sweep: s.t < LOOK.inkSec ? s.t / LOOK.inkSec : null });
    raf = requestAnimationFrame(frame);
  }

  // 決着の瞬間：負けた方に大きな墨・太鼓
  function ending() {
    const s = st;
    s.ended = true;
    const r = s.bout.result, f = s.rec.f, o = (s.rec.n - 1) * 8, ry = f[o + 6];
    s.kima = decideKimarite(s.bout, s.la, s.lb);
    const i = r.loser === 'b' ? 1 : 0;
    const x = r.loser ? f[o + i * 3] : (f[o] + f[o + 3]) / 2;
    const y = Math.max(0.15, (r.loser ? f[o + i * 3 + 1] : f[o + 1]) - ry + 0.3);
    fx.splash(x, y, 1.4, r.loser === 'b' ? 1 : r.loser === 'a' ? -1 : 0);
    playSfx('taiko-end', { vol: 0.9 });
    playSfx('sumi', { vol: 0.6 });
  }

  function showResult() {
    const s = st;
    s.shown = true;
    const r = s.bout.result;
    const name = (side) => (side === 'a' ? T.you : s.foe.name);
    stamp.className = 'stamp brush ' + (r.winner === 'a' ? 'win' : r.winner === 'b' ? 'lose' : 'draw');
    stamp.textContent = r.winner === 'a' ? T.win : r.winner === 'b' ? T.lose : T.draw;
    kimaEl.textContent = (s.kima && T.kimarite[s.kima]) || '';
    kindEl.textContent = T.kind[r.kind](r.loser ? name(r.loser) : '');
    resEl.hidden = false;
  }

  gl.addEventListener('pointerdown', skip);
  cv.addEventListener('pointerdown', skip);
  document.getElementById('b-again').addEventListener('click', () => { if (st) start(st.me, st.foe, st.seed + 1); });
  document.getElementById('b-replay').addEventListener('click', () => { if (st) start(st.me, st.foe, st.seed); });
  document.getElementById('b-foe').addEventListener('click', () => { stop(); onFoe(); });
  document.getElementById('b-recut').addEventListener('click', () => { stop(); onRecut(); });
  window.addEventListener('resize', () => { if (st) layout(); });

  return { start, stop };
}
