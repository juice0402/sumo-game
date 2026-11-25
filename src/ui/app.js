// はじまり：物理を用意して、画面をつなぐ（切る → 相手 → 取組 → もう一番／切り直す）
import { T } from '../data/text.js';
import { setRapier } from '../sim/battle.js';
import { checkShape } from '../geom/check.js';
import { initCut } from './cut.js';
import { initPick } from './pick.js';
import { initBout } from './bout.js';
import { initTools } from './tools.js';
import { unlockAudio, setMuted, playSfx, sfxReady } from './sound.js';
import { applyButtonArt } from './btnart.js';

applyButtonArt();
// 字（Google Fonts）は待たずに画面を出す。届いたら使う（onload が止められている所でも効くように、ここでも）
{
  const l = document.getElementById('webfont');
  if (l) { if (l.sheet) l.media = 'all'; else l.addEventListener('load', () => { l.media = 'all'; }); }
}

const SAVE_KEY = 'sumo-proto-v1';
const state = { shape: null, drive: 'hop', seed: 1, mute: false, short: false };

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (d.shape && checkShape(d.shape).ok) state.shape = d.shape;
    if (d.drive === 'push' || d.drive === 'hop') state.drive = d.drive;
    state.mute = d.mute === true;
    state.short = d.short === true;
  } catch (e) { /* 保存できない画面でも遊べる */ }
}
function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify({ shape: state.shape, drive: state.drive, mute: state.mute, short: state.short })); } catch (e) { /* */ }
}

function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
}

// 重いもの（物理 3.4MB・3D 0.7MB・効果音）は、切る画面を出してから動かす（はじめの画面を早く出すため）。
// ビルドが <script type="text/plain" id="lib-…"> に入れておいたものを、1つずつ動かす（あいだに画面を描けるように少し待つ）
let ready = null;
function loadLibs() {
  if (ready) return ready;
  const run = (id) => new Promise((ok) => setTimeout(() => {
    const el = document.getElementById(id);
    if (el) { const s = document.createElement('script'); s.text = el.textContent; document.head.appendChild(s); el.remove(); }
    ok();
  }, 30));
  const domReady = new Promise((ok) => {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ok, { once: true }); else ok();
  });
  ready = domReady
    .then(() => {
      try {
        const el = document.getElementById('lib-sfx');
        if (el) { window.SUMO_SFX = JSON.parse(el.textContent); el.remove(); sfxReady(); }
      } catch (e) { /* 音なしで続ける */ }
    })
    .then(() => run('lib-rapier'))
    .then(() => window.RAPIER.init())
    .then(() => { setRapier(window.RAPIER); return run('lib-three'); });
  ready.catch(() => {
    const el = document.getElementById('err');
    el.textContent = T.noWasm;
    el.hidden = false;
  });
  return ready;
}

async function boot() {
  load();
  state.seed = (Date.now() % 9973) + 1;
  const cut = initCut({
    onDecide(pts) { playSfx('kami', { vol: 0.8 }); state.shape = pts; save(); loadLibs().then(() => { pick.resetMarks(); show('s-pick'); pick.show(); }); },
  });
  const pick = initPick({
    getShape: () => state.shape,
    getDrive: () => state.drive,
    setDrive(d) { state.drive = d; save(); },
    onFight(foe) { show('s-bout'); bout.start(state.shape, foe, state.seed++); },
    onBack() { show('s-cut'); cut.show(state.shape); },
  });
  const bout = initBout({
    getDrive: () => state.drive,
    getShort: () => state.short,
    onFoe() { show('s-pick'); pick.show(); },
    onRecut() { show('s-cut'); cut.show(null); },
  });
  const tools = initTools({ getShape: () => state.shape, getDrive: () => state.drive });
  document.getElementById('b-tools').addEventListener('click', () => loadLibs().then(() => tools.open()));
  // 音と演出（道具の画面）
  setMuted(state.mute);
  const toggle = (id, key, after) => {
    const b = document.getElementById(id);
    const paint = () => b.setAttribute('aria-pressed', String(state[key]));
    paint();
    b.addEventListener('click', () => { state[key] = !state[key]; paint(); save(); if (after) after(); });
  };
  toggle('b-mute', 'mute', () => setMuted(state.mute));
  toggle('b-short', 'short');
  document.getElementById('credits').textContent = (T.credits || []).join(' ');
  // 音は最初のタップのあとでないと鳴らせない
  document.addEventListener('pointerdown', unlockAudio, { once: true, capture: true });
  show('s-cut');
  cut.show(state.shape);
  loadLibs();
}

boot();
