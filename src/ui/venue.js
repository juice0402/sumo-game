// 本場所の会場の飾り（見た目だけ・物理にさわらない）。舞台の書き割り：真横のカメラ（+z の側）から見る奥と手前だけ。
// 旋回のあいだは土俵だけ（暗い会場）。カメラが真横へもどるころに、奥と手前の観客が下から湧き、屋根と幕（または垂れ幕）・提灯が
// 上からストンと降り、明かりがパッとつく（11/27 しょーくん）。横綱は旋回のあいだ懸賞旗が回る。数と時間は data/venue.js。
// 絵は Codex（data/kaijoart.js・assets/art/kaijo-*）。まだない絵は、コードの切り絵で同じ動き。
// 軽く：観客は段ごとに1つの形にまとめて1回で描く（湧くあいだだけ形を書きかえる）・影は落とさない
// 11/27 空気感：観客がゆれて沸く・奥を金雲が流れる・明かりの中に紙のちり・勝てば紙吹雪・番付が上の相手に勝てば座布団が舞う
import { COL, rand, fiberPattern } from './ink.js';
import { VENUE, VL } from '../data/venue.js';
import { KAIJO_ART } from '../data/kaijoart.js';
import { T } from '../data/text.js';
import { artImages } from './art.js';
import { playSfx } from './sound.js';

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const TAU = Math.PI * 2;
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const BRUSH = '"Yuji Syuku","Hiragino Mincho ProN","Yu Mincho",serif';

// Codex の絵（使うときに1枚ずつ）。読みこむ前はコードの切り絵
let ART = {}, artLoad = null;
const CONF_IDS = ['ki-conf-shu', 'ki-conf-ai', 'ki-conf-kin', 'ki-conf-midori', 'ki-conf-kinari'];   // 紙吹雪は気の紙吹雪と同じ絵
export function loadVenueArt() {
  const ids = Object.values(KAIJO_ART).map((a) => a.id).concat(CONF_IDS);
  if (!ids.length) return Promise.resolve();
  if (!artLoad) artLoad = artImages(ids).then((m) => { ART = m; }).catch(() => { artLoad = null; });
  return artLoad;
}
export const venueArtCount = () => Object.keys(ART).length;
const art = (key) => (KAIJO_ART[key] && ART[KAIJO_ART[key].id] ? { img: ART[KAIJO_ART[key].id], ...KAIJO_ART[key] } : null);

// ---- コードの切り絵（絵が届くまで・届かないとき） ----
// 観客（前から）：着物・頭・顔の点・墨のふち。col＝着物の色
function personCanvas(g, ox, kind, col) {
  const s = kind === 2 ? 0.8 : 1, cx = ox + 48, b = 124, top = b - 62 * s, hr = 15 * s, hy = top - hr + 5 * s;
  const body = () => {
    g.beginPath(); g.moveTo(cx - 40 * s, b);
    g.bezierCurveTo(cx - 41 * s, b - 34 * s, cx - 34 * s, top + 4 * s, cx - 13 * s, top);
    g.lineTo(cx + 13 * s, top);
    g.bezierCurveTo(cx + 34 * s, top + 4 * s, cx + 41 * s, b - 34 * s, cx + 40 * s, b);
    g.closePath();
  };
  g.lineJoin = 'round';
  g.fillStyle = col; body(); g.fill();
  g.fillStyle = fiberPattern(g); g.fill();
  g.strokeStyle = 'rgba(238,233,222,0.55)'; g.lineWidth = 2;   // 襟
  g.beginPath(); g.moveTo(cx - 11 * s, top + 1); g.lineTo(cx, top + 18 * s); g.lineTo(cx + 11 * s, top + 1); g.stroke();
  g.strokeStyle = COL.sumi; g.lineWidth = 3.5; body(); g.stroke();
  g.fillStyle = '#d9c7a8'; g.beginPath(); g.arc(cx, hy, hr, 0, TAU); g.fill(); g.stroke();   // 顔
  g.fillStyle = '#2a2622'; g.beginPath(); g.arc(cx, hy - hr * 0.35, hr, Math.PI * 1.05, Math.PI * 1.95); g.fill();   // 髪
  if (kind === 1) { g.beginPath(); g.arc(cx, hy - hr - 4 * s, 7 * s, 0, TAU); g.fill(); }
  g.beginPath(); g.arc(cx - 5 * s, hy + 1, 1.6, 0, TAU); g.arc(cx + 5 * s, hy + 1, 1.6, 0, TAU); g.fill();
}
// 観客（うしろ姿）：肩と頭だけ
function backCanvas(g, ox, kind, col) {
  const s = kind === 2 ? 0.82 : 1, cx = ox + 48, b = 124, top = b - 58 * s, hr = 17 * s;
  const body = () => { g.beginPath(); g.moveTo(cx - 44 * s, b); g.bezierCurveTo(cx - 44 * s, top + 10 * s, cx - 30 * s, top, cx, top); g.bezierCurveTo(cx + 30 * s, top, cx + 44 * s, top + 10 * s, cx + 44 * s, b); g.closePath(); };
  g.fillStyle = col; body(); g.fill(); g.fillStyle = fiberPattern(g); g.fill();
  g.strokeStyle = COL.sumi; g.lineWidth = 3.5; body(); g.stroke();
  g.fillStyle = '#2a2622'; g.beginPath(); g.arc(cx, top - hr + 8 * s, hr, 0, TAU); g.fill(); g.stroke();
  if (kind === 1) { g.beginPath(); g.arc(cx, top - 2 * hr + 4 * s, 7 * s, 0, TAU); g.fill(); }
}
// コードの観客の絵：8人を横に並べた1枚と、1人ずつの四角
function codeCrowd(draw) {
  const n = 8, c = cv(96 * n, 128), g = c.getContext('2d'), rects = [];
  for (let i = 0; i < n; i++) { draw(g, i * 96, i % 3 === 2 ? 2 : i % 3, VL.clothes[i % VL.clothes.length]); rects.push([i * 96, 0, 96, 128]); }
  return { img: c, w: c.width, h: c.height, rects };
}

