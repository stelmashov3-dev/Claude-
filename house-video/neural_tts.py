# Neural Russian TTS (Piper voices via sherpa-onnx): python3 -I neural_tts.py <voice_dir> <out.wav> <speed> "text" [noise_scale] [noise_w]
import sys, wave
import numpy as np
import sherpa_onnx

vdir, out, speed, text = sys.argv[1], sys.argv[2], float(sys.argv[3]), sys.argv[4]
name = vdir.rstrip('/').split('/')[-1].replace('vits-piper-', '')
cfg = sherpa_onnx.OfflineTtsConfig(model=sherpa_onnx.OfflineTtsModelConfig(vits=sherpa_onnx.OfflineTtsVitsModelConfig(
    model=f'{vdir}/{name}.onnx', tokens=f'{vdir}/tokens.txt', data_dir=f'{vdir}/espeak-ng-data', noise_scale=float(sys.argv[5]) if len(sys.argv) > 5 else 0.6, noise_scale_w=float(sys.argv[6]) if len(sys.argv) > 6 else 0.8, length_scale=1.0 / speed),
    num_threads=4))
tts = sherpa_onnx.OfflineTts(cfg)
a = tts.generate(text, sid=0, speed=speed)
pcm = (np.clip(np.array(a.samples), -1, 1) * 32767).astype('<i2')
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(a.sample_rate); w.writeframes(pcm.tobytes())
