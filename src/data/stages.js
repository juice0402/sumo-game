// 土俵の種類（物理が変わる＝特殊土俵）と、土俵巡業（2時間ごとに2つの土俵）。
// 見た目だけのスキンは data/dohyo.js（look）。物理の上書き phys は config の PHYS に重ねる（要件 8：スキンと特殊土俵は分ける）。
// 数字は仮。11/25 の相性表（3シード×左右）：氷は くさび が強くなり タコ が弱くなる・激震は決着が約2.5秒に。
export const STAGES = {
  hyojun: { name: '標準土俵', look: 'kami', phys: {}, note: 'いつもの土俵' },
  kori: { name: '氷の土俵', look: 'kori', phys: { friction: 0.2, frictionBody: 0.3 }, note: 'よくすべる' },
  gekishin: { name: '激震の土俵', look: 'gekishin', phys: { tapAmp: 0.06, stallStart: 2.5 }, note: 'ゆれが強い' },
};

// 本場所（レートマッチ）は標準土俵だけ（要件 6-2）
export const HONBASHO_STAGE = 'hyojun';

// 土俵巡業（要件 8）：世界で同じ予定。時刻は端末の時計（オンラインになったらサーバーの時刻）
export const JUNGYO = {
  hours: 2,                                // 何時間ごとに変わるか
  pool: ['hyojun', 'kori', 'gekishin'],    // 出る土俵（2つずつ）
  ahead: 12,                               // 予定を何枠先まで見せるか（12×2時間＝24時間）
};
