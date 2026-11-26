// 称号（力士の四股名の上に小さく出る）。見た目だけで、強さにはさわらない（要件 11）。
// 1つ＝「id:字」。id は保存とサーバーで使う共通の ID。
// 手に入れ方（11/26 しょーくん「C」＝取組の実績と福箱で半分ずつ）：
//   はじめから＝TITLE_START だけ／実績＝TITLE_ACH（条件の中身は game/titles.js）／福箱＝data/fukubako.js の FUKU_TIERS.title
//   前からいる力士がつけている称号は、持っていることにする（game/save.js）。相手（CPU）の称号は全部から
const LIST = [
  'shindeshi:新弟子', 'shinsei:期待の新星', 'kamihitoe:紙一重', 'ippitsu:一筆入魂', 'oshi:押しの一手',
  'fudo:不動の構え', 'shijin:土俵の詩人', 'yurayura:ゆらゆら名人', 'sumiko:墨の申し子', 'kirie:切り絵の達人',
  'nimaigoshi:二枚腰', 'okiagari:起き上がり小法師', 'hasami:はさみの魔術師', 'washi:和紙の貴公子', 'kazeni:風に舞う',
  'kenkyu:研究熱心', 'nikoniko:負けてもにこにこ', 'yofukashi:夜ふかし力士', 'tawara:土俵際の粘り', 'ichimai:一枚岩',
  'fubuki:紙吹雪', 'harimaru:張り子の虎', 'senmai:千枚通し', 'origami:折り目正しい',
  'sekitori:関取', 'sanyaku:三役', 'itadaki:紙の頂',
];

export const TITLES = LIST.map((w) => { const [id, t] = w.split(':'); return { id: 'ti_' + id.replace(/[^a-z0-9]/g, ''), t }; });
export const TITLE_START = 'ti_shindeshi';

// 実績の称号：id → 手に入れ方（あとで図鑑・実績の画面に出す・数字はここだけ）
export const TITLE_ACH = {
  ti_shinsei: 'はじめて勝つ',
  ti_oshi: '押し出しで勝つ',
  ti_tawara: '突き落としで勝つ',
  ti_kamihitoe: '踏み出しか勇み足で勝つ',
  ti_fudo: '5連勝する',
  ti_nikoniko: '10回負ける',
  ti_kenkyu: '稽古で5体みんなに勝つ',
  ti_ippitsu: '力士を3人そろえて取る',
  ti_yofukashi: '夜中（0時〜4時）に取る',
  ti_sekitori: '本場所で十両に上がる',
  ti_sanyaku: '本場所で小結に上がる',
  ti_itadaki: '本場所で横綱に上がる',
};
// 実績の数字（連勝・負けの数は巡業と本場所だけで数える）
export const TITLE_NUM = { streak: 5, loses: 10, nightFrom: 0, nightTo: 4 };
// 番付で手に入る称号 → その番付（data/banzuke.js の id）
export const TITLE_RANK = { ti_sekitori: 'juryo', ti_sanyaku: 'komusubi', ti_itadaki: 'yokozuna' };
