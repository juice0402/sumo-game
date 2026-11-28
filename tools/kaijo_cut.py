# 本場所の会場の絵（Codex・art-irai の out/sumo/kaijo-*.png）を、緑を抜いて assets/art/kaijo-*.webp にし、
# 部品の四角と合わせる所を src/data/kaijoart.js に書く。
#   python3 -I tools/kaijo_cut.py crowd <PNG> <名前> <key> [--scale 0.5]   … 観客のシート（1人ずつの四角を探す・シートは1枚のまま）
#   python3 -I tools/kaijo_cut.py yane <PNG> [--scale 0.5]                 … 吊り屋根（幕の下のふちと幕の幅を探す）
#   python3 -I tools/kaijo_cut.py kensho <PNG> <名前> <key> [--scale 0.5]  … 懸賞旗を持つ呼出し（1人ずつの四角＋旗の字を書く四角と字の色）
import sys, os, re, json
import numpy as np
from PIL import Image
from scipy import ndimage

def key_green(im):   # 緑の抜き方は tools/art_cut.py と同じ（あちらは読みこむと動きだすので写した）
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.maximum(r, b)
    al = 255 - np.clip((g - m - 12) * 255 // 50, 0, 255)
    g2 = np.where(al < 255, np.minimum(g, m), g)
    g2 = np.minimum(g2, np.maximum(m + 25, 0))
    g2 = np.where(g > m + 25, g2, g)
    return Image.fromarray(np.dstack([r, g2, b, al]).astype(np.uint8), 'RGBA')

ART_JS = 'src/data/kaijoart.js'

def opt(name, default):
    if name in sys.argv:
        i = sys.argv.index(name)
        v = sys.argv[i + 1]
        del sys.argv[i:i + 2]
        return float(v)
    return default

def save(im, name, q=80, aq=70):
    im.save(f'assets/art/{name}.webp', 'WEBP', quality=q, alpha_quality=aq, method=6)
    print(f'assets/art/{name}.webp', im.size, os.path.getsize(f'assets/art/{name}.webp') // 1024, 'KB')

def write_entry(key, entry):
    s = open(ART_JS, encoding='utf-8').read()
    body = re.search(r'export const KAIJO_ART = \{(.*?)\};', s, re.S).group(1)
    items = dict(re.findall(r'\n  (\w+): (\{.*?\}),', body))
    items[key] = json.dumps(entry, ensure_ascii=False, separators=(', ', ': ')).replace('"', "'").replace("'id'", 'id').replace("'w'", 'w').replace("'h'", 'h').replace("'rects'", 'rects').replace("'curtain'", 'curtain').replace("'span'", 'span').replace("'band'", 'band').replace("'note'", 'note')
    out = ''.join(f'\n  {k}: {v},' for k, v in items.items())
    s = s.replace(re.search(r'export const KAIJO_ART = \{.*?\};', s, re.S).group(0), 'export const KAIJO_ART = {' + out + '\n};')
    open(ART_JS, 'w', encoding='utf-8').write(s)

OPT_DIL = 6
def crowd(png, name, key, scale):
    im = key_green(Image.open(png))
    a = np.asarray(im)[..., 3] > 128
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=int(OPT_DIL)))   # 扇などの小さな部品も同じ人にまとめる
    boxes = []
    for sl in ndimage.find_objects(lab):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h * w < (a.shape[0] * a.shape[1]) / 200: continue   # ごみ
        boxes.append((sl[1].start, sl[0].start, w, h))
    boxes.sort(key=lambda b: (round((b[1] + b[3] / 2) / (a.shape[0] / 6)), b[0]))   # 上の段から、左から
    W, H = round(im.width * scale), round(im.height * scale)
    small = im.resize((W, H), Image.LANCZOS)
    save(small, name)
    rects = [[round(x * scale), round(y * scale), round(w * scale), round(h * scale)] for x, y, w, h in boxes]
    write_entry(key, {'id': name, 'w': W, 'h': H, 'rects': rects})
    print(len(rects), 'こ', rects[:3], '…')

