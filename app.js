/* ════════════════════════════════════════════════════════════════════════
   Ammon Lim — Singapore HDB Specialist
   All client-side interactivity. Loaded with `defer`, runs after DOMContentLoaded.
   ════════════════════════════════════════════════════════════════════════ */

const WHATSAPP_NUMBER = '6580989441';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xwvrogev';

const waUrl = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Encode path segments (keeps '/') for URLs containing spaces
const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

// Lightweight HTML escape for safe data interpolation
function esc(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Cached fetch helper for data/*.json
const cache = new Map();
async function loadJSON(path) {
  if (cache.has(path)) return cache.get(path);
  const p = fetch(path).then(r => {
    if (!r.ok) throw new Error(`Failed to load ${path}: ${r.status}`);
    return r.json();
  });
  cache.set(path, p);
  return p;
}


/* ─── NAV / DRAWER / SMOOTH SCROLL ─────────────────────────────────────── */

const hamburgerBtn = $('#hamburger-btn');
const mobileDrawer = $('#mobile-drawer');
const navCta = $('#nav-cta');

function closeDrawer() {
  hamburgerBtn?.classList.remove('open');
  mobileDrawer?.classList.remove('open');
  document.body.style.overflow = '';
}
hamburgerBtn?.addEventListener('click', () => {
  const isOpen = mobileDrawer.classList.toggle('open');
  hamburgerBtn.classList.toggle('open', isOpen);
  document.body.style.overflow = isOpen ? 'hidden' : '';
});
$$('.drawer-link').forEach(link => link.addEventListener('click', closeDrawer));

function updateNav() {
  const isMobile = window.innerWidth <= 768;
  if (hamburgerBtn) hamburgerBtn.style.display = isMobile ? 'flex' : 'none';
  if (navCta) navCta.style.display = isMobile ? 'none' : '';
  if (!isMobile) closeDrawer();
}
updateNav();
window.addEventListener('resize', updateNav);

// Smooth scroll for hash links
document.addEventListener('click', (e) => {
  const a = e.target.closest('a[href^="#"]');
  if (!a) return;
  const href = a.getAttribute('href');
  if (href.length < 2) return;
  const target = document.querySelector(href);
  if (target) {
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
});

// Sticky nav shadow on scroll
window.addEventListener('scroll', () => {
  const nav = document.querySelector('nav');
  if (!nav) return;
  nav.style.boxShadow = window.scrollY > 10 ? '0 2px 20px rgba(0,0,0,0.08)' : 'none';
}, { passive: true });


/* ─── TRACK RECORD: render listings + auto-scroll ──────────────────────── */

async function renderListings() {
  const grid = $('#listingsGrid');
  if (!grid) return;
  let data;
  try { data = await loadJSON('data/listings.json'); }
  catch (e) { console.warn('Listings load failed', e); return; }

  grid.innerHTML = data.cases.map(c => `
    <article class="listing-card">
      <div class="listing-img">
        <img class="listing-img-bg" src="${encodePath(c.photo)}" alt="${esc(c.alt || '')}" loading="lazy">
        <span class="badge-sold">✓ ${esc(c.deal)}</span>
      </div>
      <div class="listing-body">
        <div class="listing-location"><span class="listing-loc-dot"></span><span class="sans">${esc(c.town)} · ${esc(c.block)}</span></div>
        <div class="listing-achievement">
          <span class="ach-label">${esc(c.achievementLabel)}</span>
          <span class="ach-value">${esc(c.achievementValue)}</span>
        </div>
        <div class="listing-card-footer sans">
          <span class="listing-flat-type">${esc(c.flatType)}</span>
        </div>
      </div>
    </article>
  `).join('');

  setupListingsScroll(grid);
}

function setupListingsScroll(el) {
  // Double for seamless infinite loop
  Array.from(el.children).forEach(card => {
    const clone = card.cloneNode(true);
    clone.setAttribute('aria-hidden', 'true');
    el.appendChild(clone);
  });

  let paused = false;
  let arrowAnimating = false;
  let prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function checkLoop() {
    const half = el.scrollWidth / 2;
    if (el.scrollLeft >= half) {
      el.style.scrollBehavior = 'auto';
      el.scrollLeft -= half;
      void el.offsetLeft;
    } else if (el.scrollLeft < 0) {
      el.style.scrollBehavior = 'auto';
      el.scrollLeft += half;
      void el.offsetLeft;
    }
  }

  function step() {
    if (!paused && !arrowAnimating && !prefersReduced) {
      el.scrollLeft += 0.6;
      checkLoop();
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  el.addEventListener('mouseenter', () => { paused = true; });
  el.addEventListener('mouseleave', () => { paused = false; });
  el.addEventListener('touchstart', () => { paused = true; }, { passive: true });
  el.addEventListener('touchend',   () => { setTimeout(() => { checkLoop(); paused = false; }, 400); });
  el.addEventListener('scroll', checkLoop, { passive: true });

  let isDown = false, startX, startScroll;
  el.addEventListener('mousedown', e => {
    isDown = true; paused = true;
    el.style.scrollBehavior = 'auto';
    startX = e.pageX; startScroll = el.scrollLeft;
  });
  window.addEventListener('mouseup', () => { if (isDown) { isDown = false; paused = false; } });
  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    el.scrollLeft = startScroll - (e.pageX - startX);
    checkLoop();
  });

  window.listingsScroll = function(dir) {
    if (arrowAnimating) return;
    arrowAnimating = true; paused = true;
    const from = el.scrollLeft, to = from + dir * 320;
    const dur = 380, t0 = performance.now();
    const ease = t => t < 0.5 ? 2*t*t : -1 + (4 - 2*t)*t;
    (function frame(now) {
      const p = Math.min((now - t0) / dur, 1);
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = from + (to - from) * ease(p);
      checkLoop();
      if (p < 1) requestAnimationFrame(frame);
      else { arrowAnimating = false; paused = false; }
    })(performance.now());
  };
}


/* ─── HDB NEWS: render from JSON ───────────────────────────────────────── */

async function renderNews() {
  const scroll = $('#newsScroll');
  if (!scroll) return;
  let data;
  try { data = await loadJSON('data/news.json'); }
  catch (e) { console.warn('News load failed', e); return; }

  scroll.innerHTML = data.items.map(n => {
    const tagStyle = n.tagColor ? `style="background:${esc(n.tagColor)};"` : '';
    const img = n.image
      ? `<img class="news-img" src="${encodePath(n.image)}" alt="${esc(n.title)}" loading="lazy">`
      : `<div class="news-img-gradient" aria-hidden="true"></div>`;
    const myTake = n.myTake?.trim()
      ? `<div class="news-mytake"><span class="news-mytake-label">Ammon's take</span>${esc(n.myTake)}</div>`
      : '';
    return `
      <article class="news-card">
        <div class="news-img-wrap">
          ${img}
          <span class="news-tag" ${tagStyle}>${esc(n.tag)}</span>
        </div>
        <div class="news-body">
          <div class="news-date sans">${esc(n.date)}</div>
          <div class="news-title">${esc(n.title)}</div>
          <div class="news-excerpt sans">${esc(n.excerpt)}</div>
          ${myTake}
          <div class="news-source sans">${esc(n.source)}</div>
        </div>
      </article>
    `;
  }).join('');

  setupNewsDragScroll(scroll);
}

function setupNewsDragScroll(el) {
  let isDown = false, startX, scrollLeft;
  el.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; });
  el.addEventListener('mouseleave', () => { isDown = false; });
  el.addEventListener('mouseup', () => { isDown = false; });
  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    el.scrollLeft = scrollLeft - ((e.pageX - el.offsetLeft) - startX);
  });
}

