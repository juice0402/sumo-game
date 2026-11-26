# Codex の絵（art-irai の art/ の枝の PNG）を、部品に切って緑（または黒）を抜き、assets/art/*.webp にする。
#   python3 -I tools/art_cut.py <PNG> <型> <出力の名前…>
#   型：row3＝横に3つ／himo＝上に3つ・下に房とまっすぐな紐／fx＝黒の地の 3×2（明るさ → すけ具合）／tex＝画面いっぱいのテクスチャ（小さくするだけ）
# 緑の抜き方：緑がほかの色より強い所ほどすける。ふちの緑は赤か青の強いほうまで下げる（緑のにじみを消す）。
# まっすぐな紐は、柄のくり返しの長さを自動で探して、そのぶんを切り出す（くり返して並べてもつなぎ目が出ない）。
import sys, json
import numpy as np
from PIL import Image

def key_green(im):
    a = np.asarray(im.convert('RGB')).astype(np.int32)
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    m = np.maximum(r, b)
    al = 255 - np.clip((g - m - 12) * 255 // 50, 0, 255)
    g2 = np.where(al < 255, np.minimum(g, m), g)
    g2 = np.minimum(g2, np.maximum(m + 25, 0))  # 少しだけ緑っぽいふちも消す
    g2 = np.where(g > m + 25, g2, g)
    out = np.dstack([r, g2, b, al]).astype(np.uint8)
    return Image.fromarray(out, 'RGBA')

def segs(mask, minw=20):
    res, s = [], None
    for i, c in enumerate(mask):
        if c and s is None: s = i
        if not c and s is not None:
            if i - s > minw: res.append((s, i))
            s = None
    if s is not None: res.append((s, len(mask)))
    return res

def split_x(im, y0=0, y1=None):
    al = np.asarray(im)[y0:y1, :, 3]
    out = []
    for s, e in segs((al > 128).sum(0) > 3):
        sub = im.crop((s, y0, e, y1 if y1 else im.height))
        out.append(sub.crop(sub.getbbox()))
    return out

def cord_tile(strip):
    a = np.asarray(strip).astype(np.float64)
    h, w = a.shape[:2]
    # はしの丸い所を外す
    core = a[:, int(w * 0.08):int(w * 0.92)]
    prof = core[h // 4: 3 * h // 4, :, :3].mean(axis=(0, 2))
    prof = prof - prof.mean()
    best, lag = -1, None
    for L in range(24, min(420, len(prof) // 3)):
        c = np.dot(prof[:-L], prof[L:]) / np.sqrt(np.dot(prof[:-L], prof[:-L]) * np.dot(prof[L:], prof[L:]))
        if c > best + 1e-9 and (lag is None or c > best):
            best, lag = c, L
    # いちばん似ている長さの倍数で、200px 以上になるように
    n = max(1, round(260 / lag))
    x0 = int(w * 0.3)
    tile = strip.crop((x0, 0, x0 + lag * n, h))
    return tile, lag, best, n

def save(im, name):
    im.save(f'assets/art/{name}.webp', 'WEBP', quality=82, alpha_quality=90, method=6)
    print(name, im.size)

def key_black(im, boost):
    a = np.asarray(im.convert('RGB')).astype(np.float64)
    m = a.max(axis=2)
    al = np.clip((m - 6) / 249 * boost, 0, 1)
    rgb = np.where(al[..., None] > 0.004, np.clip(a / np.maximum(al[..., None], 1e-3), 0, 255), 0)
    return Image.fromarray(np.dstack([rgb, al * 255]).astype(np.uint8), 'RGBA')

def fit(im, mx):
    im = im.crop(im.getbbox())
    k = min(1, mx / max(im.size))
    return im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS) if k < 1 else im

src, kind, names = sys.argv[1], sys.argv[2], sys.argv[3:]
if kind == 'fx':
    raw = Image.open(src)
    W, H = raw.size
    # 名前:大きさの上限:濃さ（金箔はかたく、煙と光はやわらかく）
    for i, spec in enumerate(names):
        n, mx, boost = spec.split(':')
        cx, cy = i % 3, i // 3
        cell = raw.crop((cx * W // 3, cy * H // 2, (cx + 1) * W // 3, (cy + 1) * H // 2))
        k = key_black(cell, float(boost))
        al = np.asarray(k)[..., 3]
        k.putalpha(Image.fromarray(np.where(al > 6, al, 0).astype(np.uint8)))
        save(fit(k, int(mx)), n)
    sys.exit()
if kind == 'tex':
    im = Image.open(src).convert('RGB').resize((int(names[1]),) * 2, Image.LANCZOS)
    im.save(f'assets/art/{names[0]}.webp', 'WEBP', quality=80, method=6)
    print(names[0], im.size)
    sys.exit()
im = key_green(Image.open(src))
if kind == 'row3':
    parts = split_x(im)
    for p, n in zip(parts, names): save(p, n)
elif kind == 'himo':
    H = im.height
    top = split_x(im, 0, int(H * 0.58))
    bot = split_x(im, int(H * 0.58), H)
    for p, n in zip(top + bot[:1], names[:4]): save(p, n)
    tile, lag, c, n = cord_tile(bot[1])
    print('cord period', lag, 'corr', round(c, 3), 'x', n)
    save(tile, names[4])
