// オーラ（気）を描く（11/26 福箱）。取組・編集・福箱の見本で使う。見た目だけ＝物理にさわらない。
// 粒は力士の高さ h を1とした「力士のまわりの位置」で持つ（力士が動いてもついていく）。光る輪やグラデーションは使わない。
// 粒の絵は Codex の部品（A・assets/art/ki-*・福箱の fx-wisp・fx-leaf・fx-glint）。読みこむ前は、コードの線と四角（C）で描く。
// 自然に見せるくふう（11/26 しょーくん「もっと自然に」）：粒の半分ほどは力士のうしろ（力士の形でかくす）・大きさと速さはばらばら・
// ふわっと出てすっと消える・煙はひろがりながら上でゆっくり・花びらと紙は左右にゆれて裏返りながら落ちる・火の粉はまたたいて小さくなる・
// 稲妻は2度光る・疾風は力士のまわりを奥と手前でぐるっと回る。
import { AURAS } from '../data/auras.js';
import { artImages } from './art.js';

const MAX = 110;
const R = Math.random;   // 見た目だけなので Math.random でよい
const KI_IDS = ['ki-petal1', 'ki-petal2', 'ki-petal3', 'ki-conf-shu', 'ki-conf-ai', 'ki-conf-kin', 'ki-conf-midori', 'ki-conf-kinari',
  'ki-ember1', 'ki-ember2', 'ki-bolt1', 'ki-bolt2', 'ki-wind1', 'ki-wind2', 'ki-gold', 'ki-steam', 'fx-wisp', 'fx-leaf1', 'fx-leaf2', 'fx-glint'];
const CONF = ['ki-conf-shu', 'ki-conf-ai', 'ki-conf-kin', 'ki-conf-midori', 'ki-conf-kinari'];   // data/auras.js の紙吹雪の colors と同じ順
let KI = null, kiLoad = null;
function loadKi() { if (!kiLoad) kiLoad = artImages(KI_IDS).then((m) => { KI = m; }).catch(() => { kiLoad = null; }); }
const tinted = {};
function tint(id, color) {   // 白い絵を1つの色にそめる（墨のけむり）
  const key = id + color;
  if (tinted[key]) return tinted[key];
  const im = KI[id], c = document.createElement('canvas');
  c.width = im.width; c.height = im.height;
  const g = c.getContext('2d');
  g.drawImage(im, 0, 0);
  g.globalCompositeOperation = 'source-in';
  g.fillStyle = color;
  g.fillRect(0, 0, c.width, c.height);
  return (tinted[key] = c);
}
function sprite(ctx, im, x, y, hh, rot = 0, sx = 1) {   // まん中 (x, y)・高さ hh・回転・よこの倍率（マイナスで裏返し）
  const w = (hh * im.width) / im.height;
  ctx.save();
  ctx.translate(x, y);
  if (rot) ctx.rotate(rot);
  if (sx !== 1) ctx.scale(sx, 1);
  ctx.drawImage(im, -w / 2, -hh / 2, w, hh);
  ctx.restore();
}
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

// 種類ごとの出る数（1秒）と、うしろに回る割合
const KIND = { wisp: [9, 0.7], petal: [7, 0.5], confetti: [9, 0.45], spark: [18, 0.35], bolt: [4, 0.5], wind: [3.2, 0], gold: [14, 0.45] };

