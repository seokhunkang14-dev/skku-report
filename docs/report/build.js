// 최종보고서 .docx 생성기
const fs = require('fs');
const path = require('path');
const D = require('docx');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell, WidthType, AlignmentType,
  ShadingType, BorderStyle, PageBreak, Footer, PageNumber, LevelFormat, VerticalAlign, HeightRule,
} = D;

const C = require('./content.js');
const FONT = 'Malgun Gothic';
const FONT_KR = '맑은 고딕';
const MONO = 'Consolas';
const cm = (x) => Math.round(x * 567); // DXA
const font = { ascii: FONT, hAnsi: FONT, eastAsia: FONT_KR, cs: FONT };
const mono = { ascii: MONO, hAnsi: MONO, eastAsia: FONT_KR, cs: MONO };

const run = (text, o = {}) => new TextRun({ text, font, size: o.size || 21, bold: o.bold, color: o.color, italics: o.italics });

function pngSize(file) {
  const b = fs.readFileSync(file);
  return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) };
}

function para(text, o = {}) {
  return new Paragraph({
    alignment: o.align || AlignmentType.JUSTIFIED,
    spacing: { line: o.line || 360, before: o.before || 0, after: o.after ?? 120 },
    indent: o.indent ? { firstLine: cm(0.35) } : undefined,
    keepNext: o.keepNext,
    children: [run(text, o)],
  });
}

const border = { style: BorderStyle.SINGLE, size: 4, color: '888888' };
const borders = { top: border, bottom: border, left: border, right: border };

function makeTable(head, rows, widthsCm) {
  const total = widthsCm.reduce((a, b) => a + b, 0);
  const cols = widthsCm.map(cm);
  const keep = rows.length <= 12;
  const cell = (t, i, header, last) => new TableCell({
    width: { size: cols[i], type: WidthType.DXA },
    borders,
    shading: header ? { type: ShadingType.CLEAR, fill: 'E9ECF3', color: 'auto' } : undefined,
    margins: { top: 60, bottom: 60, left: 90, right: 90 },
    verticalAlign: VerticalAlign.CENTER,
    children: [new Paragraph({
      alignment: header ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { line: 276, after: 0 }, keepNext: keep && !last, keepLines: true,
      children: [run(t, { size: 18, bold: header })],
    })],
  });
  return new Table({
    width: { size: cm(total), type: WidthType.DXA },
    columnWidths: cols,
    alignment: AlignmentType.CENTER,
    rows: [
      new TableRow({ tableHeader: true, cantSplit: true, children: head.map((h, i) => cell(h, i, true, false)) }),
      ...rows.map((r, k) => new TableRow({ cantSplit: true, children: r.map((t, i) => cell(t, i, false, k === rows.length - 1)) })),
    ],
  });
}

function caption(text) {
  return new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 60, after: 200 }, children: [run(text, { size: 19, bold: true })] });
}

function figure(img, cap, widthCm) {
  const { w, h } = pngSize(path.join(__dirname, img));
  // 그림 최대 크기: 본문 쪽의 반 (세로 약 12.5cm)
  let wcm = widthCm || 15;
  let hcm = (wcm * h) / w;
  if (hcm > 12.5) { hcm = 12.5; wcm = (hcm * w) / h; }
  const px = (c) => Math.round((c / 2.54) * 96);
  return [
    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 120, after: 0 }, keepNext: true,
      children: [new ImageRun({ type: 'png', data: fs.readFileSync(path.join(__dirname, img)), transformation: { width: px(wcm), height: px(hcm) } })],
    }),
    caption(cap),
  ];
}

function codeBlock(title, file, from, to) {
  let src = fs.readFileSync(path.join(__dirname, file), 'utf8');
  if (from) {
    const a = src.indexOf(from);
    const b = to ? src.indexOf(to, a + 1) : src.length;
    src = src.slice(a, b);
  }
  const lines = src.replace(/\t/g, '    ').replace(/\s+$/, '').split('\n');
  const out = [new Paragraph({ spacing: { before: 200, after: 80 }, keepNext: true, children: [run(title, { bold: true, size: 20 })] })];
  lines.forEach((l, i) => out.push(new Paragraph({
    spacing: { line: 220, after: 0 },
    shading: { type: ShadingType.CLEAR, fill: 'F5F6F8', color: 'auto' },
    children: [new TextRun({ text: l.length ? l : ' ', font: mono, size: 15 })],
  })));
  return out;
}

