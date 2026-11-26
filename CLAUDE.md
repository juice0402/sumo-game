# sumo-game（紙相撲のゲーム・記号 sumo・仮称 PAPER SUMO）

一枚の紙を一筆書きで切った形が力士になり、真横の2D物理で自動対戦する。描くのは Three.js の 2.5D。いまは試作②＋アプリの形（タイトル → 相撲部屋 →「勝負」→ 巡業（土俵巡業・特殊土俵）／本場所（番付・仮のレート）／稽古（CPU 5体）→ 力士選出 → 取組。力士3枠・四股名と称号。相手はまだ CPU の形にランダムな名前）。

- 地図：docs/MAP.md（まずここ → 検索 → その範囲だけ読む → 変わる所だけ直す）
- 直すのは src/（効果音は assets/sfx/）だけ。直したら `node tools/build.mjs` と `node tools/test.mjs`。index.html は自動で作る（読まない・手で直さない）
- 数字は src/data/config.js（変えたら CONFIG_VERSION を上げる）。物理を変えたら `node tools/sim-table.mjs --write` で相性表を更新
- 勝敗にかかわる計算は四則演算だけ（Math.sin などを使わない）。演出は記録の再生だけにして、物理にさわらない
- 見た目：墨 #201E1B・和紙 #EEE9DE・朱 #AB392F・金 #B79A53。AI っぽい飾り（グラデーション・光る輪・絵文字）は入れない
- 絵・音・福箱にさわるときは、ネット副業プロジェクトの claude/game-art-rule.md。福箱まわりの絵は Codex（assets/art/・一覧 docs/art.md）、ほかはコードで描く
- いまの状態・次はネット副業プロジェクトの claude/sumo-now.md（区切りごとにこれだけ書きかえる）。決まりは claude/sumo-game-idea.md（要件の全文は claude/sumo-youken.md）
- 返事はいつも日本語
