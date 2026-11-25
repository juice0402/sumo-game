// はじまり：物理を用意して、画面をつなぐ
//   タイトル → 相撲部屋 →「勝負」→ 巡業（土俵巡業の抽選）／本場所（番付）／稽古（CPU）→ 力士選出 → 取組
//   相撲部屋 → 力士をつくる（3枠）→ 力士の編集（四股名・称号・切り直す・引退）
import { T } from '../data/text.js';
import { STAGES, HONBASHO_STAGE } from '../data/stages.js';
import { setRapier } from '../sim/battle.js';
import { loadState, saveState, newRikishi, addRec, freshProgress, hasStash, stashSave, unstashSave } from '../game/save.js';
import { shikonaText, titleText, randomShikona } from '../game/names.js';
import { CPU_SHAPES } from '../data/cpu-shapes.js';
import { rankOf, eloDelta } from '../game/rating.js';
import { drawStage } from '../game/jungyo.js';
import { makeFoe } from '../game/foe.js';
import { initCut } from './cut.js';
import { unpackLib } from './unpack.js';
import { initPick, drawShapeThumb } from './pick.js';
import { initBout } from './bout.js';
import { initTools } from './tools.js';
import { initHeya } from './heya.js';
import { reset as resetChoose } from './choose.js';
import { renderSlots, initEdit, fitText } from './roster.js';
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
// 画面を開くと、ボタンやカードが右から順にシュッと入る（筆の音を小さく重ねる）
const ENTER = '.hero, .cols > *, .stagecards > *, .sched > *, .actions > *, .note, .drive';
function enter(el) {
  resetChoose(el);   // メニューでえらんだ動き（朱の帯・すべって消えた列）をもとへ
  el.classList.remove('enter');
  void el.offsetWidth;   // 動きを最初から
  const items = el.querySelectorAll(ENTER);
  items.forEach((c, i) => c.style.setProperty('--i', i));
  el.classList.add('enter');
  const n = Math.min(items.length, 6);
  for (let i = 0; i < n; i++) setTimeout(() => playSfx('fude', { vol: 0.1, rate: 1.7 + i * 0.06 }), 40 + i * 58);
}
function show(id) {
  for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id;
  cur = id;
  if (onShow[id]) onShow[id]();
  const el = document.getElementById(id);
  if (id !== 's-bout' && id !== 's-cut') enter(el);
}
function go(id) { if (cur && cur !== id && cur !== 's-title' && cur !== 's-bout') nav.push(cur); show(id); }
function back() { show(nav.pop() || 's-home'); }
function home() { nav.length = 0; show('s-home'); }

// 重いもの（物理 3.4MB・3D 0.7MB・効果音）は、はじめの画面を出してから動かす（はじめの画面を早く出すため）。
// ビルドが <script type="text/plain" id="lib-…"> に入れておいたものを、1つずつ動かす（あいだに画面を描けるように少し待つ）
let ready = null;
function loadLibs() {
  if (ready) return ready;
  // 重いものは gzip して入れてある（unpack.js）。1つずつ、画面に息つぎさせながら（30ms あけて）ほどく
  const pause = () => new Promise((ok) => setTimeout(ok, 30));
  const run = (id) => pause().then(() => unpackLib(id)).then((bytes) => {
    if (!bytes) return;
    const s = document.createElement('script');
    s.text = new TextDecoder().decode(bytes);
    document.head.appendChild(s);
  });
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
    .then(() => pause().then(() => unpackLib('lib-wasm')))
    .then((wasm) => { window.__SUMO_WASM = wasm.buffer; return window.RAPIER.init(); })
    .then(() => { delete window.__SUMO_WASM; setRapier(window.RAPIER); return run('lib-three'); });
  ready.catch(() => {
    const el = document.getElementById('err');
    el.textContent = T.noWasm;
    el.hidden = false;
  });
  return ready;
}

