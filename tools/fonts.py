# 字（フォント）をゲームで使う字だけにしぼって woff2 にする（11/28・issue #27）。
#   python3 -I tools/fonts.py
# - もとの字は media/fonts/*.ttf（github.com/google/fonts の ofl/・SIL Open Font License 1.1・出どころは docs/fonts.md）
# - 入れる字：src/ のファイルの字（コメントはのぞく＝strip_comments・tools/fontcheck.mjs と同じ決まり）＋かな・英数字・記号（BASE）。
#   遊ぶ人は字を打たないので、これで足りる
# - できるもの：media/fonts/<名前>.woff2（ビルドが assets/ に中身の印つきで置く）と media/fonts/fonts.json（入れた字・もとの字にない字）
# - src/ に新しい字が増えたら node tools/fontcheck.mjs（test.mjs も呼ぶ）が知らせる → これを動かしなおす
# - 要るもの：pip install fonttools brotli --break-system-packages
import json
import pathlib
import re
from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = pathlib.Path(__file__).resolve().parent.parent
FONTS = ROOT / 'media' / 'fonts'

# family と weight は CSS の font-family・font-weight と同じに（style.css・cut.js・venue.js）
FACES = [
    {'file': 'YujiSyuku-Regular.ttf', 'out': 'yuji-syuku', 'family': 'Yuji Syuku', 'weight': 400},
    {'file': 'ZenKakuGothicNew-Medium.ttf', 'out': 'zen-kaku-500', 'family': 'Zen Kaku Gothic New', 'weight': 500},
    {'file': 'ZenKakuGothicNew-Bold.ttf', 'out': 'zen-kaku-700', 'family': 'Zen Kaku Gothic New', 'weight': 700},
]


def rng(a, b):
    return ''.join(chr(c) for c in range(a, b + 1))


# かな・英数字・記号（src/ に出てこなくても入れておく）
BASE = (
    rng(0x20, 0x7E)          # 英数字と記号
    + rng(0x3000, 0x303F)    # 、。「」〜 など
    + rng(0x3041, 0x3096) + rng(0x3099, 0x309F)   # ひらがな
    + rng(0x30A0, 0x30FF)    # カタカナ
    + rng(0xFF01, 0xFF5E)    # 全角の英数字と記号
    + rng(0x2010, 0x2027)    # ‐ – — ‘ ’ “ ” … など
    + '×÷±°′″※○●◎△▲▽▼□■◇◆★☆→←↑↓々〆'
)


# コメントを外す（字を少なくして軽くする）。fontcheck.mjs の stripComments と同じ3つの決まり
def strip_comments(t):
    t = re.sub(r'/\*[\s\S]*?\*/', '', t)
    t = re.sub(r'<!--[\s\S]*?-->', '', t)
    return re.sub(r'(^|[\s;,{}()\]])//[^\n]*', r'\1', t, flags=re.M)


def src_chars():
    s = set()
    for p in sorted((ROOT / 'src').rglob('*')):
        if p.is_file() and p.suffix in ('.js', '.html', '.css'):
            s |= set(strip_comments(p.read_text('utf-8')))
    return s


def main():
    want = {c for c in src_chars() | set(BASE) if ord(c) >= 0x20}
    info = {'faces': []}
    for f in FACES:
        font = TTFont(FONTS / f['file'])
        cmap = font.getBestCmap()
        have = sorted(c for c in want if ord(c) in cmap)
        absent = sorted(c for c in want if ord(c) not in cmap and ord(c) > 0x20)
        opt = subset.Options()
        opt.flavor = 'woff2'
        opt.layout_features = ['*']   # 縦書き（vert）・かなの字詰めなどを残す
        opt.name_IDs = ['*']          # 著作権とライセンスの名前を残す（OFL）
        opt.name_languages = ['*']
        opt.notdef_outline = True
        opt.hinting = False
        opt.desubroutinize = True
        sub = subset.Subsetter(opt)
        sub.populate(unicodes=[ord(c) for c in have])
        sub.subset(font)
        out = FONTS / (f['out'] + '.woff2')
        font.save(out)
        info['faces'].append({
            'name': f['out'], 'family': f['family'], 'weight': f['weight'], 'from': f['file'],
            'chars': ''.join(have), 'absent': ''.join(absent),
        })
        print(f"{out.name} {out.stat().st_size / 1e3:.0f}KB・{len(have)}字" + (f"（もとの字にない {len(absent)}字）" if absent else ''))
    (FONTS / 'fonts.json').write_text(json.dumps(info, ensure_ascii=False, indent=1) + '\n', 'utf-8')


if __name__ == '__main__':
    main()