window.newsScroll = function(dir) {
  const el = $('#newsScroll');
  if (el) el.scrollBy({ left: dir * 380, behavior: 'smooth' });
};


/* ─── REVIEWS slider ───────────────────────────────────────────────────── */

window.slideReviews = function(dir) {
  const scroll = $('#reviews-scroll');
  if (!scroll) return;
  const card = scroll.querySelector('.review-card');
  if (!card) return;
  scroll.scrollBy({ left: dir * (card.offsetWidth + 20) * 2, behavior: 'smooth' });
};


/* ─── COVERAGE MAP: real Singapore planning areas from GeoJSON ─────────── */

const VB_W = 1000, VB_H = 540;

// Geographic bounds for Singapore main island + nearby (manually tuned to fit nicely in viewbox)
const SG_BOUNDS = { lngMin: 103.602, lngMax: 104.082, latMin: 1.158, latMax: 1.478 };

// Equirectangular projection: lng/lat → SVG x/y
function project(lng, lat) {
  const x = ((lng - SG_BOUNDS.lngMin) / (SG_BOUNDS.lngMax - SG_BOUNDS.lngMin)) * VB_W;
  const y = ((SG_BOUNDS.latMax - lat) / (SG_BOUNDS.latMax - SG_BOUNDS.latMin)) * VB_H;
  return [x, y];
}

