// たくさんの取組を、画面を止めずに少しずつ進める（1こまに budgetMs だけ）。
// jobs: [{ a, b, seed, phys }] / onResult(job, result, index)
import { createBout } from './battle.js';

export function makeQueue(jobs, onResult) {
  let k = 0, cur = null;
  const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
  return {
    total: jobs.length,
    get done() { return k; },
    next(budgetMs = 12) {
      const t0 = now();
      while (k < jobs.length) {
        if (!cur) cur = createBout(jobs[k]);
        let n = 0;
        while (!cur.stepOnce()) {
          if (++n % 60 === 0 && now() - t0 > budgetMs) return false;
        }
        const r = Object.assign({}, cur.result);
        cur.free();
        cur = null;
        onResult(jobs[k], r, k);
        k++;
        if (now() - t0 > budgetMs) return k >= jobs.length;
      }
      return true;
    },
    cancel() { if (cur) { cur.free(); cur = null; } k = jobs.length; },
  };
}
