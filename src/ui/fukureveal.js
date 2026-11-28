// 福箱の中身の見せ方（11/27 しょーくん「福箱の見せ方を豪華にして」）。箱の開け方は段で変えない（ui/fukubox.js）。
// 箱が開いたら：札（和紙の短冊・裏は漆に金の「福」）が箱の口から舞い上がり、くるっと表へ → 名前を筆で書く → 段の判子をドン。
// 段が上がるほど足していく：並＝札と判子・生成りの紙吹雪すこし／上＝藍の罫・藍と生成りの紙吹雪／
// 特上＝朱の罫と朱の帯・朱と金の紙吹雪・金雲・ゆれ・拍手／極＝金箔の札・金屏風がひらく・金雲・金の紙吹雪と金箔・きらめき・ゆれ・歓声と拍手。
// 光る輪・点滅は使わない（スロットやパチンコに似せない・game-art-rule.md）。見た目だけなので Math.random でよい。
// 絵は Codex（紙吹雪・金箔・きらめき・金雲・札の紙＝docs/art.md）。絵がまだ読めないときは、札と判子だけ（動きは同じ）。
import { artImages } from './art.js';
import { KAIJO_ART } from '../data/kaijoart.js';
import { setupCanvas } from './ink.js';
import { playSfx } from './sound.js';

// 時間（ms・札が出てから）。CSS の動きもこの数字（#fk-hero の --fk-*）
export const REVEAL_TIME = {
  // 判子は筆の音（fude・二画で約0.44秒）が書ききってから（11/28 しょーくん「しっかり流れきってからハンコ」）。墨の字も同じ長さ（style.css の inkdown .45s）
  full: { rise: 480, flip: 440, write: 860, stamp: 1380, meta: 1580, end: 8360 },
  short: { rise: 1, flip: 1, write: 40, stamp: 540, meta: 580, end: 5500 },
};
// 段ごとの飾り（tex：札の紙・conf：紙吹雪の数・colors：色・kumo：金雲・byobu：金屏風・leaf：金箔・glint：きらめき・shake：ゆれ）
const TIER = {
  nami: { tex: 'tex-washi', conf: 12, colors: ['kinari'], kumo: 0, byobu: false, leaf: 0, glint: 0, shake: 0 },
  jo: { tex: 'tex-washi', conf: 32, colors: ['ai', 'kinari', 'ai'], kumo: 0, byobu: false, leaf: 0, glint: 0, shake: 0 },
  tokujo: { tex: 'tex-washi', conf: 60, colors: ['shu', 'kin', 'kinari', 'shu'], kumo: 2, byobu: false, leaf: 0, glint: 5, shake: 1 },
  kiwami: { tex: 'tex-kinpaku', conf: 100, colors: ['kin', 'kin', 'shu', 'kinari'], kumo: 3, byobu: true, leaf: 22, glint: 14, shake: 2 },
};
const ART = ['tex-washi', 'tex-kinpaku', 'ki-conf-ai', 'ki-conf-kin', 'ki-conf-kinari', 'ki-conf-shu', 'fx-leaf1', 'fx-leaf2', 'fx-glint', KAIJO_ART.kumo.id];

const span = (t, a, b) => Math.min(1, Math.max(0, (t - a) / (b - a)));
const easeOut = (u) => 1 - (1 - u) * (1 - u) * (1 - u);