// Compute polygon centroid (for label placement) — averages all polygon vertices
function polygonCentroid(rings) {
  let sx = 0, sy = 0, n = 0;
  for (const ring of rings) {
    for (const [lng, lat] of ring) {
      const [x, y] = project(lng, lat);
      sx += x; sy += y; n++;
    }
  }
  return n ? [sx / n, sy / n] : [VB_W / 2, VB_H / 2];
}

// Convert one Polygon's rings to an SVG path string
function ringsToPath(rings) {
  return rings.map(ring => {
    const pts = ring.map(([lng, lat]) => {
      const [x, y] = project(lng, lat);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });
    return 'M' + pts.join('L') + 'Z';
  }).join(' ');
}

// Convert a GeoJSON geometry (Polygon or MultiPolygon) to a single SVG path string
function geometryToPath(geom) {
  if (!geom) return '';
  if (geom.type === 'Polygon')      return ringsToPath(geom.coordinates);
  if (geom.type === 'MultiPolygon') return geom.coordinates.map(ringsToPath).join(' ');
  return '';
}

// Town label overrides — only labels for areas worth naming on the map
const LABEL_OVERRIDES = {
  // Move some labels off-center to avoid coastline / cluster overlap
  'PUNGGOL':       { dy: -2 },
  'SENGKANG':      { dy:  4 },
  'TAMPINES':      { dy:  0 },
  'BEDOK':         { dy:  6 },
  'BISHAN':        { dy: -2 },
  'TOA PAYOH':     { dy:  2 },
  'ANG MO KIO':    { dy: -4 },
  'BUKIT MERAH':   { dy:  4 },
  'QUEENSTOWN':    { dy: -2 },
  'KALLANG':       { dy:  2 },
  'GEYLANG':       { dy:  2 },
  'MARINE PARADE': { dy:  6 },
};

// Hide tiny / non-HDB / water areas from labelling
const HIDE_LABELS = new Set([
  'CENTRAL WATER CATCHMENT', 'WESTERN WATER CATCHMENT', 'SUNGEI KADUT', 'LIM CHU KANG',
  'MANDAI', 'SIMPANG', 'SELETAR', 'NORTH-EASTERN ISLANDS', 'CHANGI BAY', 'CHANGI',
  'TENGAH', 'TUAS', 'PIONEER', 'BOON LAY', 'WESTERN ISLANDS', 'SOUTHERN ISLANDS',
  'STRAITS VIEW', 'MARINA EAST', 'MARINA SOUTH', 'MUSEUM', 'SINGAPORE RIVER',
  'DOWNTOWN CORE', 'NEWTON', 'ORCHARD', 'ROCHOR', 'RIVER VALLEY', 'TANGLIN',
  'OUTRAM', 'NOVENA', 'PAYA LEBAR', 'BUKIT TIMAH',
]);

