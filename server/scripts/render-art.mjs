// 생성형 SVG 원본을 1080x1920 JPEG 로 렌더링 (모바일 디코딩 호환용)
import { renderArt } from '../src/art.js';
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const works = fs.readFileSync('seed.sql', 'utf8').matchAll(/\((\d+),\d+,'[^']*','[^']*','(\w+)',(\d+),(\d+),/g);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
for (const [, id, style, seed, pal] of works) {
  const svg = renderArt(style, +seed, +pal).replace(/<\?xml[^>]*>/, '');
  fs.writeFileSync(`art/${id}.svg`, svg);
  await p.setContent(`<html><body style="margin:0">${svg}</body></html>`);
  await p.screenshot({ path: `art/${id}.jpg`, type: 'jpeg', quality: 86 });
  console.log('art', id, style);
}
await b.close();