// ───────── 표지 ─────────
const cover = [];
cover.push(new Table({
  width: { size: cm(2.2), type: WidthType.DXA }, columnWidths: [cm(2.2)],
  rows: [new TableRow({ children: [new TableCell({ width: { size: cm(2.2), type: WidthType.DXA }, borders, children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run('붙임3', { size: 20 })] })] })] })],
}));
cover.push(para('', { after: 1400 }));
cover.push(para('2026 학년도 제 2 학기', { align: AlignmentType.CENTER, size: 28, after: 300 }));
cover.push(new Paragraph({
  alignment: AlignmentType.CENTER, spacing: { after: 600 },
  border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: '333333', space: 8 } },
  children: [run('연구논문/작품 최종보고서', { size: 44, bold: true })],
}));
cover.push(para('제목 : Kakao Klip을 이용한 NFT 구매 및 배경화면 설정', { align: AlignmentType.CENTER, size: 26, bold: true, after: 60 }));
cover.push(para('모바일 애플리케이션', { align: AlignmentType.CENTER, size: 26, bold: true, after: 120 }));
cover.push(para('(최종 구현: MetaMask 지갑 연동 · Kaia Kairos 테스트넷 기반 “NFTime”)', { align: AlignmentType.CENTER, size: 20, color: '555555', after: 900 }));
cover.push(para('강석훈 (2016313880)', { align: AlignmentType.CENTER, size: 24, after: 1200 }));
cover.push(para('2026 년 10 월 30 일', { align: AlignmentType.CENTER, size: 24, after: 500 }));
cover.push(para('지도교수 :  이 준 원       서명 ____________', { align: AlignmentType.CENTER, size: 24, after: 900 }));
const evalCols = [2.4, 2.4, 2.4, 2.4, 2.6, 2.6];
cover.push(new Table({
  width: { size: cm(14.8), type: WidthType.DXA }, columnWidths: evalCols.map(cm), alignment: AlignmentType.CENTER,
  rows: [
    new TableRow({ children: ['계획(10)', '주제(20)', '개념(20)', '상세(30)', '보고서(20)', '총점(100)'].map((t, i) => new TableCell({
      width: { size: cm(evalCols[i]), type: WidthType.DXA }, borders, shading: { type: ShadingType.CLEAR, fill: 'E9ECF3', color: 'auto' },
      children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [run(t, { size: 19, bold: true })] })] })) }),
    new TableRow({ height: { value: cm(1.2), rule: HeightRule.ATLEAST }, children: evalCols.map((w) => new TableCell({ width: { size: cm(w), type: WidthType.DXA }, borders, children: [new Paragraph('')] })) }),
  ],
}));
cover.push(para('* 지도교수가 평가결과 기재', { align: AlignmentType.CENTER, size: 17, color: '666666', before: 80 }));

// ───────── 본문 ─────────
const body = [];
for (const b of C) {
  if (b.t === 'h1') body.push(new Paragraph({ spacing: { before: 120, after: 200 }, keepNext: true, children: [run(b.text, { size: 30, bold: true })] }));
  else if (b.t === 'h2') body.push(new Paragraph({ spacing: { before: 280, after: 140 }, keepNext: true, children: [run(b.text, { size: 25, bold: true })] }));
  else if (b.t === 'h3') body.push(new Paragraph({ spacing: { before: 200, after: 100 }, keepNext: true, children: [run(b.text, { size: 22, bold: true })] }));
  else if (b.t === 'p') body.push(para(b.text, { indent: true }));
  else if (b.t === 'bullets') b.items.forEach((t) => body.push(new Paragraph({
    numbering: { reference: 'bul', level: 0 }, alignment: AlignmentType.JUSTIFIED, spacing: { line: 340, after: 80 }, children: [run(t)],
  })));
  else if (b.t === 'fig') body.push(...figure(b.img, b.caption, b.widthCm));
  else if (b.t === 'table') {
    body.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 160, after: 80 }, keepNext: true, children: [run(b.caption, { size: 19, bold: true })] }));
    body.push(makeTable(b.head, b.rows, b.widths));
    body.push(new Paragraph({ spacing: { after: 160 }, children: [] }));
  }
  else if (b.t === 'code') body.push(...codeBlock(b.title, b.file, b.from, b.to));
  else if (b.t === 'pagebreak') body.push(new Paragraph({ children: [new PageBreak()] }));
  else if (b.t === 'refs') b.items.forEach((t, i) => body.push(new Paragraph({
    spacing: { line: 300, after: 100 }, indent: { left: cm(0.9), hanging: cm(0.9) },
    children: [run(`[${i + 1}] `, { size: 19 }), run(t, { size: 19 })],
  })));
}

const margins = { top: cm(2.5), bottom: cm(2.2), left: cm(2.5), right: cm(2.5) };
const doc = new Document({
  creator: '강석훈',
  title: '연구논문/작품 최종보고서 - NFTime',
  styles: { default: { document: { run: { font, size: 21 } } } },
  numbering: { config: [{ reference: 'bul', levels: [{ level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: cm(0.8), hanging: cm(0.45) } } } }] }] },
  sections: [
    { properties: { page: { size: { width: 11906, height: 16838 }, margin: margins } }, children: cover },
    {
      properties: { page: { size: { width: 11906, height: 16838 }, margin: margins, pageNumbers: { start: 1 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [
        new TextRun({ text: '- ', font, size: 18 }), new TextRun({ children: [PageNumber.CURRENT], font, size: 18 }), new TextRun({ text: ' -', font, size: 18 }),
      ] })] }) },
      children: body,
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  const out = process.argv[2] || path.join(__dirname, 'out', '연구논문작품_최종보고서_강석훈.docx');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, buf);
  console.log('wrote', out, buf.length);
});