async function renderCoverageMap() {
  const svg = $('#coverage-map');
  const detail = $('#map-detail');
  if (!svg || !detail) return;

  let cov, valData, geo;
  try {
    [cov, valData, geo] = await Promise.all([
      loadJSON('data/coverage.json'),
      loadJSON('data/valuation.json').catch(() => null),
      loadJSON('data/singapore-planning-simplified.geojson'),
    ]);
  }
  catch (e) { console.warn('Coverage load failed', e); return; }

  const regions = cov.regions;
  const areaToRegion = cov.areaToRegion;
  const uraRegions = cov.uraRegions;
  const areaToCovId = {}; // GeoJSON area name → coverage region id
  for (const r of regions) for (const a of (r.areas || [])) areaToCovId[a] = r.id;

  let activeId = 'sp';

  function svgContent() {
    const features = geo.features.map(f => {
      const name = (f.properties?.name || '').toUpperCase();
      const path = geometryToPath(f.geometry);
      if (!path) return null;
      const region = areaToRegion[name] || 'CENTRAL';
      const baseFill = uraRegions[region]?.color || '#EAE1CB';
      const covId = areaToCovId[name];
      const covRegion = covId ? regions.find(r => r.id === covId) : null;
      const isCore = covRegion?.tier === 'core';
      const isActive = covId === activeId;
      const centroid = polygonCentroid(
        f.geometry.type === 'MultiPolygon'
          ? f.geometry.coordinates.flat()
          : f.geometry.coordinates
      );
      return { name, path, baseFill, covId, isCore, isActive, centroid };
    }).filter(Boolean);

    // Sort: regular areas first, active last (so active draws on top)
    features.sort((a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));

    return `
      <defs>
        <filter id="labelShadow">
          <feMorphology in="SourceAlpha" operator="dilate" radius="2"/>
          <feGaussianBlur stdDeviation="0.4"/>
          <feFlood flood-color="#fff" flood-opacity="0.92"/>
          <feComposite in2="SourceAlpha" operator="in"/>
          <feMerge><feMergeNode/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <pattern id="seaPattern" x="0" y="0" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill="#dfe9f0"/>
          <path d="M0,7 Q3.5,4 7,7 T14,7" stroke="#c8d6e0" stroke-width="0.5" fill="none" opacity="0.6"/>
        </pattern>
      </defs>

      <!-- Sea (subtle wave pattern) -->
      <rect width="${VB_W}" height="${VB_H}" fill="url(#seaPattern)"/>

      <!-- Sea labels for atmosphere -->
      <g font-family="'Georgia',serif" fill="#7896a8" font-size="14" font-style="italic" opacity="0.75">
        <text x="${VB_W - 18}" y="${VB_H - 28}" text-anchor="end">Singapore Strait</text>
        <text x="22" y="22" letter-spacing="3" font-style="normal" font-size="11" font-weight="700" fill="#9d8758">SINGAPORE</text>
        <text x="${VB_W / 2}" y="22" text-anchor="middle" font-size="13" fill="#7896a8">Johor Strait</text>
      </g>

      <!-- All planning area polygons -->
      ${features.map(f => {
        const inactiveStroke = '#b9a378';
        const stroke = f.isActive ? '#EA580C' : (f.isCore ? '#EA580C' : inactiveStroke);
        const strokeWidth = f.isActive ? 3 : (f.isCore ? 1.6 : 0.7);
        const fill = f.isActive
          ? '#FED7AA'
          : (f.isCore ? '#FCE2C8' : f.baseFill);
        const className = `map-area ${f.covId ? 'is-clickable' : ''} ${f.isCore ? 'is-core' : ''} ${f.isActive ? 'is-active' : ''}`;
        return `<path class="${className}" data-name="${esc(f.name)}" data-id="${esc(f.covId || '')}" d="${f.path}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" stroke-linejoin="round"/>`;
      }).join('')}

      <!-- Town labels (only for HDB towns we cover) -->
      ${features.filter(f => !HIDE_LABELS.has(f.name)).map(f => {
        const [cx, cy] = f.centroid;
        const override = LABEL_OVERRIDES[f.name] || {};
        const fontSize = f.isCore ? 12 : 10.5;
        const weight   = f.isCore ? 700  : 600;
        const fill     = f.isActive ? '#EA580C' : '#2a1f15';
        // Title-case the name
        const display = f.name.split(/[\s-]/).map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
        return `<text class="map-label" x="${cx + (override.dx || 0)}" y="${cy + (override.dy || 0)}" text-anchor="middle" font-size="${fontSize}" font-weight="${weight}" fill="${fill}" font-family="system-ui,-apple-system,sans-serif" filter="url(#labelShadow)" pointer-events="none">${esc(display)}</text>`;
      }).join('')}
    `;
  }

  // Pull median resale prices for the active town from valuation.json
  function priceSnapshotHTML(r) {
    if (!valData?.byTownAndType) return '';
    const town = r.valuationTown;
    const bucket = valData.byTownAndType?.[town];
    if (!bucket) return '';
    const types = ['3-Room', '4-Room', '5-Room'];
    const fmt = (k) => k >= 1000 ? '$' + (k / 1000).toFixed(2) + 'M' : '$' + Math.round(k) + 'K';
    const cells = types
      .map(t => {
        const b = bucket[t];
        if (!b) return null;
        return `<div class="map-price-cell"><div class="map-price-type">${t}</div><div class="map-price-val">${fmt(b.p50)}</div></div>`;
      })
      .filter(Boolean)
      .join('');
    if (!cells) return '';
    return `
      <div class="map-detail-row map-detail-prices">
        <span class="map-detail-label">Median resale (last 12 mo)</span>
        <div class="map-price-grid">${cells}</div>
      </div>
    `;
  }

  function detailHTML() {
    const r = regions.find(x => x.id === activeId);
    if (!r) return '';
    const tier = r.tier === 'core' ? 'CORE SPECIALTY' : 'ACTIVE COVERAGE';
    const angle = r.marketAngle ? `<div class="map-detail-stats">${esc(r.marketAngle)}</div>` : '';
    const conn = r.connectivity ? `
      <div class="map-detail-row">
        <span class="map-detail-label">Connectivity</span>
        <span class="map-detail-val">${esc(r.connectivity)}</span>
      </div>` : '';
    const projects = r.projects ? `
      <div class="map-detail-row">
        <span class="map-detail-label">Key landmarks</span>
        <span class="map-detail-val">${esc(r.projects)}</span>
      </div>` : '';
    const schools = r.schools ? `
      <div class="map-detail-row">
        <span class="map-detail-label">Schools nearby</span>
        <span class="map-detail-val">${esc(r.schools)}</span>
      </div>` : '';
    const prices = priceSnapshotHTML(r);
    const shortName = r.name.split(' & ')[0].split(',')[0].split(' / ')[0];
    return `
      <div class="map-detail-tier">${tier}</div>
      <div class="map-detail-name">${esc(r.name)}</div>
      ${angle}
      ${prices}
      ${conn}
      ${projects}
      ${schools}
      <div class="map-detail-cta">
        <button class="map-detail-cta-btn" data-action="goto-valuation" data-town="${esc(r.valuationTown || '')}">
          ⚡ Get full valuation for ${esc(shortName)}
        </button>
      </div>
    `;
  }

  function rerender() {
    svg.innerHTML = svgContent();
    detail.innerHTML = detailHTML();
  }

  svg.addEventListener('click', (e) => {
    const area = e.target.closest('.map-area');
    if (!area) return;
    const id = area.dataset.id;
    if (!id) return; // non-covered area (e.g., Tuas, Marina South)
    activeId = id;
    rerender();
  });

  detail.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action="goto-valuation"]');
    if (!btn) return;
    const town = btn.dataset.town;
    if (town) selectValuationTown(town);
    document.getElementById('valuation')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  rerender();
}

