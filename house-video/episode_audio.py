# Builds an episode's voice-over (RHVoice), its timing (shot starts, subtitle cues) and the final soundtrack.
# python3 -I episode_audio.py episodes/ep1.json   -> episodes/ep1.timing.json, episodes/ep1.wav
import json, os, subprocess, sys, tempfile, wave
import numpy as np

SR = 48000
src = sys.argv[1]; ep = json.load(open(src)); base = src[:-5]
tmp = tempfile.mkdtemp()
rng = np.random.default_rng(7)

def tts(text, i):
    raw, out = f'{tmp}/r{i}.wav', f'{tmp}/s{i}.wav'
    subprocess.run(['RHVoice-test', '-p', ep.get('voice', 'aleksandr-hq'), '-r', '100', '-o', raw], input=text.encode(), check=True)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', raw, '-ar', str(SR), '-ac', '1', '-af', 'silenceremove=start_periods=1:start_threshold=-50dB,areverse,silenceremove=start_periods=1:start_threshold=-50dB,areverse', out], check=True)
    with wave.open(out) as w: return np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(np.float32) / 32768

def lines(text, maxc=64):
    out, cur = [], ''
    for w in text.split():
        if cur and len(cur) + 1 + len(w) > maxc: out.append(cur); cur = w
        else: cur = (cur + ' ' + w).strip()
    return out + [cur]

# ---- voice and timing ----
clips, shots, cues, t, k = [], [], [], 0.0, 0
for s in ep['shots']:
    lead = 0.9 if 'hero' in s else 0.45
    start = t; t += lead
    for sent in s['vo']:
        a = tts(sent, k); k += 1; d = len(a) / SR
        clips.append((t, a))
        ls = lines(sent); tot = sum(len(x) for x in ls); c = t
        for x in ls: dd = d * len(x) / tot; cues.append({'t0': round(c, 3), 't1': round(c + dd, 3), 'text': x}); c += dd
        t += d + 0.35
    t += 0.5 if 'hero' not in s else 1.2
    t = max(t, start + (4.5 if 'hero' in s else 3.0))
    shots.append({'id': s['id'], 'start': round(start, 3), 'dur': round(t - start, 3)})
total = round(t + 0.5, 3); shots[-1]['dur'] = round(total - shots[-1]['start'], 3)
json.dump({'total': total, 'shots': shots, 'cues': cues}, open(base + '.timing.json', 'w'), ensure_ascii=False, indent=1)

n = int(SR * total); tt = np.arange(n) / SR
voice = np.zeros(n, np.float32)
for st, a in clips: i = int(st * SR); voice[i:i + len(a)] += a[: n - i]
voice /= max(1e-6, np.max(np.abs(voice))) / 0.9

# master construction time -> episode time, for machine sounds
def to_ep(T):
    for s, sh in zip(ep['shots'], shots):
        T0, T1 = s['T']
        if T1 > T0 and T0 <= T <= T1: return sh['start'] + (T - T0) / (T1 - T0) * sh['dur']
    return None
def ep_intervals(a, b):
    out = []
    for s, sh in zip(ep['shots'], shots):
        T0, T1 = s['T']
        if T1 <= T0: continue
        lo, hi = max(a, T0), min(b, T1)
        if lo < hi: out.append((to_ep(lo), to_ep(hi)))
    return out

def env(t0, t1, a=0.5, r=0.5):
    e = np.clip((tt - t0) / a, 0, 1) * np.clip((t1 - tt) / r, 0, 1); return e * e * (3 - 2 * e)
def filt(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X *= 1 / (1 + (f / hi) ** 4)
    if lo: X *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))

# ---- music bed ----
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]; roots = [45, 41, 48, 43]; CH = 5.0
pad = np.zeros(n); bass = np.zeros(n)
for ci in range(int(total / CH) + 1):
    t0 = ci * CH; sl = (tt > t0 - 1) & (tt < t0 + CH + 1); e = env(t0 - 0.8, t0 + CH + 0.8, 1.2, 1.2)[sl]
    for m in chords[ci % 4]:
        for det in (-0.12, 0.0, 0.11):
            f = midi(m) * 2 ** (det / 12); x = tt[sl]
            pad[sl] += e * (np.sin(2 * np.pi * f * x) + 0.35 * np.sin(4 * np.pi * f * x) + 0.12 * np.sin(6 * np.pi * f * x)) / 3
    bass[sl] += e * np.sin(2 * np.pi * midi(roots[ci % 4] - 12) * tt[sl])
pad = filt(pad, hi=1800) * 0.06; bass *= 0.1
beat = 60 / 96; pulse = np.zeros(n)
for b in np.arange(shots[0]['dur'], total - 3, beat):
    i = int(b * SR); L = int(0.35 * SR); x = np.arange(L) / SR
    pulse[i:i + L] += (np.sin(2 * np.pi * (48 + 60 * np.exp(-x * 30)) * x) * np.exp(-x * 9))[: n - i] * 0.16
noise = rng.standard_normal(n)
wh = np.zeros(n)
for sh in shots[1:]:
    a, b = sh['start'] - 0.7, sh['start'] + 0.25; m = (tt > a) & (tt < b); x = (tt[m] - a) / (b - a)
    wh[m] += noise[m] * np.sin(np.pi * x) ** 2 * x
wh = filt(wh, 400, 3500) * 0.12

# ---- machines ----
eng = np.zeros(n)
for a, b, f0, kind in [(5.0, 11.6, 38, 'truck'), (10.3, 13.6, 46, 'truck'), (16.8, 28.2, 34, 'truck'), (47.5, 57.2, 40, 'truck'), (27.6, 31.0, 70, 'plate')]:
    for x0, x1 in ep_intervals(a, b):
        m = (tt > x0 - 0.5) & (tt < x1 + 0.5); e = env(x0, x1, 0.6, 0.6)[m]
        ph = 2 * np.pi * np.cumsum(f0 * (1 + 0.05 * np.sin(2 * np.pi * 0.7 * tt[m]))) / SR
        sig = np.sign(np.sin(ph)) * 0.3 + np.sin(2 * ph) * 0.4
        if kind == 'plate': sig = sig * (0.6 + 0.4 * np.sign(np.sin(ph * 0.5)))
        eng[m] += e * sig
eng = filt(eng + 0.1 * filt(noise, hi=200), hi=320) * 0.3

# ---- mix: duck everything under the voice ----
venv = filt(np.abs(voice), hi=4); venv = np.clip(venv / (np.max(venv) + 1e-6) * 4, 0, 1)
bed = (pad + bass + pulse + wh + eng) * (1 - 0.55 * venv)
mix = bed + voice * 0.95
mix *= env(0, total, 1.0, 2.5)
mix = np.tanh(mix * 1.2) / 1.2; mix /= np.max(np.abs(mix)) / 0.9
st = np.stack([mix, np.roll(mix, 200)], 1)
with wave.open(base + '.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print('total', total, 's;', len(cues), 'cues')