export function createAura(id) {
  const A = AURAS[id];
  if (!A || !A.kind) return null;
  loadKi();
  const [rate, backRate] = KIND[A.kind] || [10, 0.5];
  const parts = [];
  let acc = R(), boltIn = 0.4 + R() * 0.4, off = null;

  function spawn() {
    const k = A.kind, side = R() < 0.5 ? -1 : 1;
    const p = { t: 0, ph: R() * 6.28, f1: 1.2 + R() * 1.6, f2: 0.6 + R() * 1.2, s: 0.75 + R() * 0.55, pick: R(), back: R() < backRate, vu: 0, vv: 0 };
    if (k === 'wisp') Object.assign(p, { u: side * (0.12 + R() * 0.33), v: 0.05 + R() * 0.35, vu: side * 0.03, vv: -(0.22 + R() * 0.16), life: 1.8 + R() * 0.8, rot: (R() - 0.5) * 0.6, vr: (R() - 0.5) * 0.4 });
    else if (k === 'petal') Object.assign(p, { u: (R() - 0.5) * 1.4, v: -0.8 + R() * 0.35, vu: 0.05 + R() * 0.05, vv: 0.13 + R() * 0.08, life: 2.6 + R() * 0.8, rot: R() * 6.28, amp: 0.08 + R() * 0.07 });
    else if (k === 'confetti') Object.assign(p, { u: (R() - 0.5) * 1.4, v: -0.85 + R() * 0.3, vu: (R() - 0.5) * 0.08, vv: 0.2 + R() * 0.12, life: 2.2 + R() * 0.6, rot: R() * 6.28, amp: 0.05 + R() * 0.05, c: A.colors[Math.floor(R() * A.colors.length)] });
    else if (k === 'spark') Object.assign(p, { u: side * (0.05 + R() * 0.4), v: 0.25 + R() * 0.25, vu: side * (0.02 + R() * 0.1), vv: -(0.55 + R() * 0.45), life: 0.7 + R() * 0.6, big: R() < 0.3 });
    else if (k === 'bolt') Object.assign(p, { u: (R() - 0.5) * 0.8, v: (R() - 0.5) * 0.9, vv: -0.05, life: 0.25 + R() * 0.15, tiny: true });
    else if (k === 'wind') Object.assign(p, { r: 0.55 + R() * 0.2, a0: R() * 6.28, life: 0.8 + R() * 0.4, dir: side, hv: (R() - 0.5) * 0.7 });
    else if (k === 'gold') {
      const q = R();
      if (q < 0.16) Object.assign(p, { leaf: true, u: (R() - 0.5) * 1.2, v: -0.7 + R() * 0.3, vu: 0.03, vv: 0.12 + R() * 0.05, life: 2.6, rot: R() * 6.28, amp: 0.06 });
      else if (q < 0.26) Object.assign(p, { star: true, u: (R() - 0.5) * 1.0, v: (R() - 0.5) * 1.0, life: 0.45 });
      else Object.assign(p, { u: side * R() * 0.45, v: 0.1 + R() * 0.4, vu: side * 0.02, vv: -(0.12 + R() * 0.1), life: 1.8 + R() * 0.6 });
    }
    parts.push(p);
  }
  function bolt() {   // 筆の稲妻（コードの線のときは pts・絵のときは su, sv）
    const s = R() < 0.5 ? -1 : 1, su = s * (0.28 + R() * 0.18), pts = [];
    let u = su, v = -0.55;
    pts.push([u, v]);
    for (let i = 0; i < 5; i++) { u += s * (0.02 + R() * 0.05) * (i % 2 ? -1 : 1.6); v += 0.16 + R() * 0.05; pts.push([u, v]); }
    parts.push({ boltPts: pts, su, sv: -0.05 + R() * 0.1, sc: 0.8 + R() * 0.35, s, t: 0, life: 0.34, back: R() < 0.5 });
  }

  // 1つの粒を描く（Codex の絵）
  function drawOne(ctx, p, cx, cy, h, alpha) {
    const k = A.kind, age = p.t / p.life;
    const fade = smooth(0, 0.18, age) * (1 - smooth(0.6, 1, age));
    ctx.globalAlpha = alpha * fade;
    if (p.boltPts) {   // 2度光る（ピカッ → 消えかけて → もう一度）
      const a = age < 0.12 ? 1 : age < 0.22 ? 0.25 : age < 0.4 ? 0.9 : (0.9 * (1 - age)) / 0.6;
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * a;
      sprite(ctx, KI['ki-bolt1'], cx + p.su * h, cy + p.sv * h, h * 0.95 * p.sc, p.s * 0.08, p.s);
      ctx.globalCompositeOperation = 'source-over';
      return;
    }
    const x = cx + (p.u || 0) * h, y = cy + (p.v || 0) * h;
    if (k === 'wisp') {
      const white = A.color === '#EEE9DE', id = p.pick < 0.55 ? 'fx-wisp' : 'ki-steam';
      ctx.globalAlpha = alpha * fade * (white ? 0.5 : 0.45);
      sprite(ctx, white ? KI[id] : tint(id, A.color), x, y, h * (id === 'fx-wisp' ? 0.24 : 0.14) * p.s * (0.6 + 0.9 * age), p.rot + p.vr * p.t);
    } else if (k === 'petal' || (k === 'gold' && p.leaf)) {
      const im = k === 'petal' ? KI['ki-petal' + (1 + Math.floor(p.pick * 3))] : KI[p.pick < 0.6 ? 'fx-leaf1' : 'fx-leaf2'];
      sprite(ctx, im, x, y, h * (k === 'petal' ? 0.07 : 0.08) * p.s, p.rot, Math.cos(p.t * p.f2 * 3 + p.ph));
    } else if (k === 'confetti') {
      const ci = Math.max(0, (A.colors || []).indexOf(p.c));
      sprite(ctx, KI[CONF[ci] || CONF[0]], x, y, h * 0.05 * p.s, p.rot, Math.cos(p.t * 7 + p.ph));
    } else if (k === 'spark') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * fade * (0.7 + 0.3 * Math.sin(p.t * 35 + p.ph));
      sprite(ctx, KI[p.big ? 'ki-ember1' : 'ki-ember2'], x, y, h * (p.big ? 0.1 : 0.05) * p.s * (1 - 0.5 * age), Math.atan2(p.vv, p.vu) + Math.PI / 2);
      ctx.globalCompositeOperation = 'source-over';
    } else if (k === 'bolt') {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = alpha * fade * 0.6;
      sprite(ctx, KI['ki-bolt2'], x, y, h * 0.1 * p.s, p.ph, p.pick < 0.5 ? -1 : 1);
      ctx.globalCompositeOperation = 'source-over';
    } else if (k === 'wind') {   // 力士のまわりを回る筆の風（奥は小さく）
      const a = p.a0 + p.dir * age * 1.9, rx = p.r * h * 0.6, ry = p.r * h * 0.16, far = Math.sin(a) < 0;
      const tx = -Math.sin(a) * rx * p.dir, ty = Math.cos(a) * ry * p.dir;
      ctx.globalAlpha = alpha * Math.sin(age * Math.PI) * (far ? 0.45 : 0.7);
      const im = KI[p.pick < 0.5 ? 'ki-wind1' : 'ki-wind2'];
      ctx.save();
      ctx.translate(cx + Math.cos(a) * rx, cy + p.hv * h + Math.sin(a) * ry);
      ctx.rotate(Math.atan2(ty, tx));
      const hh = h * 0.12 * (far ? 0.85 : 1), w = ((hh * im.width) / im.height) * (0.7 + 0.6 * age);
      ctx.drawImage(im, -w / 2, -hh / 2, w, hh);
      ctx.restore();
    } else if (k === 'gold') {
      ctx.globalCompositeOperation = 'lighter';
      if (p.star) { ctx.globalAlpha = alpha * Math.sin(age * Math.PI); sprite(ctx, KI['fx-glint'], x, y, h * 0.14 * Math.sin(age * Math.PI)); }
      else { ctx.globalAlpha = alpha * fade * (0.6 + 0.4 * Math.sin(p.t * 12 + p.ph)); sprite(ctx, KI['ki-gold'], x, y, h * 0.09 * p.s, p.ph); }
      ctx.globalCompositeOperation = 'source-over';
    }
  }
  const isBack = (p) => (A.kind === 'wind' && !p.boltPts ? Math.sin(p.a0 + p.dir * (p.t / p.life) * 1.9) < 0 : p.back);

  // 絵を読みこむ前：コードの線と四角
  function drawPlain(ctx, cx, cy, h, alpha) {
    ctx.lineCap = 'round';
    for (const p of parts) {
      const age = p.t / p.life, fade = Math.min(1, p.t / 0.15) * (1 - age * age);
      ctx.globalAlpha = alpha * fade;
      ctx.fillStyle = ctx.strokeStyle = p.c || A.color || '#D9B95E';
      if (p.boltPts) {
        ctx.lineWidth = 0.024 * h;
        ctx.beginPath();
        p.boltPts.forEach(([u, v], i) => (i ? ctx.lineTo(cx + u * h, cy + v * h) : ctx.moveTo(cx + u * h, cy + v * h)));
        ctx.stroke();
      } else if (A.kind === 'wind') {
        const a = p.a0 + p.dir * age * 1.9;
        ctx.lineWidth = h * 0.018;
        ctx.beginPath(); ctx.ellipse(cx, cy + p.hv * h, p.r * h * 0.6, p.r * h * 0.16, 0, a, a + p.dir * 0.9, p.dir < 0); ctx.stroke();
      } else {
        const s = h * (A.kind === 'wisp' ? 0.05 : 0.025) * p.s;
        ctx.fillRect(cx + p.u * h - s / 2, cy + p.v * h - s / 2, s, s);
      }
    }
  }

  return {
    step(dt) {
      dt = Math.min(dt, 0.05);
      acc += dt * rate;
      while (acc >= 1) { acc -= 1; if (parts.length < MAX) spawn(); }
      if (A.kind === 'bolt') { boltIn -= dt; if (boltIn <= 0) { bolt(); boltIn = 0.35 + R() * 0.6; } }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i];
        p.t += dt;
        if (p.t >= p.life) { parts.splice(i, 1); continue; }
        if (p.u === undefined) continue;
        if (p.amp) {   // 花びら・紙・金箔：左右にゆれ、ゆれに合わせてかたむく
          const c = Math.cos(p.t * p.f1 + p.ph);
          p.u += (p.vu + p.amp * p.f1 * c) * dt;
          p.v += (p.vv + 0.04 * Math.sin(p.t * p.f2 * 2 + p.ph)) * dt;
          p.rot += p.amp * 9 * c * dt;
        } else {
          const spark = A.kind === 'spark';
          p.u += (p.vu + Math.sin(p.t * (spark ? 9 : p.f1) + p.ph) * (spark ? 0.08 : 0.05)) * dt;
          p.v += p.vv * dt;
          if (A.kind === 'wisp') p.vv *= 1 - 0.35 * dt;    // 煙は上でゆっくり
          if (spark) p.vv *= 1 - 0.8 * dt;
        }
      }
    },
    // cx, cy：力士のまん中（px）・h：力士の高さ（px）・alpha：全体のこさ
    // mask：力士の形（うしろの粒をかくす）＝ { img, x, y, w, h }（見本の絵の canvas）か { poly: [[x, y], …] }（取組の紙の形）
    draw(ctx, cx, cy, h, alpha = 1, mask = null) {
      ctx.save();
      if (!KI) { drawPlain(ctx, cx, cy, h, alpha); ctx.restore(); return; }
      const backs = parts.filter(isBack);
      if (backs.length && mask) {   // うしろの粒は、べつの紙に描いて力士の形で切りぬいてから重ねる
        const m = ctx.getTransform(), k = m.a || 1, S = Math.ceil(h * 2.8), ox = cx - S / 2, oy = cy - S / 2, P = Math.ceil(S * k);
        if (!off) off = document.createElement('canvas');
        if (off.width < P) { off.width = P; off.height = P; }
        const o = off.getContext('2d');
        o.setTransform(1, 0, 0, 1, 0, 0);
        o.clearRect(0, 0, P, P);
        o.setTransform(k, 0, 0, k, -ox * k, -oy * k);
        for (const p of backs) drawOne(o, p, cx, cy, h, alpha);
        o.globalAlpha = 1;
        o.globalCompositeOperation = 'destination-out';
        if (mask.img) o.drawImage(mask.img, mask.x, mask.y, mask.w, mask.h);
        else if (mask.poly) { o.beginPath(); mask.poly.forEach(([x, y], i) => (i ? o.lineTo(x, y) : o.moveTo(x, y))); o.closePath(); o.fill(); }
        o.globalCompositeOperation = 'source-over';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.drawImage(off, 0, 0, P, P, m.e + ox * k, m.f + oy * k, P, P);
        ctx.setTransform(m);
      } else for (const p of backs) drawOne(ctx, p, cx, cy, h, alpha);
      for (const p of parts) if (!isBack(p)) drawOne(ctx, p, cx, cy, h, alpha);
      ctx.restore();
    },
  };
}

// 画面の上の小さな見本（部屋・編集・福箱）：canvas に、まん中の力士のまわりの気をまわしつづける。stop() で止める
export function auraPreview(cv, id, box) {
  const a = createAura(id);
  if (!a) { const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); return { stop() {} }; }
  let raf = 0, last = performance.now(), on = true;
  const loop = (now) => {
    if (!on) return;
    if (!cv.isConnected || cv.closest('[hidden]')) { on = false; return; }
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(h * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    const g = cv.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, w, h);
    a.step((now - last) / 1000);
    last = now;
    const b = box();   // { x, y, h, mask? }：力士のまん中と高さ（canvas の中の px）・力士の絵の場所
    if (b) a.draw(g, b.x, b.y, b.h, 1, b.mask || null);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return { stop() { on = false; cancelAnimationFrame(raf); const g = cv.getContext('2d'); g.clearRect(0, 0, cv.width, cv.height); } };
}
