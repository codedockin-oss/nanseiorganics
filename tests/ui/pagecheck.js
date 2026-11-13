// Loads every storefront page in a headless browser and reports script errors and layout problems.
// Needs the site on :8093 (python -m http.server 8093 from the repo root) and the mock API on :5000 (node mock-api.js).
//   node pagecheck.js
const { launch } = require('./lib');

const PAGES = ['index', 'product.html?id=2', 'blog', 'news', 'wishlist', 'account', 'checkoutmyorderpage',
  'checkoutmyorderpage.html?page=orders', 'login', 'reset-password', 'privacy-policy', 'refund-policy', 'terms-and-conditions'];

(async () => {
  const browser = await launch();
  let bad = 0;
  for (const width of [1366, 375]) {
    for (const p of PAGES) {
      const page = await browser.newPage();
      await page.setViewport({ width, height: 900 });
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      // PAGES_BASE: http://127.0.0.1:8093/pages/ (repo served from its root) or http://127.0.0.1:8094/ (pages/ as the root, like the live site)
      const url = (process.env.PAGES_BASE || 'http://127.0.0.1:8093/pages/') + (p.includes('.html') ? p : p + '.html');
      await page.goto(url, { waitUntil: 'load' });
      await new Promise(r => setTimeout(r, 1200));
      const info = await page.evaluate(() => ({
        header: !!document.getElementById('siteHeader'),
        footer: !!document.getElementById('site-footer'),
        headers: document.querySelectorAll('.nsh-nav').length,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
        rawIcons: (document.body.innerText.match(/\[\[icon:[a-z0-9-]+\]\]/g) || []).length,
        qmarkPrices: (document.body.innerText.match(/\?\d{2,}/g) || []).length,
      }));
      const problems = [];
      if (errors.length) problems.push('errors: ' + errors.join(' | ').slice(0, 300));
      if (!info.header || info.headers !== 1) problems.push('shared header x' + info.headers);
      if (!info.footer) problems.push('no footer');
      if (info.overflow) problems.push('sideways scroll');
      if (info.rawIcons) problems.push(info.rawIcons + ' raw icon markers');
      if (info.qmarkPrices) problems.push(info.qmarkPrices + ' "?" prices');
      console.log((problems.length ? 'FAIL ' : 'ok   ') + String(width).padEnd(5) + p.padEnd(40) + problems.join('; '));
      if (problems.length) bad++;
      await page.close();
    }
  }
  await browser.close();
  process.exit(bad ? 1 : 0);
})();
