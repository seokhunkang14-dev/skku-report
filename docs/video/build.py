# 발표영상 합성: 장면별 mp4 (슬라이드 정지화면 / 시연 녹화) + 자막 → concat → 내레이션
import json, os, subprocess, sys
import numpy as np
import soundfile as sf
from PIL import Image, ImageDraw, ImageFont

sys.path.insert(0, os.path.dirname(__file__))
from script import SCRIPT

H = os.path.dirname(os.path.abspath(__file__))
DEMO = os.path.join(H, '..', 'demo')
B = os.path.join(H, 'build'); os.makedirs(B, exist_ok=True)
FPS, LEAD, TAIL = 30, 0.3, 0.45
ENC = ['-c:v', 'libx264', '-crf', '20', '-preset', 'veryfast', '-pix_fmt', 'yuv420p', '-r', str(FPS)]
timing = json.load(open(os.path.join(H, 'tts', 'timing.json')))
ONLY = [x for x in os.environ.get('ONLY', '').split(',') if x]

# 시연 장면: (제목, 설명, [(녹화파일, 시작, 끝), ...])
DEMOS = {
    'd_intro':     ('앱 실행 · 온보딩', 'MetaMask 연결 또는 테스트 계정으로 시작', [('rec1', 0.2, 8.4)]),
    'd_home':      ('① 홈', '오늘의 큐레이션 · 신작 · 인기 작품 · 아티스트', [('rec1', 8.4, 28.6)]),
    'd_discover':  ('② 탐색', '검색과 스타일별 필터', [('rec1', 28.6, 43.2)]),
    'd_detail':    ('③ 작품 상세', '에디션 수량 · 가격 확인 후 구매', [('rec1', 43.2, 54.9)]),
    'd_payment':   ('④ 원화 결제', '가스비는 서비스(민터)가 부담', [('rec1', 54.9, 65.9)]),
    'd_result':    ('⑤ NFT 발행 완료', 'Kaia Kairos 테스트넷 · 약 2초', [('rec1', 65.9, 82.2)]),
    'd_library':   ('⑥ 라이브러리', '보유 NFT 목록에 바로 반영', [('rec1', 82.2, 108.5)]),
    'd_playlist':  ('⑦ 배경화면 플레이리스트', '보유 작품 선택 · 전환 간격 설정', [('rec1', 108.5, 129.4)]),
    'd_wallpaper': ('⑧ 라이브 배경화면 적용', '앱을 닫아도 홈 화면에서 계속 감상',
                    [('rec2', 2.5, 6.5), ('rec2', 19.0, 22.5), ('rec2', 33.4, 35.6)]),
}

FONT_B = '/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc'
FONT_R = '/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc'
if not os.path.exists(FONT_B):
    FONT_B = '/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc'


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode:
        print(r.stderr[-3000:]); raise SystemExit(1)


