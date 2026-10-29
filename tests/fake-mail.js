// A stand-in for Resend in tests: POST /emails saves what was sent (to mail-last.json) and counts it.
// While the file mail-down exists in the folder it answers 500, like an outage.
// usage: node tests/fake-mail.js <port> <dir>
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
      if (req.method !== 'POST' || req.url !== '/emails') return res.writeHead(404).end();
      if (fs.existsSync(path.join(dir, 'mail-down'))) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ message: 'down' }));
      }
      const body = Buffer.concat(chunks).toString();
      const j = JSON.parse(body);
      j.authorization = req.headers.authorization;
      fs.writeFileSync(path.join(dir, `mail-${++n}.json`), JSON.stringify(j));
      fs.writeFileSync(path.join(dir, 'mail-last.json'), JSON.stringify(j));
      fs.writeFileSync(path.join(dir, 'mail-count'), String(n));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ id: `mail_${n}` }));
    });
  })
  .listen(Number(port));
