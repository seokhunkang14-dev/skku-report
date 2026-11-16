const { chromium } = require('playwright');
(async()=>{const b=await chromium.launch();const p=await b.newPage({viewport:{width:1920,height:1080}});
await p.goto('file://'+__dirname+'/thumb.html');await p.waitForTimeout(400);
await p.screenshot({path:__dirname+'/out/썸네일_2016313880 강석훈.jpg',type:'jpeg',quality:92});await b.close();})();
