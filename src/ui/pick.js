// 相手をえらぶ画面：CPU 5体のカード・「全員と取る」（裏で取って ●○ だけ見せる）・動きの切りかえ
import { PAPER } from '../data/config.js';
import { CPU_SHAPES } from '../data/cpu-shapes.js';
import { T } from '../data/text.js';
import { makeQueue } from '../sim/runner.js';
import { setupCanvas, paperPiece } from './ink.js';

// paper：紙質（data/papers.js の id）
export function drawShapeThumb(cv, pts, flip = false, paper = null) {
  const { ctx, W, H, dpr } = setupCanvas(cv);
  ctx.clearRect(0, 0, W, H);
  const m = 4 * dpr;
  const s = Math.min((W - 2 * m) / PAPER.w, (H - 2 * m) / PAPER.h);
  const ox = (W - PAPER.w * s) / 2, oy = (H - PAPER.h * s) / 2;
  const tx = (p) => [ox + (flip ? PAPER.w - p[0] : p[0]) * s, oy + p[1] * s];
  paperPiece(ctx, pts, tx, { line: 2 * dpr, shade: 2 * dpr, paper, unit: PAPER.w * s });
}
// 小さな絵の中の、形のまん中と高さ（CSS px・その canvas の左上から）。気の見本の位置あわせに
export function thumbBox(cv, pts) {
  const W = cv.clientWidth, H = cv.clientHeight, m = 4;
  const s = Math.min((W - 2 * m) / PAPER.w, (H - 2 * m) / PAPER.h);
  const ox = (W - PAPER.w * s) / 2, oy = (H - PAPER.h * s) / 2;
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  return { x: ox + ((x0 + x1) / 2) * s, y: oy + ((y0 + y1) / 2) * s, h: (y1 - y0) * s };
}
// 気の見本（auraPreview）にわたす「力士のまん中と高さ」：aura の canvas から見た、絵の canvas の中の形
export function thumbAuraBox(auraCv, cv, pts) {
  return () => {
    const a = auraCv.getBoundingClientRect(), c = cv.getBoundingClientRect(), b = thumbBox(cv, pts);
    if (!c.width) return null;
    const k = c.width / (cv.clientWidth || 1);   // 跳ねる動き（transform）で大きさが変わる分
    // mask：力士の絵の canvas の場所（うしろの気の粒を、力士の形でかくす）
    return { x: c.left - a.left + b.x * k, y: c.top - a.top + b.y * k, h: b.h * k, mask: { img: cv, x: c.left - a.left, y: c.top - a.top, w: c.width, h: c.height } };
  };
}

export function initPick({ getShape, getDrive, setDrive, onFight, onBack }) {
  const foesEl = document.getElementById('foes');
  const allBtn = document.getElementById('b-all');
  const marks = {};
  let queue = null, raf = 0;

  foesEl.innerHTML = CPU_SHAPES.map((s) =>
    `<button class="foe" type="button" data-id="${s.id}"><canvas></canvas><b>${s.name}</b><span class="marks" id="mk-${s.id}"></span></button>`).join('');
  foesEl.addEventListener('click', (e) => {
    const b = e.target.closest('.foe');
    if (b) { stop(); onFight(CPU_SHAPES.find((s) => s.id === b.dataset.id)); }
  });

  function renderMarks() {
    for (const s of CPU_SHAPES) {
      const el = document.getElementById('mk-' + s.id);
      el.innerHTML = (marks[s.id] || []).map((m) => `<i class="${m}"></i>`).join('');
    }
  }

  function stop() {
    if (queue) queue.cancel();
    queue = null;
    cancelAnimationFrame(raf);
    allBtn.disabled = false;
    allBtn.textContent = T.all;
  }

  function runAll() {
    stop();
    const me = getShape();
    const phys = { drive: getDrive() };
    const jobs = [];
    for (const s of CPU_SHAPES) {
      marks[s.id] = [];
      for (const seed of [11, 12]) {
        jobs.push({ foe: s.id, side: 'a', a: me, b: s.pts, seed, phys });
        jobs.push({ foe: s.id, side: 'b', a: s.pts, b: me, seed, phys });
      }
    }
    renderMarks();
    allBtn.disabled = true;
    allBtn.textContent = T.allRunning;
    queue = makeQueue(jobs, (job, r) => {
      marks[job.foe].push(r.winner === job.side ? 'w' : r.winner ? '' : 'd');
      renderMarks();
    });
    const tick = () => {
      if (!queue) return;
      if (queue.next(10)) { queue = null; allBtn.disabled = false; allBtn.textContent = T.allAgain; return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  allBtn.addEventListener('click', runAll);
  document.getElementById('b-back').addEventListener('click', () => { stop(); onBack(); });

  const segs = [document.getElementById('drive-seg'), document.getElementById('drive-seg2')].filter(Boolean);   // seg2 は道具の中（試しのページだけ）
  function syncSeg() {
    for (const seg of segs) for (const b of seg.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.d === getDrive()));
  }
  for (const seg of segs) {
    seg.addEventListener('click', (e) => {
      const b = e.target.closest('button');
      if (!b || b.dataset.d === getDrive()) return;
      stop();
      setDrive(b.dataset.d);
      for (const k in marks) marks[k] = [];
      renderMarks();
      allBtn.textContent = T.all;
      syncSeg();
    });
  }
  syncSeg();

  return {
    show() {
      drawShapeThumb(document.getElementById('me-cv'), getShape());
      // 相手は左向き（右側に立つので反転）
      foesEl.querySelectorAll('.foe').forEach((b) => drawShapeThumb(b.querySelector('canvas'), CPU_SHAPES.find((s) => s.id === b.dataset.id).pts, true));
      renderMarks();
    },
    resetMarks() { stop(); for (const k in marks) marks[k] = []; renderMarks(); allBtn.textContent = T.all; },
    stop,
  };
}
