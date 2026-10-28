// A stand-in for the euro to rupee sources in tests: Frankfurter (ECB) at /frankfurter, and
// open.er-api.com at /er. If <dir>/fx-ecb-down exists, the ECB one fails, so the fallback is used.
// usage: node tests/fake-fx.js <port> <dir>
const http = require('http');
const fs = require('fs');
const path = require('path');

const [port, dir] = process.argv.slice(2);
const send = (res, code, body) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
};
http
  .createServer((req, res) => {
    const url = req.url || '';
    if (url.startsWith('/frankfurter')) {
      if (fs.existsSync(path.join(dir, 'fx-ecb-down'))) return send(res, 503, { message: 'down' });
      if (url.includes('/latest')) return send(res, 200, { amount: 1, base: 'EUR', date: '2026-10-27', rates: { INR: 100 } });
      return send(res, 200, { amount: 1, base: 'EUR', rates: { '2026-10-01': { INR: 95 }, '2026-10-15': { INR: 98 }, '2026-10-27': { INR: 100 } } });
    }
    if (url.startsWith('/er/latest/EUR')) return send(res, 200, { result: 'success', time_last_update_unix: 1793145751, rates: { INR: 90 } });
    send(res, 404, {});
  })
  .listen(Number(port));