def yane(png, scale):
    im = key_green(Image.open(png))
    al = np.asarray(im)[..., 3]
    ys, xs = np.nonzero(al > 128)
    im = im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1))
    rgb = np.asarray(im.convert('RGB')).astype(int); al = np.asarray(im)[..., 3]
    r, g, b = rgb[..., 0], rgb[..., 1], rgb[..., 2]
    purple = (al > 128) & (b > g + 25) & (r > g + 10)   # 紫の幕
    ys, xs = np.nonzero(purple)
    x0, x1 = np.percentile(xs, 1), np.percentile(xs, 99)
    # 幕の下のふち：まん中の半分の列ごとに、いちばん下の紫 → そのまん中
    cols = range(int(x0 + (x1 - x0) * 0.25), int(x0 + (x1 - x0) * 0.75))
    bottoms = [np.nonzero(purple[:, c])[0].max() for c in cols if purple[:, c].any()]
    yb = float(np.median(bottoms))
    tops = [np.nonzero(purple[:, c])[0].min() for c in cols if purple[:, c].any()]
    yt = float(np.median(tops))
    W, H = round(im.width * scale), round(im.height * scale)
    save(im.resize((W, H), Image.LANCZOS), 'kaijo-yane')
    write_entry('yane', {'id': 'kaijo-yane', 'w': W, 'h': H, 'band': round(yt / im.height, 4), 'curtain': round(yb / im.height, 4), 'span': round((x1 - x0) / im.width, 4)})
    print('幕の下のふち', round(yb / im.height, 3), '幕の幅', round((x1 - x0) / im.width, 3))

def kensho(png, name, key, scale):
    # 懸賞旗を持つ呼出し（1列）：1人ずつの四角と、旗のまん中の平らな所（店の名前を書く四角）・字の色
    im = key_green(Image.open(png)); rgb = np.asarray(im.convert('RGB')).astype(int)
    a = np.asarray(im)[..., 3] > 128
    lab, n = ndimage.label(ndimage.binary_dilation(a, iterations=int(OPT_DIL)))
    boxes = []
    for sl in ndimage.find_objects(lab):
        h, w = sl[0].stop - sl[0].start, sl[1].stop - sl[1].start
        if h * w < (a.shape[0] * a.shape[1]) / 100: continue
        boxes.append((sl[1].start, sl[0].start, w, h))
    boxes.sort(key=lambda b: b[0])
    banners, inks = [], []
    for x, y, w, h in boxes:
        # 旗の色：人の四角の上から25%・竿をさけて左右の 30〜45% の所の色のまんなか
        ys = slice(y + int(h * 0.18), y + int(h * 0.32))
        samp = np.concatenate([rgb[ys, x + int(w * 0.3):x + int(w * 0.42)].reshape(-1, 3), rgb[ys, x + int(w * 0.58):x + int(w * 0.7)].reshape(-1, 3)])
        c = np.median(samp, axis=0)
        near = (np.abs(rgb - c).sum(axis=2) < 70) & a
        near[:, :x] = False; near[:, x + w:] = False; near[:y] = False; near[y + int(h * 0.65):] = False
        lb, _ = ndimage.label(near)
        cy, cx = y + int(h * 0.25), x + int(w * 0.36)
        k = lb[cy, cx] or np.bincount(lb[ys, x:x + w].ravel())[1:].argmax() + 1
        yy, xx = np.nonzero(lb == k)
        bx0, bx1, by0, by1 = np.percentile(xx, 3), np.percentile(xx, 97), np.percentile(yy, 2), np.percentile(yy, 98)
        banners.append([round(v * scale) for v in (bx0, by0, bx1 - bx0, by1 - by0)])
        lum = 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2]
        inks.append('#201E1B' if lum > 150 else '#EEE9DE')
    W, H = round(im.width * scale), round(im.height * scale)
    save(im.resize((W, H), Image.LANCZOS), name)
    rects = [[round(x * scale), round(y * scale), round(w * scale), round(h * scale)] for x, y, w, h in boxes]
    write_entry(key, {'id': name, 'w': W, 'h': H, 'rects': rects, 'banner': banners, 'ink': inks})
    print(len(rects), '人', rects, banners, inks)

if __name__ == '__main__':
    scale = opt('--scale', 0.5)
    OPT_DIL = opt('--dilate', 6)   # 部品をまとめる広さ（となりの人とくっつくときは小さく）
    kind = sys.argv[1]
    if kind == 'crowd': crowd(sys.argv[2], sys.argv[3], sys.argv[4], scale)
    elif kind == 'yane': yane(sys.argv[2], scale)
    elif kind == 'kensho': kensho(sys.argv[2], sys.argv[3], sys.argv[4], scale)
