// 決まり手（見た目だけ。勝敗は変えない）。記録 rec と result から、あとで決める。
export const KIMARITE = {
  touchWin: 0.5,    // 最後の何秒に2人がふれていたか（秒）
  liftH: 0.04,      // 場外へ出るとき、足がこの高さ（m）より浮いていたら「飛んでいた」
  moveWin: 0.3,     // 負けた方の動いた向きを見る長さ（秒）
  moveMin: 0.002,   // これより動いていなければ回転の向きで決める（m）
};

function lowestY(lo, tx, ty, rot) {
  const c = Math.cos(rot), s = Math.sin(rot);
  let m = Infinity;
  for (const p of lo.outline) {
    const y = ty + s * p[0] + c * p[1];
    if (y < m) m = y;
  }
  return m;
}

// bout: createBout(…, record:true) を最後まで進めたもの。la・lb: toLocal(me, 1, phys)・toLocal(foe, -1, phys)
export function decideKimarite(bout, la, lb) {
  const r = bout.result, rec = bout.rec;
  if (r.kind === 'both') return 'dotai';
  if (r.kind === 'time' || !r.loser || !rec || rec.n < 2) return 'hikiwake';
  const K = KIMARITE;
  const f = rec.f, last = rec.n - 1;
  const isA = r.loser === 'a';
  const o = isA ? 0 : 3;
  const dir = isA ? 1 : -1;
  const lo = isA ? la : lb;
  const back = (sec) => Math.max(0, last - Math.round(sec / rec.dt));

  let touched = false;
  for (let i = back(K.touchWin); i <= last; i++) if (f[i * 8 + 7] === 1) { touched = true; break; }

  if (r.kind === 'out') {
    if (!touched) return forward(f, o, dir, last, back(K.moveWin), K) ? 'isamiashi' : 'fumidashi';
    // 土俵の外へ出た瞬間（なければ最後のこま）に足が浮いていたか
    const half = bout.phys.ringHalf;
    let e = last;
    for (let i = last; i >= 0; i--) {
      if (Math.abs(f[i * 8 + o]) <= half) { e = Math.min(last, i + 1); break; }
    }
    const foot = lowestY(lo, f[e * 8 + o], f[e * 8 + o + 1], f[e * 8 + o + 2]);
    return foot - f[e * 8 + 6] > K.liftH ? 'tsukidashi' : 'oshidashi';
  }
  // touch・fall
  if (!touched) return 'koshikudake';
  return forward(f, o, dir, last, back(K.moveWin), K) ? 'tsukiotoshi' : 'oshitaoshi';
}

// 負けた方が前（相手のいる方）へ動いたか
function forward(f, o, dir, last, from, K) {
  const dx = (f[last * 8 + o] - f[from * 8 + o]) * dir;
  if (Math.abs(dx) >= K.moveMin) return dx > 0;
  // 動きが小さいとき：前へ倒れる＝右向き（dir=1）なら時計まわり（回転が減る）
  const dr = (f[last * 8 + o + 2] - f[from * 8 + o + 2]) * dir;
  return dr < 0;
}
