// 切る画面：和紙に一筆書き → 閉じたら余りの紙が落ちる → 点検の結果を見せる
import { PAPER, CHECK } from '../data/config.js';
import { T } from '../data/text.js';
import { strokeToOutline, isNearStart } from '../geom/stroke.js';
import { checkShape } from '../geom/check.js';
import { COL, setupCanvas, tornRect, fiberPattern, polyPath, paperPiece, inkStroke } from './ink.js';

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

  function layout() {
    const c = setupCanvas(cv);
    const m = 16 * c.dpr;
    const s = Math.min((c.W - 2 * m) / PAPER.w, (c.H - 2 * m) / PAPER.h);
    lay = { ...c, s, ox: (c.W - PAPER.w * s) / 2, oy: (c.H - PAPER.h * s) / 2 };
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
      ctx.save();
      tornRect(ctx, lay.ox, lay.oy, pw, ph, 7, 2.2 * dpr);
      ctx.fillStyle = COL.washi;
      ctx.fill();
      ctx.clip();
      ctx.fillStyle = fiberPattern(ctx);
      ctx.fillRect(lay.ox, lay.oy, pw, ph);
      ctx.restore();
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
    // 上・中・下の点線
    ctx.save();
    ctx.setLineDash([6 * dpr, 6 * dpr]);
    ctx.lineWidth = 1.2 * dpr;
    ctx.strokeStyle = cut ? 'rgba(238,233,222,0.28)' : 'rgba(32,30,27,0.35)';
    for (const z of CHECK.zones.slice(1)) {
      const y = lay.oy + z.from * ph;
      ctx.beginPath(); ctx.moveTo(lay.ox, y); ctx.lineTo(lay.ox + pw, y); ctx.stroke();
    }
    ctx.restore();
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
    // 描いている線
    if (!cut && raw.length) {
      inkStroke(ctx, raw, tx, 3.4 * dpr);
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

  function toPaper(e) {
    const r = cv.getBoundingClientRect();
    const x = ((e.clientX - r.left) * lay.dpr - lay.ox) / lay.s;
    const y = ((e.clientY - r.top) * lay.dpr - lay.oy) / lay.s;
    return [Math.max(0, Math.min(PAPER.w, x)), Math.max(0, Math.min(PAPER.h, y))];
  }

  function clear() {
    raw = []; outline = null; check = null; fallT = -1; drawing = false; near = false;
    okBtn.disabled = true;
    checks.hidden = true;
    setHint(T.cutHint);
    draw();
  }

  function finish() {
    drawing = false;
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
    raw = [toPaper(e)]; outline = null; check = null; fallT = -1;
    drawing = true; near = false;
    okBtn.disabled = true;
    checks.hidden = true;
    setHint(T.cutDrawing);
    draw();
  });
  cv.addEventListener('pointermove', (e) => {
    if (!drawing) return;
    const evs = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
    for (const ev of evs) {
      const p = toPaper(ev), q = raw[raw.length - 1];
      if (Math.hypot(p[0] - q[0], p[1] - q[1]) >= 1.5) raw.push(p);
    }
    const wasNear = near;
    near = isNearStart(raw, raw[raw.length - 1]);
    if (near && !wasNear) { try { navigator.vibrate && navigator.vibrate(6); } catch (err) { /* */ } }
    draw();
  });
  const up = () => { if (drawing) finish(); };
  cv.addEventListener('pointerup', up);
  cv.addEventListener('pointercancel', up);
  document.getElementById('b-redo').addEventListener('click', clear);
  okBtn.addEventListener('click', () => { if (check && check.ok) onDecide(outline); });
  window.addEventListener('resize', () => { lay = null; draw(); });

  return {
    show(pts) {
      lay = null;
      if (pts) setOutline(pts, false); else clear();
      draw();
    },
    clear,
  };
}
