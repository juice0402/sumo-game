// 切る画面：和紙に一筆書き → 閉じたら余りの紙が落ちる → 点検の結果を見せる
import { PAPER, CHECK } from '../data/config.js';
import { T } from '../data/text.js';
import { strokeToOutline, isNearStart } from '../geom/stroke.js';
import { checkShape } from '../geom/check.js';
import { OTEHON } from '../data/cpu-shapes.js';
import { COL, setupCanvas, tornRect, fiberPattern, polyPath, paperPiece, inkStroke } from './ink.js';
import { playSfx } from './sound.js';

const OK_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>';
const NG_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>';

export function initCut({ onDecide }) {
  const cv = document.getElementById('cut-cv');
  const hint = document.getElementById('cut-hint');
  const checks = document.getElementById('cut-checks');
  const okBtn = document.getElementById('b-ok');
  let raw = [], drawing = false, near = false;
  let outline = null, check = null, fallT = -1;
  let lay = null;
  let pred = [], rafId = 0;   // pred＝指の少し先（ブラウザの予測・描くだけで形には入れない）
  // はじめての人へのお手本（11/25 しょーくん「早すぎる・型抜きみたいに点線で」）：人の形（data/cpu-shapes.js の OTEHON）を、
  // 紙に墨の点線でうすく引いておく。描いている間も消さない（点線にそって切る）。切り直しても出る。
  // はじまりは朱の丸（ゆっくり息をする）と「ここから」・向きの矢じるし。動くのは丸だけ
  let demo = null;
  function demoPath() {
    const pts = OTEHON.pts.concat([OTEHON.pts[0]]);
    const len = [0];
    for (let i = 1; i < pts.length; i++) len.push(len[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return { pts, len, total: len[len.length - 1] };
  }
  function pointAt(path, d) {   // 線のはじめから d の所の点と向き
    const { pts, len } = path;
    let i = 1;
    while (i < pts.length - 1 && len[i] < d) i++;
    const a = pts[i - 1], b = pts[i], k = (d - len[i - 1]) / (len[i] - len[i - 1] || 1);
    const dx = b[0] - a[0], dy = b[1] - a[1], m = Math.hypot(dx, dy) || 1;
    return { p: [a[0] + dx * k, a[1] + dy * k], ux: dx / m, uy: dy / m };
  }
  function demoTick() {
    if (!demo || cv.closest('.screen').hidden) return;   // 画面をはなれたら止める（show でまた動く）
    if (!drawing && !outline && !raw.length) draw();
    requestAnimationFrame(demoTick);
  }
  function drawDemo(ctx, dpr) {
    const path = demo.path;
    ctx.save();
    // 型抜きの点線
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = COL.sumi;
    ctx.globalAlpha = raw.length ? 0.3 : 0.5;
    ctx.lineWidth = 3 * dpr;
    ctx.setLineDash([0.01, 9 * dpr]);
    ctx.beginPath();
    path.pts.forEach((p, i) => { const q = tx(p); if (i) ctx.lineTo(q[0], q[1]); else ctx.moveTo(q[0], q[1]); });
    ctx.stroke();
    ctx.setLineDash([]);
    if (!raw.length) {
      ctx.globalAlpha = 1;
      // 向きの矢じるし（はじまりから少し先）
      const { p, ux, uy } = pointAt(path, 34);
      const q = tx(p), L = 7 * dpr;
      ctx.strokeStyle = COL.shu;
      ctx.lineWidth = 2.6 * dpr;
      ctx.beginPath();
      ctx.moveTo(q[0] - ux * L - uy * L * 0.8, q[1] - uy * L + ux * L * 0.8);
      ctx.lineTo(q[0], q[1]);
      ctx.lineTo(q[0] - ux * L + uy * L * 0.8, q[1] - uy * L - ux * L * 0.8);
      ctx.stroke();
      // はじまりの朱の丸（ゆっくり息をする）と「ここから」
      const t = (performance.now() - demo.t0) / 1000;
      const p0 = tx(path.pts[0]), r = (5.5 + 1.5 * Math.sin(t * 2.2)) * dpr;
      ctx.fillStyle = COL.shu;
      ctx.beginPath(); ctx.arc(p0[0], p0[1], r, 0, Math.PI * 2); ctx.fill();
      ctx.font = `500 ${12 * dpr}px "Zen Kaku Gothic New", sans-serif`;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillText(T.cutHere, p0[0] - 12 * dpr, p0[1]);
    }
    ctx.restore();
  }

  function layout() {
    const c = setupCanvas(cv, 2);   // 描く画面は2倍まで（スマホで1こまが重くならないように）
    const m = 16 * c.dpr;
    const s = Math.min((c.W - 2 * m) / PAPER.w, (c.H - 2 * m) / PAPER.h);
    lay = { ...c, s, ox: (c.W - PAPER.w * s) / 2, oy: (c.H - PAPER.h * s) / 2 };
    lay.bg = paperBg();
  }

  // 上・中・下の点線
  function zoneLines(g, color) {
    const { s, dpr } = lay, pw = PAPER.w * s, ph = PAPER.h * s;
    g.save();
    g.setLineDash([6 * dpr, 6 * dpr]);
    g.lineWidth = 1.2 * dpr;
    g.strokeStyle = color;
    for (const z of CHECK.zones.slice(1)) {
      const y = lay.oy + z.from * ph;
      g.beginPath(); g.moveTo(lay.ox, y); g.lineTo(lay.ox + pw, y); g.stroke();
    }
    g.restore();
  }

  // 切る前の紙（和紙・繊維・点線）は1枚の絵にしておく（指を動かすたびに描き直さない）
  function paperBg() {
    const { W, H, s, dpr } = lay, pw = PAPER.w * s, ph = PAPER.h * s;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.save();
    tornRect(g, lay.ox, lay.oy, pw, ph, 7, 2.2 * dpr);
    g.fillStyle = COL.washi;
    g.fill();
    g.clip();
    g.fillStyle = fiberPattern(g);
    g.fillRect(lay.ox, lay.oy, pw, ph);
    g.restore();
    zoneLines(g, 'rgba(32,30,27,0.35)');
    return c;
  }

  // 指を動かしている間は1こまに1回だけ描く
  function requestDraw() {
    if (!rafId) rafId = requestAnimationFrame(() => { rafId = 0; draw(); });
  }
  const tx = (p) => [lay.ox + p[0] * lay.s, lay.oy + p[1] * lay.s];

  function setHint(text, ng) {
    hint.textContent = text;
    hint.classList.toggle('ng', !!ng);
  }

  function showChecks() {
    if (!check) { checks.hidden = true; return; }
    const chip = (label, ok) => `<span class="chip${ok ? '' : ' ng'}">${ok ? OK_SVG : NG_SVG}${label}</span>`;
    checks.innerHTML = check.zones.map((z) => chip(T.zone[z.key], z.ok)).join('') + chip(T.ground, check.ground.ok);
    checks.hidden = false;
  }

  function draw() {
    if (!lay) layout();
    const { ctx, W, H, s, dpr } = lay;
    ctx.clearRect(0, 0, W, H);
    const pw = PAPER.w * s, ph = PAPER.h * s;
    const cut = outline && fallT >= 0;
    // 紙（切る前）／余りの紙が落ちていく（切ったあと）
    if (!cut) {
      ctx.drawImage(lay.bg, 0, 0);
    } else if (fallT < 1) {
      const k = fallT;
      ctx.save();
      ctx.globalAlpha = 1 - k;
      ctx.translate(lay.ox + pw / 2, lay.oy + ph / 2 + k * k * H * 0.7);
      ctx.rotate(k * 0.35);
      ctx.translate(-(lay.ox + pw / 2), -(lay.oy + ph / 2));
      tornRect(ctx, lay.ox, lay.oy, pw, ph, 7, 2.2 * dpr);
      polyPath(ctx, outline, tx);
      ctx.fillStyle = COL.washi2;
      ctx.fill('evenodd');
      ctx.restore();
    }
    // 上・中・下の点線（切る前は紙の絵に入っている）
    if (cut) zoneLines(ctx, 'rgba(238,233,222,0.28)');
    // 点検でだめなエリアは朱をうすく
    if (cut && check) {
      for (const z of check.zones) {
        if (z.ok) continue;
        ctx.fillStyle = 'rgba(171,57,47,0.22)';
        ctx.fillRect(lay.ox, lay.oy + z.y0 * s, pw, (z.y1 - z.y0) * s);
      }
      ctx.fillStyle = cut ? 'rgba(238,233,222,0.5)' : 'rgba(32,30,27,0.4)';
      ctx.font = `${13 * dpr}px "Zen Kaku Gothic New", sans-serif`;
      ctx.textAlign = 'right';
      for (const z of check.zones) ctx.fillText(T.zone[z.key], lay.ox - 4 * dpr, lay.oy + ((z.y0 + z.y1) / 2) * s + 5 * dpr);
    }
    // 切った形
    if (cut) {
      paperPiece(ctx, outline, tx, { line: 3 * dpr, shade: 3 * dpr });
      if (check) {
        // 足もとの幅
        const g = check.ground;
        const y = lay.oy + g.y1 * s + 10 * dpr;
        ctx.strokeStyle = g.ok ? 'rgba(238,233,222,0.7)' : COL.shu;
        ctx.lineWidth = 2 * dpr;
        ctx.beginPath();
        ctx.moveTo(lay.ox + g.x0 * s, y - 5 * dpr); ctx.lineTo(lay.ox + g.x0 * s, y);
        ctx.lineTo(lay.ox + g.x1 * s, y); ctx.lineTo(lay.ox + g.x1 * s, y - 5 * dpr);
        ctx.stroke();
        if (!g.ok) {
          // 足もとに使える幅（紙の 60%）
          const maxW = g.max * PAPER.w * s, cx = lay.ox + ((g.x0 + g.x1) / 2) * s;
          ctx.setLineDash([4 * dpr, 4 * dpr]);
          ctx.strokeStyle = 'rgba(238,233,222,0.5)';
          ctx.beginPath(); ctx.moveTo(cx - maxW / 2, y + 6 * dpr); ctx.lineTo(cx + maxW / 2, y + 6 * dpr); ctx.stroke();
          ctx.setLineDash([]);
        }
        // 交わっている所
        ctx.strokeStyle = COL.shu;
        ctx.lineWidth = 3 * dpr;
        for (const p of check.selfHits) {
          const q = tx(p), r = 8 * dpr;
          ctx.beginPath();
          ctx.moveTo(q[0] - r, q[1] - r); ctx.lineTo(q[0] + r, q[1] + r);
          ctx.moveTo(q[0] + r, q[1] - r); ctx.lineTo(q[0] - r, q[1] + r);
          ctx.stroke();
        }
      }
    }
    if (demo && !cut) drawDemo(ctx, dpr);   // 点線は描いている線の下に
    // 描いている線
    if (!cut && raw.length) {
      inkStroke(ctx, drawing && pred.length ? raw.concat(pred) : raw, tx, 3.4 * dpr);
      const p0 = tx(raw[0]);
      ctx.fillStyle = COL.shu;
      ctx.beginPath(); ctx.arc(p0[0], p0[1], 5 * dpr, 0, Math.PI * 2); ctx.fill();
      if (drawing && raw.length > 8) {
        ctx.strokeStyle = near ? COL.shu : 'rgba(171,57,47,0.45)';
        ctx.lineWidth = (near ? 3 : 1.5) * dpr;
        ctx.setLineDash(near ? [] : [4 * dpr, 4 * dpr]);
        ctx.beginPath(); ctx.arc(p0[0], p0[1], CHECK.closeDist * s, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  function toPaper(e, r = cv.getBoundingClientRect()) {
    const x = ((e.clientX - r.left) * lay.dpr - lay.ox) / lay.s;
    const y = ((e.clientY - r.top) * lay.dpr - lay.oy) / lay.s;
    return [Math.max(0, Math.min(PAPER.w, x)), Math.max(0, Math.min(PAPER.h, y))];
  }

  function clear() {
    raw = []; outline = null; check = null; fallT = -1; drawing = false; near = false;
    okBtn.disabled = true;
    checks.hidden = true;
    setHint(demo ? T.cutDemo : T.cutHint);
    draw();
  }

  function finish() {
    drawing = false;
    pred = [];
    const res = strokeToOutline(raw);
    if (!res.ok) {
      setHint(T.problem[res.reason] || T.cutHint, true);
      draw();
      return;
    }
    setOutline(res.pts, true);
  }

  function setOutline(pts, animate) {
    outline = pts;
    check = checkShape(pts);
    okBtn.disabled = !check.ok;
    setHint(check.ok ? T.cutOk : T.problem[check.problems[0]] || '', !check.ok);
    showChecks();
    if (!animate) { fallT = 1; draw(); return; }
    fallT = 0;
    const t0 = performance.now();
    const tick = (t) => {
      fallT = Math.min(1, (t - t0) / 650);
      draw();
      if (fallT < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    try { navigator.vibrate && navigator.vibrate(12); } catch (e) { /* なくてよい */ }
  }

  cv.addEventListener('pointerdown', (e) => {
    if (!lay) layout();
    e.preventDefault();
    cv.setPointerCapture(e.pointerId);
    raw = [toPaper(e)]; pred = []; outline = null; check = null; fallT = -1;
    drawing = true; near = false;
    playSfx('fude', { vol: 0.45 });
    okBtn.disabled = true;
    checks.hidden = true;
    setHint(T.cutDrawing);
    draw();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const r = cv.getBoundingClientRect();
    const co = e.getCoalescedEvents ? e.getCoalescedEvents() : [];
    for (const ev of co.length ? co : [e]) {
      const p = toPaper(ev, r), q = raw[raw.length - 1];
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 1.5) raw.push(p);
    }
    // 指の少し先まで線をのばして見せる（遅れて見えないように）
    pred = e.getPredictedEvents ? e.getPredictedEvents().slice(0, 3).map((ev) => toPaper(ev, r)) : [];
    const wasNear = near;
    near = isNearStart(raw, raw[raw.length - 1]);
    if (near && !wasNear) { try { navigator.vibrate && navigator.vibrate(6); } catch (err) { /* */ } }
    requestDraw();
  });
  const up = () => { if (drawing) finish(); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  document.getElementById('b-redo').addEventListener('click', clear);
  okBtn.addEventListener('click', () => { if (check && check.ok) onDecide(outline); });
  window.addEventListener('resize', () => { lay = null; draw(); });

  return {
    // opt.demo：はじめての人にお手本を見せる
    show(pts, opt = {}) {
      lay = null;
      demo = null;
      if (pts) setOutline(pts, false); else clear();
      if (!pts && opt.demo) { demo = { t0: performance.now(), path: demoPath() }; setHint(T.cutDemo); requestAnimationFrame(demoTick); }
      draw();
    },
    stopDemo() { demo = null; },
    clear,
  };
}
