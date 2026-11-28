// 保存（端末の中だけ・試作）。キーは試作①からの sumo-proto-v1 のまま、中身を足していく（前の形はそのまま読める）。
//   shape・drive・mute・short：試作①②から（shape はいま選んでいる力士の形を写す＝道具が使う）
//   vol：音の大きさ（0 消す・1 小さい・2 ふつう＝設定・11/28〜）。前の mute:true は 0 として読む。mute は vol 0 のとき true で書く（前の版でも消したまま）
//   slots：力士3枠（{ shape, shikona:[上・つなぎ・下], title, rec:{w,l,d} } か null）・active：いま選んでいる枠
//   rate・hon・jun：本場所のレートと戦績・巡業の戦績（オンラインになったらサーバーが正）
//   words：手に入れた四股名の語（はじめから持っている SHIKONA_START のほか。11/26〜）
//   koban・kobanDay：小判（取組でたまる）・その日の初勝利をもらった日／items：福箱で手に入れた紙質・気・土俵／dohyo：本場所の土俵スキン
//   slots[i].paper・aura：力士ごとの紙質と気（見た目だけ）
//   titles：手に入れた称号（はじめから持っている TITLE_START のほか。実績と福箱・11/26〜）・streak：巡業と本場所の連勝・keikoWon：稽古で勝った CPU の形
import { checkShape } from '../geom/check.js';
import { validShikona, validTitle, randomShikona, startTitle, ownedWords, isStartWord, isWord } from './names.js';
import { RATE, BANZUKE } from '../data/banzuke.js';
import { PAPERS, PAPER_DEFAULT } from '../data/papers.js';
import { AURAS, AURA_DEFAULT } from '../data/auras.js';
import { DOHYO } from '../data/dohyo.js';
import { TITLE_START } from '../data/titles.js';
import { CPU_SHAPES } from '../data/cpu-shapes.js';
import { VOL, VOL_DEFAULT } from '../data/settings.js';

const SAVE_KEY = 'sumo-proto-v1';
export const SLOT_COUNT = 3;

function rec(r) { return { w: (r && r.w) | 0, l: (r && r.l) | 0, d: (r && r.d) | 0 }; }

// has：持っている語（Set）。新しい力士の四股名は、その中から
export function newRikishi(shape, has = ownedWords()) {
  return { shape, shikona: randomShikona(Math.random, has), title: startTitle(), rec: rec(), paper: PAPER_DEFAULT, aura: AURA_DEFAULT };
}

function cleanSlot(s) {
  if (!s || !s.shape || !checkShape(s.shape).ok) return null;
  return {
    shape: s.shape,
    shikona: validShikona(s.shikona) ? s.shikona : randomShikona(Math.random, ownedWords()),
    title: validTitle(s.title) ? s.title : startTitle(),
    rec: rec(s.rec),
    paper: PAPERS[s.paper] ? s.paper : PAPER_DEFAULT,
    aura: AURAS[s.aura] ? s.aura : AURA_DEFAULT,
  };
}

