# 地図（sumo-game）

遊ぶ人が開くのは index.html（自動で作る・読まない・手で直さない）。もとは src/。

## ビルドと点検
- はじめに `npm ci`（物理 @dimforge/rapier2d-deterministic-compat 0.21.0 だけ）
- `node tools/build.mjs [--artifact 出力.html]` → index.html（約3.5MB。うち物理が3.4MB）。`--artifact` は試しのページ用（head なし）
- `node tools/test.mjs` → だめな所だけ出して最後に「OK（指紋 ……）」
- `node tools/sim-table.mjs [--seeds 6] [--drive hop|push] [--random 5] [--set key=value] [--write]` → 相性表（`--write` で docs/balance.md）
- `node tools/bout-sheet.mjs <左id> <右id> [シード] [出力.svg] [--set key=value]` → 1番をこま割りの絵に（物理の調整用。`rsvg-convert` で png に）

## src/
| ファイル | 役目 |
|---|---|
| data/config.js | まだ決まっていない数字ぜんぶ（紙・点検・物理・相性表）。変えたら CONFIG_VERSION を上げる |
| data/cpu-shapes.js | CPU の形5つ（釣鐘・タコ・くさび・フック・振り子）。紙の座標 300×420・y 下向き・右が正面 |
| data/text.js | 画面の文字（翻訳はここに足す） |
| geom/poly.js | 多角形の基本（面積・自己交差・帯で切る・反転） |
| geom/stroke.js | 指の線 → 整数の輪郭（等間隔→なめらか→間引く→整数） |
| geom/check.js | 形の点検（自己交差・小ささ・上中下の面積・足もとの幅・凸に分けられるか） |
| geom/decompose.js | くぼんだ形 → 凸の形（耳切り＋Hertel–Mehlhorn） |
| geom/random.js | ランダムな形（道具用） |
| sim/battle.js | 取組の物理。createBout（1こまずつ・記録あり）・runBout（最後まで）・toLocal・hashText |
| sim/runner.js | たくさんの取組を少しずつ進める（画面を止めない） |
| sim/table.js | 相性表の集計 |
| sim/bench.js | 指紋用の決まった3番 |
| sim/rng.js | シードつき乱数・FNV-1a |
| ui/app.js | はじまり（物理の用意・画面のつなぎ・保存 `sumo-proto-v1`） |
| ui/cut.js | 切る画面 |
| ui/pick.js | 相手をえらぶ画面（全員と取る ●○） |
| ui/bout.js | 取組の画面（記録を再生。スロー・ヒットストップ・しぶきは見た目だけ） |
| ui/tools.js | 道具（指紋・相性表・動きの切りかえ） |
| ui/ink.js | 墨・和紙の描きかた |
| ui/page.html・ui/style.css | 画面のもと・見た目 |

## 決まり（物理）
- 決定論版の Rapier。時間きざみ固定（1/120秒）・作る順番固定・シードつき乱数
- 勝敗にかかわる計算は四則演算だけ（Math.sin・Math.cos・Math.sqrt を使わない）。見た目・形を作るときだけ使ってよい
- 輪郭は整数の座標が正。対戦・保存・サーバーはそれだけを使う
- 勝敗：転倒（傾き fallAngle を fallHold 秒）・場外（重心が土俵の面より下 or 下の地面にふれた）・同時は引き分け・時間切れは引き分け
- 突進は2種類：hop（トンのたびに前へぴょこっと・ふだん）／push（足の踏ん張りに比例して押しつづける）

## 自動で作るファイル（読まない）
- index.html・docs/balance.md・node_modules/・package-lock.json
