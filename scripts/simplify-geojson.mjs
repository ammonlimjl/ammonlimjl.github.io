// Simplify Singapore planning area GeoJSON for the coverage map.
//
// Input:  data/singapore-planning-areas.geojson (~4 MB, sourced from
//         github.com/yinshanyang/singapore — Master Plan 2014 planning areas)
// Output: data/singapore-planning-simplified.geojson (~150-300 KB)
//
// Uses Douglas-Peucker for line simplification + coordinate rounding.
// Run once after pulling the source GeoJSON; commit the simplified output.
//
// Usage: node scripts/simplify-geojson.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IN_PATH  = path.resolve(__dirname, '..', 'data', 'singapore-planning-areas.geojson');
const OUT_PATH = path.resolve(__dirname, '..', 'data', 'singapore-planning-simplified.geojson');

// Tolerance in degrees. ~0.0005° ≈ 55m at Singapore's latitude.
// Lower = more detail/larger file. 0.0006 is a good balance for a 1000px map.
const TOLERANCE = 0.0006;
const ROUND_DP = 5; // 5dp ≈ 1m precision; plenty for our viewport.

// Perpendicular distance from point P to line AB
function perpDistSq(p, a, b) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  if (dx === 0 && dy === 0) {
    const ex = p[0] - a[0], ey = p[1] - a[1];
    return ex*ex + ey*ey;
  }
  const t = ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx*dx + dy*dy);
  const tc = Math.max(0, Math.min(1, t));
  const px = a[0] + tc * dx, py = a[1] + tc * dy;
  const ex = p[0] - px, ey = p[1] - py;
  return ex*ex + ey*ey;
}

// Iterative Douglas-Peucker (avoids stack overflow on large rings)
function simplifyRing(points, tolerance) {
  if (points.length < 4) return points;
  const tolSq = tolerance * tolerance;
  const keep = new Uint8Array(points.length);
  keep[0] = 1;
  keep[points.length - 1] = 1;

  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [lo, hi] = stack.pop();
    let maxDist = 0, maxIdx = 0;
    const a = points[lo], b = points[hi];
    for (let i = lo + 1; i < hi; i++) {
      const d = perpDistSq(points[i], a, b);
      if (d > maxDist) { maxDist = d; maxIdx = i; }
    }
    if (maxDist > tolSq && maxIdx !== 0) {
      keep[maxIdx] = 1;
      stack.push([lo, maxIdx], [maxIdx, hi]);
    }
  }

  const out = [];
  for (let i = 0; i < points.length; i++) if (keep[i]) out.push(points[i]);
  return out;
}

function round(coord) {
  const m = Math.pow(10, ROUND_DP);
  return [Math.round(coord[0] * m) / m, Math.round(coord[1] * m) / m];
}

function simplifyPolygon(rings) {
  return rings.map(ring => {
    const simplified = simplifyRing(ring, TOLERANCE);
    return simplified.map(round);
  }).filter(ring => ring.length >= 4); // valid polygon needs ≥4 points
}

function simplifyGeometry(geom) {
  if (!geom) return geom;
  if (geom.type === 'Polygon') {
    return { ...geom, coordinates: simplifyPolygon(geom.coordinates) };
  }
  if (geom.type === 'MultiPolygon') {
    return {
      ...geom,
      coordinates: geom.coordinates
        .map(simplifyPolygon)
        .filter(poly => poly.length > 0),
    };
  }
  return geom;
}

const raw = JSON.parse(fs.readFileSync(IN_PATH, 'utf8'));
const inSize = fs.statSync(IN_PATH).size;

const out = {
  type: raw.type,
  features: raw.features.map(f => ({
    type: 'Feature',
    properties: { name: f.properties?.name || '' },
    geometry: simplifyGeometry(f.geometry),
  })),
};

// Compact JSON (no whitespace) for smallest size
fs.writeFileSync(OUT_PATH, JSON.stringify(out));
const outSize = fs.statSync(OUT_PATH).size;

console.log(`Input:  ${(inSize / 1024).toFixed(1)} KB (${raw.features.length} features)`);
console.log(`Output: ${(outSize / 1024).toFixed(1)} KB (${out.features.length} features)`);
console.log(`Reduction: ${((1 - outSize / inSize) * 100).toFixed(1)}%`);
