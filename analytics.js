/* Visit measurement only. Google is loaded only after analytics consent. */
(() => {
  'use strict';
  const ID = 'G-SFPHWKSGFB';
  const KEY = 'ammon_analytics_consent_v1';
  const production = ['www.ammonlim.com', 'ammonlim.com'].includes(location.hostname);
  let started = false;
  function savedChoice() {
    try { const v = JSON.parse(localStorage.getItem(KEY)); return v && v.expires > Date.now() ? v.choice : null; } catch { return null; }
  }
  function start() {
    if (!production) return;
    if (started) {
      window['ga-disable-' + ID] = false;
      gtag('consent', 'update', { analytics_storage: 'granted' });
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
  }
  function clearCookies() {
    for (const cookie of document.cookie.split(';')) {
      const name = cookie.trim().split('=')[0];
      if (!/^_ga(?:_|$)/.test(name)) continue;
      for (const domain of ['', location.hostname, '.ammonlim.com']) {
        document.cookie = name + '=; Max-Age=0; path=/' + (domain ? '; domain=' + domain : '');
      }
    }
  }
  const panel = document.createElement('section');
  panel.className = 'analytics-choice';
  panel.setAttribute('aria-label', 'Analytics preferences');
  panel.innerHTML = '<p><strong>Help me understand site visits</strong><br>Allow Google Analytics cookies to measure visits and where they come from? <a href="/privacy-policy/">Privacy policy</a></p><div><button type="button" data-choice="accepted">Allow analytics</button><button type="button" data-choice="declined">No thanks</button></div>';
  panel.hidden = !!savedChoice();
  document.body.appendChild(panel);
  const preferences = document.createElement('button');
  preferences.type = 'button'; preferences.className = 'analytics-preferences'; preferences.textContent = 'Analytics preferences';
  (document.querySelector('.footer-bottom') || document.body).appendChild(preferences);
  preferences.addEventListener('click', () => { panel.hidden = false; panel.querySelector('button').focus(); });
  panel.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-choice]');
    if (!button) return;
    const choice = button.dataset.choice;
    try { localStorage.setItem(KEY, JSON.stringify({choice, expires: Date.now() + 15552000000})); } catch {}
    panel.hidden = true;
    if (choice === 'accepted') start();
    else {
      window['ga-disable-' + ID] = true;
      if (window.gtag) gtag('consent', 'update', { analytics_storage: 'denied' });
      clearCookies();
    }
    preferences.focus({preventScroll:true});
  });
  if (savedChoice() === 'accepted') start();
})();
