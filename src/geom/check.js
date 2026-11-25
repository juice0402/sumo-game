// 形の点検。サーバーでも同じ点検をする前提（四則演算だけ）。
import { PAPER, CHECK } from '../data/config.js';
import { area, bbox, clipBand, selfIntersections } from './poly.js';
import { decompose } from './decompose.js';

export function checkShape(pts, cfg = CHECK) {
  const res = { ok: true, problems: [], selfHits: [], zones: [], ground: null, pieces: null, area: 0 };
  if (!pts || pts.length < 3) {
    res.ok = false; res.problems.push('short');
    return res;
  }
  res.selfHits = selfIntersections(pts);
  if (res.selfHits.length) res.problems.push('cross');

  const total = area(pts);
  res.area = total / (PAPER.w * PAPER.h);
  if (res.area < cfg.minArea) res.problems.push('small');

  for (const z of cfg.zones) {
    const y0 = z.from * PAPER.h, y1 = z.to * PAPER.h;
    const zoneArea = PAPER.w * (y1 - y0);
    const part = res.selfHits.length ? 0 : area(clipBand(pts, y0, y1));
    const ratio = part / zoneArea;
    const ok = ratio >= z.min;
    res.zones.push({ key: z.key, y0, y1, ratio, min: z.min, ok });
    if (!ok) res.problems.push('zone:' + z.key);
  }

  const bb = bbox(pts);
  const hb = cfg.groundBand * (cfg.groundBandBasis === 'shape' ? bb.y1 - bb.y0 : PAPER.h);
  const gy0 = bb.y1 - hb, gy1 = bb.y1;
  const band = clipBand(pts, gy0, gy1);
  let gx0 = Infinity, gx1 = -Infinity;
  for (const p of band) { if (p[0] < gx0) gx0 = p[0]; if (p[0] > gx1) gx1 = p[0]; }
  const gw = band.length ? gx1 - gx0 : 0;
  const ratio = gw / PAPER.w;
  const gOk = ratio <= cfg.groundMaxW && ratio >= cfg.groundMinW;
  res.ground = { y0: gy0, y1: gy1, x0: gx0, x1: gx1, ratio, max: cfg.groundMaxW, ok: gOk };
  if (!gOk) res.problems.push(ratio > cfg.groundMaxW ? 'ground:wide' : 'ground:narrow');

  if (!res.selfHits.length) {
    res.pieces = decompose(pts);
    if (!res.pieces) res.problems.push('complex');
  }
  res.ok = res.problems.length === 0;
  return res;
}
