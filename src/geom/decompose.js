// くぼんだ形を、いくつかの凸の形に分ける（描いたとおりに当てるため）。
// 耳切りで三角に分けてから、凸のままくっつけ直す（Hertel–Mehlhorn）。整数の座標なら誤差なし。
import { cross, orientPositive } from './poly.js';

function inTri(p, a, b, c) {
  return cross(a, b, p) >= 0 && cross(b, c, p) >= 0 && cross(c, a, p) >= 0;
}

export function triangulate(pts) {
  const n = pts.length;
  const idx = [];
  for (let i = 0; i < n; i++) idx.push(i);
  const tris = [];
  let guard = n * n + 10;
  while (idx.length > 3 && guard-- > 0) {
    const m = idx.length;
    let cut = -1;
    for (let k = 0; k < m; k++) {
      const i0 = idx[(k + m - 1) % m], i1 = idx[k], i2 = idx[(k + 1) % m];
      const a = pts[i0], b = pts[i1], c = pts[i2];
      if (cross(a, b, c) <= 0) continue;
      let ok = true;
      for (let t = 0; t < m; t++) {
        const j = idx[t];
        if (j === i0 || j === i1 || j === i2) continue;
        const p = pts[j];
        if ((p[0] === a[0] && p[1] === a[1]) || (p[0] === b[0] && p[1] === b[1]) || (p[0] === c[0] && p[1] === c[1])) continue;
        if (inTri(p, a, b, c)) { ok = false; break; }
      }
      if (ok) { tris.push([i0, i1, i2]); cut = k; break; }
    }
    if (cut < 0) return null;
    idx.splice(cut, 1);
  }
  if (idx.length === 3) tris.push(idx.slice());
  return tris;
}

function isConvex(pts, ids) {
  const m = ids.length;
  for (let k = 0; k < m; k++) {
    if (cross(pts[ids[(k + m - 1) % m]], pts[ids[k]], pts[ids[(k + 1) % m]]) < 0) return false;
  }
  return true;
}

function sharedEdge(P, Q) {
  // P に a→b、Q に b→a があれば、その位置を返す
  for (let i = 0; i < P.length; i++) {
    const a = P[i], b = P[(i + 1) % P.length];
    for (let j = 0; j < Q.length; j++) {
      if (Q[j] === b && Q[(j + 1) % Q.length] === a) return [i, j];
    }
  }
  return null;
}

function rotate(arr, start) {
  return arr.slice(start).concat(arr.slice(0, start));
}

function mergeAt(P, Q, i, j) {
  // P = [.., a(i), b(i+1), ..], Q = [.., b(j), a(j+1), ..]
  const Pr = rotate(P, (i + 1) % P.length); // b から始まり a で終わる
  const Qr = rotate(Q, (j + 1) % Q.length); // a から始まり b で終わる
  return Pr.concat(Qr.slice(1, Qr.length - 1));
}

// 戻り値：凸の形の配列（それぞれ点の配列）。失敗したら null
export function decompose(input) {
  const pts = orientPositive(input);
  const tris = triangulate(pts);
  if (!tris) return null;
  const pieces = tris.map((t) => t.slice());
  let merged = true;
  while (merged) {
    merged = false;
    outer: for (let i = 0; i < pieces.length; i++) {
      for (let j = i + 1; j < pieces.length; j++) {
        const e = sharedEdge(pieces[i], pieces[j]);
        if (!e) continue;
        const cand = mergeAt(pieces[i], pieces[j], e[0], e[1]);
        if (isConvex(pts, cand)) {
          pieces[i] = cand;
          pieces.splice(j, 1);
          merged = true;
          break outer;
        }
      }
    }
  }
  return pieces.map((ids) => {
    // 一直線の点はのぞく
    const m = ids.length, out = [];
    for (let k = 0; k < m; k++) {
      const p = pts[ids[(k + m - 1) % m]], c = pts[ids[k]], q = pts[ids[(k + 1) % m]];
      if (cross(p, c, q) !== 0) out.push(c);
    }
    return out;
  });
}