export function createReveal({ hero, card, back, front }) {
  let imgs = null, loading = null, raf = 0, run = null, timers = [];
  const load = () => loading || (loading = artImages(ART).then((m) => { imgs = m; }, () => { loading = null; }));

  function clear() {
    for (const cv of [back, front]) { const g = cv.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height); }
  }
  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0; run = null;
    timers.forEach(clearTimeout); timers = [];
    hero.classList.remove('shake1', 'shake2');
    clear();
  }

  // 札の位置（hero の中・動きの transform を入れない形）
  function cardBox() {
    const W = hero.clientWidth, H = hero.clientHeight, w = card.offsetWidth, h = card.offsetHeight;
    return { x: (W - w) / 2, y: (H - h) / 2, w, h, W, H };
  }

  // 紙吹雪：札のうしろから上へはじけて、ひらひら落ちる。半分は札の前（front）
  function makeConf(cfg, B, S) {
    const R = Math.random, out = [];
    for (let i = 0; i < cfg.conf; i++) {
      const a = -Math.PI / 2 + (R() - 0.5) * 2.4, v = B.H * (0.9 + R() * 1.1);
      out.push({ t0: S + R() * 140, x: B.x + B.w * (0.3 + R() * 0.4), y: B.y + B.h * (0.2 + R() * 0.3), vx: Math.cos(a) * v, vy: Math.sin(a) * v,
        s: B.W * (0.04 + R() * 0.035), r: R() * 6.28, vr: (R() - 0.5) * 9, ph: R() * 6.28, fl: 5 + R() * 6,
        img: 'ki-conf-' + cfg.colors[i % cfg.colors.length], front: i % 2 === 1 });
    }
    return out;
  }
  // 1つの紙吹雪の、時間 tau 秒の位置（はじけて、空気でゆるみ、ゆっくり落ちる）
  function confAt(p, tau, H) {
    const k = 2.4, e = Math.exp(-k * tau), fall = H * 0.32;
    const x = p.x + (p.vx / k) * (1 - e) + H * 0.025 * Math.sin(p.ph + tau * 3);
    const y = p.y + ((p.vy - fall) / k) * (1 - e) + fall * tau;
    return [x, y];
  }

  function drawConf(g, list, t, B, dpr, front) {
    for (const p of list) {
      if (p.front !== front || t < p.t0) continue;
      const tau = (t - p.t0) / 1000, [x, y] = confAt(p, tau, B.H), im = imgs[p.img];
      if (!im || y > B.H + 40) continue;
      const w = p.s, h = (w * im.height) / im.width;
      g.save();
      g.globalAlpha = Math.min(1, tau * 8) * (front ? 0.95 : 0.8);
      g.translate(x * dpr, y * dpr);
      g.rotate(p.r + p.vr * tau);
      g.scale(Math.cos(p.ph + p.fl * tau), 1);   // ひらひら（裏返る）
      g.drawImage(im, (-w / 2) * dpr, (-h / 2) * dpr, w * dpr, h * dpr);
      g.restore();
    }
  }

  // 金屏風：6枚が札のうしろで、まん中から左右へひらいて、画面いっぱいに（山折り・谷折りで明るさを変える・べたの色だけ）
  function drawByobu(g, u, B, dpr) {
    if (u <= 0) return;
    const n = 6, th = 1.45 + (0.32 - 1.45) * easeOut(u), BW = B.W * 1.04, BH = B.H * 0.94;
    const pw = BW / (n * Math.cos(0.32)), wNow = n * pw * Math.cos(th), cx = B.W / 2, cy = B.H / 2, k = 0.05 * Math.sin(th);
    const xs = [], hs = [];
    for (let j = 0; j <= n; j++) { xs.push(cx - wNow / 2 + j * pw * Math.cos(th)); hs.push(BH * (1 + (j % 2 ? -k : k))); }
    const pat = g.createPattern(imgs['tex-kinpaku'], 'repeat');
    if (pat.setTransform && typeof DOMMatrix !== 'undefined') { const s = (B.W * 0.5 * dpr) / 448; pat.setTransform(new DOMMatrix().scale(s, s)); }
    g.save();
    g.globalAlpha = Math.min(1, u * 3);
    for (let i = 0; i < n; i++) {
      const quad = () => {
        g.beginPath();
        g.moveTo(xs[i] * dpr, (cy - hs[i] / 2) * dpr); g.lineTo(xs[i + 1] * dpr, (cy - hs[i + 1] / 2) * dpr);
        g.lineTo(xs[i + 1] * dpr, (cy + hs[i + 1] / 2) * dpr); g.lineTo(xs[i] * dpr, (cy + hs[i] / 2) * dpr); g.closePath();
      };
      quad(); g.fillStyle = pat; g.fill();
      quad(); g.fillStyle = i % 2 ? 'rgba(32,30,27,.46)' : 'rgba(32,30,27,.2)'; g.fill();   // 折り目の陰（金はおさえて、札が引き立つように）
      quad(); g.strokeStyle = '#2a1c14'; g.lineWidth = 1.6 * dpr; g.stroke();
    }
    // 外のふち（漆の枠）
    g.beginPath();
    g.moveTo(xs[0] * dpr, (cy - hs[0] / 2) * dpr);
    for (let j = 1; j <= n; j++) g.lineTo(xs[j] * dpr, (cy - hs[j] / 2) * dpr);
    for (let j = n; j >= 0; j--) g.lineTo(xs[j] * dpr, (cy + hs[j] / 2) * dpr);
    g.closePath(); g.strokeStyle = '#1a110c'; g.lineWidth = 4 * dpr; g.stroke();
    g.restore();
  }

  // 金雲：左右から流れてきて、札のうしろ（左右にはみ出す）でゆっくりただよう。極は1つ札の下のはしにかかる（front）
  function makeKumo(cfg, B) {
    const K = KAIJO_ART.kumo, out = [], R = Math.random;
    // [x, y（札の高さの割合）, 幅（画面の幅の割合）, 流れてくる向き, 札の前]
    const spots = [[0.46, 0.14, 1.15, -1, false], [0.56, 0.88, 1.1, 1, false], [0.3, 0.97, 0.8, -1, true]];
    for (let i = 0; i < cfg.kumo; i++) {
      const [fx, fy, fw, side, front] = spots[i], rc = K.rects[i % K.rects.length], w = B.W * fw;
      out.push({ rc, w, h: (w * rc[3]) / rc[2], x: B.W * fx, y: B.y + B.h * fy, side, front, ph: R() * 6.28 });
    }
    return out;
  }
  function drawKumo(g, list, t, S, B, dpr, front) {
    const im = imgs[KAIJO_ART.kumo.id];
    if (!im) return;
    for (const c of list) {
      if (c.front !== front) continue;
      const u = easeOut(span(t, S, S + 900)), drift = Math.sin(c.ph + t / 2600) * B.W * 0.02;
      const x = c.x + c.side * (1 - u) * B.W * 0.6 + drift;
      g.globalAlpha = 0.88 * u;
      g.drawImage(im, c.rc[0], c.rc[1], c.rc[2], c.rc[3], (x - c.w / 2) * dpr, (c.y - c.h / 2) * dpr, c.w * dpr, c.h * dpr);
    }
    g.globalAlpha = 1;
  }

  // 金箔：上からひらひら降る（極）
  function makeLeaves(cfg, B, S) {
    const R = Math.random, out = [];
    for (let i = 0; i < cfg.leaf; i++) out.push({ t0: S + R() * 1800, x: R() * B.W, y: -B.H * (0.05 + R() * 0.15), vy: B.H * (0.2 + R() * 0.1),
      s: B.W * (0.06 + R() * 0.05), r: R() * 6.28, vr: (R() - 0.5) * 3, ph: R() * 6.28, img: R() < 0.5 ? 'fx-leaf1' : 'fx-leaf2' });
    return out;
  }
  function drawLeaves(g, list, t, B, dpr) {
    for (const p of list) {
      if (t < p.t0) continue;
      const tau = (t - p.t0) / 1000, y = p.y + p.vy * tau, im = imgs[p.img];
      if (y > B.H + 30) continue;
      const x = p.x + B.W * 0.05 * Math.sin(p.ph + tau * 2.2), w = p.s, h = (w * im.height) / im.width;
      g.save();
      g.globalAlpha = Math.min(1, tau * 4);
      g.translate(x * dpr, y * dpr);
      g.rotate(p.r + p.vr * tau);
      g.scale(Math.cos(p.ph + tau * 4), 1);
      g.drawImage(im, (-w / 2) * dpr, (-h / 2) * dpr, w * dpr, h * dpr);
      g.restore();
    }
  }

  // きらめき：札のふちに、ときどき（重ねると明るく）
  function makeGlints(cfg, B, S) {
    const R = Math.random, out = [];
    for (let i = 0; i < cfg.glint; i++) {
      const side = i % 4, f = R();
      const x = side < 2 ? B.x + B.w * f : B.x + (side === 2 ? 0 : B.w), y = side < 2 ? B.y + (side === 0 ? 0 : B.h) : B.y + B.h * f;
      out.push({ t0: S + 150 + R() * 4200, x, y, s: B.W * (0.1 + R() * 0.08) });
    }
    return out;
  }
  function drawGlints(g, list, t, dpr) {
    const im = imgs['fx-glint'];
    g.save();
    g.globalCompositeOperation = 'lighter';
    for (const p of list) {
      const u = (t - p.t0) / 460;
      if (u <= 0 || u >= 1) continue;
      const k = Math.sin(Math.PI * u), w = p.s * k, h = (w * im.height) / im.width;
      g.globalAlpha = k;
      g.drawImage(im, (p.x - w / 2) * dpr, (p.y - h / 2) * dpr, w * dpr, h * dpr);
    }
    g.restore();
  }

  function frame(now) {
    if (!run) return;
    if (hero.closest('[hidden]')) { stop(); return; }
    const { t0, T, cfg, B, conf, kumo, leaves, glints } = run, t = now - t0, S = T.stamp;
    const b = setupCanvas(back), f = setupCanvas(front), dpr = b.dpr;
    b.ctx.clearRect(0, 0, b.W, b.H);
    f.ctx.clearRect(0, 0, f.W, f.H);
    if (imgs) {
      if (cfg.byobu) drawByobu(b.ctx, span(t, S - 40, S + 620), B, dpr);
      drawKumo(b.ctx, kumo, t, S, B, dpr, false);
      drawConf(b.ctx, conf, t, B, dpr, false);
      drawKumo(f.ctx, kumo, t, S + 200, B, dpr, true);
      drawConf(f.ctx, conf, t, B, dpr, true);
      drawLeaves(f.ctx, leaves, t, B, dpr);
      drawGlints(f.ctx, glints, t, dpr);
    }
    if (t < T.end) raf = requestAnimationFrame(frame);
    else raf = 0;   // 屏風と金雲は最後のこまのまま残る
  }

  return {
    load,
    stop,
    cardBox,
    // 札を出す（reveal を見せた直後に呼ぶ）。音もここで鳴らす
    play(tier, short) {
      stop();
      const T = short ? REVEAL_TIME.short : REVEAL_TIME.full, cfg = TIER[tier] || TIER.nami;
      for (const k of ['rise', 'flip', 'write', 'stamp', 'meta']) hero.style.setProperty('--fk-' + k, T[k] + 'ms');
      if (cfg.shake && !short) { void hero.offsetWidth; hero.classList.add('shake' + cfg.shake); }
      const tex = () => { if (imgs && imgs[cfg.tex]) card.style.setProperty('--fk-tex', `url(${imgs[cfg.tex].src})`); };
      card.style.removeProperty('--fk-tex');
      tex();
      const B = cardBox();
      run = { t0: performance.now(), T, cfg, B, conf: makeConf(cfg, B, T.stamp), kumo: makeKumo(cfg, B), leaves: makeLeaves(cfg, B, T.stamp), glints: makeGlints(cfg, B, T.stamp) };
      if (!imgs) load().then(() => { if (run) tex(); });
      raf = requestAnimationFrame(frame);
      // 音：札がひらり → 筆 → 判子（段で変える）→ 拍手・歓声（特上・極）
      const sfx = (ms, name, o) => timers.push(setTimeout(() => playSfx(name, o), ms));
      if (!short) sfx(T.rise - 80, 'kami', { vol: 0.55, rate: 1.3 });
      sfx(T.write, 'fude', { vol: 0.45 });
      if (tier === 'kiwami') {
        sfx(T.stamp, 'hyoshigi', { vol: 0.9 });
        sfx(T.stamp + 60, 'pa', { vol: 0.5 });
        sfx(T.stamp + 260, 'kansei', { vol: 0.5 });
        sfx(T.stamp + 420, 'hakushu', { vol: 0.55 });
      } else if (tier === 'tokujo') {
        sfx(T.stamp, 'taiko-end', { vol: 0.8 });
        sfx(T.stamp + 300, 'hakushu', { vol: 0.4 });
      } else sfx(T.stamp, 'ton', { vol: tier === 'jo' ? 0.85 : 0.6 });
    },
  };
}
