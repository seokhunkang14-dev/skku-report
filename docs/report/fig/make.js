const fs=require('fs'); const {seq}=require('./seq.js');
const C={app:'#e8f0ff',mm:'#ffeedd',cf:'#fff1d6',kaia:'#effad0',db:'#eef7ee',sys:'#f0eefc'};
// 그림 2: 지갑 연결 (App2App 딥링크)
fs.writeFileSync(__dirname+'/fig2_wallet.svg', seq({lanes:[
  {name:'NFTime 앱',color:C.app},{name:'API 서버 (Workers)',color:C.cf},{name:'MetaMask 앱',color:C.mm},{name:'D1 DB',color:C.db}],
  msgs:[
  {f:0,t:1,n:1,l:'POST /api/auth/request'},
  {f:1,t:3,n:2,l:'auth_requests 생성 (PENDING)'},
  {f:1,t:0,r:1,n:3,l:'session, metamask 딥링크'},
  {f:0,t:2,n:4,l:'딥링크 실행 (metamask.app.link/dapp/…/connect?s=)'},
  {f:2,t:1,n:5,l:'인앱 브라우저로 /connect 페이지 로드'},
  {f:2,t:2,n:6,l:'eth_requestAccounts · Kairos(1001) 전환'},
  {f:2,t:1,n:7,l:'POST /api/auth/nonce (주소)'},
  {f:1,t:2,r:1,n:8,l:'로그인 메시지 (nonce 포함)'},
  {f:2,t:2,n:9,l:'personal_sign (EIP-191, 가스비 없음)'},
  {f:2,t:1,n:10,l:'POST /api/auth/verify (서명)'},
  {f:1,t:1,n:11,l:'secp256k1 서명 복원 → 주소 일치 확인'},
  {f:1,t:3,n:12,l:'users · sessions 저장, DONE'},
  {f:2,t:0,n:13,l:'nftime://auth?s= 로 앱 복귀'},
  {f:0,t:1,n:14,l:'GET /api/auth/session/{s} (폴링)'},
  {f:1,t:0,r:1,n:15,l:'토큰 + 지갑 주소 → 로그인 완료'},
]}));
// 그림 3: 원화 결제 → 민팅
fs.writeFileSync(__dirname+'/fig3_mint.svg', seq({lanes:[
  {name:'NFTime 앱',color:C.app},{name:'API 서버 (Workers)',color:C.cf},{name:'D1 DB',color:C.db},{name:'Kaia Kairos',color:C.kaia}],
  msgs:[
  {f:0,t:0,n:1,l:'작품 상세 → 결제수단 선택'},
  {f:0,t:1,n:2,l:'POST /api/purchase {workId, method}'},
  {f:1,t:2,n:3,l:'토큰 검증 · 재고 확인 · 주문 PAID'},
  {note:'원화 결제 승인 (테스트 PG: 모의 승인)', lanes:[1,2]},
  {f:1,t:3,n:4,l:'nonce · gasPrice 조회 (JSON-RPC)'},
  {f:1,t:1,n:5,l:'mint(구매자, workId) 트랜잭션 서명 (EIP-155)'},
  {f:1,t:3,n:6,l:'eth_sendRawTransaction'},
  {f:3,t:3,n:7,l:'NFTimeArt.mint → Transfer 이벤트'},
  {f:3,t:1,r:1,n:8,l:'Receipt (약 1~3초)'},
  {f:1,t:2,n:9,l:'nfts 저장 (tokenId, txHash, MINTED)'},
  {f:1,t:0,r:1,n:10,l:'주문번호 · Token ID · Tx Hash'},
  {f:0,t:0,n:11,l:'발행 완료 화면 · Kaiascan 링크'},
]}));
// 그림 4: 라이브 배경화면
fs.writeFileSync(__dirname+'/fig4_wallpaper.svg', seq({lanes:[
  {name:'NFTime 앱',color:C.app},{name:'API 서버',color:C.cf},{name:'Internal Storage',color:C.db},{name:'WallpaperService',color:C.sys},{name:'Android 시스템',color:'#f2f2f5'}],
  width:1500, msgs:[
  {f:0,t:1,n:1,l:'GET /api/playlists/{id}'},
  {f:1,t:0,r:1,n:2,l:'보유 NFT 목록 · 변경 간격'},
  {f:0,t:1,n:3,l:'작품 이미지 다운로드 (/art/{id}.jpg)'},
  {f:0,t:2,n:4,l:'files/art/*.jpg 저장 + 경로/간격 기록'},
  {f:0,t:4,n:5,l:'ACTION_CHANGE_LIVE_WALLPAPER'},
  {f:4,t:3,n:6,l:'사용자가 "배경화면 설정" → Engine 생성'},
  {f:3,t:2,n:7,l:'이미지 로드 → Bitmap 디코딩'},
  {f:3,t:3,n:8,l:'(시각 / 간격) mod N → 현재 작품 선택'},
  {f:3,t:4,n:9,l:'Surface에 그리기 · 0.9초 크로스페이드'},
  {note:'앱이 종료되어도 시스템이 백그라운드에서 서비스 유지', lanes:[3,4]},
]}));
