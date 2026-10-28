// A stand-in for Google in tests: the OAuth token endpoint and the Calendar API. It hands out a
// refresh token for the code "GOOD", makes events with a Meet link, and saves each request it gets.
// usage: node tests/fake-google.js <port> <dir>
const http = require('http');
const fs = require('fs');
const path = require('path');

const [port, dir] = process.argv.slice(2);
let n = 0;
const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
};
http
  .createServer((req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString();
      const url = req.url || '';
      fs.writeFileSync(path.join(dir, 'google-last.json'), JSON.stringify({ method: req.method, url, body }));
      if (url.startsWith('/token')) {
        const p = new URLSearchParams(body);
        if (p.get('grant_type') === 'authorization_code') {
          if (p.get('code') !== 'GOOD') return send(res, 400, { error: 'invalid_grant' });
          return send(res, 200, { access_token: 'at-1', refresh_token: 'rt-1', expires_in: 3600 });
        }
        return send(res, 200, { access_token: 'at-2', expires_in: 3600 });
      }
      if (url.startsWith('/calendar/v3/calendars/primary/events')) {
        if (req.headers.authorization !== 'Bearer at-1' && req.headers.authorization !== 'Bearer at-2') return send(res, 401, { error: { message: 'bad token' } });
        if (req.method === 'POST') {
          n++;
          fs.writeFileSync(path.join(dir, 'google-event.json'), body);
          return send(res, 200, { id: `ev${n}`, hangoutLink: `https://meet.google.com/aaa-bbbb-${String(n).padStart(3, '0')}`, htmlLink: 'https://calendar.google.com/x' });
        }
        if (req.method === 'PATCH') return send(res, 200, { id: 'ev' });
        if (req.method === 'DELETE') return send(res, 204);
      }
      send(res, 404, {});
    });
  })
  .listen(Number(port));
