// 指の線 → 力士の輪郭（整数の座標）。ここは画面の中だけで1回動く。
// できた整数の輪郭が「正」のデータで、対戦・保存・サーバーはそれだけを使う。
import { PAPER, CHECK } from '../data/config.js';
import { cleanPolygon, orientPositive } from './poly.js';

function dist(a, b) {
  const dx = a[0] - b[0], dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

export function isNearStart(raw, p, cfg = CHECK) {
  return raw.length > 8 && dist(raw[0], p) <= cfg.closeDist;
}

function resampleClosed(pts, step) {
  const ring = pts.concat([pts[0]]);
  const out = [ring[0].slice()];
  let carry = 0;
  for (let i = 1; i < ring.length; i++) {
    let a = ring[i - 1];
    const b = ring[i];
    let seg = dist(a, b);
    while (carry + seg >= step) {
      const t = (step - carry) / seg;
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      out.push(p);
      a = p;
      seg = dist(a, b);
      carry = 0;
    }
    carry += seg;
  }
  if (out.length > 3 && dist(out[out.length - 1], out[0]) < step * 0.5) out.pop();
  return out;
}

function smoothClosed(pts, passes) {
  let cur = pts;
  for (let k = 0; k < passes; k++) {
    const n = cur.length;
    cur = cur.map((p, i) => {
      const a = cur[(i + n - 1) % n], b = cur[(i + 1) % n];
      return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
    });
  }
  return cur;
}

function perp(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return dist(p, a);
  return Math.abs(dx * (a[1] - p[1]) - dy * (a[0] - p[0])) / len;
}

function rdp(pts, tol) {
  if (pts.length < 3) return pts.slice();
  let md = 0, mi = 0;
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perp(pts[i], pts[0], pts[pts.length - 1]);
    if (d > md) { md = d; mi = i; }
  }
  if (md <= tol) return [pts[0], pts[pts.length - 1]];
  const l = rdp(pts.slice(0, mi + 1), tol);
  const r = rdp(pts.slice(mi), tol);
  return l.slice(0, -1).concat(r);
}

function simplifyClosed(pts, tol) {
  // いちばん遠い2点で2つに分けて、それぞれ間引く
  let far = 0, fd = -1;
  for (let i = 1; i < pts.length; i++) {
    const d = dist(pts[0], pts[i]);
    if (d > fd) { fd = d; far = i; }
  }
  const a = rdp(pts.slice(0, far + 1), tol);
  const b = rdp(pts.slice(far).concat([pts[0]]), tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}

function clampInt(p) {
  return [
    Math.max(0, Math.min(PAPER.w, Math.round(p[0]))),
    Math.max(0, Math.min(PAPER.h, Math.round(p[1]))),
  ];
}

// raw：紙の座標の点（小数でよい）。戻り値 { ok, pts?, reason? }
export function strokeToOutline(raw, cfg = CHECK) {
  if (raw.length < 8) return { ok: false, reason: 'short' };
  if (dist(raw[0], raw[raw.length - 1]) > cfg.closeDist) return { ok: false, reason: 'open' };
  let pts = resampleClosed(raw, cfg.resample);
  if (pts.length < 8) return { ok: false, reason: 'short' };
  pts = smoothClosed(pts, cfg.smooth);
  let tol = cfg.simplify, out;
  for (let k = 0; k < 12; k++) {
    out = cleanPolygon(simplifyClosed(pts, tol).map(clampInt));
    if (out.length <= cfg.maxPoints) break;
    tol *= 1.4;
  }
  if (out.length < 3) return { ok: false, reason: 'short' };
  return { ok: true, pts: orientPositive(out) };
}