// Imperatively set the valuation tool's town (called from map "Get valuation for X" CTA)
function selectValuationTown(town) {
  if (!VAL_STATE.data) return;
  if (!VAL_STATE.data.byTownAndType?.[town]) return;
  VAL_STATE.town = town;
  const root = document.getElementById('val-towns');
  if (!root) return;
  root.querySelectorAll('.val-chip').forEach(c => {
    const active = c.dataset.val === town;
    c.classList.toggle('is-active', active);
    c.setAttribute('aria-checked', active);
  });
  // Reset stale result
  const result = $('#val-result');
  if (result) { result.hidden = true; result.innerHTML = ''; }
}


/* ─── VALUATION TOOL ───────────────────────────────────────────────────── */

const FLAT_TYPES = ['3-Room', '4-Room', '5-Room', 'Exec'];
const FLOORS = ['Low (1-3)', 'Mid (4-9)', 'High (10+)'];

const VAL_STATE = {
  data: null,
  town: null,
  type: '4-Room',
  floor: 'Mid (4-9)',
};

function fmtPrice(k) {
  if (k >= 1000) return '$' + (k / 1000).toFixed(2) + 'M';
  return '$' + Math.round(k) + 'K';
}

function buildValChips(rootId, options, key) {
  const root = $('#' + rootId);
  if (!root) return;
  root.innerHTML = options.map(opt => `
    <button type="button" class="val-chip${VAL_STATE[key] === opt ? ' is-active' : ''}" data-val="${esc(opt)}" role="radio" aria-checked="${VAL_STATE[key] === opt}">${esc(opt)}</button>
  `).join('');
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('.val-chip');
    if (!btn) return;
    VAL_STATE[key] = btn.dataset.val;
    root.querySelectorAll('.val-chip').forEach(c => {
      const active = c.dataset.val === VAL_STATE[key];
      c.classList.toggle('is-active', active);
      c.setAttribute('aria-checked', active);
    });
    // Reset result when inputs change
    const result = $('#val-result');
    if (result) { result.hidden = true; result.innerHTML = ''; }
  });
}

