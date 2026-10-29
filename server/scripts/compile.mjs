import solc from 'solc'; import fs from 'fs'; import path from 'path';
const src = fs.readFileSync('contract/NFTimeArt.sol','utf8');
const input = {language:'Solidity',sources:{'NFTimeArt.sol':{content:src}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'london',outputSelection:{'*':{'*':['abi','evm.bytecode.object']}}}};
const findImports = p => { try { return {contents: fs.readFileSync(path.join('node_modules',p),'utf8')} } catch { return {error:'nf'} } };
const out = JSON.parse(solc.compile(JSON.stringify(input),{import:findImports}));
if (out.errors) out.errors.forEach(e=>console.error(e.formattedMessage));
const c = out.contracts['NFTimeArt.sol'].NFTimeArt;
fs.writeFileSync('src/contract.js', `export const BYTECODE='0x${c.evm.bytecode.object}';\nexport const ABI=${JSON.stringify(c.abi)};\n`);
console.log('bytecode bytes', c.evm.bytecode.object.length/2);
