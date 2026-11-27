# 本場所の会場の音（11/27 しょーくん「空気感とか演出とかも、かなり豪華なものに」→ 会場のざわめき・歓声と拍手・ストンとパッの音）
#   コードで作る（C）：zawa（ざわめき・ループ）・doyo（どよめき「おおっ」）・kansei（歓声「わあーっ」）・pa（明かりがパッ＝大きなスイッチ）
#   koe-irai からえらぶ（CC0 Wyzowl）：hakushu（拍手）・suton（ストン）
# 使い方: python3 -I tools/kaijo_sfx.py --koe <koe-irai のフォルダ> [出力のフォルダ＝assets/sfx]  （numpy・scipy・ffmpeg が要る）
# 人の声は、のどの音（のこぎり波）を口の形（母音の共鳴）に通して作る。たくさん重ねて遠くの会場の響きに入れると、言葉の聞こえないざわめきになる
import numpy as np, scipy.signal as sg, subprocess, sys

SR = 22050
rng = np.random.default_rng(27)
VOW = {'a': (750, 1250, 2600), 'i': (300, 2250, 3000), 'u': (340, 1350, 2400), 'e': (480, 1900, 2600), 'o': (480, 850, 2500)}
BW = (90, 120, 180)
GAIN = (1.0, 0.6, 0.25)

