// シードつき乱数（mulberry32）。整数の計算だけなので、どの端末でも同じ並び。
export function makeRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 32bit の FNV-1a（指紋用）
export function fnv1a(words, h = 0x811c9dc5) {
  for (let i = 0; i < words.length; i++) {
    let w = words[i] >>> 0;
    for (let k = 0; k < 4; k++) {
      h ^= w & 0xff;
      h = Math.imul(h, 0x01000193) >>> 0;
      w >>>= 8;
    }
  }
  return h >>> 0;
}
