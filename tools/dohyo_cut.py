# 土俵スキンの絵（art-irai の art/sumo-dohyo-skin-* の PNG）を assets/art/*.webp にする（11/28）
#   上の面の1枚絵：python3 -I tools/dohyo_cut.py top <PNG> <名前> [--size 768] [--q 80]
#     → 正方形に切って（はみ出たぶんは両はしを同じだけ切る）size にする
#   横の面の帯：python3 -I tools/dohyo_cut.py strips <PNG> <名前1> <名前2> … [--w 1024] [--q 80]
#     → 緑 #00FF00 のすきまで上から帯に分け、ふちの緑を切り落として 4:1（土俵の横の面の形）に縮める
import sys
import numpy as np
from PIL import Image

def opt(name, default):
    if name in sys.argv:
        i = sys.argv.index(name); v = sys.argv[i + 1]; del sys.argv[i:i + 2]; return type(default)(v)
    return default

def greenish(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (g > 150) & (g - np.maximum(r, b) > 60)

def save(im, name, q):
    im.convert('RGB').save(f'assets/art/{name}.webp', 'WEBP', quality=q, method=6)
    print(name, im.size)

def top(path, name, size, q):
    im = Image.open(path).convert('RGB'); w, h = im.size; s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((size, size), Image.LANCZOS)
    save(im, name, q)

def strips(path, names, W, q):
    im = Image.open(path).convert('RGB'); a = np.asarray(im)
    rows = greenish(a).mean(axis=1) > 0.5                     # ほとんど緑の行＝すきま
    bands, s = [], None
    for y, g in enumerate(list(rows) + [True]):
        if not g and s is None: s = y
        if g and s is not None:
            if y - s > 40: bands.append((s, y))
            s = None
    if len(bands) != len(names): sys.exit(f'帯が {len(bands)} 本（{len(names)} 本のはず）: {bands}')
    for (y0, y1), name in zip(bands, names):
        b = a[y0:y1]; cols = ~(greenish(b).mean(axis=0) > 0.3)
        xs = np.where(cols)[0]; x0, x1 = xs[0], xs[-1] + 1
        rows2 = ~(greenish(b[:, x0:x1]).mean(axis=1) > 0.3); ys = np.where(rows2)[0]
        band = im.crop((x0 + 2, y0 + ys[0] + 2, x1 - 2, y0 + ys[-1] - 1))   # ふちのにじみを2px切る
        bw, bh = band.size; H = W // 4
        # 縦横が 4:1 でなくても切らずに縮める（かざりは帯の左右のはしにあるので、切ると消える）
        save(band.resize((W, H), Image.LANCZOS), name, q)

if __name__ == '__main__':
    size, W, q = opt('--size', 768), opt('--w', 1024), opt('--q', 80)
    kind, path = sys.argv[1], sys.argv[2]
    if kind == 'top': top(path, sys.argv[3], size, q)
    elif kind == 'strips': strips(path, sys.argv[3:], W, q)
    else: sys.exit('型は top か strips')
