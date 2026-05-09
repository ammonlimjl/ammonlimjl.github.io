# ammonlim.com — Singapore HDB Specialist

Static site for **Ammon Lim**, Singapore's HDB specialist. Designed for GitHub Pages.

## Structure

```
.
├── index.html                  Main page (served at /)
├── styles.css                  Design system + all section styles
├── app.js                      Client interactivity (defer-loaded)
├── sitemap.xml                 SEO sitemap
├── robots.txt                  Crawler directives
├── data/
│   ├── valuation.json          Pre-baked HDB price percentiles (auto-refreshed monthly)
│   ├── listings.json           Past-cases / track-record
│   ├── news.json               News cards + your "Ammon's take"
│   └── coverage.json           Coverage-map regions
├── scripts/
│   └── refresh-valuation.mjs   Node script — pulls last 12mo of HDB transactions
├── .github/workflows/
│   └── refresh-valuation.yml   Monthly cron that runs the refresh script
├── Track Records/              Listing photos
├── Newscard/                   News card photos
├── DSC02974_IJFR.jpg           Hero photo
├── DSC03210_IJFR.jpg           About photo
└── ammon-lim-realestate.html   ← Old single-file version (kept as backup)
```

## Deploy to GitHub Pages

1. Push this folder to a GitHub repo (e.g. `ammon-lim/website`).
2. **Settings → Pages → Source: `Deploy from a branch` → Branch: `main` → Folder: `/ (root)`**.
3. **Settings → Pages → Custom domain: `ammonlim.com`** (and add `www.ammonlim.com` CNAME if you own it).
4. In your DNS provider, add an `A` record for `ammonlim.com` → GitHub Pages IPs (185.199.108.153 / 109 / 110 / 111) **and** a `CNAME` for `www` → `<your-username>.github.io`.

GitHub will issue a free SSL cert automatically (24–48hrs).

## Monthly maintenance

### Valuation data — automated
A GitHub Action runs on the **1st of each month at 03:00 SGT**, fetches the last 12 months of HDB resale transactions from `data.gov.sg`, recomputes P25 / P50 / P75 per (town, flat-type), and commits `data/valuation.json` if it changed. **Nothing for you to do.**

You can also run it manually any time:
- **Locally:** `node scripts/refresh-valuation.mjs`
- **GitHub UI:** Actions tab → "Refresh HDB valuation data" → Run workflow

### Things you'll edit by hand
| File | What goes there | How often |
|------|-----------------|-----------|
| `data/news.json` | News cards. The `myTake` field is **your voice** — leave blank if you don't have one yet | Whenever you spot news worth sharing |
| `data/listings.json` | Past cases — add a new entry for each closed deal | After each closed transaction |
| `data/coverage.json` | Region pin info (key projects, latest sale) | When you want to highlight new activity |

All four files are pure JSON. The site reloads new data on the next page load — no rebuild needed.

## SEO checklist (post-launch)

- [ ] Submit `sitemap.xml` to **Google Search Console** (search.google.com/search-console). Property: `https://ammonlim.com/`. Sitemap path: `/sitemap.xml`.
- [ ] Submit to **Bing Webmaster Tools** (bing.com/webmasters).
- [ ] Verify the **RealEstateAgent** + **FAQ** structured data via [search.google.com/test/rich-results](https://search.google.com/test/rich-results).
- [ ] Create / claim **Google Business Profile** as "Ammon Lim · HDB Specialist". Add ammonlim.com, your CEA license, photos.
- [ ] Get featured on **PropertyGuru** and **99.co** with backlinks pointing to ammonlim.com.
- [ ] Replace the placeholder `og-image.jpg` reference in `index.html` with a real 1200×630 social-share image.
- [ ] Add a `favicon.ico` / `apple-touch-icon.png` (currently using an inline SVG fallback).

## Form handling

- Lead capture for the **valuation tool** uses **WhatsApp click-to-chat** (no backend) — clicking "Get Precise Valuation" prefills a WhatsApp message to +65 8098 9441.
- The **contact form** and **newsletter** still POST to the existing **Formspree** endpoint (`xwvrogev`).
- Both forms include a **honeypot** field (`name="company"`) and a **30s rate-limit** in `sessionStorage` to deter bots.

## Photo folder names contain spaces — should I rename?

Spaces are URL-encoded (`%20`) in JSON references, so it works. But if you want cleaner URLs and easier scripting later, rename:
- `Track Records/` → `track-records/`
- `Newscard/` → `news/`
- `Photo for past cases/` → `past-cases/` (currently unused)

Then update the `photo` / `image` paths in `data/listings.json` and `data/news.json`.

## Tweaking copy

- **Hero stats** (`$30M+ / 26 / 4+ years`): `index.html` → `<div class="hero-stats">`
- **Hero headline / sub**: `index.html` → `.hero-h1`, `.hero-sub`
- **About copy**: `index.html` → `.about-p`
- **FAQ items**: `index.html` → `<details class="faq-item">` (keep the JSON-LD FAQPage block in `<head>` in sync — it powers Google rich results)

## Old single-file version

`ammon-lim-realestate.html` is the original 2,976-line single-file build. Kept as backup; not served. Once you're happy with the new build, delete it.

---

Last rebuild: 2026-05-09
