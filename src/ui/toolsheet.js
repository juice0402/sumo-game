// 道具のシート（試しのページ＝node tools/build.mjs --artifact だけ・11/28 issue #27）。
// 遊ぶ人が開く index.html では、ビルドがこのファイルを toolsheet-off.js に入れかえる（道具のボタンとシートも page.html の <!--TOOLS--> ごと外す）
import { T } from '../data/text.js';
import { BANZUKE } from '../data/banzuke.js';
import { loadState, freshProgress, hasStash, stashSave, unstashSave } from '../game/save.js';
import { initTools } from './tools.js';

export const HAS_TOOLS = true;

// c：{ state, save, activeSlot, loadLibs, home, repaintHome }。もどり値 { close, reset }
export function initToolSheet(c) {
  const { state, save } = c;
  const tools = initTools({ getShape: () => (c.activeSlot() ? c.activeSlot().shape : null), getDrive: () => state.drive });
  // はじめての流れを見なおす（11/25 しょーくん「見るすべがなかった」）：いまの保存は取っておき、まっさらな部屋へ
  const unstashBtn = document.getElementById('b-unstash');
  const paintStash = () => { unstashBtn.hidden = !hasStash(); };
  const PROGRESS = ['slots', 'active', 'rate', 'hon', 'jun', 'words', 'koban', 'kobanDay', 'items', 'dohyo', 'titles', 'streak', 'keikoWon'];
  document.getElementById('b-intro').addEventListener('click', () => {
    stashSave();
    Object.assign(state, freshProgress());
    save();
    tools.close();
    c.home();
  });
  unstashBtn.addEventListener('click', () => {
    if (unstashSave()) { const st = loadState(); for (const k of PROGRESS) state[k] = st[k]; }
    tools.close();
    c.home();
  });
  document.getElementById('b-koban').addEventListener('click', () => { state.koban += 1000; save(); c.repaintHome(); });   // 福箱をためす（試作だけ）
  document.getElementById('b-tools').addEventListener('click', () => { paintStash(); c.loadLibs().then(() => tools.open()); });
  const toggle = (id, key) => {
    const b = document.getElementById(id);
    const paint = () => b.setAttribute('aria-pressed', String(state[key]));
    paint();
    b.addEventListener('click', () => { state[key] = !state[key]; paint(); save(); });
    return paint;
  };
  const paintUnlock = toggle('b-unlock', 'unlockAll');
  state.cheerTest = false;   // 道具の「勝ったときの演出をいつも見る」（試しだけ・保存しない）
  const paintCheer = toggle('b-cheer', 'cheerTest');
  const venueBtn = document.getElementById('b-venue');
  const paintVenue = () => { venueBtn.textContent = T.venueView(state.venueView != null ? BANZUKE[state.venueView].name : ''); };
  paintVenue();
  venueBtn.addEventListener('click', () => {   // 番付どおり → 序ノ口 → … → 横綱 → 番付どおり
    state.venueView = state.venueView == null ? 0 : state.venueView + 1 < BANZUKE.length ? state.venueView + 1 : null;
    paintVenue(); save();
  });
  return {
    close: tools.close,
    // 設定の「データを消す」のあと：保存しない切りかえを切って、ボタンを今の状態に
    reset() { state.cheerTest = false; paintUnlock(); paintCheer(); paintVenue(); },
  };
}
