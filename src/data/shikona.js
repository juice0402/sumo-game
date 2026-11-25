// 四股名の語（上の句＋つなぎ＋下の句）。自由に打ちこむ名前は使わない（要件 10）。
// 1語＝「id:字」。id は保存とサーバーで使う共通の ID（字を直しても id は変えない）。翻訳は id ごとに足す。
// はじめから持っているのは SHIKONA_START だけ（かけだしの上の句5つ・ふつうの下の句5つ・つなぎ全部）。ほかの語は、あとで手に入れる。
// 相手（CPU・あとで世界の力士）は、かけだしの上の句を使わず全部の語から → 相手の四股名を見て「こんなのほしい！」に（11/26 しょーくん）。
// 実在の力士の四股名にならないよう、よくある頭の字（若・千代・栃・朝・旭・琴・貴・照・北・白・大 など）と、
// 花・錦・竜・鵬 などは入れていない（富士・里は、頭の字がないので下の句に入れた）。だめな組み合わせは tools/test.mjs の NG で確かめる。

function words(prefix, groups) {
  const out = [];
  for (const [cat, list] of groups) {
    for (const w of list.split(/\s+/).filter(Boolean)) {
      const [id, t] = w.split(':');
      out.push({ id: prefix + id, t: t === '-' ? '' : t, cat });
    }
  }
  return out;
}

// 語群のなかま（選ぶ画面の見出し）
export const SHIKONA_CATS = {
  kakedashi: 'かけだし', sumo: '相撲', nature: '自然', animal: '動物', food: '食べ物', cool: '格好いい', surreal: 'シュール', myth: '神話', wa: '日本文化', link: 'つなぎ',
};

export const SHIKONA = {
  kami: words('k_', [
    ['kakedashi', 'korekara:これから kakedashi:かけだし saisho:最初 imakara:今から hiyokko:ひよっこ'],
    ['sumo', 'seki:関 dohyo:土俵 shiko:四股 mawashi:廻し tsuna:綱 gyoji:行司'],
    ['nature', 'yama:山 umi:海 arashi:嵐 kaminari:雷 yuki:雪 tsuki:月 hoshi:星 kaze:風 kiri:霧 sakura:桜 momiji:紅葉 nami:波'],
    ['animal', 'taka:鷹 tora:虎 ookami:狼 kame:亀 kuma:熊 neko:猫 inu:犬 kitsune:狐 tanuki:狸 kujira:鯨 tako:蛸 kaeru:蛙'],
    ['food', 'tofu:豆腐 mochi:餅 dango:団子 onigiri:おにぎり daikon:大根 miso:味噌 natto:納豆 yuzu:柚子 senbei:煎餅 udon:うどん'],
    ['cool', 'ogon:黄金 densetsu:伝説 shippu:疾風 jinrai:迅雷 muso:無双 fudo:不動 guren:紅蓮 shikkoku:漆黒 gekiryu:激流 senko:閃光'],
    ['surreal', 'saijaku:最弱 shinya:深夜 getsuyo:月曜 neoki:寝起き maigo:迷子 kinniku:筋肉 kyushoku:給食 hangaku:半額 teiji:定時 kimagure:気まぐれ'],
    ['myth', 'kami:神 raijin:雷神 fujin:風神 tengu:天狗 kappa:河童 kitsunebi:狐火'],
    ['wa', 'samurai:侍 ninja:忍者 shogun:将軍 cha:茶 fude:筆 sumi:墨 kami2:紙 orizuru:折鶴 chochin:提灯 furin:風鈴'],
  ]),
  tsunagi: words('t_', [
    ['link', 'no:の no2:乃 no3:ノ no4:之 ga:ヶ none:-'],
  ]),
  shimo: words('s_', [
    ['sumo', 'yama:山 kawa:川 umi:海 sato:里 fuji:富士 zeki:関 hiro:洋 nada:灘'],
    ['nature', 'mine:嶺 sora:空 kumo:雲 iwa:岩 taki:滝 fuji2:藤 matsu:松'],
    ['animal', 'washi:鷲 shishi:獅子 kujira:鯨 kitsune:狐 tanuki:狸 tora:虎 tako:蛸'],
    ['food', 'tofu:豆腐 daifuku:大福 manju:饅頭 tenpura:天ぷら nabe:鍋 oden:おでん mochi:餅'],
    ['cool', 'o:王 mikado:帝 hasha:覇者 tamashii:魂 tsurugi:剣 kiba:牙'],
    ['surreal', 'teishoku:定食 kakaricho:係長 minarai:見習い nigo:二号 kibun:気分 bocchan:坊ちゃん omori:大盛り'],
    ['myth', 'kami:神 oni:鬼 sennin:仙人 tengu:天狗'],
    ['wa', 'ninja:忍者 maru:丸 emon:右衛門 nosuke:之助 tono:殿'],
  ]),
};

// はじめから持っている語（入門のときにさずかる四股名は、この中から）
export const SHIKONA_START = [
  'k_korekara', 'k_kakedashi', 'k_saisho', 'k_imakara', 'k_hiyokko',
  's_yama', 's_kawa', 's_umi', 's_sato', 's_fuji',
  ...SHIKONA.tsunagi.map((w) => w.id),
];
// 相手の四股名に使わない上の句のなかま（かけだしは自分だけ）
export const SHIKONA_FOE_SKIP = ['kakedashi'];

// 新しい力士・相手の力士の四股名（ランダム）。つなぎは「の」がいちばん出やすい
export const SHIKONA_LINK_WEIGHTS = { t_no: 5, t_no2: 2, t_no3: 1, t_no4: 1, t_ga: 1, t_none: 2 };
