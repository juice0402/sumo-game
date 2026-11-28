// 紙質と土俵のもようを描く（11/26 福箱）。くり返す1枚（タイル）を作っておき、パターンで塗る。
// 紙質に tex があれば Codex のテクスチャ（A）を、なければ・読みこむ前はコードで描くもよう（C）。物理にはさわらない（見た目だけ）。
import { PAPERS, PAPER_DEFAULT } from '../data/papers.js';
import { artImage } from './art.js';
import { DOHYO } from '../data/dohyo.js';
import { STAGES, HONBASHO_STAGE } from '../data/stages.js';

// テクスチャ（名前 → 画像）。はじめに loadPaperTextures で読む（タイトルの間に読み終わる）
const TEX = {};
// 巡業の特殊土俵の絵（12の土俵）はタイトルでは読まず、巡業の土俵を見せるときに loadDohyoTextures で読む（11/28 夜 #19・起動を軽く）
const JUNGYO_LOOKS = new Set(Object.keys(STAGES).filter((id) => id !== HONBASHO_STAGE).map((id) => STAGES[id].look));
const loading = {};
function loadTex(id) {
  if (!loading[id]) loading[id] = artImage(id).then((im) => { TEX[id] = im; }).catch(() => {});
  return loading[id];
}
export function loadPaperTextures() {
  // 紙質のテクスチャ＋土俵スキンの絵（上の面の1枚絵・横の面の帯＝data/dohyo.js の top.img・side.img）
  const ids = [...new Set([...Object.values(PAPERS).map((p) => p.tex), ...Object.entries(DOHYO).filter(([k]) => !JUNGYO_LOOKS.has(k)).flatMap(([, d]) => [d.top.img, d.side.img])].filter(Boolean))];
  return Promise.all(ids.map(loadTex));
}
// 土俵の絵を読む（looks＝data/dohyo.js の key の並び）。読み終わったら resolve（読めない絵はコードの紙のまま）
export function loadDohyoTextures(looks) {
  return Promise.all(looks.flatMap((k) => (DOHYO[k] ? [DOHYO[k].top.img, DOHYO[k].side.img] : [])).filter(Boolean).map(loadTex));
}
// 読みこんだ絵（まだなら null＝コードの紙で描く）
export function texImage(id) { return (id && TEX[id]) || null; }

