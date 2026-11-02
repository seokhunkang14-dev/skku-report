# 학과 지정 양식(교내발표용 PPT, A1 1장)에 NFTime 내용을 채운다.
import copy
from lxml import etree
from pptx import Presentation
from pptx.util import Cm, Pt

A = '{http://schemas.openxmlformats.org/drawingml/2006/main}'
P = '{http://schemas.openxmlformats.org/presentationml/2006/main}'
SRC, OUT = 'template.pptx', 'out.pptx'
prs = Presentation(SRC)
s = prs.slides[0]


def g(path):
    sh = s.shapes[path[0]]
    for i in path[1:]:
        sh = sh.shapes[i]
    return sh


def run_rprs(p_el):
    return [r.find(A + 'rPr') for r in p_el.findall(A + 'r')]


def make_run(text, rpr_tpl, sz=None, b=None):
    r = etree.SubElement(etree.Element(A + 'dummy'), A + 'r')
    if rpr_tpl is not None:
        rpr = copy.deepcopy(rpr_tpl)
        for k in ('err', 'dirty'):
            rpr.attrib.pop(k, None)
        if sz is not None:
            rpr.set('sz', str(int(sz * 100)))
        if b is not None:
            rpr.set('b', '1' if b else '0')
        r.append(rpr)
    t = etree.SubElement(r, A + 't')
    t.text = text
    return r


def rebuild_para(p_el, segments):
    """segments: list of ('br',) or (text, rpr_tpl, sz, bold)"""
    end = p_el.find(A + 'endParaRPr')
    br_tpl = p_el.find(A + 'br')
    for c in list(p_el):
        if c.tag != A + 'pPr':
            p_el.remove(c)
    for seg in segments:
        if seg[0] == 'br':
            br = copy.deepcopy(br_tpl) if br_tpl is not None else etree.Element(A + 'br')
            p_el.append(br)
        else:
            text, tpl, sz, b = seg
            p_el.append(make_run(text, tpl, sz, b))
    if end is not None:
        p_el.append(end)


def set_lines(shape, lines, tpl_index=0, keep_pPr=True):
    """lines: list of list of (text, bold) segments. 첫 단락의 pPr/rPr 를 템플릿으로 재사용."""
    txBody = shape.text_frame._txBody
    paras = txBody.findall(A + 'p')
    tpl_p = paras[tpl_index]
    rprs = [x for x in run_rprs(tpl_p) if x is not None]
    rpr = rprs[-1] if rprs else None
    for p_el in paras:
        txBody.remove(p_el)
    for segs in lines:
        p_el = copy.deepcopy(tpl_p)
        if not keep_pPr and p_el.find(A + 'pPr') is not None:
            p_el.remove(p_el.find(A + 'pPr'))
        rebuild_para(p_el, [(t, rpr, None, bold) for t, bold in segs] if segs else [])
        txBody.append(p_el)


# ── 상단 제목 영역 ──
title = g([0, 1]).text_frame._txBody.findall(A + 'p')
big = next(r for r in run_rprs(title[0]) if r is not None and r.get('sz') == '4347')
small = next(r for r in run_rprs(title[0]) if r is not None and r.get('sz') == '3556')
rebuild_para(title[0], [
    ('Kakao Klip을 이용한 NFT 구매 및 배경화면 설정 모바일 애플리케이션', big, 40, True), ('br',),
    ('강석훈', small, None, False), ('br',),
    ('성균관대학교 소프트웨어융합대학', small, 32, False),
])
rebuild_para(title[1], [
    ('br',),
    ('A Mobile Application for NFT Purchase and Wallpaper Setting Using Kakao Klip', big, 34, True), ('br',),
    ('Seokhun Kang', small, None, False),
])
rebuild_para(title[2], [('Sungkyunkwan University', small, None, False)])

for path, label, value in [([0, 2, 0, 1], '지도 교수', '차수영 교수님'), ([0, 2, 1, 1], '연구실명', '소프트웨어 분석 연구실 (SAL)')]:
    p0 = g(path).text_frame._txBody.findall(A + 'p')[0]
    rp = [x for x in run_rprs(p0) if x is not None][0]
    rebuild_para(p0, [(f'{label}:  {value}', rp, None, None)])

# ── 섹션 제목 ──
for path, text in [([1, 0, 0], '   개 요'), ([2, 0, 0], '   주요 기능'), ([3, 0, 0], '   시스템 구성'), ([5, 0, 0], '   결 과'), ([4, 0, 0], '   결 론')]:
    p0 = g(path).text_frame._txBody.findall(A + 'p')[0]
    rp = [x for x in run_rprs(p0) if x is not None][-1]
    rebuild_para(p0, [(text, rp, None, True)])

