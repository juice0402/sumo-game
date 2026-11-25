// 土俵の見た目（1つの土俵＝1項目）。描く側（ui/stage3d.js）はこの項目を読むだけ。
// 新しい土俵は、ここに項目を1つ足せば出せる（おきらくマッチで土俵が変わる予定）。
// 大きさは物理の土俵（config の PHYS.ringHalf・ringDepth）から作る。見た目だけで、物理にはさわらない。
export const DOHYO = {
  kami: {
    name: '紙の箱',
    top: {
      paper: '#EEE9DE',      // 上の面に貼った和紙
      fiber: 0.55,           // 和紙のすじの濃さ（0〜1）
      ring: '#201E1B',       // 墨の輪
      ringW: 0.055,          // 輪の太さ（土俵の幅に対する割合）
      ringInset: 0.03,       // 輪をふちから内へ（土俵の幅に対する割合）
      shikiri: 0.2,          // 仕切り線の中心からの距離（m・0＝なし）
      shikiriLen: 0.34,      // 仕切り線の長さ（m）
    },
    side: {
      paper: '#cbbfa5',      // 横の面（厚紙）
      line: '#201E1B',       // 横の面のふちどり
      inset: 0.05,           // ふちどりの内へのずれ（m）
      layer: '#8f826a',      // 厚紙の断面の線
      text: '#201E1B',       // 決着の説明（横の面のまん中に墨で書く）
    },
    edge: '#201E1B',         // 箱のかどの線
    floor: '#2b2824',        // 箱を置いた床
    bg: '#201E1B',           // うしろ
    tonMark: '#EEE9DE',      // トンの合図の線
  },
  // 氷の土俵（data/stages.js の kori）：つめたい白の和紙・青みの厚紙
  kori: {
    name: '氷の箱',
    top: { paper: '#E4EBEB', fiber: 0.3, ring: '#201E1B', ringW: 0.05, ringInset: 0.03, shikiri: 0.2, shikiriLen: 0.34 },
    side: { paper: '#b4c2c4', line: '#201E1B', inset: 0.05, layer: '#7a8d91', text: '#201E1B' },
    edge: '#201E1B', floor: '#242a2d', bg: '#1b2023', tonMark: '#E4EBEB',
  },
  // 激震の土俵（data/stages.js の gekishin）：朱の輪・焼けた色の厚紙
  gekishin: {
    name: '激震の箱',
    top: { paper: '#E9E0CD', fiber: 0.65, ring: '#AB392F', ringW: 0.07, ringInset: 0.03, shikiri: 0.2, shikiriLen: 0.34 },
    side: { paper: '#bba887', line: '#201E1B', inset: 0.05, layer: '#7c6a4b', text: '#201E1B' },
    edge: '#201E1B', floor: '#2e2620', bg: '#221b17', tonMark: '#EEE9DE',
  },
};

export const DOHYO_DEFAULT = 'kami';
