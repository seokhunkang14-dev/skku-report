#!/usr/bin/env bash
# 발표영상용 시연 화면 녹화 (에뮬레이터 screenrecord) + 구간 마커 기록
set -u
APK="$1"; OUT="$2"; mkdir -p "$OUT"
PKG=world.nftime.app
MARKS="$OUT/marks.txt"; : > "$MARKS"
T0=0

dump() { adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1; }
tap_match() {  # $1=regex attr(text|content-desc|resource-id) $2=needle
  dump
  python3 - "$1" "$2" <<'PY'
import re,sys,subprocess
attr,t=sys.argv[1],sys.argv[2]; x=open('/tmp/ui.xml',encoding='utf-8').read()
for m in re.finditer(r'<node [^>]*?(?:%s)="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"'%attr,x):
    if t.lower() in m.group(1).lower():
        a,b,c,d=map(int,m.groups()[1:]); subprocess.run(['adb','shell','input','tap',str((a+c)//2),str((b+d)//2)]); print('tap',m.group(1)); break
else: print('not found',t)
PY
}
tap_text() { tap_match 'text|content-desc' "$1"; }
tap_id() { tap_match 'resource-id' "$1"; }
dismiss() { dump; if grep -q "t responding" /tmp/ui.xml; then tap_text "Wait"; sleep 1; fi; }
mark() { echo "$1 $(python3 -c "import time;print(round(time.time()-$T0,1))")" | tee -a "$MARKS"; }
rec_start() {  # $1 name
  adb shell "screenrecord --size 720x1600 --bit-rate 6000000 --time-limit 175 /sdcard/$1.mp4" &
  REC_PID=$!; sleep 1; T0=$(python3 -c 'import time;print(time.time())'); echo "== $1" >> "$MARKS"
}
rec_stop() { adb shell pkill -INT screenrecord || true; wait $REC_PID 2>/dev/null; sleep 2; adb pull /sdcard/$1.mp4 "$OUT/$1.mp4"; }

adb shell settings put global hide_error_dialogs 1 || true
adb shell settings put global anr_show_background 0 || true
adb shell settings put system screen_off_timeout 1800000
adb shell svc power stayon true
adb install -r "$APK"
sleep 25; adb shell input keyevent KEYCODE_HOME; sleep 5; dismiss
# 앱 첫 실행(이미지 캐시 워밍업) 후 종료
adb shell am start -n "$PKG/.OnboardingActivity" >/dev/null; sleep 10; adb shell am force-stop $PKG; sleep 2; dismiss

# ---------- 녹화 1: 둘러보기 → 홈 → 탐색 → 상세 → 결제 → 발행 → 라이브러리 → 플레이리스트 ----------
rec_start rec1
adb shell am start -n "$PKG/.OnboardingActivity" >/dev/null; mark onboarding; sleep 5
tap_text "둘러보기"; mark home; sleep 7
adb shell input swipe 540 1900 540 700 600; sleep 3
adb shell input swipe 540 1900 540 700 600; sleep 3
adb shell input swipe 540 700 540 2000 600; adb shell input swipe 540 700 540 2000 600; sleep 1
tap_text "탐색"; mark discover; sleep 5
tap_text "기하학"; sleep 3
tap_text "전체"; sleep 2
adb shell am start -n "$PKG/.WorkDetailActivity" --ei workId 3 >/dev/null; mark detail; sleep 5
adb shell input swipe 540 1800 540 900 600; sleep 2; adb shell input swipe 540 900 540 1800 600; sleep 1
tap_text "작품 구매하기"; mark payment; sleep 4
tap_text "카카오페이"; sleep 2
tap_text "원 결제하기"; mark minting; sleep 10
mark result; sleep 4
tap_text "라이브러리로 가기"; mark library; sleep 4
tap_text "보유 NFT"; mark owned; sleep 4
tap_text "플레이리스트"; sleep 2
tap_text "새로운 리스트 만들기"; sleep 2
adb shell input text "My%sGallery"; sleep 1
tap_text "만들기"; mark playlist; sleep 4
tap_text "작품 추가"; sleep 3
tap_text "(#"; sleep 4
tap_text "1분"; sleep 3
mark rec1_end
rec_stop rec1

# ---------- 녹화 2: 라이브 배경화면 적용 → 홈 화면 ----------
rec_start rec2
mark playlist2; sleep 2
tap_id "btnPlay"; mark preview; sleep 10
tap_text "Set wallpaper"; sleep 3
tap_text "Home screen and lock"; sleep 1; tap_text "Home screen"; sleep 4
adb shell input keyevent KEYCODE_HOME; mark homescreen; sleep 8
mark rec2_end
rec_stop rec2
ls -la "$OUT"; cat "$MARKS"
