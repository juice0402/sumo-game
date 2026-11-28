// 土俵の種類（物理が変わる＝特殊土俵）と、土俵巡業（2時間ごとに2つの土俵）。
// 見た目だけのスキンは data/dohyo.js（look）。物理の上書き phys は config の PHYS に重ねる（要件 8：スキンと特殊土俵は分ける）。
// 数字は仮。土俵ごとの相性表（3シード×左右）は docs/balance.md の「土俵ごと」（node tools/sim-table.mjs --stages --write）。
// 狭小は ringHalf・tawara・startX を変える＝見た目の箱・輪・カメラも ui/stage3d.js の setDohyo(look, phys) がこの数で作る
export const STAGES = {
  hyojun: { name: '標準土俵', look: 'kami', phys: {}, note: 'いつもの土俵' },
  kori: { name: '氷の土俵', look: 'kori', phys: { friction: 0.2, frictionBody: 0.3 }, note: 'よくすべる' },
  gekishin: { name: '激震の土俵', look: 'gekishin', phys: { tapAmp: 0.06, stallStart: 2.5 }, note: 'ゆれが強い' },
  // 11/28 夜 #19：巡業の特殊土俵を9つ足す（キーは絵 media/art/dohyo-<キー>-top・-side とそろえる）
  tsuki: { name: '月の土俵', look: 'tsuki', phys: { gravity: 11 }, note: 'ふわっと跳ぶ' },
  omoishi: { name: '重石の土俵', look: 'omoishi', phys: { gravity: 27 }, note: 'どっしり重い' },
  bane: { name: 'ばねの土俵', look: 'bane', phys: { restitution: 0.6 }, note: 'よくはずむ' },
  nukarumi: { name: 'ぬかるみの土俵', look: 'nukarumi', phys: { friction: 1.6, linearDamping: 1.2 }, note: '足が重い' },
  kokizami: { name: '小刻みの土俵', look: 'kokizami', phys: { tapPeriod: 0.2, tapAmp: 0.035 }, note: 'せわしなく前へ' },
  oouneri: { name: '大うねりの土俵', look: 'oouneri', phys: { tapPeriod: 0.6, tapAmp: 0.07 }, note: 'ゆっくり大きくゆれる' },
  oshi: { name: '押しの土俵', look: 'oshi', phys: { drive: 'push' }, note: 'ずっと押す' },
  hayate: { name: '疾風の土俵', look: 'hayate', phys: { hopImpulse: 0.4, hopLift: 0.12 }, note: '鋭く飛びこむ' },
  kyosho: { name: '狭小土俵', look: 'kyosho', phys: { ringHalf: 1.0, tawara: 0.92, startX: 0.6 }, note: 'すぐ場外' },
};

// 本場所（レートマッチ）は標準土俵だけ（要件 6-2）
export const HONBASHO_STAGE = 'hyojun';

// 土俵巡業（要件 8）：世界で同じ予定。時刻は端末の時計（オンラインになったらサーバーの時刻）
export const JUNGYO = {
  hours: 2,                                // 何時間ごとに変わるか
  pool: ['hyojun', 'kori', 'gekishin', 'tsuki', 'omoishi', 'bane', 'nukarumi', 'kokizami', 'oouneri', 'oshi', 'hayate', 'kyosho'],   // 出る土俵（2つずつ）
  ahead: 5,                                // 予定を何枠先まで見せるか（いま開催中＋この先4つ＝8時間・11/26 スクロールなしに）
};