async function initValuationTool() {
  const card = $('#valuation');
  if (!card) return;

  let data;
  try { data = await loadJSON('data/valuation.json'); }
  catch (e) { console.warn('Valuation data load failed', e); return; }

  VAL_STATE.data = data;

  // Stamp the data freshness
  const stamp = $('#val-data-stamp');
  if (stamp && data._meta?.lastUpdated) {
    stamp.textContent = 'Last refreshed ' + data._meta.lastUpdated;
  }

  // Towns: derived from data keys
  const towns = Object.keys(data.byTownAndType).sort();
  VAL_STATE.town = towns.includes('Punggol') ? 'Punggol' : towns[0];

  buildValChips('val-towns',  towns,        'town');
  buildValChips('val-types',  FLAT_TYPES,   'type');
  buildValChips('val-floors', FLOORS,       'floor');

  $('#val-submit')?.addEventListener('click', computeValuation);
}

function computeValuation() {
  const data = VAL_STATE.data;
  if (!data) return;

  const bucket = data.byTownAndType?.[VAL_STATE.town]?.[VAL_STATE.type];
  const adj = data.floorAdjustment?.[VAL_STATE.floor] ?? 0;
  const result = $('#val-result');
  if (!result) return;

  if (!bucket) {
    result.hidden = false;
    result.innerHTML = `
      <div class="val-result-card">
        <div class="val-result-eyebrow">No data yet</div>
        <div class="val-result-meta">No recent transactions for ${esc(VAL_STATE.town)} · ${esc(VAL_STATE.type)} in our window. WhatsApp me for a manual estimate — I'll pull HDB data adjusted for your specific block.</div>
        <a class="map-detail-cta-btn" style="margin-top:14px;" href="${waUrl(`Hi Ammon, I'd like a valuation for ${VAL_STATE.town} ${VAL_STATE.type} (${VAL_STATE.floor}). The website didn't have data for this combo.`)}" target="_blank" rel="noopener">💬 WhatsApp Ammon for manual valuation</a>
      </div>`;
    return;
  }

  const lo = bucket.p25 * (1 + adj);
  const hi = bucket.p75 * (1 + adj);
  const mid = bucket.p50 * (1 + adj);
  const stale = bucket.stale ? `<div class="val-result-stale">⚠ Using cached data — refresh hasn't run for this combo recently.</div>` : '';
  const countNote = bucket.count > 0 ? `Based on <strong>${bucket.count}</strong> recent transactions in ${esc(VAL_STATE.town)}` : `Based on prevailing market levels for ${esc(VAL_STATE.town)}`;

  result.hidden = false;
  result.innerHTML = `
    <div class="val-result-card">
      <div class="val-result-eyebrow">Indicative range · public HDB data</div>
      <div class="val-result-range">${fmtPrice(lo)} — <em>${fmtPrice(hi)}</em></div>
      <div class="val-result-meta">${countNote} · adjusted for ${esc(VAL_STATE.floor)} floor.</div>
      ${stale}
      <div class="val-precise">
        <div class="val-precise-title">Want a precise number?</div>
        <div class="val-precise-copy">A free, personalized valuation from me — adjusted for your floor, layout, condition, and current buyer demand. <strong>Reply within 2 hours.</strong></div>
        <form class="val-precise-form" id="val-precise-form" autocomplete="on">
          <input type="text"  class="val-input-dark" name="name"  placeholder="Your name" autocomplete="name" required>
          <input type="tel"   class="val-input-dark" name="phone" placeholder="WhatsApp number (e.g. 9123 4567)" autocomplete="tel" required>
          <input type="text"  class="val-input-dark" name="block" placeholder="Block & street (e.g. 220B Sumang Walk)" required>
          <!-- honeypot -->
          <input type="text" name="company" tabindex="-1" autocomplete="off" class="hp-field" aria-hidden="true">
          <button type="submit" class="btn-primary val-precise-cta">💬 Get Precise Valuation via WhatsApp →</button>
        </form>
        <div class="val-precise-trust sans">✓ Private &amp; not shared · No spam, no pressure</div>
      </div>
    </div>
  `;

  $('#val-precise-form')?.addEventListener('submit', handleValuationLead);
}