def ts(t):
    h = int(t // 3600); m = int(t % 3600 // 60); s = t % 60
    return f'{h}:{m:02d}:{s:05.2f}'


def ass(scene, path, demo):
    # 시연 장면은 폰 화면 오른쪽에 자막을 둔다(가운데 아래는 폰과 겹치므로 오른쪽 영역 아래쪽)
    ml, mr = (760, 120) if demo else (180, 180)
    head = f"""[Script Info]
ScriptType: v4.00+
PlayResX: 1920
PlayResY: 1080
WrapStyle: 0

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: S,Noto Sans CJK KR,44,&H00FFFFFF,&H00FFFFFF,&H70000000,&H70000000,0,0,0,0,100,100,0,0,3,14,0,2,{ml},{mr},56,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""
    lines = [f"Dialogue: 0,{ts(s['start'] + LEAD)},{ts(s['end'] + LEAD)},S,,0,0,0,,{s['text']}" for s in timing[scene]['subs']]
    open(path, 'w').write(head + '\n'.join(lines) + '\n')


def demo_bg(scene, path):
    title, desc, _ = DEMOS[scene]
    im = Image.new('RGB', (1920, 1080), '#15141C')
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((300, 50, 720, 959), 30, fill='#2A2833')
    d.text((800, 200), 'LIVE DEMO · Android 에뮬레이터', font=ImageFont.truetype(FONT_B, 30), fill='#C6F432')
    d.text((800, 260), title, font=ImageFont.truetype(FONT_B, 76), fill='#F7F6F2')
    d.text((800, 380), desc, font=ImageFont.truetype(FONT_R, 38), fill='#B9B7C6')
    im.save(path)


def demo_clip(scene, dur, out):
    segs = DEMOS[scene][2]
    total = sum(b - a for _, a, b in segs)
    play = dur - 0.5  # 마지막 0.5초는 마지막 프레임 정지
    k = min(play / total, 1.0)  # 녹화가 길면 빠르게 재생
    inputs, parts = [], []
    for i, (rec, a, b) in enumerate(segs):
        inputs += ['-ss', str(a), '-t', str(b - a), '-i', os.path.join(DEMO, f'{rec}.mp4')]
        parts.append(f'[{i}:v]fps={FPS},scale=400:-2,setsar=1,setpts=(PTS-STARTPTS)*{k:.5f}[p{i}]')
    n = len(segs)
    bg = os.path.join(B, f'{scene}_bg.png'); demo_bg(scene, bg)
    inputs += ['-framerate', str(FPS), '-i', bg]
    sub = os.path.join(B, f'{scene}.ass'); ass(scene, sub, True)
    fc = ';'.join(parts) + ';' + ''.join(f'[p{i}]' for i in range(n)) + f'concat=n={n}:v=1:a=0,fps={FPS},tpad=stop_mode=clone:stop_duration=30[ph];' \
        f'[{n}:v]loop=-1:1,fps={FPS},trim=duration={dur}[bg];[bg][ph]overlay=310:60:shortest=0,trim=duration={dur},' \
        f"subtitles='{sub}',format=yuv420p[v]"
    run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', fc, '-map', '[v]', '-frames:v', str(round(dur * FPS)), *ENC, out])


def slide_clip(scene, dur, out):
    sub = os.path.join(B, f'{scene}.ass'); ass(scene, sub, False)
    run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', str(FPS), '-i', os.path.join(H, 'frames', f'{scene}.png'),
         '-vf', f"scale=1920:1080,format=yuv420p,loop=-1:1,trim=duration={dur},subtitles='{sub}',fade=in:st=0:d=0.25",
         '-frames:v', str(round(dur * FPS)), *ENC, out])


audio, sr = [], None
for scene, _ in SCRIPT:
    n = round((timing[scene]['duration'] + LEAD + TAIL) * FPS)
    dur = n / FPS
    wav, sr = sf.read(os.path.join(H, 'tts', f'{scene}.wav'), dtype='float32')
    a = np.zeros(round(dur * sr), dtype=np.float32)
    s0 = round(LEAD * sr); a[s0:s0 + len(wav)] = wav[:len(a) - s0]
    audio.append(a)
    out = os.path.join(B, f'{scene}.mp4')
    if ONLY and scene not in ONLY:
        continue
    tmp = os.path.join(B, f'{scene}.tmp.mp4')
    (demo_clip if scene in DEMOS else slide_clip)(scene, dur, tmp)
    os.replace(tmp, out)
    print(scene, round(dur, 2), flush=True)

sf.write(os.path.join(B, 'narration.wav'), np.concatenate(audio), sr)
open(os.path.join(B, 'list.txt'), 'w').write(''.join(f"file '{s}.mp4'\n" for s, _ in SCRIPT))
if os.environ.get('NOFINAL'):
    raise SystemExit
run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', os.path.join(B, 'list.txt'), '-c', 'copy', os.path.join(B, 'video.mp4')])
final = os.path.join(H, 'out', '발표영상_2016313880 강석훈.mp4')
tmp = os.path.join(B, 'final.tmp.mp4')
run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(B, 'video.mp4'), '-i', os.path.join(B, 'narration.wav'),
     '-map', '0:v', '-map', '1:a', '-af', 'loudnorm=I=-16:TP=-1.5:LRA=11', '-ar', '44100', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-shortest', tmp])
os.replace(tmp, final)
print('final', final)
