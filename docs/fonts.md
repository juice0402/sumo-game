# 字（フォント）の出どころ（media/fonts/）

11/28（issue #27）から字は同梱（ネットにつながなくても同じ字・code-rules.md の D・App Store に要る）。前は Google Fonts から読んでいた。

| 字 | 使う所 | もと（media/fonts/） | 出どころ | ライセンス |
|---|---|---|---|---|
| Yuji Syuku（400） | 見出し・名前・ボタン・切りかえ（筆の字・`.brush`） | YujiSyuku-Regular.ttf | github.com/google/fonts の ofl/yujisyuku（Copyright 2021 The Yuji Project Authors） | SIL Open Font License 1.1（OFL-YujiSyuku.txt） |
| Zen Kaku Gothic New（500・700） | 小さな説明・数字（ゴシック） | ZenKakuGothicNew-Medium.ttf・ZenKakuGothicNew-Bold.ttf | github.com/google/fonts の ofl/zenkakugothicnew（Copyright 2022 The Zen Kaku Gothic Project Authors） | SIL Open Font License 1.1（OFL-ZenKakuGothicNew.txt） |

- しぼり方：`python3 -I tools/fonts.py`（fonttools の subset）→ media/fonts/yuji-syuku.woff2・zen-kaku-500.woff2・zen-kaku-700.woff2 と fonts.json（入れた字・もとの字にない字）。入れる字は src/ の .js・.html・.css の字（コメントはのぞく）＋かな・英数字・記号。縦書き（vert）などの機能と、著作権・ライセンスの名前はそのまま残す
- 足りない字の点検：`node tools/fontcheck.mjs`（`node tools/test.mjs` も呼ぶ）。src/ に新しい字を足したら NG になるので、fonts.py を動かして woff2 と fonts.json をコミット
- ビルドは woff2 を assets/ に中身の印つきで置き、`@font-face`（font-display:swap）を CSS の頭に・筆の字とゴシック500を先読み（preload）
- 大きさ（11/28）：筆の字 約0.87MB・ゴシック 約0.17MB×2＝合わせて約1.2MB（めやす1.5MBまで）。筆の字が重いので、字を増やすときは大きさを見る
- 権利表記：設定 → 権利表記（名前と使う所とライセンス＝src/data/text.js の T.rights）→ ライセンスの全文（ビルドが OFL 2つと Rapier・three の LICENSE をつないで assets/ の licenses.*.txt に）。OFL の字は、ゲームといっしょになら配ってよい（字だけを売らない・名前を変えて配るときは「Reserved Font Name」に気をつける＝しぼった字はもとの名前のまま中で使うだけ）
