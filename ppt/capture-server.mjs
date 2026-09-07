// Tiny endpoint the browser POSTs canvas PNGs to, so the deck can use real
// in-game screenshots rather than mock-ups.
import { createServer } from 'node:http';
import { writeFileSync, mkdirSync } from 'node:fs';

mkdirSync('ppt/shots', { recursive: true });

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.writeHead(204).end(); return; }
  let body = '';
  req.on('data', (c) => { body += c; });
  req.on('end', () => {
    try {
      const { name, data } = JSON.parse(body);
      const b64 = data.replace(/^data:image\/png;base64,/, '');
      const file = `ppt/shots/${name.replace(/[^a-z0-9_-]/gi, '')}.png`;
      writeFileSync(file, Buffer.from(b64, 'base64'));
      console.log(`saved ${file} (${(b64.length * 0.75 / 1024).toFixed(0)} kB)`);
      res.writeHead(200).end('ok');
    } catch (e) {
      console.error('capture failed:', e.message);
      res.writeHead(500).end(String(e.message));
    }
  });
}).listen(7788, () => console.log('capture server on http://localhost:7788'));