function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
// 紋（丸に三つ星の形）
function mon(g, x, y, r, col) {
  g.strokeStyle = col; g.lineWidth = Math.max(2, r * 0.14); g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke();
  g.fillStyle = col;
  for (let i = 0; i < 3; i++) { const a = -Math.PI / 2 + (i * TAU) / 3; g.beginPath(); g.arc(x + Math.cos(a) * r * 0.45, y + Math.sin(a) * r * 0.45, r * 0.3, 0, TAU); g.fill(); }
}
// 提灯
function lampCanvas(col) {
  const W = 64, H = 96, cx = W / 2, cy = 51, rx = 24, ry = 33, c = cv(W, H), g = c.getContext('2d');
  g.strokeStyle = COL.sumi; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, 14); g.stroke();
  const body = () => { g.beginPath(); g.ellipse(cx, cy, rx, ry, 0, 0, TAU); };
  body(); g.fillStyle = col; g.fill();
  g.save(); body(); g.clip();
  g.strokeStyle = 'rgba(32,30,27,0.26)'; g.lineWidth = 1.4;
  for (let y = cy - ry + 6; y < cy + ry; y += 7) { g.beginPath(); g.moveTo(0, y); g.quadraticCurveTo(cx, y + 3, W, y); g.stroke(); }
  g.fillStyle = col === VL.lampCol[0] ? COL.shu : VL.lampCol[0]; g.beginPath(); g.arc(cx, cy, 8, 0, TAU); g.fill();
  g.restore();
  g.strokeStyle = COL.sumi; g.lineWidth = 2.5; body(); g.stroke();
  g.fillStyle = COL.sumi; g.fillRect(cx - 13, 12, 26, 8); g.fillRect(cx - 13, H - 15, 26, 8);
  return c;
}
// 垂れ幕：上の竿・布（ひだ）・紋・下のふさ
function tareCanvas(col) {
  const W = 96, H = 224, c = cv(W, H), g = c.getContext('2d');
  g.fillStyle = COL.sumi; g.fillRect(0, 4, W, 8);
  const cloth = () => { g.beginPath(); g.moveTo(8, 12); g.lineTo(W - 8, 12); g.lineTo(W - 8, H - 20); g.lineTo(W / 2, H - 8); g.lineTo(8, H - 20); g.closePath(); };
  cloth(); g.fillStyle = col; g.fill();
  g.save(); cloth(); g.clip();
  g.globalAlpha = 0.7; g.fillStyle = fiberPattern(g); g.fillRect(0, 0, W, H); g.globalAlpha = 1;
  g.strokeStyle = 'rgba(32,30,27,0.3)'; g.lineWidth = 2;
  for (const x of [26, 48, 70]) { g.beginPath(); g.moveTo(x, 14); g.lineTo(x + 2, H); g.stroke(); }
  g.restore();
  mon(g, W / 2, 74, 20, COL.kin);
  g.strokeStyle = COL.sumi; g.lineWidth = 3; cloth(); g.stroke();
  return c;
}
// 四房
function fusaCanvas(col) {
  const W = 40, H = 160, cx = W / 2, c = cv(W, H), g = c.getContext('2d');
  const line = col === VL.fusa.nw ? VL.woodLine : COL.sumi;
  g.strokeStyle = line; g.lineWidth = 6; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, 60); g.stroke();
  g.strokeStyle = col; g.lineWidth = 3.5; g.beginPath(); g.moveTo(cx, 0); g.lineTo(cx, 60); g.stroke();
  const tassel = () => { g.beginPath(); g.moveTo(cx - 6, 70); g.lineTo(cx + 6, 70); g.lineTo(cx + 16, H - 3); g.lineTo(cx - 16, H - 3); g.closePath(); };
  tassel(); g.fillStyle = col; g.fill();
  g.save(); tassel(); g.clip();
  g.strokeStyle = 'rgba(32,30,27,0.3)'; g.lineWidth = 1;
  for (let i = -15; i <= 15; i += 3) { g.beginPath(); g.moveTo(cx + i * 0.35, 70); g.lineTo(cx + i, H); g.stroke(); }
  g.restore();
  g.strokeStyle = line; g.lineWidth = 2; tassel(); g.stroke();
  g.fillStyle = col; g.beginPath(); g.arc(cx, 66, 7, 0, TAU); g.fill(); g.stroke();
  return c;
}
// 紫の幕（水引幕）
function curtainCanvas(gold) {
  const W = 640, H = 80, c = cv(W, H), g = c.getContext('2d');
  const path = () => {
    g.beginPath(); g.moveTo(0, 0); g.lineTo(W, 0); g.lineTo(W, H - 14);
    for (let i = 3; i > 0; i--) { const x0 = (i * W) / 3, x1 = ((i - 1) * W) / 3; g.quadraticCurveTo((x0 + x1) / 2, H + 8, x1, H - 14); }
    g.closePath();
  };
  path(); g.fillStyle = VL.curtain; g.fill();
  g.save(); path(); g.clip();
  g.fillStyle = fiberPattern(g); g.fillRect(0, 0, W, H);
  g.strokeStyle = VL.curtainFold; g.lineWidth = 3;
  for (let x = 20; x < W; x += 40) { g.beginPath(); g.moveTo(x, 8); g.lineTo(x + 4, H); g.stroke(); }
  g.fillStyle = gold ? COL.kin : '#2e1f3d'; g.fillRect(0, 0, W, 8);
  g.restore();
  mon(g, W / 2, H / 2 - 1, 21, gold ? '#dcc27a' : COL.kin);
  g.strokeStyle = COL.sumi; g.lineWidth = 3; path(); g.stroke();
  return c;
}
// 懸賞旗を持つ呼出（横綱）
function kenshoCanvas(c, name, bg, ink) {
  const W = 128, H = 512, g = c.getContext('2d');
  c.width = W; c.height = H;
  g.clearRect(0, 0, W, H);
  g.lineJoin = 'round';
  g.strokeStyle = COL.sumi; g.lineWidth = 5; g.beginPath(); g.moveTo(W / 2, 14); g.lineTo(W / 2, 372); g.stroke();
  g.strokeStyle = '#8a6e45'; g.lineWidth = 2.5; g.beginPath(); g.moveTo(W / 2, 14); g.lineTo(W / 2, 372); g.stroke();
  g.fillStyle = COL.sumi; g.fillRect(12, 18, W - 24, 7);
  const x0 = 16, x1 = W - 16, y0 = 25, y1 = 268;
  g.fillStyle = bg; g.fillRect(x0, y0, x1 - x0, y1 - y0);
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip();
  g.globalAlpha = 0.6; g.fillStyle = fiberPattern(g); g.fillRect(x0, y0, x1 - x0, y1 - y0); g.globalAlpha = 1;
  g.restore();
  g.strokeStyle = ink; g.globalAlpha = 0.55; g.lineWidth = 2; g.strokeRect(x0 + 6, y0 + 6, x1 - x0 - 12, y1 - y0 - 12); g.globalAlpha = 1;
  const ch = Array.from(name), room = y1 - y0 - 28, fs = Math.min(64, (room / ch.length) * 0.94);
  g.fillStyle = ink; g.font = `${fs}px ${BRUSH}`; g.textAlign = 'center'; g.textBaseline = 'middle';
  ch.forEach((t, i) => g.fillText(t, W / 2, y0 + 14 + (room / ch.length) * (i + 0.5)));
  g.strokeStyle = COL.sumi; g.lineWidth = 3; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
  const body = () => { g.beginPath(); g.moveTo(W / 2 - 22, 318); g.lineTo(W / 2 + 22, 318); g.lineTo(W / 2 + 36, H - 4); g.lineTo(W / 2 - 36, H - 4); g.closePath(); };
  g.fillStyle = VL.yobidashi; body(); g.fill(); g.strokeStyle = COL.sumi; g.lineWidth = 3; body(); g.stroke();
  g.lineCap = 'round';
  for (const [w, col] of [[11, COL.sumi], [7, VL.yobidashi]]) {
    g.strokeStyle = col; g.lineWidth = w;
    g.beginPath(); g.moveTo(W / 2 - 18, 326); g.lineTo(W / 2 - 4, 352); g.moveTo(W / 2 + 18, 326); g.lineTo(W / 2 + 4, 344); g.stroke();
  }
  g.fillStyle = '#3a332d'; g.beginPath(); g.arc(W / 2, 300, 17, 0, TAU); g.fill(); g.strokeStyle = COL.sumi; g.lineWidth = 3; g.stroke();
  return c;
}

