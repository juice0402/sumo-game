// 力士のオーラ（気）（11/26 しょーくん：福箱から出る・見た目だけ）。取組の上に描くだけで、物理にはさわらない。
// 描くのは ui/aura.js。粒の絵は Codex の部品（A・media/art/ki-*・11/26）、読みこむ前はコードの線と四角（C）。光る輪・グラデーションは使わない。
//   kind：wisp 立ちのぼる筋／petal 花びら／confetti 紙ふぶき／spark 火の粉／bolt 稲妻の筆／wind 風の筋／gold 金の粉と箔
export const AURAS = {
  a_none: { name: 'なし' },
  a_yuge: { name: '湯気', kind: 'wisp', color: '#EEE9DE' },
  a_kemuri: { name: '墨のけむり', kind: 'wisp', color: '#7d7466' },
  a_sakura: { name: '桜吹雪', kind: 'petal', color: '#F0C3C8' },
  a_kamifubuki: { name: '紙吹雪', kind: 'confetti', colors: ['#AB392F', '#3E5A78', '#B79A53', '#3D6B4F', '#EEE9DE'] },
  a_hinoko: { name: '火の粉', kind: 'spark', color: '#E0643C' },
  a_inazuma: { name: '稲妻', kind: 'bolt', color: '#EEE9DE' },
  a_shippu: { name: '疾風', kind: 'wind', color: '#CFC8B8' },
  a_kin: { name: '金の気', kind: 'gold', color: '#D9B95E' },
};
export const AURA_DEFAULT = 'a_none';
