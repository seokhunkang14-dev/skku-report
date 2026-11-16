# 대본의 각 문장을 Supertonic 3 (한국어, 온디바이스 TTS) 로 합성하고 장면별 wav + 자막 타이밍을 만든다.
import json, os, sys
import numpy as np
import soundfile as sf
from supertonic import TTS

sys.path.insert(0, os.path.dirname(__file__))
from script import SCRIPT

VOICE = os.environ.get('VOICE', 'M1')
SPEED = float(os.environ.get('SPEED', '1.0'))
OUT = os.path.join(os.path.dirname(__file__), 'tts')
os.makedirs(OUT, exist_ok=True)

tts = TTS(auto_download=True)
style = tts.get_voice_style(voice_name=VOICE)
GAP = 0.35  # 문장 사이 쉼(초)
ONLY = [x for x in os.environ.get('ONLY','').split(',') if x]
tp = os.path.join(OUT, 'timing.json')
timing = json.load(open(tp)) if ONLY and os.path.exists(tp) else {}
for scene, lines in SCRIPT:
    if ONLY and scene not in ONLY:
        continue
    chunks, subs, t = [], [], 0.0
    sr = None
    for show, say in lines:
        wav, dur = tts.synthesize(say, voice_style=style, lang='ko', speed=SPEED, total_steps=16)
        wav = np.asarray(wav).reshape(-1).astype(np.float32)
        sr = tts.sample_rate if hasattr(tts, 'sample_rate') else 44100
        d = len(wav) / sr
        subs.append({'start': round(t, 2), 'end': round(t + d, 2), 'text': show})
        chunks.append(wav)
        chunks.append(np.zeros(int(GAP * sr), dtype=np.float32))
        t += d + GAP
    audio = np.concatenate(chunks)
    sf.write(os.path.join(OUT, f'{scene}.wav'), audio, sr)
    timing[scene] = {'duration': round(len(audio) / sr, 2), 'subs': subs}
    print(scene, timing[scene]['duration'])
timing = {k: timing[k] for k, _ in SCRIPT}
json.dump(timing, open(os.path.join(OUT, 'timing.json'), 'w'), ensure_ascii=False, indent=1)
print('total', round(sum(v['duration'] for v in timing.values()), 1))