// lv：番付の順（0 序ノ口〜9 横綱）。もどり値の group.userData：time(秒)→明かり（0〜1・パッのときは少し上）・free()
// 金雲（屏風の金の雲・絵が届くまで）：丸い波のふちの横長の帯。墨のふち・金箔の砂子
function kumoCanvas(i) {
  const W = 512, H = 128, c = cv(W, H), g = c.getContext('2d'), rr = rand(31 + i * 7);
  const len = [0.95, 0.7, 0.55, 0.82, 0.6][i % 5], x0 = (W * (1 - len)) / 2, x1 = W - x0, step = i % 2 ? [0.55, 0.45] : null;
  const shape = (grow) => {
    g.beginPath();
    const top = (x) => (step && x > x0 + (x1 - x0) * step[0] ? 34 : 50), bot = (x) => (step && x < x0 + (x1 - x0) * step[1] ? 94 : 82);
    g.rect(x0 + 18 - grow, top(x0) - grow, x1 - x0 - 36 + grow * 2, bot(x0) - top(x0) + grow * 2);
    for (let x = x0 + 18; x <= x1 - 18; x += 30) {
      const rt = 16 + rr() * 6, rb = 13 + rr() * 5;
      g.moveTo(x + rt + grow, top(x)); g.arc(x, top(x), rt + grow, 0, TAU);
      g.moveTo(x + rb + grow, bot(x)); g.arc(x, bot(x), rb + grow, 0, TAU);
    }
    g.moveTo(x0 + 18 + grow, (top(x0) + bot(x0)) / 2); g.arc(x0 + 18, (top(x0) + bot(x0)) / 2, (bot(x0) - top(x0)) / 2 + grow, 0, TAU);
    g.moveTo(x1 - 18 + (bot(x1) - top(x1)) / 2 + grow, (top(x1) + bot(x1)) / 2); g.arc(x1 - 18, (top(x1) + bot(x1)) / 2, (bot(x1) - top(x1)) / 2 + grow, 0, TAU);
  };
  g.fillStyle = VL.kumo.ink; shape(3); g.fill('nonzero');
  g.fillStyle = VL.kumo.col; shape(0); g.fill('nonzero');
  g.fillStyle = fiberPattern(g); shape(0); g.fill('nonzero');
  g.save(); shape(0); g.clip('nonzero');
  for (let k = 0; k < 90; k++) { g.fillStyle = rr() < 0.5 ? '#d8bd72' : '#9c8240'; g.fillRect(x0 + rr() * (x1 - x0), 20 + rr() * 90, 2 + rr() * 5, 2 + rr() * 4); }   // 金箔の砂子
  g.restore();
  return c;
}
// 座布団（絵が届くまで）：真上から見た四角・ふちの縫い目・まん中と四すみの房
function zabutonCanvas(col) {
  const c = cv(128, 128), g = c.getContext('2d');
  rrect(g, 8, 8, 112, 112, 16); g.fillStyle = col; g.fill(); g.fillStyle = fiberPattern(g); g.fill();
  g.strokeStyle = COL.sumi; g.lineWidth = 4; g.stroke();
  g.setLineDash([6, 5]); g.strokeStyle = 'rgba(238,233,222,0.55)'; g.lineWidth = 2; rrect(g, 20, 20, 88, 88, 10); g.stroke(); g.setLineDash([]);
  g.fillStyle = '#d8bd72'; g.strokeStyle = COL.sumi; g.lineWidth = 2;
  g.beginPath(); g.arc(64, 64, 7, 0, TAU); g.fill(); g.stroke();
  for (const [x, y] of [[14, 14], [114, 14], [114, 114], [14, 114]]) { g.beginPath(); g.arc(x, y, 5, 0, TAU); g.fill(); g.stroke(); }
  return c;
}
// 紙吹雪の絵：気の紙吹雪（Codex）を横に5つ並べた1枚。なければコードの紙の四角
function confAtlas() {
  const imgs = CONF_IDS.map((id) => ART[id]);
  if (imgs.every(Boolean)) {
    const c = cv(112 * 5, 96), g = c.getContext('2d');
    imgs.forEach((im, i) => g.drawImage(im, i * 112 + (112 - im.width) / 2, (96 - im.height) / 2));
    return { img: c, n: 5, ar: 96 / 112 };
  }
  const c = cv(64 * 5, 40), g = c.getContext('2d');
  VL.conf.col.forEach((col, i) => { g.fillStyle = col; g.fillRect(i * 64 + 4, 4, 56, 32); g.fillStyle = fiberPattern(g); g.fillRect(i * 64 + 4, 4, 56, 32); g.strokeStyle = COL.sumi; g.lineWidth = 2; g.strokeRect(i * 64 + 4, 4, 56, 32); });
  return { img: c, n: 5, ar: 40 / 64 };
}
// 光の中のちり：紙の小さなかけら（光る輪ではない）
function chiriCanvas() {
  const c = cv(32, 32), g = c.getContext('2d');
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(9, 7); g.lineTo(24, 10); g.lineTo(26, 22); g.lineTo(14, 26); g.lineTo(6, 18); g.closePath(); g.fill();
  g.strokeStyle = 'rgba(32,30,27,0.35)'; g.lineWidth = 2; g.stroke();
  return c;
}

