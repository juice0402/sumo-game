// 称号（力士の四股名の上に小さく出る）。見た目だけで、強さにはさわらない（要件 11）。
// 1つ＝「id:字」。id は保存とサーバーで使う共通の ID。いまは全部使える（あとで実績・福箱でふやす）。
const LIST = [
  'shindeshi:新弟子', 'shinsei:期待の新星', 'kamihitoe:紙一重', 'ippitsu:一筆入魂', 'oshi:押しの一手',
  'fudo:不動の構え', 'shijin:土俵の詩人', 'yurayura:ゆらゆら名人', 'sumiko:墨の申し子', 'kirie:切り絵の達人',
  'nimaigoshi:二枚腰', 'okiagari:起き上がり小法師', 'hasami:はさみの魔術師', 'washi:和紙の貴公子', 'kazeni:風に舞う',
  'kenkyu:研究熱心', 'nikoniko:負けてもにこにこ', 'yofukashi:夜ふかし力士', 'tawara:土俵際の粘り', 'ichimai:一枚岩',
  'fubuki:紙吹雪', 'harimaru:張り子の虎', 'senmai:千枚通し', 'origami:折り目正しい',
];

export const TITLES = LIST.map((w) => { const [id, t] = w.split(':'); return { id: 'ti_' + id.replace(/[^a-z0-9]/g, ''), t }; });
export const TITLE_START = 'ti_shindeshi';
