// 重いもの（物理の wasm・物理と3Dのコード）は、ビルドで gzip して base64 にしてある（ファイルを小さくする・11/25）。
// ここで元にもどす。ふつうはブラウザの DecompressionStream（速い）。ない古いブラウザ（iOS 16.3 まで など）だけ、下の gunzip で。

// <script type="text/plain" id="..."> の中の base64 → gzip をほどいた中身（Uint8Array）
export async function unpackLib(id) {
  const el = document.getElementById(id);
  if (!el) return null;
  const b64 = el.textContent.trim();
  el.remove();
  const gz = fromBase64(b64);
  if (typeof DecompressionStream === 'function') {
    try {
      const st = new Blob([gz]).stream().pipeThrough(new DecompressionStream('gzip'));
      return new Uint8Array(await new Response(st).arrayBuffer());
    } catch (e) { /* 下でほどく */ }
  }
  return gunzip(gz);
}

// base64 → バイト。新しいブラウザは Uint8Array.fromBase64（速い）・ほかは atob（絵と効果音もこれを使う）
export function fromBase64(s) {
  if (typeof Uint8Array.fromBase64 === 'function') return Uint8Array.fromBase64(s);
  const bin = atob(s), n = bin.length, u = new Uint8Array(n);
  for (let i = 0; i < n; i++) u[i] = bin.charCodeAt(i);
  return u;
}

// ---- gzip をほどく（RFC 1951 の inflate を小さく。速さより短さ。tools/test.mjs で Node の zlib と同じになるか確かめる）----
const LBASE = [3, 4, 5, 6, 7, 8, 9, 10, 11, 13, 15, 17, 19, 23, 27, 31, 35, 43, 51, 59, 67, 83, 99, 115, 131, 163, 195, 227, 258];
const LEXT = [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 5, 0];
const DBASE = [1, 2, 3, 4, 5, 7, 9, 13, 17, 25, 33, 49, 65, 97, 129, 193, 257, 385, 513, 769, 1025, 1537, 2049, 3073, 4097, 6145,
  8193, 12289, 16385, 24577];
const DEXT = [0, 0, 0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12, 12, 13, 13];
const ORDER = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

function table(lens, n) {
  const cnt = new Uint16Array(16), offs = new Uint16Array(16), sym = new Uint16Array(n);
  for (let i = 0; i < n; i++) cnt[lens[i]]++;
  cnt[0] = 0;
  for (let i = 1; i < 16; i++) offs[i] = offs[i - 1] + cnt[i - 1];
  for (let i = 0; i < n; i++) if (lens[i]) sym[offs[lens[i]]++] = i;
  return { cnt, sym };
}

let FIXED = null;
function fixedTables() {
  if (FIXED) return FIXED;
  const l = new Uint8Array(288);
  for (let i = 0; i < 288; i++) l[i] = i < 144 ? 8 : i < 256 ? 9 : i < 280 ? 7 : 8;
  const d = new Uint8Array(30).fill(5);
  FIXED = [table(l, 288), table(d, 30)];
  return FIXED;
}

export function gunzip(src) {
  // gzip の頭（10バイト＋あれば追加の欄）
  if (src[0] !== 0x1f || src[1] !== 0x8b || src[2] !== 8) throw new Error('not gzip');
  const flg = src[3];
  let sp = 10;
  if (flg & 4) sp += 2 + (src[sp] | (src[sp + 1] << 8));
  if (flg & 8) while (src[sp++]);
  if (flg & 16) while (src[sp++]);
  if (flg & 2) sp += 2;
  const n = src.length;
  const size = (src[n - 4] | (src[n - 3] << 8) | (src[n - 2] << 16) | (src[n - 1] << 24)) >>> 0;
  const out = new Uint8Array(size);
  let bitbuf = 0, bitcnt = 0, op = 0;
  const bits = (k) => {
    while (bitcnt < k) { bitbuf |= src[sp++] << bitcnt; bitcnt += 8; }
    const v = bitbuf & ((1 << k) - 1);
    bitbuf >>>= k; bitcnt -= k;
    return v;
  };
  const decode = (t) => {
    let code = 0, first = 0, idx = 0;
    for (let len = 1; len < 16; len++) {
      code |= bits(1);
      const c = t.cnt[len];
      if (code - c < first) return t.sym[idx + code - first];
      idx += c; first += c; first <<= 1; code <<= 1;
    }
    throw new Error('bad code');
  };
  let last;
  do {
    last = bits(1);
    const type = bits(2);
    if (type === 0) {
      bitbuf = 0; bitcnt = 0;   // バイトの切れ目へ
      const len = src[sp] | (src[sp + 1] << 8);
      sp += 4;
      out.set(src.subarray(sp, sp + len), op);
      sp += len; op += len;
      continue;
    }
    let lt, dt;
    if (type === 1) {
      [lt, dt] = fixedTables();
    } else if (type === 2) {
      const hlit = bits(5) + 257, hdist = bits(5) + 1, hclen = bits(4) + 4;
      const cl = new Uint8Array(19);
      for (let i = 0; i < hclen; i++) cl[ORDER[i]] = bits(3);
      const ct = table(cl, 19);
      const lens = new Uint8Array(hlit + hdist);
      for (let i = 0; i < hlit + hdist;) {
        const s = decode(ct);
        if (s < 16) { lens[i++] = s; continue; }
        let rep, val = 0;
        if (s === 16) { val = lens[i - 1]; rep = 3 + bits(2); } else if (s === 17) rep = 3 + bits(3); else rep = 11 + bits(7);
        while (rep--) lens[i++] = val;
      }
      lt = table(lens.subarray(0, hlit), hlit);
      dt = table(lens.subarray(hlit), hdist);
    } else {
      throw new Error('bad block');
    }
    for (;;) {
      let s = decode(lt);
      if (s < 256) { out[op++] = s; continue; }
      if (s === 256) break;
      s -= 257;
      const len = LBASE[s] + bits(LEXT[s]);
      const ds = decode(dt);
      const dist = DBASE[ds] + bits(DEXT[ds]);
      for (let i = 0; i < len; i++, op++) out[op] = out[op - dist];
    }
  } while (!last);
  return out;
}
