// 取組の画面（2.5D）。物理は記録してから再生するだけ＝演出（旋回・スロー・ヒットストップ・墨）は勝敗にさわらない。
// 流れ：墨が横切る → 土俵を1周 → 少し上からの真横で止まる → 静寂 → 拍子木と「勝負」→ そのまま取組 → 決まり手
import { T } from '../data/text.js';
import { LOOK } from '../data/look.js';
import { STAGES } from '../data/stages.js';
import { createBout, toLocal } from '../sim/battle.js';
import { decideKimarite } from '../data/kimarite.js';
import { createStage } from './stage3d.js';
import { createFx } from './fx.js';
import { playSfx } from './sound.js';

const TAU = Math.PI * 2;
// 一定の速さでまわり、最後だけゆっくり止まる（0〜1 → 0〜1）
// 止まるときの速さは smoothstep で 1→0（減りはじめと止まる瞬間にカクッとしない）。∫(1−s) = x − x³ + x⁴/2
function orbitEase(u) {
  const a = LOOK.orbitSlowFrom, norm = a + (1 - a) / 2;
  if (u <= a) return u / norm;
  const x = (u - a) / (1 - a), x3 = x * x * x;
  return (a + (1 - a) * (x - x3 + (x3 * x) / 2)) / norm;
}
// はじめと終わりがとくにゆるやか（降りてくるカメラ用）
const smoother = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * t * (t * (6 * t - 15) + 10); };
const mix = (a, b, t) => a + (b - a) * t;

