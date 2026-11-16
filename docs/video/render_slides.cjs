// 발표 슬라이드(HTML)를 1920x1080 PNG로 렌더링 (영상용)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const R = '/home/claude/skku-report/docs';
const BLOB = {
  a37f06f7c3b5bb0f5f38a30889ee5ec5: `${R}/report/fig/fig1_arch.png`,
  '547dda7484186b95be71385aa58619a5': `${R}/report/fig/fig2_wallet.png`,
  '56b3437aee0930f3d33461b7f789ec8e': `${R}/report/fig/fig3_mint.png`,
  '25af1d15926db228bb544c01cf070e67': `${R}/report/fig/fig4_wallpaper.png`,
  '3a32add56e6dbb7b2295a38f9f377b20': `${R}/report/fig/kaiascan_tx.png`,
  '48992f6dcc717d07903ab6a93d31b546': `${R}/report/fig/connect_page.png`,
  '8d4db83f14348104b4e3b96ba321c4bf': `${R}/screenshots/01_onboarding.png`,
  '3c585a15bf3b4e6bc15eccfeb61c2cb8': `${R}/screenshots/02_home.png`,
  '0551c34901a6831e50c45adeb97e0607': `${R}/screenshots/04_discover.png`,
  '61bd26b0eee17986d3f5ccb3675bbd5e': `${R}/screenshots/06_detail.png`,
  d51ce44457cdf3e8be2df3b55bd4e0bd: `${R}/screenshots/07_payment.png`,
  '2e073cb0fbc79c71fe1dc9b3d7a38bed': `${R}/screenshots/09_mint_result.png`,
  '2d66fc754e9d38a98de8ab6b80cd1617': `${R}/screenshots/12_library_owned.png`,
  '1ff92feeab8c7883f622d6b1ca18a328': `${R}/screenshots/14_playlist.png`,
  e9c0db01fe86bf727403e83a6504010b: `${R}/screenshots/17_homescreen.png`,
};
const ICON = {
  Key: '<svg viewBox="0 0 24 24" width="64" height="64"><circle cx="8" cy="12" r="5" fill="none" stroke="#C6F432" stroke-width="2.5"/><path d="M13 12h9M19 12v4M16 12v3" stroke="#C6F432" stroke-width="2.5" fill="none"/></svg>',
  Lightning: '<svg viewBox="0 0 24 24" width="64" height="64"><path d="M13 2L4 14h7l-1 8 9-12h-7z" fill="#C6F432"/></svg>',
  Play: '<svg viewBox="0 0 24 24" width="64" height="64"><path d="M7 4v16l13-8z" fill="#C6F432"/></svg>',
};
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
  const names = process.argv.slice(2);
  for (const n of names) {
    let html = fs.readFileSync(`slides/${n}.html`, 'utf8');
    html = html.replace(/\/_blob\/([0-9a-f]{32})/g, (m, id) => 'file://' + BLOB[id]);
    html = html.replace(/<x-icon name="(\w+)"[^>]*><\/x-icon>/g, (m, k) => ICON[k] || '');
    html = html.replace(/<aside>[\s\S]*?<\/aside>/, '');
    const page = `<!doctype html><html><head><meta charset="utf-8"><style>
      *{margin:0;box-sizing:border-box} body{width:1920px;height:1080px;overflow:hidden}
      section{width:1920px;height:1080px;position:relative;overflow:hidden;justify-content:center;padding-bottom:200px!important}
      section, section *{font-family:'Noto Sans CJK KR','Noto Sans KR',sans-serif}
      [style*="Courier"]{font-family:'DejaVu Sans Mono',monospace!important}
      table{border-collapse:collapse;width:100%} th,td{padding:0.35em 0.6em;border:1px solid #D8D5E2;text-align:left}
      ul,ol{padding-left:1.2em}
    </style></head><body>${html}</body></html>`;
    fs.writeFileSync('/tmp/claude-0/s/slide.html', page);
    await p.goto('file:///tmp/claude-0/s/slide.html');
    await p.waitForTimeout(300);
    await p.screenshot({ path: `frames/${n}.png` });
    console.log('ok', n);
  }
  await b.close();
})();
