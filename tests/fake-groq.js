// A stand-in for Groq's OpenAI-style API in tests: answers /chat/completions with a short reply and
// free-tier rate-limit headers, and saves each request so tests can check exactly what was sent.
// A question containing SLOW-DOWN gets a 429 with retry-after, like Groq when the minute is used up.
// usage: node tests/fake-groq.js <port> <dir>
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
      if (req.url.endsWith('/audio/speech')) {
        // a tiny silent WAV (16-bit mono, 24 kHz), like Orpheus sends
        fs.writeFileSync(path.join(dir, 'tts-last.json'), Buffer.concat(chunks).toString());
        const n2 = Number(fs.existsSync(path.join(dir, 'tts-count')) ? fs.readFileSync(path.join(dir, 'tts-count'), 'utf8') : 0) + 1;
        fs.writeFileSync(path.join(dir, 'tts-count'), String(n2));
        const data = Buffer.alloc(4800);
        const h = Buffer.alloc(44);
        h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8); h.write('fmt ', 12);
        h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(24000, 24);
        h.writeUInt32LE(48000, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(data.length, 40);
        res.writeHead(200, { 'Content-Type': 'audio/wav' });
        res.end(Buffer.concat([h, data]));
        return;
      }
      if (!req.url.endsWith('/chat/completions')) {
        res.writeHead(404).end();
        return;
      }
      const body = Buffer.concat(chunks).toString();
      fs.writeFileSync(path.join(dir, `groq-req-${++n}.json`), body);
      fs.writeFileSync(path.join(dir, 'groq-req-last.json'), body);
      fs.writeFileSync(path.join(dir, 'groq-headers-last.json'), JSON.stringify(req.headers));
      fs.writeFileSync(path.join(dir, 'groq-count'), String(n));
      const limits = { 'x-ratelimit-limit-requests': '1000', 'x-ratelimit-remaining-requests': '990', 'x-ratelimit-reset-requests': '1m26s', 'x-ratelimit-limit-tokens': '8000', 'x-ratelimit-remaining-tokens': '7000', 'x-ratelimit-reset-tokens': '7.5s' };
      if (body.includes('SLOW-DOWN')) {
        res.writeHead(429, { 'Content-Type': 'application/json', 'retry-after': '42', ...limits });
        res.end(JSON.stringify({ error: { message: 'Rate limit reached', type: 'tokens', code: 'rate_limit_exceeded' } }));
        return;
      }
      const reply = '<think>hidden</think>## Summary\n- FAKE-GROQ-REPLY about the brief\n- **Next:** add a target price\n- Palette: Navigli rose #F4A6C0 and dusk #6B1E3A\n\n## Try next\n- FOLLOW-ONE?\n- **FOLLOW-TWO?**\n3. FOLLOW-THREE?';
      res.writeHead(200, { 'Content-Type': 'application/json', ...limits });
      res.end(
        JSON.stringify({
          id: `chatcmpl-${n}`,
          object: 'chat.completion',
          model: 'qwen/qwen3.8-27b',
          choices: [{ index: 0, message: { role: 'assistant', content: reply }, finish_reason: 'stop' }],
          usage: { prompt_tokens: 950, completion_tokens: 50, total_tokens: 1000 },
        }),
      );
    });
  })
  .listen(Number(port));
