// ランダムな形（相性表の道具用）。点検に通るまで作り直す。シードが同じなら同じ形。
import { PAPER } from '../data/config.js';
import { makeRng } from '../sim/rng.js';
import { checkShape } from './check.js';
import { cleanPolygon, orientPositive } from './poly.js';

export function randomShape(seed, tries = 400) {
  const rng = makeRng(seed);
  for (let t = 0; t < tries; t++) {
    const n = 10 + Math.floor(rng() * 14);
    const cx = PAPER.w / 2, cy = PAPER.h * 0.52;
    const pts = [];
    for (let i = 0; i < n; i++) {
      // 角度は等分＋少しずらす（cos・sin は作るときだけ。できた整数の形が正）
      const a = (i + (rng() - 0.5) * 0.6) / n * Math.PI * 2;
      const r = 0.35 + rng() * 0.65;
      const x = cx + Math.cos(a) * r * PAPER.w * 0.5;
      const y = cy + Math.sin(a) * r * PAPER.h * 0.5;
      pts.push([Math.max(0, Math.min(PAPER.w, Math.round(x))), Math.max(0, Math.min(PAPER.h, Math.round(y)))]);
    }
    const poly = orientPositive(cleanPolygon(pts));
    if (poly.length < 3) continue;
    if (checkShape(poly).ok) return poly;
  }
  return null;
}
