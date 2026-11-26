# 地図（sumo-game）

遊ぶ人が開くのは index.html（自動で作る・読まない・手で直さない）。もとは src/。

## ビルドと点検
- はじめに `npm ci`（物理 @dimforge/rapier2d-deterministic-compat 0.21.0 と 3D の three 0.160.1。three は UMD の build/three.min.js をそのまま入れて window.THREE）
- `node tools/build.mjs [--artifact 出力.html]` → index.html（約1.75MB。物理の JS と wasm・three は gzip して base64 で入れ、ui/unpack.js がほどく＝ふつうは DecompressionStream、ない古いブラウザは中の gunzip。wasm は JS から window.__SUMO_WASM で渡す）。効果音 assets/sfx/*.mp3 は base64 で window.SUMO_SFX に入る。`--artifact` は試しのページ用（head なし）
- `node tools/test.mjs` → だめな所だけ出して最後に「OK（指紋 ……）」
- `node tools/sim-table.mjs [--seeds 6] [--drive hop|push] [--random 5] [--set key=value] [--write]` → 相性表（`--write` で docs/balance.md）
- `node tools/bout-sheet.mjs <左id> <右id> [シード] [出力.svg] [--set key=value]` → 1番をこま割りの絵に（物理の調整用。`rsvg-convert` で png に）

## src/
| ファイル | 役目 |
|---|---|
| data/config.js | まだ決まっていない数字ぜんぶ（紙・点検・物理・相性表）。変えたら CONFIG_VERSION を上げる |
| data/cpu-shapes.js | CPU の形5つ（釣鐘・タコ・くさび・フック・振り子）＋お手本の人の形 OTEHON（CPU には入れない）。紙の座標 300×420・y 下向き・右が正面 |
| data/text.js | 画面の文字（翻訳はここに足す）・決まり手の名前・クレジット |
| data/dohyo.js | 土俵の見た目（1つの土俵＝1項目：紙の箱・氷の箱・激震の箱＋福箱の土俵スキン7つ＝本場所で使う。項目を足せば別の土俵） |
| data/stages.js | 土俵の種類＝物理の上書き（標準・氷・激震）＋本場所の土俵＋土俵巡業（2時間ごと・2つ・24時間先まで）。スキンは dohyo.js、物理は ここ |
| data/shikona.js | 四股名の語（上の句・つなぎ・下の句・「id:字」）。はじめから持っている語 SHIKONA_START（かけだしの上の句5・山 川 海 里 富士・つなぎ全部）・相手に使わないなかま SHIKONA_FOE_SKIP。実在の四股名になる字は入れない（test の NG で確かめる） |
| data/titles.js | 称号（「id:字」・27こ）と手に入れ方：はじめから TITLE_START・実績 TITLE_ACH（12こ・説明と数字 TITLE_NUM・番付 TITLE_RANK）・のこり14こは福箱（data/fukubako.js の FUKU_TIERS.title） |
| data/banzuke.js | 番付の帯とレート（仮：1500 で序ノ口・100 ごと・2400 で横綱・Elo K=32） |
| data/fukubako.js | 福箱の決まりと数字（小判：勝ち30・負け10・その日の初勝利+100・箱300／段：並70・上20・特上9・極1／称号・紙質・気・土俵の段・語の段）。中身は見た目だけ・小判や箱は入れない |
| data/papers.js | 力士の紙質（地の色・すじ・もよう）。PAPER_DEFAULT＝和紙 |
| data/auras.js | 気（オーラ）の種類と色。AURA_DEFAULT＝なし |
| data/look.js | 演出の数字（旋回・カメラ・紙の厚み・スロー）。物理にさわらないので CONFIG_VERSION は上げない |
| data/kimarite.js | 決まり手（取組の記録から決める・見た目だけ）。数字は KIMARITE |
| geom/poly.js | 多角形の基本（面積・自己交差・帯で切る・反転） |
| geom/stroke.js | 指の線 → 整数の輪郭（等間隔→なめらか→間引く→整数） |
| geom/check.js | 形の点検（自己交差・小ささ・上中下の面積・足もとの幅・凸に分けられるか） |
| geom/decompose.js | くぼんだ形 → 凸の形（耳切り＋Hertel–Mehlhorn） |
| geom/random.js | ランダムな形（道具用） |
| sim/battle.js | 取組の物理。createBout（1こまずつ・記録あり）・runBout（最後まで）・toLocal・hashText。場外＝重心が土俵の上の面より下・下の地面にふれた・俵（phys.tawara）より外で土俵にふれた（outside・ふれた所を at に） |
| sim/runner.js | たくさんの取組を少しずつ進める（画面を止めない） |
| sim/table.js | 相性表の集計 |
| sim/bench.js | 指紋用の決まった3番 |
| sim/rng.js | シードつき乱数・FNV-1a |
| game/save.js | 保存（キー `sumo-proto-v1` のまま中身を足す：力士3枠 slots・active・rate・hon・jun・words＝手に入れた語（前からいる力士の語は持っていることにする）・koban・kobanDay・items（福箱の紙質・気・土俵）・dohyo（本場所の土俵）・力士ごとの paper・aura・titles＝手に入れた称号（前からいる力士の称号は持っていることにする）・streak・keikoWon。試作①②の shape は1枠目へ）。道具の「はじめての流れを見る」用に、いまの保存を `sumo-proto-v1-bak` へ1つだけ取っておく（stashSave・unstashSave） |
| game/names.js | 四股名と称号（id → 字・ランダム・正しいか）。randomShikona(rng, has)：has＝持っている語の Set → その中から（自分）／なし → 相手用。ownedWords(state.words) |
| game/rating.js | 番付（rankOf・nextRank）・Elo（eloDelta）・仮の相手のレート |
| game/jungyo.js | 土俵巡業の予定（時刻 → 枠 → 2つの土俵・世界で同じ）・取組前の抽選 |
| game/foe.js | 巡業・本場所の仮の相手（CPU の形＋ランダムな四股名・称号・近いレート） |
| game/titles.js | 実績の称号（11/26）：afterBout(state, { mode, winner, kima, foeId, hour }) → 新しく手に入れた称号の id（連勝 streak・稽古で勝った CPU keikoWon も数える）・ownedTitles |
| game/fukubako.js | 福箱のしくみ：FUKU_ITEMS（出る物ぜんぶ）・fukuOdds（いまの確率・そろった段は割りなおす）・drawFuku（持っていない物だけ）・addItem・ownedPapers/Auras/Dohyo・kobanFor（取組の小判） |
| ui/app.js | はじまり（物理の用意・画面のつなぎ・もどる）：タイトル → 相撲部屋 →「勝負」→ 巡業／本場所／稽古 → 力士選出 → 取組。はじめての流れ（startIntro）：空の部屋 → お手本つきで切る → 初土俵（釣鐘・戦績に数えない）→ 四股名をさずかる（s-meimei）→ 部屋 |
| ui/heya.js | タイトル・相撲部屋（小判・メニュー：勝負・力士をつくる・福箱。番付は 勝負 → 本場所 の中）・勝負（巡業／本場所／稽古）。土俵巡業の予定は 勝負 → 巡業 で見る。部屋の自作力士がときどきぴょこっと跳ねる（hopLater・たまに2回）。まわりに気（auraPreview） |
| ui/choose.js | えらんだ瞬間の動き（部屋と勝負のメニュー）：朱の筆の帯をベタッと＋太鼓「ドドン」（taiko を2回）→ ほかの列は下へ抜けて消える → 次の画面。もとにもどすのは app.js の enter（reset）。演出を短く・動きを減らす設定では短く |
| ui/roster.js | 部屋の力士（3枠のカード renderSlots）・力士の編集（称号｜上の句・つなぎ・下の句をくるくるで選ぶ・まわすと名前がそのまま変わる・保存は止まって0.3秒後・おまかせはスロットのようにまわる・切り直す・引退は2回押す）。「名前／見た目」の切りかえ：見た目＝紙質と気のくるくる（持っている物だけ） |
| （縦の字の大きさ） | 番付表の縦の字は、入れ物（見出し h1・主役 .hero・列 .cols>*・土俵巡業の札 に container-type:size）の高さ 100cqh と字の数 --n から大きさを決める＝どの画面の高さでも1列に収まる。字を入れるときは roster.js の fitText・setN・headText（見出し）で --n を。ならんだ物（力士の札・福箱の帯・取組の上の名前・カットインの東西・くるくるの列）は、いちばん長いものに合わせて同じ大きさ（roster.js の sameSize など・11/26「統一感」） |
| ui/roller.js | くるくる（たての一覧を指でまわし、真ん中の行に止める＝scroll-snap）。createRoller(列, onPick) → set(語, いまの id)・roll(id)。真ん中は横いっぱいの朱の帯（style.css「くるくる」） |
| ui/fuku.js | 福箱の画面（箱をゆらす → 朱の筆で切る → 紙がさける → 中身・段の判子）と「出る物と確率」・土俵の小さな見本 drawDohyoSwatch |
| ui/match.js | 土俵巡業の予定・番付（本場所）・力士選出（相手は取組まで「？」） |
| ui/cut.js | 切る画面（show(形, { demo }) で、はじめての人に人の形 OTEHON を型抜きの点線で出す。描いている間も消さない・はじまりは朱の丸と「ここから」・向きの矢じるし） |
| ui/pick.js | 稽古：相手をえらぶ画面（CPU 5体・全員と取る ●○） |
| ui/bout.js | 取組の画面（記録を再生）：墨 → 旋回 → 真横 → 勝負 → 取組 → 決まり手。タップで旋回を飛ばす。start(…, opt) の opt で土俵・名前・結果のひとこと（番付の増減）。巡業は旋回のあいだに土俵の名前を右に縦書きで（#stagename・snAt〜snOutAt）。本場所は旋回のはじめに対戦のカットイン（#vs・vsAt〜vsEnd・長さは look.js の vsSec／演出を短くでは vsShortSec ぶん「勝負」をおくらせる・タップで消える）。onResult が { text, titles } を返したら、称号を結果の右に縦書きで（#r-title） |
| ui/stage3d.js | 2.5D（Three.js）：紙の箱の土俵（setDohyo で切りかえ・前の床と絵は外す）・紙の力士（厚み・影）・カメラ（旋回と真横）・project（描く座標→画面） |
| ui/fx.js | 上にのせる2Dの演出：はじまりの墨の筆・墨のしぶき・集中線・トンの合図・体がついた所 |
| ui/unpack.js | 重いもの（lib-rapier・lib-wasm・lib-three）を base64 → gzip からもどす。unpackLib(id)・gunzip（古いブラウザ用・tools/test.mjs で zlib とくらべる） |
| ui/sound.js | 効果音（Web Audio）。unlockAudio（最初のタップ）・playSfx・setMuted |
| ui/tools.js | 道具（指紋・相性表・動きの切りかえ）。音と演出の切りかえと「はじめての流れを見る／前の保存にもどす」は app.js |
| ui/ink.js | 墨・和紙の描きかた |
| ui/papertex.js | 紙質と土俵のもようのタイル（paperFill・patternFill）。見た目だけ |
| ui/aura.js | 気を描く（createAura：取組の fx の上・auraPreview：部屋・編集・福箱の見本）。見た目だけ |
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

## 軽さの記録（code-rules C・CPU ×4 の headless Chrome・3回の中ほど）
- 11/25 軽量化：index.html 4.39 → 1.75MB／タイトルが出るまで 約1000 → 約650ms／物理と3Dの用意まで 約1050 → 約850ms／いちばん長い固まり 約220 → 約140ms／メモリ 17 → 11MB／旋回中の1こまの描画 22 → 12回（影は物が動いたときだけ）／結果が出てからの描画 毎秒約240回 → 0（大きさが変わったら1こまだけ）
- fps は headless だと画面描きがソフト（SwiftShader）なので目安にならない。くらべるのは描画の回数と固まりの長さ
