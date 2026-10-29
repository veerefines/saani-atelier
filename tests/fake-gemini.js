// A stand-in for Gemini's generateContent (with Google Search grounding) in tests, and it saves each
// request so tests can check exactly what was sent. A message containing WEB-SEARCH gets findings and
// grounding sources, WEB-BROKEN gets a 500, everything else gets "NONE" (no search needed).
// usage: node tests/fake-gemini.js <port> <dir>
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
      if (!/:generateContent$/.test(req.url)) {
        res.writeHead(404).end();
        return;
      }
      const body = Buffer.concat(chunks).toString();
      fs.writeFileSync(path.join(dir, `gemini-req-${++n}.json`), body);
      fs.writeFileSync(path.join(dir, 'gemini-req-last.json'), body);
      fs.writeFileSync(path.join(dir, 'gemini-headers-last.json'), JSON.stringify(req.headers));
      fs.writeFileSync(path.join(dir, 'gemini-count'), String(n));
      if (body.includes('WEB-BROKEN')) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: 'boom' } }));
        return;
      }
      const searched = body.includes('WEB-SEARCH');
      const candidate = searched
        ? {
            content: { parts: [{ text: 'FAKE-WEB-FINDINGS: the Navigli market is open Sunday 8am to 2pm.' }] },
            groundingMetadata: {
              webSearchQueries: ['navigli market opening hours'],
              groundingChunks: [{ web: { uri: 'https://example.com/navigli', title: 'example.com' } }, { web: { uri: 'https://example.org/markets', title: 'example.org' } }],
            },
          }
        : { content: { parts: [{ text: 'NONE' }] } };
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ candidates: [candidate] }));
    });
  })
  .listen(Number(port));
