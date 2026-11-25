// 相性表：形どうしを描画なしで何度も取らせて、勝ち・負け・引き分け・決着の時間を数える。
// 左右を入れかえて、シードを変えて取る。ブラウザでも Node でも同じ。
import { makeQueue } from './runner.js';

export function makeTableRunner(shapes, { seeds = 6, phys = null, seedBase = 1 } = {}) {
  const n = shapes.length;
  const jobs = [];
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      for (let s = 0; s < seeds; s++) {
        jobs.push({ i, j, a: shapes[i].pts, b: shapes[j].pts, seed: seedBase + s, phys });
        jobs.push({ i: j, j: i, a: shapes[j].pts, b: shapes[i].pts, seed: seedBase + s, phys });
      }
    }
  }
  const cell = () => ({ w: 0, l: 0, d: 0, n: 0, t: 0 });
  const grid = shapes.map(() => shapes.map(cell));
  const per = shapes.map(() => ({ w: 0, l: 0, d: 0, n: 0, t: 0, fall: 0, out: 0, time: 0, both: 0 }));

  function add({ i, j }, r) {
    // i が左、j が右。i から見た結果
    const gi = grid[i][j], gj = grid[j][i];
    gi.n++; gi.t += r.time;
    if (i !== j) { gj.n++; gj.t += r.time; } else { gi.n++; }
    if (r.winner === 'a') { gi.w++; if (i !== j) gj.l++; else gi.l++; }
    else if (r.winner === 'b') { gi.l++; if (i !== j) gj.w++; else gi.w++; }
    else { gi.d++; if (i !== j) gj.d++; else gi.d++; }
    for (const [x, side] of [[i, 'a'], [j, 'b']]) {
      const p = per[x];
      p.n++; p.t += r.time;
      if (r.winner === side) p.w++;
      else if (r.winner) { p.l++; if (r.kind === 'fall') p.fall++; else p.out++; }
      else { p.d++; if (r.kind === 'time') p.time++; else p.both++; }
    }
  }

  const q = makeQueue(jobs, add);
  return {
    total: q.total,
    get done() { return q.done; },
    next: (budgetMs = 30) => q.next(budgetMs),
    cancel: () => q.cancel(),
    result() { return { shapes: shapes.map((s) => ({ id: s.id, name: s.name })), grid, per, seeds }; },
  };
}

// i から見た j への勝ち点（勝ち1・引き分け0.5）の割合
export function scoreOf(c) {
  return c.n ? (c.w + c.d * 0.5) / c.n : 0;
}
