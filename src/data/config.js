// すべての「まだ決まっていない数字」はここ。変えたら CONFIG_VERSION を上げる（リプレイ・対戦の再現に使う）。
export const CONFIG_VERSION = 3;

// 紙（切り出しの座標）。整数の座標で、y は下向き。右が力士の正面。
export const PAPER = {
  w: 300,
  h: 420,
};

// 形の点検
export const CHECK = {
  closeDist: 42,          // 指を離したとき、始点からこの距離（紙の座標）以内なら自動で閉じる
  resample: 4,            // 線を等間隔に打ち直す間隔
  smooth: 2,              // なめらかにする回数（移動平均）
  simplify: 1.6,          // 点を間引く強さ（ずれの許容）
  maxPoints: 140,         // 点の数の上限（多ければ間引きを強める）
  minArea: 0.12,          // 紙全体に対する最低面積（小さすぎる形をはじく）
  // 上・中・下の3エリア（元の紙を高さで3等分）ごとの最低残存面積（エリア面積に対する割合）
  zones: [
    { key: 'top', from: 0, to: 1 / 3, min: 0.25 },
    { key: 'mid', from: 1 / 3, to: 2 / 3, min: 0.30 },
    { key: 'bot', from: 2 / 3, to: 1, min: 0.25 },
  ],
  // 接地の幅：力士の最下端から groundBand の高さの帯の中で、紙の左端〜右端の距離
  groundBand: 0.15,
  groundBandBasis: 'paper', // 'paper'＝紙の高さの割合／'shape'＝力士の高さの割合
  groundMaxW: 0.60,       // 紙の横幅に対する最大
  groundMinW: 0.0,        // 最低（0＝なし）
};

// 物理（Rapier・決定論版）。長さはメートル相当、紙の横幅 = paperM
export const PHYS = {
  paperM: 1.0,
  dt: 1 / 120,            // 固定の時間きざみ
  maxTime: 15,            // 最大の取組時間（秒）
  gravity: 18,
  density: 1.0 / 1.4,     // 紙まるごと1枚の重さが 1 になる密度
  friction: 0.9,          // 紙と土俵
  frictionBody: 0.55,     // 紙どうし
  restitution: 0.05,
  linearDamping: 0.15,
  angularDamping: 0.25,
  // 土俵
  ringHalf: 1.4,          // 土俵の半分の幅
  ringDepth: 0.7,         // 土俵の高さ（下の地面まで）
  startX: 0.68,           // 中心から開始位置（重心の x）までの距離
  // ゆれ（周期的にトンと突き上げる）
  tapPeriod: 0.34,        // 何秒ごとにトン
  tapLen: 0.07,           // 1回のトンの長さ（秒）
  tapAmp: 0.04,           // 突き上げの高さ
  tapJitter: 0.25,        // 強さのばらつき（シードで決まる）
  stallStart: 4,          // この秒より長引いたら
  stallGrow: 0.12,        // 1秒ごとにゆれをこの割合ずつ強くする
  stallMax: 2.5,          // ゆれの最大倍率
  // 突進
  drive: 'hop',           // 'hop'＝トンのたびにぴょこっと（ふだん）／'push'＝ずっと押す
  pushForce: 10,          // ずっと押す力（重さによらず同じ → 重いほど加速は遅い）
  gripDrive: true,        // 押す力を足の踏ん張りに比例させる（持ち上げられると押せない）
  gripMax: 1.0,           // 踏ん張りの上限（重さの何倍まで）
  hopImpulse: 0.28,       // トンのたびの前向きの勢い（重さによらず同じ）
  hopLift: 0.20,          // トンのたびの上向きの勢い
  driveHeight: 0.3,       // 押す点の高さ（0＝足もと／1＝重心の高さ）。低いほど自分の勢いで前に転びにくい
  openImpulse: 0.2,       // 立ち合いの最初の一押し
  // 勝敗
  touchLose: true,        // 体（足より上）が土俵についたら負け
  footH: 1 / 3,           // 足の高さ：力士のいちばん下から、紙の高さのこの割合まで
  touchHold: 0.1,         // 体がこの秒数ついたままなら負け（はねて一瞬かすっただけは負けにしない）
  fallAngle: 2.4,         // 念のため：この角度（ラジアン・約137°）より傾いたままなら転倒
  fallHold: 0.5,          // その状態がこの秒数つづいたら転倒
  // 場外：重心が土俵の上の面より下がる（＝落ちた）か、下の地面にふれたら
  settle: 0.5,            // 立ち合いの前に落ち着かせる時間（勝敗は見ない）
};

// 相性表の道具
export const TABLE = {
  seeds: 6,               // 1組あたりのシード数（左右入れかえで ×2）
};
