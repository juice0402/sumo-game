// はじまり：物理を用意して、画面をつなぐ
//   タイトル → 相撲部屋 →「勝負」→ 巡業（土俵巡業の抽選）／本場所（番付）／稽古（CPU）→ 力士選出 → 取組
//   相撲部屋 → 力士をつくる（3枠）→ 力士の編集（四股名・称号・切り直す・引退）
import { T } from '../data/text.js';
import { STAGES, HONBASHO_STAGE } from '../data/stages.js';
import { setRapier } from '../sim/battle.js';
import { loadState, saveState, newRikishi, addRec } from '../game/save.js';
import { shikonaText, titleText } from '../game/names.js';
import { rankOf, eloDelta } from '../game/rating.js';
import { drawStage } from '../game/jungyo.js';
import { makeFoe } from '../game/foe.js';
import { initCut } from './cut.js';
import { initPick } from './pick.js';
import { initBout } from './bout.js';
import { initTools } from './tools.js';
import { initHeya } from './heya.js';
import { renderSlots, initEdit } from './roster.js';
import { initJungyo, initBanzuke, initSelect } from './match.js';
import { unlockAudio, setMuted, playSfx, sfxReady } from './sound.js';
import { applyButtonArt } from './btnart.js';

applyButtonArt();
// 字（Google Fonts）は待たずに画面を出す。届いたら使う（onload が止められている所でも効くように、ここでも）
{
  const l = document.getElementById('webfont');
  if (l) { if (l.sheet) l.media = 'all'; else l.addEventListener('load', () => { l.media = 'all'; }); }
}

const state = loadState();
state.seed = (Date.now() % 9973) + 1;
const save = () => saveState(state);
const activeSlot = () => state.slots[state.active];
const hasRikishi = () => state.slots.some(Boolean);
const who = (s) => ({ name: shikonaText(s.shikona), sub: titleText(s.title) });

// 画面の行き来（もどるボタンは1つ前へ）
let cur = null;
const nav = [];
const onShow = {};
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  cur = id;
  if (onShow[id]) onShow[id]();
}
function go(id) { if (cur && cur !== id && cur !== 's-title' && cur !== 's-bout') nav.push(cur); show(id); }
function back() { show(nav.pop() || 's-home'); }
function home() { nav.length = 0; show('s-home'); }

// 重いもの（物理 3.4MB・3D 0.7MB・効果音）は、はじめの画面を出してから動かす（はじめの画面を早く出すため）。
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

