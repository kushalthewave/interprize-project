import { encodeQR } from './src/services/auth/qr.js';
const { modules, size, version, mask } = encodeQR('HELLO', { ec: 'L' });
console.log(`version ${version}  size ${size}  mask ${mask}`);
console.log(modules.map(r => r.map(v => (v ? '##' : '..')).join('')).join('\n'));
let nulls = 0;
for (const row of modules) for (const v of row) if (v === null || v === undefined) nulls++;
console.log('undecided modules:', nulls);