export function buildVenue(THREE, lv) {
  const V = VENUE[Math.max(0, Math.min(VENUE.length - 1, lv))];
  const group = new THREE.Group();
  const trash = [];
  const k = (o) => { trash.push(o); return o; };
  const tex = (c) => { const t = k(new THREE.CanvasTexture(c)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const r = rand(97 + lv * 13);
  const lit = [];   // 明かりで明るさが変わる材質
  const shifts = {}; let roofBand = 0;   // 画面の上のはしに合わせて上下にずらす群れ（layout）
  const timers = []; // time(秒) ごとに動かすもの
  const tickers = [];   // 毎こま動かすもの（ゆれ・雲・ちり・紙吹雪・座布団）。mood.clock＝会場の時計（秒）
  const mood = { clock: 0, at: -99, hop: 0, stand: 0 };

  // ---- 観客（奥・手前）：段ごとに1つの形。1人＝四角1つ。湧くあいだは、四角の上のはしと絵の切り口を上げていく ----
  function crowd(atlas, rows) {
    const figs = [];
    for (const row of rows) for (const f of row.figs) figs.push({ ...f, row });
    if (!figs.length) return;
    const n = figs.length, pos = new Float32Array(n * 12), uv = new Float32Array(n * 8), col = new Float32Array(n * 12), idx = [];
    const t = k(new THREE.CanvasTexture(atlas.img)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    figs.forEach((f, i) => {
      const [rx, ry, rw, rh] = atlas.rects[f.pick % atlas.rects.length];
      f.u0 = rx / atlas.w; f.u1 = (rx + rw) / atlas.w; f.v0 = 1 - (ry + rh) / atlas.h; f.v1 = 1 - ry / atlas.h;
      if (f.flip) [f.u0, f.u1] = [f.u1, f.u0];
      f.w = (f.h * rw) / rh;
      for (let j = 0; j < 4; j++) col.set([f.shade, f.shade, f.shade], i * 12 + j * 3);
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
    });
    const geo = k(new THREE.BufferGeometry());
    const pa = new THREE.BufferAttribute(pos, 3), ua = new THREE.BufferAttribute(uv, 2);
    pa.setUsage(THREE.DynamicDrawUsage); ua.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pa); geo.setAttribute('uv', ua); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.setIndex(idx);
    const mat = k(new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, vertexColors: true, fog: false, side: THREE.DoubleSide }));
    mat.userData.lit = VL.crowdLit;
    lit.push(mat);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    let last = -1, cur = 0;
    for (const f of figs) { f.ph = r() * TAU; f.sp = 1.6 + r() * 2.2; f.dl = r() * 0.18; f.jr = 2.1 + r() * 0.9; f.st = r(); }
    // ゆれ（上へ伸びる・左右にかたむく。下のはしは動かさない＝すきまが見えない）と、沸く（はねる・立ち上がる）
    // 毎こま動くので、配列を作らずに直接書く（11/27 の最適化・スマホで GC のひっかかりを出さない）
    let lift = 0, lean = 0, uvDone = false;   // uvDone：みな座りきった（絵の切り口はもう変わらない）
    const motion = (f) => {
      const c = mood.clock;
      lift = VL.sway * (0.5 + 0.5 * Math.sin(c * f.sp + f.ph));
      lean = VL.lean * Math.sin(c * f.sp * 0.55 + f.ph * 1.7);
      const e = c - mood.at - f.dl;
      if (e > 0 && e < VL.cheerSec) {
        lift += mood.hop * Math.abs(Math.sin(e * Math.PI * f.jr)) * Math.exp(-e / 1.1);
        if (f.st < mood.stand) lift += VL.standH * smooth(0, 0.3, e) * (1 - smooth(VL.cheerSec - 0.8, VL.cheerSec, e));
      }
    };
    // p：0＝床の下（見えない）→ 1＝座りきった。上のはしと絵の切り口がいっしょに上がる＝床の切れ目から湧いてくる
    const place = (tt) => {
      let rising = false;
      for (let i = 0; i < n; i++) {
        const f = figs[i];
        const a = clamp01((tt - f.t0) / VL.t.rise), p = 1 - (1 - a) ** 3, hop = a >= 1 ? 0 : Math.sin(Math.PI * a) * 0.04;
        if (a < 1) rising = true;
        if (p > 0) motion(f); else lift = lean = 0;
        const x0 = f.x - f.w / 2, x1 = f.x + f.w / 2, y0 = f.y + hop, y1 = f.y + f.h * p + hop + lift * p, z = f.z, xl = lean * p, o = i * 12;
        pos[o] = x0; pos[o + 1] = y0; pos[o + 2] = z; pos[o + 3] = x1; pos[o + 4] = y0; pos[o + 5] = z;
        pos[o + 6] = x1 + xl; pos[o + 7] = y1; pos[o + 8] = z; pos[o + 9] = x0 + xl; pos[o + 10] = y1; pos[o + 11] = z;
        if (!uvDone) {
          const vb = f.v1 - (f.v1 - f.v0) * p, u = i * 8;   // 下のはしの絵の位置（見えているのは上から p の分）
          uv[u] = f.u0; uv[u + 1] = vb; uv[u + 2] = f.u1; uv[u + 3] = vb; uv[u + 4] = f.u1; uv[u + 5] = f.v1; uv[u + 6] = f.u0; uv[u + 7] = f.v1;
        }
      }
      pa.needsUpdate = true;
      if (!uvDone) { ua.needsUpdate = true; uvDone = !rising; }
    };
    timers.push((tt) => {
      cur = Math.min(tt, 99);
      if (cur < last) uvDone = false;   // 次の一番（旋回のはじめから湧きなおす）
      if (cur === last) return;
      if (last >= 99 && cur >= 99) return;
      place(cur);
      last = cur;
    });
    tickers.push(() => place(cur));
  }
  const pickRows = (zs, ys, shades, count, fill, span, step, h, t0, t1) => {
    const rows = [];
    for (let i = 0; i < count; i++) {
      const figs = [];
      for (let x = -span + (i % 2 ? step / 2 : 0); x <= span; x += step) {
        if (r() >= fill) continue;
        figs.push({ x: x + (r() - 0.5) * step * 0.25, y: ys[i], z: zs[i] + (r() - 0.5) * 0.06, h: h * (0.94 + r() * 0.12), pick: Math.floor(r() * 99), flip: r() < 0.5,
          shade: shades[i] * (0.92 + r() * 0.08), t0: t0 + i * 0.1 + r() * Math.max(0.05, t1 - t0 - VL.t.rise - i * 0.1) });
      }
      rows.push({ figs });
    }
    return rows;
  };
  if (V.back[0]) {
    const atlas = art('kankyaku') || codeCrowd(personCanvas);
    crowd(atlas, pickRows(VL.backZ, VL.backY, VL.rowShade, V.back[0], V.back[1], VL.spanX, VL.seat, VL.personH, VL.t.back[0], VL.t.back[1]));
  }
  if (V.front[0]) {
    const atlas = art('ushiro') || codeCrowd(backCanvas);
    crowd(atlas, pickRows(VL.frontZ, VL.frontZ.map(() => 0), VL.frontShade, V.front[0], V.front[1], 3.4, 0.5, VL.frontH, VL.t.front[0], VL.t.front[1]));
  }

  // ---- 上から降りるもの（屋根と幕・垂れ幕・提灯）：ストン（だんだん速く落ちて、最後に少しはねる） ----
  const drop = (obj, t0, t1, from) => {
    obj.visible = false;
    timers.push((tt) => {
      obj.visible = tt >= t0;
      if (!obj.visible) return;
      const a = clamp01((tt - t0) / (t1 - t0));
      const fall = a < 0.8 ? 1 - (a / 0.8) ** 2 : 0, bounce = a < 0.8 ? 0 : Math.sin(((a - 0.8) / 0.2) * Math.PI) * 0.05;
      obj.position.y = from * fall + bounce;
    });
  };
  // 1枚の絵の中の1つの部品だけを使うテクスチャ（絵はいっしょ＝GPU へ送るのは1回）
  const regionBase = {};
  const region = (a, i) => {
    const [x, y, w, h] = a.rects[i];
    if (!regionBase[a.id]) regionBase[a.id] = tex(a.img);
    const t = k(regionBase[a.id].clone());
    t.repeat.set(w / a.w, h / a.h); t.offset.set(x / a.w, 1 - (y + h) / a.h);
    return { t, w, h };
  };
  const basic = (map, opt = {}) => { const m = k(new THREE.MeshBasicMaterial({ map, alphaTest: 0.5, side: THREE.DoubleSide, fog: false, ...opt })); lit.push(m); return m; };
  const plane = (map, w, h) => new THREE.Mesh(k(new THREE.PlaneGeometry(w, h)), basic(map));

  if (V.roof) {
    const R = VL.roofHalf, y0 = VL.roofY, H = VL.curtainH, gold = V.roof > 1, roof = new THREE.Group();
    const a = art('yane');
    roofBand = H;
    if (a) {
      // 絵の吊り屋根：幕の下のふち（a.curtain＝上からの割合）を roofY に、幕の幅（a.span＝横の割合）を 2R に合わせる
      const w = (2 * R) / a.span, h = (w * a.h) / a.w, m = plane(tex(a.img), w, h);
      roofBand = h * (a.curtain - a.band);
      m.position.set(0, y0 - h * (0.5 - a.curtain), 0.2);
      roof.add(m);
    } else {
      const cm = basic(tex(curtainCanvas(gold)));
      const cg = k(new THREE.PlaneGeometry(2 * R, H));
      for (let i = 0; i < 4; i++) {
        const ang = (i * Math.PI) / 2, m = new THREE.Mesh(cg, cm);
        m.position.set(Math.sin(ang) * R, y0 + H / 2, Math.cos(ang) * R);
        m.rotation.y = ang;
        roof.add(m);
      }
      const wm = k(new THREE.MeshLambertMaterial({ color: VL.wood })), lm = k(new THREE.LineBasicMaterial({ color: gold ? COL.kin : VL.woodLine }));
      const eg = k(new THREE.BoxGeometry(2 * R + 0.3, 0.14, 2 * R + 0.3)), eaves = new THREE.Mesh(eg, wm);
      eaves.position.y = y0 + H + 0.07;
      eaves.add(new THREE.LineSegments(k(new THREE.EdgesGeometry(eg)), lm));
      roof.add(eaves);
      const shape = new THREE.Shape([new THREE.Vector2(-R - 0.3, 0), new THREE.Vector2(R + 0.3, 0), new THREE.Vector2(0, 0.6)]);
      const rg = k(new THREE.ExtrudeGeometry(shape, { depth: 2 * R + 0.5, bevelEnabled: false })); rg.translate(0, 0, -(R + 0.25));
      const top = new THREE.Mesh(rg, wm);
      top.position.y = y0 + H + 0.14;
      top.add(new THREE.LineSegments(k(new THREE.EdgesGeometry(rg)), lm));
      roof.add(top);
      for (const [id, sx, sz] of [['ne', -1, 1], ['se', -1, -1], ['sw', 1, -1], ['nw', 1, 1]]) {
        const sp = new THREE.Sprite(k(new THREE.SpriteMaterial({ map: tex(fusaCanvas(VL.fusa[id])), alphaTest: 0.5, fog: false })));
        lit.push(sp.material);
        sp.center.set(0.5, 1); sp.scale.set(VL.fusaLen * 0.25, VL.fusaLen, 1); sp.position.set(sx * R, y0 + 0.03, sz * R);
        roof.add(sp);
      }
    }
    const holder = new THREE.Group(); holder.add(roof); group.add(holder);
    drop(holder, VL.t.drop[0], VL.t.drop[1], 3);
    shifts.roof = roof;
  } else if (V.tare) {
    const tg = new THREE.Group(), tin = new THREE.Group(), kz = art('kazari');
    for (let i = 0; i < V.tare; i++) {
      // 絵の垂れ幕（kazari の右の3つ：紫・えんじ・藍）か、コードの垂れ幕
      const g = kz ? region(kz, 3 + (i % 3)) : { t: tex(tareCanvas(VL.tareCol[i % VL.tareCol.length])), w: 96, h: 224 };
      const h = (VL.tareW * g.h) / g.w, m = plane(g.t, VL.tareW, h);
      m.position.set(VL.tareX[i], VL.tareTop - h / 2, VL.tareZ);
      tin.add(m);
    }
    tg.add(tin); group.add(tg);
    shifts.tare = tin;
    drop(tg, VL.t.drop[0], VL.t.drop[1], 2.5);
  }

  if (V.lamp) {
    // 提灯：絵（kazari の左の3つ：白に朱の丸・朱・生成りに藍の丸）か、コードの提灯（和紙・朱）。どれも同じ高さ
    const kz = art('kazari');
    const looks = kz ? [0, 1, 2].map((i) => region(kz, i)) : VL.lampCol.map((c) => ({ t: tex(lampCanvas(c)), w: 64, h: 96 }));
    const lg = new THREE.Group(), lin = new THREE.Group(), mats = looks.map((g) => k(new THREE.SpriteMaterial({ map: g.t, alphaTest: 0.5, fog: false })));
    const lampW = looks.map((g) => (VL.lampSize * 1.5 * g.w) / g.h);
    const pts = [];
    for (let i = 0; i < V.lamp; i++) {
      const L = VL.lampRows[i], N = VL.lampN, half = ((N - 1) / 2) * VL.lampStep + 0.6;
      const ropeY = (x) => L.y + 0.2 - 0.16 * (1 - (x / half) ** 2);
      for (let x = -half; x < half - 1e-6; x += 0.25) pts.push(x, ropeY(x), L.z, Math.min(half, x + 0.25), ropeY(Math.min(half, x + 0.25)), L.z);
      for (let j = 0; j < N; j++) {
        const x = (j - (N - 1) / 2) * VL.lampStep + L.off, li = kz ? (i + j) % 3 : (i + j) % 3 === 2 ? 1 : 0, sp = new THREE.Sprite(mats[li]);
        sp.center.set(0.5, 1); sp.scale.set(lampW[li], VL.lampSize * 1.5, 1); sp.position.set(x, ropeY(x) + 0.02, L.z);
        lin.add(sp);
      }
    }
    const rg = k(new THREE.BufferGeometry()); rg.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const rm = k(new THREE.LineBasicMaterial({ color: VL.rope, fog: false })); lit.push(rm);
    lin.add(new THREE.LineSegments(rg, rm));
    lg.add(lin); group.add(lg);
    shifts.lamp = lin;
    drop(lg, VL.t.lamp[0], VL.t.lamp[1], 2.2);   // 提灯は明かりの前から灯っている（明るさは変えない）
  }

  // ---- 懸賞旗（横綱）：呼出が持って、旋回のあいだ土俵のまわりの四角をゆっくり回る。真横へ降りる前にすっと消える ----
  if (V.kensho) {
    const parade = new THREE.Group(), banners = [], names = T.kensho || [];
    for (let i = 0; i < V.kensho; i++) {
      const [bg, ink] = VL.kenshoCol[i % VL.kenshoCol.length], name = names[i % names.length] || '', c = cv(128, 512);
      kenshoCanvas(c, name, bg, ink);
      const map = tex(c), mat = k(new THREE.SpriteMaterial({ map, transparent: true, alphaTest: 0.02 }));
      if (document.fonts && !document.fonts.check(`40px ${BRUSH}`)) {   // 筆の字が読みこめてから書きなおす
        document.fonts.load(`40px ${BRUSH}`, name).then(() => { kenshoCanvas(c, name, bg, ink); map.needsUpdate = true; }).catch(() => {});
      }
      const sp = new THREE.Sprite(mat);
      sp.center.set(0.5, 0); sp.scale.set(VL.kenshoW, VL.kenshoH, 1);
      parade.add(sp); banners.push(sp);
    }
    group.add(parade);
    const D = VL.kenshoD, per = 8 * D;
    const onLoop = (s) => {   // うしろ → 右 → 前 → 左 の四角
      s = ((s % per) + per) % per;
      const side = Math.floor(s / (2 * D)), t = s - side * 2 * D - D;
      return side === 0 ? [t, -D] : side === 1 ? [D, t] : side === 2 ? [-t, D] : [-D, -t];
    };
    timers.push((tt) => {
      const fade = smooth(VL.kenshoOut[0], VL.kenshoOut[1], tt);
      parade.visible = fade < 1;
      if (!parade.visible) return;
      banners.forEach((sp, i) => {
        const [x, z] = onLoop((i * per) / banners.length + tt * VL.kenshoSpeed);
        sp.position.set(x, 0, z);
        sp.material.opacity = 1 - fade;
      });
    });
  }

  // ---- 金雲（屏風の金の雲）：観客のうしろを、ゆっくり横へ流れる。明かりといっしょに、左右から寄ってきて見えてくる ----
  if (V.kumo) {
    const K = VL.kumo, a = art('kumo'), clouds = new THREE.Group();
    for (let i = 0; i < V.kumo; i++) {
      let map, h;
      const w = K.w[i % K.w.length];
      if (a) { const rg = region(a, i % a.rects.length); map = rg.t; h = (w * rg.h) / rg.w; } else { const c = kumoCanvas(i); map = tex(c); h = (w * c.height) / c.width; }
      const m = k(new THREE.MeshBasicMaterial({ map, transparent: true, depthWrite: false, side: THREE.DoubleSide, fog: false, opacity: 0 }));
      m.userData.lit = K.shade; lit.push(m);
      const mesh = new THREE.Mesh(k(new THREE.PlaneGeometry(w, h)), m);
      mesh.position.set(K.x[i % K.x.length], K.y[i % K.y.length], K.z[i % K.z.length]);
      mesh.userData.x0 = mesh.position.x; mesh.userData.w = w;
      clouds.add(mesh);
    }
    group.add(clouds);
    let show = 0;
    timers.push((tt) => { show = smooth(K.t[0], K.t[1], tt); });
    tickers.push(() => {
      clouds.children.forEach((c, i) => {
        const dir = i % 2 ? -1 : 1, W = K.span + c.userData.w / 2;
        let x = c.userData.x0 + mood.clock * K.speed * dir * (0.7 + 0.15 * i);
        x = ((((x + W) % (2 * W)) + 2 * W) % (2 * W)) - W;
        c.position.x = x - (1 - show) * 0.9 * dir;
        c.material.opacity = show;
        c.visible = show > 0;
      });
    });
  }

  // ---- 光の中のちり：明かりがパッとついたあと、土俵の上の光の中を、紙の小さなかけらがゆっくり落ちる ----
  {
    const C = VL.chiri, n = Math.round(C.n * (0.5 + (0.5 * lv) / 9)), pos = new Float32Array(n * 3), dots = [];
    for (let i = 0; i < n; i++) {
      const y = C.y[0] + r() * (C.y[1] - C.y[0]), half = 0.45 + (C.y[1] + 0.3 - y) * 0.38;
      dots.push({ x: (r() * 2 - 1) * half, y, z: -0.7 + r() * 1.9, ph: r() * TAU, sp: 0.3 + r() * 0.5, fall: C.fall * (0.6 + r() * 0.8) });
    }
    const geo = k(new THREE.BufferGeometry()), pa = new THREE.BufferAttribute(pos, 3);
    pa.setUsage(THREE.DynamicDrawUsage); geo.setAttribute('position', pa);
    const mat = k(new THREE.PointsMaterial({ size: C.size, map: tex(chiriCanvas()), color: C.col, transparent: true, depthWrite: false, opacity: 0, fog: false }));
    const pts = new THREE.Points(geo, mat);
    pts.frustumCulled = false; pts.visible = false;
    group.add(pts);
    let show = 0;
    timers.push((tt) => { show = smooth(VL.t.light, VL.t.light + C.inSec, tt); });
    tickers.push((dt) => {
      pts.visible = show > 0;
      if (!pts.visible) return;
      mat.opacity = show * C.opacity;
      dots.forEach((d, i) => {
        d.y -= d.fall * dt;
        if (d.y < C.y[0]) d.y = C.y[1];
        pos[i * 3] = d.x + 0.07 * Math.sin(mood.clock * d.sp + d.ph);
        pos[i * 3 + 1] = d.y;
        pos[i * 3 + 2] = d.z + 0.04 * Math.sin(mood.clock * d.sp * 0.7 + d.ph * 2);
      });
      pa.needsUpdate = true;
    });
  }

  // ---- 紙吹雪（勝ったとき）：上から舞い落ちる。くるくる回り、ひらひら裏返る。土俵に落ちたものはそのまま残る ----
  const CF = VL.conf, confN = V.conf, confP = [];
  let confAt = -1, confMesh = null, confPos = null, confLive = 0;   // confLive：まだ落ちている（落ちる前の）紙吹雪の数。0 になったら止める
  if (confN) {
    const at = confAtlas(), t = tex(at.img);
    confPos = new Float32Array(confN * 12);
    const uv = new Float32Array(confN * 8), idx = [];
    for (let i = 0; i < confN; i++) {
      const c = i % at.n, u0 = c / at.n, u1 = (c + 1) / at.n;
      uv.set([u0, 0, u1, 0, u1, 1, u0, 1], i * 8);
      idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
      confP.push({ ar: at.ar });
    }
    const geo = k(new THREE.BufferGeometry()), pa = new THREE.BufferAttribute(confPos, 3);
    pa.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pa); geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); geo.setIndex(idx);
    confMesh = new THREE.Mesh(geo, k(new THREE.MeshBasicMaterial({ map: t, alphaTest: 0.5, side: THREE.DoubleSide, fog: false })));
    confMesh.frustumCulled = false; confMesh.visible = false;
    group.add(confMesh);
    tickers.push(() => {
      if (confAt < 0 || !confLive) return;
      const now = mood.clock - confAt;
      let live = 0;
      confP.forEach((p, i) => {
        let e = now - p.t0;
        if (e < 0) { confPos.fill(0, i * 12, i * 12 + 12); live++; return; }
        let y = p.y0 - p.vy * e, fl = Math.cos(p.fph + p.fs * e);
        if (p.land >= 0 || (y < 0.72 && Math.abs(p.x0) < 1.35 && Math.abs(p.z) < 1.3)) {   // 土俵に落ちた
          if (p.land < 0) p.land = e;
          e = p.land; y = 0.715 + p.lay; fl = 0.22;
        } else if (y < -0.4) { confPos.fill(0, i * 12, i * 12 + 12); return; } else live++;
        const x = p.x0 + 0.14 * Math.sin(e * p.sp + p.ph), ang = p.rot + p.rs * e, c = Math.cos(ang), s = Math.sin(ang);
        const hw = p.s / 2, hh = (p.s * p.ar) / 2 * fl, ax = hw * c, ay = hw * s, bx = -hh * s, by = hh * c, o = i * 12;   // 四すみ＝まん中 ±a ±b（配列を作らない）
        confPos[o] = x - ax - bx; confPos[o + 1] = y - ay - by; confPos[o + 2] = p.z;
        confPos[o + 3] = x + ax - bx; confPos[o + 4] = y + ay - by; confPos[o + 5] = p.z;
        confPos[o + 6] = x + ax + bx; confPos[o + 7] = y + ay + by; confPos[o + 8] = p.z;
        confPos[o + 9] = x - ax + bx; confPos[o + 10] = y - ay + by; confPos[o + 11] = p.z;
      });
      confLive = live;
      pa.needsUpdate = true;
    });
  }

  // ---- 座布団の舞（番付が上の相手に勝ったとき）：手前と奥の客席から、くるくる回りながら土俵へ飛んで、平らに落ちる ----
  const ZB = VL.zabuton, zabs = [];
  let zabAt = -1, zabN = 0;
  {
    const a = art('zabuton'), maps = [];
    for (let i = 0; i < 4; i++) maps.push(a ? region(a, i % a.rects.length).t : tex(zabutonCanvas(ZB.col[i])));
    for (let i = 0; i < ZB.n[1]; i++) {
      const m = new THREE.Mesh(k(new THREE.PlaneGeometry(ZB.size, ZB.size)), k(new THREE.MeshBasicMaterial({ map: maps[i % 4], alphaTest: 0.5, side: THREE.DoubleSide, fog: false })));
      m.visible = false;
      group.add(m);
      zabs.push({ m });
    }
    tickers.push(() => {
      if (zabAt < 0) return;
      const now = mood.clock - zabAt;
      zabs.forEach((z, i) => {
        if (i >= zabN) { z.m.visible = false; return; }
        const u = clamp01((now - z.t0) / z.d);
        z.m.visible = now >= z.t0;
        if (!z.m.visible) return;
        const q = u;
        z.m.position.set(z.s[0] + (z.e[0] - z.s[0]) * q, z.s[1] + (z.e[1] - z.s[1]) * q + 4 * z.h * q * (1 - q), z.s[2] + (z.e[2] - z.s[2]) * q);
        if (u < 1) z.m.rotation.set(-Math.PI / 2 + z.tilt * Math.sin(now * z.tum + i), z.wob * Math.sin(now * 3.1 + i), z.rz + z.spin * u);   // くるくる・ひらりと面を見せる
        else {
          z.m.position.y += 0.03;
          z.m.rotation.set(-Math.PI / 2 + 0.18, 0, z.rz + z.spin);   // 少しかたむいて重なる（真横から見ても座布団に見える）
          if (!z.landed) { z.landed = true; if (i < 4) playSfx('suton', { vol: 0.16, rate: 1.5 + i * 0.1 }); }
        }
      });
    });
  }

  // ---- 沸く・決着の演出（bout がよぶ）・音の合図 ----
  // kind：'clash'（はじめてぶつかった）・'end'（決着）。o：{ win（自分の勝ち）, conf（紙吹雪）, zabuton（座布団の数） }
  group.userData.cheer = (kind, o = {}) => {
    mood.at = mood.clock;
    mood.hop = kind === 'end' ? VL.hop.end : VL.hop.clash;
    mood.stand = kind === 'end' ? VL.stand * (o.win ? 1 : 0.6) : 0;
    if (kind !== 'end') return;
    if (o.conf && confMesh) {
      const rr = rand(Math.floor(mood.clock * 1000) + 5);
      confP.forEach((p) => Object.assign(p, {
        t0: rr() * CF.spawn, x0: (rr() * 2 - 1) * CF.x, z: CF.z[0] + rr() * (CF.z[1] - CF.z[0]), y0: CF.top[0] + rr() * (CF.top[1] - CF.top[0]),
        vy: CF.fall[0] + rr() * (CF.fall[1] - CF.fall[0]), sp: 1.5 + rr() * 2, ph: rr() * TAU, rot: rr() * TAU, rs: (rr() * 2 - 1) * 4,
        fph: rr() * TAU, fs: 5 + rr() * 7, s: CF.size * (0.75 + rr() * 0.5), land: -1, lay: rr() * 0.01,
      }));
      confAt = mood.clock; confLive = confN; confMesh.visible = true;
    }
    if (o.zabuton) {
      const rr = rand(Math.floor(mood.clock * 1000) + 9);
      zabN = Math.min(zabs.length, o.zabuton);
      zabs.forEach((z, i) => {
        const front = i % 2 === 0, side = rr() < 0.5 ? -1 : 1;
        Object.assign(z, {
          t0: (i / Math.max(1, zabN)) * ZB.spawn + rr() * 0.15, d: ZB.sec[0] + rr() * (ZB.sec[1] - ZB.sec[0]), h: ZB.arc[0] + rr() * (ZB.arc[1] - ZB.arc[0]),
          s: front ? [side * (0.8 + rr() * 1.8), 0.4, VL.frontZ[0] - 0.3] : [side * (0.8 + rr() * 2), 1.5, VL.backZ[1]],
          e: [(rr() * 2 - 1) * 1.15, 0.72 + i * 0.004, (rr() * 2 - 1) * 0.95], tilt: 0.7 + rr() * 0.5, tum: 4 + rr() * 3, wob: rr() * 0.4,
          rz: rr() * TAU, spin: (rr() < 0.5 ? -1 : 1) * (6 + rr() * 8), landed: false,
        });
      });
      zabAt = mood.clock;
    }
  };
  // 毎こま：会場の時計を進めて動かす。もどり値＝まだ動いている演出がある（bout は 3D を描きつづける）
  group.userData.tick = (dt) => {
    mood.clock += dt;
    for (const f of tickers) f(dt);
    const c = mood.clock;
    return c - mood.at < VL.cheerSec || (confAt >= 0 && confLive > 0) || (zabAt >= 0 && zabs.some((z, i) => i < zabN && !z.landed));
  };
  // もう一度見る・次の一番：演出を消す（会場は作りなおさない）
  group.userData.reset = () => {
    mood.at = -99; confAt = -1; confLive = 0; zabAt = -1; zabN = 0;
    if (confMesh) confMesh.visible = false;
    for (const z of zabs) { z.m.visible = false; z.landed = false; }
  };
  // 音の合図（旋回のはじめからの秒）：幕がシュッと降りて・ストン、提灯がストン、明かりがパッ
  const land = (t) => t[0] + (t[1] - t[0]) * 0.8;   // drop() のはねる前＝着いたとき
  group.userData.cues = [
    ...(V.roof || V.tare ? [{ at: VL.t.drop[0], name: 'shu', vol: 0.32, rate: 0.7 }, { at: land(VL.t.drop), name: 'suton', vol: 0.7, rate: 1 }] : []),
    ...(V.lamp ? [{ at: land(VL.t.lamp), name: 'suton', vol: 0.3, rate: 1.35 }] : []),
    { at: VL.t.light, name: 'pa', vol: 0.75, rate: 1 },
  ];

  // ---- 明かり：パッとつく（少し明るすぎてから落ちつく）。0＝暗い会場 → 1＝明かりがついた ----
  const lightAt = (tt) => (tt < VL.t.light ? 0 : 1 + 0.35 * (1 - clamp01((tt - VL.t.light) / VL.t.flash)));
  let lastK = -1;
  // tt：旋回のはじめからの秒（真横で止まったあとは 99）。もどり値は明かり（stage3d が土俵の明るさに使う）
  group.userData.time = (tt) => {
    for (const f of timers) f(tt);
    const kk = lightAt(tt);
    if (kk !== lastK) {
      const m = VL.dim + (V.light - VL.dim) * kk;
      for (const mat of lit) mat.color.setScalar(m * (mat.userData.lit || 1));
      lastK = kk;
    }
    return kk;
  };
  // 画面に合わせる：真横で止まったカメラ（床からの高さ camY・土俵のまん中からの距離 camZ・画面の上のはしの傾き tanTop）。
  // 屋根の幕は画面の上のはしの少し下に（幕と紋がまるごと見える）・提灯は幕の下に・垂れ幕は画面の上から下がる
  group.userData.layout = ({ camY, camZ, tanTop }) => {
    const topAt = (z) => camY + (camZ - z) * tanTop;                                   // その奥行きで、画面の上のはしの高さ
    const sameRow = (z, y0, z0) => camY + ((y0 - camY) * (camZ - z)) / (camZ - z0);   // (z0, y0) と画面で同じ高さになる、奥行き z の高さ
    let under = null;
    if (shifts.roof) {
      const cb = Math.min(VL.roofY, Math.max(VL.roofMin, topAt(0.2) - roofBand - 0.1));
      shifts.roof.position.y = cb - VL.roofY;
      under = (z) => sameRow(z, cb - 0.06, 0.2);
    }
    if (shifts.tare) shifts.tare.position.y = Math.min(0, topAt(VL.tareZ) - 0.02 - VL.tareTop);
    if (shifts.lamp) {
      const L = VL.lampRows[0], lim = under ? under(L.z) : topAt(L.z) - 0.08;
      shifts.lamp.position.y = Math.min(0, lim - (L.y + 0.2));
    }
  };
  group.userData.light = V.light;
  group.userData.free = () => { for (const o of trash) o.dispose(); };
  group.userData.time(0);
  return group;
}
