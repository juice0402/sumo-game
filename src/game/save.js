// 保存（端末の中だけ・試作）。キーは試作①からの sumo-proto-v1 のまま、中身を足していく（前の形はそのまま読める）。
//   shape・drive・mute・short：試作①②から（shape はいま選んでいる力士の形を写す＝道具が使う）
//   slots：力士3枠（{ shape, shikona:[上・つなぎ・下], title, rec:{w,l,d} } か null）・active：いま選んでいる枠
//   rate・hon・jun：本場所のレートと戦績・巡業の戦績（オンラインになったらサーバーが正）
//   words：手に入れた四股名の語（はじめから持っている SHIKONA_START のほか。11/26〜）
import { checkShape } from '../geom/check.js';
import { validShikona, validTitle, randomShikona, startTitle, ownedWords, isStartWord, isWord } from './names.js';
import { RATE } from '../data/banzuke.js';

const SAVE_KEY = 'sumo-proto-v1';
export const SLOT_COUNT = 3;

function rec(r) { return { w: (r && r.w) | 0, l: (r && r.l) | 0, d: (r && r.d) | 0 }; }

// has：持っている語（Set）。新しい力士の四股名は、その中から
export function newRikishi(shape, has = ownedWords()) {
  return { shape, shikona: randomShikona(Math.random, has), title: startTitle(), rec: rec() };
}

function cleanSlot(s) {
  if (!s || !s.shape || !checkShape(s.shape).ok) return null;
  return {
    shape: s.shape,
    shikona: validShikona(s.shikona) ? s.shikona : randomShikona(Math.random, ownedWords()),
    title: validTitle(s.title) ? s.title : startTitle(),
    rec: rec(s.rec),
  };
}

export function loadState() {
  const st = { drive: 'hop', mute: false, short: false, slots: [null, null, null], active: 0, rate: RATE.start, hon: rec(), jun: rec(), words: [] };
  try {
    const d = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
    if (d.drive === 'push' || d.drive === 'hop') st.drive = d.drive;
    st.mute = d.mute === true;
    st.short = d.short === true;
    if (Array.isArray(d.slots)) for (let i = 0; i < SLOT_COUNT; i++) st.slots[i] = cleanSlot(d.slots[i]);
    else if (d.shape && checkShape(d.shape).ok) st.slots[0] = newRikishi(d.shape);   // 試作①②の形 → 1枠目へ
    if (Number.isInteger(d.active) && d.active >= 0 && d.active < SLOT_COUNT) st.active = d.active;
    if (Number.isFinite(d.rate)) st.rate = Math.round(d.rate);
    st.hon = rec(d.hon);
    st.jun = rec(d.jun);
    if (Array.isArray(d.words)) st.words = d.words.filter((id) => isWord(id) && !isStartWord(id));
  } catch (e) { /* 保存できない画面でも遊べる */ }
  // 前からいる力士の語は、持っていることにする（11/26 より前の力士の名前を、編集で元にもどせるように）
  for (const s of st.slots) if (s) for (const id of s.shikona) if (!isStartWord(id) && !st.words.includes(id)) st.words.push(id);
  if (!st.slots[st.active]) st.active = Math.max(0, st.slots.findIndex(Boolean));
  return st;
}

export function saveState(st) {
  const cur = st.slots[st.active];
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      shape: cur ? cur.shape : null, drive: st.drive, mute: st.mute, short: st.short,
      slots: st.slots, active: st.active, rate: st.rate, hon: st.hon, jun: st.jun, words: st.words,
    }));
  } catch (e) { /* */ }
}

// 道具の「はじめての流れを見る」（試作だけ）：いまの保存を1つだけ取っておき、まっさらな部屋から見なおす／もどす
const STASH_KEY = SAVE_KEY + '-bak';
export function freshProgress() {
  return { slots: [null, null, null], active: 0, rate: RATE.start, hon: rec(), jun: rec(), words: [] };
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

export function addRec(r, winner, side = 'a') {
  if (winner === side) r.w++; else if (winner) r.l++; else r.d++;
}
