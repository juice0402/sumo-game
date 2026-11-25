// 番付とレート（本場所＝レートマッチ）。レートは中の数字で、見せるのは番付（11/25 しょーくん）。
// まだ仮の数字：はじめは 1500 で序ノ口・100 ごとに1つ上・2400 で横綱。Elo（K=32）。オンラインで決めなおす（要件 6-2）。
export const RATE = {
  start: 1500,
  k: 32,            // 1番で動く大きさ
  foeSpread: 120,   // 相手のレートを自分の前後どれくらいから選ぶか（仮・CPU の相手）
};

export const BANZUKE = [
  { id: 'jonokuchi', name: '序ノ口', min: -Infinity },
  { id: 'jonidan', name: '序二段', min: 1600 },
  { id: 'sandanme', name: '三段目', min: 1700 },
  { id: 'makushita', name: '幕下', min: 1800 },
  { id: 'juryo', name: '十両', min: 1900 },
  { id: 'maegashira', name: '前頭', min: 2000 },
  { id: 'komusubi', name: '小結', min: 2100 },
  { id: 'sekiwake', name: '関脇', min: 2200 },
  { id: 'ozeki', name: '大関', min: 2300 },
  { id: 'yokozuna', name: '横綱', min: 2400 },
];
