/* ════════════════════════════════════════════════════════════════════════
   Ammon Lim - Singapore HDB Specialist
   All client-side interactivity. Loaded with `defer`, runs after DOMContentLoaded.
   ════════════════════════════════════════════════════════════════════════ */

const WHATSAPP_NUMBER = '6580989441';
const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xwvrogev';

const waUrl = (text) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
const $  = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

// Encode path segments (keeps '/') for URLs containing spaces.
// Returns a root-absolute URL so it works from any page depth (/, /valuation/, …).
const encodePath = (p) => '/' + p.split('/').map(encodeURIComponent).join('/');

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
  try { data = await loadJSON('/data/listings.json'); }
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

  // Keep the position in a JS accumulator and assign it each frame.
  // Reading scrollLeft back every frame can round-trip to the same value
  // and freeze the crawl (browser quantises scroll positions).
  let pos = null;
  function step() {
    if (!paused && !arrowAnimating && !prefersReduced) {
      if (pos === null) pos = el.scrollLeft;
      pos += 0.6;
      const half = el.scrollWidth / 2;
      if (half > 0 && pos >= half) pos -= half;
      el.style.scrollBehavior = 'auto';
      el.scrollLeft = pos;
    } else {
      pos = null; // resync after user interaction
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


/* ─── ACTIVE LISTINGS: render from JSON ─────────────────────────────────── */

async function renderActiveListings() {
  const grid = $('#active-listings-grid');
  if (!grid) return;
  let data;
  try { data = await loadJSON('/data/listings-active.json'); }
  catch (e) { console.warn('Active listings load failed', e); return; }

  grid.innerHTML = data.listings.map(l => {
    const waText = `Hi Ammon, I'm interested in ${l.address} (${l.flatType}, ${l.priceFull}). Can we chat?`;
    const badges = (l.badges || []).slice(0, 3).map(b => `<span class="active-card-badge">${esc(b)}</span>`).join('');
    return `
      <article class="active-card">
        <a class="active-card-photo" href="${esc(l.propertyGuruUrl)}" target="_blank" rel="noopener" aria-label="View ${esc(l.address)} on PropertyGuru">
          <img class="active-card-img" src="${encodePath(l.hero)}" alt="${esc(l.address)} ${esc(l.flatType)} HDB for sale" loading="lazy">
          <span class="active-card-status">FOR SALE</span>
          <div class="active-card-badges">${badges}</div>
          <div class="active-card-price-overlay">
            <span class="price">${esc(l.price)}</span>
            <span class="psf">S$ ${l.psf} psf</span>
          </div>
        </a>
        <div class="active-card-body">
          <div class="active-card-town">${esc(l.town)}</div>
          <div class="active-card-addr">${esc(l.address)}</div>
          <div class="active-card-tagline">${esc(l.tagline)}</div>
          <div class="active-card-specs">
            <span class="active-card-spec"><span class="num">${esc(l.flatType)}</span></span>
            <span class="active-card-spec"><span class="num">${l.beds}</span> <span class="lbl">beds</span></span>
            <span class="active-card-spec"><span class="num">${l.baths}</span> <span class="lbl">bath</span></span>
            <span class="active-card-spec"><span class="num">${l.sqft}</span> <span class="lbl">sqft</span></span>
          </div>
          <div class="active-card-cta">
            <a class="active-card-btn active-card-btn-primary" href="${waUrl(waText)}" target="_blank" rel="noopener">💬 WhatsApp</a>
            <a class="active-card-btn active-card-btn-secondary" href="${esc(l.propertyGuruUrl)}" target="_blank" rel="noopener">View Listing →</a>
          </div>
        </div>
      </article>
    `;
  }).join('');

  setupActiveListingsDrag(grid);
}

function setupActiveListingsDrag(el) {
  let isDown = false, startX, scrollLeft;
  el.addEventListener('mousedown', e => { isDown = true; startX = e.pageX - el.offsetLeft; scrollLeft = el.scrollLeft; });
  el.addEventListener('mouseleave', () => { isDown = false; });
  el.addEventListener('mouseup',   () => { isDown = false; });
  el.addEventListener('mousemove', e => {
    if (!isDown) return;
    e.preventDefault();
    el.scrollLeft = scrollLeft - ((e.pageX - el.offsetLeft) - startX);
  });
}

window.activeListingsScroll = function(dir) {
  const el = $('#active-listings-grid');
  if (el) el.scrollBy({ left: dir * 360, behavior: 'smooth' });
};


/* ─── HDB NEWS: render from JSON ───────────────────────────────────────── */

async function renderNews() {
  const scroll = $('#newsScroll');
  if (!scroll) return;
  let data;
  try { data = await loadJSON('/data/news.json'); }
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

// Compute polygon centroid (for label placement) - averages all polygon vertices
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

// One callout pill per coverage REGION (not per polygon). All pills sit on
// the perimeter; a leader line connects each to its representative centroid.
// x/y are in viewBox coordinates (0..1000, 0..540).
const REGION_LABEL_PARK = {
  // Top edge (left → right)
  'wd':  { x: 130, y: 50,  label: 'Woodlands' },
  'sy':  { x: 350, y: 30,  label: 'Sembawang & Yishun' },
  'bat': { x: 580, y: 30,  label: 'Bishan · AMK · Toa Payoh' },
  'sp':  { x: 845, y: 50,  label: 'Sengkang & Punggol' },
  // Right edge (top → bottom)
  'pr':  { x: 935, y: 125, label: 'Pasir Ris' },
  'hg':  { x: 935, y: 200, label: 'Hougang' },
  'tb':  { x: 935, y: 280, label: 'Tampines & Bedok' },
  'sg':  { x: 935, y: 365, label: 'Serangoon' },
  'mp':  { x: 935, y: 450, label: 'Marine Parade' },
  // Bottom edge (right → left)
  'gl':  { x: 770, y: 522, label: 'Geylang' },
  'kl':  { x: 615, y: 522, label: 'Kallang/Whampoa' },
  'bm':  { x: 470, y: 522, label: 'Bukit Merah' },
  'qt':  { x: 325, y: 522, label: 'Queenstown' },
  'cle': { x: 170, y: 522, label: 'Clementi' },
  // Left edge (bottom → top)
  'jur': { x: 65,  y: 425, label: 'Jurong East & West' },
  'bb':  { x: 65,  y: 340, label: 'Bukit Batok' },
  'bp':  { x: 65,  y: 250, label: 'Bukit Panjang' },
  'cck': { x: 65,  y: 165, label: 'Choa Chu Kang' },
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
      loadJSON('/data/coverage.json'),
      loadJSON('/data/valuation.json').catch(() => null),
      loadJSON('/data/singapore-planning-simplified.geojson'),
    ]);
  }
  catch (e) { console.warn('Coverage load failed', e); return; }

  const regions = cov.regions;
  const areaToRegion = cov.areaToRegion;
  const uraRegions = cov.uraRegions;
  const areaToCovId = {}; // GeoJSON area name → coverage region id
  for (const r of regions) for (const a of (r.areas || [])) areaToCovId[a] = r.id;

  let activeId = 'sp';

  // Compute representative centroid for each region (avg of all area centroids)
  const regionCentroids = {};
  {
    const centroidsByArea = {};
    for (const f of geo.features) {
      const name = (f.properties?.name || '').toUpperCase();
      centroidsByArea[name] = polygonCentroid(
        f.geometry.type === 'MultiPolygon' ? f.geometry.coordinates.flat() : f.geometry.coordinates
      );
    }
    for (const r of regions) {
      const pts = (r.areas || []).map(a => centroidsByArea[a]).filter(Boolean);
      if (!pts.length) continue;
      const sx = pts.reduce((s, p) => s + p[0], 0) / pts.length;
      const sy = pts.reduce((s, p) => s + p[1], 0) / pts.length;
      regionCentroids[r.id] = [sx, sy];
    }
  }

  function svgContent() {
    const features = geo.features.map(f => {
      const name = (f.properties?.name || '').toUpperCase();
      const path = geometryToPath(f.geometry);
      if (!path) return null;
      const covId = areaToCovId[name];
      const isActive = covId === activeId;
      return { name, path, covId, isActive };
    }).filter(Boolean);

    // Sort: regular areas first, active last (so active draws on top with glow)
    features.sort((a, b) => (a.isActive ? 1 : 0) - (b.isActive ? 1 : 0));

    return `
      <defs>
        <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>

      <!-- Sea -->
      <rect width="${VB_W}" height="${VB_H}" fill="#eaf1f5"/>

      <!-- All planning area polygons (one clean cream, bolder borders) -->
      ${features.map(f => {
        const className = `map-area ${f.covId ? 'is-clickable' : ''} ${f.isActive ? 'is-active' : ''}`;
        return `<path class="${className}" data-name="${esc(f.name)}" data-id="${esc(f.covId || '')}" d="${f.path}" stroke-linejoin="round"/>`;
      }).join('')}

      <!-- One callout per region: dot + leader line + clickable pill -->
      ${regions.map(r => {
        const park = REGION_LABEL_PARK[r.id];
        const c = regionCentroids[r.id];
        if (!park || !c) return '';
        const [cx, cy] = c;
        const isActive = r.id === activeId;
        const display = park.label;
        const pillW = Math.max(70, display.length * 6.6 + 18);
        const pillH = 22;
        const bg = isActive ? '#FED7AA' : '#FFFFFF';
        const stroke = isActive ? '#EA580C' : '#3A200E';
        const textFill = isActive ? '#3A200E' : '#1C1A17';
        const lineStroke = isActive ? '#EA580C' : '#7a5d3a';
        const lineOpacity = isActive ? 1 : 0.7;
        return `
          <g class="map-region-callout ${isActive ? 'is-active' : ''}" data-id="${esc(r.id)}">
            <line x1="${cx}" y1="${cy}" x2="${park.x}" y2="${park.y}"
                  stroke="${lineStroke}" stroke-width="${isActive ? 1.4 : 1}"
                  stroke-dasharray="${isActive ? '0' : '3,2'}" opacity="${lineOpacity}" pointer-events="none"/>
            <circle cx="${cx}" cy="${cy}" r="4" fill="${isActive ? '#EA580C' : '#3A200E'}" pointer-events="none"/>
            <g class="map-region-pill">
              <rect x="${park.x - pillW/2}" y="${park.y - pillH/2}" width="${pillW}" height="${pillH}" rx="11"
                    fill="${bg}" stroke="${stroke}" stroke-width="${isActive ? 1.6 : 1}"/>
              <text x="${park.x}" y="${park.y + 4}" text-anchor="middle"
                    font-size="${isActive ? 12 : 11}" font-weight="700" fill="${textFill}"
                    font-family="system-ui,-apple-system,sans-serif">${esc(display)}</text>
            </g>
          </g>
        `;
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
        <a class="map-detail-cta-btn" href="/valuation/?town=${encodeURIComponent(r.valuationTown || '')}">
          ⚡ Get full valuation for ${esc(shortName)}
        </a>
      </div>
    `;
  }

  function rerender() {
    svg.innerHTML = svgContent();
    detail.innerHTML = detailHTML();
  }

  svg.addEventListener('click', (e) => {
    // Pill click takes priority - pills are at perimeter, easier to hit
    const callout = e.target.closest('.map-region-callout');
    if (callout) {
      const id = callout.dataset.id;
      if (id) { activeId = id; rerender(); }
      return;
    }
    // Polygon click as fallback
    const area = e.target.closest('.map-area');
    if (!area) return;
    const id = area.dataset.id;
    if (!id) return;
    activeId = id;
    rerender();
  });

  rerender();
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
  try { data = await loadJSON('/data/valuation.json'); }
  catch (e) { console.warn('Valuation data load failed', e); return; }

  VAL_STATE.data = data;

  // Stamp the data freshness
  const stamp = $('#val-data-stamp');
  if (stamp && data._meta?.lastUpdated) {
    stamp.textContent = 'Last refreshed ' + data._meta.lastUpdated;
  }

  // Towns: derived from data keys. ?town= in the URL (e.g. from the coverage
  // map CTA) preselects; otherwise default to Punggol.
  const towns = Object.keys(data.byTownAndType).sort();
  const urlTown = new URLSearchParams(location.search).get('town');
  VAL_STATE.town = (urlTown && towns.includes(urlTown)) ? urlTown
    : towns.includes('Punggol') ? 'Punggol' : towns[0];

  // Town: dropdown (long list)
  buildValTownSelect(towns);
  // Flat type & floor: chips (short lists)
  buildValChips('val-types',  FLAT_TYPES, 'type');
  buildValChips('val-floors', FLOORS,     'floor');

  $('#val-submit')?.addEventListener('click', computeValuation);
}

