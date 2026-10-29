// 생성형 SVG 아트 — 작품마다 style + seed 로 결정론적으로 그려진다.
// (Android 에서는 AndroidSVG 로 렌더링하므로 filter 없이 gradient/path 만 사용)

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTES = [
  ['#0b1026', '#3a1c71', '#d76d77', '#ffaf7b', '#fdf0d5'],
  ['#05132b', '#0f4c75', '#3282b8', '#bbe1fa', '#f8f9fa'],
  ['#1b0a2a', '#5f0f40', '#9a031e', '#fb8b24', '#e36414'],
  ['#0d1b2a', '#1b263b', '#415a77', '#778da9', '#e0e1dd'],
  ['#10002b', '#5a189a', '#9d4edd', '#e0aaff', '#fff0f6'],
  ['#081c15', '#1b4332', '#40916c', '#95d5b2', '#f1faee'],
  ['#f8edeb', '#fec5bb', '#e8a598', '#6d6875', '#22223b'],
  ['#fefae0', '#e9c46a', '#f4a261', '#e76f51', '#264653'],
];

const W = 1080, H = 1920;
const f = (n) => n.toFixed(1);

function orbs(r, p) {
  let defs = `<linearGradient id="bg" x1="0" y1="0" x2="0.3" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient>`;
  let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  const n = 7 + Math.floor(r() * 5);
  for (let i = 0; i < n; i++) {
    const c = p[2 + Math.floor(r() * 3)];
    defs += `<radialGradient id="o${i}"><stop offset="0" stop-color="${c}" stop-opacity="0.95"/><stop offset="0.45" stop-color="${c}" stop-opacity="0.45"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></radialGradient>`;
    const rad = 180 + r() * 520;
    body += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(rad)}" fill="url(#o${i})"/>`;
  }
  for (let i = 0; i < 90; i++) {
    body += `<circle cx="${f(r() * W)}" cy="${f(r() * H)}" r="${f(1 + r() * 3)}" fill="${p[4]}" opacity="${(0.2 + r() * 0.6).toFixed(2)}"/>`;
  }
  return { defs, body };
}

function waves(r, p) {
  let defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[4]}"/><stop offset="0.55" stop-color="${p[3]}"/><stop offset="1" stop-color="${p[2]}"/></linearGradient>`;
  let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  body += `<circle cx="${f(W * (0.3 + r() * 0.4))}" cy="${f(H * 0.32)}" r="${f(150 + r() * 80)}" fill="${p[4]}" opacity="0.85"/>`;
  const layers = 7;
  for (let i = 0; i < layers; i++) {
    const base = H * 0.45 + i * (H * 0.075);
    const amp = 40 + r() * 90, freq = 1 + r() * 2.5, ph = r() * 6.28;
    let d = `M0 ${f(base)}`;
    for (let x = 0; x <= W; x += 30) d += ` L${x} ${f(base + Math.sin((x / W) * 6.28 * freq + ph) * amp)}`;
    d += ` L${W} ${H} L0 ${H} Z`;
    const c = p[Math.min(4, Math.floor(i / 2))];
    defs += `<linearGradient id="w${i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[(i + 1) % 5]}"/><stop offset="1" stop-color="${c}"/></linearGradient>`;
    body += `<path d="${d}" fill="url(#w${i})" opacity="${(0.55 + i * 0.06).toFixed(2)}"/>`;
  }
  return { defs, body };
}

