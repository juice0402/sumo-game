// 道具の画面：指紋（端末ごとに同じ結果か）・相性表（描画なしで何度も取らせる）
import { CPU_SHAPES } from '../data/cpu-shapes.js';
import { T } from '../data/text.js';
import { CONFIG_VERSION } from '../data/config.js';
import { BENCH } from '../sim/bench.js';
import { hashText } from '../sim/battle.js';
import { makeQueue } from '../sim/runner.js';
import { makeTableRunner, scoreOf } from '../sim/table.js';

export function initTools({ getShape, getDrive }) {
  const sheet = document.getElementById('s-tools');
  const fpMe = document.getElementById('fp-me');
  const fpRef = document.getElementById('fp-ref');
  const tblBtn = document.getElementById('b-table');
  const bar = document.getElementById('tbl-bar');
  const out = document.getElementById('tbl-out');
  const sum = document.getElementById('tbl-sum');
  const build = (typeof window !== 'undefined' && window.SUMO_BUILD) || {};
  let raf = 0, runner = null, fpq = null;
  document.getElementById('ver').textContent = `設定 v${CONFIG_VERSION}・物理 Rapier ${build.rapier || ''}（決定論版）`;

  function loop(step) {
    const tick = () => { if (!step()) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
  }

  function measure() {
    const hs = [];
    fpMe.className = 'fp';
    fpMe.textContent = 'はかっています…';
    fpq = makeQueue(BENCH, (job, r) => { hs.push(hashText(r.hash).slice(0, 4)); });
    loop(() => {
      if (!fpq) return true;
      if (!fpq.next(10)) return false;
      const fp = hs.join(' ');
      fpMe.textContent = fp;
      if (build.fp) {
        const same = fp === build.fp;
        fpMe.className = 'fp ' + (same ? 'same' : 'diff');
        fpRef.textContent = `${same ? T.fpSame : T.fpDiff}（${T.fpRef(build.fp)}）`;
      }
      fpq = null;
      return true;
    });
  }

  function makeTable() {
    if (runner) runner.cancel();
    const shapes = CPU_SHAPES.slice();
    const me = getShape();
    if (me) shapes.push({ id: 'me', name: T.you, pts: me });
    runner = makeTableRunner(shapes, { seeds: 3, phys: { drive: getDrive() } });
    tblBtn.disabled = true;
    out.innerHTML = '';
    sum.textContent = '';
    const t0 = performance.now();
    loop(() => {
      if (!runner) return true;
      const fin = runner.next(12);
      bar.style.width = (100 * runner.done / runner.total).toFixed(1) + '%';
      if (!fin) return false;
      render(runner.result(), runner.total, performance.now() - t0);
      runner = null;
      tblBtn.disabled = false;
      return true;
    });
  }

  function render(res, total, ms) {
    const pct = (x) => Math.round(x * 100) + '%';
    const head = '<tr><th></th>' + res.shapes.map((s) => `<th>${s.name}</th>`).join('') + '<th>合計</th><th>分</th><th>平均</th></tr>';
    const rows = res.grid.map((row, i) => {
      const p = res.per[i];
      const cells = row.map((c, j) => {
        if (i === j) return '<td class="lo">-</td>';
        const v = scoreOf(c);
        return `<td class="${v >= 0.75 ? 'hi' : v <= 0.25 ? 'lo' : ''}">${pct(v)}</td>`;
      }).join('');
      return `<tr><td>${res.shapes[i].name}</td>${cells}<td>${pct((p.w + p.d * 0.5) / p.n)}</td><td>${pct(p.d / p.n)}</td><td>${(p.t / p.n).toFixed(1)}秒</td></tr>`;
    }).join('');
    out.innerHTML = `<table class="tbl">${head}${rows}</table>`;
    const all = res.per.reduce((a, p) => ({ n: a.n + p.n, d: a.d + p.d, f: a.f + p.fall + p.touch, o: a.o + p.out }), { n: 0, d: 0, f: 0, o: 0 });
    sum.textContent = `${total}番・${(ms / 1000).toFixed(1)}秒。引き分け ${pct(all.d / all.n)}・負けのうち体がついた／転倒 ${all.f}・場外 ${all.o}`;
  }

  tblBtn.addEventListener('click', makeTable);
  document.getElementById('b-tclose').addEventListener('click', close);

  function close() {
    cancelAnimationFrame(raf);
    if (runner) { runner.cancel(); runner = null; }
    if (fpq) { fpq.cancel(); fpq = null; }
    tblBtn.disabled = false;
    sheet.hidden = true;
  }

  return {
    open() { sheet.hidden = false; measure(); },
    close,
  };
}
