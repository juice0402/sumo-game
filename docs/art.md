# 絵の一覧（sumo）

決まりはネット副業プロジェクトの claude/game-art-rule.md（sumo は福箱まわり〔11/26〕と本場所の会場の部品〔11/27〕を Codex で描き下ろす例外。幕・提灯・垂れ幕の字は絵に焼きこまずコードで重ねる）。
絵は assets/art/<名前>.webp（ビルドが index.html に入れ、ui/art.js が使うときに1枚ずつ画像にする）。
もとの PNG は art-irai の art/ の枝に残っている（`git fetch origin art/sumo-<名前>` → `out/sumo/<名前>.png`）。切り方は tools/art_cut.py（11/26 の軽量化：箱・紐は `--q 76 --aq 70`、結び目は @0.8・房は @0.65・紐は @0.8、演出は `--q 74 --aq 70`、テクスチャは 448px `--q 70`。描く大きさは data/fukuart.js の size で決まるので、ファイルを小さくしても見た目の大きさは変わらない）。

| 名前 | 何 | 区分 | 道具・作った日 | もと（art-irai） |
|---|---|---|---|---|
| fuku-box・fuku-body・fuku-lid | 福箱：金の漆の箱（閉じた箱・ふたを外した本体・ふた） | A | Codex・2026-11-26 | requests/sumo/fukubako-hako.md（枝 art/sumo-fukubako-hako） |
| fuku-knot1・fuku-knot2・fuku-knot3・fuku-tassel・fuku-cord | 福箱の紐：紫の組紐の飾り結び（結んだ・ゆるんだ・ほどけた）・房・まっすぐな紐（くり返しの長さ 60px×4 で切った） | A | Codex・2026-11-26 | requests/sumo/fukubako-himo.md（枝 art/sumo-fukubako-himo） |
| fx-smoke・fx-wisp・fx-ray・fx-leaf1・fx-leaf2・fx-glint | 福箱を開ける演出：白い煙・煙の筋・光の筋・金箔2つ・きらめき（黒の地を明るさですけさせた） | A | Codex・2026-11-26 | requests/sumo/fukubako-fx.md（枝 art/sumo-fukubako-fx） |
| tex-washi・tex-kinpaku・tex-suminagashi | 紙質のテクスチャ：和紙・金箔・墨流し（つなぎ目なし・2×2 で確かめた・448px に小さく） | A | Codex・2026-11-26 | requests/sumo/kamishitsu-1.md の1〜3段（枝 art/sumo-kamishitsu-1） |
| tex-hanshi・tex-wara・tex-sakura・tex-wakakusa・tex-ai | 紙質のテクスチャ：半紙・藁半紙・桜・若草・藍（藁半紙〜藍は色だけ data/papers.js の地の色に合わせた＝`tint=#…`・繊維の明るさはそのまま） | A | Codex・2026-11-26 | requests/sumo/kamishitsu-2.md の1〜5段（枝 art/sumo-kamishitsu-2） |
| tex-asanoha・tex-seigaiha・tex-ichimatsu・tex-shinbun・tex-kira | 紙質のテクスチャ：麻の葉・青海波・市松・新聞紙・雲母刷り（青海波は `--period` でくり返しの長さに切った。麻の葉は線がずれていくので、2周期ぶん 314×524 をつなぎ目がいちばん目立たない所 (388,396) から切った。藁半紙・青海波・新聞紙・麻の葉は 384px・品質62〜66） | A | Codex・2026-11-26 | requests/sumo/kamishitsu-3.md の1〜5段（枝 art/sumo-kamishitsu-3） |

| ki-petal1〜3・ki-conf-shu・ki-conf-ai・ki-conf-kin・ki-conf-midori・ki-conf-kinari | 気の粒：桜の花びら3つ・和紙の紙吹雪5色（緑の地を抜いた・`grid --cols 4`） | A | Codex・2026-11-26 | requests/sumo/ki-1.md（枝 art/sumo-ki-1） |
| ki-ember1・ki-ember2・ki-bolt1・ki-bolt2・ki-wind1・ki-wind2・ki-steam | 気の粒：火の粉2つ・筆の稲妻2つ・疾風の筆の筋2つ・湯気（金の粉 ki-gold は糸のように見えたので使わず、金の気は福箱のきらめきで）（黒の地を明るさですけさせた・`fx --cols 4`） | A | Codex・2026-11-26 | requests/sumo/ki-2.md（枝 art/sumo-ki-2） |
| kaijo-kankyaku | 本場所の会場：観客（前から）12人のシート（シートのまま・1人ずつの四角は src/data/kaijoart.js・`tools/kaijo_cut.py crowd`・半分の大きさ） | A | Codex・2026-11-27 | requests/sumo/kaijo-kankyaku.md（枝 art/sumo-kaijo-kankyaku） |
| kaijo-yane | 本場所の会場：吊り屋根（正面）と紫の幕・四房（`tools/kaijo_cut.py yane`＝幕の上下のふちと幅を測る・半分の大きさ） | A | Codex・2026-11-27 | requests/sumo/kaijo-yane.md（枝 art/sumo-kaijo-yane） |
| kaijo-ushiro | 本場所の会場：観客（うしろ姿）12人のシート（手前の列・`tools/kaijo_cut.py crowd … --dilate 2`＝となりとくっつかないように） | A | Codex・2026-11-27 | requests/sumo/kaijo-ushiro.md（枝 art/sumo-kaijo-ushiro） |
| kaijo-kazari | 本場所の会場：提灯3つ（白に朱の丸・朱・生成りに藍の丸）と垂れ幕3つ（紫・えんじ・藍・字なし）を1列に（シートのまま・四角は kaijoart.js） | A | Codex・2026-11-27 | requests/sumo/kaijo-kazari.md（枝 art/sumo-kaijo-kazari） |

- ほかの絵（番付表の画面・筆・土俵・紙のもよう）はコードで描く C
- 紙質13種はぜんぶ Codex のテクスチャ（読みこむ前はコードのもよう）
