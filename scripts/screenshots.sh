#!/usr/bin/env bash
# 에뮬레이터에서 주요 화면 스크린샷 자동 촬영 (보고서용)
set -u
APK="$1"; OUT="$2"; mkdir -p "$OUT"
API="https://nftime.nftime-skku.workers.dev"
PKG=world.nftime.app

dismiss() {  # 에뮬레이터 ANR 팝업("isn't responding") 닫기
  for i in 1 2 3; do
    adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1; adb pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1
    if grep -q "t responding" /tmp/ui.xml; then tap_text "Wait"; sleep 1; else break; fi
  done
}
shot() { sleep "${2:-4}"; dismiss; adb exec-out screencap -p > "$OUT/$1.png"; echo "shot $1"; }
start() { adb shell am start -W -n "$PKG/$1" "${@:2}" >/dev/null; }
tap_text() {  # uiautomator 로 텍스트(부분일치) 찾아 탭
  adb shell uiautomator dump /sdcard/ui.xml >/dev/null 2>&1
  adb pull /sdcard/ui.xml /tmp/ui.xml >/dev/null 2>&1
  python3 - "$1" <<'PY'
import re,sys,subprocess
t=sys.argv[1]; x=open('/tmp/ui.xml',encoding='utf-8').read()
for m in re.finditer(r'<node [^>]*?(?:text|content-desc)="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"',x):
    if t.lower() in m.group(1).lower():
        a,b,c,d=map(int,m.groups()[1:]); subprocess.run(['adb','shell','input','tap',str((a+c)//2),str((b+d)//2)]); print('tap',m.group(1)); break
else: print('not found',t)
PY
}

adb shell settings put global hide_error_dialogs 1 || true
adb shell settings put global anr_show_background 0 || true
adb shell settings put system screen_off_timeout 1800000
adb shell svc power stayon true
adb install -r "$APK"
sleep 25; adb shell input keyevent KEYCODE_HOME; sleep 5

# 데모 계정 + 샘플 데이터 (실제 Kairos 민팅)
DEMO=$(curl -s -X POST "$API/api/auth/demo" -d '{}')
TOKEN=$(echo "$DEMO" | python3 -c 'import sys,json;print(json.load(sys.stdin)["token"])')
ADDR=$(echo "$DEMO" | python3 -c 'import sys,json;print(json.load(sys.stdin)["address"])')
H="Authorization: Bearer $TOKEN"
NFTS=()
for W in 1 4 7 10; do
  R=$(curl -s -X POST "$API/api/purchase" -H "$H" -H 'content-type: application/json' -d "{\"workId\":$W,\"method\":\"CARD\"}")
  echo "$R" | head -c 300; echo
  NFTS+=($(echo "$R" | python3 -c 'import sys,json;print(json.load(sys.stdin)["nftId"])'))
done
PL=$(curl -s -X POST "$API/api/playlists" -H "$H" -H 'content-type: application/json' -d '{"name":"Moods & Moments","intervalMin":1}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["id"])')
for N in "${NFTS[@]}"; do curl -s -X POST "$API/api/playlists/$PL/items" -H "$H" -H 'content-type: application/json' -d "{\"nftId\":$N}" >/dev/null; done
curl -s -X POST "$API/api/playlists" -H "$H" -H 'content-type: application/json' -d '{"name":"출근길 풍경"}' >/dev/null
for W in 2 6 12; do curl -s -X POST "$API/api/likes/$W" -H "$H" >/dev/null; done

start .OnboardingActivity;                                   shot 01_onboarding 8
adb shell am force-stop $PKG
start .OnboardingActivity --es demo_token "$TOKEN" --es demo_address "$ADDR"; shot 02_home 10
adb shell input swipe 540 1800 540 700 400;                  shot 03_home_scroll 4
start .MainActivity --es tab discover;                        shot 04_discover 8
start .ArtistActivity --ei artistId 1;                        shot 05_artist 7
start .WorkDetailActivity --ei workId 3;                      shot 06_detail 7
start .WorkDetailActivity --ei workId 3 --ez openPay true;    shot 07_payment 7
tap_text "결제하기";                                           shot 08_minting 2
                                                              shot 09_mint_result 12
start .WorkDetailActivity --ei workId 1;                      shot 10_detail_owned 7
start .MainActivity --es tab library;                         shot 11_library_playlists 7
tap_text "보유 NFT";                                           shot 12_library_owned 6
tap_text "좋아요";                                             shot 13_library_likes 5
start .PlaylistActivity --ei playlistId "$PL";                shot 14_playlist 8
start .PlaylistActivity --ei playlistId "$PL" --ez autoplay true; shot 15_wallpaper_preview 14
tap_text "Set wallpaper"; sleep 3; shot 16_set_dialog 2
tap_text "home screen and lock"; sleep 2
tap_text "home screen"; sleep 3
adb shell input keyevent KEYCODE_HOME;                        shot 17_homescreen 6
start .MainActivity --es tab my;                              shot 18_my 7
echo "done: $ADDR playlist=$PL"
# rerun 1793284843
