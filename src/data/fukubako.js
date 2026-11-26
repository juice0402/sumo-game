// 福箱（11/26 しょーくん）：小判で買って開ける。中身は見た目だけ（四股名の語・土俵スキン・紙質・気）＝性能は一切変わらない。
// 決まり（ネット副業 claude/game-art-rule.md「ガチャ」「しくみ」）：
//   ・中身に小判・福箱・ガチャ券は入れない（小判は取組でだけたまる・あとでリワード広告）
//   ・買う前の画面に、段ごと・種類ごとの確率を出す（ui/fuku.js の「出る物と確率」）
//   ・コンプガチャ（そろえたらごほうび）は入れない・演出をスロットやパチンコに似せない
//   ・もう持っている物は出ない（かぶりなし・11/26 しょーくん）
// 数字はみな仮。変えるときはここだけ。

// 小判（取組でもらう・11/26 しょーくん「勝ち30・負け10＋その日の初勝利100」）。巡業と本場所だけ（稽古・初土俵は練習なのでなし）
export const KOBAN = { win: 30, lose: 10, firstWin: 100, price: 300 };

// 段（要件書の仮案：コモン70・レア20・エピック9・レジェンダリー1）。色は判子の色
export const RARITY = [
  { id: 'nami', name: '並', rate: 70, color: '#cfc8b8' },
  { id: 'jo', name: '上', rate: 20, color: '#7f9bb8' },
  { id: 'tokujo', name: '特上', rate: 9, color: '#AB392F' },
  { id: 'kiwami', name: '極', rate: 1, color: '#B79A53' },
];

// 種類
export const KINDS = { word: '四股名の語', title: '称号', paper: '紙質', aura: '気', dohyo: '土俵' };

// 称号・紙質・気・土俵の段（id は data/titles.js・data/papers.js・data/auras.js・data/dohyo.js の key に d_ をつけたもの）
// 称号は、実績の称号（data/titles.js の TITLE_ACH）とかぶらない残りの14こ（11/26 しょーくん「C」）
export const FUKU_TIERS = {
  title: { nami: ['ti_yurayura', 'ti_kazeni', 'ti_fubuki', 'ti_origami', 'ti_nimaigoshi', 'ti_okiagari'], jo: ['ti_shijin', 'ti_harimaru', 'ti_ichimai', 'ti_senmai'], tokujo: ['ti_sumiko', 'ti_kirie', 'ti_hasami'], kiwami: ['ti_washi'] },
  paper: { nami: ['p_hanshi', 'p_wara', 'p_sakura', 'p_wakakusa', 'p_ai'], jo: ['p_asanoha', 'p_seigaiha', 'p_ichimatsu', 'p_shinbun'], tokujo: ['p_suminagashi', 'p_kira'], kiwami: ['p_kinpaku'] },
  aura: { nami: ['a_yuge', 'a_kemuri'], jo: ['a_sakura', 'a_kamifubuki', 'a_hinoko'], tokujo: ['a_inazuma', 'a_shippu'], kiwami: ['a_kin'] },
  dohyo: { nami: ['d_ai', 'd_wakakusa'], jo: ['d_sakura', 'd_yuyake'], tokujo: ['d_urushi', 'd_suminagashi'], kiwami: ['d_kinbyobu'] },
};

// 四股名の語の段：語のなかま（data/shikona.js の cat）で決める。極は特別な語だけ
export const WORD_TIER_BY_CAT = { sumo: 'nami', nature: 'nami', animal: 'nami', food: 'nami', wa: 'jo', surreal: 'jo', myth: 'tokujo', cool: 'tokujo' };
export const WORD_KIWAMI = ['k_densetsu', 'k_ogon', 'k_muso', 's_o', 's_mikado', 's_hasha'];
