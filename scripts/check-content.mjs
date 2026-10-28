// Checks the Milano guide's data before it goes live (the weekly update runs this):
// npm run check:content. Exits non-zero with a list of problems.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (f) => JSON.parse(fs.readFileSync(path.join(root, 'src/content/data', f), 'utf8'));
const places = read('places.json');
const happenings = read('happenings.json');
const problems = [];
const warn = [];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Rome' }).format(new Date());
const CATS = ['food', 'sweet', 'home', 'vibes', 'fashion', 'places', 'local', 'bloom', 'golden', 'beach'];
const KINDS = ['dates', 'workshop', 'exhibition', 'market', 'talk', 'tea', 'runway', 'network'];
// Milano and the places she'd day-trip or swim (lakes, Liguria, the Alps…)
const nearby = (lat, lng) => lat > 43 && lat < 47.2 && lng > 6.6 && lng < 12.6;
// beaches can be anywhere in Italy
const inItaly = (lat, lng) => lat > 35.4 && lat < 47.2 && lng > 6.5 && lng < 18.6;
const https = (u) => typeof u === 'string' && /^https:\/\/[^\s]+$/.test(u);

function unique(list, what) {
  const seen = new Set();
  for (const x of list) {
    if (!x.id || typeof x.id !== 'string') problems.push(`${what}: an entry has no id`);
    else if (seen.has(x.id)) problems.push(`${what}: duplicate id "${x.id}"`);
    seen.add(x.id);
  }
}
unique(places, 'place');
unique(happenings, 'happening');

for (const p of places) {
  const at = `place "${p.id}"`;
  if (!p.name || !p.note || !p.area || !p.q) problems.push(`${at}: name, note, area and q are all needed`);
  if (!CATS.includes(p.cat)) problems.push(`${at}: unknown category "${p.cat}"`);
  if (!Array.isArray(p.try)) problems.push(`${at}: "try" should be a list`);
  if (typeof p.lat !== 'number' || typeof p.lng !== 'number' || !(p.cat === 'beach' ? inItaly : nearby)(p.lat, p.lng)) problems.push(`${at}: lat/lng missing or not ${p.cat === 'beach' ? 'in Italy' : 'near Milano'}`);
  if (p.added && (!DAY.test(p.added) || p.added > today)) problems.push(`${at}: "added" should be a past YYYY-MM-DD`);
}

for (const h of happenings) {
  const at = `happening "${h.id}"`;
  if (!h.title || !h.where || !h.note) problems.push(`${at}: title, where and note are all needed`);
  if (!KINDS.includes(h.kind)) problems.push(`${at}: unknown kind "${h.kind}"`);
  if (!Array.isArray(h.links) || !h.links.length || !h.links.every((l) => l.label && https(l.url))) problems.push(`${at}: needs at least one https link with a label`);
  for (const e of h.editions ?? []) {
    if (!DAY.test(e.start) || !DAY.test(e.end) || e.end < e.start) problems.push(`${at}: edition ${e.start}–${e.end} isn't a valid range`);
    else if (e.end < today) warn.push(`${at}: edition ${e.start}–${e.end} is over (it can be removed)`);
    if (e.time && !/^\d{2}:\d{2}$/.test(e.time)) problems.push(`${at}: edition time should be HH:MM`);
  }
  const d = h.details ?? {};
  if ((d.lat !== undefined || d.lng !== undefined) && !nearby(d.lat, d.lng)) problems.push(`${at}: details lat/lng not near Milano`);
  if (h.image) {
    if (!h.image.src?.startsWith('/happenings/') || !fs.existsSync(path.join(root, 'public', h.image.src))) problems.push(`${at}: image ${h.image.src} isn't in public/happenings`);
    if (!h.image.credit || !https(h.image.from)) problems.push(`${at}: image needs a credit and an https source`);
  }
  if (h.added && (!DAY.test(h.added) || h.added > today)) problems.push(`${at}: "added" should be a past YYYY-MM-DD`);
}

for (const w of warn) console.log('note:', w);
if (problems.length) {
  for (const p of problems) console.error('✗', p);
  console.error(`\n${problems.length} problem(s) in the Milano guide data.`);
  process.exit(1);
}
console.log(`✓ Milano guide data looks right: ${places.length} places, ${happenings.length} happenings.`);