// 見た目用の乱数（ink.js と同じ形。ink.js がこのファイルを読むので、ここでは自分で持つ）
function rand(seed) {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const cache = {};
const SPAN = 0.25;   // タイル1枚が、紙の幅（1）のどれだけか

// もようのタイル。key ごとに1回だけ作る
function tile(key, base, fiber, pat, ink) {
  if (cache[key]) return cache[key];
  const size = pat === 'suminagashi' ? 256 : pat === 'seigaiha' ? 64 : pat === 'ichimatsu' ? 64 : 128;
  const h = pat === 'asanoha' ? Math.round(size * Math.sqrt(3)) : pat === 'seigaiha' ? size / 2 : size;
  const c = document.createElement('canvas');
  c.width = size; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = base;
  g.fillRect(0, 0, size, h);
  const r = rand(key.length * 7 + 3);
  if (pat) PAT[pat](g, size, h, ink, r, base);
  if (fiber > 0) {   // 和紙のすじ（data の fiber の濃さで）
    g.globalAlpha = Math.min(1, 0.1 * fiber / 0.1);
    g.strokeStyle = 'rgba(120,105,80,0.10)';
    g.lineWidth = 0.8;
    for (let i = 0; i < 40 * fiber; i++) {
      const x = r() * size, y = r() * h, a = r() * Math.PI, l = 4 + r() * 14;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.fillStyle = 'rgba(90,80,60,0.06)';
    for (let i = 0; i < 150 * fiber; i++) g.fillRect(r() * size, r() * h, 1.2, 1.2);
    g.globalAlpha = 1;
  }
  cache[key] = c;
  return c;
}

// もよう（どれもタイルの端でつながるように、はみ出す分も描く）
const PAT = {
  wara(g, w, h, ink, r) {   // 藁のつぶと短いすじ
    g.fillStyle = ink;
    for (let i = 0; i < 90; i++) { g.globalAlpha = 0.15 + r() * 0.25; g.fillRect(r() * w, r() * h, 1 + r() * 1.6, 1 + r() * 1.6); }
    g.strokeStyle = ink; g.lineWidth = 0.9;
    for (let i = 0; i < 18; i++) {
      g.globalAlpha = 0.2 + r() * 0.2;
      const x = r() * w, y = r() * h, a = r() * Math.PI, l = 5 + r() * 9;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke();
    }
    g.globalAlpha = 1;
  },
  asanoha(g, w, h, ink) {   // 麻の葉：三角の格子に、角から真ん中への線
    g.strokeStyle = ink; g.lineWidth = 1.4; g.globalAlpha = 0.75;
    const s = w, t = h / 2;   // 三角の一辺 s、高さ t
    g.beginPath();
    for (let row = -1; row <= 2; row++) {
      for (let col = -1; col <= 2; col++) {
        const ox = col * s + (row % 2 ? s / 2 : 0), oy = row * t;
        for (const [a, b, c] of [[[ox, oy], [ox + s, oy], [ox + s / 2, oy + t]], [[ox + s / 2, oy + t], [ox + s, oy], [ox + s * 1.5, oy + t]]]) {
          const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
          for (const p of [a, b, c]) { g.moveTo(p[0], p[1]); g.lineTo(cx, cy); }
          g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.lineTo(c[0], c[1]); g.closePath();
        }
      }
    }
    g.stroke();
    g.globalAlpha = 1;
  },
  seigaiha(g, w, h, ink, r, base) {   // 青海波：半円を重ねた波
    const R = w / 2;
    for (let row = -2; row <= 3; row++) {
      const y = row * (h / 2) + h / 2;
      for (let col = -1; col <= 2; col++) {
        const x = col * w + (row % 2 ? R : 0);
        g.fillStyle = base;
        g.beginPath(); g.arc(x, y, R, Math.PI, 0); g.closePath(); g.fill();
        g.strokeStyle = ink; g.lineWidth = 1.6;
        for (const k of [1, 0.74, 0.48, 0.22]) { g.beginPath(); g.arc(x, y, R * k, Math.PI, 0); g.stroke(); }
      }
    }
  },
  ichimatsu(g, w, h, ink) {   // 市松
    g.fillStyle = ink; g.globalAlpha = 0.7;
    g.fillRect(0, 0, w / 2, h / 2); g.fillRect(w / 2, h / 2, w / 2, h / 2);
    g.globalAlpha = 1;
  },
  shinbun(g, w, h, ink, r) {   // 新聞：縦の行に小さな字のかたまり
    g.fillStyle = ink;
    for (let x = 4; x < w - 2; x += 8) {
      for (let y = 2; y < h; y += 7) {
        if (r() < 0.12) continue;
        g.globalAlpha = 0.25 + r() * 0.3;
        g.fillRect(x, y, 5, 5);
      }
    }
    g.globalAlpha = 0.65;
    g.fillRect(6, 10, 10, 46);   // 見出し
    g.globalAlpha = 1;
  },
  suminagashi(g, w, h, ink, r) {   // 墨流し：ゆらいだ輪が重なる
    g.strokeStyle = ink;
    for (let n = 0; n < 4; n++) {
      const cx = r() * w, cy = r() * h, ph = r() * 6;
      for (let k = 1; k <= 9; k++) {
        g.globalAlpha = 0.18 + (k % 3 === 0 ? 0.25 : 0.08);
        g.lineWidth = k % 3 === 0 ? 2.6 : 1.4;
        for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
          g.beginPath();
          for (let i = 0; i <= 48; i++) {
            const a = (i / 48) * Math.PI * 2, rr = k * 13 * (1 + 0.16 * Math.sin(a * 3 + ph + k * 0.4));
            const x = cx + dx + Math.cos(a) * rr, y = cy + dy + Math.sin(a) * rr * 0.8;
            if (i) g.lineTo(x, y); else g.moveTo(x, y);
          }
          g.stroke();
        }
      }
    }
    g.globalAlpha = 1;
  },
  kira(g, w, h, ink, r) {   // 雲母：きらっとした白い粒
    g.fillStyle = ink;
    for (let i = 0; i < 120; i++) { g.globalAlpha = 0.35 + r() * 0.55; const s = 0.8 + r() * 1.8; g.fillRect(r() * w, r() * h, s, s); }
    g.globalAlpha = 1;
  },
  kinpaku(g, w, h, ink, r) {   // 金箔：少しずつ色のちがう四角の箔と、さかいの線・小さなひび
    const n = 4, s = w / n, golds = ['#C9A445', '#D4B256', '#BF983A', '#DBBF66', '#C29E40'];
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      g.fillStyle = golds[Math.floor(r() * golds.length)];
      g.fillRect(i * s, j * s, s, s);
    }
    g.strokeStyle = ink; g.globalAlpha = 0.55; g.lineWidth = 1;
    for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(i * s, 0); g.lineTo(i * s, h); g.moveTo(0, i * s); g.lineTo(w, i * s); g.stroke(); }
    g.globalAlpha = 0.35;
    for (let i = 0; i < 10; i++) {
      const x = r() * w, y = r() * h;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 14, y + (r() - 0.5) * 14); g.lineTo(x + (r() - 0.5) * 20, y + (r() - 0.5) * 20); g.stroke();
    }
    g.fillStyle = '#F3E2A6'; g.globalAlpha = 0.5;
    for (let i = 0; i < 26; i++) g.fillRect(r() * w, r() * h, 1.5, 1.5);
    g.globalAlpha = 1;
  },
  hanabira(g, w, h, ink, r) {   // 桜の花びら（土俵）
    g.fillStyle = ink;
    for (let i = 0; i < 9; i++) {
      const x = r() * w, y = r() * h, a = r() * Math.PI * 2, s = 3 + r() * 3;
      for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) {
        g.save(); g.translate(x + dx, y + dy); g.rotate(a);
        g.beginPath(); g.ellipse(0, 0, s * 1.4, s * 0.8, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
    }
  },
};

