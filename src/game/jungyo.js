// 土俵巡業の予定：時刻（UTC のミリ秒）→ 2時間の枠 → 開催する2つの土俵。世界で同じ並び（シードつき乱数）
import { JUNGYO } from '../data/stages.js';
import { makeRng } from '../sim/rng.js';

const SLOT = JUNGYO.hours * 3600 * 1000;

export function slotIndex(ms) { return Math.floor(ms / SLOT); }
export function slotLeftMin(ms) { return Math.ceil((SLOT - (ms % SLOT)) / 60000); }

export function stagesOf(idx) {
  const rng = makeRng(Math.imul(idx, 2654435761) ^ 0x5eed);
  const pool = JUNGYO.pool.slice();
  const out = [];
  while (out.length < 2 && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

export function schedule(ms, n = JUNGYO.ahead) {
  const i0 = slotIndex(ms);
  const list = [];
  for (let k = 0; k < n; k++) list.push({ idx: i0 + k, start: (i0 + k) * SLOT, stages: stagesOf(i0 + k) });
  return list;
}

// 取組の前の抽選：いま開催中の2つから1つ（対戦が始まったら、時間が過ぎても変えない＝要件 8）
export function drawStage(ms, rng) {
  const s = stagesOf(slotIndex(ms));
  return s[Math.floor(rng() * s.length)];
}
