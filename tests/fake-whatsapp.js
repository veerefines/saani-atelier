// A stand-in for Meta's WhatsApp Cloud API in tests: takes /<phone id>/messages and saves what Jelly
// would have sent, numbered, so tests can read her replies.
// usage: node tests/fake-whatsapp.js <port> <dir>
const http = require('http');
const fs = require('fs');
const path = require('path');

const [port, dir] = process.argv.slice(2);
let n = 0;
http
  .createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      if (req.method !== 'POST' || !req.url.endsWith('/messages')) return res.writeHead(404).end();
      const body = Buffer.concat(chunks).toString();
      fs.writeFileSync(path.join(dir, `wa-out-${++n}.json`), body);
      fs.writeFileSync(path.join(dir, 'wa-out-last.json'), body);
      fs.writeFileSync(path.join(dir, 'wa-out-count'), String(n));
      fs.writeFileSync(path.join(dir, 'wa-auth-last'), req.headers.authorization || '');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ messaging_product: 'whatsapp', messages: [{ id: `wamid.out${n}` }] }));
    });
  })
  .listen(Number(port));
