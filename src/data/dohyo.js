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
  // 特殊土俵（巡業・物理が変わる）：11/28〜 top.img＝上の面の1枚絵・side.img＝横にくり返す帯（side.tile）＝Codex。月・重石なども同じ形で（絵 media/art/dohyo-<キー>-top・-side）
  // 氷の土俵（data/stages.js の kori）：つめたい白の和紙・青みの厚紙
  kori: {
    name: '氷の箱',
    top: { img: 'dohyo-kori-top', paper: '#E4EBEB', fiber: 0.3, ring: '#201E1B', ringW: 0.05, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-kori-side', tile: true, paper: '#b4c2c4', line: '#201E1B', inset: 0.05, layer: '#7a8d91', text: '#201E1B' },
    edge: '#201E1B', floor: '#242a2d', bg: '#1b2023', tonMark: '#E4EBEB',
  },
  // 激震の土俵（data/stages.js の gekishin）：朱の輪・焼けた色の厚紙
  gekishin: {
    name: '激震の箱',
    top: { img: 'dohyo-gekishin-top', paper: '#E9E0CD', fiber: 0.65, ring: '#AB392F', ringW: 0.07, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-gekishin-side', tile: true, paper: '#bba887', line: '#201E1B', inset: 0.05, layer: '#7c6a4b', text: '#201E1B' },
    edge: '#201E1B', floor: '#2e2620', bg: '#221b17', tonMark: '#EEE9DE',
  },
  // 11/28 夜 #19：巡業の特殊土俵9つ（data/stages.js の tsuki〜kyosho）。絵は Codex（media/art/dohyo-<キー>-top・-side）。
  // 色（paper など）は絵を読む前・絵がないときの代わりで、絵となじむくすんだ色。暗い絵の上は輪と仕切り線を和紙の色に
  tsuki: {
    name: '月の箱',
    top: { img: 'dohyo-tsuki-top', paper: '#D3D8DE', fiber: 0.3, ring: '#201E1B', ringW: 0.05, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-tsuki-side', tile: true, paper: '#9a9a9c', line: '#201E1B', inset: 0.05, layer: '#6e6e72', text: '#201E1B' },
    edge: '#201E1B', floor: '#20232a', bg: '#181b22', tonMark: '#E4E8EE',
  },
  omoishi: {
    name: '重石の箱',
    top: { img: 'dohyo-omoishi-top', paper: '#56585a', fiber: 0.2, ring: '#EEE9DE', ringW: 0.06, shikiri: 0.2, shikiriLen: 0.34, shikiriInk: '#EEE9DE' },
    side: { img: 'dohyo-omoishi-side', tile: true, paper: '#5b5e63', line: '#201E1B', inset: 0.05, layer: '#3e4044', text: '#EEE9DE' },
    edge: '#201E1B', floor: '#242526', bg: '#1b1c1d', tonMark: '#EEE9DE',
  },
  bane: {
    name: 'ばねの箱',
    top: { img: 'dohyo-bane-top', paper: '#EAD7AE', fiber: 0.5, ring: '#AB392F', ringW: 0.055, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-bane-side', tile: true, paper: '#8e2a22', line: '#201E1B', inset: 0.05, layer: '#5e1914', text: '#EEE9DE' },
    edge: '#201E1B', floor: '#2b2220', bg: '#221a18', tonMark: '#EEE9DE',
  },
  nukarumi: {
    name: 'ぬかるみの箱',
    top: { img: 'dohyo-nukarumi-top', paper: '#6a5040', fiber: 0.3, ring: '#EEE9DE', ringW: 0.06, shikiri: 0.2, shikiriLen: 0.34, shikiriInk: '#EEE9DE' },
    side: { img: 'dohyo-nukarumi-side', tile: true, paper: '#6b4630', line: '#201E1B', inset: 0.05, layer: '#47301f', text: '#EEE9DE' },
    edge: '#201E1B', floor: '#2a221c', bg: '#201914', tonMark: '#EEE9DE',
  },
  kokizami: {
    name: '小刻みの箱',
    top: { img: 'dohyo-kokizami-top', paper: '#DDAE68', fiber: 0.5, ring: '#201E1B', ringW: 0.055, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-kokizami-side', tile: true, paper: '#a17a45', line: '#201E1B', inset: 0.05, layer: '#715329', text: '#201E1B' },
    edge: '#201E1B', floor: '#2c2519', bg: '#231d13', tonMark: '#EEE9DE',
  },
  oouneri: {
    name: '大うねりの箱',
    top: { img: 'dohyo-oouneri-top', paper: '#5b819f', fiber: 0.3, ring: '#EEE9DE', ringW: 0.06, shikiri: 0.2, shikiriLen: 0.34, shikiriInk: '#EEE9DE' },
    side: { img: 'dohyo-oouneri-side', tile: true, paper: '#41637f', line: '#201E1B', inset: 0.05, layer: '#2c4459', text: '#EEE9DE' },
    edge: '#201E1B', floor: '#1d2329', bg: '#161b20', tonMark: '#EEE9DE',
  },
  oshi: {
    name: '押しの箱',
    top: { img: 'dohyo-oshi-top', paper: '#84482a', fiber: 0.3, ring: '#EEE9DE', ringW: 0.06, shikiri: 0.2, shikiriLen: 0.34, shikiriInk: '#EEE9DE' },
    side: { img: 'dohyo-oshi-side', tile: true, paper: '#664330', line: '#201E1B', inset: 0.05, layer: '#442b1d', text: '#EEE9DE' },
    edge: '#201E1B', floor: '#2a201b', bg: '#211814', tonMark: '#EEE9DE',
  },
  hayate: {
    name: '疾風の箱',
    top: { img: 'dohyo-hayate-top', paper: '#E1EAD3', fiber: 0.45, ring: '#201E1B', ringW: 0.05, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-hayate-side', tile: true, paper: '#c4ceae', line: '#201E1B', inset: 0.05, layer: '#919b7b', text: '#201E1B' },
    edge: '#201E1B', floor: '#22261f', bg: '#1b1e18', tonMark: '#EEE9DE',
  },
  // 狭小：箱・輪・カメラの大きさは物理（stages.js の ringHalf・tawara）から作る＝ここは色だけ
  kyosho: {
    name: '狭小の箱',
    top: { img: 'dohyo-kyosho-top', paper: '#EFCF9E', fiber: 0.4, ring: '#201E1B', ringW: 0.06, shikiri: 0.15, shikiriLen: 0.28 },
    side: { img: 'dohyo-kyosho-side', tile: true, paper: '#d9b47c', line: '#201E1B', inset: 0.05, layer: '#a8834f', text: '#201E1B' },
    edge: '#201E1B', floor: '#2b251d', bg: '#211c16', tonMark: '#EEE9DE',
  },
};

// ---- 土俵スキン（11/26：福箱から出る・本場所で使える・見た目だけ）。top.pat は ui/papertex.js のもよう ----
// 11/28〜 top.img＝上の面の1枚絵・side.img＝横の面の帯（Codex・media/art/dohyo-*.webp・tools/dohyo_cut.py）。読む前と絵がないときは paper・pat の紙で描く
Object.assign(DOHYO, {
  ai: {
    name: '藍の土俵',
    top: { img: 'dohyo-ai-top', paper: '#DCE2EA', fiber: 0.5, ring: '#2F4766', ringW: 0.055, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-ai-side', paper: '#8b9bb0', line: '#201E1B', inset: 0.05, layer: '#5d6d82', text: '#EEE9DE' },
    edge: '#201E1B', floor: '#21252b', bg: '#1a1d22', tonMark: '#EEE9DE',
  },
  wakakusa: {
    name: '若草の土俵',
    top: { img: 'dohyo-wakakusa-top', paper: '#E6EAD5', fiber: 0.6, ring: '#3D6B4F', ringW: 0.055, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-wakakusa-side', paper: '#a9b38a', line: '#201E1B', inset: 0.05, layer: '#77825a', text: '#201E1B' },
    edge: '#201E1B', floor: '#23271f', bg: '#1c1f19', tonMark: '#EEE9DE',
  },
  sakura: {
    name: '桜の土俵',
    top: { img: 'dohyo-sakura-top', paper: '#F3E4E1', fiber: 0.5, ring: '#AB392F', ringW: 0.05, shikiri: 0.2, shikiriLen: 0.34, pat: 'hanabira', ink: '#E7B3BA' },
    side: { img: 'dohyo-sakura-side', paper: '#d6b3b0', line: '#201E1B', inset: 0.05, layer: '#a8807c', text: '#201E1B' },
    edge: '#201E1B', floor: '#2b2224', bg: '#221b1d', tonMark: '#EEE9DE',
  },
  yuyake: {
    name: '夕焼けの土俵',
    top: { img: 'dohyo-yuyake-top', paper: '#F1DEC6', fiber: 0.6, ring: '#201E1B', ringW: 0.055, shikiri: 0.2, shikiriLen: 0.34 },
    side: { img: 'dohyo-yuyake-side', paper: '#d0956a', line: '#201E1B', inset: 0.05, layer: '#9c6440', text: '#201E1B' },
    edge: '#201E1B', floor: '#2e2219', bg: '#261a14', tonMark: '#EEE9DE',
  },
  urushi: {
    name: '漆の土俵',
    top: { img: 'dohyo-urushi-top', paper: '#2a1d1a', fiber: 0.15, ring: '#C2453A', ringW: 0.06, shikiri: 0.2, shikiriLen: 0.34, shikiriInk: '#EEE9DE' },
    side: { img: 'dohyo-urushi-side', paper: '#5c2a24', line: '#B79A53', inset: 0.05, layer: '#3d1a16', text: '#EEE9DE' },
    edge: '#B79A53', floor: '#1d1615', bg: '#161110', tonMark: '#EEE9DE',
  },
  suminagashi: {
    name: '墨流しの土俵',
    top: { img: 'dohyo-suminagashi-top', paper: '#EEE9DE', fiber: 0.4, ring: '#201E1B', ringW: 0.06, shikiri: 0.2, shikiriLen: 0.34, pat: 'suminagashi', ink: '#6f685c' },
    side: { img: 'dohyo-suminagashi-side', paper: '#b9b1a2', line: '#201E1B', inset: 0.05, layer: '#868072', text: '#201E1B' },
    edge: '#201E1B', floor: '#242220', bg: '#1d1b19', tonMark: '#EEE9DE',
  },
  kinbyobu: {
    name: '金屏風の土俵',
    top: { img: 'dohyo-kinbyobu-top', paper: '#C9A445', fiber: 0, ring: '#201E1B', ringW: 0.06, shikiri: 0.2, shikiriLen: 0.34, pat: 'kinpaku', ink: '#8a6d24' },
    side: { img: 'dohyo-kinbyobu-side', paper: '#a9852f', line: '#201E1B', inset: 0.05, layer: '#7a5e1d', text: '#201E1B' },
    edge: '#201E1B', floor: '#2a2318', bg: '#211b12', tonMark: '#EEE9DE',
  },
});

export const DOHYO_DEFAULT = 'kami';