// 紙質で塗るパターン。unitPx：紙の幅（物理の 1・切る紙の 300）が何 px か
export function paperFill(ctx, id, unitPx) {
  const P = PAPERS[id] || PAPERS[PAPER_DEFAULT];
  if (P.tex && TEX[P.tex]) return scaled(ctx, TEX[P.tex], (unitPx * (P.texSpan || 0.7)) / SPAN);
  const t = tile('p:' + (PAPERS[id] ? id : PAPER_DEFAULT), P.base, P.fiber == null ? 1 : P.fiber, P.pat, P.ink);
  return scaled(ctx, t, unitPx);
}
// 土俵の上の面のもよう（data/dohyo.js の top.pat）
export function patternFill(ctx, pat, base, ink, unitPx) {
  const t = tile('d:' + pat + base + ink, base, 0, pat, ink);
  return scaled(ctx, t, unitPx);
}
function scaled(ctx, t, unitPx) {
  const p = ctx.createPattern(t, 'repeat');
  const k = (unitPx * SPAN) / t.width;
  if (p.setTransform && typeof DOMMatrix !== 'undefined') p.setTransform(new DOMMatrix().scale(k, k));
  return p;
}
// 紙の地の色（小さな見本の色・暗くするとき）
export function paperBase(id) { return (PAPERS[id] || PAPERS[PAPER_DEFAULT]).base; }
