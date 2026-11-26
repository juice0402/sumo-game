# Codex の絵（art-irai の art/ の枝の PNG）を、部品に切って緑（または黒）を抜き、assets/art/*.webp にする。
#   python3 -I tools/art_cut.py <PNG> <型> <出力の名前…>
#   python3 -I tools/art_cut.py <PNG> <型> <名前…> [--q 品質] [--aq すけ具合の品質] [--scale 倍率]（名前@倍率 で1つだけ小さく）
#   tex の後ろに --period（もようの紙・くり返しの長さで切る）・tint=#RRGGBB（色を地の色に合わせる）
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

# 保存の形（code-rules C・11/26 の軽量化）：--q 品質・--aq すけ具合の品質・--scale 小さくする倍率（名前ごとに 名前@倍率 も可）
OPT = {'q': 78, 'aq': 80, 'scale': 1.0, 'cols': 3}
ARGS, _argv = [], sys.argv[1:]
while _argv:
    _a = _argv.pop(0)
    if _a in ('--q', '--aq', '--scale', '--cols'): OPT[_a[2:]] = float(_argv.pop(0))
    else: ARGS.append(_a)

def save(im, name):
    k = OPT['scale']
    if '@' in name: name, k = name.split('@')[0], float(name.split('@')[1])
    if k < 1: im = im.resize((max(1, round(im.width * k)), max(1, round(im.height * k))), Image.LANCZOS)
    im.save(f'assets/art/{name}.webp', 'WEBP', quality=int(OPT['q']), alpha_quality=int(OPT['aq']), method=6)
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

src, kind, names = ARGS[0], ARGS[1], ARGS[2:]
if kind in ('fx', 'grid'):   # fx＝黒の地（明るさ → すけ具合）・grid＝緑の地。--cols でよこの数（たては2）
    raw = Image.open(src)
    W, H = raw.size
    C = int(OPT['cols'])
    # 名前:大きさの上限:濃さ（金箔はかたく、煙と光はやわらかく）
    for i, spec in enumerate(names):
        n, mx, boost = spec.split(':')
        cx, cy = i % C, i // C
        cell = raw.crop((cx * W // C, cy * H // 2, (cx + 1) * W // C, (cy + 1) * H // 2))
        if kind == 'grid':
            save(fit(key_green(cell), int(mx)), n)
            continue
        k = key_black(cell, float(boost))
        al = np.asarray(k)[..., 3]
        k.putalpha(Image.fromarray(np.where(al > 6, al, 0).astype(np.uint8)))
        save(fit(k, int(mx)), n)
    sys.exit()
def period(prof, lo=40):
    prof = prof - prof.mean()
    best, lag = -2, None
    for L in range(lo, len(prof) // 2):
        a, b = prof[:-L], prof[L:]
        c = np.dot(a, b) / (np.sqrt(np.dot(a, a) * np.dot(b, b)) + 1e-9)
        if c > best: best, lag = c, L
    return lag, best

if kind == 'tex':
    im = Image.open(src).convert('RGB')
    if '--period' in names:   # もようの紙：くり返しの長さを探して、その倍数で切る（上下・左右のつなぎ目を消す）
        g = np.asarray(im.convert('L')).astype(np.float64)
        def exact(prof):   # くり返しの長さを小数まで（いちばん遠い倍数の所で合わせる）
            p0, c0 = period(prof)
            prof = prof - prof.mean()
            n = max(1, (len(prof) - 20) // p0)
            best, Lb = -2, p0 * n
            for L in range(p0 * n - 6, p0 * n + 7):
                if L >= len(prof) - 8: continue
                a, b = prof[:-L], prof[L:]
                c = np.dot(a, b) / (np.sqrt(np.dot(a, a) * np.dot(b, b)) + 1e-9)
                if c > best: best, Lb = c, L
            return Lb, n, best
        Lx, nx, cx = exact(g.mean(axis=0)); Ly, ny, cy = exact(g.mean(axis=1))
        im = im.crop((0, 0, Lx, Ly))
        print('period', round(Lx / nx, 2), round(Ly / ny, 2), 'x', nx, ny, 'corr', round(cx, 2), round(cy, 2))
    tint = next((n.split('=')[1] for n in names if n.startswith('tint=')), None)
    if tint:   # 色だけ data/papers.js の地の色に合わせる（繊維やつぶの明るさのちがいはそのまま）
        a = np.asarray(im).astype(np.float64)
        lum = a @ np.array([0.299, 0.587, 0.114])
        base = np.array([int(tint[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float64)
        out = np.clip(base[None, None, :] * (lum / lum.mean())[..., None], 0, 255)
        im = Image.fromarray(out.astype(np.uint8), 'RGB')
    mx = int(names[1]); k = mx / max(im.size)
    im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    im.save(f'assets/art/{names[0]}.webp', 'WEBP', quality=int(OPT['q']), method=6)
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
