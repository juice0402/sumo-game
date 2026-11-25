// ボタンの絵：コードで描いた SVG を CSS の変数（--b-…）に入れる。
// 丸いピルのボタンはやめて、コンセプトアートのように「朱の筆の帯」「字の下の筆の線」「筆の輪」で。
// 見た目だけ（Math.sin・乱数を使ってよい）。形は rand の種で決まるので、毎回同じ。
import { COL, rand } from './ink.js';

const url = (svg) => `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
const n1 = (v) => v.toFixed(1);
const svgOf = (w, h, body, keep) =>
  `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'${keep ? '' : " preserveAspectRatio='none'"}>${body}</svg>`;

// 筆でひと塗りした帯（左は筆を置いたかすれ、右は毛先がすっと抜ける・上下に細い毛のすじ）
function brushBand(color, seed) {
  const r = rand(seed), W = 240, H = 64, top = [], bot = [];
  for (let i = 0; i <= 12; i++) {
    const x = 16 + (i / 12) * (W - 40), tail = i > 9 ? (i - 9) * 2 : 0;
    top.push([x, 9 + Math.sin(i * 0.9) * 1.6 + r() * 2.4 + tail]);
    bot.push([x, H - 8 - Math.sin(i * 0.7 + 1) * 1.6 - r() * 2.4 - tail * 1.1]);
  }
  let d = `M${n1(top[0][0])},${n1(top[0][1])}`;
  for (const p of top.slice(1)) d += `L${n1(p[0])},${n1(p[1])}`;
  d += `L${W - 6},${n1(H * 0.38)}L${W - 15},${n1(H * 0.45)}L${W - 2},${n1(H * 0.52)}L${W - 17},${n1(H * 0.6)}`;
  for (const p of bot.slice().reverse()) d += `L${n1(p[0])},${n1(p[1])}`;
  for (let i = 0; i <= 6; i++) d += `L${n1(i % 2 ? 2 + r() * 5 : 10 + r() * 5)},${n1(H - 10 - (i / 6) * (H - 20))}`;
  d += 'Z';
  const streak = (y, x0, x1, t) => `<path d='M${x0},${y}L${x1},${n1(y + 0.8)}L${x1},${n1(y + t)}L${x0},${n1(y + t - 0.5)}Z'/>`;
  return svgOf(W, H, `<g fill='${color}'><path d='${d}'/>${streak(5, 46, 150, 1.6)}${streak(H - 6, 70, 196, 1.4)}</g>`);
}

// 筆で描いた輪（丸いボタン用・少しはみ出して閉じる）
function inkRing(color, seed) {
  const r = rand(seed), c = 24, a0 = -2.2, sw = Math.PI * 2.1, pts = [];
  for (let i = 0; i <= 40; i++) {
    const u = i / 40, a = a0 + sw * u, rr = 20.5 + Math.sin(u * 7.3) * 0.7 + (r() - 0.5) * 0.4;
    pts.push(`${n1(c + Math.cos(a) * rr)},${n1(c + Math.sin(a) * rr)}`);
  }
  return svgOf(48, 48, `<path d='M${pts.join('L')}' fill='none' stroke='${color}' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'/>`, true);
}

// 筆で塗った丸（タイトルの朱の日の丸。ふちがかすれて、右上で筆が抜ける）
function brushDisc(color, seed) {
  const r = rand(seed), c = 100, pts = [];
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2, rr = 86 + Math.sin(a * 3 + 1) * 3 + (r() - 0.5) * 7 + (a > 5.2 ? (a - 5.2) * 9 : 0);
    pts.push(`${n1(c + Math.cos(a) * rr)},${n1(c + Math.sin(a) * rr)}`);
  }
  let dots = '';
  for (let i = 0; i < 14; i++) {
    const a = r() * Math.PI * 2, rr = 92 + r() * 8;
    dots += `<circle cx='${n1(c + Math.cos(a) * rr)}' cy='${n1(c + Math.sin(a) * rr)}' r='${n1(0.8 + r() * 2.2)}'/>`;
  }
  return svgOf(200, 200, `<g fill='${color}'><path d='M${pts.join('L')}Z'/>${dots}</g>`, true);
}

// 縦の筆の帯（縦書きのボタン用）：横の帯を90度まわしたもの
function brushBandV(color, seed) {
  const h = brushBand(color, seed).replace(/^<svg[^>]*>|<\/svg>$/g, '');
  return svgOf(64, 240, `<g transform='translate(64,0) rotate(90)'>${h}</g>`);
}

export function applyButtonArt() {
  const s = document.documentElement.style;
  s.setProperty('--b-shu', url(brushBand(COL.shu, 3)));
  s.setProperty('--b-shu2', url(brushBand('#c4493d', 3)));
  s.setProperty('--b-off', url(brushBand('#3a3631', 3)));
  s.setProperty('--b-paper', url(brushBand('#cfc8b8', 3)));   // 和紙の帯（切り直す）
  s.setProperty('--b-paper2', url(brushBand('#EEE9DE', 3)));
  s.setProperty('--b-line', url(brushBand('#cfc8b8', 8)));    // 字の下の筆の線（ふつうのボタン）
  s.setProperty('--b-lineshu', url(brushBand(COL.shu, 8)));
  s.setProperty('--b-ring', url(inkRing('#cfc8b8', 4)));
  s.setProperty('--b-sun', url(brushDisc(COL.shu, 6)));
  s.setProperty('--b-shuv', url(brushBandV(COL.shu, 5)));
}