export function initBout({ getDrive, getShort, onFoe, onRecut, onNext, onHome }) {
  const gl = document.getElementById('bout-gl');
  const cv = document.getElementById('bout-cv');
  const names = document.getElementById('names');
  const cutin = document.getElementById('cutin');
  const resEl = document.getElementById('result');
  const stamp = document.getElementById('r-big');
  const kimaEl = document.getElementById('r-kima');
  const kindEl = document.getElementById('r-kind');
  const gainEl = document.getElementById('r-gain');
  const fx = createFx(cv);
  let stage = null, st = null, raf = 0, curLook = null;
  const btn = (id) => document.getElementById(id);
  // 名前：小さい称号の下に四股名
  function setName(el, who) {
    el.textContent = '';
    if (who.sub) { const sm = document.createElement('small'); sm.textContent = who.sub; el.appendChild(sm); }
    el.appendChild(document.createTextNode(who.name));
  }

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
    if (st && st.shown) placeKind();
  }

  // 決着の説明は、紙の箱の横の面（手前）のまん中に墨で書く
  function placeKind() {
    const P = st.phys, h = P.ringHalf;
    const c = stage.project(0, -P.ringDepth / 2, h), l = stage.project(-h, 0, h), r = stage.project(h, 0, h);
    kindEl.style.left = c[0] + 'px';
    kindEl.style.top = c[1] + 'px';
    kindEl.style.maxWidth = Math.max(120, (r[0] - l[0]) * 0.86) + 'px';
    kindEl.style.color = stage.look().side.text || '';
  }

  // opt：{ mode（keiko・jungyo・honbasho）, stage（data/stages.js の id）, a・b（{ name, sub }）, onResult(結果)→ひとこと, replay }
  function start(me, foe, seed, opt = {}) {
    stop();
    resEl.hidden = true;
    gainEl.hidden = true;
    const S = STAGES[opt.stage] || STAGES.hyojun;
    const bout = createBout({ a: me, b: foe.pts, seed, phys: Object.assign({ drive: getDrive() }, S.phys), record: true });
    if (!stage) { stage = createStage(gl, bout.phys); curLook = 'kami'; }
    if (!stage) {
      bout.free();
      const el = document.getElementById('err');
      el.textContent = T.noGL;
      el.hidden = false;
      return;
    }
    if (curLook !== S.look) { stage.setDohyo(S.look); curLook = S.look; }
    const a = opt.a || { name: T.you }, b = opt.b || { name: foe.name };
    setName(document.getElementById('n-a'), a);
    setName(document.getElementById('n-b'), b);
    const match = opt.mode === 'jungyo' || opt.mode === 'honbasho';
    btn('b-again').hidden = match; btn('b-foe').hidden = match; btn('b-recut').hidden = match;
    btn('b-next').hidden = !match;
    const la = toLocal(me, 1, bout.phys), lb = toLocal(foe.pts, -1, bout.phys);
    stage.setFighters(la, lb);
    const short = !!getShort();
    const orbitStart = LOOK.inkSec + LOOK.orbitDelay;
    const orbitEnd = orbitStart + (short ? 0 : LOOK.orbitSec + LOOK.descendSec);
    const goAt = orbitEnd + (short ? 0.1 : LOOK.hush);
    st = {
      me, foe, seed, opt, a, b, bout, phys: bout.phys, rec: bout.rec, la, lb, short,
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
      // 1周まわって止まる → そのあとも少しかけて、戦うときの高さへ降りてくる
      const tt = Math.max(0, s.t - s.orbitStart);
      const u = Math.min(1, tt / LOOK.orbitSec);
      const d = smoother(LOOK.orbitSec * LOOK.descendFrom, LOOK.orbitSec + LOOK.descendSec, tt);
      stage.view(-TAU * (1 - orbitEase(u)), mix(LOOK.orbitElev, LOOK.elev, d), mix(LOOK.orbitFar, 1, d));
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
    // 物理を先に進めておく。旋回中は 1こま 3ms まで（カメラがカクつかないように）、そのあとは 7ms まで。
    // 2歩ずつ時間を見る（20歩まとめると、スマホで1こまが長くなって旋回がとぶ）
    const t0 = performance.now();
    const budget = s.t < s.orbitEnd ? 3 : 7;
    const ahead = Math.max(s.idx, s.bout.settleSteps) + 240;
    while (!s.bout.result.kind && s.bout.step < ahead && performance.now() - t0 < budget) {
      s.bout.stepOnce();
      if (!s.bout.result.kind) s.bout.stepOnce();
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
    const mark = s.ended && r.kind === 'touch' && r.at ? { x: r.at.x, y: r.at.y - ry, t: s.t - s.endedAt } : null;
    fx.draw({ stage, P, ton: s.play ? ton : 0, mark, sweep: s.t < LOOK.inkSec ? s.t / LOOK.inkSec : null });
    raf = requestAnimationFrame(frame);
  }

  // 決着の瞬間：負けた方に大きな墨・太鼓
  function ending() {
    const s = st;
    s.ended = true;
    s.endedAt = s.t;
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
    const name = (side) => (side === 'a' ? s.a.name : s.b.name);
    stamp.className = 'stamp brush ' + (r.winner === 'a' ? 'win' : r.winner === 'b' ? 'lose' : 'draw');
    stamp.textContent = r.winner === 'a' ? T.win : r.winner === 'b' ? T.lose : T.draw;
    kimaEl.textContent = (s.kima && T.kimarite[s.kima]) || '';
    kindEl.textContent = T.kind[r.kind](r.loser ? name(r.loser) : '');
    placeKind();
    // 巡業・本場所：番付や戦績のひとこと（もう一度見るときは、はじめの結果のまま・数えなおさない）
    if (s.opt.onResult && !s.opt.replay) s.opt.gain = s.opt.onResult(r) || '';
    gainEl.textContent = s.opt.gain || '';
    gainEl.hidden = !s.opt.gain;
    resEl.hidden = false;
  }

  gl.addEventListener('pointerdown', skip);
  cv.addEventListener('pointerdown', skip);
  document.getElementById('b-again').addEventListener('click', () => { if (st) start(st.me, st.foe, st.seed + 1, st.opt); });
  document.getElementById('b-replay').addEventListener('click', () => { if (st) start(st.me, st.foe, st.seed, Object.assign({}, st.opt, { replay: true })); });
  document.getElementById('b-next').addEventListener('click', () => { const m = st && st.opt.mode; stop(); if (onNext) onNext(m); });
  document.getElementById('b-home').addEventListener('click', () => { stop(); if (onHome) onHome(); });
  document.getElementById('b-foe').addEventListener('click', () => { stop(); onFoe(); });
  document.getElementById('b-recut').addEventListener('click', () => { stop(); onRecut(); });
  window.addEventListener('resize', () => { if (st) layout(); });

  return { start, stop };
}
