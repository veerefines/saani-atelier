// A stand-in for the Claude API in tests: answers /v1/messages with a short streamed reply, and
// saves each request body so tests can check exactly what was sent. usage: node tests/fake-claude.js <port> <dir>
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
      if (!req.url.startsWith('/v1/messages')) {
        res.writeHead(404).end();
        return;
      }
      const body = Buffer.concat(chunks).toString();
      fs.writeFileSync(path.join(dir, `claude-req-${++n}.json`), body);
      fs.writeFileSync(path.join(dir, 'claude-req-last.json'), body);
      fs.writeFileSync(path.join(dir, 'claude-headers-last.json'), JSON.stringify(req.headers));
      const reply = '## Summary\n- FAKE-CLAUDE-REPLY about the brief\n- **Next:** add a target price';
      const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' });
      ev('message_start', { message: { id: `msg_${n}`, type: 'message', role: 'assistant', model: 'claude-opus-5-5', content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 10, output_tokens: 1 } } });
      ev('content_block_start', { index: 0, content_block: { type: 'text', text: '' } });
      ev('content_block_delta', { index: 0, delta: { type: 'text_delta', text: reply } });
      ev('content_block_stop', { index: 0 });
      ev('message_delta', { delta: { stop_reason: 'end_turn', stop_sequence: null }, usage: { output_tokens: 20 } });
      ev('message_stop', {});
      res.end();
    });
  })
  .listen(Number(port));