function handleValuationLead(e) {
  e.preventDefault();
  const form = e.target;
  // Spam check: honeypot must be empty
  if (form.querySelector('[name="company"]').value.trim() !== '') return;

  // Basic rate-limit: max 1 submission per 30 seconds in this session
  const now = Date.now();
  const last = Number(sessionStorage.getItem('val_last') || '0');
  if (now - last < 30_000) {
    alert("Please wait a moment before submitting again.");
    return;
  }
  sessionStorage.setItem('val_last', String(now));

  const name  = form.name.value.trim();
  const phone = form.phone.value.trim();
  const block = form.block.value.trim();
  if (!name || !phone || !block) return;

  // Build the WhatsApp message
  const data = VAL_STATE.data;
  const bucket = data?.byTownAndType?.[VAL_STATE.town]?.[VAL_STATE.type];
  const range = bucket
    ? `${fmtPrice(bucket.p25 * (1 + (data.floorAdjustment?.[VAL_STATE.floor] ?? 0)))} — ${fmtPrice(bucket.p75 * (1 + (data.floorAdjustment?.[VAL_STATE.floor] ?? 0)))}`
    : 'no range — please advise';

  const message = [
    `Hi Ammon — free HDB valuation request.`,
    ``,
    `Name: ${name}`,
    `WhatsApp: ${phone}`,
    `Block / Street: ${block}`,
    ``,
    `Requested for: ${VAL_STATE.town} · ${VAL_STATE.type} · ${VAL_STATE.floor}`,
    `Indicative range from your tool: ${range}`,
    ``,
    `Looking for a precise valuation. Thanks!`,
  ].join('\n');

  // Open WhatsApp in a new tab
  window.open(waUrl(message), '_blank', 'noopener');

  // Show the "sent" confirmation in the result card
  const result = $('#val-result');
  if (result) {
    result.innerHTML = `
      <div class="val-result-card val-sent">
        <div class="val-sent-check">✓</div>
        <div class="val-result-eyebrow" style="color:#F97316;">Request prepared</div>
        <div class="val-sent-title">Thanks, ${esc(name)} —<br>your WhatsApp is opening now.</div>
        <div class="val-sent-meta">If WhatsApp didn't pop up, <a href="${waUrl(message)}" target="_blank" rel="noopener" style="color:#F97316;">tap here</a>. I'll reply within 2 hours.</div>
      </div>
    `;
  }
}


/* ─── CONTACT FORM (Formspree) ─────────────────────────────────────────── */

