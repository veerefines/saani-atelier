// Push end-to-end for Part 3: reactions, opened letters, nudges and answers, low moods, and a shared device.
// usage (project root): node tests/push.js <temp dir with push-test.key/.crt>   (run through tests/run.sh)
const https = require('https');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const ece = require(path.join(process.cwd(), 'node_modules/http_ece'));

const S = process.argv[2];
const B = process.env.BASE_URL || 'http://localhost:3000';
const DATA = path.join(process.cwd(), '.data', 'push.json');

const device = (p) => {
  const ecdh = crypto.createECDH('prime256v1');
  ecdh.generateKeys();
  const auth = crypto.randomBytes(16);
  return { ecdh, auth, sub: { endpoint: `https://localhost:4557${p}`, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: auth.toString('base64url') } } };
};
const jars = {};
async function signIn(name, code) {
  const r = await fetch(`${B}/hello/${code}`, { redirect: 'manual' });
  jars[name] = (r.headers.getSetCookie?.() ?? []).map((c) => c.split(';')[0]).join('; ');
}
const call = (url, method, who, body) =>
  fetch(B + url, { method, headers: { 'Content-Type': 'application/json', cookie: jars[who] }, body: body ? JSON.stringify(body) : undefined }).then(async (r) => ({ status: r.status, body: await r.json().catch(() => ({})) }));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

let pass = 0;
let fail = 0;
const ok = (name, cond, extra = '') => {
  if (cond) pass++;
  else fail++;
  console.log(`${cond ? 'PASS' : 'FAIL'} ${name}${extra ? '  ' + extra : ''}`);
};

