// Pulls last 12 months of HDB resale transactions from data.gov.sg,
// computes P25/P50/P75 per (town, flat-type), and writes data/valuation.json.
//
// Run: `node scripts/refresh-valuation.mjs`
// Auto-runs monthly via .github/workflows/refresh-valuation.yml
//
// data.gov.sg public dataset (resource_id is stable):
//   d_8b84c4ee58e3cfc0ece0d773c8ca6abc — HDB Resale Flat Prices (Jan-2017 onwards)

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT_PATH = path.resolve(__dirname, '..', 'data', 'valuation.json');

const RESOURCE_ID = 'd_8b84c4ee58e3cfc0ece0d773c8ca6abc';
const API = `https://data.gov.sg/api/action/datastore_search`;
const PAGE = 5000;
const WINDOW_MONTHS = 12;

const TOWNS = [
  'Punggol', 'Sengkang', 'Tampines', 'Toa Payoh', 'Bishan', 'Bedok',
  'Pasir Ris', 'Hougang', 'Ang Mo Kio', 'Yishun', 'Woodlands', 'Sembawang',
  'Bukit Batok', 'Bukit Panjang', 'Choa Chu Kang', 'Jurong East', 'Jurong West',
  'Clementi', 'Queenstown', 'Bukit Merah', 'Kallang/Whampoa', 'Geylang',
  'Marine Parade', 'Serangoon',
];

const FLAT_TYPES = {
  '3-Room': '3 ROOM',
  '4-Room': '4 ROOM',
  '5-Room': '5 ROOM',
  'Exec':   'EXECUTIVE',
};

const FLOOR_ADJUSTMENT = {
  'Low (1-3)':  -0.03,
  'Mid (4-9)':   0.00,
  'High (10+)':  0.03,
};

function monthFloor(d) {
  return d.toISOString().slice(0, 7); // YYYY-MM
}

function windowStart() {
  const d = new Date();
  d.setMonth(d.getMonth() - WINDOW_MONTHS);
  return monthFloor(d);
}

function percentile(sorted, p) {
  if (!sorted.length) return null;
  const idx = (sorted.length - 1) * (p / 100);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

async function fetchAll() {
  const start = windowStart();
  const all = [];
  let offset = 0;

  console.log(`Fetching HDB resale transactions from ${start} onwards...`);

  while (true) {
    const url = `${API}?resource_id=${RESOURCE_ID}&limit=${PAGE}&offset=${offset}&sort=month%20desc`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const records = json?.result?.records ?? [];
    if (!records.length) break;

    let stopped = false;
    for (const r of records) {
      if (r.month < start) { stopped = true; continue; }
      all.push(r);
    }

    process.stdout.write(`\r  fetched ${all.length} records (offset ${offset + records.length})`);

    if (stopped || records.length < PAGE) break;
    offset += PAGE;
  }

  console.log(`\nDone. ${all.length} records in window.`);
  return all;
}

function bucket(records) {
  const out = {};
  for (const r of records) {
    const town = r.town?.trim();
    const flat = r.flat_type?.trim().toUpperCase();
    const price = Number(r.resale_price);
    if (!town || !flat || !Number.isFinite(price)) continue;

    const ourTown = TOWNS.find(t => t.toUpperCase() === town);
    if (!ourTown) continue;

    const ourFlat = Object.entries(FLAT_TYPES).find(([_, v]) => v === flat)?.[0];
    if (!ourFlat) continue;

    out[ourTown] ??= {};
    out[ourTown][ourFlat] ??= [];
    out[ourTown][ourFlat].push(price / 1000); // store in $K
  }
  return out;
}

function summarize(buckets) {
  const result = {};
  for (const town of Object.keys(buckets).sort()) {
    result[town] = {};
    for (const flat of Object.keys(FLAT_TYPES)) {
      const arr = (buckets[town][flat] ?? []).slice().sort((a, b) => a - b);
      if (!arr.length) continue;
      result[town][flat] = {
        p25: Math.round(percentile(arr, 25)),
        p50: Math.round(percentile(arr, 50)),
        p75: Math.round(percentile(arr, 75)),
        count: arr.length,
      };
    }
  }
  return result;
}

async function main() {
  const records = await fetchAll();
  const buckets = bucket(records);
  const byTownAndType = summarize(buckets);

  // Sanity check: warn if any covered town/type has no data
  const missing = [];
  for (const t of TOWNS) {
    for (const f of Object.keys(FLAT_TYPES)) {
      if (!byTownAndType[t]?.[f]) missing.push(`${t} / ${f}`);
    }
  }
  if (missing.length) {
    console.warn(`Missing data for ${missing.length} town/type combos:\n  ${missing.join('\n  ')}`);
  }

  // Preserve existing seed values for any missing buckets so the UI never breaks
  let existing = null;
  try {
    existing = JSON.parse(await fs.readFile(OUT_PATH, 'utf8'));
  } catch {}

  if (existing?.byTownAndType) {
    for (const t of TOWNS) {
      for (const f of Object.keys(FLAT_TYPES)) {
        if (!byTownAndType[t]?.[f] && existing.byTownAndType[t]?.[f]) {
          byTownAndType[t] ??= {};
          byTownAndType[t][f] = { ...existing.byTownAndType[t][f], stale: true };
        }
      }
    }
  }

  const output = {
    _meta: {
      description: 'Pre-baked HDB resale price percentiles for the valuation tool. Values are P25 / P50 / P75 in $K.',
      source: `data.gov.sg — ${RESOURCE_ID} (HDB Resale Flat Prices)`,
      lastUpdated: new Date().toISOString().slice(0, 10),
      lastUpdatedNote: `Generated by scripts/refresh-valuation.mjs from last ${WINDOW_MONTHS} months of transactions.`,
      windowMonths: WINDOW_MONTHS,
      totalRecords: records.length,
    },
    floorAdjustment: FLOOR_ADJUSTMENT,
    byTownAndType,
  };

  await fs.writeFile(OUT_PATH, JSON.stringify(output, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`Towns with data: ${Object.keys(byTownAndType).length}`);
}

main().catch((err) => {
  console.error('refresh-valuation failed:', err);
  process.exit(1);
});
