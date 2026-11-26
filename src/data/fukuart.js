// 福箱の絵（11/26・Codex＝A・art-irai の requests/sumo/fukubako-hako.md・fukubako-himo.md）の寸法。
// 絵は assets/art/fuku-*.webp（tools/art_cut.py で切った）。数字は絵の上のピクセル（閉じた箱 fuku-box 593×643 が元）。
// 紐は「まっすぐな紐」fuku-cord を、箱の面に沿った線の上に並べて描く（はしは箱の形で切るので、ふちまでぴったり届く）。
export const FUKU_ART = {
  ids: ['fuku-box', 'fuku-body', 'fuku-lid', 'fuku-knot1', 'fuku-knot2', 'fuku-knot3', 'fuku-tassel', 'fuku-cord',
    'fx-smoke', 'fx-wisp', 'fx-ray', 'fx-leaf1', 'fx-leaf2', 'fx-glint'],   // fx-*＝開ける演出（requests/sumo/fukubako-fx.md・黒の地をすけさせた）
  box: { w: 593, h: 643 },
  bodyTop: 28,          // ふたを外した本体（595×615）を、下と左右のまん中でそろえたときの上のはし
  lidTop: 0,            // ふただけ（594×320）の上のはし
  // 上の面：奥のはし y・手前のはし y（奥は左右 60〜539、手前は 4〜589）
  top: { back: 6, front: 231, bl: 60, br: 539, fl: 4, fr: 589 },
  knot: { x: 298, y: 116 },       // 紐が十字にまじわる所＝結び目
  cordScale: 0.6,                 // 紐の絵（太さ 37）→ 箱の上で 22
  tasselScale: 0.42,
  // 結び目の絵の「結び目のまん中」（0〜1）
  knotAnchor: { 'fuku-knot1': [0.49, 0.36], 'fuku-knot2': [0.48, 0.22], 'fuku-knot3': [0.46, 0.4] },
};
