# 絵の一覧（sumo）

決まりはネット副業プロジェクトの claude/game-art-rule.md（sumo は福箱まわりだけ Codex で描き下ろす例外・11/26）。
絵は assets/art/<名前>.webp（ビルドが index.html に入れ、ui/art.js が使うときに1枚ずつ画像にする）。
もとの PNG は art-irai の art/ の枝に残っている（`git fetch origin art/sumo-<名前>` → `out/sumo/<名前>.png`）。切り方は tools/art_cut.py。

| 名前 | 何 | 区分 | 道具・作った日 | もと（art-irai） |
|---|---|---|---|---|
| fuku-box・fuku-body・fuku-lid | 福箱：金の漆の箱（閉じた箱・ふたを外した本体・ふた） | A | Codex・2026-11-26 | requests/sumo/fukubako-hako.md（枝 art/sumo-fukubako-hako） |
| fuku-knot1・fuku-knot2・fuku-knot3・fuku-tassel・fuku-cord | 福箱の紐：紫の組紐の飾り結び（結んだ・ゆるんだ・ほどけた）・房・まっすぐな紐（くり返しの長さ 60px×4 で切った） | A | Codex・2026-11-26 | requests/sumo/fukubako-himo.md（枝 art/sumo-fukubako-himo） |
| fx-smoke・fx-wisp・fx-ray・fx-leaf1・fx-leaf2・fx-glint | 福箱を開ける演出：白い煙・煙の筋・光の筋・金箔2つ・きらめき（黒の地を明るさですけさせた） | A | Codex・2026-11-26 | requests/sumo/fukubako-fx.md（枝 art/sumo-fukubako-fx） |
| tex-washi・tex-kinpaku・tex-suminagashi | 紙質のテクスチャ：和紙・金箔・墨流し（つなぎ目なし・2×2 で確かめた・512px に小さく） | A | Codex・2026-11-26 | requests/sumo/kamishitsu-1.md の1〜3段（枝 art/sumo-kamishitsu-1） |

- ほかの絵（番付表の画面・筆・土俵・紙のもよう）はコードで描く C
- 紙質のテクスチャはこれから何日かに分けて頼む（のこり10種：半紙・藁半紙・桜・若草・藍・麻の葉・青海波・市松・新聞紙・雲母刷り）。テクスチャがない紙質はコードのもよう
