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
import { createAura } from './aura.js';
import { drawShapeThumb } from './pick.js';

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
  const sname = document.getElementById('stagename');
  const resEl = document.getElementById('result');
  const stamp = document.getElementById('r-big');
  const kimaEl = document.getElementById('r-kima');
  const kindEl = document.getElementById('r-kind');
  const gainEl = document.getElementById('r-gain');
  const ttlEl = document.getElementById('r-title');
  const vsEl = document.getElementById('vs');
  // 本場所のカットイン：板の中を流れる線（はじめに1回だけ作る・左右で同じ形をくり返してつなぐ）
  for (const el of vsEl.querySelectorAll('.vs-lines')) {
    let lines = '';
    for (let i = 0; i < 30; i++) {
      const y = (Math.random() * 100).toFixed(1), x = Math.random() * 100, len = 12 + Math.random() * 46;
      const w = (0.6 + Math.random() * 1.6).toFixed(1), o = (0.05 + Math.random() * 0.16).toFixed(2);
      for (const dx of [0, 100]) lines += `<line x1="${(x + dx).toFixed(1)}" y1="${y}" x2="${(x + dx + len).toFixed(1)}" y2="${y}" stroke-width="${w}" opacity="${o}"/>`;
    }
    el.innerHTML = `<svg viewBox="0 0 200 100" preserveAspectRatio="none">${lines}</svg>`;
  }
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
    vsEl.classList.remove('in', 'out', 'short');
    ttlEl.classList.remove('in');
    sname.classList.remove('in', 'out');
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
    // 番付・戦績のひとことは、決まりの文のすぐ下に（同じ土俵の横の面・同じ色。11/26 しょーくん「土俵の線とかぶって見づらい」）
    gainEl.style.left = c[0] + 'px';
    gainEl.style.top = c[1] + 'px';
    gainEl.style.color = kindEl.style.color;
  }

  // opt：{ mode（keiko・jungyo・honbasho）, stage（data/stages.js の id）, a・b（{ name, sub, rank }）,
  //        onResult(結果, 決まり手)→ひとこと か { text, titles（新しく手に入れた称号の字） },
  //        look（土俵スキン・本場所）, papers・auras（[a, b] の紙質と気・見た目だけ） }
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
    const look = opt.look || S.look;   // 本場所は、えらんだ土俵スキン（見た目だけ・物理は S.phys のまま）
    if (curLook !== look) { stage.setDohyo(look); curLook = look; }
    const a = opt.a || { name: T.you }, b = opt.b || { name: foe.name };
    setName(document.getElementById('n-a'), a);
    setName(document.getElementById('n-b'), b);
    // 上の名前は、左右で同じ大きさ（長いほうに合わせて、半分の幅に収める・11/26 しょーくん「見切れる」「統一感」）
    const nLen = (w) => Array.from(w.name || '').length;
    names.style.setProperty('--n', String(Math.max(4, nLen(a), nLen(b))));
    // 結果のボタン：稽古＝もう一番・相手をかえる・切り直す／巡業・本場所＝次の取組／初土俵＝四股名をさずかる だけ
    const keiko = !opt.mode || opt.mode === 'keiko';
    btn('b-again').hidden = !keiko; btn('b-foe').hidden = !keiko; btn('b-recut').hidden = !keiko;
    btn('b-next').hidden = keiko;
    btn('b-next').textContent = opt.nextLabel || T.nextBout;
    btn('b-home').hidden = opt.mode === 'shodohyo';
    const la = toLocal(me, 1, bout.phys), lb = toLocal(foe.pts, -1, bout.phys);
    stage.setFighters(la, lb, opt.papers || []);
    // 気（オーラ・見た目だけ）：力士の中の座標での、まん中と高さ
    const boxOf = (ol) => {
      let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
      for (const p of ol.outline) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
      return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, h: y1 - y0 };
    };
    const auras = (opt.auras || []).map((id) => createAura(id));
    const short = !!getShort();
    const orbitStart = LOOK.inkSec + LOOK.orbitDelay;
    const orbitEnd = orbitStart + (short ? 0 : LOOK.orbitSec + LOOK.descendSec);
    // 本場所：はじめに対戦のカットイン（11/26 しょーくん「格闘ゲームみたいなスピード感」）。旋回のはじめにかぶせる。
    // 演出を短くでは旋回がないので、カットインのぶんだけ「勝負」をおくらせる
    const vs = opt.mode === 'honbasho';
    const vsAt = orbitStart + 0.05, vsLen = short ? LOOK.vsShortSec : LOOK.vsSec;
    const goAt = vs && short ? vsAt + vsLen + 0.1 : orbitEnd + (short ? 0.1 : LOOK.hush);
    if (vs) setVs(me, foe.pts, a, b, opt.papers || [], short);
    // 巡業：旋回のあいだに、どの土俵かを右に縦書きで（11/26 しょーくん）。演出を短くでは、立ち合いのあと少しだけ
    const sn = opt.mode === 'jungyo';
    if (sn) {
      document.getElementById('sn-mode').textContent = T.mode.jungyo;
      document.getElementById('sn-name').textContent = S.name;
      document.getElementById('sn-note').textContent = S.note;
    }
    st = {
      vs, vsAt, vsOutAt: vsAt + vsLen - (short ? 0.14 : 0.22), vsEnd: vsAt + vsLen, vsIn: false, vsOut: false, vsGone: false,
      sn, snAt: orbitStart + (short ? 0 : 0.35), snOutAt: short ? goAt + LOOK.goLead + 1.2 : orbitEnd - 0.45, snIn: false, snOut: false,
      me, foe, seed, opt, a, b, bout, phys: bout.phys, rec: bout.rec, la, lb, short,
      auras: auras.some(Boolean) ? auras : null, boxes: [boxOf(la), boxOf(lb)], outlines: [la.outline, lb.outline], idle3d: false,
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
    if (!st) return;
    if (st.vs && st.vsIn && !st.vsOut) { vsLeave(); if (st.short) st.t = Math.max(st.t, st.vsEnd - 0.1); }
    if (st.play || st.t >= st.orbitEnd) return;
    st.t = st.orbitEnd;
  }

  // 本場所のカットイン：名前・番付・称号を入れておく（絵は出す瞬間に描く＝見えないと大きさがはかれない）
  function setVs(me, foePts, a, b, papers, short) {
    // 東西の名前は同じ大きさ（長いほうに合わせる）
    const n = String(Math.max(4, Array.from(a.name).length, Array.from(b.name).length));
    const fill = (side, who) => {
      const el = vsEl.querySelector('.vs-' + side);
      el.querySelector('small').textContent = [who.rank, who.sub].filter(Boolean).join('　');
      const nb = el.querySelector('b');
      nb.textContent = who.name;
      nb.style.setProperty('--n', n);
    };
    fill('a', a);
    fill('b', b);
    vsEl.classList.toggle('short', short);
    vsEl._draw = () => {
      const cvs = vsEl.querySelectorAll('canvas');
      drawShapeThumb(cvs[0], me, false, papers[0]);
      drawShapeThumb(cvs[1], foePts, true, papers[1]);   // 相手は左向き
    };
  }
  function vsShow() {
    const s = st;
    s.vsIn = true;
    vsEl.classList.remove('out');
    // 絵は動きを止めた形の大きさで描く（傾けたまま測ると、まわりの四角が大きくなって絵がのびる）→ 動きをはじめる
    vsEl.classList.add('in', 'measure');
    if (vsEl._draw) vsEl._draw();
    vsFit();
    void vsEl.offsetWidth;
    vsEl.classList.remove('measure');
    // 東がシュッ → 西がシュッ →「対」がドン
    const k = s.short ? 0.6 : 1;
    playSfx('kami', { vol: 0.7, rate: 1.5 });
    setTimeout(() => { if (st === s) playSfx('kami', { vol: 0.7, rate: 1.3 }); }, 100 * k);
    setTimeout(() => { if (st === s) { playSfx('fude', { vol: 0.4, rate: 1.2 }); } }, 180 * k);
    setTimeout(() => { if (st === s && !s.vsOut) { playSfx('taiko', { vol: 0.95, rate: 0.75 }); playSfx('hyoshigi', { vol: 0.35, rate: 1.4 }); } }, 330 * k);
  }
  // 東西の名前が斜めの切れ目にかからないように、実際の字の高さをはかって小さくする（11/26 しょーくん「上の名前の下が切れる」）。
  // 切れ目は左ほど低いので、東（上）は名前の左のはしで、西（下）は名前の右のはしでくらべる。東西は同じ大きさのまま
  function vsFit() {
    const box = vsEl.getBoundingClientRect();
    if (!box.width || !box.height) return;
    const cut = (x) => box.top + box.height * (0.58 - 0.16 * (x - box.left) / box.width);   // 斜めの切れ目（CSS の clip-path と同じ 58%→42%）
    const na = vsEl.querySelector('.vs-a b'), nb = vsEl.querySelector('.vs-b b');
    na.style.fontSize = nb.style.fontSize = '';
    const ra = na.getBoundingClientRect(), rb = nb.getBoundingClientRect();
    const gap = 14;
    const sa = ra.height > 0 ? Math.min(1, (cut(ra.left) - gap - ra.top) / ra.height) : 1;
    const sb = rb.height > 0 ? Math.min(1, (rb.bottom - (cut(rb.right) + gap)) / rb.height) : 1;
    const s = Math.max(0.3, Math.min(sa, sb));
    if (s < 1) {
      const px = parseFloat(getComputedStyle(na).fontSize) * s;
      na.style.fontSize = nb.style.fontSize = px.toFixed(1) + 'px';
    }
  }
  function vsLeave() {
    st.vsOut = true;
    vsEl.classList.add('out');
    playSfx('kami', { vol: 0.45, rate: 1.8 });
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
    if (!s.went && s.t >= (s.vs ? s.vsEnd : s.orbitStart)) names.classList.add('in');
    if (s.vs) {
      if (!s.vsIn && s.t >= s.vsAt) { if (s.t < s.vsOutAt) vsShow(); else { s.vsIn = s.vsOut = true; } }
      if (s.vsIn && !s.vsOut && s.t >= s.vsOutAt) vsLeave();
      if (!s.vsGone && s.t >= s.vsEnd + 0.1) { s.vsGone = true; vsEl.classList.remove('in', 'out'); }
    }
    if (s.sn && !s.snIn && s.t >= s.snAt) {
      s.snIn = true;
      if (s.t < s.snOutAt) {   // タップで旋回を飛ばしたあとなら出さない
        sname.classList.add('in');
        playSfx('taiko', { vol: 0.5, rate: 0.8 });
        playSfx('fude', { vol: 0.35, rate: 1.0 });
      } else s.snOut = true;
    }
    if (s.sn && !s.snOut && s.t >= s.snOutAt) { s.snOut = true; sname.classList.add('out'); }
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
    if (!s.idle3d) stage.render();   // 結果が出て動かなくなったら 3D は描かない（気だけ動かすとき）
    // 気：力士のまん中（まわっていても）を画面に写して、そのまわりに
    let auraDraw = null;
    if (s.auras && s.t > LOOK.inkSec) {
      auraDraw = [];
      for (let i = 0; i < 2; i++) {
        const au = s.auras[i];
        if (!au) continue;
        au.step(fdt);
        const bx = s.boxes[i], x = f[o + i * 3], y = f[o + i * 3 + 1] - ry, rz = f[o + i * 3 + 2], c = Math.cos(rz), sn = Math.sin(rz);
        const wx = x + bx.cx * c - bx.cy * sn, wy = y + bx.cx * sn + bx.cy * c;
        const q = stage.project(wx, wy), q2 = stage.project(wx, wy + bx.h / 2);
        // 紙の形を画面に写す（うしろの気の粒を、力士の形でかくす）
        const ol = s.outlines[i], poly = new Array(ol.length);
        for (let j = 0; j < ol.length; j++) { const p = ol[j]; poly[j] = stage.project(x + p[0] * c - p[1] * sn, y + p[0] * sn + p[1] * c); }
        auraDraw.push({ a: au, x: q[0], y: q[1], h: Math.hypot(q2[0] - q[0], q2[1] - q[1]) * 2, poly });
      }
    }
    const r = s.bout.result;
    // 朱の丸：体がついた所・俵の外にふれた所（どこで負けたかが見えるように）
    const mark = s.ended && (r.kind === 'touch' || r.kind === 'out') && r.at ? { x: r.at.x, y: r.at.y - ry, t: s.t - s.endedAt } : null;
    fx.draw({ stage, P, ton: s.play ? ton : 0, mark, sweep: s.t < LOOK.inkSec ? s.t / LOOK.inkSec : null, auras: auraDraw });
    // 結果が出て、もう何も動かない（しぶき・集中線・朱の丸を描き終えた）なら、描くのを休む（電池と熱のため・11/25）。
    // 画面の大きさが変わったら起こす（下の resize）。もう一度見る・もう一番は start からまた動く
    const idle = s.shown && !fx.busy() && s.t - s.endedAt > LOOK.ringSec + 0.1;
    if (idle && !auraDraw) { s.sleep = true; return; }
    s.idle3d = idle;   // 気があるときは、気（2D）だけ動かしつづける
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
    // 巡業・本場所：番付や戦績のひとこと
    let res = s.opt.onResult ? s.opt.onResult(r, s.kima) : '';
    if (!res || typeof res === 'string') res = { text: res || '' };
    s.opt.gain = res.text || '';
    showTitles(res.titles || []);
    gainEl.textContent = s.opt.gain || '';
    gainEl.hidden = !s.opt.gain;
    resEl.classList.toggle('has-gain', !gainEl.hidden);   // ひとことがあるときは、決まりの文を少し上へ（2行で横の面のまん中に）
    resEl.hidden = false;
  }

  // 称号を手に入れた：結果の右に縦書きで（金の罫 → 名前を筆で → 「称号を手に入れた」）
  function showTitles(list) {
    ttlEl.textContent = '';
    ttlEl.classList.remove('in');
    if (!list.length) return;
    const sm = document.createElement('small');
    sm.textContent = T.titleGain;
    ttlEl.appendChild(sm);
    for (const t of list.slice(0, 2)) { const b = document.createElement('b'); b.className = 'brush'; b.textContent = t; ttlEl.appendChild(b); }
    void ttlEl.offsetWidth;
    ttlEl.classList.add('in');
    const s = st;
    setTimeout(() => { if (st === s) { playSfx('fude', { vol: 0.45, rate: 1.0 }); playSfx('taiko', { vol: 0.5, rate: 1.25 }); } }, 1000);
  }

  gl.addEventListener('pointerdown', skip);
  cv.addEventListener('pointerdown', skip);
  document.getElementById('b-again').addEventListener('click', () => { if (st) start(st.me, st.foe, st.seed + 1, st.opt); });
  document.getElementById('b-next').addEventListener('click', () => { const m = st && st.opt.mode; stop(); if (onNext) onNext(m); });
  document.getElementById('b-home').addEventListener('click', () => { stop(); if (onHome) onHome(); });
  document.getElementById('b-foe').addEventListener('click', () => { stop(); onFoe(); });
  document.getElementById('b-recut').addEventListener('click', () => { stop(); onRecut(); });
  window.addEventListener('resize', () => {
    if (!st) return;
    layout();
    st.idle3d = false;   // 大きさが変わったら 3D を1こま描きなおす
    if (st.sleep) { st.sleep = false; st.last = performance.now(); raf = requestAnimationFrame(frame); }
  });

  return { start, stop };
}
