/* Visit and buyer WhatsApp-click measurement, only after measurement consent. */
(() => {
  'use strict';
  const ID = 'G-SFPHWKSGFB';
  const KEY = 'ammon_analytics_consent_v2';
  const LEGACY_KEY = 'ammon_analytics_consent_v1';
  const production = ['www.ammonlim.com', 'ammonlim.com'].includes(location.hostname);
  const buyerPage = /^\/buy-hdb\/?$/.test(location.pathname);
  const OPENAI_PIXEL_ID = '6ThQQzuk9ah94yFxB7bzsC';
  let started = false;
  let openAIStarted = false;
  function savedChoice() {
    try {
      const v = JSON.parse(localStorage.getItem(KEY));
      if (v && v.expires > Date.now() && ['accepted', 'declined'].includes(v.choice)) return v.choice;
      // Retain earlier refusals; earlier visit-only consent does not cover clicks.
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
      return legacy && legacy.expires > Date.now() && legacy.choice === 'declined' ? 'declined' : null;
    } catch { return null; }
  }
  let consentChoice = savedChoice();
  let consentStored = true;
  function startOpenAI() {
    if (!production || !buyerPage || consentChoice !== 'accepted') return;
    if (openAIStarted) {
      oaiq('consent', true);
      return;
    }
    openAIStarted = true;
    if (!window.oaiq) {
      const queue = function () { queue.q.push(arguments); };
      queue.q = [];
      window.oaiq = queue;
      const tag = document.createElement('script');
      tag.async = true;
      tag.src = 'https://bzrcdn.openai.com/sdk/oaiq.min.js';
      document.head.appendChild(tag);
    }
    oaiq('consent', true);
    oaiq('init', { pixelId: OPENAI_PIXEL_ID });
    oaiq('measure', 'page_viewed', { type: 'contents' }, { opt_out: true });
  }
  function start() {
    if (!production) return;
    if (started) {
      window['ga-disable-' + ID] = false;
      gtag('consent', 'update', { analytics_storage: 'granted' });
      startOpenAI();
      return;
    }
    started = true;
    window['ga-disable-' + ID] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    // Strip arbitrary query values and fragments, including form data and click IDs.
    const url = new URL(location.origin + location.pathname);
    const params = new URLSearchParams(location.search);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_id']) {
      const value = params.get(key);
      if (value && /^[a-zA-Z0-9_-]{1,100}$/.test(value)) url.searchParams.set(key, value);
    }
    let referrer = '';
    try { referrer = new URL(document.referrer).origin + '/'; } catch {}
    gtag('config', ID, { page_location: url.href, page_referrer: referrer, allow_google_signals: false, allow_ad_personalization_signals: false, cookie_expires: 15552000, cookie_update: false });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + ID;
    document.head.appendChild(tag);
    startOpenAI();
  }
  function clearCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name) && !['__oppref', '__obref'].includes(name)) continue;
      for (const domain of ['', location.hostname, '.ammonlim.com']) {
        document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '');
      }
    }
  }
  function trackBuyerWhatsApp(event) {
    if (!production || !buyerPage || consentChoice !== 'accepted' || !started || window['ga-disable-' + ID] || event.defaultPrevented) return;
    // Honour a refusal saved on another page or tab before tracking a handoff.
    if (consentStored && savedChoice() !== 'accepted') return;
    if (event.type === 'click' && event.button !== 0) return;
    if (event.type === 'auxclick' && event.button !== 1) return;
    const link = event.target.closest?.('a');
    if (!link || link.protocol !== 'https:' || link.hostname !== 'wa.me' || link.pathname !== '/6580989441') return;
    let ctaLocation;
    if (link.matches('[data-send-brief]')) ctaLocation = 'buyer_brief';
    else if (link.matches('.wa-float')) ctaLocation = 'floating';
    else if (link.closest('#stickybar')) ctaLocation = 'sticky';
    else return;
    // Fixed placement only. Never collect the href, message or form answers.
    gtag('event', 'whatsapp_click', { cta_location: ctaLocation });
    // A request to contact Ammon, not a confirmed message sent in WhatsApp.
    if (openAIStarted) oaiq('measure', 'lead_created', { type: 'customer_action' }, { opt_out: true });
  }
  document.addEventListener('click', trackBuyerWhatsApp);
  document.addEventListener('auxclick', trackBuyerWhatsApp);
  const panel = document.createElement('section');
  panel.className = 'analytics-choice';
  panel.setAttribute('aria-label', 'Measurement preferences');
  panel.innerHTML = '<div class="analytics-summary"><p>Allow cookies to measure visits and WhatsApp clicks? <a href="/privacy-policy/">Privacy policy</a></p><button type="button" class="analytics-details-toggle" aria-expanded="false" aria-controls="analytics-details">Details</button></div><div id="analytics-details" hidden><p>Google Analytics and, on the buyer page, OpenAI measure visits, ad sources and WhatsApp button clicks. OpenAI may automatically hash available contact details for ad matching. Button clicks do not confirm messages sent. You can change your choice in the footer at any time.</p></div><div class="analytics-actions"><button type="button" data-choice="accepted">Allow measurement</button><button type="button" data-choice="declined">No thanks</button></div>';
  panel.hidden = !!consentChoice;
  document.body.appendChild(panel);
  const detailsToggle = panel.querySelector('.analytics-details-toggle');
  const details = panel.querySelector('#analytics-details');
  detailsToggle.addEventListener('click', () => {
    details.hidden = !details.hidden;
    detailsToggle.setAttribute('aria-expanded', String(!details.hidden));
    detailsToggle.textContent = details.hidden ? 'Details' : 'Less';
  });
  const preferences = document.createElement('button');
  preferences.type = 'button'; preferences.className = 'analytics-preferences'; preferences.textContent = 'Measurement preferences';
  (document.querySelector('.footer-bottom') || document.body).appendChild(preferences);
  preferences.addEventListener('click', () => { panel.hidden = false; panel.querySelector('button').focus(); });
  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-choice]');
    if (!button) return;
    const choice = button.dataset.choice;
    consentChoice = choice;
    try {
      localStorage.setItem(KEY, JSON.stringify({choice, expires: Date.now() + 15552000000}));
      consentStored = true;
    } catch { consentStored = false; }
    panel.hidden = true;
    if (choice === 'accepted') start();
    else {
      window['ga-disable-' + ID] = true;
      if (window.gtag) gtag('consent', 'update', { analytics_storage: 'denied' });
      if (window.oaiq) oaiq('consent', false);
      clearCookies();
    }
    preferences.focus({preventScroll:true});
  });
  if (consentChoice === 'accepted') start();
})();
