// 効果音（Web Audio）。ビルドが window.SUMO_SFX = { "<名前>": "data:audio/mpeg;base64,…" } を入れる。
const MIN_GAP = 0.04; // 同じ音は40ms以内なら鳴らさない
let ctx = null;
let master = null;
let muted = false;
let loading = false;
const bufs = {};
const lastAt = {};

function dataToBuffer(url) {
  const i = url.indexOf(',');
  const bin = atob(url.slice(i + 1));
  const u8 = new Uint8Array(bin.length);
  for (let k = 0; k < bin.length; k++) u8[k] = bin.charCodeAt(k);
  return u8.buffer;
}

function decode(buf) {
  return new Promise((ok, ng) => {
    const p = ctx.decodeAudioData(buf, ok, ng);
    if (p && p.then) p.then(ok, ng);
  });
}

// 最初のタップで呼ぶ
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 1;
      master.connect(ctx.destination);
      // ほかのアプリへ行ったら音を止める（会場のざわめきが鳴りつづけないように・11/27）
      document.addEventListener('visibilitychange', () => {
        try { const r = document.hidden ? ctx.suspend() : ctx.resume(); if (r && r.catch) r.catch(() => {}); } catch (e) { /* 何もしない */ }
      });
    }
    if (ctx.state === 'suspended') {
      const r = ctx.resume();
      if (r && r.catch) r.catch(() => {});
    }
    loadBufs();
  } catch (e) { /* 音が出なくてもゲームは続く */ }
}

// 効果音のデータは、はじめの画面を出したあとに入る（app.js の loadLibs）。入ったら sfxReady で読む
export function sfxReady() { if (ctx) loadBufs(); }

function loadBufs() {
  try {
    if (loading || !window.SUMO_SFX) return;
    loading = true;
    const src = window.SUMO_SFX;
    for (const name of Object.keys(src)) {
      if (bufs[name]) continue;
      try {
        decode(dataToBuffer(src[name])).then((b) => { bufs[name] = b; delete src[name]; }, () => {});   // ほどいたら文字は捨てる（メモリを軽く）
      } catch (e) { /* その音だけあきらめる */ }
    }
  } catch (e) { /* 音が出なくてもゲームは続く */ }
}

// opts: { vol（0〜1・ふだん 0.7）, rate（再生速度・ふだん 1） }
export function playSfx(name, opts) {
  try {
    if (!ctx || muted) return;
    const b = bufs[name];
    if (!b) return;
    const now = ctx.currentTime;
    if (lastAt[name] !== undefined && now - lastAt[name] < MIN_GAP) return;
    lastAt[name] = now;
    const o = opts || {};
    const vol = o.vol === undefined ? 0.7 : o.vol;
    const rate = o.rate === undefined ? 1 : o.rate;
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = vol < 0 ? 0 : vol > 1 ? 1 : vol;
    s.connect(g);
    g.connect(master);
    s.start(0);
  } catch (e) { /* 何もしない */ }
}

// 鳴らしつづける音（本場所の会場のざわめき）。opts: { vol, fade（はじめの秒）, loop: [はじめ, おわり]（秒・mp3 の頭と後ろのすきまを飛ばす） }
// もどり値の vol(大きさ, 秒) で大きさを変え、stop(秒) で止める。音がまだ入っていないときは何もしない手を返す
export function loopSfx(name, opts) {
  const o = opts || {};
  let src = null, g = null;
  const h = {
    vol(v, sec) {
      try {
        if (!g) return;
        const now = ctx.currentTime, p = g.gain;
        p.cancelScheduledValues(now); p.setValueAtTime(p.value, now);
        p.linearRampToValueAtTime(Math.max(0, Math.min(1, v)), now + Math.max(0.02, sec || 0));
      } catch (e) { /* 何もしない */ }
    },
    stop(sec) {
      try {
        if (!src) return;
        h.vol(0, sec || 0.2);
        src.stop(ctx.currentTime + (sec || 0.2) + 0.05);
        src = null;
      } catch (e) { /* 何もしない */ }
    },
  };
  try {
    if (!ctx || !bufs[name]) return h;
    src = ctx.createBufferSource();
    src.buffer = bufs[name];
    src.loop = true;
    if (o.loop) { src.loopStart = o.loop[0]; src.loopEnd = Math.min(o.loop[1], src.buffer.duration); }
    g = ctx.createGain();
    g.gain.value = 0;
    src.connect(g);
    g.connect(master);
    src.start(0, o.loop ? o.loop[0] : 0);
    h.vol(o.vol === undefined ? 0.5 : o.vol, o.fade || 1);
  } catch (e) { src = null; g = null; }
  return h;
}

export function setMuted(on) {
  muted = !!on;
  try { if (master) master.gain.value = muted ? 0 : 1; } catch (e) { /* 何もしない */ }
}

export function isMuted() { return muted; }