function buildValTownSelect(towns) {
  const sel = $('#val-town-select');
  if (!sel) return;
  sel.innerHTML = towns.map(t => `<option value="${esc(t)}"${VAL_STATE.town === t ? ' selected' : ''}>${esc(t)}</option>`).join('');
  sel.addEventListener('change', (e) => {
    VAL_STATE.town = e.target.value;
    const result = $('#val-result');
    if (result) { result.hidden = true; result.innerHTML = ''; }
  });
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
        <div class="val-result-meta">No recent transactions for ${esc(VAL_STATE.town)} · ${esc(VAL_STATE.type)} in our window. WhatsApp me for a manual estimate and I'll pull HDB data adjusted for your specific block.</div>
        <a class="map-detail-cta-btn" style="margin-top:14px;" href="${waUrl(`Hi Ammon, I'd like a valuation for ${VAL_STATE.town} ${VAL_STATE.type} (${VAL_STATE.floor}). The website didn't have data for this combo.`)}" target="_blank" rel="noopener">💬 WhatsApp Ammon for manual valuation</a>
      </div>`;
    return;
  }

  const lo = bucket.p25 * (1 + adj);
  const hi = bucket.p75 * (1 + adj);
  const mid = bucket.p50 * (1 + adj);
  const stale = bucket.stale ? `<div class="val-result-stale">⚠ Using cached data. Refresh hasn't run for this combo recently.</div>` : '';
  const countNote = bucket.count > 0 ? `Based on <strong>${bucket.count}</strong> recent transactions in ${esc(VAL_STATE.town)}` : `Based on prevailing market levels for ${esc(VAL_STATE.town)}`;

  result.hidden = false;
  result.innerHTML = `
    <div class="val-result-card">
      <div class="val-result-eyebrow">Indicative range · public HDB data</div>
      <div class="val-result-range">${fmtPrice(lo)} – <em>${fmtPrice(hi)}</em></div>
      <div class="val-result-meta">${countNote} · adjusted for ${esc(VAL_STATE.floor)} floor.</div>
      ${stale}
      <div class="val-precise">
        <div class="val-precise-title">Want a precise number?</div>
        <div class="val-precise-copy">A free, personalized valuation from me - adjusted for your floor, layout, condition, and current buyer demand. <strong>Reply within 2 hours.</strong></div>
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
    ? `${fmtPrice(bucket.p25 * (1 + (data.floorAdjustment?.[VAL_STATE.floor] ?? 0)))} - ${fmtPrice(bucket.p75 * (1 + (data.floorAdjustment?.[VAL_STATE.floor] ?? 0)))}`
    : 'no range, please advise';

  const message = [
    `Hi Ammon, free HDB valuation request.`,
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
        <div class="val-sent-title">Thanks, ${esc(name)}!<br>Your WhatsApp is opening now.</div>
        <div class="val-sent-meta">If WhatsApp didn't pop up, <a href="${waUrl(message)}" target="_blank" rel="noopener" style="color:#F97316;">tap here</a>. I'll reply within 2 hours.</div>
      </div>
    `;
  }
}


