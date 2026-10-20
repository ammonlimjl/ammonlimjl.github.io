import {searchPages, enquiryMessage, whatsappUrl} from './core.js';
const $ = id => document.getElementById(id);
let pages = [];
let loaded = false;
const status = $('result-status');
function search() {
  const query = $('search-input').value.trim();
  $('results').replaceChildren();
  if (!loaded) { status.textContent = 'Search is unavailable right now. Try the navigation links or message Ammon below.'; return; }
  if (!query) { status.textContent = 'Type what you’d like to find.'; return; }
  const matches = searchPages(pages, query);
  status.textContent = matches.length ? `${matches.length} relevant ${matches.length === 1 ? 'page' : 'pages'}` : 'No matching page yet. You can ask Ammon directly on WhatsApp below.';
  for (const page of matches) {
    const link = document.createElement('a');
    link.className = 'search-result'; link.href = page.url;
    const title = document.createElement('strong'); title.textContent = page.title;
    const summary = document.createElement('p'); summary.textContent = page.summary;
    link.append(title, summary); $('results').append(link);
  }
}
fetch('/help/pages.json').then(r => { if (!r.ok) throw new Error('index unavailable'); return r.json(); }).then(data => { pages = data; loaded = true; if ($('search-input').value) search(); }).catch(() => { status.textContent = 'Search is unavailable right now. You can still use the navigation or prepare an enquiry below.'; });
$('site-search').addEventListener('submit', event => { event.preventDefault(); search(); });
const labels = {'Buying a home':'Your budget, preferred area and flat type','Selling a home':'Your flat’s town, flat type and plans','Selling and buying':'Your current flat and what you want in your next home','Starting in real estate':'Where you are in your journey','Something else':'Tell me a little about your plans'};
$('goal').addEventListener('change', () => { $('details-label').textContent = labels[$('goal').value]; });
$('enquiry').addEventListener('submit', event => {
  event.preventDefault();
  $('message').value = enquiryMessage(Object.fromEntries(new FormData(event.target)));
  $('send-message').href = whatsappUrl($('message').value);
  $('brief-preview').hidden = false; $('message').focus();
});
$('message').addEventListener('input', () => { $('send-message').href = whatsappUrl($('message').value); });