def lp(x, f, o=2): return sg.sosfilt(sg.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sg.sosfilt(sg.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sg.sosfilt(sg.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def env(t, d): return np.exp(-t / d)
def reso(x, f, bw):
    r = np.exp(-np.pi * bw / SR); th = 2 * np.pi * f / SR
    return sg.lfilter([1 - r], [1, -2 * r * np.cos(th), r * r], x)
def smooth(x, sec):
    n = max(1, int(SR * sec)); k = np.hanning(n * 2 + 1); k /= k.sum()
    return np.convolve(x, k, mode='same')
def hall(x, sec=1.8, wet=0.35, tone=2400):
    n = int(SR * sec); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / (sec / 6.5)); ir = lp(ir, tone); ir[:int(SR * 0.02)] = 0
    w = sg.fftconvolve(x, ir)[:len(x)]
    return x * (1 - wet) + wet * w * (np.abs(x).max() / (np.abs(w).max() + 1e-9))

def source(f0, breath=0.04):   # のど：のこぎり波（高い音ほど弱く）＋息
    ph = np.cumsum(f0) / SR
    saw = (ph % 1.0) - 0.5
    return lp(saw, 700, 1) + breath * hp(rng.standard_normal(len(f0)), 1500)

def speak(src, weights, scale):   # 母音ごとに口の形を通して、重みでまぜる
    y = np.zeros_like(src)
    for v, w in weights.items():
        if w is None or not np.any(w): continue
        part = sum(g * reso(src, f * scale, bw) for f, bw, g in zip(VOW[v], BW, GAIN))
        y += w * part
    return y

def talker(n, male):   # 1人のおしゃべり：音節（6〜8 こ/秒）・言葉のまとまりと息つぎ・高さの上がり下がり
    t = np.arange(n) / SR
    f0b = rng.uniform(95, 140) if male else rng.uniform(175, 250)
    scale = rng.uniform(0.95, 1.05) if male else rng.uniform(1.1, 1.2)
    amp = np.zeros(n); vw = {v: np.zeros(n) for v in VOW}; pitch = np.full(n, f0b)
    s = rng.uniform(-1.5, 0.5)
    while s < n / SR:
        ph = rng.uniform(0.8, 2.6)   # 1つの言葉のまとまり
        a0, a1 = int(max(0, s) * SR), int(min(n / SR, s + ph) * SR)
        if a1 > a0:
            k = np.arange(a1 - a0) / max(1, a1 - a0)
            pitch[a0:a1] = f0b * (1.12 - 0.22 * k + 0.03 * rng.standard_normal())
        u = s
        while u < s + ph:
            d = rng.uniform(0.1, 0.19); v = rng.choice(list(VOW), p=[0.28, 0.17, 0.2, 0.15, 0.2])
            b0, b1 = int(max(0, u) * SR), int(min(n / SR, u + d * 0.8) * SR)
            if b1 > b0:
                amp[b0:b1] = rng.uniform(0.55, 1.0); vw[v][b0:b1] = 1
            u += d
        s += ph + rng.uniform(0.25, 1.4)   # 息つぎ・相手の話を聞く
    amp = smooth(amp, 0.022)
    for v in vw: vw[v] = smooth(vw[v], 0.03)
    pitch = pitch * (1 + 0.006 * smooth(rng.standard_normal(n), 0.02))
    return speak(source(pitch), vw, scale) * amp

def shout(n, male, vowel_path, onset, peak, tail, f_up=1.0, vib=0.03, breath=0.3):   # みんなの「おおっ」「わあーっ」
    t = np.arange(n) / SR
    f0b = (rng.uniform(110, 160) if male else rng.uniform(210, 290)) * f_up
    scale = rng.uniform(0.95, 1.05) if male else rng.uniform(1.1, 1.2)
    rise = np.clip((t - onset) / 0.12, 0, 1) ** 1.5
    fall = np.where(t < onset + peak, 1.0, np.exp(-(t - onset - peak) / tail))
    a = rise * fall
    pitch = f0b * (1 + 0.08 * np.clip((t - onset) / 0.3, 0, 1) - 0.1 * np.clip((t - onset - peak) / tail, 0, 1))
    pitch *= 1 + vib * np.sin(2 * np.pi * rng.uniform(4.5, 6.5) * t + rng.uniform(0, 6.28))
    pitch *= 1 + 0.01 * smooth(rng.standard_normal(n), 0.03)
    w = {v: np.zeros(n) for v in VOW}
    edges = [onset] + [onset + d for d, _ in vowel_path[1:]] + [99]
    for i, (_, v) in enumerate(vowel_path):
        w[v][(t >= edges[i]) & (t < edges[i + 1])] = 1
    for v in w: w[v] = smooth(w[v], 0.04)
    src = source(pitch) + breath * hp(rng.standard_normal(n), 900) * 0.25
    return speak(src, w, scale) * a

def place(y, far):   # 遠いほど小さく・こもる
    return lp(y, 3400 - 1800 * far) * (1 - 0.7 * far)

def finish(y, lo=140, hi=4200):
    y = hp(lp(y, hi), lo)
    return y / (np.abs(y).max() + 1e-9)

def zawa(L=8.0, pad=0.25, X=1.5, voices=30):
    n = int(SR * (L + X + 0.5))
    y = np.zeros(n)
    for i in range(voices):
        y += place(talker(n, i % 2 == 0), 0.15 + 0.85 * rng.uniform(0, 1) ** 0.6)   # 近くの人は少しだけ（言葉は聞きとれない）
    rumble = lp(rng.standard_normal(n), 380, 2) * 0.35 * np.abs(y).max() / 3   # 会場の低いうなり（足音・衣ずれ）
    y = hall(y + rumble, sec=2.0, wet=0.32)
    y = y[int(SR * 0.5):]                     # 響きがたまってから
    m, x = int(SR * L), int(SR * X)
    fade = np.sqrt(np.linspace(0, 1, x))
    p = y[:m].copy()
    p[:x] = y[:x] * fade + y[m:m + x] * fade[::-1]   # 1周＝L 秒（終わりと始めがつながる）
    q = int(SR * pad)
    return finish(np.concatenate([p[-q:], p, p[:q]]))   # 前後に pad 秒ずつ足す（mp3 の頭と後ろのすきまを飛ばしてループする）

def doyo(dur=2.0, voices=56):
    n = int(SR * dur); y = np.zeros(n)
    for i in range(voices):
        on = rng.uniform(0.0, 0.16)
        y += place(shout(n, i % 2 == 0, [(0, 'o'), (0.5, 'u')], on, rng.uniform(0.25, 0.45), rng.uniform(0.35, 0.6), f_up=1.05, vib=0.012, breath=0.15), rng.uniform(0, 1) ** 0.7)
    y = hall(y, sec=2.0, wet=0.4)
    fo = np.ones(n); m = int(SR * 0.3); fo[-m:] = np.linspace(1, 0, m)
    return finish(y * fo)

def kansei(dur=3.4, voices=80):
    n = int(SR * dur); y = np.zeros(n)
    for i in range(voices):
        on = rng.uniform(0.0, 0.28)
        path = [(0, 'u'), (0.07, 'a')] if rng.uniform() < 0.75 else [(0, 'o'), (0.6, 'o')]
        y += place(shout(n, i % 2 == 0, path, on, rng.uniform(0.5, 1.1), rng.uniform(0.6, 1.2), f_up=rng.uniform(1.25, 1.5), vib=0.03, breath=0.45), rng.uniform(0, 1) ** 0.6)
    y = hall(y, sec=2.4, wet=0.42)
    fo = np.ones(n); m = int(SR * 0.6); fo[-m:] = np.linspace(1, 0, m) ** 1.5
    return finish(y * fo, lo=160, hi=5000)

def pa(dur=1.5):   # 大きなスイッチ「ガシャン」（掛け金が2回かかる）＋ 会場に響く
    n = int(SR * dur); t = np.arange(n) / SR; y = np.zeros(n)
    for at, g in [(0.0, 1.0), (0.034, 0.55)]:
        tt = np.clip(t - at, 0, None); on = t >= at; nz = rng.standard_normal(n)
        y += g * on * (0.55 * hp(nz, 2600) * env(tt, 0.004) + 0.8 * bp(nz, 380, 2200) * env(tt, 0.028))
    y += 1.0 * np.sin(2 * np.pi * 64 * t) * env(t, 0.085) * (1 - np.exp(-t / 0.002))
    y += 0.25 * bp(rng.standard_normal(n), 90, 260) * env(t, 0.22)   # 鉄の枠がうなる
    y = hall(y, sec=1.5, wet=0.3, tone=3000)
    return finish(y, lo=40, hi=8000)

def save(y, name, vol=0.89, kbps=48):
    raw = (y / np.abs(y).max() * vol * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', f'{kbps}k', name], input=raw, check=True)

def pick(src, name, start=0.0, length=None, fade=0.0, kbps=64, rate=SR):   # koe-irai の音をモノラル・短く・おしりを小さく
    af = [f'atrim=start={start}' + (f':duration={length}' if length else ''), 'asetpts=PTS-STARTPTS']
    if fade and length: af.append(f'afade=t=out:st={max(0, length - fade)}:d={fade}')
    af.append('loudnorm=I=-16:TP=-1.5:LRA=11')
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-i', src, '-af', ','.join(af), '-ac', '1', '-ar', str(rate), '-b:a', f'{kbps}k', name], check=True)

if __name__ == '__main__':
    args = sys.argv[1:]
    koe = None
    if '--koe' in args:
        i = args.index('--koe'); koe = args[i + 1]; del args[i:i + 2]
    out = args[0] if args else 'assets/sfx'
    # 乱数の順番で音が変わる。この順番で作る
    save(zawa(), f'{out}/zawa.mp3', vol=0.8, kbps=40)
    save(doyo(), f'{out}/doyo.mp3', kbps=48)
    save(kansei(), f'{out}/kansei.mp3', kbps=48)
    save(pa(), f'{out}/pa.mp3', kbps=64)
    if koe:
        pick(f'{koe}/sfx/wyzowl/celebration/celebration-applause-big.mp3', f'{out}/hakushu.mp3', length=4.2, fade=1.6, kbps=48)
        pick(f'{koe}/sfx/wyzowl/impacts/impact-heavy-soft.mp3', f'{out}/suton.mp3', kbps=64, rate=44100)