(async () => {
  const her = device('/saanika');
  const friend = device('/friend');
  const got = { saanika: [], friend: [] };
  const server = https.createServer({ key: fs.readFileSync(path.join(S, 'push-test.key')), cert: fs.readFileSync(path.join(S, 'push-test.crt')) }, (req, res) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const who = req.url === '/saanika' ? her : friend;
      try {
        const msg = JSON.parse(ece.decrypt(Buffer.concat(chunks), { version: 'aes128gcm', privateKey: who.ecdh, authSecret: who.auth.toString('base64url') }).toString());
        got[req.url.slice(1)].push(`${msg.title} | ${msg.body} → ${msg.url}`);
      } catch (e) {
        got[req.url.slice(1)].push('UNREADABLE ' + e.message);
      }
      res.writeHead(201);
      res.end();
    });
  });
  await new Promise((r) => server.listen(4557, r));

  await signIn('sa', 'CHANGE-ME-1');
  await signIn('fr', 'CHANGE-ME-2');
  const id = (e) => 'ps_' + crypto.createHash('sha256').update(e).digest('hex').slice(0, 24);
  fs.writeFileSync(DATA, JSON.stringify({}));
  // each signs up their own device
  ok('her device subscribes', (await call('/api/push', 'POST', 'sa', { subscription: her.sub })).status === 201);
  ok('friend device subscribes', (await call('/api/push', 'POST', 'fr', { subscription: friend.sub })).status === 201);

  const take = async (who) => {
    await wait(1200);
    const out = got[who];
    got[who] = [];
    return out;
  };

  // a post, her reaction
  const post = (await call('/api/posts', 'POST', 'fr', { kind: 'text', text: 'push test post' })).body;
  await take('saanika');
  await call(`/api/posts/${post.id}/react`, 'POST', 'sa', { emoji: '💗' });
  let f = await take('friend');
  ok('friend hears her reaction', f.some((m) => m.startsWith('Saanika 💗 | She reacted 💗 to your message')), JSON.stringify(f));
  await call(`/api/posts/${post.id}/react`, 'POST', 'sa', { emoji: '💗' }); // takes it back
  f = await take('friend');
  ok('taking a reaction back sends nothing', f.length === 0, JSON.stringify(f));

  // a letter, opened
  const letter = (await call('/api/letters', 'POST', 'fr', { title: 'Open me', body: 'hi' })).body;
  await take('saanika');
  await call(`/api/letters/${letter.id}`, 'POST', 'sa');
  f = await take('friend');
  ok('friend hears she opened the letter', f.some((m) => m.startsWith('✉️ Saanika opened your letter | “Open me”')), JSON.stringify(f));
  await call(`/api/letters/${letter.id}`, 'POST', 'sa');
  f = await take('friend');
  ok('opening it again sends nothing', f.length === 0, JSON.stringify(f));

  // a nudge, her answer
  const nudge = (await call('/api/nudges', 'POST', 'fr', { emoji: '🌸', text: 'thinking of you' })).body;
  let h = await take('saanika');
  ok('she hears the nudge', h.some((m) => m.startsWith('🌸 Vee is thinking of you | thinking of you')), JSON.stringify(h));
  await call(`/api/nudges/${nudge.id}`, 'POST', 'sa', { reaction: '🥹' });
  f = await take('friend');
  ok('friend hears her reaction to the nudge', f.some((m) => m.startsWith('Saanika 🥹 | She sent 🥹 back to your 🌸')), JSON.stringify(f));
  await call(`/api/nudges/${nudge.id}`, 'POST', 'sa', { reply: 'miss you too' });
  f = await take('friend');
  ok('friend hears her reply', f.some((m) => m.includes('“miss you too”')), JSON.stringify(f));

  // a low mood: friends get one gentle nudge a day
  await call('/api/mood', 'POST', 'sa', { mood: 'great' });
  f = await take('friend');
  ok('a good mood sends nothing', f.length === 0, JSON.stringify(f));
  await call('/api/mood', 'POST', 'sa', { mood: 'homesick', note: 'miss home' });
  f = await take('friend');
  ok('a low mood tells her friends', f.some((m) => m.startsWith('🥺 Saanika’s feeling homesick today')), JSON.stringify(f));
  h = await take('saanika');
  ok('she isn’t told about her own mood', h.length === 0, JSON.stringify(h));
  await call('/api/mood', 'POST', 'sa', { mood: 'stressed' });
  f = await take('friend');
  ok('only once a day', f.length === 0, JSON.stringify(f));

  // her love back to everyone
  await call('/api/nudges/back', 'POST', 'sa', { emoji: '💗' });
  f = await take('friend');
  ok('friends hear her love back', f.some((m) => m.startsWith('💗 Saanika is thinking of you all')), JSON.stringify(f));
  h = await take('saanika');
  ok('she doesn’t get her own', h.length === 0, JSON.stringify(h));

  // departure day, through the daily job (test clock)
  const CS = process.env.CRON_SECRET || fs.readFileSync(path.join(process.cwd(), '.env.local'), 'utf8').match(/^CRON_SECRET=(.*)$/m)[1];
  const daily = (iso) => fetch(`${B}/api/daily?now=${iso}`, { headers: { authorization: `Bearer ${CS}` } }).then((r) => r.json());
  await daily('2026-11-08T06:00:00Z');
  f = await take('friend');
  ok('two days before: friends reminded', f.some((m) => m.startsWith('✈️ Departure day in 2 days')), JSON.stringify(f));
  await daily('2026-11-10T06:00:00Z');
  h = await take('saanika');
  f = await take('friend');
  ok('on the day: she gets buon viaggio', h.some((m) => m.startsWith('✈️ Departure day | Buon viaggio!')), JSON.stringify(h));
  ok('on the day: friends told', f.some((m) => m.startsWith('✈️ It’s Departure day for Saanika today')), JSON.stringify(f));

  // moments: she shares one, a friend hears; the friend reacts, she hears
  const png = fs.readFileSync(path.join(process.cwd(), 'public/icons/icon-192.png'));
  const up = (await call('/api/upload', 'POST', 'sa', { mime: 'image/png', size: png.length })).body;
  await fetch(B + up.url, { method: 'PUT', headers: { 'Content-Type': 'image/png', cookie: jars.sa }, body: png });
  const moment = (await call('/api/moments', 'POST', 'sa', { kind: 'photo', mediaId: up.id, caption: 'gelato o’clock' })).body;
  f = await take('friend');
  ok('friends hear about her moment', f.some((m) => m.startsWith('📸 Saanika shared a photo | gelato o’clock')), JSON.stringify(f));
  await call(`/api/moments/${moment.id}/react`, 'POST', 'fr', { emoji: '😍' });
  h = await take('saanika');
  ok('she hears the reaction', h.some((m) => m.startsWith('Vee 😍 your moment')), JSON.stringify(h));

  // a shared device follows whoever is signed in: Vee's laptop, now opened as Saanika
  await call('/api/push', 'POST', 'sa', { subscription: friend.sub });
  const saved = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  ok('the device now belongs to Saanika', saved[id(friend.sub.endpoint)]?.ownerId === 'saanika');
  await call('/api/push', 'POST', 'fr', { subscription: friend.sub });
  const back = JSON.parse(fs.readFileSync(DATA, 'utf8'));
  ok('and back to Vee when Vee opens it', back[id(friend.sub.endpoint)]?.ownerId === 'priya');

  server.close();
  console.log(`\npassed=${pass} failed=${fail}`);
  process.exit(fail ? 1 : 0);
})();
