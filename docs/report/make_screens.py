# 에뮬레이터 스크린샷 3장씩 묶어 보고서용 그림 생성
import sys
from PIL import Image, ImageDraw, ImageFont
S = '/home/claude/skku-report/docs/screenshots/'
F = ImageFont.truetype('/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc', 34, index=1)  # KR
groups = {
 1: [('01_onboarding', '(a)'), ('02_home', '(b)'), ('03_home_scroll', '(c)')],
 2: [('04_discover', '(a)'), ('05_artist', '(b)'), ('06_detail', '(c)')],
 3: [('07_payment', '(a)'), ('09_mint_result', '(b)'), ('12_library_owned', '(c)')],
 4: [('10_detail_owned', '(a)'), ('11_library_playlists', '(b)'), ('13_library_likes', '(c)')],
 5: [('14_playlist', '(a)'), ('15_wallpaper_preview', '(b)'), ('17_homescreen', '(c)')],
 6: [('18_my', '(a)'), ('../report/fig/connect_page', '(b)')],
}
PW, PH, GAP, R = 540, 1200, 60, 36
for g, items in groups.items():
    W = PW * len(items) + GAP * (len(items) + 1); H = PH + 120
    c = Image.new('RGB', (W, H), 'white'); d = ImageDraw.Draw(c)
    for i, (name, lab) in enumerate(items):
        im = Image.open(S + name + '.png').convert('RGB').resize((PW, PH), Image.LANCZOS)
        m = Image.new('L', (PW, PH), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, PW - 1, PH - 1), R, fill=255)
        x = GAP + i * (PW + GAP)
        c.paste(im, (x, 20), m)
        d.rounded_rectangle((x - 2, 18, x + PW + 1, 20 + PH + 1), R, outline='#9a9aa6', width=3)
        tw = d.textlength(lab, font=F); d.text((x + (PW - tw) / 2, PH + 45), lab, fill='#111', font=F)
    c.save(f'fig/screens_{g}.png'); print('screens', g)