function boot() {
  let editSlot = 0, bzTitle = '番付', stamping = false;
  // 切る：どの枠を切るか・切ったあとどこへ行くか
  let cutSlot = 0, afterCut = null;
  function cutFor(i, then, opt) {
    cutSlot = i;
    afterCut = then;
    go('s-cut');
    cut.show(state.slots[i] ? state.slots[i].shape : null, opt);
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
  onShow['s-pick'] = () => {
    pick.show();
    const s = activeSlot();
    document.getElementById('me-text').textContent = s ? shikonaText(s.shikona) : T.yourShape;
  };

  const bout = initBout({
    getDrive: () => state.drive,
    getShort: () => state.short,
    onFoe() { show('s-pick'); },
    onRecut() { cutFor(state.active, () => { pick.resetMarks(); show('s-pick'); }); },
    onNext(mode) { if (mode === 'shodohyo') show('s-meimei'); else openSelect(mode); },
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
    // 選んだ列に朱の判子をポンと押してから取組へ
    onPick(i) {
      if (stamping) return;
      stamping = true;
      const btn = document.querySelectorAll('#sel-slots .slot')[i];
      if (btn) btn.classList.add('stamp');
      playSfx('ton', { vol: 0.7 });
      setTimeout(() => loadLibs().then(() => { stamping = false; fight(i); }), 460);
    },
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
    onStart: home,
    getShort: () => state.short,
    onRoster() { if (hasRikishi()) go('s-roster'); else startIntro(); },
    onShobu() { if (hasRikishi()) go('s-mode'); else startIntro(); },
    onJungyoMatch() { go('s-jungyo'); },   // 土俵巡業の予定は、巡業をえらんだ人だけが見る（11/25 部屋のメニューから外した）
    onHonbasho() { bzTitle = T.mode.honbasho; go('s-banzuke'); },
    onKeiko() { pick.resetMarks(); go('s-pick'); },
  });
  onShow['s-home'] = () => heya.home(state);

  // はじめての流れ（11/25 しょーくん「BからのA」）：空の相撲部屋 →「力士をつくる」→ お手本つきで切る
  //   → 初土俵（CPU の釣鐘と1番・戦績には数えない）→ 四股名をさずかる → 相撲部屋
  function startIntro() {
    const i = Math.max(0, state.slots.findIndex((s) => !s));
    cutFor(i, () => shodohyo(i), { demo: true });
  }
  function shodohyo(i) {
    const me = state.slots[i];
    const foe = CPU_SHAPES[0];
    meimeiSlot = i;
    show('s-bout');
    bout.start(me.shape, foe, state.seed++, { mode: 'shodohyo', a: { name: T.you, sub: T.shodohyo }, b: { name: foe.name }, nextLabel: T.toMeimei });
  }
  let meimeiSlot = 0;
  onShow['s-meimei'] = () => {
    const s = state.slots[meimeiSlot];
    document.getElementById('mm-title').textContent = titleText(s.title);
    fitText(document.getElementById('mm-name'), shikonaText(s.shikona));
    drawShapeThumb(document.getElementById('mm-cv'), s.shape);
    setTimeout(() => playSfx('sumi', { vol: 0.45 }), 380);
    setTimeout(() => playSfx('ton', { vol: 0.75 }), 1150);
  };
  document.getElementById('mm-again').addEventListener('click', () => {
    state.slots[meimeiSlot].shikona = randomShikona();
    save();
    show('s-meimei');
  });
  document.getElementById('mm-ok').addEventListener('click', home);
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
  // はじめての流れを見なおす（11/25 しょーくん「見るすべがなかった」）：いまの保存は取っておき、まっさらな部屋へ
  const unstashBtn = document.getElementById('b-unstash');
  const paintStash = () => { unstashBtn.hidden = !hasStash(); };
  const PROGRESS = ['slots', 'active', 'rate', 'hon', 'jun'];
  document.getElementById('b-intro').addEventListener('click', () => {
    stashSave();
    Object.assign(state, freshProgress());
    save();
    tools.close();
    home();
  });
  unstashBtn.addEventListener('click', () => {
    if (unstashSave()) { const st = loadState(); for (const k of PROGRESS) state[k] = st[k]; }
    tools.close();
    home();
  });
  document.getElementById('b-tools').addEventListener('click', () => { paintStash(); loadLibs().then(() => tools.open()); });
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
