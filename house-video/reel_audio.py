# Soundtrack for the reel: a driving groove, a riser and a hit on every beat change, a final chord.
# python3 -I reel_audio.py out.wav <beat starts...> --total <seconds>
import sys, wave
import numpy as np

SR = 48000
args = sys.argv[2:]; total = float(args[args.index('--total') + 1]); cuts = [float(x) for x in args[:args.index('--total')]]
n = int(SR * total); t = np.arange(n) / SR; rng = np.random.default_rng(3); noise = rng.standard_normal(n)
def filt(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X *= 1 / (1 + (f / hi) ** 4)
    if lo: X *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))
def add(buf, at, sig):
    i = int(at * SR); j = min(n, i + len(sig))
    if 0 <= i < n: buf[i:j] += sig[: j - i]
midi = lambda m: 440 * 2 ** ((m - 69) / 12)

BPM = 120; beat = 60 / BPM
chords = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]]; roots = [33, 29, 36, 31]
music = np.zeros(n); drums = np.zeros(n)
for bi, b in enumerate(np.arange(0, total - 2.2, beat)):
    bar = int(b / (beat * 4)) % 4
    x = np.arange(int(0.32 * SR)) / SR
    add(drums, b, np.sin(2 * np.pi * (48 + 80 * np.exp(-x * 40)) * x) * np.exp(-x * 9) * 0.55)          # kick
    if bi % 2 == 1:
        L = int(0.2 * SR); add(drums, b, filt(noise[:L], 1200, 6000) * np.exp(-np.arange(L) / SR * 20) * 0.35)  # clap
    for h in (0.5,):
        L = int(0.05 * SR); add(drums, b + h * beat, noise[1000:1000 + L] * np.exp(-np.arange(L) / SR * 80) * 0.12)  # off-beat hat
    xb = np.arange(int(beat * SR)) / SR                                                                    # bass, pumping
    add(music, b, np.sin(2 * np.pi * midi(roots[bar]) * xb) * (1 - np.exp(-xb * 30)) * np.exp(-xb * 3) * 0.32)
    for k, m in enumerate(chords[bar]):                                                                    # stabs
        xs = np.arange(int(0.22 * SR)) / SR
        add(music, b + beat * 0.5, (np.sign(np.sin(2 * np.pi * midi(m + 12) * xs)) * 0.25 + np.sin(2 * np.pi * midi(m + 12) * xs)) * np.exp(-xs * 14) * 0.05)
music = filt(music, hi=3500)
fx = np.zeros(n)
for c in cuts[1:]:  # riser into the cut, a deep hit on it
    a = c - 0.9; L = int(0.9 * SR); x = np.linspace(0, 1, L)
    add(fx, a, filt(noise[:L], 800, 7000) * x ** 3 * 0.25)
    xh = np.arange(int(0.6 * SR)) / SR
    add(fx, c, np.sin(2 * np.pi * (40 + 60 * np.exp(-xh * 25)) * xh) * np.exp(-xh * 5) * 0.45 + filt(noise[:len(xh)], 200, 2000) * np.exp(-xh * 12) * 0.15)
end = cuts[-1]; xe = np.arange(n - int(end * SR)) / SR                                                    # final chord
for m in (45, 57, 60, 64, 69):
    add(fx, end + 0.05, np.sin(2 * np.pi * midi(m) * xe) * np.exp(-xe * 0.6) * 0.06)
mix = drums * 0.9 + music + fx
fade = np.clip((total - t) / 1.5, 0, 1) * np.clip(t / 0.05, 0, 1); mix *= fade
mix = np.tanh(mix * 1.3) / 1.3; mix /= np.max(np.abs(mix)) / 0.9
st = np.stack([mix, np.roll(mix, 180)], 1)
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print('ok', total)
