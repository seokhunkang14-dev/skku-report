// /connect 페이지를 모바일 뷰포트로 렌더링 (보고서 그림용)
const { chromium } = require('playwright');
(async () => {
  const { connectPage } = await import('/home/claude/skku-report/server/src/pages.js');
  const html = connectPage('https://nftime.nftime-skku.workers.dev');
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 390, height: 866 }, deviceScaleFactor: 2.77 });
  // MetaMask 인앱 브라우저 환경을 흉내: 연결 완료 직전 단계 표시
  await p.setContent(html.replace('<script>', '<script>window.ethereum={request:async()=>{}};</script><script>'));
  await p.evaluate(() => { ['s1','s2'].forEach(i=>document.getElementById(i).classList.add('done')); document.getElementById('addr').textContent='0xaa3f2d6fd0b2c62e5c41f110cdac5f8a1aac0143'; document.getElementById('go').disabled=true; });
  await p.screenshot({ path: __dirname + '/connect_page.png' });
  await b.close();
})();