/* ─── TOWN GUIDE PAGES (/towns/<town>/) ────────────────────────────────── */

const TOWN_TYPES = ['2-Room', '3-Room', '4-Room', '5-Room', 'Exec'];

async function renderTownPage() {
  const root = $('[data-town]');
  if (!root) return;
  const town = root.dataset.town;

  // Live price snapshot from valuation.json
  const priceEl = $('#town-prices');
  if (priceEl) {
    try {
      const data = await loadJSON('/data/valuation.json');
      const bucket = data.byTownAndType?.[town];
      if (bucket) {
        const rows = TOWN_TYPES.filter(t => bucket[t]).map(t => {
          const b = bucket[t];
          return `
            <tr>
              <td class="tp-type">${esc(t)}</td>
              <td>${fmtPrice(b.p25)} – ${fmtPrice(b.p75)}</td>
              <td class="tp-median">${fmtPrice(b.p50)}</td>
              <td class="tp-count">${b.count}</td>
            </tr>`;
        }).join('');
        priceEl.innerHTML = `
          <table class="town-price-table sans">
            <thead><tr><th>Flat type</th><th>Typical range</th><th>Median</th><th>Sales (12 mo)</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="val-trust sans" style="margin-top:14px;">
            Official HDB resale transactions, last 12 months · data.gov.sg ·
            ${data._meta?.lastUpdated ? 'refreshed ' + esc(data._meta.lastUpdated) : ''}
          </div>`;
      }
    } catch (e) { console.warn('Town prices load failed', e); }
  }

  // 24-month price trend chart from town-trends.json
  const chartEl = $('#town-chart');
  if (chartEl) {
    try {
      const data = await loadJSON('/data/town-trends.json');
      const townData = data.byTown?.[town];
      if (townData) {
        setupTrendChart(chartEl, data.months, townData);
        const stamp = $('#town-chart-stamp');
        if (stamp && data._meta?.lastUpdated) {
          stamp.textContent = 'Monthly medians from data.gov.sg · refreshed ' + data._meta.lastUpdated + ' · hover the chart for exact figures';
        }
      } else {
        chartEl.closest('section')?.remove();
      }
    } catch (e) { console.warn('Town trends load failed', e); }
  }

  // Closed deals in this town from listings.json
  const casesEl = $('#town-cases');
  if (casesEl) {
    try {
      const data = await loadJSON('/data/listings.json');
      const cases = data.cases.filter(c => c.town === town);
      if (!cases.length) {
        $('#town-cases-section')?.remove();
      } else {
        casesEl.innerHTML = cases.map(c => `
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
      }
    } catch (e) { console.warn('Town cases load failed', e); }
  }
}


// Interactive inline SVG line chart of monthly median prices (3R / 4R / 5R).
// No chart library - hover/touch shows exact figures, legend toggles series.
const TC = { W: 760, H: 320, PAD_L: 56, PAD_R: 16, PAD_T: 18, PAD_B: 42 };
const TC_MON = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function tcMonthLabel(m) {
  const [yr, mo] = m.split('-');
  return TC_MON[Number(mo) - 1] + ' ' + yr.slice(2);
}

function setupTrendChart(container, months, townData) {
  const ALL_SERIES = [
    { key: '3-Room', color: '#2563EB' },
    { key: '4-Room', color: '#EA580C' },
    { key: '5-Room', color: '#16A34A' },
  ].filter(s => townData[s.key]);
  if (!ALL_SERIES.length) return;

  const hidden = new Set();
  const { W, H, PAD_L, PAD_R, PAD_T, PAD_B } = TC;
  const plotW = W - PAD_L - PAD_R, plotH = H - PAD_T - PAD_B;
  const x = i => PAD_L + (i / (months.length - 1)) * plotW;
  let yMin = 0, yMax = 1; // set per render (depends on visible series)

  function visibleSeries() {
    const vis = ALL_SERIES.filter(s => !hidden.has(s.key));
    return vis.length ? vis : ALL_SERIES; // never allow an empty chart
  }

  function render() {
    const SERIES = visibleSeries();
    const allVals = SERIES.flatMap(s => townData[s.key].p50.filter(v => v !== null));
    if (!allVals.length) return;
    yMin = Math.min(...allVals); yMax = Math.max(...allVals);
    const span = Math.max(yMax - yMin, 40);
    yMin = Math.floor((yMin - span * 0.1) / 25) * 25;
    yMax = Math.ceil((yMax + span * 0.1) / 25) * 25;
    const y = v => PAD_T + (1 - (v - yMin) / (yMax - yMin)) * plotH;

    let grid = '', yLabels = '';
    for (let t = 0; t <= 4; t++) {
      const v = yMin + ((yMax - yMin) * t) / 4;
      const yy = y(v);
      grid += `<line x1="${PAD_L}" y1="${yy}" x2="${W - PAD_R}" y2="${yy}" stroke="#E8E0D6" stroke-width="1"/>`;
      yLabels += `<text x="${PAD_L - 8}" y="${yy + 4}" text-anchor="end" font-size="11" fill="#7A7065">${fmtPrice(v)}</text>`;
    }

    let xLabels = '';
    const step = Math.max(1, Math.round((months.length - 1) / 5));
    for (let i = 0; i < months.length; i += step) {
      xLabels += `<text x="${x(i)}" y="${H - PAD_B + 18}" text-anchor="middle" font-size="11" fill="#7A7065">${tcMonthLabel(months[i])}</text>`;
    }

    let paths = '', dots = '', hoverDots = '';
    for (const s of SERIES) {
      const pts = townData[s.key].p50
        .map((v, i) => (v === null ? null : [x(i), y(v)]))
        .filter(Boolean);
      if (pts.length < 2) continue;
      paths += `<path pathLength="1" d="M${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join('L')}" fill="none" stroke="${s.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
      const last = pts[pts.length - 1];
      dots += `<circle cx="${last[0]}" cy="${last[1]}" r="4" fill="${s.color}"/>`;
      hoverDots += `<circle class="tc-hover-dot" data-key="${esc(s.key)}" r="4.5" fill="${s.color}" stroke="#fff" stroke-width="1.5" style="display:none" pointer-events="none"/>`;
    }

    const legend = ALL_SERIES.map(s => {
      const vals = townData[s.key].p50.filter(v => v !== null);
      const latest = vals[vals.length - 1];
      const off = hidden.has(s.key);
      return `<button type="button" class="tc-legend-item sans${off ? ' is-off' : ''}" data-key="${esc(s.key)}" aria-pressed="${!off}" title="Show/hide ${esc(s.key)}"><span class="tc-swatch" style="background:${s.color}"></span>${esc(s.key)} · ${fmtPrice(latest)}</button>`;
    }).join('');

    container.innerHTML = `
      <div class="tc-legend">${legend}</div>
      <div class="tc-wrap">
        <svg class="town-chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Monthly median resale price trend by flat type" font-family="system-ui,-apple-system,sans-serif">
          ${grid}${yLabels}${xLabels}${paths}${dots}
          <line class="tc-guide" y1="${PAD_T}" y2="${H - PAD_B}" stroke="#1E120A" stroke-width="1" stroke-dasharray="3,3" opacity="0" pointer-events="none"/>
          ${hoverDots}
          <rect x="${PAD_L}" y="${PAD_T}" width="${plotW}" height="${plotH}" fill="transparent"/>
        </svg>
        <div class="tc-tooltip sans" hidden></div>
      </div>`;
    wire();
  }

  function wire() {
    const svg = container.querySelector('svg');
    const tooltip = container.querySelector('.tc-tooltip');
    const guide = container.querySelector('.tc-guide');
    const wrap = container.querySelector('.tc-wrap');
    const SERIES = visibleSeries();
    const y = v => PAD_T + (1 - (v - yMin) / (yMax - yMin)) * plotH;

    container.querySelectorAll('.tc-legend-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.key;
        if (hidden.has(key)) hidden.delete(key);
        else if (visibleSeries().length > 1) hidden.add(key); // keep at least one line
        render();
      });
    });

    function showAt(clientX) {
      const rect = svg.getBoundingClientRect();
      const sx = ((clientX - rect.left) / rect.width) * W;
      const i = Math.max(0, Math.min(months.length - 1,
        Math.round(((sx - PAD_L) / plotW) * (months.length - 1))));
      const gx = x(i);
      guide.setAttribute('x1', gx); guide.setAttribute('x2', gx);
      guide.setAttribute('opacity', '0.45');

      const rows = SERIES.map(s => {
        const v = townData[s.key].p50[i];
        const n = townData[s.key].count[i];
        const dot = container.querySelector(`.tc-hover-dot[data-key="${s.key}"]`);
        if (dot) {
          if (v === null) { dot.style.display = 'none'; }
          else { dot.style.display = ''; dot.setAttribute('cx', gx); dot.setAttribute('cy', y(v)); }
        }
        const val = v === null ? '<em>no sales</em>' : `<strong>${fmtPrice(v)}</strong> · ${n} sold`;
        return `<div class="tc-tip-row"><span class="tc-swatch" style="background:${s.color}"></span>${esc(s.key)}: ${val}</div>`;
      }).join('');
      tooltip.innerHTML = `<div class="tc-tip-month">${tcMonthLabel(months[i])}</div>${rows}`;
      tooltip.hidden = false;

      // place tooltip near the guide line, flipping side past the midpoint
      const px = (gx / W) * rect.width;
      const left = px < rect.width / 2 ? px + 14 : px - tooltip.offsetWidth - 14;
      tooltip.style.left = Math.max(0, Math.min(left, rect.width - tooltip.offsetWidth)) + 'px';
      tooltip.style.top = '14px';
    }

    function hide() {
      tooltip.hidden = true;
      guide.setAttribute('opacity', '0');
      container.querySelectorAll('.tc-hover-dot').forEach(d => { d.style.display = 'none'; });
    }

    wrap.addEventListener('pointermove', e => showAt(e.clientX));
    wrap.addEventListener('pointerdown', e => showAt(e.clientX));
    wrap.addEventListener('pointerleave', hide);
  }

  render();
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
      btn.textContent = "Send Message · I'll Reply Within 24hrs 👋";
      btn.disabled = false;
      alert('Something went wrong. Please try again or WhatsApp me directly.');
    }
  } catch {
    btn.textContent = "Send Message · I'll Reply Within 24hrs 👋";
    btn.disabled = false;
    alert('Network error. Please check your connection and try again.');
  }
};