function bauhaus(r, p) {
  let body = `<rect width="${W}" height="${H}" fill="${p[0]}"/>`;
  const cols = 4, rows = 7, cw = W / cols, ch = H / rows;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const X = x * cw, Y = y * ch, c1 = p[1 + Math.floor(r() * 4)], c2 = p[1 + Math.floor(r() * 4)];
    body += `<rect x="${f(X)}" y="${f(Y)}" width="${f(cw)}" height="${f(ch)}" fill="${c1}"/>`;
    const t = Math.floor(r() * 5);
    if (t === 0) body += `<circle cx="${f(X + cw / 2)}" cy="${f(Y + ch / 2)}" r="${f(Math.min(cw, ch) * 0.42)}" fill="${c2}"/>`;
    else if (t === 1) body += `<path d="M${f(X)} ${f(Y)} L${f(X + cw)} ${f(Y)} L${f(X)} ${f(Y + ch)} Z" fill="${c2}"/>`;
    else if (t === 2) body += `<path d="M${f(X)} ${f(Y + ch)} A${f(cw)} ${f(ch)} 0 0 1 ${f(X + cw)} ${f(Y)} L${f(X + cw)} ${f(Y + ch)} Z" fill="${c2}"/>`;
    else if (t === 3) body += `<rect x="${f(X + cw * 0.2)}" y="${f(Y + ch * 0.2)}" width="${f(cw * 0.6)}" height="${f(ch * 0.6)}" fill="${c2}"/>`;
    else body += `<circle cx="${f(X)}" cy="${f(Y)}" r="${f(cw)}" fill="${c2}" opacity="0.9"/>`;
  }
  return { defs: '', body: `<g>${body}</g>` };
}

function mountains(r, p) {
  let defs = `<linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="0.6" stop-color="${p[2]}"/><stop offset="1" stop-color="${p[3]}"/></linearGradient>`;
  let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  body += `<circle cx="${f(W * (0.25 + r() * 0.5))}" cy="${f(H * (0.25 + r() * 0.15))}" r="${f(110 + r() * 60)}" fill="${p[4]}"/>`;
  for (let i = 0; i < 6; i++) {
    const base = H * (0.5 + i * 0.085);
    let d = `M0 ${H} L0 ${f(base)}`;
    let x = 0, y = base;
    while (x < W) { x += 60 + r() * 140; y = base - r() * (260 - i * 25); d += ` L${f(Math.min(x, W))} ${f(y)}`; }
    d += ` L${W} ${H} Z`;
    const shade = i / 5;
    body += `<path d="${d}" fill="${p[1]}" opacity="${(0.35 + shade * 0.65).toFixed(2)}"/>`;
  }
  return { defs, body };
}

function rings(r, p) {
  let body = `<rect width="${W}" height="${H}" fill="${p[0]}"/>`;
  const cx = W * (0.3 + r() * 0.4), cy = H * (0.3 + r() * 0.4);
  for (let i = 38; i > 0; i--) {
    const c = p[1 + (i % 4)];
    body += `<circle cx="${f(cx + Math.sin(i * 0.35) * 40)}" cy="${f(cy + Math.cos(i * 0.3) * 60)}" r="${f(i * 34)}" fill="none" stroke="${c}" stroke-width="${f(8 + r() * 14)}" opacity="${(0.5 + r() * 0.5).toFixed(2)}"/>`;
  }
  return { defs: '', body };
}

function flow(r, p) {
  let defs = `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${p[0]}"/><stop offset="1" stop-color="${p[1]}"/></linearGradient>`;
  let body = `<rect width="${W}" height="${H}" fill="url(#bg)"/>`;
  const k1 = 0.002 + r() * 0.003, k2 = 0.002 + r() * 0.003;
  for (let i = 0; i < 70; i++) {
    let x = r() * W, y = r() * H, d = `M${f(x)} ${f(y)}`;
    for (let s = 0; s < 60; s++) {
      const a = Math.sin(x * k1) * 2 + Math.cos(y * k2) * 2;
      x += Math.cos(a) * 18; y += Math.sin(a) * 18; d += ` L${f(x)} ${f(y)}`;
    }
    body += `<path d="${d}" fill="none" stroke="${p[2 + (i % 3)]}" stroke-width="${f(2 + r() * 7)}" stroke-linecap="round" opacity="${(0.35 + r() * 0.6).toFixed(2)}"/>`;
  }
  return { defs, body };
}

const STYLES = { orbs, waves, bauhaus, mountains, rings, flow };

export function renderArt(style, seed, palette) {
  const r = rng(seed);
  const p = PALETTES[palette % PALETTES.length];
  const fn = STYLES[style] || orbs;
  const { defs, body } = fn(r, p);
  return `<?xml version="1.0" encoding="UTF-8"?><svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><defs>${defs}</defs>${body}</svg>`;
}
