// One-shot: pulls base64-embedded news images out of the legacy
// ammon-lim-realestate.html and writes them to Newscard/.
// Run once: node scripts/extract-news-images.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.resolve(__dirname, '..', 'ammon-lim-realestate.html');
const OUT_DIR = path.resolve(__dirname, '..', 'Newscard');

if (!fs.existsSync(SRC)) {
  console.error('Source not found:', SRC);
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });

const html = fs.readFileSync(SRC, 'utf8');

// We only want news section base64 images — bracket on news-img-wrap markers
// to skip listing/about/hero embeds. Easiest: take the last contiguous block
// of base64 images starting after "News".
const NEWS_MARKER = '<!-- ─── NEWS ─── -->';
const newsStart = html.indexOf(NEWS_MARKER);
if (newsStart === -1) { console.error('NEWS section not found.'); process.exit(1); }
const newsHtml = html.slice(newsStart);

const re = /data:image\/(jpeg|jpg|png|webp|gif|svg\+xml);base64,([A-Za-z0-9+/=]+)/g;
let i = 0, m;
const written = [];

while ((m = re.exec(newsHtml)) !== null) {
  i++;
  const ext = m[1].replace('jpeg', 'jpg').replace('svg+xml', 'svg');
  const buf = Buffer.from(m[2], 'base64');
  const filename = `news-${String(i).padStart(2, '0')}.${ext}`;
  fs.writeFileSync(path.join(OUT_DIR, filename), buf);
  written.push({ filename, size: (buf.length / 1024).toFixed(1) + ' KB' });
}

console.log(`Extracted ${written.length} news images:`);
for (const w of written) console.log(`  Newscard/${w.filename}  (${w.size})`);
