// Kaia Kairos 테스트넷 연동: 키 생성, 트랜잭션 서명(EIP-155 legacy), JSON-RPC, 서명 검증
import { secp256k1 } from '@noble/curves/secp256k1';
import { keccak_256 } from '@noble/hashes/sha3';
import { bytesToHex, hexToBytes, utf8ToBytes, concatBytes } from '@noble/hashes/utils';

export const CHAIN_ID = 1001;
export const RPC_URL = 'https://public-en-kairos.node.kaia.io';
export const EXPLORER = 'https://kairos.kaiascan.io';

// 워커 isolate 시작 시점에 미리 precompute (요청 CPU 시간 절약)
secp256k1.ProjectivePoint.BASE._setWindowSize(8);
secp256k1.sign(new Uint8Array(32).fill(1), new Uint8Array(32).fill(7));

const strip = (h) => (h.startsWith('0x') ? h.slice(2) : h);
export const keccakHex = (bytes) => '0x' + bytesToHex(keccak_256(bytes));

export function newPrivateKey() {
  return '0x' + bytesToHex(secp256k1.utils.randomPrivateKey());
}

export function addressFromPub(pubUncompressed) {
  return '0x' + bytesToHex(keccak_256(pubUncompressed.slice(1)).slice(-20));
}

export function addressOf(pkHex) {
  return addressFromPub(secp256k1.getPublicKey(hexToBytes(strip(pkHex)), false));
}

// personal_sign (EIP-191) 서명에서 주소 복원
export function recoverPersonal(message, sigHex) {
  const msg = utf8ToBytes(message);
  const prefix = utf8ToBytes(`\x19Ethereum Signed Message:\n${msg.length}`);
  const hash = keccak_256(concatBytes(prefix, msg));
  const sig = hexToBytes(strip(sigHex));
  let v = sig[64];
  if (v >= 27) v -= 27;
  const s = secp256k1.Signature.fromCompact(sig.slice(0, 64)).addRecoveryBit(v);
  const pub = s.recoverPublicKey(hash).toRawBytes(false);
  return addressFromPub(pub);
}

// ---- RLP ----
function toMinBytes(n) {
  if (typeof n === 'string') n = BigInt(n);
  if (typeof n === 'number') n = BigInt(n);
  if (n === 0n) return new Uint8Array(0);
  let h = n.toString(16);
  if (h.length % 2) h = '0' + h;
  return hexToBytes(h);
}
function rlpLen(len, offset) {
  if (len < 56) return Uint8Array.of(offset + len);
  const lb = toMinBytes(len);
  return concatBytes(Uint8Array.of(offset + 55 + lb.length), lb);
}
function rlp(x) {
  if (Array.isArray(x)) {
    const body = concatBytes(...x.map(rlp));
    return concatBytes(rlpLen(body.length, 0xc0), body);
  }
  const b = x;
  if (b.length === 1 && b[0] < 0x80) return b;
  return concatBytes(rlpLen(b.length, 0x80), b);
}
const hexField = (h) => (h ? hexToBytes(strip(h).length % 2 ? '0' + strip(h) : strip(h)) : new Uint8Array(0));

export function signLegacyTx(pkHex, tx) {
  const fields = [
    toMinBytes(tx.nonce), toMinBytes(tx.gasPrice), toMinBytes(tx.gas),
    hexField(tx.to), toMinBytes(tx.value || 0), hexField(tx.data),
  ];
  const sighash = keccak_256(rlp([...fields, toMinBytes(CHAIN_ID), new Uint8Array(0), new Uint8Array(0)]));
  const sig = secp256k1.sign(sighash, hexToBytes(strip(pkHex)));
  const v = BigInt(sig.recovery) + BigInt(CHAIN_ID) * 2n + 35n;
  const raw = rlp([...fields, toMinBytes(v), toMinBytes(sig.r), toMinBytes(sig.s)]);
  return '0x' + bytesToHex(raw);
}

// ---- JSON-RPC ----
let rpcId = 1;
export async function rpc(method, params = []) {
  const res = await fetch(RPC_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcId++, method, params }),
  });
  const j = await res.json();
  if (j.error) throw new Error(`${method}: ${j.error.message || JSON.stringify(j.error)}`);
  return j.result;
}

export async function sendTx(pk, { to, data, gas }) {
  const from = addressOf(pk);
  const [nonce, gasPrice] = await Promise.all([
    rpc('eth_getTransactionCount', [from, 'pending']),
    rpc('eth_gasPrice'),
  ]);
  let gasLimit = gas;
  if (!gasLimit) {
    try {
      const est = await rpc('eth_estimateGas', [{ from, to: to || undefined, data }]);
      gasLimit = (BigInt(est) * 13n) / 10n;
    } catch (e) {
      gasLimit = to ? 300000n : 3000000n;
    }
  }
  const raw = signLegacyTx(pk, { nonce, gasPrice, gas: gasLimit, to, data, value: 0 });
  return rpc('eth_sendRawTransaction', [raw]);
}

export async function waitReceipt(hash, ms = 9000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    const r = await rpc('eth_getTransactionReceipt', [hash]);
    if (r) return r;
    await new Promise((res) => setTimeout(res, 700));
  }
  return null;
}

// ---- ABI helpers ----
export const selector = (sig) => keccakHex(utf8ToBytes(sig)).slice(0, 10);
const pad32 = (h) => strip(h).padStart(64, '0');
export const encUint = (n) => pad32(BigInt(n).toString(16));
export const encAddr = (a) => pad32(strip(a).toLowerCase());
export function encString(s) {
  const b = bytesToHex(utf8ToBytes(s));
  const len = encUint(b.length / 2);
  const padded = b.padEnd(Math.ceil(b.length / 64) * 64 || 64, '0');
  return len + padded;
}
export const TRANSFER_TOPIC = keccakHex(utf8ToBytes('Transfer(address,address,uint256)'));
