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
    }
    if (ctx.state === 'suspended') {
      const r = ctx.resume();
      if (r && r.catch) r.catch(() => {});
    }
    if (loading) return;
    loading = true;
    const src = window.SUMO_SFX || {};
    for (const name of Object.keys(src)) {
      if (bufs[name]) continue;
      try {
        decode(dataToBuffer(src[name])).then((b) => { bufs[name] = b; }, () => {});
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

export function setMuted(on) {
  muted = !!on;
  try { if (master) master.gain.value = muted ? 0 : 1; } catch (e) { /* 何もしない */ }
}

export function isMuted() { return muted; }