function boot() {
  let editSlot = 0, bzTitle = '番付';
  // 切る：どの枠を切るか・切ったあとどこへ行くか
  let cutSlot = 0, afterCut = null;
  function cutFor(i, then) {
    cutSlot = i;
    afterCut = then;
    go('s-cut');
    cut.show(state.slots[i] ? state.slots[i].shape : null);
  }
  const cut = initCut({
    onDecide(pts) {
      playSfx('kami', { vol: 0.8 });
      const s = state.slots[cutSlot];
      const isNew = !s;
      if (s) s.shape = pts; else state.slots[cutSlot] = newRikishi(pts);
      state.active = cutSlot;
      save();
      loadLibs().then(() => afterCut(isNew));
    },
  });
  document.getElementById('b-cutback').addEventListener('click', back);

  // 稽古（CPU 5体）
  const pick = initPick({
    getShape: () => (activeSlot() ? activeSlot().shape : null),
    getDrive: () => state.drive,
    setDrive(d) { state.drive = d; save(); },
    onFight(foe) {
      show('s-bout');
      bout.start(activeSlot().shape, foe, state.seed++, { mode: 'keiko', a: who(activeSlot()), b: { name: foe.name } });
    },
    onBack: back,
  });
  onShow['s-pick'] = () => pick.show();

  const bout = initBout({
    getDrive: () => state.drive,
    getShort: () => state.short,
    onFoe() { show('s-pick'); },
    onRecut() { cutFor(state.active, () => { pick.resetMarks(); show('s-pick'); }); },
    onNext(mode) { openSelect(mode); },
    onHome: home,
  });

  // 巡業・本場所：選出 → 取組（相手は仮の CPU・四股名と称号はランダム）
  const select = initSelect();
  let match = null;
  function openSelect(mode, fresh) {
    const stage = mode === 'jungyo' ? drawStage(Date.now(), Math.random) : HONBASHO_STAGE;
    match = { mode, stage };
    if (fresh) go('s-select'); else show('s-select');
  }
  onShow['s-select'] = () => select.show({
    mode: match.mode, stage: match.stage, drawn: match.mode === 'jungyo', slots: state.slots, active: state.active,
    onPick(i) { loadLibs().then(() => fight(i)); },
  });
  function fight(i) {
    const me = state.slots[i];
    if (!me) return;
    state.active = i;
    save();
    const foe = makeFoe(Math.random, state.rate);
    const m = match;
    show('s-bout');
    bout.start(me.shape, foe, state.seed++, {
      mode: m.mode, stage: m.stage, a: who(me), b: who(foe),
      onResult(r) {
        addRec(me.rec, r.winner);
        if (m.mode === 'honbasho') {
          const before = rankOf(state.rate);
          const d = eloDelta(state.rate, foe.rate, r.winner === 'a' ? 1 : r.winner ? 0 : 0.5);
          state.rate += d;
          addRec(state.hon, r.winner);
          save();
          const after = rankOf(state.rate);
          const move = after.min > before.min ? '　' + T.promote(after.name) : after.min < before.min ? '　' + T.demote(after.name) : '';
          return T.rateGain(after.name, state.rate, d) + move;
        }
        addRec(state.jun, r.winner);
        save();
        return `${STAGES[m.stage].name}　${T.mode.jungyo} ${T.rec(state.jun)}`;
      },
    });
  }

  // 部屋・勝負
  const heya = initHeya({
    onStart() {
      if (hasRikishi()) { home(); return; }
      // はじめて：紙を切って、そのまま CPU と稽古（要件 16）
      nav.length = 0; nav.push('s-home');
      cutFor(0, () => { pick.resetMarks(); show('s-pick'); });
    },
    onRoster() { go('s-roster'); },
    onShobu() {
      if (!hasRikishi()) { cutFor(state.slots.findIndex((s) => !s), () => show('s-mode')); return; }
      go('s-mode');
    },
    onBanzuke() { bzTitle = '番付'; go('s-banzuke'); },
    onJungyo() { go('s-jungyo'); },
    onJungyoMatch() { go('s-jungyo'); },
    onHonbasho() { bzTitle = T.mode.honbasho; go('s-banzuke'); },
    onKeiko() { pick.resetMarks(); go('s-pick'); },
  });
  onShow['s-home'] = () => heya.home(state);
  onShow['s-mode'] = () => heya.mode(state);

  // 部屋の力士（3枠）と編集
  onShow['s-roster'] = () => renderSlots(document.getElementById('roster-slots'), state.slots, {
    active: state.active, emptyOk: true,
    onPick(i) {
      if (state.slots[i]) { editSlot = i; go('s-edit'); return; }
      cutFor(i, () => { editSlot = i; show('s-edit'); });   // 新しい力士：切ったら名前を見せる（もどると部屋の力士へ）
    },
  });
  const edit = initEdit({
    getSlot: (i) => state.slots[i],
    onChange() { save(); },
    onRecut(i) { cutFor(i, () => back()); },
    onRetire(i) {
      state.slots[i] = null;
      if (state.active === i) state.active = Math.max(0, state.slots.findIndex(Boolean));
      save();
      back();
    },
    onDone: back,
  });
  onShow['s-edit'] = () => edit.show(editSlot);

  // 土俵巡業・番付
  const jungyo = initJungyo();
  onShow['s-jungyo'] = () => jungyo.show();
  document.getElementById('jg-go').addEventListener('click', () => {
    if (!hasRikishi()) { go('s-roster'); return; }
    openSelect('jungyo', true);
  });
  const banzuke = initBanzuke();
  onShow['s-banzuke'] = () => banzuke.show(state, bzTitle);
  document.getElementById('bz-go').addEventListener('click', () => {
    if (!hasRikishi()) { go('s-roster'); return; }
    openSelect('honbasho', true);
  });

  for (const b of document.querySelectorAll('.back')) b.addEventListener('click', back);

  // 道具（試作のあいだだけ・本番では消して、音と演出は「設定」へ）
  const tools = initTools({ getShape: () => (activeSlot() ? activeSlot().shape : null), getDrive: () => state.drive });
  document.getElementById('b-tools').addEventListener('click', () => loadLibs().then(() => tools.open()));
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
  show('s-title');
  loadLibs();
}

boot();
