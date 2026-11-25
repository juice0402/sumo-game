// 本場所のレートと番付（数字は data/banzuke.js）。勝敗の物理にはさわらない
import { RATE, BANZUKE } from '../data/banzuke.js';

export function rankOf(rate) {
  let r = BANZUKE[0];
  for (const b of BANZUKE) if (rate >= b.min) r = b;
  return r;
}
export function nextRank(rate) { return BANZUKE.find((b) => b.min > rate) || null; }

// Elo：score は 勝ち1・引き分け0.5・負け0
export function eloDelta(me, foe, score) {
  const e = 1 / (1 + Math.pow(10, (foe - me) / 400));
  return Math.round(RATE.k * (score - e));
}

// 仮の相手のレート（自分の前後 foeSpread）
export function foeRate(me, rng) { return Math.round(me + (rng() * 2 - 1) * RATE.foeSpread); }
