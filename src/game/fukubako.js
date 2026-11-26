// 福箱のしくみ：出る物の一覧・確率・引く・小判。見た目だけの物しか出さない（data/fukubako.js の決まり）
import { KOBAN, RARITY, KINDS, FUKU_TIERS, WORD_TIER_BY_CAT, WORD_KIWAMI } from '../data/fukubako.js';
import { SHIKONA, SHIKONA_START } from '../data/shikona.js';
import { PAPERS, PAPER_DEFAULT } from '../data/papers.js';
import { AURAS, AURA_DEFAULT } from '../data/auras.js';
import { DOHYO } from '../data/dohyo.js';
import { TITLE_START } from '../data/titles.js';
import { wordText, titleText } from './names.js';

// 出る物ぜんぶ：{ id, kind, tier, name }
export const FUKU_ITEMS = [];
for (const g of ['kami', 'shimo']) {
  for (const w of SHIKONA[g]) {
    if (SHIKONA_START.includes(w.id)) continue;
    const tier = WORD_KIWAMI.includes(w.id) ? 'kiwami' : WORD_TIER_BY_CAT[w.cat];
    if (tier) FUKU_ITEMS.push({ id: w.id, kind: 'word', tier, name: wordText(w.id), part: g });
  }
}
for (const kind of ['title', 'paper', 'aura', 'dohyo']) {
  for (const tier in FUKU_TIERS[kind]) {
    for (const id of FUKU_TIERS[kind][tier]) FUKU_ITEMS.push({ id, kind, tier, name: itemName(id, kind) });
  }
}
const BY_ID = {};
for (const it of FUKU_ITEMS) BY_ID[it.id] = it;

export function itemName(id, kind = BY_ID[id] && BY_ID[id].kind) {
  if (kind === 'paper') return PAPERS[id] ? PAPERS[id].name : '';
  if (kind === 'aura') return AURAS[id] ? AURAS[id].name : '';
  if (kind === 'dohyo') { const d = DOHYO[id.slice(2)]; return d ? d.name : ''; }
  if (kind === 'title') return titleText(id);
  return wordText(id);
}
export function fukuItem(id) { return BY_ID[id] || null; }
export function tierOf(id) { return RARITY.find((r) => r.id === (BY_ID[id] && BY_ID[id].tier)) || null; }
export function kindName(kind) { return KINDS[kind] || ''; }

// 持っている物（はじめから持っている物＋手に入れた物）
export function ownedItems(state) {
  return new Set([...SHIKONA_START, TITLE_START, PAPER_DEFAULT, AURA_DEFAULT, ...(state.words || []), ...(state.titles || []), ...(state.items || [])]);
}
export function ownedPapers(state) { const o = ownedItems(state); return Object.keys(PAPERS).filter((id) => o.has(id)); }
export function ownedAuras(state) { const o = ownedItems(state); return Object.keys(AURAS).filter((id) => o.has(id)); }
// 本場所で使える土俵（data/dohyo.js の key）：いつもの紙の箱＋手に入れた土俵スキン
export function ownedDohyo(state) {
  const o = ownedItems(state);
  return ['kami', ...FUKU_ITEMS.filter((it) => it.kind === 'dohyo' && o.has(it.id)).map((it) => it.id.slice(2))];
}

// いまの確率（買う前に見せる）。もう持っている物は出ないので、そろった段はぬいて、残りの段で割りなおす
export function fukuOdds(owned) {
  const rows = RARITY.map((r) => {
    const items = FUKU_ITEMS.filter((it) => it.tier === r.id && !owned.has(it.id));
    const kinds = {};
    for (const it of items) kinds[it.kind] = (kinds[it.kind] || 0) + 1;
    return { tier: r, items, kinds, rate: 0 };
  });
  const total = rows.reduce((s, x) => s + (x.items.length ? x.tier.rate : 0), 0);
  for (const x of rows) x.rate = x.items.length && total ? (x.tier.rate * 100) / total : 0;
  return { rows, left: rows.reduce((s, x) => s + x.items.length, 0), all: FUKU_ITEMS.length };
}

// 1つ引く：段を確率で決め → その段の、まだ持っていない物からひとしく。なにも残っていなければ null
export function drawFuku(owned, rng = Math.random) {
  const { rows } = fukuOdds(owned);
  const live = rows.filter((x) => x.items.length);
  if (!live.length) return null;
  let r = rng() * 100;
  let row = live[live.length - 1];
  for (const x of live) { r -= x.rate; if (r < 0) { row = x; break; } }
  return row.items[Math.floor(rng() * row.items.length)];
}

// 手に入れる（語は words、称号は titles、ほかは items）
export function addItem(state, it) {
  if (it.kind === 'word') { if (!state.words.includes(it.id)) state.words.push(it.id); }
  else if (it.kind === 'title') { if (!state.titles.includes(it.id)) state.titles.push(it.id); }
  else if (!state.items.includes(it.id)) state.items.push(it.id);
}

// 取組の小判（巡業・本場所）。today：その日の文字（例 2026-11-26）。もらった数と、初勝利だったかを返す
export function kobanFor(state, winner, today) {
  let n = winner === 'a' ? KOBAN.win : KOBAN.lose;
  let first = false;
  if (winner === 'a' && state.kobanDay !== today) { n += KOBAN.firstWin; first = true; state.kobanDay = today; }
  state.koban = (state.koban | 0) + n;
  return { n, first };
}
export function todayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
