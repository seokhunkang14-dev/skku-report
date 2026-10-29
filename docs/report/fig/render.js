const { chromium } = require('playwright');
(async()=>{
  const b = await chromium.launch(); const p = await b.newPage({deviceScaleFactor:2});
  for (const f of process.argv.slice(2)) {
    const svg = require('fs').readFileSync(f,'utf8');
    const m = svg.match(/width="(\d+)" height="(\d+)"/);
    await p.setViewportSize({width:+m[1], height:+m[2]});
    await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
    await p.screenshot({path:f.replace('.svg','.png'), clip:{x:0,y:0,width:+m[1],height:+m[2]}});
    console.log('ok',f);
  }
  await b.close();
})();