export function loadState() {
  const st = { drive: 'hop', vol: VOL_DEFAULT, short: false, unlockAll: true, venueView: null, slots: [null, null, null], active: 0, rate: RATE.start, hon: rec(), jun: rec(), words: [], koban: 0, kobanDay: '', items: [], dohyo: 'kami', titles: [], streak: 0, keikoWon: [] };
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (d.drive === 'push' || d.drive === 'hop') st.drive = d.drive;
    if (Number.isInteger(d.vol) && d.vol >= 0 && d.vol < VOL.length) st.vol = d.vol;
    else if (d.mute === true) st.vol = 0;   // 前の「音を消す」
    st.short = d.short === true;
    st.unlockAll = d.unlockAll !== false;   // 道具の「ぜんぶ持っている」（試しだけ・はじめは入）
    if (Number.isInteger(d.venueView) && d.venueView >= 0 && d.venueView < BANZUKE.length) st.venueView = d.venueView;   // 道具の「本場所の会場」（試しだけ・null＝番付どおり）
    if (Array.isArray(d.slots)) for (let i = 0; i < SLOT_COUNT; i++) st.slots[i] = cleanSlot(d.slots[i]);
    else if (d.shape && checkShape(d.shape).ok) st.slots[0] = newRikishi(d.shape);   // 試作①②の形 → 1枠目へ
    if (Number.isInteger(d.active) && d.active >= 0 && d.active < SLOT_COUNT) st.active = d.active;
    if (Number.isFinite(d.rate)) st.rate = Math.round(d.rate);
    st.hon = rec(d.hon);
    st.jun = rec(d.jun);
    if (Array.isArray(d.words)) st.words = d.words.filter((id) => isWord(id) && !isStartWord(id));
    if (Number.isFinite(d.koban) && d.koban > 0) st.koban = Math.floor(d.koban);
    if (typeof d.kobanDay === 'string') st.kobanDay = d.kobanDay;
    if (Array.isArray(d.items)) st.items = d.items.filter((id) => typeof id === 'string' && (PAPERS[id] || AURAS[id] || (id.startsWith('d_') && DOHYO[id.slice(2)])));
    if (typeof d.dohyo === 'string' && DOHYO[d.dohyo]) st.dohyo = d.dohyo;
    if (Array.isArray(d.titles)) st.titles = d.titles.filter((id) => validTitle(id) && id !== TITLE_START);
    if (Number.isFinite(d.streak) && d.streak > 0) st.streak = Math.floor(d.streak);
    if (Array.isArray(d.keikoWon)) st.keikoWon = d.keikoWon.filter((id) => CPU_SHAPES.some((c) => c.id === id));
  } catch (e) { /* 保存できない画面でも遊べる */ }
  // 前からいる力士の語は、持っていることにする（11/26 より前の力士の名前を、編集で元にもどせるように）
  for (const s of st.slots) if (s) for (const id of s.shikona) if (!isStartWord(id) && !st.words.includes(id)) st.words.push(id);
  // 前からいる力士の称号も、持っていることにする（11/26 より前は24こ全部えらべた）
  for (const s of st.slots) if (s && s.title !== TITLE_START && !st.titles.includes(s.title)) st.titles.push(s.title);
  if (!st.slots[st.active]) st.active = Math.max(0, st.slots.findIndex(Boolean));
  return st;
}

export function saveState(st) {
  const cur = st.slots[st.active];
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      shape: cur ? cur.shape : null, drive: st.drive, vol: st.vol, mute: st.vol === 0, short: st.short, unlockAll: st.unlockAll, venueView: st.venueView,
      slots: st.slots, active: st.active, rate: st.rate, hon: st.hon, jun: st.jun, words: st.words,
      koban: st.koban, kobanDay: st.kobanDay, items: st.items, dohyo: st.dohyo,
      titles: st.titles, streak: st.streak, keikoWon: st.keikoWon,
    }));
  } catch (e) { /* */ }
}

// 道具の「はじめての流れを見る」（試作だけ）：いまの保存を1つだけ取っておき、まっさらな部屋から見なおす／もどす
const STASH_KEY = SAVE_KEY + '-bak';
export function freshProgress() {
  return { slots: [null, null, null], active: 0, rate: RATE.start, hon: rec(), jun: rec(), words: [], koban: 0, kobanDay: '', items: [], dohyo: 'kami', titles: [], streak: 0, keikoWon: [] };
}
export function hasStash() {
  try { return !!localStorage.getItem(STASH_KEY); } catch (e) { return false; }
}
export function stashSave() {   // もう取ってあれば上書きしない（何度見なおしても、最初の力士たちを守る）
  try {
    const cur = localStorage.getItem(SAVE_KEY);
    if (cur && !localStorage.getItem(STASH_KEY)) localStorage.setItem(STASH_KEY, cur);
  } catch (e) { /* */ }
}
export function unstashSave() {
  try {
    const b = localStorage.getItem(STASH_KEY);
    if (!b) return false;
    localStorage.setItem(SAVE_KEY, b);
    localStorage.removeItem(STASH_KEY);
    return true;
  } catch (e) { return false; }
}

// 設定の「データを消す」：保存と、道具の「はじめての流れを見る」で取っておいた保存を消す
export function wipeSave() {
  try { localStorage.removeItem(SAVE_KEY); localStorage.removeItem(STASH_KEY); } catch (e) { /* */ }
}

export function addRec(r, winner, side = 'a') {
  if (winner === side) r.w++; else if (winner) r.l++; else r.d++;
}
