// NFTime API 서버 — Cloudflare Workers + D1
import { renderArt } from './art.js';
import { connectPage, homePage } from './pages.js';
import {
  CHAIN_ID, EXPLORER, newPrivateKey, addressOf, recoverPersonal, rpc, sendTx, waitReceipt,
  selector, encUint, encAddr, encString, TRANSFER_TOPIC,
} from './chain.js';
import { BYTECODE } from './contract.js';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });
const err = (msg, status = 400) => json({ error: msg }, status);
const rid = (n = 24) => {
  const b = crypto.getRandomValues(new Uint8Array(n));
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
};
const now = () => new Date().toISOString();

async function getConfig(env, key) {
  const r = await env.DB.prepare('SELECT value FROM config WHERE key=?').bind(key).first();
  return r ? r.value : null;
}
const setConfig = (env, key, value) =>
  env.DB.prepare('INSERT INTO config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(key, value).run();

async function authUser(req, env) {
  const h = req.headers.get('authorization') || '';
  const token = h.replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const s = await env.DB.prepare('SELECT address FROM sessions WHERE token=?').bind(token).first();
  return s ? s.address : null;
}

async function issueSession(env, address, method) {
  const token = rid(24);
  address = address.toLowerCase();
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO users(address, nickname, wallet, created_at) VALUES(?,?,?,?)')
      .bind(address, 'Collector ' + address.slice(2, 6).toUpperCase(), method, now()),
    env.DB.prepare('INSERT INTO sessions(token,address,created_at) VALUES(?,?,?)').bind(token, address, now()),
  ]);
  return token;
}

const WORK_COLS = `w.id, w.title, w.description, w.style, w.seed, w.palette, w.price, w.edition, w.artist_id,
  a.name AS artist_name, (SELECT COUNT(*) FROM nfts n WHERE n.work_id=w.id) AS minted,
  (SELECT COUNT(*) FROM likes l WHERE l.work_id=w.id) AS likes`;

function decorateWork(w, origin) {
  if (!w) return w;
  return { ...w, image: `${origin}/art/${w.id}.svg`, remaining: Math.max(0, w.edition - (w.minted || 0)) };
}

function loginMessage(address, nonce, host) {
  return `NFTime 로그인 요청\n\n${host} 에서 지갑 소유를 확인합니다.\n이 서명은 가스비가 들지 않습니다.\n\n지갑 주소: ${address}\n네트워크: Kaia Kairos (Chain ID ${CHAIN_ID})\nNonce: ${nonce}`;
}

// ---------------- 민팅 ----------------
async function mintTo(env, to, workId) {
  const pk = await getConfig(env, 'minter_pk');
  const contract = await getConfig(env, 'contract');
  if (!pk || !contract) throw new Error('minter/contract not ready');
  const data = selector('mint(address,uint256)') + encAddr(to) + encUint(workId);
  const hash = await sendTx(pk, { to: contract, data, gas: 250000n });
  return { hash, contract };
}

function tokenIdFromReceipt(rc, contract) {
  for (const log of rc.logs || []) {
    if (log.address.toLowerCase() === contract.toLowerCase() && log.topics[0] === TRANSFER_TOPIC) {
      return Number(BigInt(log.topics[3]));
    }
  }
  return null;
}

async function settlePending(env, address) {
  const pend = await env.DB.prepare("SELECT id, tx_hash FROM nfts WHERE owner=? AND status='PENDING'").bind(address).all();
  const contract = await getConfig(env, 'contract');
  for (const n of pend.results || []) {
    try {
      const rc = await rpc('eth_getTransactionReceipt', [n.tx_hash]);
      if (!rc) continue;
      const ok = rc.status === '0x1';
      const tid = ok ? tokenIdFromReceipt(rc, contract) : null;
      await env.DB.prepare('UPDATE nfts SET status=?, token_id=? WHERE id=?').bind(ok ? 'MINTED' : 'FAILED', tid, n.id).run();
    } catch (e) { /* ignore */ }
  }
}

