// 遊ぶ人が開く index.html の「道具」：なし（ビルドが toolsheet.js のかわりにこれを入れる・11/28 issue #27）。
// 試しだけの切りかえ（ぜんぶ持っている・本場所の会場・決着の演出をいつも見る）は切っておく
export const HAS_TOOLS = false;

export function initToolSheet(c) {
  const off = () => { c.state.unlockAll = false; c.state.venueView = null; c.state.cheerTest = false; };
  off();
  return { close() {}, reset: off };
}
