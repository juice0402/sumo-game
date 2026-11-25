# 地図（sumo-game）

遊ぶ人が開くのは index.html（自動で作る・読まない・手で直さない）。もとは src/。

## ビルドと点検
- はじめに `npm ci`（物理 @dimforge/rapier2d-deterministic-compat 0.21.0 と 3D の three 0.160.1。three は UMD の build/three.min.js をそのまま入れて window.THREE）
- `node tools/build.mjs [--artifact 出力.html]` → index.html（約4.3MB。物理3.4MB・three 0.67MB・効果音）。効果音 assets/sfx/*.mp3 は base64 で window.SUMO_SFX に入る。`--artifact` は試しのページ用（head なし）
- `node tools/test.mjs` → だめな所だけ出して最後に「OK（指紋 ……）」
- `node tools/sim-table.mjs [--seeds 6] [--drive hop|push] [--random 5] [--set key=value] [--write]` → 相性表（`--write` で docs/balance.md）
- `node tools/bout-sheet.mjs <左id> <右id> [シード] [出力.svg] [--set key=value]` → 1番をこま割りの絵に（物理の調整用。`rsvg-convert` で png に）

## src/
| ファイル | 役目 |
|---|---|
| data/config.js | まだ決まっていない数字ぜんぶ（紙・点検・物理・相性表）。変えたら CONFIG_VERSION を上げる |
| data/cpu-shapes.js | CPU の形5つ（釣鐘・タコ・くさび・フック・振り子）。紙の座標 300×420・y 下向き・右が正面 |
| data/text.js | 画面の文字（翻訳はここに足す）・決まり手の名前・クレジット |
| data/dohyo.js | 土俵の見た目（1つの土俵＝1項目：紙の箱・氷の箱・激震の箱。項目を足せば別の土俵） |
| data/stages.js | 土俵の種類＝物理の上書き（標準・氷・激震）＋本場所の土俵＋土俵巡業（2時間ごと・2つ・24時間先まで）。スキンは dohyo.js、物理は ここ |
| data/shikona.js | 四股名の語（上の句・つなぎ・下の句・「id:字」）。実在の四股名になる字は入れない（test の NG で確かめる） |
| data/titles.js | 称号（「id:字」） |
| data/banzuke.js | 番付の帯とレート（仮：1500 で序ノ口・100 ごと・2400 で横綱・Elo K=32） |
| data/look.js | 演出の数字（旋回・カメラ・紙の厚み・スロー）。物理にさわらないので CONFIG_VERSION は上げない |
| data/kimarite.js | 決まり手（取組の記録から決める・見た目だけ）。数字は KIMARITE |
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
| game/save.js | 保存（キー `sumo-proto-v1` のまま中身を足す：力士3枠 slots・active・rate・hon・jun。試作①②の shape は1枠目へ） |
| game/names.js | 四股名と称号（id → 字・ランダム・正しいか） |
| game/rating.js | 番付（rankOf・nextRank）・Elo（eloDelta）・仮の相手のレート |
| game/jungyo.js | 土俵巡業の予定（時刻 → 枠 → 2つの土俵・世界で同じ）・取組前の抽選 |
| game/foe.js | 巡業・本場所の仮の相手（CPU の形＋ランダムな四股名・称号・近いレート） |
| ui/app.js | はじまり（物理の用意・画面のつなぎ・もどる）：タイトル → 相撲部屋 →「勝負」→ 巡業／本場所／稽古 → 力士選出 → 取組 |
| ui/heya.js | タイトル・相撲部屋（筆の帯のメニュー：勝負・力士をつくる・番付・土俵巡業）・勝負（巡業／本場所／稽古） |
| ui/roster.js | 部屋の力士（3枠のカード renderSlots）・力士の編集（四股名・称号・おまかせ・切り直す・引退は2回押す）・語をえらぶシート |
| ui/match.js | 土俵巡業の予定・番付（本場所）・力士選出（相手は取組まで「？」） |
| ui/cut.js | 切る画面 |
| ui/pick.js | 稽古：相手をえらぶ画面（CPU 5体・全員と取る ●○） |
| ui/bout.js | 取組の画面（記録を再生）：墨 → 旋回 → 真横 → 勝負 → 取組 → 決まり手。タップで旋回を飛ばす。start(…, opt) の opt で土俵・名前・結果のひとこと（番付の増減） |
| ui/stage3d.js | 2.5D（Three.js）：紙の箱の土俵（setDohyo で切りかえ・前の床と絵は外す）・紙の力士（厚み・影）・カメラ（旋回と真横）・project（描く座標→画面） |
| ui/fx.js | 上にのせる2Dの演出：はじまりの墨の筆・墨のしぶき・集中線・トンの合図・体がついた所 |
| ui/sound.js | 効果音（Web Audio）。unlockAudio（最初のタップ）・playSfx・setMuted |
| ui/tools.js | 道具（指紋・相性表・動きの切りかえ）。音と演出の切りかえは app.js |
| ui/ink.js | 墨・和紙の描きかた |
| ui/btnart.js | ボタンの絵（朱の筆の帯・和紙の筆の帯・字の下の筆の線・筆の輪）を SVG で作って CSS の変数 --b-… に入れる。ピルの形にしない |
| ui/page.html・ui/style.css | 画面のもと・見た目。部屋などの画面は案A「番付表」（`.screen.v`＝右に縦の見出し・`.hero`・`.frame2`＝二重の罫・`.cols`＝右から縦の列・`.fit`＝字の数で大きさを合わせる・いまの／主＝縦の朱の帯）。動き：画面を開くと app.js の enter が `--i` をふって、列が右から順にシュッと入る（筆の音つき）・選出は朱の判子「出」 |

## 決まり（物理）
- 決定論版の Rapier。時間きざみ固定（1/120秒）・作る順番固定・シードつき乱数
- 勝敗にかかわる計算は四則演算だけ（Math.sin・Math.cos・Math.sqrt を使わない）。見た目・形を作るときだけ使ってよい
- 輪郭は整数の座標が正。対戦・保存・サーバーはそれだけを使う
- 勝敗：体（紙の bodyLine＝下のエリアのはじまりより上）が土俵についた・場外（重心が土俵の面より下 or 下の地面にふれた）・念のための転倒（約137°を0.5秒）・同時は引き分け・時間切れは引き分け。凸の形は bodyLine で「体」と「足」に切って当てる
- 画面のカメラは土俵にくっつける（描くときの y＝物理の y − 土俵の上の面の y。土俵のトンで画面をゆらさない＝画面酔い対策）。画面のゆれ・フラッシュは入れない
- 突進は2種類：hop（トンのたびに前へぴょこっと・ふだん）／push（足の踏ん張りに比例して押しつづける）

## assets/
- sfx/*.mp3：効果音7つ（koe-irai の sfx/・出どころは docs/sounds.md）

## 自動で作るファイル（読まない）
- index.html・docs/balance.md・node_modules/・package-lock.json