window.handleContact = async function(e) {
  e.preventDefault();
  const form = e.target;
  const btn = $('#contact-submit-btn');

  // Honeypot
  if (form.querySelector('[name="company"]')?.value.trim() !== '') return;

  // Rate-limit
  const now = Date.now();
  const last = Number(sessionStorage.getItem('contact_last') || '0');
  if (now - last < 30_000) {
    alert("Please wait a moment before submitting again.");
    return;
  }
  sessionStorage.setItem('contact_last', String(now));

  const name    = form.name.value.trim();
  const area    = form.area.value.trim();
  const message = form.message.value.trim();
  const email   = form.email.value.trim();
  const phone   = form.phone.value.trim();

  btn.textContent = 'Sending…';
  btn.disabled = true;

  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, area, email, phone, message, _subject: 'New enquiry from ' + name }),
    });
    if (res.ok) {
      form.innerHTML = `
        <div style="padding:24px 0;text-align:center;">
          <div style="font-size:48px;margin-bottom:14px;">✅</div>
          <h3 style="font-size:20px;font-weight:800;margin-bottom:10px;">Message sent!</h3>
          <p class="sans" style="color:var(--muted);font-size:13px;line-height:1.6;">Thanks ${esc(name)}, I'll reply within 24 hours. For something urgent, <a href="https://wa.me/${WHATSAPP_NUMBER}" target="_blank" rel="noopener" style="color:var(--orange);">WhatsApp me directly</a>.</p>
        </div>`;
    } else {
      btn.textContent = "Send Message — I'll Reply Within 24hrs 👋";
      btn.disabled = false;
      alert('Something went wrong. Please try again or WhatsApp me directly.');
    }
  } catch {
    btn.textContent = "Send Message — I'll Reply Within 24hrs 👋";
    btn.disabled = false;
    alert('Network error. Please check your connection and try again.');
  }
};


/* ─── SUBSCRIBE POPUP ──────────────────────────────────────────────────── */

let subscribeShown = false;
const newsSec = $('#news');
function checkSubscribePopup() {
  if (subscribeShown || !newsSec) return;
  const rect = newsSec.getBoundingClientRect();
  if (rect.top < window.innerHeight * 0.8) {
    subscribeShown = true;
    window.removeEventListener('scroll', checkSubscribePopup);
    setTimeout(() => {
      const overlay = $('#subscribe-overlay');
      if (overlay) overlay.style.display = 'flex';
    }, 600);
  }
}
window.addEventListener('scroll', checkSubscribePopup, { passive: true });
checkSubscribePopup();

window.closeSubscribe = function() {
  const overlay = $('#subscribe-overlay');
  if (overlay) overlay.style.display = 'none';
};

window.handleSubscribe = async function(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('input[type="email"]').value;
  const btn = form.querySelector('.subscribe-btn');
  btn.textContent = 'Sending…';
  btn.disabled = true;
  try {
    const res = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, _subject: 'New newsletter subscriber' }),
    });
    if (res.ok) {
      $('.subscribe-modal').innerHTML = `
        <div style="padding:20px 0;">
          <div style="font-size:52px;margin-bottom:14px;">✅</div>
          <h3 style="font-size:22px;font-weight:800;margin-bottom:10px;color:var(--text);">You're in!</h3>
          <p class="sans" style="color:var(--muted);font-size:13px;line-height:1.6;">Monthly HDB market reports headed to<br><strong>${esc(email)}</strong></p>
          <button onclick="closeSubscribe()" style="margin-top:24px;background:var(--orange);color:#fff;border:none;padding:12px 36px;border-radius:12px;font-size:14px;font-weight:700;cursor:pointer;">Close</button>
        </div>`;
    } else {
      btn.textContent = "Subscribe — It's Free";
      btn.disabled = false;
      alert('Something went wrong. Please try again.');
    }
  } catch {
    btn.textContent = "Subscribe — It's Free";
    btn.disabled = false;
    alert('Network error.');
  }
};


/* ─── BOOT ─────────────────────────────────────────────────────────────── */

renderListings();
renderNews();
renderCoverageMap();
initValuationTool();