# ── 본문 ──
set_lines(g([1, 1]), [
    [('NFT 아트 플랫폼의 세 가지 진입장벽인 ', False), ('① 디지털 지갑 생성의 어려움, ② 암호화폐를 이용한 구매의 어려움, ③ 구매 후 유틸리티 부재', True),
     ('를 해결하는 Android 앱 NFTime을 개발하였다.', False)],
    [('사용자는 지갑 앱(MetaMask)과 연결해 서명 한 번으로 로그인하고, 원화로 결제하면 서버가 Kaia 테스트넷에서 구매자의 지갑으로 NFT를 직접 발행한다. 구매한 작품은 라이브 배경화면으로 매일 감상할 수 있다.', False)],
])
set_lines(g([2, 1]), [
    [(' 지갑 앱 연동 로그인', True), (' – MetaMask 딥링크(App2App) + EIP-191 메시지 서명, 가스비 없음', False)],
    [(' 원화 결제 → 즉시 발행', True), (' – 결제 확인 후 서버 민터가 ERC-721 NFT를 구매자 지갑으로 민팅 (가스비 서비스 부담)', False)],
    [(' 라이브 배경화면', True), (' – 보유 작품 플레이리스트를 설정 간격마다 크로스페이드로 전환, 앱 종료 후에도 유지', False)],
])
set_lines(g([5, 1]), [
    [('결제 → 온체인 발행 평균 ', False), ('2.0초', True), (' (6회 측정, 최대 2.4초)', False)],
    [('발행 1건 ', False), ('63,683 gas ≈ 0.00175 KAIA', True), (' → faucet 1회(50 KAIA)로 약 2.8만 건 발행 가능', False)],
    [('Kaiascan에서 발행 내역 검증, Android 에뮬레이터로 18개 화면 자동 검증', False)],
])
set_lines(g([4, 1]), [
    [('지갑·코인·가스비 같은 기술 개념을 화면에서 감추고, 익숙한 원화 결제와 배경화면이라는 일상 경험으로 NFT 아트를 소유·감상하게 하였다.', False)],
    [('제안 당시의 Klip 대신 MetaMask·Kaia로 전환했지만 App2App 구조를 유지해 설계를 지켰다. 향후 실제 PG 연동, 임베디드 지갑, 작가–팬 커뮤니티로 확장할 계획이다.', False)],
])

# ── 시스템 구성 표 ──
tbl = s.shapes[7].table
rows = [
    ('Android 앱', 'Java · XML, OkHttp, WallpaperService'),
    ('API 서버', 'Cloudflare Workers + D1 (서버리스)'),
    ('블록체인', 'Kaia Kairos, ERC-721(KIP-17), Solidity'),
    ('핵심 흐름', '① 딥링크로 MetaMask 연결 → EIP-191 서명 로그인\n② 원화 결제 승인 → 민터가 mint 트랜잭션 서명·전송\n③ Transfer 이벤트로 Token ID 확인 → 보유 목록 반영\n④ 작품을 내부 저장소에 저장 → 배경화면 서비스가 간격마다 전환'),
]
for ri, (k, v) in enumerate(rows):
    for ci, text in enumerate((k, v)):
        cell = tbl.cell(ri, ci)
        txBody = cell.text_frame._txBody
        paras = txBody.findall(A + 'p')
        tpl_p = paras[0]
        rp = [x for x in run_rprs(tpl_p) if x is not None][0]
        for p_el in paras:
            txBody.remove(p_el)
        for line in text.split('\n'):
            p_el = copy.deepcopy(tpl_p)
            rebuild_para(p_el, [(line, rp, 26 if ci == 1 else None, True if ci == 0 else False)])
            if ri == 3 and ci == 1:
                ppr = p_el.find(A + 'pPr')
                if ppr is None:
                    ppr = etree.Element(A + 'pPr'); p_el.insert(0, ppr)
                ppr.set('algn', 'l')
            txBody.append(p_el)


# ── 그림 교체 (같은 z-순서에 새 그림 삽입) ──
def replace_picture(idx, img, left, top, width):
    old = s.shapes[idx]._element
    pic = s.shapes.add_picture(img, Cm(left), Cm(top), width=Cm(width))
    old.addprevious(pic._element)
    old.getparent().remove(old)


replace_picture(8, 'shots_c.png', 30.8, 50.0, 28.0)   # 결과: 실행 화면
replace_picture(6, '../report/fig/fig1_arch.png', 1.8, 41.2, 27.0)  # 시스템 구성도

prs.save(OUT)
print('saved', OUT)
