# Synthesises the soundtrack: ambient pad + bass + soft pulse, whooshes on stage changes, engine rumble under machines.
# python3 audio.py out.wav
import sys, wave
import numpy as np

SR, DUR = 48000, 100.0
n = int(SR * DUR)
t = np.arange(n) / SR
rng = np.random.default_rng(7)

def env(t0, t1, a=0.5, r=0.5):
    e = np.clip((t - t0) / a, 0, 1) * np.clip((t1 - t) / r, 0, 1)
    return e * e * (3 - 2 * e)

def lowpass(x, cutoff):  # cheap FFT brick-ish lowpass
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= 1 / (1 + (f / cutoff) ** 4); return np.fft.irfft(X, len(x))

def bandpass(x, lo, hi):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    X *= (1 / (1 + (lo / np.maximum(f, 1)) ** 4)) * (1 / (1 + (f / hi) ** 4)); return np.fft.irfft(X, len(x))

midi = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]  # Am F C G
roots = [45, 41, 48, 43]
CH = 5.0
pad = np.zeros(n); bass = np.zeros(n)
for ci in range(int(DUR / CH) + 1):
    t0 = ci * CH; e = env(t0 - 0.8, t0 + CH + 0.8, 1.2, 1.2)
    sl = (t > t0 - 1) & (t < t0 + CH + 1)
    for m in chords[ci % 4]:
        f = midi(m)
        for det in (-0.12, 0.0, 0.11):
            ff = f * 2 ** (det / 12)
            pad[sl] += e[sl] * (np.sin(2 * np.pi * ff * t[sl]) + 0.35 * np.sin(4 * np.pi * ff * t[sl]) + 0.12 * np.sin(6 * np.pi * ff * t[sl])) / 3
    bass[sl] += e[sl] * np.sin(2 * np.pi * midi(roots[ci % 4] - 12) * t[sl])
pad = lowpass(pad, 1800) * 0.06 * (1 + 0.15 * np.sin(2 * np.pi * 0.07 * t))
bass *= 0.11

# soft pulse at 96 bpm between 5 s and 92 s
beat = 60 / 96; pulse = np.zeros(n); duck = np.ones(n)
for bt in np.arange(5.0, 92.0, beat):
    i = int(bt * SR); L = int(0.35 * SR); tt = np.arange(L) / SR
    k = np.sin(2 * np.pi * (48 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9)
    pulse[i:i + L] += k[: n - i] * 0.22
    d = 1 - 0.35 * np.exp(-tt * 6); duck[i:i + L] = np.minimum(duck[i:i + L], d[: n - i])
# light hats on offbeats from stage 3 on
hat = np.zeros(n); noise = rng.standard_normal(n)
for bt in np.arange(18.0 + beat / 2, 92.0, beat):
    i = int(bt * SR); L = int(0.06 * SR); hat[i:i + L] += np.exp(-np.arange(L) / SR * 70) * 0.5
hat = bandpass(noise * hat, 6000, 14000) * 0.05

# whooshes on stage changes
stages = [5, 13, 18, 27, 31, 37, 41, 49, 56, 61, 65, 76, 79, 88, 92.5]
wh = np.zeros(n)
for s in stages:
    a, b = s - 0.7, s + 0.25; m = (t > a) & (t < b); x = (t[m] - a) / (b - a)
    wh[m] += noise[m] * np.sin(np.pi * x) ** 2 * x
wh = bandpass(wh, 400, 3500) * 0.18

# engine rumble under machines
eng = np.zeros(n)
for a, b, base in [(5.0, 11.6, 38), (10.3, 13.6, 46), (16.8, 28.2, 34), (47.5, 57.2, 40)]:
    m = (t > a - 0.5) & (t < b + 0.5)
    e = env(a, b, 0.8, 0.8)[m]
    f = base * (1 + 0.05 * np.sin(2 * np.pi * 0.7 * t[m]))
    ph = 2 * np.pi * np.cumsum(f) / SR
    eng[m] += e * (np.sign(np.sin(ph)) * 0.3 + np.sin(2 * ph) * 0.4)
eng = lowpass(eng + 0.15 * lowpass(noise, 200) * (np.abs(eng) > 0), 260) * 0.35

mix = (pad + bass) * duck + pulse + hat + wh + eng
mix *= env(0, DUR, 2.0, 3.0)
mix = np.tanh(mix * 1.4) / 1.4
mix /= np.max(np.abs(mix)) / 0.89
st = np.stack([mix, mix], 1)
st[:, 0] += 0.0; st[:, 1] = np.roll(mix, 240)  # tiny Haas width
pcm = (np.clip(st, -1, 1) * 32767).astype('<i2')
with wave.open(sys.argv[1], 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
print('ok', sys.argv[1])
