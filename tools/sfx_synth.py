# 和太鼓のドンと紙のシュッをコードで作る（C・コードで作った音・11/26 聞きくらべで しょーくんが A をえらんだ）
# 使い方: python3 -I tools/sfx_synth.py [出力のフォルダ＝assets/sfx]  （numpy・scipy・ffmpeg が要る）
import numpy as np, scipy.signal as sg, subprocess, sys, os
SR = 44100
rng = np.random.default_rng(7)
def env(t, d): return np.exp(-t / d)
def lp(x, f, o=2): return sg.sosfilt(sg.butter(o, f, 'low', fs=SR, output='sos'), x)
def hp(x, f, o=2): return sg.sosfilt(sg.butter(o, f, 'high', fs=SR, output='sos'), x)
def bp(x, lo, hi, o=2): return sg.sosfilt(sg.butter(o, [lo, hi], 'band', fs=SR, output='sos'), x)
def room(x, sec=0.7, wet=0.12, tone=1800):
    n = int(SR * sec); t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / (sec / 5)); ir = lp(ir, tone); ir[:int(SR*0.012)] = 0
    w = sg.fftconvolve(x, ir)[:len(x)]; w /= (np.abs(w).max() + 1e-9)
    return x + wet * w * np.abs(x).max()
def taiko(f0=74, dur=1.6, decay=1.15, glide=1.35, skin=0.55, wet=0.12):
    t = np.arange(int(SR * dur)) / SR
    f = f0 + (f0 * glide - f0) * np.exp(-t / 0.035)
    ph = 2 * np.pi * np.cumsum(f) / SR
    y = np.zeros_like(t)
    for r, a, d in [(1, 1, 1), (1.59, .45, .45), (2.14, .28, .28), (2.30, .18, .22), (2.65, .12, .16), (2.92, .08, .12)]:
        y += a * np.sin(ph * r + rng.uniform(0, 6.28)) * env(t, decay * d)
    y *= 1 - np.exp(-t / 0.002)                          # 立ち上がり
    nz = rng.standard_normal(len(t))
    y += skin * lp(nz, 1400) * env(t, 0.018)             # 撥が皮を打つ「パ」
    y += 0.18 * hp(nz, 3000) * env(t, 0.004)             # 撥の木の音
    y += 0.35 * np.sin(2 * np.pi * 175 * t) * env(t, 0.06)   # 胴の響き
    y += 0.22 * bp(nz, 280, 1100) * env(t, 0.14)          # 皮のざらつき（生の太鼓らしさ）
    for r, d in [(1, .9), (2.14, .3), (3.4, .16)]:          # 胴の中で鳴る音（雑音を共鳴させる）
        y += 0.5 * bp(nz, f0 * r * 0.93, f0 * r * 1.07) * env(t, decay * d) * (3 / r)
    y = np.tanh(1.25 * y / np.abs(y).max())
    y = room(y, wet=wet)
    fade = np.ones_like(y); m = int(SR * 0.08); fade[-m:] = np.linspace(1, 0, m)
    return y * fade
def shu(dur=0.2, lo=1200, hi=5200, peak=0.55):
    t = np.arange(int(SR * dur)) / SR
    nz = rng.standard_normal(len(t)); y = np.zeros_like(t); seg = 256
    for i in range(0, len(t), seg):                       # 帯をずらしながら（紙がこすれて抜ける）
        p = i / len(t); c = lo + (hi - lo) * p
        blk = bp(nz[max(0, i - 2048):i + seg], c * 0.6, min(c * 1.6, 18000))[-min(seg, len(t) - i):]
        y[i:i + len(blk)] = blk
    a = np.where(t / dur < peak, (t / dur / peak) ** 2, ((1 - t / dur) / (1 - peak)) ** 1.5)
    y = y * a; y += 0.25 * hp(rng.standard_normal(len(t)), 6000) * a * a
    return y / np.abs(y).max()
def save(y, name, vol=0.89):
    y = y / np.abs(y).max() * vol
    raw = (y * 32767).astype('<i2').tobytes()
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', '-f', 's16le', '-ar', str(SR), '-ac', '1', '-i', '-', '-b:a', '80k', name], input=raw, check=True)
out = sys.argv[1] if len(sys.argv) > 1 else 'assets/sfx'
# 雑音は乱数で作るので、作る順番で音が変わる。聞きくらべと同じ順番で作る（B・C は聞きくらべの候補・えらばなかった）
don = taiko()                                                    # A 和太鼓・長胴 → don.mp3
taiko(f0=96, decay=0.8, glide=1.3, skin=0.7, wet=0.1, dur=1.2)   # B 和太鼓・中くらい
taiko(f0=62, decay=1.6, glide=1.45, skin=0.45, wet=0.18, dur=2.0)  # C 和太鼓・大きく深く
kami = shu()                                                     # A 紙がシュッ → shu.mp3
save(don, f'{out}/don.mp3')
save(kami, f'{out}/shu.mp3')
