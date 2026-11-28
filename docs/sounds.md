# 効果音の出どころ（media/sfx/）

11/26 しょーくんの聞きくらべ（https://claude.ai/artifact/DYtnbvLj7foT52StiKthN1 ）で、えらんだときは和太鼓のドン（don・A）、札が出るのは紙のシュッ（shu・A）に。どちらも Python（numpy・scipy）で作った音で、作り直しは `python3 -I tools/sfx_synth.py`（同じ順番で作るので同じ音になる）。四股名をさずかる音（sumi＋ton）はそのまま（しょーくん「とても好き」）。

ほかは koe-irai（github.com/juice0402/koe-irai）の sfx/wyzowl/ から。集は Wyzowl SFX Kit（CC0・クレジットいらない・配布元 https://huggingface.co/datasets/wyzowl/sfx-kit・写し github.com/wyzowl/sfx-kit 92780e7）。
作ったのではなく、えらんで、モノラル・80kbps の mp3 にして、頭の無音を切り・短く切って・おしりに小さな fade out・大きさをそろえた（ffmpeg）。

| 名前 | 使う所 | koe-irai のもとのファイル | 長さ | 大きさ | ライセンス | 作者 |
|---|---|---|--:|--:|---|---|
| hyoshigi | 「勝負」の合図（拍子木） | sfx/wyzowl/notifications/notification-attention-soft（木を2回ノック） | 0.37秒 | 4KB | CC0 | Wyzowl |
| taiko | 激突（和太鼓） | sfx/wyzowl/cinematic-hits/cinematic-drum-big（大きな太鼓・1.2秒に切った） | 1.23秒 | 13KB | CC0 | Wyzowl |
| taiko-end | 決着（太鼓の決め） | sfx/wyzowl/cinematic-hits/cinematic-drum-massive（1.5秒に切った） | 1.54秒 | 16KB | CC0 | Wyzowl |
| ton | 土俵のトン | sfx/wyzowl/impacts/impact-light-firm（軽い木の音） | 0.13秒 | 2KB | CC0 | Wyzowl |
| pen | 切る画面で線を描きはじめるとき（ペン） | sfx/wyzowl/writing-and-drawing/writing-pen-draw（ペンで紙に描く音・11/28 までは fude の名前だった） | 1.31秒 | 13KB | CC0 | Wyzowl |
| kami | 切り出しの決定（紙を切る） | sfx/wyzowl/everyday-props/props-scissors | 0.16秒 | 2KB | CC0 | Wyzowl |
| sumi | 墨のしぶき | sfx/wyzowl/everyday-props/props-splash（水の音・0.6秒に切った） | 0.63秒 | 7KB | CC0 | Wyzowl |
| don | えらんだとき・決定のボタン（和太鼓のドン） | — コードで作った音（tools/sfx_synth.py の taiko・長胴） | 1.6秒 | 16KB | C（コードで作った音） | Claude |
| shu | 画面の札が右からシュッと入る（紙のシュッ） | — コードで作った音（tools/sfx_synth.py の shu） | 0.2秒 | 3KB | C（コードで作った音） | Claude |
| fude | 名前を筆で書く（福箱の札・取組の四股名と決まり手）。二画のサッ・サーッ（とめ → はらい） | — コードで作った音（tools/fude_synth.py の B・11/28 聞きくらべ https://claude.ai/artifact/Fx41NQuuQr3g1u5DHs6BAb で しょーくんがえらんだ） | 0.52秒 | 5KB | C（コードで作った音） | Claude |
| kin | 本場所のカットインのガキーン（金床を打つ） | sfx/oculus/metal/METLImpt_HammerAnvil_OS_01（頭の無音を切り・おしりに fade out） | 1.31秒 | 14KB | CC BY 4.0（クレジットがいる＝text.js の T.credits に1行） | Oculus VR, LLC |


- ぴったりではないもの：pen（切る画面・ペンの音）・sumi（水のしぶき）・hyoshigi（ノック）・taiko（洋の大太鼓）。聞いて合わなければ、ほかを koe-irai の catalog から選び直す
- Oculus（CC BY 4.0）は kin だけ。クレジット画面（text.js の T.credits）に koe-irai の sfx/README.md の1行をそのまま書いた。11/26 しょーくん：カットインは「シュッ2回 → ガキーン（E）」・拍子木のポポンとドンはいらない

## 本場所の会場の音（11/27）
11/27 しょーくん「空気感とか演出とかも、かなり豪華なものに」→ 会場のざわめき・歓声と拍手・ストンとパッの音。作り直しは `python3 -I tools/kaijo_sfx.py --koe <koe-irai のフォルダ>`（同じ順番で作るので同じ音になる）。
人の声は、のどの音（のこぎり波）を母音の共鳴に通して、たくさん重ねて会場の響きに入れた（言葉は聞きとれない）。

| 名前 | 使う所 | もと | 長さ | 大きさ | ライセンス | 作者 |
|---|---|---|--:|--:|---|---|
| zawa | 会場のざわめき（ループ・観客が湧くころから・「勝負」の前は静まる・番付で大きく） | — コードで作った音（30人のおしゃべり・8秒で1周＝前後0.25秒は飛ばす） | 8.5秒 | 43KB | C（コードで作った音） | Claude |
| doyo | はじめてぶつかったときのどよめき「おおっ」 | — コードで作った音 | 2.1秒 | 13KB | C（コードで作った音） | Claude |
| kansei | 決着の歓声「わあーっ」 | — コードで作った音 | 3.5秒 | 21KB | C（コードで作った音） | Claude |
| pa | 明かりがパッとつく（大きなスイッチのガシャン） | — コードで作った音 | 1.6秒 | 13KB | C（コードで作った音） | Claude |
| hakushu | 決着の拍手（歓声のすぐあと） | koe-irai・sfx:wyzowl/celebration/celebration-applause-big（4.2秒に切った） | 4.3秒 | 26KB | CC0 | Wyzowl |
| suton | 屋根と幕・提灯がストン・座布団が落ちる | koe-irai・sfx:wyzowl/impacts/impact-heavy-soft | 0.37秒 | 3KB | CC0 | Wyzowl |

- 幕が降りはじめに shu（低く）、着いたら suton、明かりで pa（ui/venue.js の cues・bout.js が鳴らす）
- 聞いて合わなければ、ざわめき・歓声は tools/kaijo_sfx.py の数（人数・響き）で作り直す
