// 称号の手に入れ方（11/26 しょーくん「C」）：取組の実績で手に入る称号を決める。福箱の称号は game/fukubako.js
// 見た目だけ（強さにはさわらない）。実績はそろえても、ほかのごほうびはない
import { TITLES, TITLE_START, TITLE_ACH, TITLE_NUM, TITLE_RANK } from '../data/titles.js';
import { BANZUKE } from '../data/banzuke.js';
import { CPU_SHAPES } from '../data/cpu-shapes.js';

const rankMin = (id) => (BANZUKE.find((b) => b.id === id) || { min: Infinity }).min;
const won = (c) => c.winner === 'a';

// c：{ mode（jungyo・honbasho・keiko）, winner, kima（決まり手の id）, hour }。st は取組の結果を入れたあと
const COND = {
  ti_shinsei: (st, c) => c.rated && won(c),
  ti_oshi: (st, c) => c.rated && won(c) && c.kima === 'oshidashi',
  ti_tawara: (st, c) => c.rated && won(c) && c.kima === 'tsukiotoshi',
  ti_kamihitoe: (st, c) => c.rated && won(c) && (c.kima === 'fumidashi' || c.kima === 'isamiashi'),
  ti_fudo: (st) => (st.streak | 0) >= TITLE_NUM.streak,
  ti_nikoniko: (st) => st.hon.l + st.jun.l >= TITLE_NUM.loses,
  ti_kenkyu: (st) => CPU_SHAPES.every((s) => st.keikoWon.includes(s.id)),
  ti_ippitsu: (st) => st.slots.every(Boolean),
  ti_yofukashi: (st, c) => c.hour >= TITLE_NUM.nightFrom && c.hour < TITLE_NUM.nightTo,
};
for (const id in TITLE_RANK) COND[id] = (st, c) => c.mode === 'honbasho' && st.rate >= rankMin(TITLE_RANK[id]);

export function ownedTitles(state) { return new Set([TITLE_START, ...(state.titles || [])]); }
export function isTitle(id) { return TITLES.some((t) => t.id === id); }

// 取組のあと：連勝・稽古で勝った相手を数えて、新しく手に入れた称号の id を返す（state.titles に足す）
// foeId：稽古の相手（CPU の形の id）
export function afterBout(state, c) {
  c.rated = c.mode === 'jungyo' || c.mode === 'honbasho';
  if (c.rated) { if (won(c)) state.streak = (state.streak | 0) + 1; else if (c.winner) state.streak = 0; }
  if (c.mode === 'keiko' && won(c) && c.foeId && !state.keikoWon.includes(c.foeId)) state.keikoWon.push(c.foeId);
  const has = ownedTitles(state), got = [];
  for (const id in TITLE_ACH) {
    if (has.has(id) || !COND[id] || !COND[id](state, c)) continue;
    state.titles.push(id);
    got.push(id);
  }
  return got;
}
