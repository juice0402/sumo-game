// 四股名と称号：id → 字、ランダムに作る、正しいか確かめる
import { SHIKONA, SHIKONA_LINK_WEIGHTS } from '../data/shikona.js';
import { TITLES, TITLE_START } from '../data/titles.js';
import { T } from '../data/text.js';

const WORD = {};
for (const g of ['kami', 'tsunagi', 'shimo']) for (const w of SHIKONA[g]) WORD[w.id] = Object.assign({ g }, w);
const TITLE = {};
for (const t of TITLES) TITLE[t.id] = t;

export function wordText(id) { return WORD[id] ? WORD[id].t : ''; }
export function shikonaText(ids) { return Array.isArray(ids) ? ids.map(wordText).join('') : ''; }
export function titleText(id) { return TITLE[id] ? TITLE[id].t : ''; }
// 選ぶ画面に出す字（つなぎの「なし」も見えるように）
export function wordLabel(id) { const t = wordText(id); return t || (WORD[id] ? T.linkNone : ''); }

export function validShikona(ids) {
  return Array.isArray(ids) && ids.length === 3 && ['kami', 'tsunagi', 'shimo'].every((g, i) => WORD[ids[i]] && WORD[ids[i]].g === g);
}
export function validTitle(id) { return !!TITLE[id]; }

function pick(list, rng) { return list[Math.floor(rng() * list.length)]; }

export function randomShikona(rng = Math.random) {
  const k = pick(SHIKONA.kami, rng).id;
  let s = pick(SHIKONA.shimo, rng).id;
  for (let i = 0; i < 6 && wordText(s) === wordText(k); i++) s = pick(SHIKONA.shimo, rng).id;   // 同じ字をくり返さない
  let total = 0;
  for (const id in SHIKONA_LINK_WEIGHTS) total += SHIKONA_LINK_WEIGHTS[id];
  let r = rng() * total, t = 't_no';
  for (const id in SHIKONA_LINK_WEIGHTS) { r -= SHIKONA_LINK_WEIGHTS[id]; if (r < 0) { t = id; break; } }
  return [k, t, s];
}
export function randomTitle(rng = Math.random) { return pick(TITLES, rng).id; }
export function startTitle() { return TITLE_START; }
