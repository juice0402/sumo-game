# 筆の音（C・コードで作った音・11/28 聞きくらべで しょーくんが B をえらんだ）
# 使い方: python3 -I tools/fude_synth.py [出力のフォルダ＝media/sfx]  （numpy・scipy・ffmpeg が要る）
# 雑音は乱数で作るので、聞きくらべと同じ順番で A〜D を作り、B だけを fude.mp3 にする
import numpy as np, scipy.signal as sg, subprocess, sys
SR = 44100
rng = np.random.default_rng(11)
def env(t, d): return np.exp(-t / d)
def lp(x, f, o=2): return sg.sosfilt(sg.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sg.sosfilt(sg.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sg.sosfilt(sg.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def rms(x): return np.sqrt(np.mean(x * x)) + 1e-9
def unit(x): return x / rms(x)
def wobble(n, hz):                       # ゆっくり変わる 0〜1 のゆらぎ
    y = lp(rng.standard_normal(n + SR // 4), hz)[SR // 4:]
    return (y - y.min()) / (y.max() - y.min() + 1e-9)
def room(x, sec=0.5, wet=0.06, tone=2500):
    n = int(SR * sec); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / (sec / 5)); ir = lp(ir, tone); ir[:int(SR * 0.01)] = 0
    w = sg.fftconvolve(x, ir)[:len(x)]; w /= (np.abs(w).max() + 1e-9)
    return x + wet * w * np.abs(x).max()

def stroke(dur, harai=0.4, tome=False, dark=0.0, grit=1.0, press=1.0):
    """筆で一画：入り（毛先を置く）→ 送り（毛と和紙のこすれ）→ はらい（力が抜けて速く・明るく）か、とめ"""
    n = int(SR * dur); t = np.arange(n) / SR; u = t / dur
    p = (1 - np.exp(-t / 0.014)) * (0.82 + 0.18 * wobble(n, 7))        # 筆圧
    if harai > 0:
        h0 = 1 - harai
        p *= np.where(u < h0, 1.0, np.clip(1 - (u - h0) / harai, 0, 1) ** 1.7)
    else:
        p *= np.where(u < 0.9, 1.0, np.clip((1 - u) / 0.1, 0, 1) ** 0.8)
    v = np.clip(u / 0.12, 0, 1) ** 0.6 * (0.75 + 0.25 * u)            # 速さ
    if harai > 0: v = v + np.where(u > 1 - harai, (u - (1 - harai)) / harai * 0.7, 0)
    nz = rng.standard_normal(n)
    body = unit(bp(nz, 320, 1500))          # やわらかい毛のこすれ（低め）
    air = unit(bp(nz, 1500, 5200))          # 和紙のざらつき（高め）
    hiss = unit(hp(nz, 6000))
    b = np.clip(0.3 + 0.5 * v - 0.3 * dark, 0, 1)
    y = (1 - b) * body * 1.2 + b * air + 0.12 * b * hiss
    y *= 0.5 + 0.5 * wobble(n, 38)          # 毛のたばが紙の凸凹をなでる、こまかなゆらぎ
    g = np.zeros(n); k = rng.random(n) < (110 * grit / SR)              # 繊維に引っかかるプチプチ
    g[k] = rng.uniform(-1, 1, k.sum()); g = unit(hp(sg.lfilter([1], [1, -0.82], g), 2000))
    y += 0.25 * grit * g * (0.4 + 0.6 * wobble(n, 20))
    y *= p * np.sqrt(np.clip(v, 0, None) + 0.05)
    y += 0.9 * press * unit(lp(rng.standard_normal(n), 300)) * env(t, 0.022) * (1 - np.exp(-t / 0.002))   # 入りのトッ
    if tome:                                 # とめ：最後にぐっと押さえる
        te = int(n * 0.88); tt = np.clip(t - t[te], 0, None)
        y += 0.6 * unit(lp(rng.standard_normal(n), 450)) * env(tt, 0.03) * (t >= t[te])
    y = lp(y, 7500, 4)                       # 筆はペンより高い音がやわらかい
    return np.tanh(1.6 * y / np.abs(y).max())

def koto(notes=((0.0, 440.0), (0.11, 587.33)), dur=1.3):
    """琴のポロン（カープラス・ストロング）：名前が出る合図の別案"""
    n = int(SR * dur); y = np.zeros(n)
    for t0, f in notes:
        L = int(SR / f); buf = rng.uniform(-1, 1, L); buf = lp(np.r_[buf, buf], 6000)[L:]
        s = int(SR * t0); out = np.zeros(n - s)
        for i in range(len(out)):
            j = i % L; nxt = (i + 1) % L
            out[i] = buf[j]; buf[j] = 0.4985 * (buf[j] + buf[nxt])
        out *= 1 - np.exp(-np.arange(len(out)) / SR / 0.001)
        y[s:] += out
    y = lp(y, 5000) + 0.25 * bp(y, 180, 700)   # 胴の響き
    return room(y, sec=0.9, wet=0.16, tone=3000)

def save(y, name, vol=0.89):
    y = np.r_[y, np.zeros(int(SR * 0.05))]
    m = int(SR * 0.03); y[-m:] *= np.linspace(1, 0, m)
    y = y / np.abs(y).max() * vol
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '80k', name],
                   input=(y * 32767).astype('<i2').tobytes(), check=True)

out = sys.argv[1] if len(sys.argv) > 1 else 'media/sfx'
gap = lambda s: np.zeros(int(SR * s))
A = room(stroke(0.42, harai=0.45))                                                      # A 一画のサーッ（はらい）
B = room(np.r_[stroke(0.15, harai=0, tome=True), gap(0.05), stroke(0.24, harai=0.5)])  # B 二画のサッ・サーッ
C = room(stroke(0.46, harai=0, tome=True, dark=0.6, grit=1.5, press=1.3), wet=0.08)     # C 太筆のズズッ（とめ）
D = koto()                                                                              # D 琴のポロン（筆ではない）
save(B, f'{out}/fude.mp3')                                                              # えらんだのは B（A・C・D は聞きくらべの候補）
