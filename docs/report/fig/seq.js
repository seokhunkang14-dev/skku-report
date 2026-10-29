// 간단한 시퀀스 다이어그램 SVG 생성기
function seq({lanes, msgs, width=1400, title}) {
  const top=70, laneGap=width/(lanes.length), rowH=50, F='Noto Sans CJK KR, Noto Sans KR, sans-serif';
  const H = top + 60 + msgs.length*rowH + 40;
  const x = i => laneGap*i + laneGap/2;
  let s = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${H}" viewBox="0 0 ${width} ${H}" font-family="${F}">`;
  s += `<defs><marker id="a" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#222"/></marker>
  <marker id="b" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="#777"/></marker></defs>`;
  s += `<rect width="${width}" height="${H}" fill="#fff"/>`;
  lanes.forEach((l,i)=>{
    const c = l.color || '#f2f2f5';
    s += `<rect x="${x(i)-110}" y="14" width="220" height="48" rx="10" fill="${c}" stroke="#222" stroke-width="1.5"/>`;
    s += `<text x="${x(i)}" y="44" font-size="19" font-weight="700" text-anchor="middle">${l.name}</text>`;
    s += `<line x1="${x(i)}" y1="62" x2="${x(i)}" y2="${H-20}" stroke="#999" stroke-dasharray="6 5" stroke-width="1.5"/>`;
  });
  msgs.forEach((m,k)=>{
    const y = top + 50 + k*rowH;
    if (m.note!==undefined) {
      const xs=m.lanes.map(x), x0=Math.min(...xs)-100, x1=Math.max(...xs)+100;
      s += `<rect x="${x0}" y="${y-22}" width="${x1-x0}" height="34" rx="6" fill="#fff8d6" stroke="#c9a400"/>`;
      s += `<text x="${(x0+x1)/2}" y="${y}" font-size="16" text-anchor="middle" fill="#5a4800">${m.note}</text>`;
      return;
    }
    const a=x(m.f), b=x(m.t), dashed=m.r;
    if (m.f===m.t && m.f===lanes.length-1) {
      s += `<path d="M${a} ${y-10} h-60 v24 h55" fill="none" stroke="#222" stroke-width="1.6" marker-end="url(#a)"/>`;
      s += `<text x="${a-70}" y="${y+6}" font-size="16" text-anchor="end">${m.n?`<tspan font-weight="700">${m.n}. </tspan>`:''}${m.l}</text>`;
      return;
    }
    if (m.f===m.t) {
      s += `<path d="M${a} ${y-10} h60 v24 h-55" fill="none" stroke="#222" stroke-width="1.6" marker-end="url(#a)"/>`;
      s += `<text x="${a+70}" y="${y+6}" font-size="16">${m.n?`<tspan font-weight="700">${m.n}. </tspan>`:''}${m.l}</text>`;
      return;
    }
    s += `<line x1="${a}" y1="${y}" x2="${b + (b>a?-4:4)}" y2="${y}" stroke="${dashed?'#777':'#222'}" stroke-width="1.6" ${dashed?'stroke-dasharray="7 5"':''} marker-end="url(#${dashed?'b':'a'})"/>`;
    s += `<text x="${(a+b)/2}" y="${y-8}" font-size="16" text-anchor="middle" fill="${dashed?'#555':'#111'}">${m.n?`<tspan font-weight="700">${m.n}. </tspan>`:''}${m.l}</text>`;
  });
  return s + `</svg>`;
}
module.exports = { seq };
