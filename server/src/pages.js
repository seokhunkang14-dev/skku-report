// 웹 페이지: MetaMask 인앱 브라우저에서 열리는 지갑 연결 페이지 + 서버 소개 페이지

const STYLE = `
:root{--bg:#0e0e12;--card:#17171d;--fg:#f4f4f6;--mut:#9a9aa6;--acc:#7c5cff;--ok:#2ecc8f;--line:#2a2a33}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--fg);font-family:-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Noto Sans KR",sans-serif;min-height:100vh}
.wrap{max-width:440px;margin:0 auto;padding:40px 20px}
.logo{font-weight:800;font-size:28px;letter-spacing:-.5px}.logo span{color:var(--acc)}
.card{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:22px;margin-top:22px}
h1{font-size:22px;margin:0 0 8px}p{color:var(--mut);line-height:1.55;margin:6px 0}
.btn{display:block;width:100%;padding:16px;border-radius:14px;border:0;background:var(--acc);color:#fff;font-size:16px;font-weight:700;text-align:center;text-decoration:none;margin-top:16px;cursor:pointer}
.btn.sec{background:#26262f}.btn:disabled{opacity:.5}
.steps{list-style:none;padding:0;margin:14px 0 0}.steps li{display:flex;gap:10px;align-items:center;padding:8px 0;color:var(--mut)}
.steps li b{width:22px;height:22px;border-radius:50%;background:#26262f;display:inline-flex;align-items:center;justify-content:center;font-size:12px;color:var(--fg)}
.steps li.done{color:var(--fg)}.steps li.done b{background:var(--ok)}
.mono{font-family:ui-monospace,Menlo,monospace;font-size:13px;word-break:break-all;color:var(--fg)}
.err{color:#ff6b6b;margin-top:12px;font-size:14px}
code{background:#26262f;padding:2px 6px;border-radius:6px}
`;

export function connectPage(origin) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NFTime 지갑 연결</title><style>${STYLE}</style></head><body><div class="wrap">
<div class="logo">nf<span>time</span></div>
<div class="card" id="card">
  <h1>지갑 연결</h1>
  <p>NFTime 앱에 지갑을 연결합니다. 서명은 소유 확인용이며 가스비가 들지 않습니다.</p>
  <ul class="steps">
    <li id="s1"><b>1</b>지갑 계정 연결</li>
    <li id="s2"><b>2</b>Kaia Kairos 테스트넷 전환</li>
    <li id="s3"><b>3</b>로그인 메시지 서명</li>
  </ul>
  <div id="addr" class="mono" style="margin-top:10px"></div>
  <button class="btn" id="go">MetaMask 지갑 연결하기</button>
  <a class="btn sec" id="mm" style="display:none">MetaMask 앱에서 열기</a>
  <div class="err" id="err"></div>
</div>
<div class="card" id="done" style="display:none">
  <h1>연결 완료 🎉</h1>
  <p>NFTime 앱으로 돌아가면 자동으로 로그인됩니다.</p>
  <div id="addr2" class="mono" style="margin-top:10px"></div>
  <a class="btn" id="back">NFTime 앱으로 돌아가기</a>
</div>
</div>
<script>
const API=${JSON.stringify(origin)};
const S=new URLSearchParams(location.search).get('s');
const $=id=>document.getElementById(id);
const KAIROS={chainId:'0x3e9',chainName:'Kaia Kairos Testnet',nativeCurrency:{name:'KAIA',symbol:'KAIA',decimals:18},rpcUrls:['https://public-en-kairos.node.kaia.io'],blockExplorerUrls:['https://kairos.kaiascan.io']};
function step(n){$('s'+n).classList.add('done')}
if(!window.ethereum){
  $('go').style.display='none';
  const mm=$('mm'); mm.style.display='block';
  mm.href='https://metamask.app.link/dapp/'+location.host+location.pathname+location.search;
  $('err').textContent='지갑이 감지되지 않았습니다. MetaMask 앱의 브라우저에서 이 페이지를 열어주세요.';
}
$('go').onclick=async()=>{
  $('err').textContent='';$('go').disabled=true;
  try{
    if(!S) throw new Error('세션 정보가 없습니다. 앱에서 다시 시도하세요.');
    const [address]=await ethereum.request({method:'eth_requestAccounts'});
    step(1); $('addr').textContent=address;
    try{ await ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:'0x3e9'}]}); }
    catch(e){ if(e.code===4902||(e.data&&e.data.originalError&&e.data.originalError.code===4902)){ await ethereum.request({method:'wallet_addEthereumChain',params:[KAIROS]}); } else throw e; }
    step(2);
    const n=await fetch(API+'/api/auth/nonce',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session:S,address})}).then(r=>r.json());
    if(n.error) throw new Error(n.error);
    const hex='0x'+Array.from(new TextEncoder().encode(n.message)).map(b=>b.toString(16).padStart(2,'0')).join('');
    const signature=await ethereum.request({method:'personal_sign',params:[hex,address]});
    const v=await fetch(API+'/api/auth/verify',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({session:S,address,signature})}).then(r=>r.json());
    if(v.error) throw new Error(v.error);
    step(3);
    $('card').style.display='none';$('done').style.display='block';
    $('addr2').textContent=v.address;
    $('back').href='intent://auth?s='+S+'#Intent;scheme=nftime;package=world.nftime.app;end';
    setTimeout(()=>{location.href=$('back').href},800);
  }catch(e){ $('err').textContent=(e&&e.message)||String(e); $('go').disabled=false; }
};
</script></body></html>`;
}

export function homePage(origin) {
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>NFTime API</title><style>${STYLE}</style></head><body><div class="wrap">
<div class="logo">nf<span>time</span></div>
<div class="card"><h1>NFTime API Server</h1>
<p>Cloudflare Workers + D1 위에서 동작하는 NFTime 백엔드입니다. 원화 결제 확인 후 Kaia Kairos 테스트넷에서 구매자 지갑으로 NFT를 직접 발행합니다.</p>
<div id="st" class="mono" style="margin-top:12px">loading…</div></div>
</div><script>
fetch('${origin}/api/chain/status').then(r=>r.json()).then(s=>{
 document.getElementById('st').innerHTML='Network: '+s.network+' ('+s.chainId+')<br>Minter: '+(s.minter?'<a style="color:#a99bff" href="'+s.explorer+'/account/'+s.minter+'">'+s.minter+'</a>':'-')+'<br>Balance: '+(s.balance??'-')+' KAIA<br>Contract: '+(s.contract?'<a style="color:#a99bff" href="'+s.explorer+'/account/'+s.contract+'">'+s.contract+'</a>':'-');
});
</script></body></html>`;
}
