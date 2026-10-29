import { build } from 'esbuild';
await build({ entryPoints:['src/index.js'], bundle:true, format:'esm', minify:true, target:'es2022', outfile:'dist/worker.js', legalComments:'none' });
