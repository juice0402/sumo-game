// 多角形の基本（点は [x, y] の配列）。
// 対戦の結果にかかわる計算は、四則演算だけ（Math.sin・Math.sqrt などは使わない）＝どの端末でも同じ答え。

export function signedArea2(pts) {
  // 面積の2倍（向きつき）
  let s = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s;
}

export function area(pts) {
  return Math.abs(signedArea2(pts)) / 2;
}

export function cross(o, a, b) {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

// 向きを「signedArea2 > 0」にそろえる（紙の座標＝y下向きでは見た目が時計回り）
export function orientPositive(pts) {
  return signedArea2(pts) < 0 ? pts.slice().reverse() : pts.slice();
}

// 同じ点・一直線に並ぶ点を取りのぞく
export function cleanPolygon(pts) {
  let out = pts.slice();
  let changed = true;
  while (changed && out.length >= 3) {
    changed = false;
    const res = [];
    const n = out.length;
    for (let i = 0; i < n; i++) {
      const p = out[(i + n - 1) % n], c = out[i], q = out[(i + 1) % n];
      if (c[0] === q[0] && c[1] === q[1]) { changed = true; continue; }
      if (cross(p, c, q) === 0) { changed = true; continue; }
      res.push(c);
    }
    out = res;
  }
  return out;
}

export function bbox(pts) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of pts) {
    if (p[0] < x0) x0 = p[0];
    if (p[0] > x1) x1 = p[0];
    if (p[1] < y0) y0 = p[1];
    if (p[1] > y1) y1 = p[1];
  }
  return { x0, y0, x1, y1 };
}

function onSeg(p, q, r) {
  // q が p-r の上（同一直線のときに呼ぶ）
  return Math.min(p[0], r[0]) <= q[0] && q[0] <= Math.max(p[0], r[0]) &&
    Math.min(p[1], r[1]) <= q[1] && q[1] <= Math.max(p[1], r[1]);
}

function sgn(v) { return v > 0 ? 1 : v < 0 ? -1 : 0; }

// 線分 ab と cd がふれるか（はしっこが重なるのもふくむ）
export function segsTouch(a, b, c, d) {
  const d1 = sgn(cross(a, b, c)), d2 = sgn(cross(a, b, d));
  const d3 = sgn(cross(c, d, a)), d4 = sgn(cross(c, d, b));
  if (d1 !== d2 && d3 !== d4) return true;
  if (d1 === 0 && onSeg(a, c, b)) return true;
  if (d2 === 0 && onSeg(a, d, b)) return true;
  if (d3 === 0 && onSeg(c, a, d)) return true;
  if (d4 === 0 && onSeg(c, b, d)) return true;
  return false;
}

// 自己交差の場所（となりどうしの辺はのぞく）。見せる用の点を返す
export function selfIntersections(pts, limit = 12) {
  const n = pts.length, hits = [];
  for (let i = 0; i < n; i++) {
    const a = pts[i], b = pts[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue; // 最初と最後の辺はとなり
      const c = pts[j], d = pts[(j + 1) % n];
      if (segsTouch(a, b, c, d)) {
        hits.push(segPoint(a, b, c, d));
        if (hits.length >= limit) return hits;
      }
    }
  }
  return hits;
}

function segPoint(a, b, c, d) {
  const den = (b[0] - a[0]) * (d[1] - c[1]) - (b[1] - a[1]) * (d[0] - c[0]);
  if (den === 0) return [(a[0] + b[0] + c[0] + d[0]) / 4, (a[1] + b[1] + c[1] + d[1]) / 4];
  const t = ((c[0] - a[0]) * (d[1] - c[1]) - (c[1] - a[1]) * (d[0] - c[0])) / den;
  return [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
}

// 横の帯 y0 <= y <= y1 で切り取る（Sutherland–Hodgman。くぼんだ形でも面積は正しい）
export function clipBand(pts, y0, y1) {
  return clipHalf(clipHalf(pts, y0, 1), y1, -1);
}

function clipHalf(pts, yc, dir) {
  // dir=1: y >= yc を残す／dir=-1: y <= yc を残す
  const out = [];
  const n = pts.length;
  if (!n) return out;
  const inside = (p) => (dir > 0 ? p[1] >= yc : p[1] <= yc);
  for (let i = 0; i < n; i++) {
    const cur = pts[i], prev = pts[(i + n - 1) % n];
    const ci = inside(cur), pi = inside(prev);
    if (ci) {
      if (!pi) out.push(lerpY(prev, cur, yc));
      out.push(cur);
    } else if (pi) {
      out.push(lerpY(prev, cur, yc));
    }
  }
  return out;
}

function lerpY(a, b, yc) {
  const t = (yc - a[1]) / (b[1] - a[1]);
  return [a[0] + t * (b[0] - a[0]), yc];
}

// 左右反転（向きも保つ）
export function mirrorX(pts, cx = 0) {
  return pts.map((p) => [2 * cx - p[0], p[1]]).reverse();
}

// 重心（面積の重心）
export function centroid(pts) {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0, n = pts.length; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    const k = p[0] * q[1] - q[0] * p[1];
    a += k; cx += (p[0] + q[0]) * k; cy += (p[1] + q[1]) * k;
  }
  return [cx / (3 * a), cy / (3 * a)];
}
