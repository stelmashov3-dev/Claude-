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
    subprocess.run(['RHVoice-test', '-p', ep.get('voice', 'aleksandr-hq'), '-r', str(ep.get('rate', 100)), '-o', raw], input=text.encode(), check=True)
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
def env_local(L):
    x = np.arange(L) / L; return np.clip(x * 20, 0, 1) * np.clip((1 - x) * 20, 0, 1)
def filt(x, lo=None, hi=None):
    X = np.fft.rfft(x); f = np.fft.rfftfreq(len(x), 1 / SR)
    if hi: X *= 1 / (1 + (f / hi) ** 4)
    if lo: X *= 1 / (1 + (lo / np.maximum(f, 1)) ** 4)
    return np.fft.irfft(X, len(x))

# ---- music bed: warm pads plus a light groove (112 bpm) from the first stage on ----
midi = lambda m: 440 * 2 ** ((m - 69) / 12)
chords = [[57, 60, 64, 69], [53, 57, 60, 65], [48, 55, 60, 64], [55, 59, 62, 67]]; roots = [45, 41, 48, 43]
BPM = 112; beat = 60 / BPM; bar = beat * 4; CH = bar * 2
groove0 = shots[0]['dur'] - 0.3 if len(shots) > 1 else 0
pad = np.zeros(n); bass = np.zeros(n); pluck = np.zeros(n)
for ci in range(int(total / CH) + 1):
    t0 = ci * CH; sl = (tt > t0 - 1) & (tt < t0 + CH + 1); e = env(t0 - 0.6, t0 + CH + 0.6, 0.8, 0.8)[sl]
    for m in chords[ci % 4]:
        for det in (-0.1, 0.0, 0.1):
            f = midi(m) * 2 ** (det / 12); x = tt[sl]
            pad[sl] += e * (np.sin(2 * np.pi * f * x) + 0.3 * np.sin(4 * np.pi * f * x)) / 3
    # pulsing eighth-note bass and a soft sixteenth arpeggio
    for k8 in range(int(CH / (beat / 2))):
        st = t0 + k8 * beat / 2
        if st < groove0: continue
        i = int(st * SR); L = int(beat / 2 * SR * 0.9); x = np.arange(L) / SR
        f = midi(roots[ci % 4] - 12); bass[i:i + L] += (np.sin(2 * np.pi * f * x) + 0.25 * np.sin(4 * np.pi * f * x))[: max(0, n - i)] * np.exp(-x * 5)[: max(0, n - i)]
    for k16 in range(int(CH / (beat / 4))):
        st = t0 + k16 * beat / 4
        if st < groove0: continue
        m = chords[ci % 4][[0, 2, 1, 3, 2, 1][k16 % 6]] + 12; i = int(st * SR); L = int(0.25 * SR); x = np.arange(L) / SR
        pluck[i:i + L] += (np.sin(2 * np.pi * midi(m) * x) * np.exp(-x * 18))[: max(0, n - i)]
pad = filt(pad, hi=2200) * 0.045; bass = filt(bass, hi=400) * 0.11; pluck = filt(pluck, hi=5000) * 0.035
noise = rng.standard_normal(n)
drums = np.zeros(n)
for b in np.arange(groove0, total - 2.5, beat):
    i = int(b * SR); L = int(0.3 * SR); x = np.arange(L) / SR
    drums[i:i + L] += (np.sin(2 * np.pi * (45 + 70 * np.exp(-x * 35)) * x) * np.exp(-x * 10))[: n - i] * 0.3
    bi = round((b - groove0) / beat)
    if bi % 2 == 1:  # clap on 2 and 4
        L2 = int(0.18 * SR); drums[i:i + L2] += (filt(noise[i:i + L2], 900, 4000) * np.exp(-np.arange(L2) / SR * 22))[: n - i] * 0.25
    for h in (0, 0.5):  # hats on eighths
        j = int((b + h * beat) * SR); L3 = int(0.04 * SR)
        if j + L3 < n: drums[j:j + L3] += noise[j:j + L3] * np.exp(-np.arange(L3) / SR * 90) * (0.05 if h else 0.03)
drums = filt(drums, hi=12000)
wh = np.zeros(n)
for sh in shots[1:]:  # riser into every cut
    a0, b0 = sh['start'] - 1.0, sh['start'] + 0.15; m = (tt > a0) & (tt < b0); x = (tt[m] - a0) / (b0 - a0)
    wh[m] += noise[m] * x ** 2 * np.sin(np.pi * np.clip(x, 0, 1)) ** 0.3
wh = filt(wh, 500, 6000) * 0.1

# ---- spot effects listed per shot: reverse beeps, hammer blows, shovel scrapes ----
sfx = np.zeros(n)
for s, sh in zip(ep['shots'], shots):
    a0, a1 = sh['start'], sh['start'] + sh['dur']
    for fx in s.get('sfx', []):
        if fx['k'] == 'beep':
            x0, x1 = (to_ep(fx['T'][0]) or a0), (to_ep(fx['T'][1]) or a1)
            for b in np.arange(x0, x1, 0.9):
                i = int(b * SR); L = int(0.45 * SR); x = np.arange(L) / SR
                sfx[i:i + L] += (np.sign(np.sin(2 * np.pi * 1150 * x)) * 0.3 * env_local(L))[: n - i] * 0.12
        else:
            rate, ph = fx['rate'], fx['ph']
            for kk in range(int(a0 * rate) - 1, int(a1 * rate) + 2):
                b = (kk + ph) / rate
                if not (a0 + 0.1 < b < a1 - 0.1): continue
                i = int(b * SR)
                if fx['k'] == 'hammer':
                    L = int(0.25 * SR); x = np.arange(L) / SR
                    hit = np.sin(2 * np.pi * 95 * x) * np.exp(-x * 30) + filt(noise[i:i + L], 1500, 7000) * np.exp(-x * 60) * 0.6
                    sfx[i:i + L] += hit[: n - i] * 0.35
                else:
                    L = int(0.35 * SR); x = np.arange(L) / SR
                    sfx[i:i + L] += (filt(noise[i:i + L], 300, 2500) * np.sin(np.pi * x / 0.35) ** 2)[: n - i] * 0.12

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
bed = (pad + bass + pluck + drums + wh) * (1 - 0.6 * venv) + (eng + sfx) * (1 - 0.3 * venv)
mix = bed + voice * 0.95
mix *= env(0, total, 1.0, 2.5)
mix = np.tanh(mix * 1.2) / 1.2; mix /= np.max(np.abs(mix)) / 0.9
st = np.stack([mix, np.roll(mix, 200)], 1)
with wave.open(base + '.wav', 'wb') as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes())
print('total', total, 's;', len(cues), 'cues')