/* ─── MOTION: scroll reveal + stat counters ────────────────────────────── */

function initMotion() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  document.documentElement.classList.add('anim');

  // Static elements that fade up as they enter the viewport. Dynamic grids
  // (listings, news) are skipped: they render async and have their own motion.
  const SEL = [
    '.track-header', '.faq-header', '.val-header', '.coverage-header',
    '.news-header', '.reviews-header', '.about-img-wrap', '.about-content',
    '.hub-card', '.trait-card', '.town-fact', '.town-review', '.faq-item',
    '.review-card', '.town-chart-card', '.contact-left', '.contact-right',
    '.val-card', '.map-wrap', '.page-copy > *',
  ].join(', ');

  const io = new IntersectionObserver((entries) => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      en.target.classList.add('rv-in');
    }
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });

  $$(SEL).forEach(el => {
    el.classList.add('rv');
    // Stagger siblings so grids cascade instead of popping in at once
    const idx = Array.from(el.parentElement?.children ?? []).indexOf(el);
    el.style.setProperty('--rv-delay', Math.min((idx % 8) * 70, 420) + 'ms');
    // Hand transition control back to the element's own styles afterwards
    el.addEventListener('transitionend', function done(e) {
      if (e.propertyName !== 'opacity') return;
      el.classList.remove('rv', 'rv-in');
      el.style.removeProperty('--rv-delay');
      el.removeEventListener('transitionend', done);
    });
    io.observe(el);
  });

  // Hero stats count up ($30M+ → 0..30, 26 → 0..26, 4+ → 0..4)
  const stats = $$('.stat-num');
  if (stats.length) {
    const cio = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue;
        cio.unobserve(en.target);
        countUp(en.target);
      }
    }, { threshold: 0.5 });
    stats.forEach(el => cio.observe(el));
  }

  function countUp(el) {
    const m = el.textContent.match(/^(\D*)(\d+)(.*)$/);
    if (!m) return;
    const target = Number(m[2]);
    const dur = 1100, t0 = performance.now();
    (function frame(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = m[1] + Math.round(target * eased) + m[3];
      if (p < 1) requestAnimationFrame(frame);
    })(performance.now());
  }
}


/* ─── BOOT ─────────────────────────────────────────────────────────────── */

renderListings();
renderActiveListings();
renderNews();
renderCoverageMap();
initValuationTool();
renderTownPage();
initMotion();
