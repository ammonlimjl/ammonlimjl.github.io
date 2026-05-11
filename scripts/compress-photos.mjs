// Compress every photo on the site. Runs in-place — replaces the original with
// a web-optimised JPEG. PNGs (which Sharp keeps lossless by default) get
// converted to JPEG when the source is a photo.
//
// Originals are safe in Git history — git checkout HEAD~1 -- <path> recovers
// any file at its previous quality if you ever need to.
//
// Run: `node scripts/compress-photos.mjs` (or `npm run compress`)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { glob } from 'node:fs/promises';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// Per-bucket compression settings. Width is max — Sharp keeps aspect ratio.
const RULES = [
  // Hero (full-bleed desktop, full-screen mobile)
  { pattern: 'DSC02974_IJFR.jpg',                  width: 1800, quality: 80 },
  { pattern: 'DSC03210_IJFR.jpg',                  width: 1800, quality: 80 },
  // Parallax drone shots (banner, decorative)
  { pattern: 'punggol-drone.jpg',                  width: 1600, quality: 78 },
  { pattern: 'bishan-drone.jpg',                   width: 1600, quality: 78 },
  // Active-listing hero photos (max ~340px card, 2x for retina = 680, give some headroom)
  { pattern: 'Listings/*/hero.*',                  width: 1100, quality: 80, convertToJpg: true },
  // Newscard images (already smallish, mild re-encode + downscale)
  { pattern: 'Newscard/news-*.jpg',                width: 720,  quality: 78 },
  { pattern: 'Newscard/*.jpeg',                    width: 720,  quality: 78 },
  { pattern: 'Newscard/*.png',                     width: 720,  quality: 78, convertToJpg: true },
  { pattern: 'Newscard/*.webp',                    width: 720,  quality: 78, convertToJpg: true },
  // Past-cases / Track Records (used in horizontal scroll cards, max 300px width on desktop)
  { pattern: 'Track Records/*.jpg',                width: 1000, quality: 78 },
  { pattern: 'Track Records/*.jpeg',               width: 1000, quality: 78 },
];

async function* findFiles(pattern) {
  // glob is async iterator in Node 22+; fall back to manual walk if needed.
  for await (const p of glob(pattern, { cwd: ROOT })) {
    yield path.join(ROOT, p);
  }
}

async function fileSize(p) {
  try { return (await fs.stat(p)).size; } catch { return 0; }
}

function fmt(bytes) {
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(2) + ' MB';
  if (bytes >= 1024)        return (bytes / 1024).toFixed(1) + ' KB';
  return bytes + ' B';
}

async function compress(filePath, rule) {
  const ext = path.extname(filePath).toLowerCase();
  const isPhoto = /\.(jpe?g|png|webp)$/.test(ext);
  if (!isPhoto) return null;

  const before = await fileSize(filePath);
  const buf = await fs.readFile(filePath);
  let pipeline = sharp(buf).rotate(); // honour EXIF orientation

  const meta = await sharp(buf).metadata();
  if (meta.width && meta.width > rule.width) {
    pipeline = pipeline.resize({ width: rule.width, withoutEnlargement: true });
  }

  // Output format: convert PNG/WebP to JPG if requested OR if it's a clear photo
  const outIsJpg = rule.convertToJpg || /\.jpe?g$/i.test(ext);
  let outPath = filePath;
  let outBuf;

  if (outIsJpg) {
    outBuf = await pipeline.jpeg({ quality: rule.quality, mozjpeg: true, progressive: true }).toBuffer();
    if (!/\.jpe?g$/i.test(ext)) {
      outPath = filePath.replace(/\.(png|webp)$/i, '.jpg');
    }
  } else if (ext === '.png') {
    outBuf = await pipeline.png({ compressionLevel: 9, palette: true }).toBuffer();
  } else if (ext === '.webp') {
    outBuf = await pipeline.webp({ quality: rule.quality }).toBuffer();
  } else {
    return null;
  }

  await fs.writeFile(outPath, outBuf);
  // If extension changed, delete the original
  if (outPath !== filePath) await fs.unlink(filePath);

  const after = outBuf.length;
  return { before, after, in: filePath, out: outPath };
}

let totalBefore = 0, totalAfter = 0, count = 0;

for (const rule of RULES) {
  console.log(`\n• ${rule.pattern} (max ${rule.width}px, q${rule.quality})`);
  for await (const file of findFiles(rule.pattern)) {
    try {
      const r = await compress(file, rule);
      if (!r) continue;
      const rel = path.relative(ROOT, r.in);
      const renamed = r.out !== r.in ? ` → ${path.basename(r.out)}` : '';
      const pct = r.before ? ((1 - r.after / r.before) * 100).toFixed(0) : 0;
      console.log(`  ${rel.padEnd(60)} ${fmt(r.before).padStart(10)} → ${fmt(r.after).padStart(10)}  (-${pct}%)${renamed}`);
      totalBefore += r.before;
      totalAfter += r.after;
      count++;
    } catch (e) {
      console.error(`  ! ${file}:`, e.message);
    }
  }
}

console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
console.log(`Processed ${count} files`);
console.log(`Total: ${fmt(totalBefore)} → ${fmt(totalAfter)}  (-${((1 - totalAfter / totalBefore) * 100).toFixed(1)}%)`);