// ---------------- 라우터 ----------------
export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    const origin = url.origin;
    const p = url.pathname;
    const m = req.method;

    if (m === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,DELETE,PUT,OPTIONS',
          'access-control-allow-headers': 'content-type,authorization',
        },
      });
    }

    try {
      // ---- 웹 페이지 ----
      if (p === '/' ) return new Response(homePage(origin), { headers: { 'content-type': 'text/html; charset=utf-8' } });
      if (p === '/connect') return new Response(connectPage(origin), { headers: { 'content-type': 'text/html; charset=utf-8' } });

      // ---- 아트 이미지 (SVG) ----
      let mm;
      if ((mm = p.match(/^\/art\/(\d+)\.svg$/))) {
        const w = await env.DB.prepare('SELECT style, seed, palette FROM works WHERE id=?').bind(+mm[1]).first();
        if (!w) return err('not found', 404);
        return new Response(renderArt(w.style, w.seed, w.palette), {
          headers: { 'content-type': 'image/svg+xml', 'cache-control': 'public, max-age=86400', 'access-control-allow-origin': '*' },
        });
      }

      // ---- NFT 메타데이터 (tokenURI) ----
      if ((mm = p.match(/^\/api\/metadata\/(\d+)$/))) {
        const n = await env.DB.prepare(`SELECT n.token_id, w.id, w.title, w.description, a.name artist FROM nfts n JOIN works w ON w.id=n.work_id JOIN artists a ON a.id=w.artist_id WHERE n.token_id=?`).bind(+mm[1]).first();
        if (!n) return err('not found', 404);
        return json({
          name: `${n.title} #${n.token_id}`,
          description: n.description,
          image: `${origin}/art/${n.id}.svg`,
          attributes: [{ trait_type: 'Artist', value: n.artist }],
        });
      }

      // ---- 지갑 연결 (MetaMask 딥링크 → /connect 페이지) ----
      if (p === '/api/auth/request' && m === 'POST') {
        const id = rid(12);
        await env.DB.prepare("INSERT INTO auth_requests(id,status,created_at) VALUES(?, 'PENDING', ?)").bind(id, now()).run();
        const host = url.host;
        return json({
          session: id,
          connectUrl: `${origin}/connect?s=${id}`,
          metamaskDeeplink: `https://metamask.app.link/dapp/${host}/connect?s=${id}`,
        });
      }
      if (p === '/api/auth/nonce' && m === 'POST') {
        const { session, address } = await req.json();
        const r = await env.DB.prepare('SELECT id FROM auth_requests WHERE id=?').bind(session).first();
        if (!r) return err('unknown session', 404);
        const nonce = rid(8);
        await env.DB.prepare('UPDATE auth_requests SET nonce=?, address=? WHERE id=?').bind(nonce, address.toLowerCase(), session).run();
        return json({ message: loginMessage(address.toLowerCase(), nonce, url.host) });
      }
      if (p === '/api/auth/verify' && m === 'POST') {
        const { session, address, signature } = await req.json();
        const r = await env.DB.prepare('SELECT * FROM auth_requests WHERE id=?').bind(session).first();
        if (!r || !r.nonce) return err('unknown session', 404);
        const msg = loginMessage(r.address, r.nonce, url.host);
        const rec = recoverPersonal(msg, signature);
        if (rec.toLowerCase() !== address.toLowerCase() || rec.toLowerCase() !== r.address) return err('signature mismatch', 401);
        const token = await issueSession(env, rec, 'MetaMask');
        await env.DB.prepare("UPDATE auth_requests SET status='DONE', token=? WHERE id=?").bind(token, session).run();
        return json({ ok: true, address: rec, appLink: `nftime://auth?s=${session}` });
      }
      if ((mm = p.match(/^\/api\/auth\/session\/(\w+)$/))) {
        const r = await env.DB.prepare('SELECT status, address, token FROM auth_requests WHERE id=?').bind(mm[1]).first();
        if (!r) return err('not found', 404);
        return json(r.status === 'DONE' ? r : { status: r.status });
      }
      // 테스트용: 지갑 앱 없이 데모 주소로 로그인 (에뮬레이터 스크린샷 / 심사용)
      if (p === '/api/auth/demo' && m === 'POST') {
        let body = {};
        try { body = await req.json(); } catch (e) {}
        const address = (body.address && /^0x[0-9a-fA-F]{40}$/.test(body.address)) ? body.address : '0x' + rid(20);
        const token = await issueSession(env, address, 'Demo');
        return json({ token, address: address.toLowerCase() });
      }

      // ---- 공개 조회 ----
      if (p === '/api/home') {
        const all = await env.DB.prepare(`SELECT ${WORK_COLS} FROM works w JOIN artists a ON a.id=w.artist_id ORDER BY w.id`).all();
        const works = all.results.map((w) => decorateWork(w, origin));
        const day = Math.floor(Date.now() / 86400000);
        const curated = works[day % works.length];
        const artists = await env.DB.prepare('SELECT * FROM artists ORDER BY id').all();
        return json({
          curated,
          newArrivals: works.slice().reverse().slice(0, 6),
          popular: works.slice().sort((a, b) => b.likes + b.minted - (a.likes + a.minted)).slice(0, 6),
          artists: artists.results.map((a) => ({ ...a, cover: `${origin}/art/${works.find((w) => w.artist_id === a.id)?.id || 1}.svg` })),
        });
      }
      if (p === '/api/works') {
        const q = (url.searchParams.get('q') || '').trim();
        const st = url.searchParams.get('style');
        let sql = `SELECT ${WORK_COLS} FROM works w JOIN artists a ON a.id=w.artist_id WHERE 1=1`;
        const args = [];
        if (q) { sql += ' AND (w.title LIKE ? OR a.name LIKE ? OR w.description LIKE ?)'; args.push(`%${q}%`, `%${q}%`, `%${q}%`); }
        if (st) { sql += ' AND w.style=?'; args.push(st); }
        sql += ' ORDER BY w.id';
        const r = await env.DB.prepare(sql).bind(...args).all();
        return json({ works: r.results.map((w) => decorateWork(w, origin)) });
      }
      if ((mm = p.match(/^\/api\/works\/(\d+)$/))) {
        const w = await env.DB.prepare(`SELECT ${WORK_COLS}, a.bio AS artist_bio FROM works w JOIN artists a ON a.id=w.artist_id WHERE w.id=?`).bind(+mm[1]).first();
        if (!w) return err('not found', 404);
        const me = await authUser(req, env);
        let liked = false, owned = 0;
        if (me) {
          liked = !!(await env.DB.prepare('SELECT 1 FROM likes WHERE address=? AND work_id=?').bind(me, w.id).first());
          owned = (await env.DB.prepare("SELECT COUNT(*) c FROM nfts WHERE owner=? AND work_id=? AND status!='FAILED'").bind(me, w.id).first()).c;
        }
        const more = await env.DB.prepare(`SELECT ${WORK_COLS} FROM works w JOIN artists a ON a.id=w.artist_id WHERE w.artist_id=? AND w.id!=? ORDER BY w.id`).bind(w.artist_id, w.id).all();
        return json({ ...decorateWork(w, origin), liked, owned, moreFromArtist: more.results.map((x) => decorateWork(x, origin)) });
      }
      if ((mm = p.match(/^\/api\/artists\/(\d+)$/))) {
        const a = await env.DB.prepare('SELECT * FROM artists WHERE id=?').bind(+mm[1]).first();
        if (!a) return err('not found', 404);
        const ws = await env.DB.prepare(`SELECT ${WORK_COLS} FROM works w JOIN artists a ON a.id=w.artist_id WHERE w.artist_id=? ORDER BY w.id`).bind(a.id).all();
        return json({ ...a, works: ws.results.map((w) => decorateWork(w, origin)) });
      }
      if (p === '/api/chain/status') {
        const pk = await getConfig(env, 'minter_pk');
        const contract = await getConfig(env, 'contract');
        const minter = pk ? addressOf(pk) : null;
        let balance = null;
        if (minter) { try { balance = Number(BigInt(await rpc('eth_getBalance', [minter, 'latest']))) / 1e18; } catch (e) {} }
        return json({ chainId: CHAIN_ID, network: 'Kaia Kairos Testnet', minter, balance, contract, explorer: EXPLORER });
      }

      // ---- 관리 (초기 1회) ----
      if (p === '/admin/init' && m === 'POST') {
        let pk = await getConfig(env, 'minter_pk');
        if (!pk) { pk = newPrivateKey(); await setConfig(env, 'minter_pk', pk); }
        return json({ minter: addressOf(pk) });
      }
      if (p === '/admin/deploy' && m === 'POST') {
        const existing = await getConfig(env, 'contract');
        if (existing) return json({ contract: existing, note: 'already deployed' });
        const pk = await getConfig(env, 'minter_pk');
        if (!pk) return err('init first');
        const data = BYTECODE + encUint(32) + encString(`${origin}/api/metadata/`);
        const hash = await sendTx(pk, { data, gas: 3000000n });
        const rc = await waitReceipt(hash, 15000);
        if (!rc) return json({ hash, pending: true });
        if (rc.status !== '0x1') return err('deploy failed ' + hash, 500);
        await setConfig(env, 'contract', rc.contractAddress);
        await setConfig(env, 'deploy_tx', hash);
        return json({ contract: rc.contractAddress, hash });
      }

      // ---------------- 인증 필요 ----------------
      const me = await authUser(req, env);
      if (p.startsWith('/api/') && !me) return err('unauthorized', 401);

      if (p === '/api/me') {
        const u = await env.DB.prepare('SELECT * FROM users WHERE address=?').bind(me).first();
        const c = await env.DB.prepare("SELECT COUNT(*) c FROM nfts WHERE owner=? AND status!='FAILED'").bind(me).first();
        const l = await env.DB.prepare('SELECT COUNT(*) c FROM likes WHERE address=?').bind(me).first();
        return json({ ...u, owned: c.c, liked: l.c, explorer: `${EXPLORER}/account/${me}` });
      }

      // 구매: (모의) 원화 결제 승인 → 민터 계정이 구매자 지갑으로 직접 민팅
      if (p === '/api/purchase' && m === 'POST') {
        const { workId, method } = await req.json();
        const w = await env.DB.prepare(`SELECT ${WORK_COLS} FROM works w JOIN artists a ON a.id=w.artist_id WHERE w.id=?`).bind(workId).first();
        if (!w) return err('work not found', 404);
        if (w.minted >= w.edition) return err('sold out', 409);
        const orderId = 'ORD-' + Date.now().toString(36).toUpperCase() + '-' + rid(3).toUpperCase();
        await env.DB.prepare("INSERT INTO orders(id,address,work_id,amount,method,status,created_at) VALUES(?,?,?,?,?,'PAID',?)")
          .bind(orderId, me, w.id, w.price, method || 'CARD', now()).run();
        let hash = null, contract = null, tokenId = null, status = 'PENDING', chainError = null;
        try {
          ({ hash, contract } = await mintTo(env, me, w.id));
          const rc = await waitReceipt(hash, 9000);
          if (rc) { status = rc.status === '0x1' ? 'MINTED' : 'FAILED'; tokenId = tokenIdFromReceipt(rc, contract); }
        } catch (e) {
          chainError = String(e.message || e);
          status = 'FAILED';
        }
        const ins = await env.DB.prepare('INSERT INTO nfts(token_id,work_id,owner,tx_hash,order_id,status,created_at) VALUES(?,?,?,?,?,?,?)')
          .bind(tokenId, w.id, me, hash, orderId, status, now()).run();
        if (status === 'FAILED') await env.DB.prepare("UPDATE orders SET status='REFUNDED' WHERE id=?").bind(orderId).run();
        return json({
          orderId, status, tokenId, txHash: hash, contract, chainError, nftId: ins.meta.last_row_id,
          explorerTx: hash ? `${EXPLORER}/tx/${hash}` : null, network: 'Kaia Kairos', work: decorateWork(w, origin),
        }, status === 'FAILED' ? 502 : 200);
      }

      if (p === '/api/my/nfts') {
        await settlePending(env, me);
        const r = await env.DB.prepare(`SELECT n.id AS nft_id, n.token_id, n.tx_hash, n.status, n.created_at AS acquired_at, ${WORK_COLS}
          FROM nfts n JOIN works w ON w.id=n.work_id JOIN artists a ON a.id=w.artist_id WHERE n.owner=? AND n.status!='FAILED' ORDER BY n.id DESC`).bind(me).all();
        return json({ nfts: r.results.map((x) => ({ ...decorateWork(x, origin), explorerTx: x.tx_hash ? `${EXPLORER}/tx/${x.tx_hash}` : null })) });
      }
      if (p === '/api/my/likes') {
        const r = await env.DB.prepare(`SELECT ${WORK_COLS} FROM likes l JOIN works w ON w.id=l.work_id JOIN artists a ON a.id=w.artist_id WHERE l.address=? ORDER BY l.created_at DESC`).bind(me).all();
        return json({ works: r.results.map((w) => decorateWork(w, origin)) });
      }
      if ((mm = p.match(/^\/api\/likes\/(\d+)$/)) && m === 'POST') {
        const ex = await env.DB.prepare('SELECT 1 FROM likes WHERE address=? AND work_id=?').bind(me, +mm[1]).first();
        if (ex) await env.DB.prepare('DELETE FROM likes WHERE address=? AND work_id=?').bind(me, +mm[1]).run();
        else await env.DB.prepare('INSERT INTO likes(address,work_id,created_at) VALUES(?,?,?)').bind(me, +mm[1], now()).run();
        return json({ liked: !ex });
      }

      // ---- 플레이리스트 ----
      if (p === '/api/playlists' && m === 'GET') {
        const r = await env.DB.prepare(`SELECT pl.*, (SELECT COUNT(*) FROM playlist_items i WHERE i.playlist_id=pl.id) AS count,
          (SELECT n.work_id FROM playlist_items i JOIN nfts n ON n.id=i.nft_id WHERE i.playlist_id=pl.id ORDER BY i.position LIMIT 1) AS cover_work
          FROM playlists pl WHERE pl.address=? ORDER BY pl.id DESC`).bind(me).all();
        return json({ playlists: r.results.map((x) => ({ ...x, cover: x.cover_work ? `${origin}/art/${x.cover_work}.svg` : null })) });
      }
      if (p === '/api/playlists' && m === 'POST') {
        const { name, intervalMin } = await req.json();
        const r = await env.DB.prepare('INSERT INTO playlists(address,name,interval_min,created_at) VALUES(?,?,?,?)')
          .bind(me, (name || '새 플레이리스트').slice(0, 40), intervalMin || 15, now()).run();
        return json({ id: r.meta.last_row_id });
      }
      if ((mm = p.match(/^\/api\/playlists\/(\d+)$/))) {
        const pl = await env.DB.prepare('SELECT * FROM playlists WHERE id=? AND address=?').bind(+mm[1], me).first();
        if (!pl) return err('not found', 404);
        if (m === 'DELETE') {
          await env.DB.batch([
            env.DB.prepare('DELETE FROM playlist_items WHERE playlist_id=?').bind(pl.id),
            env.DB.prepare('DELETE FROM playlists WHERE id=?').bind(pl.id),
          ]);
          return json({ ok: true });
        }
        if (m === 'PUT') {
          const b = await req.json();
          await env.DB.prepare('UPDATE playlists SET name=COALESCE(?,name), interval_min=COALESCE(?,interval_min) WHERE id=?')
            .bind(b.name ?? null, b.intervalMin ?? null, pl.id).run();
          return json({ ok: true });
        }
        const items = await env.DB.prepare(`SELECT i.position, n.id AS nft_id, n.token_id, ${WORK_COLS} FROM playlist_items i
          JOIN nfts n ON n.id=i.nft_id JOIN works w ON w.id=n.work_id JOIN artists a ON a.id=w.artist_id
          WHERE i.playlist_id=? ORDER BY i.position`).bind(pl.id).all();
        return json({ ...pl, items: items.results.map((x) => decorateWork(x, origin)) });
      }
      if ((mm = p.match(/^\/api\/playlists\/(\d+)\/items$/)) && m === 'POST') {
        const pl = await env.DB.prepare('SELECT * FROM playlists WHERE id=? AND address=?').bind(+mm[1], me).first();
        if (!pl) return err('not found', 404);
        const { nftId } = await req.json();
        const n = await env.DB.prepare('SELECT id FROM nfts WHERE id=? AND owner=?').bind(nftId, me).first();
        if (!n) return err('보유한 NFT만 추가할 수 있어요', 403);
        const pos = await env.DB.prepare('SELECT COALESCE(MAX(position),0)+1 AS p FROM playlist_items WHERE playlist_id=?').bind(pl.id).first();
        await env.DB.prepare('INSERT OR IGNORE INTO playlist_items(playlist_id,nft_id,position) VALUES(?,?,?)').bind(pl.id, nftId, pos.p).run();
        return json({ ok: true });
      }
      if ((mm = p.match(/^\/api\/playlists\/(\d+)\/items\/(\d+)$/)) && m === 'DELETE') {
        const pl = await env.DB.prepare('SELECT id FROM playlists WHERE id=? AND address=?').bind(+mm[1], me).first();
        if (!pl) return err('not found', 404);
        await env.DB.prepare('DELETE FROM playlist_items WHERE playlist_id=? AND nft_id=?').bind(pl.id, +mm[2]).run();
        return json({ ok: true });
      }

      return err('not found', 404);
    } catch (e) {
      return err(String(e && e.message ? e.message : e), 500);
    }
  },
};
